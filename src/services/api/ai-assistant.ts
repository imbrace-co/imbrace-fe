import { fetchMethod } from "../axios";

export const getAIAssistant = {
    api: () => `/ai/v3/accounts/assistants`,
    method: fetchMethod.GET,
};

export const getAIAssistantById = {
    api: (id: string) => `/ai/v3/assistants/${id}`,
    method: fetchMethod.GET,
};

export const getBuiltinAssistantById = {
    api: (id: string) => `/v1/marketplaces/use-cases/builtin-assistants/${id}`,
    method: fetchMethod.GET,
};

export const getAIAssistantLLMModels = {
    api: () => `/ai/v3/workflow-agent/models`,
    method: fetchMethod.GET,
};

export const getAIAssistantAgents = {
    api: () => '/ai/v3/assistants/agents',
    method: fetchMethod.GET,
};

export const patchAIAssistantInstructions = {
    api: (id: string ) => `/ai/v3/assistants/${id}/instructions`,
    method: fetchMethod.PATCH,
};

export const postAIAssistant = {
    api: () => `/ai/v3/assistant_apps`,
    method: fetchMethod.POST,
};

export const putAIAssistant = {
    api: (id: string) => `/ai/v3/assistant_apps/${id}`,
    method: fetchMethod.PUT,
};

export const deleteAiAssistant = {
    api: (id: string) => `/ai/v3/assistant_apps/${id}`,
    method: fetchMethod.DELETE,
};

export const updateAiAssistant = {
    api: (id: string) => `/ai/v3/assistant_apps/${id}`,
    method: fetchMethod.PUT,
};

export const verifyToolServer = {
    api: () => `/ai/v3/configs/tool_servers/verify`,
    method: fetchMethod.POST,
};

export const createCustomProvider = {
    api: () => `/ai/v3/providers`,
    method: fetchMethod.POST,
};

export const getCustomProviders = {
    api: () => `/ai/v3/providers`,
    method: fetchMethod.GET,
};

export const updateCustomProvider = {
    api: (id: string) => `/ai/v3/providers/${id}`,
    method: fetchMethod.PUT,
};

export const deleteCustomProvider = {
    api: (id: string) => `/ai/v3/providers/${id}`,
    method: fetchMethod.DELETE,
};

export const refreshProviderModels = {
    api: (id: string) => `/ai/v3/providers/${id}/models/refresh`,
    method: fetchMethod.POST,
};