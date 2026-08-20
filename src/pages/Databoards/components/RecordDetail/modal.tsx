import { Button, EllipsisText, Icon, IconButton, Illustration, Modal, Space, Spin, Typography, useDialog } from '@imbrace/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { uniqueId } from 'lodash';
import type { ReactElement, RefObject } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { UseFormReturn } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { deleteBoardRecord, postBoardField } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { boardsQueryKey, useRecordById } from '@/services/queries/board';

import { FieldTypeIcon } from '../../utils';
import RecordId from '../BoardDetailedModal/RecordID';
import type { FieldType } from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldSchema } from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { FieldColumn, IdentifierField } from './editableColumn';
import IconArrowBackIOS from '@/assets/icons/icon_arrow_back_ios.svg?react';
import useRecordDetailHelper from './hooks';
import styles from './index.module.scss';

export interface ParentRecordContext {
    parentBoardId: string;
    parentItemId: string;
    parentFieldId: string;
}

interface RecordDetailModalProps {
    recordId: string;
    board: API.Board;
    onClose?: () => void;
    tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
    initialValue?: Record<string, API.RecordValue>;
    isEdit?: boolean;
    boardData?: API.BoardItem[];
    isDocumentAIRoute?: boolean;
    parentContext?: ParentRecordContext;
    closeAfterCreate?: boolean;
}

