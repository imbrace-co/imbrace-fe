import { env } from '@/env';

import PackageJson from '../../package.json';
export const app_version = PackageJson.version;
export const build_version = env.VITE_APP_BUILD_VERSION;
