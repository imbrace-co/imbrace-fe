import { createQueryKeys } from '@lukemorales/query-key-factory';
import type { UseQueryOptions } from '@tanstack/react-query';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { getBoardContactFields } from '../api/contact';
import { getBoardById, getBoardRecord, getBoardRecords, getBoards, getRelatedRecords, searchBoardRecord } from '../api/crm';
import { ImbraceClient } from '../axios';
import apiFetch from '../axios/handler';

type BoardsListParamsType = {
    limit?: number;
    skip?: number;
    sort?: string;
    isDefault?: boolean;
    types?: string;
    includeAll?: boolean;
};

type RelatedRecordsParamsType = {
    limit?: number;
    skip: number;
    sort?: string;
    link: boolean;
    name?: string;
};

type RecordListParamsType = {
    pagination: { pageIndex: number; pageSize: number };
    sorters?: string[];
    globalFilter?: string;
    filters?: string;
};

// Server-side paginated board list (see boards-list-api.md). Reuses the same
// `/data-board/boards` endpoint but adds `search` + `category_id` filters and reads
// the `total` from the response so the FE can render page controls without fetching all.
type BoardsPaginatedParamsType = {
    limit: number;
    skip: number;
    sort?: string;
    types?: string;
    search?: string;
    categoryId?: string;
    includeAll?: boolean;
};

const normalizeBoard = (board: API.Board): API.Board => ({
    ...board,
    id: board.id || board._id,
    _id: board._id || board.id,
    description: board.description || '',
    show_id: board.show_id ?? false,
    is_child_table: board.is_child_table ?? false,
    fields: (board.fields || []).map((field) => {
        const f = field as any;
        return {
            ...field,
            _id: field._id || f.id,
            is_identifier: field.is_identifier ?? f.isIdentifier ?? false,
            is_default: field.is_default ?? f.isDefault ?? false,
            hidden_on_record: field.hidden_on_record ?? f.hiddenOnRecord ?? false,
            is_unique_identifier: field.is_unique_identifier ?? f.isUniqueIdentifier ?? false,
            board_child_mapped: field.board_child_mapped ?? f.boardChildMapped,
        };
    }),
});

// Build `/data-board/boards?...` for the paginated list. Kept local (not in the shared
// `getBoards.api`) so the search/category_id params stay scoped to the index pagination.
const buildPaginatedBoardsUrl = ({ limit, skip, sort = '-created_at', types = '', search = '', categoryId = '', includeAll }: BoardsPaginatedParamsType) => {
    const sp = new URLSearchParams();
    sp.append('limit', `${limit}`);
    sp.append('skip', `${skip}`);
    sp.append('sort', sort);
    if (types) sp.append('types', types);
    if (includeAll !== undefined) sp.append('include_all', `${includeAll}`);
    if (search.trim()) sp.append('search', search.trim());
    if (categoryId) sp.append('category_id', categoryId);
    return `/data-board/boards?${sp.toString()}`;
};

