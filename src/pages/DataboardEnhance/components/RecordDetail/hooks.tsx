import type { Attachment, DialogProps } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { AttachmentValue } from '@/components/FlexibleTable/types';
import type { InvalidErrorResObject, MismatchErrorResObject } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { postContactAvatar, putContactByIdV2 } from '@/services/api/contact';
import { postBoardFile, postBoardRecord, postBoardUpload, putBoardRecord } from '@/services/api/crm';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import type { RecordValue } from './types';
import { useNotify } from '@/contexts/SnackbarContext';

const useRecordDetailHelper = ({
    board,
    record,
    refresh,
    dialog,
    crm,
}: {
    board?: API.Board;
    record?: API.BoardItem;
    refresh: () => Promise<void>;
    dialog: (dialogProps: Omit<DialogProps, 'open'>) => void;
    crm?: boolean;
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { notify } = useNotify();
    // const mismatchRef = useRef<{ type: string; path: string }>();

    const createRecord = useMutation({
        mutationFn: async (params: { boardId: string; fields: { board_field_id: string; value: unknown }[] }) => {
            const { data: createdRecord } = await apiFetch<API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
                fields: params.fields,
            });
            return { ...createdRecord, ...createdRecord.fields } as unknown as API.BoardItem;
        },
        onSuccess: () => {
            refresh();
        },
    });

    const updateRecord = useMutation({
        mutationFn: async (params: { boardId: string; recordId: string; data: { key: string; value: unknown }[] }) => {
            const { data: updatedRecord } = await apiFetch<API.BoardItem>(
                putBoardRecord.api(params.boardId, params.recordId),
                putBoardRecord.method,
                {
                    data: params.data,
                },
            );

            return { ...updatedRecord, ...updatedRecord.fields } as unknown as API.BoardItem;
        },
        onError: (err, variables) => {
            console.log(err);
            const error = err as AxiosError<API.ErrorResponse | { data: InvalidErrorResObject[] | MismatchErrorResObject[] }>;
            if (error && error.response && error.response.data) {
                if ('message' in error.response?.data) {
                    if (error.response?.data.message.indexOf('Invalid field') !== -1) {
                        const notificationPayload = {
                            message: t('fields_management_field_not_found'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                        refresh();
                        return;
                    }
                    if (error.response?.data.message.indexOf('Not found') !== -1) {
                        const notificationPayload = {
                            message: t('crm_record_not_found'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                        refresh();
                        return;
                    }
                    if (error.response?.data.message.indexOf('Invalid phone number') !== -1) {
                        const notificationPayload = {
                            message: t('validation_phone_field_pattern'),
                            messageType: 'noti_failed',
                            variant: 'error',
                        };
                        dispatch(pushNotification({ notification: notificationPayload }));
                        refresh();
                        return;
                    }
                    const notificationPayload = {
                        message: t('error_something_went_wrong'),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));
                    refresh();
                }
            }

            console.log(error);
        },
        onSuccess: () => {
            refresh();
        },
    });

    const onDataUpdate = useCallback(
        async ({ fieldId, value, recordId }: { fieldId: string; value: RecordValue; recordId: string }) => {
            if (board?._id || (board as any)?.id) {
                if (recordId === 'new') {
                    // const result = await handleCreateRecord(currentBoard?._id, [
                    //     {
                    //         board_field_id: columnId,
                    //         value,
                    //     },
                    // ]);
                    // return result;
                } else {
                    let newValue = value;
                    const currentField = board.fields.find((field) => field._id === fieldId);

                    if (currentField?.type === 'Attachment' && Array.isArray(newValue)) {
                        const formData = new FormData();
                        (newValue as AttachmentValue[]).forEach((item) => {
                            if (item.extra?.file) {
                                formData.append('', item.extra.file);
                            }
                        });

                        if ([...formData.entries()].length > 0) {
                            const { data } = await apiFetch<{ name: string; extension: string; url: string; key: string }[]>(
                                postBoardUpload.api,
                                postBoardUpload.method,
                                formData,
                                ImbraceFileUpload,
                            );
                            newValue = (newValue as AttachmentValue[]).map((item) => {
                                const targetData = data.find((d) => d.name === item.data.name.split('.')[0]);
                                return {
                                    type: item.type,
                                    data: {
                                        name: item.data.name,
                                        url: targetData?.url || item.data.url,
                                        key: targetData?.key || item.data.key,
                                        extension: targetData?.extension || item.data.extension,
                                    },
                                };
                            });
                        } else {
                            newValue = (newValue as AttachmentValue[]).map((item) => {
                                return {
                                    type: item.type,
                                    data: {
                                        name: item.data?.name,
                                        url: item.data?.url,
                                        key: item.data?.key,
                                        extension: item.data?.extension,
                                    },
                                };
                            });
                        }
                    }
                    if (currentField?.type === 'Attachment' && !Array.isArray(newValue)) {
                        newValue = [];
                    }
                    if (currentField?.type === 'Notes' && !Array.isArray(newValue)) {
                        newValue = [];
                    }

                    try {
                        const result = await updateRecord.mutateAsync({
                            boardId: board?._id || (board as any)?.id,
                            recordId,
                            data: [
                                {
                                    key: fieldId,
                                    value: newValue,
                                },
                            ],
                        });
                        return result;
                    } catch (error) {
                        console.log(error);
                    }
                }
            }
        },
        [board, updateRecord],
    );
    const onMultipleFieldsUpdate = useCallback(
        async (recordId: string, fieldsData: Record<string, RecordValue>) => {
            const boardId = board?._id || (board as any)?.id;
            if (boardId) {
                if (recordId === 'new') {
                    const updateData = await Promise.all(
                        board.fields.map(async (field) => {
                            const fieldId = field._id || (field as any).id;
                            try {
                                let newValue = fieldsData[fieldId];
                                if (field.type === 'Attachment' && Array.isArray(newValue)) {
                                    const formData = new FormData();
                                    (newValue as AttachmentValue[]).forEach((item) => {
                                        if (item.extra?.file) {
                                            formData.append('', item.extra.file);
                                        }
                                    });

                                    if ([...formData.entries()].length > 0) {
                                        const { data } = await apiFetch<{ name: string; extension: string; url: string; key: string }[]>(
                                            postBoardUpload.api,
                                            postBoardUpload.method,
                                            formData,
                                            ImbraceFileUpload,
                                        );
                                        newValue = (newValue as AttachmentValue[]).map((item) => {
                                            const targetData = data.find((d) => d.name === item.data.name.split('.')[0]);
                                            return {
                                                type: item.type,
                                                data: {
                                                    name: item.data.name,
                                                    url: targetData?.url || item.data.url,
                                                    key: targetData?.key || item.data.key,
                                                    extension: targetData?.extension || item.data.extension,
                                                },
                                            };
                                        });
                                    } else {
                                        newValue = (newValue as AttachmentValue[]).map((item) => {
                                            return {
                                                type: item.type,
                                                data: {
                                                    name: item.data?.name,
                                                    url: item.data?.url,
                                                    key: item.data?.key,
                                                    extension: item.data?.extension,
                                                },
                                            };
                                        });
                                    }
                                }
                                if (field.type === 'Attachment' && !Array.isArray(newValue)) {
                                    newValue = [];
                                }
                                if (field.type === 'Country' && typeof newValue === 'object') {
                                    newValue = (newValue as API.CountryValue).country_code;
                                }
                                if (field.type === 'Assignee' && typeof newValue === 'object') {
                                    newValue = (newValue as API.AssigneeValue)._id;
                                }
                                if (field.type === 'Notes' && !Array.isArray(newValue)) {
                                    newValue = [];
                                }
                                if (field.type === 'MultipleAssignee' && Array.isArray(newValue)) {
                                    newValue = (newValue as Array<API.AssigneeValue | string>).map((item) =>
                                        typeof item === 'object' && '_id' in item ? item._id : item,
                                    );
                                }
                                return {
                                    board_field_id: fieldId,
                                    value: newValue ?? null,
                                };
                            } catch (error) {
                                console.error('update field error: ', error);
                                return {
                                    board_field_id: fieldId,
                                    value: fieldsData[fieldId] ?? null,
                                };
                            }
                        }),
                    );
                    const data = await createRecord.mutateAsync({
                        boardId: boardId,
                        fields: updateData,
                    });
                    return data;
                } else {
                    const updateData = await Promise.all(
                        board.fields.map(async (field) => {
                            const fieldId = field._id || (field as any).id;
                            try {
                                let newValue = fieldsData[fieldId];
                                if (field.type === 'Attachment' && Array.isArray(newValue)) {
                                    const formData = new FormData();
                                    (newValue as AttachmentValue[]).forEach((item) => {
                                        if (item.extra?.file) {
                                            formData.append('', item.extra.file);
                                        }
                                    });

                                    if ([...formData.entries()].length > 0) {
                                        const { data } = await apiFetch<
                                            {
                                                name: string;
                                                extension: string;
                                                url: string;
                                                key: string;
                                                uploader?: string;
                                                user_id?: string;
                                                sizeInBytes?: number;
                                                uploadDate?: string;
                                            }[]
                                        >(postBoardUpload.api, postBoardUpload.method, formData, ImbraceFileUpload);
                                        newValue = (newValue as AttachmentValue[]).map((item) => {
                                            const itemName = item.data.name;
                                            const nameWithoutExtension = itemName.substring(0, itemName.lastIndexOf('.'));
                                            const targetData = data.find((d) => d.name === nameWithoutExtension);
                                            return {
                                                type: item.type,
                                                data: {
                                                    name: item.data.name,
                                                    url: targetData?.url || item.data.url,
                                                    key: targetData?.key || item.data.key,
                                                    extension: targetData?.extension || item.data.extension,
                                                    uploader: targetData?.uploader || undefined,
                                                    user_id: targetData?.user_id || undefined,
                                                    sizeInBytes: targetData?.sizeInBytes || undefined,
                                                    uploadDate: targetData?.uploadDate || undefined,
                                                },
                                            };
                                        });
                                    } else {
                                        newValue = (newValue as AttachmentValue[]).map((item) => {
                                            return {
                                                type: item.type,
                                                data: {
                                                    name: item.data?.name,
                                                    url: item.data?.url,
                                                    key: item.data?.key,
                                                    extension: item.data?.extension,
                                                },
                                            };
                                        });
                                    }
                                }
                                if (field.type === 'Country' && typeof newValue === 'object') {
                                    newValue = (newValue as API.CountryValue).country_code;
                                }
                                if (field.type === 'Assignee' && typeof newValue === 'object') {
                                    newValue = (newValue as API.AssigneeValue)._id;
                                }
                                if (field.type === 'MultipleAssignee' && Array.isArray(newValue)) {
                                    newValue = (newValue as Array<API.AssigneeValue | string>).map(item => 
                                        typeof item === 'object' && '_id' in item ? item._id : item
                                    );
                                }
                                return {
                                    key: fieldId,
                                    value: newValue ?? null,
                                };
                            } catch (error) {
                                console.error('update field error: ', error);
                                return {
                                    key: fieldId,
                                    value: fieldsData[fieldId] ?? null,
                                };
                            }
                        }),
                    );

                    try {
                        const result = await updateRecord.mutateAsync({
                            boardId: board?._id || (board as any)?.id,
                            recordId,
                            data: updateData,
                        });
                        return result;
                    } catch (error) {
                        notify({
                            message: 'Some records are not updated. Please check and try again.',
                            type: 'error',
                        });
                        console.log(error);
                    }
                }
            }
        },
        [board, updateRecord, createRecord],
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

    const onSelectFile = useCallback(
        async (files?: Attachment[]) => {
            const selectedAvatar = files?.filter((attachment) => attachment.status === 'ok')[0];
            if (selectedAvatar) {
                if (selectedAvatar.file) {
                    try {
                        const formData = new FormData();
                        formData.append('file', selectedAvatar.file);
                        // setLoading(true);
                        if (board?.type === 'Contacts' && record?.contacts?.id) {
                            const { data } = await apiFetch<API.FileUpload>(postContactAvatar.api, postContactAvatar.method, formData);
                            if (data) {
                                await apiFetch(putContactByIdV2.api(record.contacts.id), putContactByIdV2.method, {
                                    avatar_url: data.url,
                                });
                                refresh();
                            }
                        }
                        if (board?.type === 'Companies' && record) {
                            const { data } = await apiFetch<API.FileUpload>(postBoardFile.api, postBoardFile.method, formData);
                            await apiFetch<API.BoardItem>(putBoardRecord.api(board._id || (board as any)?.id, record._id), putBoardRecord.method, {
                                data: [],
                                logo_url: data.url || '',
                            });
                            refresh();
                        }
                    } catch (error) {
                        const err = error as AxiosError;
                        console.error('contact avatar error: ', error);
                        dispatchErrorToast(err);
                    }
                }
            } else if (files && files.length === 0) {
                try {
                    if (board?.type === 'Contacts' && record?.contacts?.id && !!record?.contacts?.avatar_url) {
                        await apiFetch(putContactByIdV2.api(record.contacts.id), putContactByIdV2.method, {
                            avatar_url: null,
                        });
                        refresh();
                    }

                    if (board?.type === 'Companies' && !!record?.logo_url) {
                        await apiFetch<API.BoardItem>(putBoardRecord.api(board._id || (board as any)?.id, record._id), putBoardRecord.method, {
                            data: [],
                            logo_url: '',
                        });
                        refresh();
                    }
                } catch (error) {
                    console.error('update contact avatar error: ', error);
                }
            }
        },
        [board, record, dispatchErrorToast, refresh],
    );

    return {
        onSelectFile,
        onDataUpdate,
        onMultipleFieldsUpdate,
    };
};

export default useRecordDetailHelper;
