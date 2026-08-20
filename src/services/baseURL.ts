import { env } from '@/env';

export const IPS_URL = env.VITE_APP_API_IPS_HOST;
export const CHAT_WIDGET_URL = env.VITE_APP_API_CHAT_HOST;
export const GOOGLE_SCRIPT_URL = env.VITE_APP_GOOGLE_SCRIPT_URL;
export const CAMPAIGN_URL = env.VITE_APP_CAMPAIGN_DOMAIN;
export const WCS_URL = env.VITE_APP_WCS_HOST;
export const APWF_URL = env.VITE_APP_ACTIVEPIECES_DOMAIN;

export const IMBRACE_API = '/api';
export const IPS_API = '/api/ips';
// Proxied to the ActivePieces host (VITE_APP_APWF_HOST) — see vite.config.ts
export const APWF_API = '/ap-workflow';
export const SOCKET_ENDPOINT = '/ws';
export const DATA_ANALYTICS_API = '/api/analytics';
// Vite proxy rewrites `/api/ai-tracing/*` -> `http://localhost:3002/*`
// Tempo poller exposes endpoints under `/api/*`, so we keep `/api` here.
export const AI_TRACING_API = '/api/ai-tracing/api/trace/';
export const GOOGLE_SHEET_SCRIPT_URL = GOOGLE_SCRIPT_URL;
export const CAMPAIGN_QRCODE_URL = CAMPAIGN_URL;




