import { createQueryKeys } from '@lukemorales/query-key-factory';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DocumentSchema, SchemaAttribute, SchemaCategory, SchemaCategoryType, SchemaVersionsResponse } from '@/pages/BoardSchema/types';

import { postBoardUpload } from '../api/crm';
import {
    deleteSchema,
    deleteSchemaAttribute,
    deleteSchemaCategory,
    getSchemaById,
    getSchemaCategories,
    getSchemaCategoryById,
    getSchemas,
    getSchemaVersions,
    postSchema,
    postSchemaAttribute,
    postSchemaCategory,
    postSchemaExtractAttributes,
    putSchema,
    putSchemaAttribute,
    putSchemaCategory,
} from '../api/schema';
import { ImbraceClient, ImbraceFileUpload } from '../axios';
import apiFetch from '../axios/handler';

export type SchemaListParams = {
    search?: string;
    categoryId?: string;
    limit?: number;
    skip?: number;
};

export type CategoryListParams = {
    search?: string;
    /** Namespace filter — call sites pass the type they want (schema builder passes 'schema'). */
    type?: SchemaCategoryType;
    limit?: number;
    skip?: number;
};

export const schemaQueries = createQueryKeys('documentSchema', {
    categories: (params: CategoryListParams = {}) => ({
        queryKey: [{ ...params }],
        queryFn: async ({ signal }) => {
            const { data } = await apiFetch<{ data: SchemaCategory[] }>(
                getSchemaCategories.api(params),
                getSchemaCategories.method,
                {},
                ImbraceClient,
                { signal },
            );
            return data.data ?? [];
        },
    }),
    categoryDetail: (id?: string) => ({
        queryKey: [id],
        queryFn: async ({ signal }) => {
            if (!id) throw new Error('missing category id');
            const { data } = await apiFetch<SchemaCategory>(
                getSchemaCategoryById.api(id),
                getSchemaCategoryById.method,
                {},
                ImbraceClient,
                { signal },
            );
            return data;
        },
    }),
    schemas: (params: SchemaListParams = {}) => ({
        queryKey: [{ ...params }],
        queryFn: async ({ signal }) => {
            const { data } = await apiFetch<{ data: DocumentSchema[] }>(
                getSchemas.api(params),
                getSchemas.method,
                {},
                ImbraceClient,
                { signal },
            );
            return data.data ?? [];
        },
    }),
    schemaDetail: (id?: string) => ({
        queryKey: [id],
        queryFn: async ({ signal }) => {
            if (!id) throw new Error('missing schema id');
            const { data } = await apiFetch<{ data: DocumentSchema }>(
                getSchemaById.api(id),
                getSchemaById.method,
                {},
                ImbraceClient,
                { signal },
            );
            return data.data;
        },
    }),
    schemaVersions: (schemaId?: string) => ({
        queryKey: [schemaId, 'versions'],
        queryFn: async ({ signal }) => {
            if (!schemaId) throw new Error('missing schema id');
            const { data } = await apiFetch<SchemaVersionsResponse>(
                getSchemaVersions.api(schemaId, { limit: 50 }),
                getSchemaVersions.method,
                {},
                ImbraceClient,
                { signal },
            );
            return data;
        },
    }),
});

export const useSchemaCategories = (params: CategoryListParams = {}) =>
    useQuery({
        ...schemaQueries.categories(params),
    });

export const useSchemaCategoryDetail = (id?: string) =>
    useQuery({
        ...schemaQueries.categoryDetail(id),
        enabled: !!id,
    });

export const useSchemas = (params: SchemaListParams = {}) =>
    useQuery({
        ...schemaQueries.schemas(params),
    });

export const useSchemaDetail = (id?: string) =>
    useQuery({
        ...schemaQueries.schemaDetail(id),
        enabled: !!id,
    });

export const useSchemaVersions = (schemaId?: string) =>
    useQuery({
        ...schemaQueries.schemaVersions(schemaId),
        enabled: !!schemaId,
    });

export const useCreateSchemaCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (body: { name: string; parentId?: string; type: SchemaCategoryType }) => {
            const { data } = await apiFetch<{ data: SchemaCategory } | SchemaCategory>(
                postSchemaCategory.api(),
                postSchemaCategory.method,
                body,
            );
            // BE wraps the payload in `{ data: ... }` and may return `_id` instead of `id`.
            const raw = ((data as { data?: SchemaCategory })?.data ?? (data as SchemaCategory));
            return {
                ...raw,
                id: raw.id ?? raw._id ?? '',
                subCategories: raw.subCategories ?? [],
            } as SchemaCategory;
        },
        onSuccess: (created, vars) => {
            // Optimistically push the new top-level category into the cached lists
            // so the page can switch the active tab immediately (before refetch lands).
            if (!vars.parentId && created?.id) {
                queryClient.setQueriesData(
                    { queryKey: schemaQueries.categories._def },
                    (old: SchemaCategory[] | undefined) => {
                        if (!old) return old;
                        if (old.some((c) => c.id === created.id)) return old;
                        return [...old, created];
                    },
                );
            }
            queryClient.invalidateQueries({ queryKey: schemaQueries.categories._def });
        },
    });
};

