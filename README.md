# Carito
Sistema de Información Clínica para Pacientes de Ortodoncia y Ortopedia Maxilar

Aplicación web hecha con **Next.js + TypeScript**, publicada en **Cloudflare Workers**
con [OpenNext](https://opennext.js.org/cloudflare), igual que PonyCash.

Por ahora es solo la base: una página de inicio "En construcción".

## Publicar en Cloudflare (todo desde el navegador)

Cada vez que se sube un cambio a `main` en GitHub, Cloudflare publica la app de nuevo.

1. En [dash.cloudflare.com](https://dash.cloudflare.com) entra a
   **Workers & Pages → Create → Import a repository** y elige `Carito`.
2. En la configuración:
   - **Project name**: `carito` (debe coincidir con `wrangler.jsonc`).
   - **Build command**: `npm run cf:build`
   - **Deploy command**: `npx opennextjs-cloudflare deploy`
3. Presiona **Deploy** y abre `https://carito.<tu-cuenta>.workers.dev`.

## Trabajar en un computador (opcional)

```powershell
npm install
npm run dev                 # http://localhost:3000
```

`npm run preview` ejecuta la app en el mismo motor de Cloudflare.
