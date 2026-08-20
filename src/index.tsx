import './index.css';
import './i18n';

import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';

import packageJson from '../package.json';
import App from './App';
import { env } from './env';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

if (process.env.NODE_ENV === 'production' && !env.VITE_UNABLE_SENTRY && env.VITE_APP_SENTRY_DSN) {
    Sentry.init({
        dsn: env.VITE_APP_SENTRY_DSN,
        release: packageJson.version,
        integrations: [
            Sentry.reactRouterV6BrowserTracingIntegration({
                useEffect,
                useLocation,
                useNavigationType,
                createRoutesFromChildren,
                matchRoutes,
            }),
            Sentry.replayIntegration(),
        ],
        environment: env.VITE_APP_SENTRY_ENV,
        normalizeDepth: 10,
        denyUrls: [
            // Hotjar blocked
            /https?:\/\/in\.hotjar\.com/i,
            // Pushy blocked
            /https?:\/\/api\.pushy\.me/i,
            // Facebook flakiness
            /graph\.facebook\.com/i,
            // Facebook blocked
            /connect\.facebook\.net\/en_US\/all\.js/i,
        ],
        tracesSampler: () => {
            if (env.VITE_APP_SENTRY_ENV === 'develop' || env.VITE_APP_SENTRY_ENV === 'local') {
                return false;
            }
            return 1.0;
        },
        beforeBreadcrumb(breadcrumb, hint) {
            // filtering console breadcrumb
            return breadcrumb.category === 'console' ? null : breadcrumb;
        },
        beforeSend(event) {
            if (env.VITE_APP_SENTRY_ENV === 'develop' || env.VITE_APP_SENTRY_ENV === 'local') {
                return null;
            }
            if (event.fingerprint) {
                const [method, api, status] = event.fingerprint;
                if (method === 'get' && status === '401') {
                    switch (api) {
                        case '/backend/v1/business_units':
                        case '/backend/v1/account':
                            return null;
                        default:
                            break;
                    }

                    console.log(event);
                }
            }
            return event;
        },
    });
}
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(<App />);

serviceWorkerRegistration.register();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
