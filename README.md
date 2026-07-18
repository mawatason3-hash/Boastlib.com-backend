# Boastlib.com Backend

## Deployment Environment Variables

The backend uses these environment variables for runtime configuration.

### Required for all deployments
- `DATABASE_URL` — Postgres connection string.
- `JWT_SECRET` — Secret used to sign auth tokens.
- `FRONTEND_URL` — The frontend origin for CORS and OAuth redirects.

### Google OAuth (backend only)
The backend reads Google OAuth credentials from the server environment.

Supported variable names:
- `GOOGLE_CLIENT_ID` or `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` or `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` or `GOOGLE_OAUTH_REDIRECT_URI`

For Railway production, set the backend service variables using the `GOOGLE_OAUTH_*` names shown in the dashboard.

Example names only:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI`
- `FRONTEND_URL`

The actual values should come from your Google Cloud Console and Vercel/Railway dashboards.

### Frontend environment
The frontend should have:
- `NEXT_PUBLIC_API_URL=https://boastlibcom-backend-production.up.railway.app`

Do not place `GOOGLE_CLIENT_SECRET` or `GOOGLE_OAUTH_CLIENT_SECRET` in the frontend environment.

## Build Notes

The backend build copies SQL files into `dist/` so runtime migrations can access them.

Scripts:
- `npm run build` — compiles TypeScript and copies SQL assets into `dist/`
- `npm run start` — runs the compiled backend from `dist/index.js`
- `npm run dev` — starts the development server with `ts-node-dev`
