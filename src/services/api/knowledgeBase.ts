import { fetchMethod } from '@/services/axios';

export const getKnowledgeBase = {
    api: () => '/platform/v1/knowledge',
    method: fetchMethod.GET,
};
export const postKnowledgeBaseFile = {
    api: () => '/platform/v1/knowledge/upload',
    method: fetchMethod.POST,
};
