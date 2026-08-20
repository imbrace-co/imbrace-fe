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
import { Control, FormProvider, useController, useFormContext, useWatch } from 'react-hook-form';
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
import { useNotify } from '@/contexts/SnackbarContext';
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

export type ManageFieldsProps = {
    crm?: boolean;
    knowledgeHub?: boolean;
    isDocumentAIRoute?: boolean;
    id?: string;
    boardData?: API.Board;
    tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
    formControl: Control<any>;
    reset: () => void;
    boardType?: API.BoardType;
    boardName?: string;
    isEditMode?: boolean;
    isNestedContext?: boolean;
};



const FieldFormFooter = ({ isNestedContext }: { isNestedContext?: boolean }) => {
    const { control, handleSubmit, setFocus } = useFormContext();
    const type = useWatch({ control, name: 'type' });
    const { t } = useTranslation();
    const { notify } = useNotify();

    let label = t('create');
    if (type === 'TableInTable') {
        label = t('board_confirm');
    } else if (isNestedContext) {
        label = t('board_add');
    }

    const findFirstErrorPath = (errors: Record<string, unknown>, prefix = ''): string | null => {
        for (const key of Object.keys(errors)) {
            const node = (errors as Record<string, unknown>)[key] as Record<string, unknown> | undefined;
            if (!node) continue;
            const path = prefix ? `${prefix}.${key}` : key;
            if ('message' in node && typeof node.message === 'string' && node.message) {
                return path;
            }
            if ('type' in node && typeof node.type === 'string') {
                // Zod sometimes populates the object with `{type, message}`; treat as leaf even if message missing.
                return path;
            }
            // Recurse into nested field errors (objects / arrays).
            if (typeof node === 'object') {
                const nested = findFirstErrorPath(node as Record<string, unknown>, path);
                if (nested) return nested;
            }
        }
        return null;
    };

    return (
        <div style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'flex-start'
        }}>
            <Button
                variant="contained"
                text={label}
                onClick={(e) => {
                    console.log('[FieldFormFooter] CONFIRM clicked', {
                        isNestedContext,
                        type,
                        formValues: control._formValues,
                    });
                    handleSubmit(
                        (data) => {
                            console.log('[FieldFormFooter] validation passed', { data });
                            // Reason: stale dialogs (e.g. the TIT chooser flow that closes
                            // and re-opens the form) can leave a disabled hidden button in
                            // the DOM. querySelector would pick the stale one. Find the
                            // last enabled match instead.
                            const selector = isNestedContext ? '.hidden-confirm-btn-child' : '.hidden-confirm-btn-parent';
                            const all = Array.from(
                                document.querySelectorAll<HTMLButtonElement>(selector),
                            );
                            const enabled = all.filter((b) => !b.disabled);
                            const btn = enabled[enabled.length - 1] ?? all[all.length - 1] ?? null;
                            console.log('[FieldFormFooter] hidden btn lookup', {
                                selector,
                                totalMatches: all.length,
                                enabledMatches: enabled.length,
                                pickedDisabled: btn?.disabled,
                            });
                            if (btn) {
                                console.log('[FieldFormFooter] clicking hidden btn');
                                btn.click();
                            } else {
                                console.warn('[FieldFormFooter] hidden btn NOT FOUND for selector', selector);
                            }
                        },
                        (errors) => {
                            console.warn('[FieldFormFooter] validation FAILED', { errors });
                            const firstPath = findFirstErrorPath(errors as Record<string, unknown>);
                            console.warn('[FieldFormFooter] first error path', firstPath);
                            if (firstPath) {
                                try {
                                    setFocus(firstPath as never);
                                } catch {
                                    // setFocus fails for nested paths on some RHF versions — swallow silently.
                                }
                            }
                            notify({
                                type: 'error',
                                message: t('fields_management_form_validation_failed'),
                            });
                        },
                    )(e);
                }}
                sx={{
                    minWidth: '160px',
                    height: '40px',
                }}
            />
        </div>
    );
};

