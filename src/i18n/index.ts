import i18next from 'i18next';
import detector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

import { env } from '@/env';
import cn from '../../public/locale/cn.json';
import en from '../../public/locale/en.json';
import zh from '../../public/locale/zh.json';

type SupportedLangs = {
    [key: string]: string;
};

const fallbackLng = ['en'];
export const supportedLangs: SupportedLangs = { en: 'English (US)', zh: '繁體中文', cn: '简体中文' };

const mapping = {
    local: 'dev',
    dev: 'dev',
    staging: 'stg',
    demo: 'demo',
    prod: 'prod',
    poc: 'dev',
};

const i18nConfig = {
    lng: 'en',
    fallbackLng,
    debug: false,
    returnEmptyString: false,
    interpolation: {
        escapeValue: false,
    },
};

if (env.VITE_APP_LOCAL_TRANSLATIONS === '1') {
    
    i18next
    .use(detector)
    .use(initReactI18next)
    .init({
        ...i18nConfig,
        resources: {
            en: { translation: en },
            cn: { translation: cn },
            zh: { translation: zh },
        },
    });
} else {
    i18next
        .use(Backend)
        .use(detector)
        .use(initReactI18next)
        .init({
           ...i18nConfig,
            backend: {
                loadPath: `/locale/{{lng}}.json`,
            },
        });
}


export default i18next;
