import { env } from '@/env';

// The six hosts below are meant to be overridable at container start via
// GET /config (see docker-entrypoint.sh / env.ts) — that's the whole point of
// shipping one Docker image for every environment. env.ts fetches /config
// asynchronously and merges it into the shared `env` object, but that fetch
// has not resolved yet when this module is first evaluated (it's pulled in
// eagerly by services/axios, which the app needs immediately). A plain
// `export const X = env.Y` would freeze X at that early, build-time value
// forever, silently ignoring whatever /config later provides. Exporting
// functions instead defers the `env.*` read to call time, by which point
// callers are inside render/event-handler code that runs well after /config
// has loaded.
export const getIpsUrl = () => env.VITE_APP_API_IPS_HOST;
export const getChatWidgetUrl = () => env.VITE_APP_API_CHAT_HOST;
export const getGoogleScriptUrl = () => env.VITE_APP_GOOGLE_SCRIPT_URL;
export const getCampaignUrl = () => env.VITE_APP_CAMPAIGN_DOMAIN;
export const getWcsUrl = () => env.VITE_APP_WCS_HOST;
export const getApwfUrl = () => env.VITE_APP_ACTIVEPIECES_DOMAIN;

export const IMBRACE_API = '/api';
export const IPS_API = '/api/ips';
// Proxied to the ActivePieces host (VITE_APP_APWF_HOST) — see vite.config.ts
export const APWF_API = '/ap-workflow';
export const SOCKET_ENDPOINT = '/ws';
export const DATA_ANALYTICS_API = '/api/analytics';
// Vite proxy rewrites `/api/ai-tracing/*` -> `http://localhost:3002/*`
// Tempo poller exposes endpoints under `/api/*`, so we keep `/api` here.
export const AI_TRACING_API = '/api/ai-tracing/api/trace/';
export const getGoogleSheetScriptUrl = () => getGoogleScriptUrl();
export const getCampaignQrcodeUrl = () => getCampaignUrl();
