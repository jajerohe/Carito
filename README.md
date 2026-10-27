# Carito
Sistema de Información Clínica para Pacientes de Ortodoncia y Ortopedia Maxilar

Aplicación web hecha con **Next.js + TypeScript + Neon (PostgreSQL)**, con el
mismo estilo y la misma base de PonyCash.

Por ahora tiene:
- **Inicio de sesión** con correo y contraseña. La primera vez aparece
  **Bienvenido a Carito** para crear el usuario administrador.
- **Mi cuenta**: cada persona cambia su propia contraseña (pide la actual).
- **¿Olvidaste tu contraseña?**: en el login; envía por correo un enlace (vence en 1 hora) para crear una nueva. Necesita `CORREO_USUARIO` y `CORREO_CONTRASENA` (contraseña de aplicación de Gmail) en los secretos de la app.
- **Administración de usuarios** (solo administradores): crear, editar nombre y correo, cambiar rol (Administrador o Usuario), cambiar contraseña, bloquear/desbloquear y eliminar.

## Herramientas

| Pieza | Herramienta |
|---|---|
| Pantallas y lógica | [Next.js](https://nextjs.org) (React) con TypeScript |
| Estilos | [Tailwind CSS](https://tailwindcss.com) |
| Base de datos | [Neon](https://neon.tech) (PostgreSQL) |
| Conexión a la base de datos | [Drizzle ORM](https://orm.drizzle.team) |
| Inicio de sesión y roles | [Better Auth](https://better-auth.com) con el plugin `admin` |
| Publicación | [Cloudflare Workers](https://workers.cloudflare.com) con [OpenNext](https://opennext.js.org/cloudflare) |

## Publicar en Cloudflare (todo desde el navegador)

Cada vez que se sube un cambio a `main` en GitHub, Cloudflare crea las tablas
que falten en Neon y publica la app de nuevo.

1. **Cadena de conexión de Neon**: en el proyecto **Carito** de Neon presiona
   **Connect** y copia la cadena (`postgresql://...`). Déjala a mano, sin pegarla en chats.
2. **Clave secreta**: en el navegador presiona **F12 → Console** y escribe
   `crypto.randomUUID() + crypto.randomUUID()`. Copia el resultado.
3. En [dash.cloudflare.com](https://dash.cloudflare.com) entra a
   **Workers & Pages → Create → Import a repository** y elige `Carito`.
4. En la configuración:
   - **Project name**: `carito` (debe coincidir con `wrangler.jsonc`).
   - **Build command**: `npm run cf:build`
   - **Deploy command**: `npx opennextjs-cloudflare deploy`
   - En **Advanced settings → Build variables** agrega `DATABASE_URL` con la
     cadena de Neon (se usa para crear las tablas).
5. Presiona **Deploy**. Cuando termine, ve a **Settings → Variables and Secrets**
   del Worker y agrega, como tipo **Secret**:
   - `DATABASE_URL`: la cadena de Neon.
   - `BETTER_AUTH_SECRET`: la clave del paso 2.
6. Abre `https://carito.<tu-cuenta>.workers.dev`. La primera vez aparece
   **Bienvenido a Carito** para crear tu usuario administrador.

Si algo falla, `https://carito.<tu-cuenta>.workers.dev/api/estado` dice si faltan
variables o si no llega a la base de datos (sin mostrar ningún secreto).

⚠️ Nunca escribas la cadena de conexión ni la clave secreta en el código: solo
en Cloudflare.

## Trabajar en un computador (opcional)

```powershell
npm install
copy .env.example .env      # y llena DATABASE_URL y BETTER_AUTH_SECRET
npm run db:migrate          # crea las tablas
npm run dev                 # http://localhost:3000
```

`npm run preview` ejecuta la app en el mismo motor de Cloudflare (lee las
variables de un archivo `.dev.vars`, con el mismo formato que `.env`).

## Cómo está organizado

```
src/
├── proxy.ts                    Si no hay sesión, manda al login
├── db/
│   ├── index.ts                Conexión a la base de datos (una por visita)
│   └── schema.ts               Tablas (user, session, account, verification)
├── lib/
│   ├── auth.ts                 Configuración de Better Auth
│   ├── session.ts              getSession(), requireSession() y requireAdmin()
│   ├── correo.ts               Envío de correos (recuperar contraseña)
│   └── errores.ts              Mensajes de error en español
├── components/
│   ├── ui.tsx                  Botón, campo, tarjeta, insignia
│   ├── formulario.tsx          Formulario con "Guardando…" y mensajes
│   ├── logo.tsx                Logo de Carito
│   └── menu.tsx                Menú lateral
└── app/
    ├── configurar/             Crear el primer administrador
    ├── login/                  Pantalla de inicio de sesión
    ├── recuperar/, restablecer/ ¿Olvidaste tu contraseña?
    ├── api/auth/[...all]/      Rutas internas de Better Auth
    └── (app)/                  Páginas que requieren sesión
        ├── layout.tsx          Menú lateral + contenido
        ├── page.tsx            Inicio
        ├── mi-cuenta/          Cambiar la propia contraseña
        └── usuarios/           Administración de usuarios
drizzle/                        Migraciones SQL (cambios en las tablas)
wrangler.jsonc                  Configuración del Worker de Cloudflare
```
