import type { DropdownOption } from '@imbrace/ui';
import { Button, DropdownMenu, DropdownMenuItem, Icon, Select, Space, Tooltip, Typography, useDialog } from '@imbrace/ui';
import type { DividerOptionType } from '@imbrace/ui/dist/components/Dropdown';
import { DividerOption } from '@imbrace/ui/dist/components/Dropdown';
import { Badge, CircularProgress } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MutableRefObject, RefObject } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NavigateFunction } from 'react-router';

import TargetPersonIcon from '@/assets/icons/icon_target_person.svg?react';
import ThreeDotsIcon from '@/assets/icons/icon_three_dots.svg?react';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useNotify } from '@/contexts/SnackbarContext';
import useAccess from '@/hooks/useAccess';
import { BoardSetting } from '@/pages/Databoards/components/BoardSetting';
import type { ExportCsvFormType } from '@/pages/Databoards/components/exportCsvForm';
import ExportCsvForm, { exportCsvFormSchema } from '@/pages/Databoards/components/exportCsvForm';
import ImportDataboardFile from '@/pages/Databoards/components/ImportDataboardFile';
import MappingData from '@/pages/Databoards/components/ImportDataboardFile/Mapping';
import type { SearchBarRef } from '@/pages/Databoards/searchBar';
import SearchBar from '@/pages/Databoards/searchBar';
import { deleteBoardAutomationWithBoardId } from '@/services/api/boardAutomation';
import { deleteBoard as deleteBoardApi, getBoardRecords, getExportCsv, postBoardRecord } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardsQueryKey } from '@/services/queries/board';

import { dummyBoards, dummyCRMBoards } from './mock';

interface ExtraProps {
    currentTab: string;
    currentBoard: API.Board;
    selectedSegmentation: API.Segmentation | undefined;
    setSelectedSegmentation: (segmentation: API.Segmentation | undefined) => void;
    tableRef: RefObject<FlexibleTableRef<API.BoardItem>>;
    navigateRef: MutableRefObject<NavigateFunction>;
    searchBarRef: RefObject<SearchBarRef>;
    setGlobalSearch: (search?: string) => void;
    setCurrentTab: (tab: string) => void;
    onFilterChange: () => void;
    filterCount?: number;
    crm?: boolean;
    knowledgeHub?: boolean;
    selectSegmentationDialog: () => void;
    createUpdateSegmentationDialog: (defaultValues: Partial<API.Segmentation>, isEdit?: boolean) => Promise<void>;
    onCreateNewRecord: () => void;
    isFilterVisible: boolean;
}

interface Option extends DropdownOption<string> {
    index: string;
    handler?: () => void;
}

const handleCreateRecord = async (params: { boardId: string; fieldId?: string; boardName?: string }) => {
    try {
        const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
            getBoardRecords.api(params.boardId),
            getBoardRecords.method,
            {
                limit: 1,
                skip: 0,
            },
        );
        const value = `${params.boardName} ${data.count + 1}`;
        const { data: record } = await apiFetch<API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
            fields: [{ board_field_id: params.fieldId, value }],
        });

        return record;
    } catch (error) {
        console.log(error);
    }
};

const BoardMenu = ({ menuOptions }: { menuOptions: (Option | DividerOptionType)[] }) => {
    const iconButtonRef = useRef<HTMLButtonElement>(null);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setMenuOpen(true);
    }, []);

    const handleMenuClose = useCallback(() => {
        setMenuOpen(false);
    }, []);

    return (
        <div style={{ position: 'relative' }}>
            <Button
                size="xxs"
                sx={{ width: '40px', height: '40px', borderRadius: '8px' }}
                ref={iconButtonRef}
                startIcon={<ThreeDotsIcon />}
                onClick={handleMenuOpen}
            />
            <DropdownMenu
                open={menuOpen}
                onClose={handleMenuClose}
                disableAutoFocusItem
                anchorEl={iconButtonRef.current}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                disableEnforceFocus
                sx={{
                    '& .MuiPaper-root': {
                        marginTop: '4px',
                        minWidth: '160px',
                    },
                }}
            >
                {menuOptions?.map((option, index) => {
                    if ('type' in option) {
                        return (
                            <div key={`divider-${index}`} style={{ padding: '8px 12px' }}>
                                <DividerOption fullWidth={option.fullWidth} key={`divider-${index}`} />
                            </div>
                        );
                    }
                    return (
                        <Tooltip
                            key={`menu-${index}`}
                            placement="bottom"
                            disableFocusListener
                            disableTouchListener
                            arrow
                            title={option.tooltip || ''}
                        >
                            <div>
                                <DropdownMenuItem
                                    sx={{
                                        ...option.sx,
                                        padding: '8px 16px',
                                        '&:hover': {
                                            backgroundColor: 'var(--color-grey-3)',
                                        },
                                    }}
                                    color={option.textColor}
                                    disabled={option.disabled || option.loading}
                                    onClick={() => {
                                        option.handler?.();
                                        setMenuOpen(false);
                                    }}
                                >
                                    {option.loading && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <CircularProgress size={16} />
                                        </div>
                                    )}
                                    {option.text && <Typography {...option.typographyProps}>{option.text}</Typography>}
                                </DropdownMenuItem>
                            </div>
                        </Tooltip>
                    );
                })}
            </DropdownMenu>
        </div>
    );
};

