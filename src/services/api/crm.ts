import { fetchMethod } from '../axios';

export const getBoards = {
    api: ({
        limit,
        skip,
        sort,
        hidden,
        isDefault,
        types,
        attachedTo,
        independentOnly,
        includeAll,
    }: {
        limit: number;
        skip: number;
        sort: string;
        hidden?: boolean;
        isDefault?: boolean;
        types?: string;
        attachedTo?: string;
        independentOnly?: boolean;
        includeAll?: boolean;
    }) => {
        const searchParams = new URLSearchParams();
        searchParams.append('limit', `${limit}`);
        searchParams.append('skip', `${skip}`);
        searchParams.append('sort', sort);
        if (isDefault !== undefined) {
            searchParams.append('is_default', `${isDefault}`);
        }

        if (typeof hidden !== 'undefined') {
            searchParams.append('hidden', `${hidden}`);
        }
        if (types) {
            searchParams.append('types', types);
        }
        if (independentOnly !== undefined) {
            searchParams.append('independent_only', `${independentOnly}`);
        }
        if (includeAll !== undefined) {
            searchParams.append('include_all', `${includeAll}`);
        }
        return `/data-board/boards?${searchParams.toString()}`;
    },
    method: fetchMethod.GET,
};

export const getBoardById = {
    api: (boardId: string) => `/data-board/boards/${boardId}`,
    method: fetchMethod.GET,
};
export const postBoard = {
    api: () => '/data-board/boards',
    method: fetchMethod.POST,
};

export const updateBoardById = {
    api: (boardId: string) => `/data-board/boards/${boardId}`,
    method: fetchMethod.PUT,
};
export const deleteBoard = {
    api: (boardId: string) => `/data-board/boards/${boardId}`,
    method: fetchMethod.DELETE,
};

export const attachChildBoard = {
    api: (parentId: string) => `/data-board/boards/${parentId}/attach-child`,
    method: fetchMethod.POST,
};

export const detachChildBoard = {
    api: (parentId: string, childId: string) => `/data-board/boards/${parentId}/detach-child/${childId}`,
    method: fetchMethod.POST,
};

export const getBoardConnections = {
    api: (boardId: string, maxDepth?: number) =>
        maxDepth != null
            ? `/data-board/boards/${boardId}/connections?max_depth=${maxDepth}`
            : `/data-board/boards/${boardId}/connections`,
    method: fetchMethod.GET,
};

export const getOntology = {
    api: ({
        seedBoardId,
        seedItemId,
        maxDepth,
        includeHidden,
        includeChildTables,
        includeItems,
        itemLimitPerBoard,
        businessUnitId,
    }: {
        seedBoardId?: string;
        seedItemId?: string;
        maxDepth?: number;
        includeHidden?: boolean;
        includeChildTables?: boolean;
        includeItems?: boolean;
        itemLimitPerBoard?: number;
        businessUnitId?: string;
    } = {}) => {
        const searchParams = new URLSearchParams();
        if (seedBoardId) searchParams.append('seed_board_id', seedBoardId);
        if (seedItemId) searchParams.append('seed_item_id', seedItemId);
        if (maxDepth !== undefined) searchParams.append('max_depth', `${maxDepth}`);
        if (includeHidden !== undefined) searchParams.append('include_hidden', `${includeHidden}`);
        if (includeChildTables !== undefined) searchParams.append('include_child_tables', `${includeChildTables}`);
        if (includeItems !== undefined) searchParams.append('include_items', `${includeItems}`);
        if (itemLimitPerBoard !== undefined) searchParams.append('item_limit_per_board', `${itemLimitPerBoard}`);
        if (businessUnitId) searchParams.append('business_unit_id', businessUnitId);
        const qs = searchParams.toString();
        return `/data-board/ontology${qs ? `?${qs}` : ''}`;
    },
    method: fetchMethod.GET,
};

export const postBoardField = {
    api: (boardId: string) => `/data-board/boards/${boardId}/fields`,
    method: fetchMethod.POST,
};

export const putBoardField = {
    api: (boardId: string, fieldId: string) => `/data-board/boards/${boardId}/fields/${fieldId}`,
    method: fetchMethod.PUT,
};

export const deleteBoardField = {
    api: (boardId: string, fieldId: string) => `/data-board/boards/${boardId}/fields/${fieldId}`,
    method: fetchMethod.DELETE,
};

export const getBoardRecord = {
    api: (boardId: string, recordId: string) => `/data-board/boards/${boardId}/items/${recordId}`,
    method: fetchMethod.GET,
};
export const getBoardRecords = {
    api: (boardId: string) => `/data-board/boards/${boardId}/items`,
    method: fetchMethod.GET,
};
export const postBoardRecord = {
    api: (boardId: string) => `/data-board/boards/${boardId}/items`,
    method: fetchMethod.POST,
};

