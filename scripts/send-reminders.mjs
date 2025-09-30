import { createClient } from '@supabase/supabase-js';

const requiredEnv = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'RESEND_API_KEY',
  'REMINDER_FROM_EMAIL',
];

const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.REMINDER_FROM_EMAIL;
const replyTo = process.env.REMINDER_REPLY_TO ?? fromEmail;
const adminEmail = process.env.REMINDER_OWNER_EMAIL ?? process.env.VITE_OWNER_EMAIL;
const lookaheadHours = Number(process.env.REMINDER_LOOKAHEAD_HOURS ?? '36');

const supabase = createClient(supabaseUrl, supabaseServiceRole);

const formatDateTime = (isoString) => {
  const formatter = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(new Date(isoString));
};

const sendEmail = async ({ to, subject, html }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      bcc: adminEmail ? [adminEmail] : undefined,
      reply_to: replyTo,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend error: ${response.status} ${body}`);
  }
};

const main = async () => {
  const now = new Date();
  const until = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(
      'id, full_name, email, phone, notes, status, reminder_sent, slot:available_slots(id,start_time,end_time,notes)'
    )
    .eq('status', 'approved')
    .eq('reminder_sent', false)
    .gte('slot.start_time', now.toISOString())
    .lte('slot.start_time', until.toISOString());

  if (error) {
    console.error('Supabase query error', error);
    process.exit(1);
  }

  if (!appointments?.length) {
    console.info('No appointments requiring reminders.');
    return;
  }

  let successCount = 0;

  for (const appointment of appointments) {
    if (!appointment.slot) continue;

    const slot = Array.isArray(appointment.slot) ? appointment.slot[0] : appointment.slot;
    if (!slot) continue;

    const subject = `Recordatorio: tu cita en CiaoCiao - ${formatDateTime(slot.start_time)}`;
    const html = `
      <p>Hola ${appointment.full_name.split(' ')[0] ?? 'cliente'},</p>
      <p>Este es un recordatorio de tu cita confirmada en <strong>CiaoCiao Atelier</strong>.</p>
      <ul>
        <li><strong>Fecha:</strong> ${formatDateTime(slot.start_time)}</li>
        <li><strong>Direccion:</strong> Compartiremos la ubicacion exacta en el correo de confirmacion.</li>
      </ul>
      <p>Si necesitas reagendar o cancelar, responde a este correo o escribenos por WhatsApp.</p>
      <p>Te esperamos,<br/>Equipo CiaoCiao Atelier</p>
    `;

    try {
      await sendEmail({ to: appointment.email, subject, html });
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appointment.id);
      successCount += 1;
    } catch (sendError) {
      console.error(`Failed to send reminder for appointment ${appointment.id}`, sendError);
    }
  }

  console.info(`Reminders sent: ${successCount}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
