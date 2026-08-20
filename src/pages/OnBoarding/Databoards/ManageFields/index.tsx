import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { Button, EllipsisText, Icon, Illustration, Search, Space, Tooltip, Typography, useDialog } from '@imbrace/ui';
import { Box, CircularProgress, Table } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useNavigate, useParams } from 'react-router-dom';
import invariant from 'tiny-invariant';

import PageLayout from '@/components/PageLayout';
import useAccess from '@/hooks/useAccess';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { checkFieldId, pausedBoardAutomationWidthFieldId } from '@/services/api/boardAutomation';
import { deleteBoardField, postBoardField, postBoardFieldsOrder, putBoardField } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { boardByIdQueryKey, boardsQueryKey, useBoardById } from '@/services/queries/board';

import type { FieldType } from './components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldSchema } from './components/FieldFormModal/operationFieldForm';
import EnhancedTableHead from './components/Table/tableHead';
import TableRow from './components/Table/tableRow';

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

const ManageFields = ({ crm }: { crm?: boolean }) => {
    const { tab } = useParams<{ tab: string }>();
    const { state } = useLocation();
    const { open } = (state as { open?: boolean }) ?? {};
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();
    const [instanceId] = useState(() => Symbol('ManageFields'));
    const { t } = useTranslation();
    const [searchInput, setSearchInput] = useState('');
    const [filteredFieldData, setFilteredFieldData] = useState<API.BoardField[]>([]);
    const [order, setOrder] = useState<Order>('');
    const [orderBy, setOrderBy] = useState<keyof API.BoardField | undefined>(undefined);
    const { isAdmin } = useAccess();
    const [{ dialogForm, dialog }, dialogHolder] = useDialog();
    const { data: boardData, refetch, isFetching } = useBoardById(tab);

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
            await queryClient.cancelQueries({ queryKey: boardByIdQueryKey(tab) });

            const previousBoardData = queryClient.getQueryData<API.Board>(boardByIdQueryKey(tab));

            queryClient.setQueryData(boardByIdQueryKey(tab), (old: API.Board) => ({
                ...old,
                fields,
            }));

            return { previousBoardData };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(boardByIdQueryKey(tab), context?.previousBoardData);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: boardByIdQueryKey(tab) });
            queryClient.invalidateQueries({ queryKey: boardsQueryKey({ isDefault: !!crm }) });
        },
    });

    const reorder = useCallback(
        ({ startIndex, finishIndex }: { startIndex: number; finishIndex: number }) => {
            const newFields = swap(boardData?.fields || [], startIndex, finishIndex);
            if (tab) {
                reorderBoardFields.mutate({
                    boardId: tab,
                    fields: newFields,
                });
            }
        },
        [tab, boardData, reorderBoardFields],
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
                    const fields = boardData?.fields || [];
                    invariant(typeof itemId === 'string');
                    const itemIndex = fields.findIndex((item, index) => item._id === itemId);

                    if (location.current.dropTargets.length === 1) {
                        const [destinationItem] = location.current.dropTargets;
                        const indexOfTarget = fields.findIndex((item, index) => item._id === destinationItem.data.itemId);
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
    }, [boardData?.fields, instanceId, reorder]);

    const updateField = useMutation({
        mutationFn: async (params: { boardId: string; fieldId: string; data: FieldType & { hidden: boolean } }) => {
            const { data } = await apiFetch<API.Board>(
                putBoardField.api(params.boardId, params.fieldId),
                putBoardField.method,
                params.data,
            );

            return data;
        },
        onSuccess: async () => {
            refetch();
            queryClient.refetchQueries({ queryKey: boardsQueryKey({ isDefault: !!crm }) });
        },
    });

    const onDeleteField = useCallback(
        async (fieldId: string) => {
            if (!tab) return;
            await apiFetch(deleteBoardField.api(tab, fieldId), deleteBoardField.method);
            await refetch();
        },
        [tab, refetch],
    );

    const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof API.BoardField) => {
        if (orderBy) {
            const isAsc = orderBy === property && order === 'asc';
            setOrder(isAsc ? 'desc' : 'asc');
        }
        setOrderBy(property);
    };

    const onCreateField = useCallback(
        async (
            id: string,
            data: FieldType & {
                hidden: boolean;
            },
        ) => {
            await apiFetch(postBoardField.api(id), postBoardField.method, data);
        },
        [],
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
        (boardId: string, boardField?: API.BoardField) => {
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
                        data: boardField?.data && boardField?.data.length > 0 ? boardField?.data : undefined,
                    },
                    actionsAlign: 'flex-start',
                    showUnsavedDialog: true,
                    showCloseButton: true,
                    hideCancelButton: true,
                    onClose: async () => {},
                    onConfirm: async (formData, methods) => {
                        try {
                            const { name, type, description, settings, data } = formData;

                            await updateField.mutateAsync({
                                boardId,
                                fieldId: boardField._id,
                                data: {
                                    name,
                                    description,
                                    type,
                                    hidden: false,
                                    data,
                                    settings,
                                },
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
                                await refetch();
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

                            await onCreateField(boardId, {
                                name,
                                description,
                                type,
                                hidden: false,
                                data,
                                settings,
                            });
                            await refetch();
                            if (searchInput.length > 0) {
                                setSearchInput('');
                            }
                            return true;
                        } catch (error) {
                            const err = error as AxiosError;
                            console.log('on create field: ', err.response);
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
                    schema: FieldSchema({ t, existFields: boardData?.fields, checkDuplicate: true }),
                });
            }
        },
        [boardData, t, onCreateField, dispatchErrorToast, searchInput, dispatch, refetch, dialogForm, updateField],
    );

    const onSearch = useCallback(
        (searchBarInput: string) => {
            const filteredData = boardData?.fields.filter((item) => {
                const itemName = item.name.toLowerCase();
                const itemType = item.type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
                const itemDescription = item.description ? item.description.toLowerCase() : ''; // Some items might not have a description

                return itemName.includes(searchBarInput) || itemType.includes(searchBarInput) || itemDescription.includes(searchBarInput);
            });
            setFilteredFieldData(filteredData || []);
        },
        [boardData],
    );

    useEffect(() => {
        onSearch(searchInput);
    }, [onSearch, searchInput]);

    const handleDeleteField = async (fieldId: string) => {
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
                await onDeleteField(fieldId);
            } catch (err) {
                const error = err as AxiosError<API.ErrorResponse>;
                if (error.response?.data.message === 'field not found') {
                    const notificationPayload = {
                        message: t('fields_management_field_not_found'),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));
                    await refetch();
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
                        await refetch();
                    }
                }
            },
            onClose: () => {},
        });
    };

    useEffect(() => {
        if (open && tab) {
            openDialog(tab);
            navigate('.', { replace: true });
        }
    }, [open, tab, openDialog, navigate]);

    const renderExtra = () => {
        return isAdmin() ? (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center',
                }}
            >
                <Box sx={{ width: '248px' }}>
                    <Search
                        value={searchInput}
                        placeholder={t('search')}
                        onSearch={(searchVal) => setSearchInput(searchVal.toLowerCase())}
                        onReset={() => setSearchInput('')}
                    />
                </Box>
                <Tooltip
                    title={t('board_system_disabled_add_new_field')}
                    disableHoverListener={!(boardData?.type === 'System' && boardData.journey?.type !== 'form_management')}
                    placement="top-end"
                    arrow
                >
                    <div>
                        <Button
                            text={t('fields_management_add_new_field')}
                            disabled={boardData?.type === 'System' && boardData.journey?.type !== 'form_management'}
                            onClick={() => {
                                if (!tab) return;
                                openDialog(tab);
                            }}
                        />
                    </div>
                </Tooltip>
            </Box>
        ) : undefined;
    };

    if (!boardData || !tab)
        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <CircularProgress />
            </Box>
        );

    const getMappedData = () => {
        if (order && orderBy) {
            return stableSort<API.BoardField>(searchInput ? filteredFieldData : boardData.fields, getComparator(order, orderBy));
        }
        return searchInput ? filteredFieldData : boardData.fields;
    };

    const renderTableRow = (item: API.BoardField) => {
        return (
            <TableRow
                instanceId={instanceId}
                key={item._id}
                boardId={tab}
                item={item}
                openDialog={() => openDialog(tab, item)}
                handleDeleteField={handleDeleteField}
                refresh={async () => {
                    await refetch();
                    queryClient.refetchQueries({ queryKey: boardsQueryKey({ isDefault: !!crm }) });
                }}
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
                                openDialog(tab);
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
        <PageLayout
            title={`${t('fields_management_header')} - ${boardData?.name}`}
            onBack={() => navigate(`/${crm ? 'crm' : 'databoards'}/${tab}`)}
            backBtnText={crm ? t('menu_crm') : t('menu_databoards')}
            rightSideComponent={
                !isAdmin() ? (
                    <Space justify="end">
                        <Box sx={{ width: '248px' }}>
                            <Search
                                value={searchInput}
                                placeholder={t('search')}
                                onSearch={(searchVal) => setSearchInput(searchVal.toLowerCase())}
                                onReset={() => setSearchInput('')}
                            />
                        </Box>
                    </Space>
                ) : undefined
            }
            loading={isFetching}
            extra={renderExtra()}
        >
            {dialogHolder}
            <Table>
                <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />

                {boardData && tab && getMappedData().length > 0 ? getMappedData().map((item) => renderTableRow(item)) : renderEmptyState()}
            </Table>
        </PageLayout>
    );
};

export default ManageFields;
