## Deployment

This project deploys as a Node/Express API that also serves the built Vite client.
Use Node.js 22.x, matching all three package manifests and the production runtime.

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

The Blueprint attaches a 1 GB persistent disk at `/var/data/clientra` for
public review copies and private originals. Render disks require a paid
service and restrict the service to one instance. Move task outputs to
Cloudinary or another private object store before horizontal scaling.

The root `index.js` remains as a compatibility entry point for an existing
Render service that is still configured to run `node index.js`.

### Required server environment

Set these in the hosting provider. The Render Blueprint also declares the
Brevo keys as required secret inputs:

```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<long random secret>
OUTPUT_STORAGE_ROOT=/var/data/clientra
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

The Vercel build intentionally fails unless `VITE_API_URL` is an absolute
HTTP(S) API URL, preventing `/api` requests from being rewritten to SPA HTML.

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

After reviewing existing production data for duplicate values, create all
declared Mongoose indexes once per release environment with:

```bash
npm run db:indexes --prefix Server
```

This command only creates declared indexes; it does not delete or synchronize
away existing indexes. It is intentionally not part of application startup.

Create and verify the sender in Brevo before deploying. Use the REST API
configuration above rather than Brevo SMTP so email works on Render's free tier.

OTP hashes use `JWT_SECRET` as the key by default. For independent key rotation,
set a separate long random value:

```bash
OTP_HASH_SECRET=<long random secret>
```

Database diagnostics are disabled in every environment unless explicitly enabled with
`ENABLE_DATABASE_DIAGNOSTICS=true` and a matching `DATABASE_DIAGNOSTICS_TOKEN`.