export const putBoardRecord = {
    api: (boardId: string, recordId: string) => `/data-board/boards/${boardId}/items/${recordId}`,
    method: fetchMethod.PUT,
};

export const deleteBoardRecord = {
    api: (boardId: string, recordId: string) => `/data-board/boards/${boardId}/items/${recordId}`,
    method: fetchMethod.DELETE,
};

export const deleteBoardRecords = {
    api: (boardId: string) => `/data-board/boards/${boardId}/items/bulk-delete`,
    method: fetchMethod.DELETE,
};

export const postBoardFile = {
    api: '/data-board/boards/_fileupload',
    method: fetchMethod.POST,
};

export const postBoardUpload = {
    api: '/data-board/boards/upload',
    method: fetchMethod.POST,
};

export const searchBoardRecord = {
    api: (boardId: string) => `/data-board/search/${boardId}`,
    method: fetchMethod.POST,
};

export const postBoardOrder = {
    api: '/data-board/boards/_order',
    method: fetchMethod.POST,
};

export const getBoardSegmentation = {
    api: (boardId: string) => `/data-board/boards/${boardId}/segmentation`,
    method: fetchMethod.GET,
};

export const postBoardSegmentation = {
    api: (boardId: string) => `/data-board/boards/${boardId}/segmentation`,
    method: fetchMethod.POST,
};

export const putBoardSegmentation = {
    api: (boardId: string, segmentationId: string) => `/data-board/boards/${boardId}/segmentation/${segmentationId}`,
    method: fetchMethod.PUT,
};

export const deleteBoardSegmentation = {
    api: (boardId: string, segmentationId: string) => `/data-board/boards/${boardId}/segmentation/${segmentationId}`,
    method: fetchMethod.DELETE,
};
export const getLinkedBoardItems = {
    api: (contactBoardId: string, boardItemId: string, type: 'Opportunities' | 'Tasks') =>
        `/data-board/boards/${contactBoardId}/items/_related_board_item?related_board_item_id=${boardItemId}&type=${type}`,
    method: fetchMethod.GET,
};
export const isContactRecordConflicted = {
    api: (boardId: string, boardItemId: string) => `/data-board/boards/${boardId}/items/${boardItemId}/_is_conflicted`,
    method: fetchMethod.POST,
};
export const linkPreview = {
    api: '/data-board/link_preview/getWebsiteInfo',
    method: fetchMethod.POST,
};

export const getExportCsv = {
    api: (boardId: string) => `/data-board/boards/${boardId}/export_csv`,
    method: fetchMethod.GET,
};

const buildQueryString = (params: Record<string, any>): string => {
    const query = Object.entries(params)
        .map(([key, value]) => {
            if (!value) {
                return '';
            }
            if (value instanceof Date) {
                value = value.toISOString();
            }
            return `${key}=${encodeURIComponent(value)}`;
        })
        .join('&');
    return query ? `?${query}` : '';
};

export const exportCsvViaMail = {
    api: (
        boardId: string,
        queryKey: {
            tz: string;
            quick_range: string;
            start_date?: Date | undefined;
            end_date?: Date | undefined;
            all?: boolean;
            by?: string;
            sort?: string;
        },
    ) => {
        return `/data-board/boards/${boardId}/export_csv${buildQueryString(queryKey)}`;
    },
    method: fetchMethod.POST,
};

export const postBoardFieldsOrder = {
    api: (boardId: string) => `/data-board/boards/${boardId}/fields/reorder`,
    method: fetchMethod.POST,
};

export const getRelatedRecords = {
    api: (boardId: string, boardItemId: string, relatedBoardId: string) =>
        `/data-board/boards/${boardId}/items/${boardItemId}/related/${relatedBoardId}`,
    method: fetchMethod.GET,
};

export const putLinkRecords = {
    api: (boardId: string, boardItemId: string, _relatedBoardId?: string) =>
        `/data-board/boards/${boardId}/items/${boardItemId}/related`,
    method: fetchMethod.POST,
};
export const putUnLinkRecords = {
    api: (boardId: string, boardItemId: string, _relatedBoardId?: string) =>
        `/data-board/boards/${boardId}/items/${boardItemId}/related`,
    method: fetchMethod.DELETE,
};

export const importCsv = {
    api: (boardId: string) => `/data-board/boards/${boardId}/import_csv`,
    method: fetchMethod.POST,
};

export const importExcel = {
    api: (boardId: string) => `/data-board/boards/${boardId}/import_excel`,
    method: fetchMethod.POST,
};

export const getBoardImportProgress = {
    api: (boardId: string) => `/data-board/boards/${boardId}/import_progress`,
    method: fetchMethod.GET,
};

export const putBoardFields = {
    api: (boardId: string) => `/data-board/boards/${boardId}/fields/bulk`,
    method: fetchMethod.PUT,
};
