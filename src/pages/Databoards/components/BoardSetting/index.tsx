import { Button, FieldText, Icon, IconButton, Space, Tooltip, Typography } from '@imbrace/ui';
import { Box, FormControl, MenuItem, Select, Tab as MuiTab, Tabs as MuiTabs } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { MutableRefObject, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import type { NavigateFunction } from 'react-router-dom';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useNotify } from '@/contexts/SnackbarContext';
import useAccess from '@/hooks/useAccess';
import { deleteBoardField, getBoardById, postBoard, putBoardFields, updateBoardById } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { useDataboardCategories } from '@/services/queries/databoardCategory';

import styles from './index.module.scss';
import ManageFields from './ManageFields';

enum BoardSettingTab {
    General = 'general',
    ManageFields = 'manageFields',
}

export interface BoardSettingFormValue {
    name: string;
    description: string;
    category?: string;
    fields: API.BoardField[];
    type?: API.BoardType;
    show_id: boolean;
    board_child_mapped?: string;
}

export interface BoardSettingProps {
    board?: API.Board;
    crm?: boolean;
    knowledgeHub?: boolean;
    commsiq?: boolean;
    documentAi?: boolean;
    simpleMode?: boolean;
    fillLayout?: boolean;
    navigateRef: MutableRefObject<NavigateFunction>;
    tableRef: RefObject<FlexibleTableRef<API.BoardItem>>;
    onClose?: () => void;
    setCurrentTab: (tab: string) => void;
    onDeleteBoard?: () => void;
}

