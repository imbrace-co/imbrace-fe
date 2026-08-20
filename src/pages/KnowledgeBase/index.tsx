import { Button, Dropdown, EllipsisText, Icon, IconButton, Space, Typography, useDialog, useModal } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { ColumnFiltersState, Header, Table } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Fragment, useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import FlexibleTable from '@/components/FlexibleTable';
import type { FilterValue } from '@/components/FlexibleTable/filterPopover';
import type { Columns, ColumnValue, FlexibleTableRef, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import PageLayout from '@/components/PageLayout';
import FilterFields from '@/pages/KnowledgeBase/components/FilterFields';
import type { RenameFileFormType } from '@/pages/KnowledgeBase/components/RenameFileForm';
import RenameFileForm from '@/pages/KnowledgeBase/components/RenameFileForm';
import SpreadSheetViewer from '@/pages/KnowledgeBase/components/SpreadSheetViewer';
import { getKnowledgeBase } from '@/services/api/knowledgeBase';
import { getMembers } from '@/services/api/user';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import CsvViewer from './components/CsvViewer';
import RightSideComponent from './components/RightSideComponent';
import styles from './index.module.scss';

const KnowledgeBase = () => {
    const { t } = useTranslation();
    const [{ modal }, modalHolder] = useModal();

    const tableRef = useRef<FlexibleTableRef<API.KnowledgeBaseItem>>(null);

    const [globalSearch, setGlobalSearch] = useState<string>();
    // const [enableCustomFilter, setEnableCustomFilter] = useState(true);
    const [filterCount, setFilterCount] = useState(0);
    const [filterProps, setFilterProps] = useState<{
        visible: boolean;
        mode: 'filter';
    }>({
        visible: false,
        mode: 'filter',
    });
    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();
    // const filterButtonRef = useRef<HTMLButtonElement>(null);

    const fileIconMap = (type: string) => {
        switch (type) {
            case 'pdf':
                return <Icon namespace="file" name="pdfFat" fontSize={24} />;
            case 'doc':
            case 'docx':
                return <Icon namespace="file" name="docFat" fontSize={24} />;
            case 'csv':
                return <Icon namespace="file" name="csvFat" fontSize={24} />;
            case 'jpeg':
            case 'jpg':
                return <Icon namespace="file" name="jpgFat" fontSize={24} />;
            case 'png':
                return <Icon namespace="file" name="pngFat" fontSize={24} />;
            case 'pptx':
            case 'ppt':
                return <Icon namespace="file" name="pptxFat" fontSize={24} />;
            case 'xlsx':
            case 'xls':
                return <Icon namespace="file" name="xlsxFat" fontSize={24} />;
            default:
                return <Icon namespace="file" name="generalFat" fontSize={24} />;
        }
    };

    const fetchKnowledge = useCallback(async (params: RequestParameters, signal?: AbortSignal) => {
        try {
            const {
                pagination,
                // globalFilter,
                // sorters,
            } = params;
            // const sort = !sorters || sorters?.length === 0 ? '-created_at' : `${sorters[0]?.desc ? '-' : ''}${sorters[0]?.id}`;

            const searchParams = new URLSearchParams();
            if (pagination) {
                searchParams.append('limit', `${pagination.pageSize}`);
                searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
                // searchParams.append('sort', `${sort}`);
            }
            // if (globalFilter) {
            //     searchParams.append('search', `${globalFilter}`);
            // }
            // searchParams.append('q', businessUnit[0].id);
            const { data } = await apiFetch<API.PaginatedResponse<API.KnowledgeBaseItem[]>>(
                getKnowledgeBase.api(),
                getKnowledgeBase.method,
                searchParams,
                ImbraceClient,
                {
                    signal,
                },
            );
            return {
                data: data.data,
                meta: {
                    total: data.count,
                    skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                    limit: pagination?.pageSize ?? 20,
                },
            };
        } catch (error) {
            return {
                data: [],
                meta: {
                    total: 0,
                    skip: 0,
                    limit: 20,
                },
            };
        }
    }, []);

    const renderPreviewContent = (type: string, url: string) => {
        const noContent = (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px',
                }}
            >
                <Typography variant="SubHeading2" style={{ color: 'var(--color-light-1)' }}>
                    No preview available. Please try again later.
                </Typography>
            </Box>
        );
        if (!url) return noContent;

        switch (type) {
            case 'csv':
                return <CsvViewer url={url} />;
            // Document file types
            case 'doc':
            case 'docx':
                return <Box>doc</Box>;
            // PDF file types
            case 'pdf':
                return <iframe title="PDF Viewer" src={url} allow="clipboard-read; clipboard-write" style={{ width: '100%', height: '100%', border: 'none' }} />;
            // Excel file types
            case 'xls':
            case 'xlsx':
                return <SpreadSheetViewer url={url} />;
            // PowerPoint file types
            case 'ppt':
            case 'pptx':
                return <Box>ppt</Box>;
            // Image file types
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'png':
                return (
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <img src={url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'scale-down' }} />
                    </Box>
                );

            // General file types:
            case 'txt':
            case 'ai':
            case 'psd':
            case 'tiff':
            case 'tif':
            case 'svg':
            default:
                return (
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '24px',
                        }}
                    >
                        <Typography variant="SubHeading2" style={{ color: 'var(--color-light-1)' }}>
                            No preview available. Try again later or download to view the file.
                        </Typography>
                        <Button type="primary" text={t('download')} onClick={() => { }} />
                    </Box>
                );
        }
    };

    const getMemberOptionRequest = useCallback(async () => {
        const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
            status: 'active',
        });
        return data.map((user) => ({
            value: user.id,
            text: user.display_name,
        }));
    }, []);

    const columns: Columns<API.KnowledgeBaseItem> = [
        {
            header: 'File Type',
            accessorKey: 'fileType',
            id: 'fileType',
            enableEditing: false,
            enableSorting: false,
            enableColumnFilter: true,
            size: 0,
            maxSize: 0,
            cell: ({ row }) => {
                return null;
            },
            enum: {
                pdf: 'PDF',
                doc: 'DOC',
                docx: 'DOCX',
                csv: 'CSV',
                jpeg: 'JPEG',
                jpg: 'JPG',
                png: 'PNG',
                pptx: 'PPTX',
                ppt: 'PPT',
                xlsx: 'XLSX',
                xls: 'XLS',
            },
        },
        {
            header: t('knowledge_column_name'),
            type: 'ShortText',
            accessorKey: 'name',
            id: 'name',
            enableEditing: false,
            enableSorting: true,
            enableColumnFilter: false,
            size: 414,
            minSize: 414,
            cell: ({ row }) => {
                return (
                    <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                        onClick={() => {
                            modal({
                                title: row.original.name,
                                content: () => (
                                    <Space style={{ width: '100%', height: '100%', backgroundColor: 'var(--color-light-7)' }}>
                                        {renderPreviewContent(row.original.fileType, row.original.url)}
                                    </Space>
                                ),
                                extra: (
                                    <Space justify="end">
                                        {row.original.fileType !== 'pdf' && (
                                            <IconButton size="xs" variant="text" type="secondary" onClick={() => { }}>
                                                <Icon name="download" fontSize={24} />
                                            </IconButton>
                                        )}
                                        <IconButton size="xs" variant="text" type="secondary" onClick={() => { }}>
                                            <Icon name="delete" fontSize={24} />
                                        </IconButton>
                                    </Space>
                                ),
                            });
                        }}
                    >
                        {fileIconMap(row.original.fileType)}
                        <EllipsisText element={<Typography />} text={row.original.name} />
                    </Box>
                );
            },
        },
        {
            header: t('knowledge_column_owner'),
            // type: 'ShortText',
            accessorKey: 'owner',
            id: 'owner',
            enableEditing: false,
            enableSorting: true,
            enableColumnFilter: true,
            size: 242,
            minSize: 242,
            cell: ({ row }) => {
                return <EllipsisText element={<Typography />} text={row.original.owner} />;
            },
            // enum: getMemberOptionRequest,
            request: async () => {
                const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
                    status: 'active',
                });
                return data.map((user) => ({
                    value: user.id,
                    text: user.display_name,
                }));
            },
        },
        {
            header: t('knowledge_column_updated_at'),
            // type: 'Date',
            accessorKey: 'updated_at',
            id: 'updated_at',
            enableEditing: false,
            enableSorting: true,
            enableColumnFilter: false,
            size: 150,
            minSize: 150,
            cell: ({ row }) => {
                return (
                    <EllipsisText
                        element={<Typography />}
                        text={format(new Date(row.original.updated_at), 'yyyy-MM-dd hh:mm')}
                        style={{ width: 'min-content' }}
                    />
                );
            },
        },
        {
            header: '',
            accessorKey: 'operation',
            id: 'operation',
            enableEditing: false,
            enableColumnFilter: false,
            type: 'ShortText',
            size: 100,
            maxSize: 100,
            cell: ({ row }) => {
                return (
                    <Space size={0} justify="end">
                        <Dropdown
                            variant="text"
                            hideArrow
                            hideOnSelect
                            options={[
                                {
                                    text: t('download'),
                                    index: 'knowledge_download',
                                    // disabled: !getTeamPermission(orgRole, isJoined, currentTeamRole).teamOperation,
                                },
                                {
                                    text: t('rename'),
                                    index: 'knowledge_rename',
                                    // disabled: !getTeamPermission(orgRole, isJoined, currentTeamRole).viewTeamMembers,
                                },
                                {
                                    type: 'divider',
                                },
                                {
                                    text: t('delete'),
                                    index: 'knowledge_delete',
                                    typographyProps: {
                                        style: {
                                            color: 'var(--color-danger-1)',
                                        },
                                    },
                                    // disabled: row.original.is_default || !getTeamPermission(orgRole, isJoined, currentTeamRole).deleteTeam,
                                    // tooltip: row.original.is_default ? t('teams_default_team_delete_tooltip') : '',
                                },
                            ]}
                            icon={<Icon name="more" />}
                            onSelect={async (event, selectedIndex) => {
                                event.stopPropagation();
                                if (selectedIndex === 'knowledge_download') {
                                    // TODO: download file
                                }
                                if (selectedIndex === 'knowledge_rename') {
                                    dialogForm<RenameFileFormType>({
                                        title: t('rename'),
                                        content: (methods) => <RenameFileForm {...methods} />,
                                        defaultValues: {
                                            name: row.original.name,
                                        },
                                        confirmText: t('update'),
                                        showUnsavedDialog: true,
                                        showCloseButton: true,
                                        hideCancelButton: true,
                                        actionsAlign: 'flex-start',
                                        onClose: () => { },
                                        onConfirm: async (formData) => {
                                            console.log('onConfirm formData:: ', formData);
                                            // TODO: update file name api
                                        },

                                        confirmButtonProps: {
                                            sx: {
                                                minWidth: '160px',
                                                height: '40px',
                                            },
                                        },
                                    });
                                }
                                if (selectedIndex === 'knowledge_delete') {
                                    if (localStorage.getItem('dont_asked_delete_knowledge_file_again') === 'true') {
                                        // TODO: delete file api

                                        // await onDeleteTeam(row.original.id);
                                        tableRef.current?.refresh();
                                        return;
                                    }
                                    dialog({
                                        title: t('knowledge_file_delete_title'),
                                        content: t('knowledge_file_delete_desc'),
                                        showDontAskedAgain: true,
                                        confirmButtonProps: {
                                            type: 'danger',
                                        },
                                        actionsAlign: 'flex-end',
                                        onConfirm: async (dontAskedAgain) => {
                                            if (dontAskedAgain) {
                                                localStorage.setItem('dont_asked_delete_team_again', 'true');
                                            }
                                            // TODO: delete file api
                                            tableRef.current?.refresh();
                                        },
                                        onClose: () => { },
                                    });
                                }
                            }}
                        />
                    </Space>
                );
            },
            meta: {
                cellStyle: {
                    padding: 0,
                },
            },
        },
    ];

    const onFilterChange = useCallback((mode: 'filter') => {
        if (mode === 'filter') {
            setFilterProps((prev) => ({
                visible: prev.mode === 'filter' ? !prev.visible : !prev.visible ? true : prev.visible,
                mode: 'filter',
            }));
        }
    }, []);

    // const applyFilters = (table: Table<API.KnowledgeBaseItem>, additionalFilters: API.Filters[]) => {
    //     const filters =
    //         additionalFilters
    //             ?.filter((filterValue) => {
    //                 if (filterValue.field_id) {
    //                     if (filterValue?.operator !== 'is_empty' && filterValue?.operator !== 'is_not_empty') {
    //                         if (filterValue.value === '') {
    //                             return false;
    //                         }
    //                         if (
    //                             Array.isArray(filterValue.value) &&
    //                             filterValue.value.some((v) => v === '' || v === null || v === undefined)
    //                         ) {
    //                             return false;
    //                         }
    //                     }
    //                     return true;
    //                 }
    //                 return false;
    //             })
    //             .map((filterValue) => ({
    //                 id: filterValue.field_id as string,
    //                 value: {
    //                     value: filterValue.value,
    //                     operator: filterValue.operator,
    //                     condition: filterValue.condition,
    //                 },
    //             })) ?? [];
    //     table.setColumnFilters(() => filters);
    // };

    const applyFilters = (
        table: Table<API.KnowledgeBaseItem>,
        additionalFilters:
            | {
                id?: string;
                value?: FilterValue;
            }[]
            | undefined,
    ) => {
        // const filters =
        //     additionalFilters?.map((filterValue) => ({
        //         // id: filterValue.field_id as string,
        //         id: filterValue.id as string,
        //         value: {
        //             value: filterValue.value,
        //             // operator: filterValue?.operator,
        //             // condition: filterValue?.condition,
        //         },
        //     })) ?? [];

        const prevColumnFilters = table.getState().columnFilters;
        const allFilters = additionalFilters
            ? [...prevColumnFilters, ...(additionalFilters as ColumnFiltersState)]
            : [...prevColumnFilters];
        table.setColumnFilters(() => allFilters);
    };

    const renderCustomFilter = useCallback(
        (table: Table<API.KnowledgeBaseItem>) => {
            if (filterProps.mode === 'filter') {
                return {
                    container: table.getHeaderGroups().map((headerGroup) => {
                        return (
                            <Fragment key={headerGroup.id}>
                                {headerGroup.headers.map((header) => {
                                    if (!header.column.getCanFilter()) {
                                        return null;
                                    }

                                    return (
                                        <FilterFields
                                            key={header.column.id}
                                            column={header.column}
                                            header={header as Header<API.KnowledgeBaseItem, ColumnValue>}
                                            request={header.id === 'owner' ? getMemberOptionRequest : undefined}
                                            onFilter={(filter) => {
                                                applyFilters(table, filter && filter.value ? [filter] : []);
                                            }}
                                        />
                                    );
                                })}
                            </Fragment>
                        );
                    }),
                };
            }

            return undefined;
        },
        [filterProps.mode, getMemberOptionRequest],
    );

    const renderFilterExtra = useCallback(
        (table: Table<API.KnowledgeBaseItem>) => {
            return (
                <Space size={12}>
                    <Button
                        variant="link"
                        size="xs"
                        text={t('clear_all')}
                        sx={{
                            textTransform: 'initial',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                            table.setColumnFilters(() => []);
                            // setEnableCustomFilter(false);
                        }}
                    />
                </Space>
            );
        },
        [t],
    );

    return (
        <>
            {modalHolder}
            {dialogsHolder}
            <PageLayout
                title={t('knowledge_base')}
                rightSideComponent={
                    <RightSideComponent
                        globalSearch={globalSearch}
                        setGlobalSearch={setGlobalSearch}
                        currentFilter={filterProps}
                        onFilterChange={onFilterChange}
                        filterCount={filterCount}
                        tableRef={tableRef}
                    />
                }
                containerClassName={styles.headerContainer}
            >
                <FlexibleTable<API.KnowledgeBaseItem>
                    ref={tableRef}
                    fullWidth
                    disableHoverEffect
                    queryKey={['knowledge-base']}
                    columns={columns}
                    // request={fetchKnowledgeBase}
                    request={fetchKnowledge}
                    globalFilter={globalSearch}
                    // columnFilterable={false}
                    emptyImage={'addFile'}
                    emptyMessage={
                        <Box sx={{ width: '500px', padding: 0 }}>
                            {globalSearch ? (
                                <Typography variant="SubHeading2">
                                    <Trans i18nKey="knowledge_empty_search_result">
                                        <LinkButton onClick={() => { }}>{t('knowledge_upload_a_new_file')}</LinkButton> now.
                                    </Trans>
                                </Typography>
                            ) : (
                                <Typography variant="SubHeading2">
                                    <Trans i18nKey="knowledge_empty_message">
                                        <LinkButton onClick={() => { }}>{t('knowledge_upload')}</LinkButton>
                                    </Trans>
                                </Typography>
                            )}
                        </Box>
                    }
                    onColumnFilterChange={(columnFilters) => {
                        if (filterProps.mode === 'filter') {
                            setFilterCount(columnFilters.length);
                        }
                    }}
                    customFilter={renderCustomFilter}
                    filterExtra={renderFilterExtra}
                    showFilter={filterProps.visible}
                />
            </PageLayout>
        </>
    );
};
export default KnowledgeBase;
