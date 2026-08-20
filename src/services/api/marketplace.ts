// Marketplace is enterprise-only. Stubbed in OSS build so callers compile.
// Runtime calls hit a disabled endpoint; dependent UI features will not function.

import { fetchMethod } from '../axios';

const DISABLED = '/oss-disabled/marketplace';

export const getJourneyLibraries = { api: DISABLED, method: fetchMethod.GET };
export const getProductById = { api: (_: string) => DISABLED, method: fetchMethod.GET };
export const installProduct = { api: (_: string) => DISABLED, method: fetchMethod.POST };

export const postMarketPlaceFile = { api: () => DISABLED, method: fetchMethod.POST };
export const deleteMarketPlaceFile = { api: (_: string) => DISABLED, method: fetchMethod.DELETE };
export const getMarketPlaceFile = { api: (_: string) => DISABLED, method: fetchMethod.GET };
export const downloadMarketPlaceFile = { api: (_: string) => DISABLED, method: fetchMethod.GET };

export const getAiAssistantById = { api: (_: string) => DISABLED, method: fetchMethod.GET };
export const getCheckAiAssistantName = { api: () => DISABLED, method: fetchMethod.GET };
export const postAiAssistant = { api: () => DISABLED, method: fetchMethod.POST };
export const putAiAssistant = { api: (_: string) => DISABLED, method: fetchMethod.PUT };
export const putAiAssistantWorkflow = { api: (_: string) => DISABLED, method: fetchMethod.PUT };

export const getAiFile = { api: (_: string) => DISABLED, method: fetchMethod.GET };
export const postAiFile = { api: () => DISABLED, method: fetchMethod.POST };
export const deleteAiFile = { api: (_: string) => DISABLED, method: fetchMethod.DELETE };

export const postChannelWorkflows = { api: () => DISABLED, method: fetchMethod.POST };

// AI Agent import/export (file-based, served by the OSS marketplace service).
// Kept enabled — these power the per-agent Export-to-zip and Import-from-zip
// flows, independent of the enterprise marketplace store UI (still stubbed below).
export const postMarketPlaceUseCaseTemplate = {
    api: () => '/marketplaces/v1/market-places/templates',
    method: fetchMethod.POST,
};
export const installMarketPlaceTemplateFromJson = {
    api: () => '/marketplaces/v1/market-places/templates/install-from-json',
    method: fetchMethod.POST,
};
