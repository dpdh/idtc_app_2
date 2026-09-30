# TwiniAI Provider Setup

TwiniAI supports the local FAQ mode and a server-side AI mode with OpenAI, Google Gemini, or an OpenAI-compatible provider. API keys stay on the Node server and are never included in the web bundle or APK.

## Configure a provider

Copy `.env.example` to `.env`, then add the key for the provider you use:

```env
TWINI_PROVIDER=openai
OPENAI_API_KEY=your-server-side-key
OPENAI_MODEL=gpt-4o-mini
```

For Gemini, use `TWINI_PROVIDER=gemini`, set `GEMINI_API_KEY`, and optionally set `GEMINI_MODEL`. For another provider that supports OpenAI Chat Completions and function calling, use `TWINI_PROVIDER=compatible` and set `COMPATIBLE_API_KEY`, `COMPATIBLE_BASE_URL`, and `COMPATIBLE_MODEL`.

ChatGPT subscriptions and OpenAI Platform API usage are separate; an OpenAI API key and billing setup may be required. Follow each provider's current pricing and usage limits. Never put provider keys in `app.js`, `twini-config.js`, `index.html`, or a mobile build.

## PostgreSQL User Management

Set `DATABASE_URL` to a PostgreSQL connection string. On server startup, the backend applies `database/schema.sql` and switches login, sessions, and the Admin Panel user manager to PostgreSQL. Passwords are hashed server-side with PBKDF2-SHA-256; sessions use random HttpOnly cookies whose hashes are stored in the database. Role changes and user-management actions are written to an audit table and authorized against the current database session.

The first Super Admin is bootstrapped with a one-time secret. Generate a strong random value for `BOOTSTRAP_ADMIN_TOKEN`, start the server, open registration, and enter the token in the bootstrap field. The first account becomes Super Admin; later public registrations are Members. Set `PUBLIC_REGISTRATION=false` after bootstrap if registration should be closed. CMS user creation/promotions require a database Super Admin session.

For local PostgreSQL, `DATABASE_SSL=false` may be used on a trusted local network. For managed/remote PostgreSQL, use TLS (`DATABASE_SSL=true`) and a provider connection string with certificate validation. Do not commit `.env`. Existing `idtc-users` localStorage accounts are not automatically copied into PostgreSQL; migrate them deliberately or create new accounts.

The account store is server-side only when the server starts with `DATABASE_URL`. Without it, the application intentionally keeps the existing localStorage authentication and local Admin Panel. PostgreSQL sessions use `HttpOnly` cookies; HTTPS deployments should configure exact `TWINI_ALLOWED_ORIGINS`, `SESSION_COOKIE_SAMESITE`, and trusted HTTPS proxy headers. Do not expose the backend publicly until HTTPS, authentication, bootstrap, origin, rate-limit, and database backup settings are reviewed.

## Run locally

```powershell
npm.cmd start
```

This builds `www/` and starts the integrated web/API server at `http://127.0.0.1:4174`. Select an enabled provider in the TwiniAI header. Without a configured provider, the widget stays in local FAQ mode. If a provider request fails, TwiniAI falls back to its local knowledge base.

The server exposes `GET /api/health`, `GET /api/providers`, and `POST /api/chat`. The model can call read-only tools to search the local Digital Twin FAQ and learning modules; it cannot access live sensors, accounts, or modify project data.

## Deploy and Capacitor

For a same-origin PWA deployment, serve the built `www/` files and `/api` from the same HTTPS origin. For an Android/iOS app, host the API separately and set its HTTPS origin in `twini-config.js` before building:

```js
window.IDTC_API_BASE_URL = 'https://api.example.com';
```

Configure the exact Capacitor web origin in the backend environment, for example `TWINI_ALLOWED_ORIGINS=https://localhost` for the Android scheme configured by this project. Add only the origins actually used by the app.

The included Node server is a development/integration server. Before exposing it publicly, add real server-side user authentication, per-user quotas, distributed rate limiting, monitoring, and provider spend limits behind HTTPS. The app's local profile/session is not a trusted backend identity. The included in-memory per-IP throttle is not sufficient protection for a public paid AI endpoint.
