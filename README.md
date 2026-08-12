# Secret Santa Pairer

Privately shuffle Secret Santa assignments and notify each participant of their recipient - built for families and groups that cannot draw names in person.

**Live museum demo:** [santa.fullstackboston.com](https://santa.fullstackboston.com)  
**License:** MIT

## Features

- Host flow: add participants (3+) -> Start Pairing (send + on-screen reveal in one step)
- Per person: reveal on screen or send message
- Fair pairing for odd or even groups: no self-gifts, no mutual pairs
- One-at-a-time press-and-hold reveal so only the called player sees their recipient
- Configurable budget, event date/label, and **any-language** message catalog
- Per-person language picks: each participant only receives the languages they need
- Pluggable notify providers: `stub`, `twilio`, `smtp`, `aws_sns`, `http_sms`
- Installable PWA with offline shell caching (API always network-only)
- Museum mode: stub deliveries only (safe public demo)
- Responsive UI for phone, tablet, and desktop

## Quick start

```bash
cp example.env .env
npm install
npm run dev
```

- API: `http://127.0.0.1:3024`
- UI (Vite): `http://127.0.0.1:5173` (proxies `/api`)

Production:

```bash
npm run build
npm start
```

Docker (museum-style stub demo on port 3024):

```bash
cp example.env .env
docker compose up -d --build
```

## Security model

The API is **unauthenticated** and meant for a **trusted host** (you, on your device or LAN). Anyone who can reach the server can read the roster and trigger pairing/notify. Put real SMS/email instances behind a VPN or reverse-proxy auth. See [SECURITY.md](./SECURITY.md).

`MUSEUM_MODE=true` always forces `NOTIFY_PROVIDER=stub`, even if `.env` says otherwise.

## Notify providers

Set `NOTIFY_PROVIDER` in `.env` (see `example.env` for credential names):

| Value | Contact field | Notes |
|-------|---------------|-------|
| `stub` | phone or email | Logs/previews only - museum default |
| `twilio` | phone | Classic SMS path |
| `smtp` | email | Nodemailer |
| `aws_sns` | phone | AWS SNS Publish |
| `http_sms` | phone | POST JSON to `HTTP_SMS_URL` (generic SMS gateway template) |

Museum / public eval:

```env
MUSEUM_MODE=true
NOTIFY_PROVIDER=stub
SEED_MUSEUM_DEMO=true
```

In the UI, open **How to run this** / **Send for real** for the same recipes without leaving the page.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + Vite client |
| `npm test` | Unit tests (pairing + messages) |
| `npm run lint` | Typecheck |
| `npm run build` | Client + server build |
| `npm start` | Serve built app |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please report vulnerabilities privately per [SECURITY.md](./SECURITY.md).

## Why

Built so a bilingual family could run Secret Santa remotely without the host learning the assignments - papers in a hat, over a private message.