export const DetailFields = ({
    board,
    record,
    isEditMode,
    methods,
    crm,
    updateBoard,
    tableRef,
    onRefetch,
}: {
    board: API.Board;
    record: API.BoardItem;
    isEditMode: boolean;
    methods: UseFormReturn<Record<string, API.RecordValue>>;
    crm?: boolean;
    updateBoard: (board: API.Board) => void;
    tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
    onRefetch?: () => Promise<void>;
}) => {
    const { t } = useTranslation();
    const [{ dialogForm }, dialogsHolder] = useDialog();
    const { control } = methods;
    const queryClient = useQueryClient();
    const dispatch = useAppDispatch();

    const createField = useMutation({
        mutationFn: async (params: {
            id: string;
            data: FieldType & {
                hidden: boolean;
            };
        }) => {
            const { data } = await apiFetch<API.Board>(postBoardField.api(params.id), postBoardField.method, params.data);
            return data;
        },
        onSuccess: (updatedBoard) => {
            updateBoard(updatedBoard);
            queryClient.refetchQueries({ queryKey: boardsQueryKey({ isDefault: !!crm }) });
        },
    });

    const fields = useMemo(() => {
        return board.fields.filter((field) => {
            return !field.is_identifier && !field.hidden_on_record;
        });
    }, [board]);

    const onNewField = useCallback(() => {
        dialogForm<FieldType, ReturnType<typeof FieldSchema>>({
            title: t('fields_management_form_header_new'),
            content: (newFieldsMethod) => <OperationFieldForm methods={newFieldsMethod} boardType={board.type} boardName={board.name} />,
            defaultValues: {
                name: '',
            },
            confirmText: t('create'),
            showUnsavedDialog: true,
            showCloseButton: true,
            hideCancelButton: true,
            actionsAlign: 'flex-start',
            onClose: () => { },
            onConfirm: async (formData, newFieldsMethod) => {
                try {
                    const { name, type, description, settings, data, fields: childFields, child_board_name } = formData as FieldType & {
                        fields?: unknown;
                        child_board_name?: string;
                    };
                    await createField.mutateAsync({
                        id: board.id,
                        data: {
                            name,
                            description,
                            type,
                            hidden: false,
                            data,
                            settings,
                            ...(type === 'TableInTable'
                                ? {
                                      fields: childFields,
                                      ...(child_board_name && child_board_name.trim().length > 0
                                          ? { child_board_name: child_board_name.trim() }
                                          : {}),
                                  }
                                : {}),
                        } as FieldType & { hidden: boolean },
                    });

                    return true;
                } catch (error) {
                    console.log(error);
                    const err = error as AxiosError<{ code?: number; message?: string }>;
                    if (err.response?.status === 400 && err.response?.data?.code === 40000) {
                        newFieldsMethod?.setError('child_board_name' as any, {
                            type: 'value',
                            message: t('databoard_child_board_name_duplicate'),
                        });
                        return false;
                    }
                    if (err.response?.status === 409 && err.response?.data?.message === 'Field name already exists') {
                        newFieldsMethod?.setError('name', {
                            type: 'value',
                            message: t('fields_management_form_duplicate_name'),
                        });
                    }
                    if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                        const message = err?.response?.data?.message;

                        const notificationPayload = {
                            message,
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                    }
                    return false;
                }
            },
            confirmButtonProps: {
                sx: {
                    minWidth: '160px',
                    height: '40px',
                },
            },
            schema: FieldSchema({ t, existFields: board?.fields, checkDuplicate: true }),
        });
    }, [t, createField, dispatch, dialogForm, board]);

    return (
        <div style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
            {dialogsHolder}
            {fields.length > 0 && (
                <SimpleBar style={{ width: '100%', height: '100%' }}>
                    <Space size={16} direction="vertical" className={styles.body} style={{ paddingLeft: '32px' }}>
                        {fields.map((field) => {
                            const { type, name, _id } = field;
                            const valueEnum = field.data?.reduce((prev, current) => {
                                return {
                                    ...prev,
                                    [current._id]: current.value,
                                };
                            }, {});
                            const value = record?.fields?.[_id] || null;

                            return (
                                <Space
                                    key={_id}
                                    size={16}
                                    align={type === 'LongText' || type === 'Notes' || type === 'TableInTable' ? 'start' : 'center'}
                                    style={{ width: '100%' }}
                                >
                                    <Space
                                        size={8}
                                        style={{
                                            color: 'var(--color-light-5)',
                                            fontSize: 20,
                                            ...((type === 'LongText' || type === 'Notes' || type === 'TableInTable') && { marginTop: '12px' }),
                                        }}
                                    >
                                        {FieldTypeIcon(type)}
                                        <div style={{ width: '87px' }}>
                                            <EllipsisText
                                                text={name}
                                                element={<Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }} />}
                                            />
                                        </div>
                                    </Space>
                                    <Controller
                                        control={control}
                                        name={_id}
                                        render={({ field: formField, fieldState: { error } }) => {
                                            return (
                                                <FieldColumn
                                                    {...formField}
                                                    fieldType={type}
                                                    currentValue={value}
                                                    meta={{
                                                        defaultFieldName: field.default_field_name,
                                                        defaultCountryCode: field.settings?.default_country_code,
                                                        defaultCurrencyCode: field.settings?.default_currency_code,
                                                    }}
                                                    {...((type === 'SingleSelection' ||
                                                        type === 'MultipleSelection' ||
                                                        type === 'Priority') && {
                                                        dataEnum: valueEnum,
                                                    })}
                                                    record={record}
                                                    fieldId={_id}
                                                    editable={type !== 'RichText'}
                                                    {...(field?.default_field_name === 'stage' && {
                                                        disabled: () => {
                                                            return record?.fields?.[field._id] === 'Unidentified Lead';
                                                        },
                                                        disabledTooltip: t('crm_field_stage_disabled_desc'),
                                                    })}
                                                    {...(field?.default_field_name === 'created_at' && {
                                                        disabled: () => {
                                                            return record?.created_type === 'system';
                                                        },
                                                        disabledTooltip: t('crm_system_data_disabled_edit_desc'),
                                                    })}
                                                    {...(field?.default_field_name === 'birthday' && { minDate: dayjs(new Date(0)) })}
                                                    {...(type === 'ShortText' && {
                                                        validate: (newValue?: unknown) => {
                                                            const target = newValue as string;
                                                            if (target && target.length > 150) {
                                                                return t('crm_field_short_text_length_limit');
                                                            }
                                                            return true;
                                                        },
                                                    })}
                                                    {...(field.is_identifier && {
                                                        validate: (newValue?: unknown) => {
                                                            const target = newValue as string;
                                                            if (!target) {
                                                                return t('crm_identifier_can_not_delete');
                                                            }
                                                            if (target && target.length > 150) {
                                                                return t('crm_field_short_text_length_limit');
                                                            }
                                                            return true;
                                                        },
                                                    })}
                                                    bordered="always"
                                                    readonly={!isEditMode}
                                                    editing={isEditMode}
                                                    notesProps={{
                                                        hideButton: true,
                                                        inModal: false,
                                                    }}
                                                    boardType={board.type}
                                                    field={field}
                                                    onUpdate={onRefetch}
                                                />
                                            );
                                        }}
                                    />
                                </Space>
                            );
                        })}
                    </Space>
                </SimpleBar>
            )}
            {fields.length <= 0 && (
                <div style={{ width: '100%', marginTop: '72px' }}>
                    <Illustration
                        name="filesMissing"
                        description={
                            <Space size={4} direction="vertical" style={{ width: '360px' }}>
                                <Typography variant="SubHeading2">
                                    {t(board.type === 'KnowledgeHub' ? 'folder_empty_fields_header' : 'board_empty_fields_header')}
                                </Typography>
                                <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                                    <Trans i18nKey={'board_empty_fields_desc'}>
                                        Create
                                        <button
                                            style={{ fontWeight: 700 }}
                                            onClick={() => {
                                                onNewField();
                                            }}
                                        >
                                            a new field
                                        </button>
                                        now or manage the fields on the “Field Management” page later.
                                    </Trans>
                                </Typography>
                            </Space>
                        }
                    />
                </div>
            )}
        </div>
    );
};