export const boards = createQueryKeys('boards', {
    list: ({ limit = 0, skip = 0, sort = '-created_at', isDefault, types = '', includeAll }: BoardsListParamsType) => ({
        queryKey: [
            {
                limit,
                skip,
                sort,
                isDefault,
                types,
                includeAll,
            },
        ],
        queryFn: async ({ signal }) => {
            const { data } = await apiFetch<{ data: API.Board[] }>(
                getBoards.api({
                    limit,
                    skip,
                    sort,
                    isDefault,
                    types,
                    includeAll,
                }),
                getBoards.method,
                {},
                ImbraceClient,
                {
                    signal,
                },
            );
            return data.data.map(normalizeBoard);
        },
    }),
    paginated: ({ limit, skip, sort = '-created_at', types = '', search = '', categoryId = '', includeAll }: BoardsPaginatedParamsType) => ({
        queryKey: [{ limit, skip, sort, types, search, categoryId, includeAll }],
        queryFn: async ({ signal }) => {
            const { data } = await apiFetch<{ data: API.Board[]; total?: number }>(
                buildPaginatedBoardsUrl({ limit, skip, sort, types, search, categoryId, includeAll }),
                getBoards.method,
                {},
                ImbraceClient,
                { signal },
            );
            return {
                boards: (data.data ?? []).map(normalizeBoard),
                total: data.total ?? (data.data?.length ?? 0),
            };
        },
    }),
    detail: (boardId?: string) => ({
        queryKey: [boardId],
        queryFn: async ({ signal }) => {
            if (!boardId) {
                throw new Error('missing board id');
            }

            const { data: raw } = await apiFetch<{ data: API.Board } | API.Board>(getBoardById.api(boardId), getBoardById.method, {}, ImbraceClient, {
                signal,
            });

            const data: API.Board = (raw as { data: API.Board }).data ?? (raw as API.Board);

            return {
                ...data,
                id: data.id || data._id,
                _id: data._id || data.id,
                description: data.description || '',
                show_id: data.show_id ?? false,
                is_child_table: data.is_child_table ?? false,
                fields: (data.fields || []).map((field) => {
                    const f = field as any;
                    return {
                        ...field,
                        _id: field._id || f.id,
                        is_identifier: field.is_identifier ?? f.isIdentifier ?? false,
                        is_default: field.is_default ?? f.isDefault ?? false,
                        hidden_on_record: field.hidden_on_record ?? f.hiddenOnRecord ?? false,
                        is_unique_identifier: field.is_unique_identifier ?? f.isUniqueIdentifier ?? false,
                    };
                }),
            };
        },
        contextQueries: {
            records: {
                queryKey: null,
                queryFn: null,
                contextQueries: {
                    detail: (recordId?: string) => ({
                        queryKey: [recordId],
                        queryFn: async () => {
                            if (!boardId) {
                                throw new Error('missing board id');
                            }

                            if (!recordId) {
                                throw new Error('missing record id');
                            }

                            const { data } = await apiFetch<{ data: API.BoardItem } | API.BoardItem>(getBoardRecord.api(boardId, recordId), getBoardRecord.method);
                            return (data as { data: API.BoardItem }).data ?? (data as API.BoardItem);
                        },
                        contextQueries: {
                            relatedRecords: (relatedBoardId) => ({
                                queryKey: [relatedBoardId],
                                queryFn: null,
                                contextQueries: {
                                    list: (params: RelatedRecordsParamsType) => ({
                                        queryKey: [relatedBoardId, params],
                                        queryFn: async () => {
                                            if (!boardId) {
                                                throw new Error('missing board id');
                                            }

                                            if (!recordId) {
                                                throw new Error('missing record id');
                                            }
                                            const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                                                getRelatedRecords.api(boardId, recordId, relatedBoardId),
                                                getRelatedRecords.method,
                                                params,
                                            );
                                            return {
                                                data: data.data,
                                                has_more: data.has_more,
                                                total: data.total,
                                                count: data.count,
                                                limit: params.limit,
                                            };
                                        },
                                    }),
                                    infiniteList: (params: RelatedRecordsParamsType) => ({
                                        queryKey: [relatedBoardId, params],
                                        queryFn: async ({ pageParam }) => {
                                            if (!boardId) {
                                                throw new Error('missing board id');
                                            }

                                            if (!recordId) {
                                                throw new Error('missing record id');
                                            }
                                            const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                                                getRelatedRecords.api(boardId, recordId, relatedBoardId),
                                                getRelatedRecords.method,
                                                {
                                                    ...params,
                                                    skip: pageParam,
                                                },
                                            );
                                            return {
                                                data: data.data,
                                                has_more: data.has_more,
                                                total: data.total,
                                                count: data.count,
                                                limit: params.limit,
                                                previousSkip: Math.max((pageParam as number) - (params.limit ?? 20), 0),
                                                nextSkip: data.has_more ? (pageParam as number) + (params.limit ?? 20) : undefined,
                                                currentSkip: pageParam as number,
                                            };
                                        },
                                    }),
                                },
                            }),
                        },
                    }),
                    list: (params: RecordListParamsType) => ({
                        queryKey: [params],
                        queryFn: async ({ signal }) => {
                            if (!boardId) {
                                throw new Error('missing board id');
                            }

                            const { pagination, sorters, globalFilter, filters } = params;
                            const searchParams = new URLSearchParams();
                            let api = getBoardRecords.api(boardId);
                            let method: 'GET' | 'POST' = getBoardRecords.method;
                            if (pagination) {
                                searchParams.append('limit', `${pagination.pageSize}`);
                                searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
                            }
                            if (sorters) {
                                searchParams.append('sort', sorters[0]);
                            }

                            if (globalFilter || (filters && filters.length > 0)) {
                                api = searchBoardRecord.api(boardId);
                                method = searchBoardRecord.method;
                                const postData: {
                                    limit?: number;
                                    offset?: number;
                                    q?: string;
                                    matchingStrategy: string;
                                    filter?: string;
                                    sort?: string[];
                                } = {
                                    limit: pagination?.pageSize,
                                    q: globalFilter,
                                    matchingStrategy: 'all',
                                };
                                if (pagination) {
                                    postData.offset = pagination.pageIndex * pagination.pageSize;
                                }
                                if (filters) {
                                    postData.filter = filters;
                                }
                                if (sorters) {
                                    postData.sort = sorters;
                                }

                                const { data } = await apiFetch<API.MeilisearchResponse<API.BoardItem[]>>(
                                    api,
                                    method,
                                    postData,
                                    ImbraceClient,
                                    {
                                        signal,
                                    },
                                );

                                return {
                                    data: data.message.hits.map(
                                        (boardItem) => {
                                            const recordId = boardItem._id ?? boardItem.id;
                                            return {
                                                ...boardItem,
                                                ...boardItem.fields,
                                                id: recordId,
                                                board_item_id: recordId,
                                                created_type: boardItem.created_type,
                                            } as API.BoardItem;
                                        },
                                    ),
                                    meta: {
                                        total: data.message.estimatedTotalHits,
                                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                                        limit: pagination?.pageSize ?? 20,
                                    },
                                };
                            } else {
                                const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                                    api,
                                    method,
                                    searchParams,
                                    ImbraceClient,
                                    {
                                        signal,
                                    },
                                );

                                return {
                                    data: data.data.map((boardItem) => ({
                                        ...boardItem,
                                        ...(boardItem.fields || {}),
                                        id: boardItem.board_item_id || boardItem._id || '',
                                    } as API.BoardItem)),
                                    meta: {
                                        total: data.count,
                                        skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                                        limit: pagination?.pageSize ?? 20,
                                    },
                                };
                            }
                        },
                    }),
                },
            },
        },
    }),
});

