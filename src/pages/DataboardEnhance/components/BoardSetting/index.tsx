import { FieldText, Icon, Space, Tabs, Tooltip, Button, IconButton } from '@imbrace/ui';
import { Box } from '@mui/material';
import { MutableRefObject, RefObject, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import apiFetch from '@/services/axios/handler';
import ManageFields from './ManageFields';
import { postBoard, putBoardFields, updateBoardById } from '@/services/api/crm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardsQueryKey } from '@/services/queries/board';
import { AxiosError } from 'axios';
import { NavigateFunction } from 'react-router-dom';
import { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useNotify } from '@/contexts/SnackbarContext';
import useAccess from '@/hooks/useAccess';
import styles from './index.module.scss';

enum BoardSettingTab {
    General = 'general',
    ManageFields = 'manageFields',
}

export interface BoardSettingFormValue {
    name: string;
    description: string;
    fields: API.BoardField[];
    type?: API.BoardType;
}

export interface BoardSettingProps {
    board?: API.Board;
    crm?: boolean;
    knowledgeHub?: boolean;
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
    navigateRef,
    tableRef,
    onClose,
    onDeleteBoard,
    setCurrentTab,
}: BoardSettingProps) => {
    const { isAdmin } = useAccess();
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const { notify } = useNotify();
    const [currentBoard, setCurrentBoard] = useState<API.Board | undefined>(board ?? undefined);
    const isEditMode = !!currentBoard;
    const [tab, setTab] = useState<BoardSettingTab>(isAdmin() ? BoardSettingTab.General : BoardSettingTab.ManageFields);
    const [boardDescLength, setBoardDescLength] = useState(currentBoard?.description?.length || 0);
    const boardDescLimit = 1000;
    const [loading, setLoading] = useState(false);

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
                },
            ],
            type: knowledgeHub ? 'KnowledgeHub' : undefined,
        },
    });

    const createBoard = useMutation({
        mutationFn: async (params: { name: string; description?: string; team_ids: string[]; type?: API.BoardType; fields?: API.BoardField[] }) => {
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
        mutationFn: async (params: { boardId: string; data: { name: string; description?: string; team_ids: string[] } }) => {
            const { data } = await apiFetch<API.Board>(updateBoardById.api(params.boardId), updateBoardById.method, params.data);
            return data;
        },
    });

    const updateBoardFields = useMutation({
        mutationFn: async ({ fields, boardId }: { fields: API.BoardField[]; boardId: string }) => {
            if (!boardId) return null;
            const payload = fields
                .map(({ _id, ...field }) => ({
                    ...field,
                    field_id: _id,
                }));
            const { data } = await apiFetch(putBoardFields.api(boardId), putBoardFields.method, { fields: payload });
            return data;
        },
        onSuccess: async (data) => {
            // tableRef.current?.refresh();
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
                                    label={`${t('board_setting_form_name')}*`}
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
                                    label={t('board_setting_form_description')}
                                    fullWidth
                                    multiline
                                    error={!!error}
                                    helperText={error?.message}
                                    {...field}
                                    minRows={4}
                                    maxRows={7}
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
                </Box>
            </>
        );
    };

    const renderBoardFields = () => {
        return (
            <ManageFields
                crm={board?.type === 'Contacts'}
                knowledgeHub={knowledgeHub}
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
            const { name, description, fields, type } = getValues();
            let boardData: API.Board;
            if (isEditMode) {
                boardData = await updateBoard.mutateAsync({
                    boardId: currentBoard?._id,
                    data: { name, description, team_ids: [] },
                });
            } else {
                boardData = await createBoard.mutateAsync({
                    name,
                    description,
                    team_ids: [],
                    type,
                    fields,
                });
            }
            if (isEditMode) {
                await updateBoardFields.mutateAsync({ fields, boardId: boardData._id });
            }
            setTimeout(async () => {
                const url = knowledgeHub ? '/knowledge-hub-all' : crm ? '/crm' : '/databoards';
                navigateRef.current?.(`${url}/${boardData._id}`, { replace: true });
                await queryClient.refetchQueries({
                    queryKey: boardsQueryKey({
                        isDefault: knowledgeHub ? undefined : !!crm,
                        types: knowledgeHub ? 'KnowledgeHub' : undefined,
                    }),
                });
                setCurrentTab(boardData._id);
            }, 500);
            onClose?.();
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            if (error.response?.data.validate === 'name' && error.response?.data.message === 'Duplicate key') {
                setError('name', { type: 'custom', message: t('crm_board_name_duplicated') });
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
                    text={t('next')}
                    onClick={async () => {
                        handleSubmit(() => {
                            setTab(BoardSettingTab.ManageFields);
                        })();
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {isEditMode && (
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
                    {isAdmin() && (
                        <Tooltip
                            key={`menu`}
                            placement="bottom"
                            arrow
                            title={board?.type !== 'General' && board?.type !== 'KnowledgeHub' ? t('board_default_cannot_delete') : ''}
                        >
                            <div>
                                <IconButton
                                    disabled={board?.type !== 'General' && board?.type !== 'KnowledgeHub'}
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
                    )}
                </Space>
            )}
            <Tabs
                tabs={[
                    {
                        label: 'General Information',
                        value: BoardSettingTab.General,
                        disabled: !isAdmin(),
                    },
                    {
                        label: 'Manage Fields',
                        value: BoardSettingTab.ManageFields,
                    },
                ]}
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
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                    borderBottom: '1px solid #E0E0E0',
                }}
            />
            {tab === BoardSettingTab.General && renderGeneralInfo()}
            {tab === BoardSettingTab.ManageFields && renderBoardFields()}
            <Space style={{ marginTop: '32px' }} direction="horizontal" justify="end">
                <ActionButtons />
            </Space>
        </Box>
    );
};
