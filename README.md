# imbrace-fe

Main iMBrace webapp (admin / member workspace). Vite + React 18 + Redux Toolkit + PWA.

## Setup

This package depends on [`@imbrace/ui`](https://github.com/imbrace-co/imbrace-ui)
via a relative file path (`file:../imbrace-ui`). Clone both repos as siblings
and build the UI lib first:

```bash
git clone https://github.com/imbrace-co/imbrace-ui.git
cd imbrace-ui && pnpm install && pnpm build      # ~30s — produces dist/

cd ..
git clone https://github.com/imbrace-co/imbrace-fe.git
cd imbrace-fe && pnpm install                    # ~30s
```

> If you rebuild `imbrace-ui/dist` later, run `pnpm install --force` in
> `imbrace-fe` to refresh the cached file: link.

Requirements: Node ≥ 20, pnpm ≥ 9.

## Development

```bash
pnpm start         # vite dev on http://localhost:3001
```

The webapp expects a running backend stack (app-gateway on `:9001`,
platform on `:6040`, etc.).

## Environment

Copy the template and fill in your setup:

```bash
cp .env.example .env.local
```

[`.env.example`](.env.example) documents every variable. The important ones:

| Variable | Purpose |
| --- | --- |
| `VITE_APP_API_HOST` | Main API gateway — almost every `/api/*` call routes here (platform, channel-service, data-board, ai, marketplace). |
| `VITE_APP_API_HOST_OLD` | Legacy API + websocket (`/ws`). |
| `VITE_APP_HOST` | This webapp's own URL — must match the dev port. |
| `VITE_APP_AI_HOST` | AI service (`/api/imbrace-ai`). |
| `VITE_APP_WCS_HOST` | WCS / marketplace iframe. |
| `VITE_APP_INTERNAL_AI_CHAT_HOST` | Embedded AI chat (imbrace-ai-chatbot). |
| `VITE_APP_CHAT_HOST` / `VITE_APP_API_CHAT_HOST` | Chat widget (imbrace-chat-widget) + embed script. |
| `VITE_APP_BEST_ACTION` | Next-best-action / ai-tracing. |
| `VITE_IS_MULTI_TENANCY` | `true` = multiple orgs; `false` = single `default` org. |
| `VITE_APP_*_APP_ID` | Third-party app IDs (WhatsApp / Facebook / Instagram / Google / Pushy) — optional, blank disables the feature. |
| `VITE_APP_HOTJAR_ID`, `VITE_APP_CLARITY_ID`, `VITE_APP_SENTRY_ENV` | Analytics / monitoring — optional. |

> Most service hosts are routed by the gateway, so for a basic local setup you
> mainly need `VITE_APP_API_HOST` pointing at a running app-gateway.

## Build

```bash
pnpm build         # output → build/, ~14 MB, PWA bundle included
```

## License

- [`LICENSE.md`](LICENSE.md) — Sustainable Use License (covers files without `.ee.` in path)
- [`LICENSE_EE.md`](LICENSE_EE.md) — Enterprise License (covers files with `.ee.` in path)