const RecordNavigator = ({
    boardData,
    currentRecordId,
    onNavigate,
}: {
    boardData: API.BoardItem[];
    currentRecordId: string;
    onNavigate: (newRecordId: string) => void;
}) => {
    const handlePrevRecord = useCallback(() => {
        if (!boardData?.length) return;
        const currentIndex = boardData.findIndex((item) => item.id === currentRecordId);
        if (currentIndex > 0) {
            const prevRecordId = boardData[currentIndex - 1].id;
            onNavigate(prevRecordId);
        }
    }, [boardData, currentRecordId, onNavigate]);

    const handleNextRecord = useCallback(() => {
        if (!boardData?.length) return;

        const currentIndex = boardData.findIndex((item) => item.id === currentRecordId);
        if (currentIndex < boardData.length - 1) {
            const nextRecordId = boardData[currentIndex + 1].id;
            onNavigate(nextRecordId);
        }
    }, [boardData, currentRecordId, onNavigate]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowLeft') {
                handlePrevRecord();
            } else if (event.key === 'ArrowRight') {
                handleNextRecord();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlePrevRecord, handleNextRecord]);

    return createPortal(
        <>
            {boardData?.length > 0 && boardData.findIndex((item) => item.id === currentRecordId) > 0 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: 'calc(50% - 464px)',
                        transform: 'translateY(-50%)',
                        zIndex: 1400,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <IconArrowBackIOS onClick={handlePrevRecord} style={{ color: '#FAFAFA', width: 24, height: 24, cursor: 'pointer' }} />
                </div>
            )}
            {boardData?.length > 0 && boardData.findIndex((item) => item.id === currentRecordId) < boardData.length - 1 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        right: 'calc(50% - 464px)',
                        transform: 'translateY(-50%)',
                        zIndex: 1400,
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <IconArrowBackIOS
                        onClick={handleNextRecord}
                        style={{ color: '#FAFAFA', width: 24, height: 24, cursor: 'pointer', transform: 'rotate(180deg)' }}
                    />
                </div>
            )}
        </>,
        document.body,
    );
};