export const FieldsList = ({
    crm,
    knowledgeHub,
    isDocumentAIRoute,
    id,
    boardData,
    tableRef,
    formControl,
    reset,
    boardType: propsBoardType,
    boardName: propsBoardName,
    isEditMode,
    isNestedContext,
}: ManageFieldsProps) => {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const [instanceId] = useState(() => Symbol('ManageFields'));
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order>('');
    const [orderBy, setOrderBy] = useState<keyof API.BoardField | undefined>(undefined);
    const { isAdmin } = useAccess();
    const [{ dialogForm, dialog }, dialogHolder] = useDialog();
    const { notify } = useNotify();
    const boardType = propsBoardType || boardData?.type;
    const boardName = propsBoardName || boardData?.name;
    const isDetached = !boardData;

    const {
        field: { value: fields, onChange: setFields },
    } = useController({
        name: 'fields',
        control: formControl,
    });

    // Board-level "show Record ID column" flag — bound to the system Record ID row's
    // "Show on board" toggle. Persisted by the board Save (updateBoardById).
    const {
        field: { value: showId, onChange: setShowId },
    } = useController({
        name: 'show_id' as any,
        control: formControl,
    });


    const hasNewCreatedField = useMemo(() => {
        return fields?.some((field: API.BoardField) => field._id === '');
    }, [fields]);

    const reorderBoardFields = useMutation({
        mutationFn: async (params: { boardId: string; fields: API.BoardField[] }) => {
            const { data } = await apiFetch<API.Board>(postBoardFieldsOrder.api(params.boardId), postBoardFieldsOrder.method, {
                fields: params.fields.map((field) => field._id),
            });
            // apiFetch returns the raw axios response, so `data` is the HTTP body
            // `{ data: board }`. Unwrap so onSuccess gets the board (with `fields`).
            const board = ((data as any)?.data || data) as API.Board;
            return {
                data: board,
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
            // Reordering via settings is the source of truth for field order. Drop the
            // locally-saved column order (from dragging columns) so the table follows the new API order.
            if (id) {
                localStorage.removeItem(`${id}-Order`);
            }
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(boardByIdQueryKey(id), context?.previousBoardData);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: boardByIdQueryKey(id) });
            queryClient.invalidateQueries({ queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }) });
            // Drop the BoardSetting `board-detail` cache so its form never re-seeds
            // from a stale (pre-reorder) snapshot if the dialog re-mounts.
            queryClient.removeQueries({ queryKey: ['board-detail', id] });
        },
    });

    const reorder = useCallback(
        async ({ startIndex, finishIndex }: { startIndex: number; finishIndex: number }) => {
            const currentFields = fields || [];
            const newFields = swap(currentFields, startIndex, finishIndex);
            setFields(newFields);

            if (id) {
                try {
                    await reorderBoardFields.mutateAsync({
                        boardId: id,
                        fields: newFields as API.BoardField[],
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
                    const currentFields = fields || [];
                    invariant(typeof itemId === 'string');
                    const itemIndex = currentFields.findIndex((item: API.BoardField, index: number) => item._id === itemId);

                    if (location.current.dropTargets.length === 1) {
                        const [destinationItem] = location.current.dropTargets;
                        const indexOfTarget = currentFields.findIndex((item: API.BoardField, index: number) => item._id === destinationItem.data.itemId);
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
            const newFields = (fields || []).map((field: API.BoardField, i: number) => {
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
                const newFields = (fields || []).filter((field: API.BoardField, i: number) => {
                    if (typeof index === 'number' && i === index) {
                        return false;
                    }
                    return true;
                });
                setFields(newFields);
            } else {
                if (!id) {
                    const newFields = (fields || []).filter((field: API.BoardField) => field._id !== fieldId);
                    setFields(newFields);
                    return;
                }
                await apiFetch(deleteBoardField.api(id, fieldId), deleteBoardField.method);
                await queryClient.refetchQueries({
                    queryKey: boardsQueryKey({ isDefault: knowledgeHub ? undefined : !!crm, types: knowledgeHub ? 'KnowledgeHub' : undefined }),
                });
                await tableRef?.current?.refresh();
                const newFields = (fields || []).filter((field: API.BoardField) => field._id !== fieldId);
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
            setFields([...(fields || []), newField]);
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
            // Document-models style detail layout (two columns + in-body DELETE/SAVE footer).
            const isAiDetail = true; // Board settings Fields tab always uses the inline AI layout.

            if (boardField) {
                dialogForm<FieldType>({
                    title: t('fields_management_form_header_edit'),
                    paperSx: isAiDetail ? { width: '90vw', maxWidth: '900px' } : undefined,
                    content: (methods, onCloseForm) => (
                        <FormProvider {...methods}>
                            <OperationFieldForm
                                boardType={boardType}
                                boardField={boardField}
                                boardName={boardName}
                                methods={methods}
                                ManageFieldsComponent={FieldsList}
                                isNested={isNestedContext}
                                isDocumentAIRoute={isAiDetail}
                                onDelete={isAiDetail && !(boardField as any)?.isSystemRecordId ? () => {
                                    // Keep the edit dialog open while the delete-confirm runs; it only
                                    // closes once the field is actually deleted (cancel keeps editing).
                                    handleDeleteField(boardField._id, index, () => onCloseForm?.());
                                } : undefined}
                            />
                        </FormProvider>
                    ),
                    confirmText: t('update'),
                    defaultValues: {
                        ...boardField,
                        data: boardField?.data && boardField?.data.length > 0 ? boardField?.data : fields.find((field: API.BoardField) => field._id === boardField._id)?.data,
                        board_child_mapped:
                            boardField?.board_child_mapped ||
                            (boardField?.type === 'TableInTable' && boardField?.data?.[0]?._id) ||
                            undefined,
                        fields: (boardField as any)?.child_board_fields || (boardField as any)?.fields,
                        // Record ID row: "Show on Data board" reflects the board-level show_id.
                        ...((boardField as any)?.isSystemRecordId ? { hidden: !showId } : {}),
                    },
                    actionsAlign: 'flex-start',
                    showUnsavedDialog: !isDetached,
                    showCloseButton: true,
                    hideCancelButton: true,
                    onClose: async () => { },
                    onConfirm: async (formData, methods) => {
                        try {
                            // Record ID row is not a real field — its "Show on Data board" checkbox is
                            // the board-level show_id. Update the board form; the board Save persists it
                            // via updateBoardById (PUT /boards/:id { ..., show_id }).
                            if ((boardField as any)?.isSystemRecordId) {
                                setShowId(!formData.hidden);
                                return true;
                            }
                            const { name, type, description, settings, data, board_child_mapped, fields, hidden, hidden_on_record } = formData;
                            await updateField({
                                fieldId: boardField._id,
                                data: {
                                    name,
                                    description,
                                    type,
                                    hidden: hidden ?? false,
                                    hidden_on_record: hidden_on_record ?? false,
                                    data,
                                    settings,
                                    board_child_mapped,
                                    fields,
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
                    confirmButtonProps: isAiDetail
                        ? {
                            className: isNestedContext ? 'hidden-confirm-btn-child' : 'hidden-confirm-btn-parent',
                            sx: { display: 'none' },
                        }
                        : {
                            sx: {
                                minWidth: '160px',
                                height: '40px',
                            },
                        },
                    schema: FieldSchema({
                        t,
                        existFields: (fields || []).filter((field: API.BoardField) => field._id !== boardField._id),
                        checkDuplicate: true,
                        inlineTableInTable: isAiDetail,
                    }),
                });
            } else {
                const onConfirmHandler = async (formData: FieldType, methods: any) => {
                    console.log('[onConfirmHandler] entered', { formData });
                    try {
                        const { name, type, description, data, settings, board_child_mapped, fields, hidden, hidden_on_record } = formData;
                        const childBoardName = (formData as FieldType & { child_board_name?: string }).child_board_name;
                        console.log('[onConfirmHandler] calling onCreateField', { name, type, childBoardName, fields });
                        await onCreateField({
                            name,
                            description,
                            type,
                            hidden: hidden ?? false,
                            hidden_on_record: hidden_on_record ?? false,
                            data,
                            settings,
                            board_child_mapped,
                            fields,
                            ...(type === 'TableInTable' && childBoardName && childBoardName.trim().length > 0
                                ? { child_board_name: childBoardName.trim() }
                                : {}),
                        } as Parameters<typeof onCreateField>[0]);
                        console.log('[onConfirmHandler] onCreateField OK');
                        return true;
                    } catch (error) {
                        console.error('[onConfirmHandler] threw', error);
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
                };

                const openFieldFormDialog = (prefill?: Partial<FieldType>) => {
                    dialogForm<FieldType>({
                        title: t(isDocumentAIRoute ? 'databoard_add_target_attribute' : 'fields_management_form_header_new'),
                        paperSx: isAiDetail ? { width: '90vw', maxWidth: '900px' } : undefined,
                        content: (methods, onCloseForm) => (
                            <FormProvider {...methods}>
                                <OperationFieldForm
                                    methods={methods}
                                    boardType={boardType}
                                    boardName={boardName}
                                    ManageFieldsComponent={FieldsList}
                                    isNested={isNestedContext}
                                    isDocumentAIRoute={isAiDetail}
                                    onTableInTableSelected={
                                        isNestedContext || boardType !== 'General'
                                            ? undefined
                                            : () => {
                                                  // OSS edition: Table-in-Table always uses the
                                                  // inline Manual builder. The Link-to-existing-board
                                                  // option was removed, so skip the chooser and stay
                                                  // in this same form in manual mode.
                                                  methods.setValue(
                                                      'tit_mode' as never,
                                                      'manual' as never,
                                                      { shouldDirty: true, shouldValidate: false },
                                                  );
                                              }
                                    }
                                />
                                {/* AI/document-models layout renders its own in-body footer; the
                                    single-column form keeps the separate FieldFormFooter. */}
                                {!isAiDetail && <FieldFormFooter isNestedContext={isNestedContext} />}
                            </FormProvider>
                        ),
                        defaultValues: {
                            name: '',
                            ...prefill,
                        },
                        confirmText: t('create'),
                        showUnsavedDialog: !isDetached,
                        showCloseButton: true,
                        hideCancelButton: true,
                        actionsAlign: 'flex-start',
                        onClose: () => { },
                        onConfirm: onConfirmHandler,
                        confirmButtonProps: {
                            className: isNestedContext ? 'hidden-confirm-btn-child' : 'hidden-confirm-btn-parent',
                            sx: {
                                display: 'none',
                            },
                        },
                        schema: FieldSchema({ t, existFields: fields, checkDuplicate: true, inlineTableInTable: isAiDetail }),
                    });
                };

                openFieldFormDialog();
            }
        },
        [boardData, t, onCreateField, dispatchErrorToast, dispatch, dialogForm, updateField, boardType, boardName, fields, showId, setShowId],
    );

    // `onDeleted` fires only after the field is actually removed (confirm accepted + API ok) —
    // the edit dialog uses it to close itself; cancelling the confirm keeps the dialog open.
    const handleDeleteField = async (fieldId: string, index?: number, onDeleted?: () => void) => {
        if (fieldId === '') {
            await onDeleteField(fieldId, index);
            onDeleted?.();
            return;
        }
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
                onDeleted?.();
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
                    onDeleted?.();
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
            onClose: () => { },
        });
    };

    const getMappedData = () => {
        if (order && orderBy) {
            return stableSort<API.BoardField>(fields || [], getComparator(order, orderBy));
        }
        return fields || [];
    };

    // Synthetic "Record ID (System Default)" row — every record carries a system _id, so this
    // row is injected client-side (it is NOT a stored board field; the API never returns it).
    // is_default keeps it non-deletable; isSystemDefault (below) makes name/type read-only.
    const recordIDData = {
        name: t('board_access_record_id_title'),
        description: t('board_access_record_id_info'),
        type: 'ShortText',
        is_default: true,
        // Marker so the edit dialog knows this synthetic row maps to the board-level `show_id`
        // (its "Show on Data board" checkbox), not a real field.
        isSystemRecordId: true,
    } as unknown as API.BoardField;

    const renderTableRow = (item: API.BoardField, index: number, isSystemDefault?: boolean) => {
        console.log("item OKOK", item);
        return (
            <TableRow
                formControl={formControl}
                knowledgeHub={knowledgeHub}
                isDocumentAIRoute={isDocumentAIRoute}
                isSystemDefault={isSystemDefault}
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
                isNested={isDetached}
                disableActions={isDetached && isEditMode}
            />
        );
    };

    const renderEmptyState = () => {
        if (isDetached) return null;
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
                <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} isNested={isNestedContext} isDocumentAIRoute={isDocumentAIRoute} />
                {/* Always-present system Record ID row (not a real field) — hidden for CRM / Knowledge Hub
                    and for nested (TableInTable child) lists, matching the original behaviour. */}
                {!crm && !knowledgeHub && !isNestedContext && renderTableRow(recordIDData, -1, true)}
                {getMappedData().length > 0
                    ? getMappedData().map((item: API.BoardField, index: number) => renderTableRow(item, index))
                    : renderEmptyState()}
            </Table>
            {isAdmin() && !(isDetached && isEditMode) && (
                <Space justify="start">
                    <Button
                        variant="link"
                        text={t(isDocumentAIRoute ? 'databoard_add_target_attribute' : 'add_field')}
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

const ManageFields = (props: ManageFieldsProps) => {
    return (
        <FieldsList {...props} />
    );
};

export default ManageFields;
