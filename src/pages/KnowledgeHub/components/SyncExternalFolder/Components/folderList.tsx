import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import FlexibleTable from "@/components/FlexibleTable";
import { Columns, FlexibleTableRef, RequestParameters } from "@/components/FlexibleTable/types";
import { Button, EllipsisText, Search, Space, Typography } from "@imbrace/ui";
import { FolderItem } from "..";
import { useTranslation } from "react-i18next";
import useDebounce from "@/hooks/useDebounce";
import { SOURCE_TYPE } from "@/pages/KnowledgeHub";
import { getFoldersFromDrive } from "@/services/api/knowledgeHub";
import apiFetch from "@/services/axios/handler";

interface ExternalFolderListProps {
    folders: FolderItem[];
    foldersSystem: FolderItem[];
    openFolderExternalOption: (folderId: string, folderName: string, isSynced: boolean) => void;
    currentDrive: string;
    onClose: () => void;
    syncFolderInprogress: boolean;
    driveSessionId: string;
    currentDriveFolderSelected: string;
    syncFolderProcessDone: boolean;
    folderCache: React.MutableRefObject<{ data: FolderItem[], total: number, params: string } | null>;
    onSessionExpired: (authUrl: string) => void;
}

const ExternalFolderList: React.FC<ExternalFolderListProps> = ({ folders, foldersSystem, openFolderExternalOption, onClose, currentDrive, syncFolderInprogress, currentDriveFolderSelected, syncFolderProcessDone, driveSessionId, folderCache, onSessionExpired }) => {
    const tableRef = useRef<FlexibleTableRef<FolderItem>>(null);
    const foldersSystemRef = useRef(foldersSystem);
    const [globalSearch, setGlobalSearch] = useState("");
    const { t } = useTranslation();

    useEffect(() => {
        foldersSystemRef.current = foldersSystem;
    }, [foldersSystem]);

    // const [folderData, setFolderData] = useState(folders);
    const debouncedSearch = useDebounce(globalSearch, 300);

    // useEffect(() => {
    //     tableRef.current?.refresh();
    // }, [foldersSystem, syncFolderProcessDone, syncFolderInprogress, currentDriveFolderSelected]);

    const columns = useMemo(() => {
        const columnDefinitions: Columns<FolderItem> = [
            {
                type: 'ShortText',
                accessorKey: 'name',
                id: 'name',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: false,
                enablePinning: false,
                meta: {
                    cellStyle: {
                        padding: '0!important',
                    },
                    disableOrdering: true,
                    width: '60%',
                },
                header: () => t('knowledge_folder_name'),
                cell: ({ row }) => {
                    return (
                        <Typography>
                            <a href="#" onClick={() => openFolderExternalOption(row.original.id, row.original.name, row.original.synced)}>
                                {row.original.name}
                            </a>{' '}
                        </Typography>
                    );
                },
            },
            ...((syncFolderInprogress || syncFolderProcessDone) ? [{
                type: 'ShortText',
                accessorKey: 'status',
                id: 'status',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: false,
                enablePinning: false,
                meta: {
                    cellStyle: {
                        padding: '0!important',
                    },
                    disableOrdering: true,
                    width: '40%',
                },
                header: () => t('status'),
                cell: ({ row }) => {
                    console.log("currentDriveFolderSelected ", currentDriveFolderSelected)
                    let syncStatus = '';
                    if (row.original.synced) {
                        syncStatus = t('knowledge_external_synced');
                    };
                    if (row.original.id === currentDriveFolderSelected) {
                        syncStatus = syncFolderProcessDone ? t('knowledge_external_synced') : 'Connecting...';
                    };
                    return (
                        <EllipsisText
                            text={syncStatus}
                            element={
                                <Typography
                                    style={{
                                        color: (row.original.synced || (row.original.id === currentDriveFolderSelected && syncFolderProcessDone)) ? 'var(--color-secondary-3)' : 'var(--color-accent-yellow-2)',
                                    }}
                                />
                            }
                        />
                    );
                },
            }] : [{
                type: 'ShortText',
                accessorKey: 'childCount',
                id: 'childCount',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: false,
                enablePinning: false,
                meta: {
                    cellStyle: {
                        padding: '0!important',
                    },
                    disableOrdering: true,
                    width: '40%',
                },
                header: () => t('knowledge_external_number_of_files'),
                cell: ({ row }) => {
                    return (
                        <EllipsisText
                            text={row.original.childCount}
                            element={
                                <Typography
                                    style={{
                                        color: 'var(--color-secondary-3)',
                                    }}
                                />
                            }
                        />
                    );
                },
            }]),
        ];
        return columnDefinitions;
    }, [syncFolderInprogress, t, openFolderExternalOption]);



    const fetchFolders = useCallback(async (params: RequestParameters) => {
        const { pagination, globalFilter, sorters } = params;
        const limit = pagination?.pageSize || 20;
        const skip = (pagination?.pageIndex || 0) * limit;
        // const sortBy =  sorters && sorters.length > 0 ? `${sorters[0].id}` : undefined;
        // const sortOrder =  sorters && sorters.length > 0 ? `${sorters[0].desc ? 'desc' : 'asc'}` : undefined;

        const paramsString = JSON.stringify({ limit, skip, globalFilter, driveSessionId, currentDrive });
        let data = folderCache.current?.params === paramsString ? folderCache.current : null;

        if (!data) {
            try {
                let url = getFoldersFromDrive.api(driveSessionId, currentDrive);
                url += `&limit=${limit}&skip=${skip}`;
                if (globalFilter) url += `&q=${globalFilter}`;
                // if (sortBy) url += `&sortBy=${sortBy}`;
                // if (sortOrder) url += `&sortOrder=${sortOrder}`;

                const response = await apiFetch<{ data: FolderItem[], pagination: { folder_count: number } }>(
                    url,
                    getFoldersFromDrive.method,
                );
                data = { data: response?.data?.data, total: response?.data?.pagination?.folder_count, params: paramsString };
                folderCache.current = data;
            } catch (error: any) {
                console.error(error);
                if (error?.response?.data?.auth_url) {
                    onSessionExpired(error.response.data.auth_url);
                }
                return {
                    data: [],
                    meta: {
                        total: 0,
                        skip: 0,
                        limit: 0,
                    },
                };
            }
        }

        const folderSyncedIds = foldersSystemRef.current
            .filter(item => item.source_type === SOURCE_TYPE.EXTERNAL && item.is_sync_enabled)
            .map(item => item.external_id);

        const mappedData = data?.data?.map(item => {
            return folderSyncedIds.includes(item.id)
                ? { ...item, synced: true }
                : item;
        }) || [];

        return {
            data: mappedData,
            meta: {
                total: data?.total || 0,
                skip,
                limit,
            },
        };
    }, [driveSessionId, currentDrive, folderCache, debouncedSearch]);

    return (
        <Space direction="vertical" align="start" justify="start" style={{ gap: 0 }}>
            <span style={{ fontSize: 16, textTransform: 'uppercase', marginBottom: '18px', fontWeight: 800 }}>{t('knowledge_external_folder_from', {
                cloud: currentDrive,
            })}</span>
            <Space justify="between" size={8} style={{ width: '100%' }}>
                <Search
                    value={globalSearch}
                    placeholder={t('search')}
                    onSearch={(val) => setGlobalSearch(val.toLowerCase())}
                    onReset={() => setGlobalSearch('')}
                    sx={{ flex: 1 }}
                />
            </Space>
            <Space size={12} style={{ width: '100%' }}>
                <FlexibleTable<FolderItem>
                    containerStyle={{ height: '460px' }}
                    showFilter={false}
                    // pagination={true}
                    ref={tableRef}
                    columns={columns}
                    request={fetchFolders}

                    globalFilter={debouncedSearch}
                    columnResizable
                    columnOrderChangeable
                    tableRowNoPadding={true}
                />
            </Space>
            {syncFolderInprogress && <span style={{ marginTop: '20px', fontSize: '14px', color: 'var(--color-secondary-3)' }}>Sync a folder may take time depending on its size.</span>}
            <Space size={12} style={{ marginTop: '32px', width: '100%' }} align="end" justify="end">
                <Button
                    sx={{
                        borderRadius: '4px',
                        width: '150px',
                    }}
                    type="primary"
                    variant="outlined"
                    text={t('done')}
                    onClick={() => onClose?.()}
                />
            </Space>
        </Space>
    );
};

export default ExternalFolderList;