const RecordDetailModal = (props: RecordDetailModalProps) => {
    const { onClose, recordId, board, tableRef, initialValue, boardData, isEdit = false, isDocumentAIRoute, parentContext, closeAfterCreate } = props;
    const [controlledRecordId, setControlledRecordId] = useState(recordId);
    const [controlledBoard, setControlledBoard] = useState(board);
    const [open, setOpen] = useState(true);
    const [isEditMode, setIsEditMode] = useState(recordId === 'new' || isEdit);
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();
    const [{ dialog }, dialogsHolder] = useDialog();

    const methods = useForm<Record<string, API.RecordValue>>({
        mode: 'all',
    });
    const {
        control,
        reset,
        formState: { isDirty, isValid },
        handleSubmit,
        setValue,
    } = methods;

    const {
        data: record,
        isLoading,
        refetch,
    } = useRecordById({
        boardId: controlledBoard.id,
        recordId: controlledRecordId,
    });

    const { onMultipleFieldsUpdate, onAppendChildRowToParent } = useRecordDetailHelper({
        board: controlledBoard,
        record,
        refresh: async () => {
            tableRef?.current?.refresh();
            if (controlledRecordId === 'new') {
                return;
            }
            await refetch();
        },
        dialog,
    });

    useEffect(() => {
        if (initialValue) {
            Object.keys(initialValue).forEach((key) => {
                if (initialValue[key]) {
                    setValue(key, initialValue[key], { shouldDirty: true });
                }
            });
        }
    }, [initialValue, setValue]);

    const deleteRecord = useMutation({
        mutationFn: async (params: { boardId: string; recordId: string }) => {
            await apiFetch(deleteBoardRecord.api(params.boardId, params.recordId), deleteBoardRecord.method);

            return true;
        },
        onSuccess: (data, variables) => {
            tableRef?.current?.refresh();
            setOpen(false);
        },
        onError: () => {
            return false;
        },
    });

    useEffect(() => {
        if (record) {
            reset(record?.fields);
        }
    }, [record, reset]);

    const identifierField = useMemo(() => {
        return controlledBoard.fields.find((field) => field.is_identifier);
    }, [controlledBoard]);

    const updatedTime = useMemo(() => {
        if (!record) {
            return dayjs().format('MM/DD/YYYY hh:mm A');
        }
        return dayjs(record.updated_at || record.created_at).format('MM/DD/YYYY hh:mm A');
    }, [record]);

    const onRecordDelete: (rowId: string) => Promise<boolean> = useCallback(
        async (rowId: string) => {
            return new Promise(async (resolve) => {
                const deleteRequest = async () => {
                    try {
                        await deleteRecord.mutateAsync({ boardId: board._id, recordId: rowId });

                        return true;
                    } catch (error) {
                        console.log(error);
                        return false;
                    }
                };
                if (localStorage.getItem('dont_asked_delete_record_again') === 'true') {
                    resolve(await deleteRequest());
                } else {
                    dialog({
                        showDontAskedAgain: true,
                        title: t('crm_delete_record'),
                        content: t('crm_delete_record_description'),
                        confirmText: t('delete'),
                        cancelText: t('cancel'),
                        actionsAlign: 'flex-end',
                        confirmButtonProps: {
                            type: 'danger',
                        },
                        onClose: () => {
                            resolve(false);
                        },
                        onBackdropClose: () => {
                            resolve(false);
                        },
                        onConfirm: async (dontAskAgain) => {
                            if (dontAskAgain) {
                                localStorage.setItem('dont_asked_delete_record_again', 'true');
                            }
                            resolve(await deleteRequest());
                        },
                    });
                    return;
                }

                resolve(false);
            });
        },
        [t, dialog, deleteRecord, board],
    );

    const onSubmit = async (data: Record<string, API.RecordValue>) => {
        try {
            setLoading(true);
            if (parentContext && controlledRecordId === 'new') {
                await onAppendChildRowToParent(parentContext, data);
                setLoading(false);
                setOpen(false);
                return;
            }
            const wasNew = controlledRecordId === 'new';
            const updatedRecord = await onMultipleFieldsUpdate(controlledRecordId, data);
            const newRecordId = updatedRecord?._id || updatedRecord?.id;
            if (newRecordId && newRecordId !== controlledRecordId) {
                setControlledRecordId(newRecordId);
            }

            setLoading(false);
            if (wasNew && closeAfterCreate) {
                setOpen(false);
            } else {
                setIsEditMode(false);
            }
        } catch (error) {
            setLoading(false);
        }
    };

    const handleNavigate = useCallback(
        (newRecordId: string) => {
            if (isEditMode) {
                if (isDirty) {
                    promptUnsavedChanges();
                    return;
                }
            }
            setControlledRecordId(newRecordId);
            setIsEditMode(false);
            setLoading(false);
        },
        [isDirty, isEditMode],
    );

    const promptUnsavedChanges = () => {
        dialog({
            title: t('crm_unsaved_changes_prompt'),
            content: ({ onClose }) => (
                <Space size={8} direction="horizontal" align="center" justify="end" style={{ width: '100%', marginTop: '16px' }}>
                    <Button
                        sx={{
                            width: '105px',
                        }}
                        variant="outlined"
                        size="s"
                        text={t('cancel')}
                        onClick={async () => {
                            onClose?.();
                        }}
                    />
                    <Button
                        sx={{
                            width: '105px',
                        }}
                        variant="outlined"
                        type="danger"
                        size="s"
                        text={t('no')}
                        onClick={async () => {
                            reset(record?.fields);
                            setIsEditMode(false);
                            onClose?.();
                        }}
                    />
                    <Button
                        sx={{
                            width: '105px',
                        }}
                        size="s"
                        text={t('yes')}
                        onClick={async () => {
                            await handleSubmit(onSubmit)();
                            onClose?.();
                        }}
                    />
                </Space>
            ),
            confirmText: t('yes'),
            cancelText: t('no'),
            hideCancelButton: true,
            hideConfirmButton: true,
            onConfirm: async () => {
                await handleSubmit(onSubmit)();
            },
            onClose: () => {
                reset(record?.fields);
                setIsEditMode(false);
            },
        });
    };

    return (
        <>
            <RecordNavigator boardData={boardData || []} currentRecordId={controlledRecordId} onNavigate={handleNavigate} />
            <Modal
                open={open}
                hideDivider
                paperSx={{
                    width: '832px',
                }}
                onClose={async (reason) => {
                    if (isEditMode) {
                        if (reason === 'escapeKeyDown') {
                            reset(record?.fields);
                            setIsEditMode(false);
                            return;
                        }
                        if (isDirty) {
                            promptUnsavedChanges();
                            return;
                        }
                    }
                    setOpen(false);
                }}
                onTransitionExited={() => {
                    onClose?.();
                }}
                titleProps={{
                    style: {
                        padding: '16px',
                        paddingBottom: '0',
                    },
                }}
                extraProps={{
                    size: 12,
                    divider: true,
                    dividerProps: {
                        sx: {
                            margin: '4px 0',
                        },
                    },
                }}
                extra={[
                    <IconButton
                        key="edit"
                        size="s"
                        type="secondary"
                        variant="text"
                        sx={{ fontSize: '24px' }}
                        onClick={async () => {
                            if (isEditMode) {
                                await handleSubmit(onSubmit)();
                                return;
                            }
                            setIsEditMode(true);
                        }}
                        {...(isEditMode && {
                            loading: loading,
                            disabled: !isDirty || !isValid,
                        })}
                    >
                        {isEditMode ? (
                            <Icon
                                name="save"
                                style={{ color: !isDirty || !isValid || loading ? 'currentColor' : 'var(--color-primary-1)' }}
                            />
                        ) : (
                            <Icon name="edit" />
                        )}
                    </IconButton>,
                    record?.created_type === 'manual' && controlledRecordId !== 'new' ? (
                        <IconButton
                            key="delete"
                            size="s"
                            type="danger"
                            variant="text"
                            sx={{ fontSize: '24px', color: '#EE7D7D', '&:hover': { color: '#EE7D7D' } }}
                            onClick={() => {
                                onRecordDelete(controlledRecordId);
                            }}
                        >
                            <Icon name="delete" />
                        </IconButton>
                    ) : null,
                ]}
            >
                {dialogsHolder}
                <Spin isSpinning={isLoading}>
                    <Space style={{ height: '100%' }} size={24} direction="vertical" align="stretch">
                        <Space justify="between" align="end">
                            <Space direction="vertical" align="start" size={8} style={{ paddingLeft: '32px' }}>
                                {identifierField && (
                                    <Controller
                                        control={control}
                                        name={identifierField._id}
                                        rules={{
                                            required: {
                                                value: true,
                                                message: t(isDocumentAIRoute ? 'validation_attribute_required' : 'validation_field_required'),
                                            },
                                            maxLength: {
                                                value: 150,
                                                message: t('crm_field_short_text_length_limit'),
                                            },
                                        }}
                                        render={({ field, fieldState: { error } }) => {
                                            return (
                                                <IdentifierField
                                                    {...field}
                                                    value={field.value as string}
                                                    readonly={!isEditMode}
                                                    editing={isEditMode}
                                                    error={!!error}
                                                    helperText={error?.message}
                                                />
                                            );
                                        }}
                                    />
                                )}
                                <Space size={4}>
                                    <Typography variant="BodyTight" style={{ color: 'var(--color-light-4)' }}>
                                        {`${t('crm_last_updated')} ${updatedTime}`}
                                    </Typography>
                                </Space>
                            </Space>
                            {controlledRecordId !== 'new' && (
                                <div style={{ paddingRight: '16px', flex: 1, alignSelf: 'flex-end', textAlign: 'right' }}>
                                    <RecordId boardId={controlledBoard._id} boardItemId={controlledRecordId} crm={false} />
                                </div>
                            )}
                        </Space>

                        <DetailFields
                            board={controlledBoard}
                            record={record || ({ id: 'new' } as API.BoardItem)}
                            isEditMode={isEditMode}
                            methods={methods}
                            updateBoard={(updatedBoard: API.Board) => {
                                setControlledBoard(updatedBoard);
                            }}
                            crm={false}
                            tableRef={tableRef}
                            onRefetch={async () => {
                                tableRef?.current?.refresh();
                                if (controlledRecordId !== 'new') {
                                    await refetch();
                                }
                            }}
                        />

                        {isEditMode && (
                            <Space size={8} align="center" justify="end" style={{ width: '100%', padding: '0 32px 16px' }}>
                                <Button
                                    size="s"
                                    loading={loading}
                                    disabled={!isDirty || !isValid}
                                    variant="contained"
                                    text={t('save')}
                                    onClick={() => {
                                        handleSubmit(onSubmit)();
                                    }}
                                />
                            </Space>
                        )}
                    </Space>
                </Spin>
            </Modal>
        </>
    );
};

