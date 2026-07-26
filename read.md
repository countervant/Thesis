## Deployment

This project deploys as a Node/Express API that also serves the built Vite client.

### Build and start

```bash
npm run install:all
npm run build
npm start
```

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

Password reset and email two-factor authentication need a Gmail account with an
app password:

```bash
GMAIL_USER=
GMAIL_PASS=
```

OTP hashes use `JWT_SECRET` as the key by default. For independent key rotation,
set a separate long random value:

```bash
OTP_HASH_SECRET=<long random secret>
```

Database diagnostics are disabled in production unless explicitly enabled with
`ENABLE_DATABASE_DIAGNOSTICS=true` and a matching `DATABASE_DIAGNOSTICS_TOKEN`.
