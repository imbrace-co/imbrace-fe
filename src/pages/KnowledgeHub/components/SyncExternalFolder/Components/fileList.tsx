import React, { useRef, useState, useMemo, useEffect, useCallback } from "react";
import FlexibleTable from "@/components/FlexibleTable";
import { Columns, FlexibleTableRef, RequestParameters } from "@/components/FlexibleTable/types";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Space, Typography } from "@imbrace/ui";
import { FileItem } from "..";
import { getFilesFromDrive } from "@/services/api/knowledgeHub";
import apiFetch from "@/services/axios/handler";

interface ExternalFileListProps {
    files: FileItem[];
    openSystemFolderForImport: (selectedIds: Array<FileItem>) => void;
    folderName: string;
    onClose: () => void;
    backToFolderList: () => void;
    driveSessionId: string;
    currentDrive: string;
    folderId: string;
    fileCache: React.MutableRefObject<{ data: FileItem[], total: number, params: string } | null>;
    onSessionExpired: (authUrl: string) => void;
}

const ExternalFileList: React.FC<ExternalFileListProps> = ({
    files,
    openSystemFolderForImport,
    folderName,
    onClose,
    backToFolderList,
    driveSessionId,
    currentDrive,
    folderId,
    fileCache,
    onSessionExpired,
}) => {

    const fileTableRef = useRef<FlexibleTableRef<any>>(null);
    const [globalSearch, setGlobalSearch] = useState("");
    const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

    const debouncedSearch = useMemo(() => globalSearch.toLowerCase(), [globalSearch]);
    const { t } = useTranslation();



    const filesColumns = useMemo(() => {
        const columnDefinitions: Columns<FileItem> = [
            {
                accessorKey: 'rowIndex',
                id: 'rowIndex',
                header: ({ table }) => (
                    <div>
                        <Checkbox
                            checked={table.getIsAllPageRowsSelected()}
                            indeterminate={table.getIsSomeRowsSelected()}
                            onChange={(checked) => {
                                table.toggleAllRowsSelected(checked);
                                // handleToggleRowCheckbox();
                            }}
                        />
                    </div>
                ),
                maxSize: 42,
                enableColumnFilter: false,
                enablePinning: true,
                enableEditing: false,
                enableResizing: false,
                enableSorting: false,
                cell: ({ row }) => {
                    return (
                        <Checkbox
                            onChange={(e) => {
                                row.getToggleSelectedHandler()(e);
                                // handleToggleRowCheckbox();
                            }}
                            {...(!row.getCanSelect() && {
                                tooltip: t('databoard_disabled_checkbox_tooltip'),
                                tooltipProps: { placement: 'top', arrow: true },
                            })}
                            disabled={!row.getCanSelect()}
                            checked={row.getIsSelected()}
                        />
                    );
                },
                meta: {
                    cellStyle: {
                        padding: 0,
                        textAlign: 'center',
                    },
                    headerStyle: {
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                    },
                },
            },
            {
                type: 'ShortText',
                accessorKey: 'no',
                id: 'no',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                meta: { disableOrdering: true },
                enablePinning: true,
                header: () => t('No.'),
                maxSize: 90,
                cell: ({ row, table, isHover }) => {
                    return (
                        <Typography>
                            {row.index + 1 + table.getState().pagination.pageSize * table.getState().pagination.pageIndex}
                        </Typography>
                    );
                },
            },
            {
                type: 'ShortText',
                accessorKey: 'name',
                id: 'name',
                enableColumnFilter: false,
                enableEditing: false,
                enableSorting: true,
                enablePinning: false,
                meta: {
                    cellStyle: {
                        padding: '4px 5px',
                    },
                    disableOrdering: true,
                    width: '60%',
                },
                header: () => 'File',
                cell: ({ row }) => {
                    return (
                        <Typography>
                            {/* <a href="#" onClick={() => openFolderExternalOption()}> */}
                            {row.original.name}
                            {/* </a>{' '} */}
                        </Typography>
                    );
                },
            },

        ];
        return columnDefinitions;
    }, []);

    const fetchFiles = useCallback(async (params: RequestParameters) => {
        const { pagination, globalFilter, sorters } = params;
        const limit = pagination?.pageSize || 20;
        const skip = (pagination?.pageIndex || 0) * limit;
        const sortBy = sorters && sorters.length > 0 ? `${sorters[0].id}` : undefined;
        const sortOrder = sorters && sorters.length > 0 ? `${sorters[0].desc ? 'desc' : 'asc'}` : undefined;

        const paramsString = JSON.stringify({ limit, skip, globalFilter, sortBy, sortOrder, driveSessionId, folderId, currentDrive });
        let data = fileCache.current?.params === paramsString ? fileCache.current : null;

        if (!data) {
            try {
                let url = getFilesFromDrive.api(driveSessionId, folderId, currentDrive);
                url += `&limit=${limit}&skip=${skip}`;
                url += '&recursive=true';

                if (globalFilter) url += `&q=${globalFilter}`;
                if (sortBy) url += `&sortBy=${sortBy}`;
                if (sortOrder) url += `&sortOrder=${sortOrder}`;

                const response = await apiFetch<{ data: FileItem[], pagination: { file_count: number } }>(
                    url,
                    getFilesFromDrive.method,
                );
                data = { data: response?.data?.data, total: response?.data?.pagination?.file_count, params: paramsString };
                fileCache.current = data;
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

        // Apply client-side pagination to the fetched data
        // const paginatedData = data?.data.slice(skip, skip + limit) || [];

        return {
            data: data?.data,
            meta: {
                total: data?.total || 0,
                skip,
                limit,
            },
        };
    }, [driveSessionId, folderId, currentDrive, fileCache]);

    return (
        <Space direction="vertical" align="start" justify="start" >
            <span style={{ fontSize: 16, marginBottom: '10px', fontWeight: 600 }}>Folder - {folderName}</span>
            <Space size={12} style={{ width: '100%' }}>
                <FlexibleTable<FileItem>
                    containerStyle={{ height: '460px' }}
                    showFilter={false}
                    // pagination={true}
                    ref={fileTableRef}
                    columns={filesColumns}
                    request={fetchFiles}

                    globalFilter={debouncedSearch}
                    columnResizable
                    columnOrderChangeable
                    headerPaddingModify={true}
                    dataRowNoPadding={true}
                />
            </Space>

            <Space size={12} style={{ marginTop: '32px', width: '100%' }} align="end" justify="end">
                <Button
                    sx={{
                        borderRadius: '4px',
                        width: '140px',
                    }}
                    type="primary"
                    variant="outlined"
                    text={t('back')}
                    onClick={() => {
                        backToFolderList();
                        onClose?.();
                    }}
                />
                <Button
                    sx={{
                        borderRadius: '4px',
                        width: '140px',
                        padding: '0px',
                    }}
                    onClick={() => {
                        const selectedRows = fileTableRef.current?.getSelectedRows;
                        if (selectedRows && selectedRows.length > 0) {
                            const selectedFiles = selectedRows.map((row: any) => row.original);
                            // setSelectedFileIds(selectedFiles);
                            console.log('Selected file IDs:', selectedFiles);
                            openSystemFolderForImport(selectedFiles);
                        } else {
                            console.log('No files selected');
                        }
                    }}
                    type="primary"
                    variant="contained"
                    text={t('next')}
                />
            </Space>
        </Space>
    );
};

export default ExternalFileList;