interface RecordDetailModalsProps {
    container?: HTMLElement;
    isDocumentAIRoute?: boolean;
}

interface RecordDetailModalsRef {
    openRecordDetail: (props: RecordDetailModalProps) => void;
}
type RecordDetailItems = RecordDetailModalProps & {
    key: string;
};

type RecordDetailAPI = {
    openRecordDetail: (props: RecordDetailModalProps) => void;
};

type UseRecordDetailType = (props?: RecordDetailModalsProps) => [RecordDetailAPI, ReactElement];

export const RecordDetailModals = forwardRef<RecordDetailModalsRef, RecordDetailModalsProps>((props, ref) => {
    const { isDocumentAIRoute } = props;
    const [items, setItems] = useState<RecordDetailItems[]>([]);

    const onClose = (key: string) => {
        setItems((prev) => prev.filter((item) => item.key !== key));
    };

    useImperativeHandle(ref, () => ({
        openRecordDetail: (popoverProps: RecordDetailModalProps) => {
            const key = uniqueId('databoard-detail');
            setItems((prev) => {
                const clone = [...prev];
                clone.push({
                    key,
                    ...popoverProps,
                });
                return clone;
            });
        },
    }));

    return createPortal(
        <>
            {items.map((item) => {
                const { key, ...restProps } = item;
                return (
                    <RecordDetailModal
                        key={`databoard-detail-${key}`}
                        {...restProps}
                        isDocumentAIRoute={isDocumentAIRoute}
                        onClose={() => {
                            restProps.onClose?.();
                            onClose(key);
                        }}
                    />
                );
            })}
        </>,
        props.container || document.body,
    );
});

export const useRecordDetail: UseRecordDetailType = (props) => {
    const recordDetailModalsRef = useRef<RecordDetailModalsRef>(null);

    const contextHolder = useMemo(() => <RecordDetailModals ref={recordDetailModalsRef} {...props} />, [props]);

    const api = useMemo<RecordDetailAPI>(
        () => ({
            openRecordDetail: (recordDetailProps: RecordDetailModalProps) => {
                recordDetailModalsRef.current?.openRecordDetail(recordDetailProps);
            },
        }),
        [],
    );

    return [api, contextHolder];
};

export default RecordDetailModal;