const Extra = (props: ExtraProps) => {
    const {
        currentTab,
        setGlobalSearch,
        setCurrentTab,
        selectedSegmentation,
        setSelectedSegmentation,
        navigateRef,
        tableRef,
        searchBarRef,
        onFilterChange,
        filterCount,
        crm,
        knowledgeHub,
        currentBoard,
        selectSegmentationDialog,
        createUpdateSegmentationDialog,
        onCreateNewRecord,
        isFilterVisible,
    } = props;
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { isAdmin } = useAccess();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const { notify } = useNotify();

    const createRecord = useMutation({
        mutationFn: handleCreateRecord,
        onSuccess: (record) => {
            if (record) {
                navigateRef.current?.(`/crm/${currentTab}/${record._id}`);
            }
        },
    });

    const exportCsv = useMutation({
        mutationFn: async (formData: ExportCsvFormType) => {
            const res = await apiFetch<Blob>(
                getExportCsv.api(currentBoard?._id || ''),
                getExportCsv.method,
                {
                    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    time: formData.month,
                    sort: `-${formData.by === 'creation' ? 'created_at' : 'updated_at'}`,
                },
                ImbraceClient,
                {
                    responseType: 'blob',
                },
            );
            return { response: res, by: formData.by };
        },
        onSuccess: ({ response, by }) => {
            const link = document.createElement('a');
            const href = URL.createObjectURL(new Blob(['\ufeff', '\ufeff', response.data]));
            const header = response.headers['content-disposition'];
            const filename = header.split('filename=')[1];
            link.setAttribute('target', '_blank');
            link.setAttribute('href', href);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
            notify({
                type: 'success',
                message: t(by === 'creation' ? 'exported_csv_by_creation_time_success' : 'exported_csv_by_update_time_success'),
            });
        },
    });

    const onExportCsv = useCallback(async () => {
        dialogForm<ExportCsvFormType>({
            title: t('export_data_range'),
            content: (methods) => <ExportCsvForm methods={methods} />,
            confirmText: t('export_csv'),
            hideCancelButton: true,
            showCloseButton: true,
            onClose: () => {},
            onConfirm: async (formData) => {
                try {
                    await exportCsv.mutateAsync(formData);
                    return true;
                } catch (error) {
                    console.log(error);
                    return false;
                }
            },
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            schema: exportCsvFormSchema(t),
        });
    }, [exportCsv, t, dialogForm]);

    const onMappingData = useCallback(
        (file: string | File) => {
            if (!currentBoard?._id) return;
            dialog({
                title: t('crm_import_map_file_into_field_title'),
                paperSx: {
                    width: '80%',
                    maxWidth: '800px',
                },
                content: ({ onClose }) => (
                    <MappingData
                        file={file}
                        id={currentBoard?._id}
                        onBack={() => {
                            onImportCsv();
                            onClose?.();
                        }}
                        onClose={onClose}
                        tableRef={tableRef}
                    />
                ),
                confirmText: t('save'),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
            });
        },
        [currentBoard],
    );

    const onImportCsv = useCallback(() => {
        dialog({
            title: t('crm_import_upload_file_title'),
            content: ({ onClose }) => <ImportDataboardFile onClose={onClose} onSuccess={onMappingData} />,
            confirmText: t('upload'),
            hideConfirmButton: true,
            hideCancelButton: true,
            showCloseButton: true,
            onClose: () => {},
            onConfirm: () => {},
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
        });
    }, [dialogForm, notify, t, currentBoard]);

    const deleteBoard = useMutation({
        mutationFn: async ({ boardId }: { boardId: string }) => {
            const deleteRes = await apiFetch(deleteBoardApi.api(boardId), deleteBoardApi.method);
            if (deleteRes.status === 200) {
                try {
                    await apiFetch(deleteBoardAutomationWithBoardId.api(boardId), deleteBoardAutomationWithBoardId.method, {}, ImbraceClient);
                } catch (error) {
                    console.log('Error on removing board associated automations: ', error);
                }
            }
        },
        onSuccess: async (data, { boardId }) => {
            await queryClient.refetchQueries({ queryKey: boardsQueryKey({ isDefault: !!crm }) });
            if (currentTab === boardId) {
                navigateRef.current?.(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}`, { replace: true });
            }
        },
    });

    const onDeleteBoard = useCallback(() => {
        dialog({
            title: t('board_delete_header'),
            content: t('board_delete_header_desc'),
            confirmText: t('delete'),
            confirmButtonProps: {
                type: 'danger',
            },
            cancelText: t('cancel'),
            onClose: () => {},
            onConfirm: async () => {
                try {
                    await deleteBoard.mutateAsync({ boardId: currentBoard._id });
                    return true;
                } catch (error) {
                    console.error(error);
                    return false;
                }
            },
        });
    }, [deleteBoard, currentBoard]);

    const boardMenu = useMemo(() => {
        if (!currentBoard) return [];

        const defaultOptions = [
            {
                text: t('crm_edit_board'),
                index: 'edit-board',
                handler: () => {
                    dialog({
                        title: '',
                        paperSx: {
                            width: '80%',
                            maxWidth: '800px',
                        },
                        content: ({ onClose }) => {
                            return (
                                <BoardSetting
                                    crm={crm}
                                    knowledgeHub={knowledgeHub}
                                    board={currentBoard}
                                    onDeleteBoard={onDeleteBoard}
                                    onClose={onClose}
                                    navigateRef={navigateRef}
                                    setCurrentTab={setCurrentTab}
                                    tableRef={tableRef}
                                />
                            );
                        },
                        confirmText: t('save'),
                        hideCancelButton: true,
                        hideConfirmButton: true,
                        showCloseButton: true,
                        actionsAlign: 'flex-start',
                    });
                },
            },
            { type: 'divider', index: 'divider' },
            {
                text: `${t('board_automation')}`,
                index: 'board-automation',
                handler: () => {
                    navigateRef.current(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}/${currentBoard._id}/automations`, {
                        state: { board: currentBoard },
                    });
                },
            },
        ];

        if (!isAdmin()) {
            return [defaultOptions[1]]; // Only return manage fields option for non-admins
        }

        const exportOption = {
            text: `${t('export')}`,
            index: 'export_as_csv',
            handler: () => {
                onExportCsv();
            },
        };

        const importOption = {
            text: `${t('import')}`,
            index: 'import_as_csv',
            handler: () => {
                onImportCsv();
            },
        };

        if (currentBoard.type === 'System') {
            return [...defaultOptions, { type: 'divider', index: 'divider' }, importOption, exportOption];
        }

        return [
            ...defaultOptions,
            { type: 'divider', index: 'divider' },
            exportOption,
            importOption,
            {
                text: `${t('delete')}`,
                index: 'delete-board',
                ...(currentBoard.type === 'General' && {
                    typographyProps: {
                        style: {
                            color: 'var(--color-danger-1)',
                        },
                    },
                }),
                ...(currentBoard.type !== 'General' && {
                    tooltip: t('board_default_cannot_delete'),
                }),
                disabled: currentBoard.type !== 'General',
                handler: () => {
                    onDeleteBoard();
                },
            },
        ];
    }, [dialog, t, navigateRef, crm, isAdmin, onExportCsv, setCurrentTab]);

    const ButtonNewBoard = () => {
        if (isAdmin() && !crm) {
            return (
                <Button
                    onClick={() => {
                        dialog({
                            title: '',
                            paperSx: {
                                width: '80%',
                                maxWidth: '800px',
                            },
                            content: ({ onClose }) => {
                                return (
                                    <BoardSetting
                                        board={undefined}
                                        onClose={onClose}
                                        navigateRef={navigateRef}
                                        knowledgeHub={knowledgeHub}
                                        setCurrentTab={setCurrentTab}
                                        tableRef={tableRef}
                                    />
                                );
                            },
                            confirmText: t('save'),
                            hideCancelButton: true,
                            hideConfirmButton: true,
                            showCloseButton: true,
                            actionsAlign: 'flex-start',
                        });
                    }}
                    size="default"
                    variant="outlined"
                    text={t('crm_add_new_board')}
                />
            );
        }
        return null;
    };

    const SegmentationButton = () => {
        return (
            <Space>
                <Button
                    onClick={() => {
                        selectSegmentationDialog();
                    }}
                    sx={{
                        width: '100%',
                        textDecoration: 'underline',
                    }}
                    size="l"
                    startIcon={<TargetPersonIcon />}
                    variant="link"
                    text={t('crm_segmentation_title')}
                />
                {selectedSegmentation && (
                    <Space style={{ padding: '4px 8px', backgroundColor: '#85EFAE', cursor: 'pointer', display: 'inline-flex' }}>
                        <Typography
                            style={{
                                whiteSpace: 'nowrap',
                                flex: '0 0 auto',
                            }}
                            onClick={() => {
                                const defaultFilters = selectedSegmentation.filters.map((filter) => {
                                    const currentField = currentBoard?.fields.find((field) => field._id === filter.field_id);
                                    const { field_id, operator, condition, value } = filter;
                                    if (currentField?.type === 'Date' && typeof filter.value === 'string') {
                                        return {
                                            field_id,
                                            operator,
                                            condition,
                                            value: ['exactly', filter.value],
                                        };
                                    }
                                    return {
                                        field_id,
                                        operator,
                                        condition,
                                        value,
                                    };
                                });

                                createUpdateSegmentationDialog(
                                    {
                                        _id: selectedSegmentation._id,
                                        name: selectedSegmentation.name,
                                        description: selectedSegmentation.description,
                                        filters: defaultFilters,
                                    },
                                    true,
                                );
                            }}
                        >
                            {selectedSegmentation.name}
                        </Typography>
                        <Icon
                            onClick={() => {
                                setSelectedSegmentation(undefined);
                                tableRef.current?.setColumnFilters([]);
                            }}
                            name="close"
                        />
                    </Space>
                )}
            </Space>
        );
    };

    return (
        <Space size={0} style={{ width: '100%' }}>
            {dialogHolder}
            <Space direction="vertical" align="start" style={{ width: '100%' }}>
                <Space direction="horizontal" align="start" justify="between" style={{ width: '100%' }}>
                    <Space>
                        {/* Select board */}
                        <Space size={0} style={{ width: '100%' }}>
                            <Select
                                searchable
                                fullWidth
                                value={currentTab}
                                onChange={(value) => {
                                    setGlobalSearch('');
                                    searchBarRef.current?.reset();
                                    tableRef.current?.reset();
                                    navigateRef.current?.(`/${knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards'}/${value}`, {
                                        replace: true,
                                    });
                                    if (value) {
                                        setCurrentTab(value);
                                    }
                                }}
                                queryKey={boardsQueryKey({
                                    isDefault: knowledgeHub ? undefined : !!crm,
                                    types: knowledgeHub ? 'KnowledgeHub' : undefined,
                                })}
                                request={() => (crm ? dummyCRMBoards : dummyBoards)}
                                querySelect={(boards: API.Board[]) => {
                                    return boards.map((option) => ({
                                        value: option._id,
                                        text: option.name,
                                    }));
                                }}
                                containerStyle={{
                                    width: '492px',
                                }}
                            />
                        </Space>
                        <BoardMenu menuOptions={boardMenu} />
                    </Space>
                    <Space align="end" justify="end" style={{ flex: 1 }}>
                        <ButtonNewBoard />
                    </Space>
                </Space>
                <Space direction="horizontal" align="center" justify="between" style={{ width: '100%', marginTop: '20px' }}>
                    {/* Segmentation */}
                    <SegmentationButton />
                    {/* New Record */}
                    <Button
                        onClick={() => {
                            if (currentBoard) {
                                if (crm) {
                                    createRecord.mutate({
                                        boardId: currentTab,
                                        fieldId: currentBoard.fields.find((field) => field.is_identifier)?._id,
                                        boardName: currentBoard.name,
                                    });
                                } else {
                                    onCreateNewRecord();
                                }
                            }
                        }}
                        size="xxs"
                        startIcon={<Icon name="add" />}
                        variant="contained"
                        sx={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                        }}
                    />
                </Space>
                {!isFilterVisible && (
                    <Space style={{ width: '100%', border: '1px solid #135DD5', borderBottom: 'none' }} size={0}>
                        {/* Filter */}
                        <Space
                            direction="horizontal"
                            align="center"
                            justify="between"
                            style={{ width: '128px', height: '40px', padding: '0 8px', borderRight: '1px solid #135DD5' }}
                        >
                            <Badge
                                badgeContent={filterCount}
                                sx={{
                                    '& .MuiBadge-badge': {
                                        background: '#FFE8D3',
                                        color: 'var(--color-primary-1)',
                                        width: '16px',
                                        height: '16px',
                                        minWidth: '16px',
                                        fontSize: '12px',
                                        borderRadius: '8px',
                                        padding: 0,
                                        top: '12px',
                                        right: '-14px',
                                    },
                                }}
                            >
                                <Button
                                    onClick={(e) => {
                                        onFilterChange();
                                        e.currentTarget.blur();
                                    }}
                                    variant="link"
                                    text={t('filter')}
                                    sx={{
                                        fontWeight: 400,
                                        textDecoration: 'underline',
                                    }}
                                />
                            </Badge>
                            <Icon style={{ color: '#135DD5' }} width={32} height={32} type="secondary" name="filter" />
                        </Space>
                        {/* Search */}
                        <div style={{ width: '100%' }}>
                            <SearchBar
                                ref={searchBarRef}
                                onSearch={(searchText) => {
                                    setGlobalSearch(searchText);
                                }}
                            />
                        </div>
                    </Space>
                )}
            </Space>
        </Space>
    );
};

export default memo(Extra);