export const useUpdateSchemaCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, body }: { id: string; body: { name?: string; parentId?: string } }) => {
            const { data } = await apiFetch<SchemaCategory>(
                putSchemaCategory.api(id),
                putSchemaCategory.method,
                body,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.categories._def });
        },
    });
};

export const useDeleteSchemaCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, parentId }: { id: string; parentId?: string }) => {
            // If deleting a sub-category, move its schemas to the parent first.
            if (parentId) {
                const { data } = await apiFetch<{ data: DocumentSchema[] }>(
                    getSchemas.api({ categoryId: id }),
                    getSchemas.method,
                    {},
                    ImbraceClient,
                );
                const affected = (data.data ?? []).filter(
                    (s) => (s.category_id ?? s.category ?? '') === id,
                );
                await Promise.all(
                    affected.map((s) =>
                        apiFetch(putSchema.api(s._id ?? s.id), putSchema.method, { category: parentId }),
                    ),
                );
            }
            await apiFetch(deleteSchemaCategory.api(id), deleteSchemaCategory.method);
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.categories._def });
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemas._def });
        },
    });
};

export const useCreateSchema = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (body: Omit<DocumentSchema, 'id'>) => {
            const { data } = await apiFetch<{ data: DocumentSchema }>(
                postSchema.api(),
                postSchema.method,
                body,
            );
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemas._def });
        },
    });
};

export const useUpdateSchema = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, body }: { id: string; body: Partial<DocumentSchema> }) => {
            const { data } = await apiFetch<DocumentSchema>(putSchema.api(id), putSchema.method, body);
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemas._def });
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemaDetail(vars.id).queryKey });
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemaVersions(vars.id).queryKey });
        },
    });
};

export const useDeleteSchema = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await apiFetch(deleteSchema.api(id), deleteSchema.method);
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemas._def });
        },
    });
};

// ---- Attribute mutations ----

export const useCreateSchemaAttribute = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            schemaId,
            body,
        }: {
            schemaId: string;
            body: Omit<SchemaAttribute, 'id'>;
        }) => {
            const { data } = await apiFetch<SchemaAttribute>(
                postSchemaAttribute.api(schemaId),
                postSchemaAttribute.method,
                body,
            );
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemaDetail(vars.schemaId).queryKey });
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemas._def });
        },
    });
};

export const useUpdateSchemaAttribute = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            schemaId,
            attributeId,
            body,
        }: {
            schemaId: string;
            attributeId: string;
            body: Partial<SchemaAttribute>;
        }) => {
            const { data } = await apiFetch<SchemaAttribute>(
                putSchemaAttribute.api(schemaId, attributeId),
                putSchemaAttribute.method,
                body,
            );
            return data;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemaDetail(vars.schemaId).queryKey });
        },
    });
};

export const useDeleteSchemaAttribute = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ schemaId, attributeId }: { schemaId: string; attributeId: string }) => {
            await apiFetch(deleteSchemaAttribute.api(schemaId, attributeId), deleteSchemaAttribute.method);
            return true;
        },
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemaDetail(vars.schemaId).queryKey });
            queryClient.invalidateQueries({ queryKey: schemaQueries.schemas._def });
        },
    });
};

// ---- AI auto-generate attributes from sample files ----

export const useExtractSchemaAttributes = () => {
    return useMutation({
        mutationFn: async ({
            files,
            providerId,
            modelId,
        }: {
            files: File[];
            /** Provider + model used to analyse the sample document (chosen in the dialog). */
            providerId?: string;
            modelId?: string;
        }): Promise<SchemaAttribute[]> => {
            // 1) Upload each file → collect URLs.
            const uploadForm = new FormData();
            files.forEach((file) => uploadForm.append('', file));
            const { data: uploaded } = await apiFetch<
                { name: string; url: string; key: string }[]
            >(postBoardUpload.api, postBoardUpload.method, uploadForm, ImbraceFileUpload);
            const fileUrls = (uploaded ?? []).map((f) => f.url).filter(Boolean);

            // 2) Call extract with the resulting URLs (JSON body per spec).
            const { data } = await apiFetch<{ attributes: SchemaAttribute[] }>(
                postSchemaExtractAttributes.api(),
                postSchemaExtractAttributes.method,
                {
                    file_urls: fileUrls,
                    ...(providerId ? { provider_id: providerId } : {}),
                    ...(modelId ? { model_name: modelId } : {}),
                },
                ImbraceClient,
            );
            return data.attributes ?? [];
        },
    });
};
