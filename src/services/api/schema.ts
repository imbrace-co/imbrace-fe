import { fetchMethod } from '../axios';

const BASE = '/data-board';

// ---- Category endpoints ----

export const getSchemaCategories = {
    api: ({ search, type, limit, skip }: { search?: string; type?: string; limit?: number; skip?: number } = {}) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (type) params.append('type', type);
        if (typeof limit === 'number') params.append('limit', `${limit}`);
        if (typeof skip === 'number') params.append('skip', `${skip}`);
        const query = params.toString();
        return `${BASE}/categories${query ? `?${query}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getSchemaCategoryById = {
    api: (id: string) => `${BASE}/categories/${id}`,
    method: fetchMethod.GET,
};

export const postSchemaCategory = {
    api: () => `${BASE}/categories`,
    method: fetchMethod.POST,
};

export const putSchemaCategory = {
    api: (id: string) => `${BASE}/categories/${id}`,
    method: fetchMethod.PUT,
};

export const deleteSchemaCategory = {
    api: (id: string) => `${BASE}/categories/${id}`,
    method: fetchMethod.DELETE,
};

// ---- Schema endpoints ----

export const getSchemas = {
    api: ({
        search,
        categoryId,
        limit,
        skip,
    }: {
        search?: string;
        categoryId?: string;
        limit?: number;
        skip?: number;
    } = {}) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (categoryId) params.append('categoryId', categoryId);
        if (typeof limit === 'number') params.append('limit', `${limit}`);
        if (typeof skip === 'number') params.append('skip', `${skip}`);
        const query = params.toString();
        return `${BASE}/schemas${query ? `?${query}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const getSchemaById = {
    api: (id: string) => `${BASE}/schemas/${id}`,
    method: fetchMethod.GET,
};

export const postSchema = {
    api: () => `${BASE}/schemas`,
    method: fetchMethod.POST,
};

export const putSchema = {
    api: (id: string) => `${BASE}/schemas/${id}`,
    method: fetchMethod.PUT,
};

export const deleteSchema = {
    api: (id: string) => `${BASE}/schemas/${id}`,
    method: fetchMethod.DELETE,
};

// ---- Attribute endpoints (nested under a Schema) ----

export const postSchemaAttribute = {
    api: (schemaId: string) => `${BASE}/schemas/${schemaId}/attributes`,
    method: fetchMethod.POST,
};

export const putSchemaAttribute = {
    api: (schemaId: string, attributeId: string) => `${BASE}/schemas/${schemaId}/attributes/${attributeId}`,
    method: fetchMethod.PUT,
};

export const deleteSchemaAttribute = {
    api: (schemaId: string, attributeId: string) => `${BASE}/schemas/${schemaId}/attributes/${attributeId}`,
    method: fetchMethod.DELETE,
};

// ---- Version history ----

export const getSchemaVersions = {
    api: (schemaId: string, params: { limit?: number; skip?: number } = {}) => {
        const qs = new URLSearchParams();
        if (params.limit != null) qs.set('limit', String(params.limit));
        if (params.skip != null) qs.set('skip', String(params.skip));
        const q = qs.toString();
        return `${BASE}/schemas/${schemaId}/versions${q ? `?${q}` : ''}`;
    },
    method: fetchMethod.GET,
};

// ---- AI auto-generate attributes from sample files ----

export const postSchemaExtractAttributes = {
    api: () => `${BASE}/schemas/_extract-attributes`,
    method: fetchMethod.POST,
};
