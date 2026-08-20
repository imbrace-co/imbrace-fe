import { createQueryKeys } from '@lukemorales/query-key-factory';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { SchemaCategory } from '@/pages/BoardSchema/types';

import { getBoards, updateBoardById } from '../api/crm';
import {
    deleteSchemaCategory,
    getSchemaCategories,
    postSchemaCategory,
    putSchemaCategory,
} from '../api/schema';
import { ImbraceClient } from '../axios';
import apiFetch from '../axios/handler';

/**
 * Data Board categories — same `/data-board/categories` store the /schemas page uses,
 * but namespaced by `type: 'databoard'`. Boards carry `category_id` (read) / `category`
 * (write), exactly like schemas. This mirrors `services/queries/schema.ts`.
 */

export type DataboardCategoryListParams = {
    search?: string;
    limit?: number;
    skip?: number;
};

export const databoardCategoryQueries = createQueryKeys('databoardCategory', {
    list: (params: DataboardCategoryListParams = {}) => ({
        queryKey: [{ ...params }],
        queryFn: async ({ signal }) => {
            const { data } = await apiFetch<{ data: SchemaCategory[] }>(
                getSchemaCategories.api({ ...params, type: 'databoard' }),
                getSchemaCategories.method,
                {},
                ImbraceClient,
                { signal },
            );
            return data.data ?? [];
        },
    }),
});

export const useDataboardCategories = (params: DataboardCategoryListParams = {}) =>
    useQuery({
        ...databoardCategoryQueries.list(params),
    });

export const useCreateDataboardCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (body: { name: string; parentId?: string }) => {
            const { data } = await apiFetch<{ data: SchemaCategory } | SchemaCategory>(
                postSchemaCategory.api(),
                postSchemaCategory.method,
                { ...body, type: 'databoard' },
                ImbraceClient,
            );
            // BE wraps the payload in `{ data: ... }` and may return `_id` instead of `id`.
            const raw = (data as { data?: SchemaCategory })?.data ?? (data as SchemaCategory);
            return {
                ...raw,
                id: raw.id ?? raw._id ?? '',
                subCategories: raw.subCategories ?? [],
            } as SchemaCategory;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: databoardCategoryQueries.list._def });
        },
    });
};

export const useUpdateDataboardCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, body }: { id: string; body: { name?: string; parentId?: string } }) => {
            const { data } = await apiFetch<SchemaCategory>(
                putSchemaCategory.api(id),
                putSchemaCategory.method,
                body,
                ImbraceClient,
            );
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: databoardCategoryQueries.list._def });
        },
    });
};

export const useDeleteDataboardCategory = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, parentId }: { id: string; parentId?: string }) => {
            // Mirror /schemas: re-home the boards under this category before deleting it.
            // Sub-category boards move to the parent; top-level boards become uncategorised.
            const { data } = await apiFetch<{ data: API.Board[] }>(
                getBoards.api({ limit: 0, skip: 0, sort: '-created_at', includeAll: true }),
                getBoards.method,
                {},
                ImbraceClient,
            );
            const affected = (data.data ?? []).filter(
                (b) => (b.category_id ?? b.category ?? '') === id,
            );
            await Promise.all(
                affected.map((b) =>
                    apiFetch(
                        updateBoardById.api(b.id || b._id),
                        updateBoardById.method,
                        { category: parentId ?? null },
                        ImbraceClient,
                    ),
                ),
            );
            await apiFetch(deleteSchemaCategory.api(id), deleteSchemaCategory.method, {}, ImbraceClient);
            return true;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: databoardCategoryQueries.list._def });
            // Boards were re-homed — refresh the board lists so grid counts stay accurate.
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
    });
};
