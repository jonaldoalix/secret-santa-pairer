# Contributing

Thanks for taking an interest in Secret Santa Pairer.

## Development

```bash
cp example.env .env
npm install
npm run dev
```

- API: `http://127.0.0.1:3024`
- UI: `http://127.0.0.1:5173` (proxies `/api`)

Before opening a PR:

```bash
npm run lint
npm run test:coverage
npm run build
```

Coverage must stay at **100%** for `shared/` and `server/src/` (process entry `server/src/index.ts` excluded).

## Guidelines

- Keep the host flow simple: add people, Start Pairing, private reveal or send.
- Prefer small, focused PRs with a short “why” in the description.
- Do not commit `.env`, credentials, or real participant data.
- Museum mode must remain stub-only (enforced in `server/src/config.ts`).

## Code of conduct

Be respectful. Harassment or abuse is not welcome in issues, PRs, or discussions.