/**
 * Fetch all boards
 * @param params { limit?: number; skip?: number; sort?: string; isDefault: boolean }
 * @returns
 */
export const useBoards = (params: BoardsListParamsType) =>
    useQuery({
        ...boards.list(params),
        initialData: [],
    });
/**
 * Server-side paginated board list for the Databoard index. Returns `{ boards, total }`
 * for one page; `keepPreviousData` keeps the current page visible while the next loads.
 */
export const usePaginatedBoards = (params: BoardsPaginatedParamsType) =>
    useQuery({
        ...boards.paginated(params),
        placeholderData: keepPreviousData,
    });

export const boardsQueryKey = (params: BoardsListParamsType) => boards.list(params).queryKey;

export const boardsQueryFn = (params: BoardsListParamsType) => boards.list(params).queryFn;

/**
 * Fetch a board by its id
 * @param boardId
 * @returns
 */
export const useBoardById = (boardId?: string) =>
    useQuery({
        ...boards.detail(boardId),
        enabled: !!boardId,
    });
export const boardByIdQueryKey = (boardId?: string) => boards.detail(boardId).queryKey;

export const boardByIdQueryFn = (boardId?: string) => boards.detail(boardId).queryFn;

/**
 * Fetch records by its board
 * @param params { boardId?: string;  }
 * @returns
 */
export const useRecords = (params: { boardId?: string; params: RecordListParamsType }) =>
    useQuery({
        ...boards.detail(params.boardId)._ctx.records._ctx.list(params.params),
        initialData: {
            data: [],
            meta: {
                total: 0,
                skip: 0,
                limit: 20,
            },
        },
        enabled: !!params.boardId,
    });
export const recordsQueryKey = (params: { boardId?: string; params: RecordListParamsType }) =>
    boards.detail(params.boardId)._ctx.records._ctx.list(params.params).queryKey;

export const recordsQueryFn = (params: { boardId?: string; params: RecordListParamsType }) =>
    boards.detail(params.boardId)._ctx.records._ctx.list(params.params).queryFn;

/**
 * Fetch a record by its board and record id
 * @param params { boardId?: string; recordId?: string }
 * @returns
 */
export const useRecordById = (params: { boardId?: string; recordId?: string }) =>
    useQuery({
        ...boards.detail(params.boardId)._ctx.records._ctx.detail(params.recordId),
        enabled: !!params.boardId && !!params.recordId && params.recordId !== 'new',
    });
