import { fetchMethod } from '../axios';

export const getDocumentAIList = {
    api: '/v3/ai/document-ai/all',
    method: fetchMethod.GET,
};

export const createDocumentAI = {
    api: '/v3/ai/document-ai/create',
    method: fetchMethod.POST,
};

export const updateDocumentAI = {
    api: (id: string) => `/v3/ai/document-ai/update/${id}`,
    method: fetchMethod.PUT,
};

export const deleteDocumentAI = {
    api: (id: string) => `/v3/ai/document-ai/delete/${id}`,
    method: fetchMethod.DELETE,
};

export const getDocumentAIById = {
    api: (id: string) => `/v3/ai/document-ai/${id}`,
    method: fetchMethod.GET,
};

// Build Automatically flow uses the BoardSchema (/schemas) endpoints:
//  - upload:  `postBoardUpload` (/data-board/boards/upload) — services/api/crm
//  - extract: `postSchemaExtractAttributes` (/data-board/schemas/_extract-attributes)
//             — services/api/schema

// NOTE: Document Model schemas + categories are served by the BoardSchema (/schemas)
// data layer at `/data-board/...`. Use the hooks in `@/services/queries/schema`
// (useSchemas, useSchemaCategories, useCreateSchema, useUpdateSchema, useDeleteSchema)
// so reads/writes share one react-query cache with the /schemas route.
