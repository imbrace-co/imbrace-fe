import { fetchMethod } from '../axios/index';

export const getN8nWorkflowById = {
    api: (workflowId: number) => `/platform/v1/n8n/workflows/${workflowId}`,
    method: fetchMethod.GET,
};

export const patchN8nWorkflowById = {
    api: (workflowId: number) => `/platform/v1/n8n/workflows/${workflowId}`,
    method: fetchMethod.PATCH,
};

export const putChannelWorkflowById = {
    api: (workflowId: string) => `/channel-service/v1/channels/workflows/${workflowId}`,
    method: fetchMethod.PUT,
};

export const deleteN8nWorkflowById = {
    api: (workflowId: string) => `/platform/v1/n8n/workflows/${workflowId}`,
    method: fetchMethod.DELETE,
};

export const deleteChannelWorkflowById = {
    api: (workflowId: string) => `/channel-service/v1/channels/workflows/${workflowId}`,
    method: fetchMethod.DELETE,
};

export const getN8nNewWorkflow = {
    api: () => '/platform/v1/n8n/workflows/new',
    method: fetchMethod.GET,
};

export const getAllNodes = {
    api: () => '/platform/v1/n8n/node-types?onlyLatest=false',
    method: fetchMethod.GET,
};

export const getAllWorkflows = {
    api: (params?: { tag?: string; search?: string, haveAISettings?: boolean }) => {
        const searchParams = new URLSearchParams();
        if (params?.tag) {
            searchParams.append('tag', params.tag);
        }
        if (params?.search) {
            searchParams.append('search', params.search);
        }
        if (params?.haveAISettings) {
            searchParams.append('haveAISettings', params.haveAISettings.toString());
        }
        return `/platform/v1/workflows?${searchParams.toString()}`;
    },
    method: fetchMethod.GET,
};


export const getAllIPSWorkflow = {
    api: ({sort, haveAISettings, ids}: {sort?: string, haveAISettings?: boolean, ids?: string[]}) => `v1/ips/workflows/all${sort ? `?sort=${sort}` : ''}${haveAISettings ? `&haveAISettings=${haveAISettings}` : ''}${ids ? `&ids=${ids}` : ''}`,
    method: fetchMethod.GET,
};

export const getWorkflowsAutomationV2 = {
    api: (channelsType: string) => `/channel-service/v1/workflows/channel_automation?channelType=${channelsType}`,
    method: fetchMethod.GET,
};

export const getCredentials = {
    api: () => '/channel-service/v1/credentials',
    method: fetchMethod.GET,
};

export const getCredentialParams = {
    api: (credentialName: string) => `/channel-service/v1/workflow/_credentialParam?type=${credentialName}`,
    method: fetchMethod.GET,
};

export const getCredentialTypeByName = {
    api: (name: string) => `/platform/v1/workflow/credential-types/${name}`,
    method: fetchMethod.GET,
};

export const getProcessedCredentialTypes = {
    api: () => '/channel-service/v1/workflow/processed-credential-types',
    method: fetchMethod.GET,
};

export const getN8NCredentialTypes = {
    api: () => '/platform/v1/n8n/credential-types',
    method: fetchMethod.GET,
};

export const getCredential = {
    api: (credentialId: string) => `/platform/v1/n8n/credentials/${credentialId}?includeData=true`,
    method: fetchMethod.GET,
};

export const getChannelCredential = {
    api: (credentialId: string) => `/channel-service/v1/channels/credentials/${credentialId}`,
    method: fetchMethod.GET,
};

export const updateCredential = {
    api: (credentialId: string) => `/platform/v1/n8n/credentials/${credentialId}`,
    method: fetchMethod.PATCH,
};

export const updateChannelCredential = {
    api: (credentialId: string) => `/channel-service/v1/channels/credentials/${credentialId}`,
    method: fetchMethod.PUT,
};

export const createCredential = {
    api: () => '/platform/v1/n8n/credentials',
    method: fetchMethod.POST,
};

export const deleteN8nCredential = {
    api: (credentialId: string) => `/platform/v1/n8n/credentials/${credentialId}`,
    method: fetchMethod.DELETE,
};

export const deleteCredential = {
    api: (credential_id: string) => `/channel-service/v1/channels/credentials/${credential_id}`,
    method: fetchMethod.DELETE,
};

export const saveWorkflow = {
    api: () => '/platform/v1/n8n/workflows',
    method: fetchMethod.POST,
};

export const oAuth2Authorize = {
    api: (param: string) => `/platform/v1/n8n/oauth2-credential/auth?${param}`,
    method: fetchMethod.GET,
};

export const oAuth1Authorize = {
    api: (param: string) => `/platform/v1/n8n/oauth1-credential/auth?${param}`,
    method: fetchMethod.GET,
};

