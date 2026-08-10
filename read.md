## Deployment

This project deploys as a Node/Express API that also serves the built Vite client.

### Build and start

```bash
npm run install:all
npm run build
npm start
```

### Render

The repository includes a root `render.yaml` Blueprint. Deploy it from the
repository root with:

```text
Build Command: npm run render-build
Start Command: npm start
Health Check Path: /api/health
```

The root `index.js` remains as a compatibility entry point for an existing
Render service that is still configured to run `node index.js`.

### Required server environment

Set these in the hosting provider:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long random secret>
```

If the client is served from the same Express app, set the client API URL to:

```bash
VITE_API_URL=/api
```

If the client and API are deployed on different domains, set:

```bash
FRONTEND_URL=https://your-client-domain.example
CORS_ORIGINS=https://your-client-domain.example
VITE_API_URL=https://your-api-domain.example/api
```

For the current Clientra deployment, the API allowlist includes both the apex
domain and its `www` variant:

```bash
FRONTEND_URL=https://clientra.me
CORS_ORIGINS=https://clientra.me,https://www.clientra.me
```

Password reset and email two-factor authentication use Brevo's HTTPS email API:

```bash
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=CLIENTRA Security
```

Create and verify the sender in Brevo before deploying. Use the REST API
configuration above rather than Brevo SMTP so email works on Render's free tier.

OTP hashes use `JWT_SECRET` as the key by default. For independent key rotation,
set a separate long random value:

```bash
OTP_HASH_SECRET=<long random secret>
```

Database diagnostics are disabled in production unless explicitly enabled with
`ENABLE_DATABASE_DIAGNOSTICS=true` and a matching `DATABASE_DIAGNOSTICS_TOKEN`.