export const BoardSetting = ({
    board,
    crm = false,
    knowledgeHub = false,
    commsiq = false,
    documentAi = false,
    simpleMode = false,
    fillLayout = false,
    navigateRef,
    tableRef,
    onClose,
    onDeleteBoard,
    setCurrentTab,
}: BoardSettingProps) => {
    const { isAdmin } = useAccess();
    const { t } = useTranslation();
    const isDocumentAiRoute = !!documentAi;
    const isDataboardsRoute = !crm && !knowledgeHub && !commsiq && !documentAi;
    const isDocumentAIRoute = isDocumentAiRoute;
    const queryClient = useQueryClient();
    const { notify } = useNotify();

    // Data Board categories — same `/data-board/categories` store /schemas uses (type='databoard'),
    // with nested `subCategories`. The board carries `category_id`; the category never lists boards.
    const { data: topCategories = [] } = useDataboardCategories();

    // Two-level category picker (mirrors the /schemas Model Profile): a Category select +
    // a Sub Category select.
    // Resolve a stored leaf category id into its { parentId, subId } pair for the two selects.
    const resolveCategory = (leafId: string): { parentId: string; subId: string } => {
        if (!leafId) return { parentId: '', subId: '' };
        if (topCategories.some((c) => c.id === leafId)) return { parentId: leafId, subId: '' };
        const parent = topCategories.find((c) => (c.subCategories ?? []).some((s) => s.id === leafId));
        return parent ? { parentId: parent.id, subId: leafId } : { parentId: '', subId: '' };
    };

    const [currentBoard, setCurrentBoard] = useState<API.Board | undefined>(board ?? undefined);
    // Track which board id has had its form seeded. Re-seeding `fields` on every
    // board-detail refetch would clobber the reorder/edits that ManageFields owns
    // locally (it persists changes itself), causing the list to "jump back".
    const seededBoardIdRef = useRef<string | undefined>(undefined);
    const isEditMode = !!currentBoard;
    // Databoard boards linked to a schema (from_schema_id) hide the Fields tab — fields are owned by the schema.
    const hasLinkedSchema = isDataboardsRoute && !!currentBoard?.from_schema_id;
    const [tab, setTab] = useState<BoardSettingTab>(
        isAdmin() || hasLinkedSchema ? BoardSettingTab.General : BoardSettingTab.ManageFields,
    );
    const [boardDescLength, setBoardDescLength] = useState(currentBoard?.description?.length || 0);
    const boardDescLimit = 1000;
    const [loading, setLoading] = useState(false);

    // The raw board endpoint returns field flags in camelCase (isIdentifier/isDefault/…),
    // but the FE reads snake_case (is_identifier/…). Normalize the same way
    // `boardByIdQueryKey` does — otherwise the identifier flag is lost and the
    // "Record ID (System Default)" row stops rendering when editing the board.
    const normalizeBoardFields = (b: any) => {
        if (b?.fields) {
            b.fields = (b.fields as any[]).map((field) => {
                const f = field as any;
                return {
                    ...field,
                    _id: field._id || f.id,
                    is_identifier: field.is_identifier ?? f.isIdentifier ?? false,
                    is_default: field.is_default ?? f.isDefault ?? false,
                    hidden_on_record: field.hidden_on_record ?? f.hiddenOnRecord ?? false,
                    is_unique_identifier: field.is_unique_identifier ?? f.isUniqueIdentifier ?? false,
                };
            });
        }
        return b;
    };

    const { data: fetchedBoard } = useQuery({
        queryKey: ['board-detail', board?.id || board?._id],
        queryFn: async () => {
            const id = board?.id || board?._id;
            if (!id) return undefined;
            const res = await apiFetch<API.Board>(getBoardById.api(id), getBoardById.method);
            return normalizeBoardFields((res.data as any)?.data || res.data);
        },
        enabled: !!(board?.id || board?._id),
    });

    const {
        control,
        setValue,
        getValues,
        handleSubmit,
        formState: { isDirty, isValid },
        setError,
        reset,
    } = useForm<BoardSettingFormValue>({
        defaultValues: {
            name: currentBoard?.name || '',
            description: currentBoard?.description || '',
            category: '',
            fields: currentBoard?.fields || [
                {
                    name: 'Name',
                    type: 'ShortText',
                    is_unique_identifier: false,
                    is_default: false,
                    hidden: false,
                    hidden_on_record: false,
                    is_identifier: true,
                    data: [],
                    _id: '',
                    board_child_mapped: '',
                },
            ],
            show_id: currentBoard?.show_id || false,
            type: knowledgeHub ? 'KnowledgeHub' : documentAi ? 'DocumentAI' : undefined,
        },
    });

    useEffect(() => {
        if (fetchedBoard) {
            const fetchedId = fetchedBoard.id || fetchedBoard._id;
            setCurrentBoard(fetchedBoard);
            // Only seed the form when opening/switching to a different board. A refetch
            // of the same board must not reset `fields`, otherwise a stale (pre-reorder)
            // response overwrites ManageFields' local order and the UI reverts.
            if (seededBoardIdRef.current === fetchedId) return;
            seededBoardIdRef.current = fetchedId;
            reset({
                name: fetchedBoard.name || currentBoard?.name || '',
                description: fetchedBoard.description || currentBoard?.description || '',
                // Board carries its category directly (mirrors /schemas `category_id`).
                category: fetchedBoard.category_id ?? '',
                fields: fetchedBoard.fields || currentBoard?.fields || [],
                show_id: fetchedBoard.show_id || false,
                type: fetchedBoard.type,
            });
        }
    }, [fetchedBoard, reset]);

    const createBoard = useMutation({
        mutationFn: async (params: { name: string; description?: string; team_ids: string[]; type?: API.BoardType; show_id: boolean; fields?: API.BoardField[]; category?: string | null }) => {
            const { data } = await apiFetch<API.Board>(postBoard.api(), postBoard.method, params);
            setValue('fields', data.fields);
            return data;
        },
        onSuccess: async (data) => {
            notify({
                type: 'success',
                message: t('Create board successfully'),
            });
        },
    });

    const updateBoard = useMutation({
        mutationFn: async (params: {
            boardId: string;
            data: { name: string; description?: string; team_ids: string[]; show_id: boolean; category?: string | null };
        }) => {
            const { data } = await apiFetch<API.Board>(updateBoardById.api(params.boardId), updateBoardById.method, params.data);
            return data;
        },
    });

    const updateBoardFields = useMutation({
        mutationFn: async ({ fields, boardId }: { fields: API.BoardField[]; boardId: string }) => {
            if (!boardId) return null;

            const payload = fields.map(({ _id, ...field }) => ({
                ...field,
                field_id: _id,
                ...(field.type === 'TableInTable' &&
                    (field as any).fields && {
                        fields: (field as any).fields.map(({ _id: subId, ...subField }: any) => ({
                            ...subField,
                            field_id: subId,
                        })),
                    }),
            }));

            const { data: bulkResp } = await apiFetch(putBoardFields.api(boardId), putBoardFields.method, { fields: payload });
            let saved = (bulkResp as any)?.data ?? bulkResp;

            // A TableInTable (Nested Model) field's columns ARE its child board's fields. For
            // EXISTING TIT fields the parent bulk update doesn't touch the child board, so persist
            // the columns by calling the same field-update API on the child board directly
            // (settings.childBoardId). New TIT fields are handled by the parent addField above.
            const titChildUpdates = fields.filter(
                (f: any) => f.type === 'TableInTable' && f.settings?.childBoardId && Array.isArray(f.fields),
            );
            if (titChildUpdates.length > 0) {
                await Promise.all(
                    titChildUpdates.map(async (f: any) => {
                        const currentSubIds = new Set(
                            (f.fields ?? []).map((sf: any) => sf._id).filter(Boolean),
                        );
                        const removedSubIds: string[] = ((f.child_board_fields ?? []) as any[])
                            .map((sf) => sf._id)
                            .filter((sid: string) => sid && !currentSubIds.has(sid));
                        await Promise.all(
                            removedSubIds.map((sid) =>
                                apiFetch(deleteBoardField.api(f.settings.childBoardId, sid), deleteBoardField.method),
                            ),
                        );

                        await apiFetch(putBoardFields.api(f.settings.childBoardId), putBoardFields.method, {
                            fields: (f.fields ?? []).map(({ _id: subId, ...subField }: any) => ({
                                ...subField,
                                field_id: subId ?? '',
                            })),
                        });
                    }),
                );
                // Re-fetch the parent so each TIT field's `child_board_fields` re-hydrate with the
                // just-saved columns (the bulk response above predates the child-board updates).
                const res = await apiFetch<API.Board>(getBoardById.api(boardId), getBoardById.method);
                saved = (res.data as any)?.data || res.data;
            }

            return normalizeBoardFields(saved) as API.Board;
        },
        onSuccess: async (board) => {
            if (!board?.fields) return;
            // The saved board is the source of truth: push it into the form (new fields pick up
            // their server-assigned ids — saving twice no longer duplicates them) and into the
            // board-detail cache, so reopening the dialog shows the saved values instead of the
            // stale pre-save board (the seeding effect ignores refetches of the same board).
            // The synthetic Record ID row is injected at render time, not stored in `fields`,
            // so replacing the array is safe.
            setValue('fields', board.fields, { shouldDirty: false });
            setCurrentBoard(board);
            const bid = (board as any)._id || (board as any).id;
            if (bid) queryClient.setQueryData(['board-detail', bid], board);
        },
        onError: (err: any) => {
            console.log(err);
            notify({
                message: err.response?.data.error as string,
                type: 'error',
            });
        },
    });

    const renderGeneralInfo = () => {
        return (
            <>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '18px' }}>
                    <Controller
                        name="name"
                        control={control}
                        rules={{
                            required: t('validation_board_setting_name_required'),
                            validate: {
                                checkSpace: (val: string) => val.trim().length > 0 || t('validation_board_setting_name_required'),
                            },
                            maxLength: {
                                value: 150,
                                message: t('validation_board_setting_name_maxlength'),
                            },
                            minLength: {
                                value: 4,
                                message: t('validation_board_setting_name_minlength'),
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <Tooltip
                                title={t('board_system_disabled_edit_name')}
                                disableHoverListener={!board || board?.type !== 'System'}
                                disableFocusListener={!board || board?.type !== 'System'}
                                placement="top"
                                arrow
                            >
                                <FieldText
                                    label={t(
                                        isDocumentAiRoute
                                            ? 'databoard_model_title_with_asterisk'
                                            : isDataboardsRoute
                                              ? 'databoards_board_name_with_asterisk'
                                              : 'board_name_with_asterisk',
                                    )}
                                    fullWidth
                                    multiline
                                    error={!!error}
                                    helperText={error?.message}
                                    {...field}
                                    disabled={board?.type === 'System'}
                                />
                            </Tooltip>
                        )}
                    />
                    <Controller
                        name="description"
                        control={control}
                        rules={{
                            maxLength: {
                                value: boardDescLimit,
                                message: t('validation_input_description_maxlength', {
                                    max: boardDescLimit,
                                }),
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <div className={styles.boardDesc}>
                                <FieldText
                                    label={t(
                                        isDocumentAiRoute
                                            ? 'databoard_model_objective'
                                            : isDataboardsRoute
                                              ? 'databoards_board_objective'
                                              : 'board_setting_form_description',
                                    )}
                                    fullWidth
                                    multiline
                                    error={!!error}
                                    helperText={error?.message}
                                    {...field}
                                    minRows={(simpleMode || fillLayout) ? 7 : 4}
                                    maxRows={(simpleMode || fillLayout) ? 12 : 7}
                                    onChange={(e) => {
                                        const boardContent = e.target.value;
                                        field.onChange(
                                            boardContent.length > boardDescLimit ? boardContent.slice(0, boardDescLimit) : boardContent,
                                        );
                                        setBoardDescLength(boardContent.length > boardDescLimit ? boardDescLimit : boardContent?.length);
                                    }}
                                />
                                <label
                                    className={`${styles.boardLimit} ${
                                        boardDescLength <= boardDescLimit ? styles.boardDescIsLimit : styles.boardDescOverLimit
                                    }`}
                                >
                                    {boardDescLength} / {boardDescLimit}
                                </label>
                            </div>
                        )}
                    />
                    {isDataboardsRoute && (simpleMode || fillLayout) && (
                        <Controller
                            control={control}
                            name="category"
                            render={({ field: { value, onChange } }) => {
                                const { parentId, subId } = resolveCategory((value as string) ?? '');
                                const subFolders = topCategories.find((c) => c.id === parentId)?.subCategories ?? [];
                                const catLabelSx = {
                                    fontSize: 14,
                                    fontWeight: 800,
                                    mb: 1,
                                    color: 'var(--color-light-7)',
                                    display: 'block',
                                };
                                // Match the @imbrace field inputs (16px) for the selected value.
                                const selectSx = (empty: boolean) => ({
                                    '& .MuiSelect-select': {
                                        fontSize: 14,
                                        ...(empty ? { color: 'var(--color-secondary-1)' } : {}),
                                    },
                                });
                                return (
                                    <Box display="flex" flexDirection="column" gap={2}>
                                        <FormControl fullWidth>
                                            <Box component="label" sx={catLabelSx}>
                                                {t('databoard_category', 'Category')}
                                            </Box>
                                            <Select
                                                size="small"
                                                displayEmpty
                                                value={parentId}
                                                onChange={(e) => onChange(e.target.value)}
                                                sx={selectSx(!parentId)}
                                                MenuProps={{ disableScrollLock: true, sx: { '& .MuiMenuItem-root': { fontSize: 16 } } }}
                                            >
                                                <MenuItem value="">{t('click_to_select')}</MenuItem>
                                                {topCategories.map((c) => (
                                                    <MenuItem key={c.id} value={c.id}>
                                                        {c.name}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        {subFolders.length > 0 && (
                                            <FormControl fullWidth>
                                                <Box component="label" sx={catLabelSx}>
                                                    {t('databoard_sub_category', 'Sub Category')}
                                                </Box>
                                                <Select
                                                    size="small"
                                                    displayEmpty
                                                    value={subId}
                                                    onChange={(e) => onChange((e.target.value as string) || parentId)}
                                                    sx={selectSx(!subId)}
                                                    MenuProps={{ disableScrollLock: true, sx: { '& .MuiMenuItem-root': { fontSize: 16 } } }}
                                                >
                                                    <MenuItem value="">
                                                        <em>
                                                            {t('databoard_sub_category_direct_parent', 'Directly under {{name}}', {
                                                                name: topCategories.find((c) => c.id === parentId)?.name ?? '',
                                                            })}
                                                        </em>
                                                    </MenuItem>
                                                    {subFolders.map((s) => (
                                                        <MenuItem key={s.id} value={s.id}>
                                                            {s.name}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        )}
                                    </Box>
                                );
                            }}
                        />
                    )}
                    {!crm && !knowledgeHub && !isDataboardsRoute && (
                        <Space direction="vertical" style={{ width: '100%', marginTop: '2.5vh' }} align="start">
                            <Typography>
                                <Trans
                                    i18nKey={isDocumentAiRoute ? 'databoard_show_record_id' : 'board_show_record_id'}
                                    components={[
                                        <strong />,
                                        <span
                                            onClick={async () => {
                                                handleSubmit(() => {
                                                    setTab(BoardSettingTab.ManageFields);
                                                })();
                                            }}
                                            style={{
                                                color: 'var(--color-primary-1)',
                                                textDecoration: 'underline',
                                                cursor: 'pointer',
                                            }}
                                            role="button"
                                            tabIndex={0}
                                        />,
                                    ]}
                                />
                            </Typography>
                        </Space>
                    )}
                </Box>
            </>
        );
    };

    const renderBoardFields = () => {
        return (
            <ManageFields
                crm={board?.type === 'Contacts'}
                knowledgeHub={knowledgeHub}
                isDocumentAIRoute={isDocumentAIRoute}
                id={currentBoard?._id}
                tableRef={tableRef}
                formControl={control}
                boardData={currentBoard}
                reset={() =>
                    reset(getValues(), {
                        keepDirty: false,
                    })
                }
            />
        );
    };

    const onSubmit = () => async () => {
        setLoading(true);
        try {
            const { name, description, fields, type, show_id, category } = getValues();
            // Category lives on the board itself (mirrors /schemas). Only the databoard route
            // exposes the picker — other routes leave it untouched.
            const categoryField = isDataboardsRoute ? { category: category || null } : {};
            let boardData: API.Board;
            if (isEditMode) {
                const res = await updateBoard.mutateAsync({
                    boardId: currentBoard?.id || currentBoard?._id,
                    data: { name, description, team_ids: [], show_id, ...categoryField },
                });
                boardData = (res as any).data || res;
            } else {
                const res = await createBoard.mutateAsync({
                    name,
                    description,
                    team_ids: [],
                    type,
                    show_id,
                    fields,
                    ...categoryField,
                });
                boardData = (res as any).data || res;
            }
            if (isEditMode) {
                await updateBoardFields.mutateAsync({ fields, boardId: boardData._id });
            }

            if (isDataboardsRoute) {
                // Refresh the index tabs/counts now that the board's category may have changed.
                await queryClient.invalidateQueries({ queryKey: ['databoardCategory'] });
            }
            notify({ type: 'success', message: t('board_saved_successfully', 'Board saved successfully') });
            // Refresh every board list/detail so the new name/category shows up wherever the
            // board appears (index grid card, board-detail header, tabs).
            await queryClient.invalidateQueries({ queryKey: ['boards'] });
            // Only jump to the board when creating a new one. Editing an existing board keeps
            // the user where they are — the index grid or the board detail they came from.
            if (!isEditMode) {
                setTimeout(() => {
                    const url = knowledgeHub
                        ? '/knowledge-hub-all'
                        : commsiq
                          ? '/commsiq'
                          : crm
                            ? '/crm'
                            : documentAi
                              ? '/document-ai'
                              : '/databoards';
                    navigateRef.current?.(`${url}/${boardData._id}`, { replace: true });
                    setCurrentTab(boardData._id);
                }, 500);
            }
            onClose?.();
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            if (error.response?.data.validate === 'name' && error.response?.data.message === 'Duplicate key') {
                setError('name', {
                    type: 'custom',
                    message: t('crm_board_name_duplicated'),
                });
            }
            return false;
        } finally {
            setLoading(false);
        }
    };

    const ActionButtons = () => {
        if (tab === BoardSettingTab.General) {
            return (
                <Button
                    sx={{
                        width: '160px',
                    }}
                    disabled={loading || !isDirty}
                    loading={loading}
                    variant="contained"
                    text={(simpleMode || fillLayout) ? (isEditMode ? t('save') : t('create')) : t('next')}
                    onClick={async () => {
                        if (simpleMode || fillLayout) {
                            handleSubmit(onSubmit())();
                        } else {
                            handleSubmit(() => {
                                setTab(BoardSettingTab.ManageFields);
                            })();
                        }
                    }}
                />
            );
        } else {
            return (
                <Button
                    sx={{
                        width: '160px',
                    }}
                    disabled={loading || !isDirty || !isValid}
                    loading={loading}
                    variant="contained"
                    text={isEditMode ? t('save') : t('create')}
                    onClick={handleSubmit(onSubmit())}
                />
            );
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0px', ...((simpleMode || fillLayout) && { height: '100%', overflow: 'hidden' }) }}>
            {(simpleMode || fillLayout) && (
                <IconButton
                    size="s"
                    variant="text"
                    type="secondary"
                    onClick={onClose}
                    sx={{ position: 'absolute', top: '16px', right: '16px' }}
                >
                    <Icon name="close" />
                </IconButton>
            )}
            {isEditMode && !simpleMode && !fillLayout && (
                <Space
                    direction="horizontal"
                    justify="end"
                    style={{ position: 'absolute', top: '28px', right: '70px', paddingRight: '8px', borderRight: '1px solid #E0E0E0' }}
                >
                    <IconButton
                        size="s"
                        type="primary"
                        variant="text"
                        sx={{ fontSize: '24px' }}
                        disabled={loading || !isDirty}
                        onClick={handleSubmit(onSubmit())}
                    >
                        <Box
                            sx={{
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Icon name="save" />
                        </Box>
                    </IconButton>
                    {isAdmin() && (() => {
                        const isDeleteAllowed =
                            board?.type === 'General' ||
                            board?.type === 'KnowledgeHub' ||
                            board?.type === 'DocumentAI';
                        return (
                            <Tooltip
                                key={'menu'}
                                placement="bottom"
                                arrow
                                title={!isDeleteAllowed ? t('board_default_cannot_delete') : ''}
                            >
                                <div>
                                    <IconButton
                                        disabled={!isDeleteAllowed}
                                        size="s"
                                        type="danger"
                                        variant="text"
                                        sx={{ fontSize: '24px', color: '#EE7D7D', '&:hover': { color: '#EE7D7D' } }}
                                        onClick={onDeleteBoard}
                                    >
                                        <Icon name="delete" />
                                    </IconButton>
                                </div>
                            </Tooltip>
                        );
                    })()}
                </Space>
            )}
            {/* MUI Tabs (variant=standard) instead of @imbrace Tabs: the latter is always
                scrollable + ResizeObserver, so it mis-measures and hides the strip when the
                modal reflows (e.g. the Sub Category select appears and a scrollbar shows). */}
            <MuiTabs
                value={tab}
                onChange={(_event, value) => {
                    if (value === BoardSettingTab.ManageFields) {
                        handleSubmit(() => {
                            setTab(BoardSettingTab.ManageFields);
                        })();
                    } else {
                        if (isAdmin()) {
                            setTab(value as BoardSettingTab);
                        }
                    }
                }}
                variant="standard"
                sx={{
                    flexShrink: 0,
                    borderBottom: '1px solid #E0E0E0',
                    '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: 16 },
                }}
            >
                <MuiTab
                    label={t(
                        isDocumentAiRoute
                            ? 'databoard_model_profile'
                            : isDataboardsRoute
                              ? 'databoards_board_profile'
                              : 'general_information',
                    )}
                    value={BoardSettingTab.General}
                    disabled={!isAdmin()}
                />
                {/* Fields tab is hidden when the board is driven by a linked schema (from_schema_id). */}
                {!simpleMode && !hasLinkedSchema && (
                    <MuiTab
                        label={
                            isDataboardsRoute
                                ? t('databoards_board_fields', 'Fields')
                                : t(isDocumentAiRoute ? 'databoard_model_schema' : 'manage_fields')
                        }
                        value={BoardSettingTab.ManageFields}
                    />
                )}
            </MuiTabs>
            {/* Content scrolls independently so the Tabs (above) and action bar (below)
                stay pinned in the fixed-height (fillLayout/simpleMode) modal. */}
            <Box sx={(simpleMode || fillLayout) ? { flex: 1, minHeight: 0, overflowY: 'auto' } : undefined}>
                {(simpleMode || tab === BoardSettingTab.General) && renderGeneralInfo()}
                {!simpleMode && !hasLinkedSchema && tab === BoardSettingTab.ManageFields && renderBoardFields()}
            </Box>
            <Space style={{ marginTop: (simpleMode || fillLayout) ? '0' : '32px', paddingTop: (simpleMode || fillLayout) ? '16px' : undefined, flexShrink: 0 }} direction="horizontal" justify="end">
                <ActionButtons />
            </Space>
        </Box>
    );
};
