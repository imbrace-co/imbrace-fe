import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { Button, EllipsisText, Icon, Illustration, Space, Typography, useDialog } from '@imbrace/ui';
import { Box, CircularProgress, Table } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import React, { RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Control, FormProvider, useController } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import invariant from 'tiny-invariant';
import useAccess from '@/hooks/useAccess';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { checkFieldId, pausedBoardAutomationWidthFieldId } from '@/services/api/boardAutomation';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardByIdQueryKey, boardsQueryKey } from '@/services/queries/board';
import type { FieldType } from './components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldSchema } from './components/FieldFormModal/operationFieldForm';
import EnhancedTableHead from './components/Table/tableHead';
import TableRow from './components/Table/tableRow';
import { deleteBoardField, postBoardFieldsOrder } from '@/services/api/crm';
import { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { BoardSettingFormValue } from '..';

type Order = 'asc' | 'desc' | '';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function getComparator<K>(order: Order, orderBy: keyof K): (a: K, b: K) => number {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
}

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

function swap<T = unknown>(array: T[], indexA: number, indexB: number): T[] {
    const tmpArray = [...array];
    const tmp = tmpArray[indexA];
    tmpArray[indexA] = tmpArray[indexB];
    tmpArray[indexB] = tmp;
    return tmpArray;
}

const ManageFields = ({
    crm,
    knowledgeHub,
    id,
    boardData,
    tableRef,
    formControl,
    reset,
}: {
    crm?: boolean;
    knowledgeHub?: boolean;
    id?: string;
    boardData?: API.Board;
    tableRef: RefObject<FlexibleTableRef<API.BoardItem>>;
    formControl: Control<BoardSettingFormValue>;
    reset: () => void;
}) => {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const [instanceId] = useState(() => Symbol('ManageFields'));
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order>('');
    const [orderBy, setOrderBy] = useState<keyof API.BoardField | undefined>(undefined);
    const { isAdmin } = useAccess();
    const [{ dialogForm, dialog }, dialogHolder] = useDialog();
    
    const {
        field: { value: fields, onChange: setFields},
    } = useController({
        name: 'fields',
        control: formControl,
    });


    const hasNewCreatedField = useMemo(() => {
        return fields.some((field) => field._id === '');
    }, [fields]);

    const reorderBoardFields = useMutation({
        mutationFn: async (params: { boardId: string; fields: API.BoardField[] }) => {
            const { data } = await apiFetch<API.Board>(postBoardFieldsOrder.api(params.boardId), postBoardFieldsOrder.method, {
                fields: params.fields.map((field) => field._id),
            });
            return {
                data,
            };
        },
        onMutate: async ({ fields }) => {
            await queryClient.cancelQueries({ queryKey: boardByIdQueryKey(id) });

            const previousBoardData = queryClient.getQueryData<API.Board>(boardByIdQueryKey(id));
            if (previousBoardData) {
                queryClient.setQueryData(boardByIdQueryKey(id), (old: API.Board) => ({
                    ...old,
                    fields,
                }));
            }

            return { previousBoardData };
        },
        onSuccess: ({ data }) => {
            setFields(data.fields);
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(boardByIdQueryKey(id), context?.previousBoardData);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: boardByIdQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }) });
        },
    });

    const reorder = useCallback(
        async ({ startIndex, finishIndex }: { startIndex: number; finishIndex: number }) => {
            const currentFields = fields; 
            const newFields = swap(currentFields, startIndex, finishIndex);
            setFields(newFields);
            
            if (id) {
                try {
                    await reorderBoardFields.mutateAsync({
                        boardId: id,
                        fields: newFields,
                    });
                    reset(); 
                } catch (error) {
                    setFields(currentFields);
                    console.error('Failed to reorder fields:', error);
                }
            }
        },
        [id, fields, reorderBoardFields, setFields, reset],
    );

    useEffect(() => {
        return combine(
            monitorForElements({
                canMonitor({ source }) {
                    return source.data.instanceId === instanceId;
                },
                onDrop: (args) => {
                    const { location, source } = args;
                    // didn't drop on anything
                    if (!location.current.dropTargets.length) {
                        return;
                    }

                    const itemId = source.data.itemId;
                    const currentFields = fields; 
                    invariant(typeof itemId === 'string');
                    const itemIndex = currentFields.findIndex((item, index) => item._id === itemId);

                    if (location.current.dropTargets.length === 1) {
                        const [destinationItem] = location.current.dropTargets;
                        const indexOfTarget = currentFields.findIndex((item, index) => item._id === destinationItem.data.itemId);
                        const closestEdgeOfTarget: Edge | null = extractClosestEdge(destinationItem.data);
                        const destinationIndex = getReorderDestinationIndex({
                            startIndex: itemIndex,
                            indexOfTarget: indexOfTarget,
                            closestEdgeOfTarget: closestEdgeOfTarget,
                            axis: 'vertical',
                        });
                        reorder({
                            startIndex: itemIndex,
                            finishIndex: destinationIndex,
                        });

                        return;
                    }
                },
            }),
        );
    }, [fields, instanceId, reorder]);

    const updateField = useCallback(
        async ({ fieldId, data, index }: { fieldId: string; data: Partial<API.BoardField>; index?: number }) => {
            const newFields = fields.map((field, i) => {
                if ((typeof index === 'number' && i === index) || (fieldId !== '' && field._id === fieldId)) {
                    return { ...field, ...data };
                }
                return field;
            });
            setFields(newFields);
        },
        [fields, setFields],
    );

    const onDeleteField = useCallback(
        async (fieldId: string, index?: number) => {
            if (fieldId === '') {
                const newFields = fields.filter((field, i) => {
                    if (typeof index === 'number' && i === index) {
                        return false;
                    }
                    return true;
                });
                setFields(newFields);
            } else {
                if (!id) return;
                await apiFetch(deleteBoardField.api(id, fieldId), deleteBoardField.method);
                await queryClient.refetchQueries({
                    queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }),
                });
                await tableRef.current?.refresh();
                const newFields = fields.filter((field) => field._id !== fieldId);
                setFields(newFields);
                // reset();
            }
        },
        [fields],
    );

    const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof API.BoardField) => {
        if (orderBy) {
            const isAsc = orderBy === property && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
        }
        setOrderBy(property);
    };

    const onCreateField = useCallback(
        (data: FieldType & { hidden: boolean }) => {
            const newField: API.BoardField = {
                _id: '',
                ...data,
                is_default: false,
            };
            setFields([...fields, newField]);
        },
        [fields],
    );

    const dispatchErrorToast = useCallback(
        (error: AxiosError) => {
            const message = error?.response?.data?.message;

            const notificationPayload = {
                message,
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
        [dispatch],
    );

    const openDialog = useCallback(
        (boardField?: API.BoardField, index?: number) => {
            if (boardField) {
                dialogForm<FieldType>({
                    title: t('fields_management_form_header_edit'),
                    content: (methods) => (
                        <FormProvider {...methods}>
                            <OperationFieldForm
                                boardType={boardData?.type}
                                boardField={boardField}
                                boardName={boardData?.name}
                                methods={methods}
                            />
                        </FormProvider>
                    ),
                    confirmText: t('update'),
                    defaultValues: {
                        ...boardField,
                        data: boardField?.data && boardField?.data.length > 0 ? boardField?.data : fields.find((field) => field._id === boardField._id)?.data,
                    },
                    actionsAlign: 'flex-start',
                    showUnsavedDialog: true,
                    showCloseButton: true,
                    hideCancelButton: true,
                    onClose: async () => {},
                    onConfirm: async (formData, methods) => {
                        try {
                            const { name, type, description, settings, data } = formData;
                            await updateField({
                                fieldId: boardField._id,
                                data: {
                                    name,
                                    description,
                                    type,
                                    hidden: false,
                                    data,
                                    settings,
                                } as Partial<API.BoardField>,
                                index,
                            });
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            if (err.response?.status === 409 && err.response?.data?.message.includes('Field name cannot be duplicated')) {
                                methods?.setError('name', {
                                    type: 'value',
                                    message: t('fields_management_form_duplicate_name'),
                                });
                                return false;
                            }
                            if (err.response?.data.message === 'field not found') {
                                const notificationPayload = {
                                    message: t('fields_management_field_not_found'),
                                    messageType: 'noti_failed',
                                    variant: 'error',
                                };
                                dispatch(pushNotification({ notification: notificationPayload }));
                                return true;
                            }
                            if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                                dispatchErrorToast(err);
                                return false;
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
                    schema: FieldSchema({
                        t,
                        existFields: boardData?.fields.filter((field) => field._id !== boardField._id),
                        checkDuplicate: true,
                    }),
                });
            } else {
                dialogForm<FieldType>({
                    title: t('fields_management_form_header_new'),
                    content: (methods) => (
                        <FormProvider {...methods}>
                            <OperationFieldForm methods={methods} boardType={boardData?.type} boardName={boardData?.name} />
                        </FormProvider>
                    ),
                    defaultValues: {
                        name: '',
                    },
                    confirmText: t('create'),
                    showUnsavedDialog: true,
                    showCloseButton: true,
                    hideCancelButton: true,
                    actionsAlign: 'flex-start',
                    onClose: () => {},
                    onConfirm: async (formData, methods) => {
                        try {
                            const { name, type, description, data, settings } = formData;
                            await onCreateField({
                                name,
                                description,
                                type,
                                hidden: false,
                                data,
                                settings,
                            });
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            if (err.response?.status === 409 && err.response?.data?.message === 'Field name already exists') {
                                methods?.setError('name', {
                                    type: 'value',
                                    message: t('fields_management_form_duplicate_name'),
                                });
                                return false;
                            }
                            if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                                dispatchErrorToast(err);
                                return false;
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
                    schema: FieldSchema({ t, existFields: fields, checkDuplicate: true }),
                });
            }
        },
        [boardData, t, onCreateField, dispatchErrorToast, dispatch, dialogForm, updateField],
    );

    const handleDeleteField = async (fieldId: string, index?: number) => {
        if (fieldId === '') return onDeleteField(fieldId, index);
        let fieldUsage: API.AutomationWorkflow[] | [];
        try {
            const { data } = await apiFetch<API.AutomationWorkflow[] | []>(checkFieldId.api(fieldId), checkFieldId.method, {}, ImbraceClient);
            fieldUsage = data;
        } catch (err) {
            fieldUsage = [];
            const error = err as AxiosError<API.ErrorResponse>;
            const notificationPayload = {
                message: 'Failed to check field usage',
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
            console.log('error: ', error.response);
        }
        if (localStorage.getItem('dont_asked_delete_crm_field_again') === 'true' && fieldUsage.length === 0) {
            try {
                await onDeleteField(fieldId, index);
            } catch (err) {
                const error = err as AxiosError<API.ErrorResponse>;
                if (error.response?.data.message === 'field not found') {
                    const notificationPayload = {
                        message: t('fields_management_field_not_found'),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));
                }
            }
            return;
        }
        dialog({
            title: t('fields_management_delete_field_header'),
            content: (
                <Space direction="vertical" size={24}>
                    <Typography variant="Body">{t('fields_management_delete_field_body')}</Typography>
                    {fieldUsage.length > 0 && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                border: '1px solid var(--color-secondary-4)',
                                width: '100%',
                                maxHeight: '228px',
                                '& > div': {
                                    padding: ' 0px 16px',
                                    width: '100%',
                                    minHeight: 0,
                                    overflowY: 'auto',
                                },
                            }}
                        >
                            <div>
                                {fieldUsage.map((item) => (
                                    <Box
                                        key={item._id}
                                        sx={{
                                            width: '100%',
                                            display: 'flex',
                                            padding: '16px 0px',
                                            alignItems: 'center',
                                            gap: '12px',
                                        }}
                                    >
                                        <Icon name="clientProfile" style={{ fontSize: 24 }} />
                                        <EllipsisText text={item.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                                    </Box>
                                ))}
                            </div>
                        </Box>
                    )}
                </Space>
            ),
            showDontAskedAgain: false,
            confirmButtonProps: {
                type: 'danger',
            },
            actionsAlign: 'flex-end',
            onConfirm: async (dontAskedAgain) => {
                try {
                    if (dontAskedAgain) {
                        localStorage.setItem('dont_asked_delete_crm_field_again', 'true');
                    }
                    await onDeleteField(fieldId);
                    if (fieldUsage.length > 0) {
                        // handle pause associated board automation if data.length > 0
                        await apiFetch<void>(
                            pausedBoardAutomationWidthFieldId.api(fieldId),
                            pausedBoardAutomationWidthFieldId.method,
                            {},
                            ImbraceClient,
                        );
                    }
                } catch (err) {
                    const error = err as AxiosError<API.ErrorResponse>;
                    if (error.response?.data.message === 'field not found') {
                        const notificationPayload = {
                            message: t('fields_management_field_not_found'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                    }
                }
            },
            onClose: () => {},
        });
    };

    const getMappedData = () => {
        if (order && orderBy) {
            return stableSort<API.BoardField>(fields, getComparator(order, orderBy));
        }
        return fields;
    };

    const renderTableRow = (item: API.BoardField, index: number) => {
        return (
            <TableRow
                boardId={id}
                instanceId={instanceId}
                key={item._id || `new-field-${index}`}
                item={item}
                openDialog={() => openDialog(item, index)}
                handleDeleteField={() => handleDeleteField(item._id, index)}
                refresh={async () => {
                    queryClient.refetchQueries({ queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }) });
                }}
                onUpdateField={(params) => updateField({ ...params, index })}
                hasNewCreatedField={hasNewCreatedField}
            />
        );
    };

    const renderEmptyState = () => {
        const textTrans = (
            <Typography variant="SubHeading2">
                <Trans
                    i18nKey="fields_management_empty_result_text"
                    components={[
                        <button
                            onClick={() => {
                                openDialog();
                            }}
                        >
                            a new field
                        </button>,
                    ]}
                >
                    No matching result has been found.\nChecking the spelling or create now
                </Trans>
            </Typography>
        );
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    paddingTop: '98px',
                    fontWeight: 600,
                    fontSize: '16px',
                    lineHeight: '24px',
                }}
            >
                <Illustration name={'fileSearch'} description={isAdmin() ? textTrans : t('fields_management_empty_result_text_user')} />
            </Box>
        );
    };

    return (
        <>
            <Table>
                <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
                {getMappedData().length > 0
                    ? getMappedData().map((item, index) => renderTableRow(item, index))
                    : renderEmptyState()}
            </Table>
            {isAdmin() && (
                <Space justify="start">
                    <Button
                        variant="link"
                        text={'Add Field'}
                        startIcon={<Icon name="add" />}
                        disabled={boardData?.type === 'System' && boardData.journey?.type !== 'form_management'}
                        onClick={() => {
                            openDialog();
                        }}
                    />
                </Space>
            )}
            {dialogHolder}
        </>
    );
};

export default ManageFields;
