# Security Policy

## Supported versions

Security fixes are applied on the `main` branch of this repository.

## Threat model

This app is designed for a **trusted host** (one operator on a phone or laptop, or a LAN party). The HTTP API is **not authenticated**: anyone who can reach `/api` can read the roster, change settings, start pairing, peek reveals, and trigger notifications.

Do **not** expose a live (non-stub) instance to the public internet without putting it behind your own auth (VPN, reverse-proxy basic auth, SSO, etc.).

Museum / demo mode (`MUSEUM_MODE=true`) forces the stub notifier so public evaluation sites cannot send real SMS or email.

## Reporting a vulnerability

Please email **hello@fullstackboston.com** with:

- A short description of the issue
- Steps to reproduce
- Impact (data exposure, unwanted sends, etc.)

Do not open a public GitHub issue for sensitive reports. We will acknowledge receipt within a few business days.
