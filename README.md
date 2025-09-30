# CiaoCiao Atelier - Webapp de citas

Aplicacion React + Supabase para gestionar las citas del showroom de joyeria CiaoCiao.mx. Incluye un flujo publico para solicitar horarios, panel administrativo para aprobar o rechazar solicitudes, almacenamiento seguro de identificaciones y recordatorios automaticos por correo.

## Caracteristicas clave
- Agenda publica con seleccion de horarios disponibles y carga de identificacion oficial.
- Generador de horarios semanales para publicar bloques completos en minutos.
- Panel administrativo protegido con Supabase Auth para aprobar/rechazar citas y gestionar horarios.
- Notificaciones inmediatas mediante EmailJS (cliente y administradora).
- Recordatorios automaticos 24/36 h antes de la cita usando GitHub Actions + Resend.
- Deploy continuo a GitHub Pages listo para apuntar a dominio propio.

## Tecnologias
- React 19 + Vite + TypeScript + TailwindCSS.
- Supabase (Postgres, Auth y Storage privado para identificaciones).
- EmailJS (envio inmediato) y Resend (recordatorios programados).
- GitHub Actions para CI/CD y tareas programadas.

## Requisitos previos
1. Proyecto Supabase con base de datos Postgres y Auth habilitado.
2. Cuenta EmailJS con plantillas configuradas.
3. Cuenta Resend (o servicio SMTP compatible con la API de Resend).
4. Repositorio en GitHub con Pages activado.

## Configuracion local
1. Clona el repositorio y entra a la carpeta `calendario ciaociao`.
2. Crea el archivo `.env` basandote en `.env.example`.
3. Instala dependencias con `npm install`.
4. Arranca el modo desarrollo con `npm run dev`.

## Variables de entorno
Completa `.env` con los valores reales:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_EMAILJS_SERVICE_ID=...
VITE_EMAILJS_TEMPLATE_ADMIN=...
VITE_EMAILJS_TEMPLATE_CUSTOMER=...
VITE_EMAILJS_PUBLIC_KEY=...
VITE_OWNER_EMAIL=hola@ciaociao.mx
```

## SQL para Supabase
Ejecuta estos scripts (modifica esquema si usas otro namespace):

```sql
-- Tabla de horarios
create table if not exists public.available_slots (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'available'
    check (status in ('available','pending','booked','blocked')),
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

-- Tabla de citas
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.available_slots(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  notes text,
  id_storage_path text,
  status text not null default 'pending'
    check (status in ('pending','approved','declined','cancelled')),
  reminder_sent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists appointments_slot_idx on public.appointments(slot_id);
```

### Politicas RLS recomendadas
```
alter table public.available_slots enable row level security;
alter table public.appointments enable row level security;

-- Cualquiera puede ver horarios
create policy "slots_public_read" on public.available_slots
  for select using (true);

-- El cliente puede marcar un horario como pendiente al reservar
create policy "slots_public_pending" on public.available_slots
  for update using (status = 'available')
  with check (status = 'pending');

-- Insertar citas sin autenticacion (frontend publico)
create policy "appointments_public_insert" on public.appointments
  for insert with check (true);

-- Solo usuarios autenticados pueden listar/actualizar citas
create policy "appointments_admin_manage" on public.appointments
  for select using (auth.role() = 'authenticated');
create policy "appointments_admin_update" on public.appointments
  for update using (auth.role() = 'authenticated');
```

> Ajusta las politicas a tus requisitos de seguridad. Si deseas mas control, puedes mover la logica de reserva a un RPC.

### Storage privado para identificaciones
1. Crea un bucket `identificaciones` (no publico).
2. En **Policies** agrega:
   ```
   create policy "allow_upload_ids" on storage.objects
     for insert with check (bucket_id = 'identificaciones');
   create policy "allow_admin_read_ids" on storage.objects
     for select using (
       bucket_id = 'identificaciones' and auth.role() = 'authenticated'
     );
   ```
3. Asegurate de usar cuentas Supabase Auth para la seccion admin (crea usuarios desde la consola o con invitacion por correo).

## EmailJS
- Crea dos plantillas (ID para admin y cliente).
- Variables sugeridas: `appointment_id`, `customer_name`, `customer_email`, `customer_phone`, `appointment_date`, `appointment_notes`, `appointment_status`.
- Copia los IDs y la llave publica en el `.env`.

## Recordatorios automaticos (Resend + GitHub Actions)
1. Crea un API Key en Resend y configura el remitente verificado (`REMINDER_FROM_EMAIL`).
2. En GitHub define estos **Secrets**:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `REMINDER_FROM_EMAIL`
   - `REMINDER_REPLY_TO` (opcional)
   - `REMINDER_OWNER_EMAIL` (copia al correo del showroom)
   - Reutiliza `VITE_OWNER_EMAIL` si quieres recibir copias.
3. (Opcional) Crea un **Repository Variable** `REMINDER_LOOKAHEAD_HOURS` con el numero de horas de anticipacion (default 36).
4. El workflow `.github/workflows/reminders.yml` corre diario a las 12:00 UTC y ejecuta `scripts/send-reminders.mjs`.
5. Anade la columna `reminder_sent` (boolean) en `appointments` como se indico; el script la marca en `true` tras enviar el correo.

## Deploy en GitHub Pages
1. Habilita GitHub Pages (Source: GitHub Actions).
2. Agrega los secrets para Vite en **Repository Secrets** (mismos del `.env`).
3. Haz push a `main`; el workflow `.github/workflows/deploy.yml` construira y publicara la carpeta `dist`.
4. Si usaras un dominio personalizado (`ciaociao.mx`), anade un archivo `CNAME` en `public/` o configura desde la pestana Pages.

## Scripts npm
- `npm run dev` – entorno local con HMR.
- `npm run build` – compilacion de produccion.
- `npm run preview` – vista previa de la version construida.

## Estructura de carpetas
```
src/
  components/        # UI reutilizable y componentes administrativos
  context/           # Contexto Supabase Auth
  layouts/           # Layouts publico y admin
  pages/             # Paginas publicas y panel
  services/          # Integraciones con Supabase y EmailJS
  utils/             # Helpers de fechas y formateo
scripts/
  send-reminders.mjs # Script Node para recordatorios programados
```

## Proximos pasos sugeridos
- Anadir firma digital al correo de confirmacion con enlace .ics para que el cliente anada la cita a su calendario.
- Restringir las politicas RLS utilizando funciones RPC para operaciones de reserva y evitar conflictos concurrentes.
- Incorporar metricas (Supabase Analytics o Tinybird) para medir tasa de confirmacion y cancelaciones.