export const recordByIdQueryKey = (params: { boardId?: string; recordId?: string }) =>
    boards.detail(params.boardId)._ctx.records._ctx.detail(params.recordId).queryKey;

export const recordByIdQueryFn = (params: { boardId?: string; recordId?: string }) =>
    boards.detail(params.boardId)._ctx.records._ctx.detail(params.recordId).queryFn;

/**
 * Fetch related records by boardId, recordId and relatedBoardId
 * @param params { boardId: string; recordId: string; relatedBoardId: string; params: RelatedRecordsParamsType }
 * @returns
 */
export const useRelatedRecords = (params: {
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    params: RelatedRecordsParamsType;
}) =>
    useQuery({
        ...boards
            .detail(params.boardId)
            ._ctx.records._ctx.detail(params.recordId)
            ._ctx.relatedRecords(params.relatedBoardId)
            ._ctx.list(params.params),
        initialData: {
            data: [],
            limit: 20,
            has_more: true,
            total: 0,
            count: 0,
        },
        enabled: !!params.boardId && !!params.recordId && !!params.relatedBoardId,
    });
export const relatedRecordsQueryKey = (params: {
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    params: RelatedRecordsParamsType;
}) =>
    boards
        .detail(params.boardId)
        ._ctx.records._ctx.detail(params.recordId)
        ._ctx.relatedRecords(params.relatedBoardId)
        ._ctx.list(params.params).queryKey;

export const relatedRecordsQueryFn = (params: {
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    params: RelatedRecordsParamsType;
}) =>
    boards
        .detail(params.boardId)
        ._ctx.records._ctx.detail(params.recordId)
        ._ctx.relatedRecords(params.relatedBoardId)
        ._ctx.list(params.params).queryFn;

/**
 * Fetch related records by boardId, recordId and relatedBoardId
 * @param params { boardId: string; recordId: string; relatedBoardId: string; params: RelatedRecordsParamsType }
 * @returns
 */
export const useRelatedRecordsInfinite = (params: {
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    params: RelatedRecordsParamsType;
}) =>
    useInfiniteQuery({
        ...boards
            .detail(params.boardId)
            ._ctx.records._ctx.detail(params.recordId)
            ._ctx.relatedRecords(params.relatedBoardId)
            ._ctx.infiniteList(params.params),
        initialPageParam: 0 as never,
        getPreviousPageParam: (firstPage) => firstPage.previousSkip as never,
        getNextPageParam: (lastPage, groups) => lastPage.nextSkip as never,
        enabled: !!params.boardId && !!params.recordId && !!params.relatedBoardId,
        throwOnError: (error, query) => {
            console.log(error, query);
            return true;
        },
    });
export const relatedRecordsInfiniteQueryKey = (params: {
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    params: RelatedRecordsParamsType;
}) =>
    boards
        .detail(params.boardId)
        ._ctx.records._ctx.detail(params.recordId)
        ._ctx.relatedRecords(params.relatedBoardId)
        ._ctx.infiniteList(params.params).queryKey;

export const relatedRecordsInfiniteQueryFn = (params: {
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    params: RelatedRecordsParamsType;
}) =>
    boards
        .detail(params.boardId)
        ._ctx.records._ctx.detail(params.recordId)
        ._ctx.relatedRecords(params.relatedBoardId)
        ._ctx.infiniteList(params.params).queryFn;

export const contactRecord = createQueryKeys('contactRecord', {
    detail: (contactId?: string) => ({
        queryKey: [contactId],
        queryFn: async () => {
            if (!contactId) {
                throw new Error('Contact ID is required');
            }
            const { data } = await apiFetch<API.BoardItem>(getBoardContactFields.api(contactId), getBoardContactFields.method);
            return data;
        },
    }),
});

export const contactRecordQueryKey = (contactId?: string) => contactRecord.detail(contactId).queryKey;

export const contactRecordQueryFn = (contactId?: string) => contactRecord.detail(contactId).queryFn;
/**
 * Fetch a record by contact id
 * @param params { contactId?: string;}
 * @returns
 */
export const useContactRecord = (
    contactId = '',
    options?: Omit<UseQueryOptions<API.BoardItem, Error, API.BoardItem, ReturnType<typeof contactRecordQueryKey>>, 'queryKey' | 'queryFn'>,
) =>
    useQuery({
        ...contactRecord.detail(contactId),
        enabled: !!contactId,
        ...options,
    });
