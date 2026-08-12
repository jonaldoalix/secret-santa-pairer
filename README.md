# Secret Santa Pairer

Privately shuffle Secret Santa assignments and notify each participant of their recipient — built for families and groups that cannot draw names in person.

## Features

- Host flow: add participants (3+) → shuffle → notify
- Fair pairing for odd or even groups: no self-gifts, no mutual pairs
- Pluggable notify providers: `stub`, `twilio`, `smtp`, `aws_sns`, `http_sms`
- Configurable budget, event date/label, and **any-language** message blocks (editable in the host UI)
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

## Notify providers

Set `NOTIFY_PROVIDER` in `.env`:

| Value | Contact field | Notes |
|-------|---------------|-------|
| `stub` | phone or email | Logs/previews only — museum default |
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

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | API + Vite client |
| `npm test` | Unit tests (pairing + messages) |
| `npm run lint` | Typecheck |
| `npm run build` | Client + server build |
| `npm start` | Serve built app |

## Why

Built so a bilingual family could run Secret Santa remotely without the host learning the assignments — papers in a hat, over a private message.
