import type { DropdownOption } from '@imbrace/ui';
import { Button, DropdownMenu, DropdownMenuItem, Icon, Select, Space, Tooltip, Typography, useDialog } from '@imbrace/ui';
import type { DividerOptionType } from '@imbrace/ui/dist/components/Dropdown';
import { DividerOption } from '@imbrace/ui/dist/components/Dropdown';
import { Badge, CircularProgress } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MutableRefObject, RefObject } from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type NavigateFunction, useNavigate } from 'react-router';

import TargetPersonIcon from '@/assets/icons/icon_target_person.svg?react';
import ThreeDotsIcon from '@/assets/icons/icon_three_dots.svg?react';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useNotify } from '@/contexts/SnackbarContext';
import useAccess from '@/hooks/useAccess';
import useNotification from '@/hooks/useNotification';
import { deleteBoardAutomationWithBoardId } from '@/services/api/boardAutomation';
import { deleteBoard as deleteBoardApi, exportCsvViaMail, getBoardRecords, getExportCsv, postBoardRecord } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardsQueryFn, boardsQueryKey } from '@/services/queries/board';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import type { ExportCsvFormType } from '../Databoards/components/exportCsvForm';
import ExportCsvForm, { exportCsvFormSchema } from '../Databoards/components/exportCsvForm';
import { BoardSetting } from './components/BoardSetting';
import ImportDataboardFile from './components/ImportDataboardFile';
import MappingData from './components/ImportDataboardFile/Mapping';
import { SelectBoard } from './components/ImportDataboardFile/SelectBoard';
import type { SearchBarRef } from './searchBar';
import SearchBar from './searchBar';
import { showDateText } from '@/utils/DateTimeUtils';

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
    const { showViewOnlyToast } = useNotification();
    const isAllowModifyBoardAuto = getIsAllowModify();

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
                                    className={!isAllowModifyBoardAuto && option.text === 'Automation' ? 'view-only' : ''}
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
                                        if (!isAllowModifyBoardAuto && option.text === 'Automation') {
                                            showViewOnlyToast();
                                            return;
                                        }
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
    const navigate = useNavigate();
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
            const { range, start_date, end_date, by, members } = formData;
            const queryKey = {
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                quick_range: range,
                start_date: start_date,
                end_date: end_date,
                all: range === 'all',
                by: by,
                sort: `-${by === 'creation' ? 'created_at' : 'updated_at'}`,
            };
            const res = await apiFetch<Blob>(getExportCsv.api(currentBoard?._id || ''), getExportCsv.method, queryKey, ImbraceClient, {
                responseType: 'blob',
            });
            await apiFetch<{ sent_emails: string[] }>(
                exportCsvViaMail.api(currentBoard?._id, queryKey),
                exportCsvViaMail.method,
                {
                    sendEmail: true,
                    email: members,
                },
            );

            return { response: res, formData };
        },
        onSuccess: ({ response, formData }) => {
            const notiRangeText = {
                'week': 'in the last week',
                'month': 'in the last month',
                '3months': 'in the last 3 months',
                '6months': 'in the last 6 months',
                '12months': 'in the last 12 months',
                'specific_date_range': `on ${showDateText(formData.start_date) || 'begin'} - ${showDateText(formData.end_date)}`,
                'all': 'all',
            };
            const membersLength = formData.members.length;
            const link = document.createElement('a');
            const href = URL.createObjectURL(new Blob(['\ufeff', '\ufeff', response.data]));
            const header = response.headers['content-disposition'];
            let filename = '';
            if (header.includes("filename*=UTF-8''")) {
                const encodedFilename = header.split("filename*=UTF-8''")[1];
                filename = decodeURIComponent(encodedFilename);
            } else if (header.includes('filename=')) {
                // Standard
                filename = header.split('filename=')[1];
            }
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
                message:
                    formData.range === 'all'
                        ? t('exported_all_records_csv_success')
                        : t('exported_csv_success', {
                              by: formData.by === 'creation' ? 'created' : 'updated',
                              duration: notiRangeText[formData.range],
                          }),
            });
            notify({
                type: 'success',
                message: t('send_exported_csv_to_success', { who: membersLength === 1 ? formData.members[0] : `${formData.members[0]} and ${membersLength - 1 } ${membersLength - 1 > 1 ? 'others' : 'other' }` }),
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
        (file: string | File, selectedBoardId: string, selectedBoardType: string, isCurrentBoardTypeChanged: boolean) => {
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
                        id={selectedBoardId}
                        onBack={() => {
                            onImportCsv();
                            onClose?.();
                        }}
                        onClose={async () => {
                            if (isCurrentBoardTypeChanged) {
                                navigate(`/${selectedBoardType}/${selectedBoardId}`);
                            } else {
                                const url = knowledgeHub ? '/knowledge-hub-all' : crm ? '/crm' : '/databoards';
                                navigateRef.current?.(`${url}/${selectedBoardId}`, { replace: true });
                                await queryClient.refetchQueries({
                                    queryKey: boardsQueryKey({
                                        isDefault: knowledgeHub ? undefined : !!crm,
                                        types: knowledgeHub ? 'KnowledgeHub' : undefined,
                                    }),
                                });
                                setCurrentTab(selectedBoardId);
                            }
                            onClose?.();
                        }}
                        tableRef={tableRef}
                    />
                ),
                confirmText: t('save'),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
            });
        },
        [currentBoard, navigate],
    );

    const onSelectBoardToImport = useCallback(
        (file: string | File) => {
            dialog({
                title: 'Import data into the board',
                content: ({ onClose }) => (
                    <SelectBoard
                        onNext={(selectedBoardId, selectedBoardType, isCurrentBoardTypeChanged) => {
                            onMappingData(file, selectedBoardId, selectedBoardType, isCurrentBoardTypeChanged);
                            onClose?.();
                        }}
                        knowledgeHub={knowledgeHub}
                        crm={crm}
                        currentBoard={currentBoard}
                    />
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
            });
        },
        [currentBoard, knowledgeHub, crm, onMappingData],
    );

    const onImportCsv = useCallback(() => {
        dialog({
            title: t('crm_import_upload_file_title'),
            content: ({ onClose }) => <ImportDataboardFile onClose={onClose} onSuccess={onSelectBoardToImport} />,
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
    }, [onMappingData]);

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

        if (!isAdmin()) {
            return [...defaultOptions, exportOption, importOption]; // Only return manage fields option for non-admins
        }

        if (currentBoard.type === 'System') {
            return [...defaultOptions, { type: 'divider', index: 'divider' }, importOption, exportOption];
        }

        const isDeleteBoardAllowed = currentBoard.type === 'General' || currentBoard.type === 'KnowledgeHub';

        return [
            ...defaultOptions,
            { type: 'divider', index: 'divider' },
            exportOption,
            importOption,
            {
                text: `${t('delete')}`,
                index: 'delete-board',
                ...(isDeleteBoardAllowed && {
                    typographyProps: {
                        style: {
                            color: 'var(--color-danger-1)',
                        },
                    },
                }),
                ...(!isDeleteBoardAllowed && {
                    tooltip: t('board_default_cannot_delete'),
                }),
                disabled: !isDeleteBoardAllowed,
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
                                request={boardsQueryFn({
                                    isDefault: knowledgeHub ? undefined : !!crm,
                                    types: knowledgeHub ? 'KnowledgeHub' : undefined,
                                })}
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
                                        // Migrated boards carry snake_case (is_identifier); fresh PG boards
                                        // emit camelCase (isIdentifier). Fall back to first non-deprecated
                                        // field — legacy Mongo seeded a "Name" identifier on create, PG doesn't.
                                        fieldId:
                                            currentBoard.fields.find((field) => field.is_identifier || (field as any).isIdentifier)?._id ??
                                            currentBoard.fields.find((field) => !field.is_deprecated && !(field as any).isDeprecated)?._id,
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
