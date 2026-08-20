// @ts-nocheck
import type { Attachment } from '@imbrace/ui';
import { FieldSelect, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import type { DialogProps } from '@mui/material';
import { Box, CircularProgress, Divider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClientProvider } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ElementType, MouseEvent, RefObject } from 'react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/App';
import DialogModal from '@/components/DialogModal';
import type { AttachmentValue, ColumnValue, FlexibleTableRef } from '@/components/FlexibleTable/types';
import DetailModalContent from '@/pages/Databoards/components/BoardDetailedModal/DetailModalContent';
import { SHARE_DOMAIN } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalFields';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import { notificationPayload as toastNotification } from '@/utils/notificationPayload';
import store from '@/redux/store';
import { postContactAvatar, putContactByIdV2 } from '@/services/api/contact';
import {
    deleteBoardRecord,
    getBoardById,
    getBoardRecord,
    isContactRecordConflicted,
    postBoardField,
    postBoardFile,
    postBoardRecord,
    postBoardUpload,
    putBoardRecord,
} from '@/services/api/crm';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { convertDateToMMDDYYYY } from '@/utils/DateTimeUtils';

import type { FieldType } from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import OperationFieldForm, { FieldSchema } from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';

interface DetailModalProps {
    open: boolean;
    onClose?: (reason?: string) => void;
    selectedRowInfo: CurrentBoardInfo;
    setSelectedRowInfo: React.Dispatch<React.SetStateAction<CurrentBoardInfo>>;
    refresh?: (refetchBoard?: boolean) => Promise<void>;
    currentBoard?: API.Board;
    titleValue?: ColumnValue;
    closeAfterSave?: boolean;
    contactRecordLink?: string;
    opportunityRecordLink?: string;
    refreshLinkedContent?: () => Promise<void>;
    slots?: { backdrop?: ElementType; root?: ElementType };
    tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
    crm?: boolean;
}

export interface Field extends API.BoardField {
    data: Record<string, string>[];
    hidden: boolean;
    is_default: boolean;
    is_identifier?: boolean;
    name: string;
    type: API.FieldType;
    _id: string;
    default_field_name: string;
    value:
        | string
        | null
        | number
        | boolean
        | Date
        | (string | number)[]
        | Record<string, string>
        | API.AssigneeValue
        | API.PhoneValue
        | API.CountryValue;
    is_unique_identifier: boolean;
    currentBoard?: API.Board;
    contact_field?: string;
}

export interface InvalidErrorResObject {
    board_field_id: string;
    default_field_name: string;
    message: string;
}

export interface MismatchErrorResObject {
    board_item: {
        board: API.Board;
        board_id: string;
        id: string;
        fields: Record<string, unknown>;
        board_item_name: string;
        related_board_item: {
            board: API.Board;
            board_id: string;
            _id: string;
        };
        related_board_item_id: string;
    };
}

export const checkErrorResponseType = (errorRes: InvalidErrorResObject[] | MismatchErrorResObject[]): 'invalidUrl' | 'conflict' => {
    const containsDefaultFieldName = errorRes.some((obj) => 'default_field_name' in obj);
    if (containsDefaultFieldName) {
        return 'invalidUrl';
    }
    return 'conflict';
};

const DetailModal = (props: DetailModalProps) => {
    const {
        open,
        onClose,
        selectedRowInfo,
        refresh,
        setSelectedRowInfo,
        currentBoard,
        titleValue,
        closeAfterSave,
        contactRecordLink,
        opportunityRecordLink,
        refreshLinkedContent,
        slots,
        tableRef,
        crm,
    } = props;
    const { t } = useTranslation();
    const mismatchRef = useRef<{ type: string; path: string }>();
    const conflictCheckRef = useRef<boolean>(true);

    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [boardRecord, setBoardRecord] = useState<API.BoardItem | undefined>();
    const [isEditMode, setIsEditMode] = useState<boolean>(false);
    const [selectedProfileAvatar, setSelectedProfileAvatar] = useState<Attachment[]>();
    const [selectedCompanyLogo, setSelectedCompanyLogo] = useState<Attachment[]>();
    const [fields, setFields] = useState<Field[]>([]);
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const methods = useForm<Record<string, string>>({
        mode: 'all',
        defaultValues: {},
    });
    const {
        handleSubmit,
        reset,
        watch,
        setValue,
        getValues,
        setError,
        formState: { isDirty, errors, dirtyFields },
    } = methods;

    const isIdentified = !!(watch('phone') || watch('email'));
    const isContactRecordDirty = dirtyFields?.contact_record;

    const onPostBoardRecord = useCallback(
        async (data: API.BoardField[], logoUrl?: string) => {
            if (!selectedRowInfo) return;
            const { boardId } = selectedRowInfo;

            return apiFetch<API.BoardItem>(postBoardRecord.api(boardId), postBoardRecord.method, {
                fields: data,
                logo_url: logoUrl,
            });
        },
        [selectedRowInfo],
    );

    const onFetchBoardItem = useCallback(async () => {
        // if (!selectedRowInfo) return;

        const { boardId, boardItemId, editMode } = selectedRowInfo;
        if (boardItemId === 'new') return;

        try {
            setLoading(true);
            const { data } = await apiFetch<API.BoardItem>(getBoardRecord.api(boardId, boardItemId), getBoardRecord.method);
            if (data) {
                setBoardRecord(data);
                setLoading(false);

                // open existing record in edit mode
                if (editMode) {
                    setIsEditMode(true);
                }
            }
            setInitialLoading(false);
        } catch (err) {
            const error = err as AxiosError;
            console.error('fetch board item error: ', err);
            setLoading(false);
            setInitialLoading(false);
            if (error?.response?.status === 404) {
                onClose?.();
            }
        }
    }, [selectedRowInfo, onClose]);

    const onUpdateBoardFields = useCallback(
        async (data: Record<string, string>[], logoUrl?: string) => {
            if (!selectedRowInfo) return;
            let newData = data;
            const { boardId, boardItemId } = selectedRowInfo;
            const attachmentFields = currentBoard?.fields.filter((f) => f.type === 'Attachment') || [];
            if (attachmentFields.length > 0) {
                newData = (
                    await Promise.all(
                        newData.map(async (v) => {
                            let newValue = v.value as AttachmentValue[];
                            if (attachmentFields.findIndex((f) => f._id === v._id) !== -1) {
                                const formData = new FormData();
                                (newValue as AttachmentValue[]).forEach((item) => {
                                    if (item.extra?.file) {
                                        formData.append('', item.extra.file);
                                    }
                                });

                                if ([...formData.entries()].length > 0) {
                                    const { data: uploadData } = await apiFetch<
                                        { name: string; extension: string; url: string; key: string }[]
                                    >(postBoardUpload.api, postBoardUpload.method, formData, ImbraceFileUpload);
                                    newValue = (newValue as AttachmentValue[]).map((item) => {
                                        const targetData = uploadData.find((d) => d.name === item.data.name.split('.')[0]);
                                        return {
                                            type: item.type,
                                            data: {
                                                name: item.data.name,
                                                url: targetData?.url || item.data.url,
                                                key: targetData?.key || item.data.key,
                                                extension: targetData?.extension || item.data?.extension,
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
                                return {
                                    key: v.key,
                                    value: newValue as API.AttachmentValue[],
                                };
                            }
                            return v;
                        }),
                    )
                ).flat();
                const { data: record } = await apiFetch<API.BoardItem>(putBoardRecord.api(boardId, boardItemId), putBoardRecord.method, {
                    ...(typeof logoUrl !== 'undefined' ? { logo_url: logoUrl } : { logo_url: '' }),
                    data: newData,
                });
                return record;
            } else {
                const { data: record } = await apiFetch<API.BoardItem>(putBoardRecord.api(boardId, boardItemId), putBoardRecord.method, {
                    ...(typeof logoUrl !== 'undefined' ? { logo_url: logoUrl } : { logo_url: '' }),
                    data,
                });
                return record;
            }
        },
        [selectedRowInfo, currentBoard],
    );

    const onRecordDelete = useCallback(async () => {
        if (!selectedRowInfo) return false;
        const { boardId, boardItemId } = selectedRowInfo;
        if (boardId) {
            const deleteRequest = async () => {
                try {
                    await apiFetch(deleteBoardRecord.api(boardId, boardItemId), deleteBoardRecord.method);
                    tableRef?.current?.cacheMutation({
                        operation: 'Delete',
                        rowId: boardItemId,
                    });

                    onClose?.();
                    return true;
                } catch (err) {
                    const error = err as AxiosError;
                    console.error(error);
                    const message = error?.response?.data?.message;

                    const notificationPayload = {
                        message,
                        messageType: 'noti_failed',
                    };
                    import('@/redux/slices/notification').then(({ pushNotification }) => {
                        store.dispatch(pushNotification({ notification: notificationPayload }));
                    });
                    return false;
                }
            };
            dialog({
                title: t('crm_delete_record'),
                content: t('crm_delete_record_description'),
                confirmText: t('delete'),
                cancelText: t('cancel'),
                actionsAlign: 'flex-end',
                confirmButtonProps: {
                    type: 'danger',
                },
                onClose: () => {},
                onConfirm: async () => {
                    await deleteRequest();
                },
            });
        }
        return false;
    }, [t, selectedRowInfo, onClose, tableRef, dialog]);

    const restructureFormData = useCallback(
        async (formData: API.BoardItemField, logoUrl?: string) => {
            const fieldsWithValue: API.BoardItemField[] = [];
            if (boardRecord) {
                fields.forEach((fieldItem: Field) => {
                    const value = formData[(fieldItem.default_field_name as string) || fieldItem._id];

                    fieldsWithValue.push({
                        key: fieldItem._id,
                        value: value || null,
                    });
                });
            }
            return onUpdateBoardFields(fieldsWithValue, logoUrl);
        },
        [fields, boardRecord, onUpdateBoardFields],
    );

    const onSelectFile = async (files?: Attachment[] | undefined) => {
        if (selectedRowInfo?.boardType === 'Contacts') {
            setSelectedProfileAvatar(files);
            return;
        }
        setSelectedCompanyLogo(files);
    };

    useEffect(() => {
        // fetch exiting board item data
        if (open && selectedRowInfo && selectedRowInfo.boardItemId !== 'new') {
            onFetchBoardItem();
        }
        // new record
        if (selectedRowInfo && selectedRowInfo.boardItemId === 'new') {
            setIsEditMode(true);
        }
    }, [open, selectedRowInfo, onFetchBoardItem]);

    useEffect(() => {
        // reset data
        // if (!selectedRowInfo) return;
        const storedOrder = localStorage.getItem(`${selectedRowInfo.boardId}-Order`);
        let givenArray: string[];

        if (selectedRowInfo.boardItemId === 'new' && currentBoard) {
            if (!storedOrder) {
                // storedOrder not found
                givenArray = currentBoard.fields.map((f) => f._id);
            } else {
                givenArray = JSON.parse(storedOrder).slice(1);
                // identify any _id values not in givenArray
                const missingIds = currentBoard.fields.filter((f) => !givenArray.includes(f._id)).map((f) => f._id);
                // append missing _id values to givenArray
                givenArray = givenArray.concat(missingIds);
            }

            const boardFields = givenArray
                .map((id) => {
                    const field = currentBoard.fields.find((f) => f._id === id);
                    if (!field) return false;

                    return {
                        contact_field: field?.contact_field ? field.contact_field : null,
                        data: field?.data ? field?.data : [],
                        default_field_name: field?.default_field_name ? field.default_field_name : '',
                        hidden: field.hidden,
                        hidden_on_record: field.hidden_on_record,
                        is_default: field.is_default,
                        is_identifier: field?.is_identifier ? field.is_identifier : false,
                        name: field.name,
                        type: field.type,
                        _id: field._id,
                        settings: field.settings,
                        value: '',
                    };
                })
                .filter((item) => item !== false);
            setFields(boardFields as Field[]);
        }

        // Existing record
        if (selectedRowInfo.boardItemId !== 'new' && boardRecord) {
            if (!storedOrder) {
                givenArray = boardRecord.board.fields.map((f) => f._id);
            } else {
                givenArray = JSON.parse(storedOrder).slice(1);
                const missingIds = boardRecord.board.fields.filter((f) => !givenArray.includes(f._id)).map((f) => f._id);
                givenArray = givenArray.concat(missingIds);
            }

            const boardFields = givenArray
                .map((id: string) => {
                    const field = boardRecord.board.fields.find((f) => f._id === id);
                    if (!field) return false;

                    const value = boardRecord.fields[field._id] ?? null;

                    return {
                        contact_field: field.contact_field ? field.contact_field : null,
                        data: field.data ? field.data : [],
                        default_field_name: field.default_field_name ? field.default_field_name : '',
                        hidden: field.hidden,
                        hidden_on_record: field.hidden_on_record,
                        is_default: field.is_default,
                        is_identifier: field.is_identifier ? field.is_identifier : false,
                        name: field.name,
                        type: field.type,
                        _id: field._id,
                        settings: field.settings,
                        value,
                    };
                })
                .filter((item) => item !== false);
            setFields(boardFields as Field[]);
        }
    }, [selectedRowInfo, currentBoard, boardRecord]);

    useEffect(() => {
        if (fields && selectedRowInfo && selectedRowInfo.boardItemId === 'new') {
            const peopleFieldsObj = fields.reduce((acc, field) => {
                if (field.is_identifier && titleValue) {
                    const key = field.default_field_name ? field.default_field_name : field._id;
                    acc[key] = titleValue as any;
                    return acc;
                }
                if (field.type === 'MultipleSelection' && !field.value) {
                    const key = field.default_field_name ? field.default_field_name : field._id;
                    acc[key] = [];
                    return acc;
                }
                if (field.default_field_name) {
                    if (contactRecordLink && field.default_field_name === 'contact_record') {
                        acc[field.default_field_name] = contactRecordLink;
                        return acc;
                    }
                    if (opportunityRecordLink && field.default_field_name === 'opportunity_record') {
                        acc[field.default_field_name] = opportunityRecordLink;
                        return acc;
                    }

                    acc[field.default_field_name] = '';
                    return acc;
                }

                acc[field._id] = '';
                return acc;
            }, {} as API.BoardItemField);
            reset({
                ...peopleFieldsObj,
                birthday: '',
                logo_url: '',
            });
            setInitialLoading(false);
            return;
        }

        if (fields && boardRecord && selectedRowInfo && selectedRowInfo.boardItemId !== 'new') {
            const peopleFieldsObj = fields.reduce((acc, field) => {
                if (field.type === 'Assignee') {
                    const val = field.value === null ? null : typeof field.value === 'object' ? (field.value as any)._id : field.value;
                    if (field.default_field_name) {
                        acc[field.default_field_name] = val;
                        return acc;
                    }
                    acc[field._id] = val;
                    return acc;
                }
                if (field.type === 'Country') {
                    const val =
                        field.value === null ? null : typeof field.value === 'object' ? (field.value as any).country_code : field.value;
                    if (field.default_field_name) {
                        acc[field.default_field_name] = val;
                        return acc;
                    }
                    acc[field._id] = val;
                    return acc;
                }

                if (field.default_field_name) {
                    acc[field.default_field_name] = field.value || '';
                    return acc;
                }
                acc[field._id] = field.value || '';
                return acc;
            }, {} as API.BoardItemField);
            if (boardRecord?.contacts?.avatar_url) {
                setSelectedProfileAvatar([
                    {
                        id: '1',
                        url: boardRecord.contacts?.avatar_url,
                        status: 'ok',
                    },
                ]);
            }
            if (boardRecord.logo_url) {
                setSelectedCompanyLogo([
                    {
                        id: '1',
                        url: boardRecord.logo_url,
                        status: 'ok',
                    },
                ]);
            }

            reset({
                ...peopleFieldsObj,
                title: boardRecord.contacts?.title ? boardRecord.contacts.title : '',
                birthday: boardRecord.contacts?.birthday ? (convertDateToMMDDYYYY(boardRecord.contacts.birthday) as string) : '',
                channel_type: boardRecord.contacts?.channel_type ? boardRecord.contacts.channel_type : '',
                record_updated_at: boardRecord.updated_at ? boardRecord.updated_at : '',
                record_created_at: boardRecord.created_at ? boardRecord.created_at : '',
                ...(boardRecord.contacts?.is_presence ? { is_presence: boardRecord.contacts.is_presence } : {}),
            });
            return;
        }
    }, [titleValue, fields, selectedRowInfo, reset, boardRecord, contactRecordLink, opportunityRecordLink]);

    useEffect(() => {
        if (currentBoard && currentBoard.type === 'Contacts' && isEditMode) {
            const stageField = currentBoard?.fields.find((field) => field.default_field_name === 'stage');
            if (stageField) {
                if (!getValues('stage')) {
                    setValue('stage', 'Unidentified Lead');
                    return;
                }
                // phone or email has value
                if (isIdentified && getValues('stage') === 'Unidentified Lead') {
                    setValue('stage', 'Identified Lead');
                }

                // change back to unidentified lead when phone or email is empty
                if (!isIdentified && getValues('stage') !== 'Unidentified Lead') {
                    setValue('stage', 'Unidentified Lead');
                }
            }
        }
    }, [currentBoard, isEditMode, getValues, isIdentified, setValue, watch]);

    const closeModalAndResetState = (reason?: string) => {
        onClose?.(reason);
    };

    const onModalClose: DialogProps['onClose'] = (event: MouseEvent<HTMLDivElement, MouseEvent>, reason) => {
        event.stopPropagation();
        if (isEditMode && isDirty) {
            dialog({
                title: t('crm_unsave_prompt_title'),
                content: t('crm_unsave_prompt_content'),
                actionsAlign: 'flex-end',
                confirmText: t('crm_unsave_prompt_confirm_text'),
                cancelText: t('crm_unsave_prompt_cancel_text'),
                onConfirm: async () => {
                    await handleSubmit(onSubmit)();
                    closeModalAndResetState(reason);
                },
                onClose: () => {
                    closeModalAndResetState(reason);
                },
            });
            return;
        }
        closeModalAndResetState(reason);
    };

    const dispatchErrorToast = useCallback((error: AxiosError) => {
        const message = error?.response?.data?.message;
        const notificationPayload = {
            message,
            messageType: 'noti_failed',
            variant: 'error',
        };

        import('@/redux/slices/notification').then(({ pushNotification }) => {
            store.dispatch(pushNotification({ notification: notificationPayload }));
        });
    }, []);

    const handleCompanyLogo = useCallback(async (): Promise<{ isSuccess: boolean; path: string | undefined }> => {
        // File
        if (selectedCompanyLogo) {
            const files = selectedCompanyLogo.filter((attachment) => attachment.status === 'ok');
            if (files[0]?.file) {
                try {
                    const logoFormData = new FormData();
                    logoFormData.append('file', files[0].file);
                    setLoading(true);
                    const { data } = await apiFetch<API.FileUpload>(postBoardFile.api, postBoardFile.method, logoFormData);
                    if (data) {
                        return {
                            isSuccess: true,
                            path: data.url,
                        };
                    }
                } catch (error) {
                    const err = error as AxiosError;
                    console.error('contact avatar error: ', error);
                    dispatchErrorToast(err);
                    setLoading(false);
                    return {
                        isSuccess: false,
                        path: undefined,
                    };
                }
            }
        }
        // Undefined (user removed)
        if (selectedCompanyLogo === undefined) {
            return {
                isSuccess: true,
                path: undefined,
            };
        }
        return {
            isSuccess: true,
            path: selectedCompanyLogo?.[0]?.url,
        };
    }, [dispatchErrorToast, selectedCompanyLogo]);

    const handleContactAvatar = useCallback(
        async (
            contactId?: string,
        ): Promise<{
            isSuccess: boolean;
            path: string | undefined;
        }> => {
            if (!boardRecord?.contacts) return { isSuccess: false, path: undefined };
            if (selectedProfileAvatar) {
                const files = selectedProfileAvatar.filter((attachment) => attachment.status === 'ok');
                if (files?.[0]?.file) {
                    try {
                        const avatarFormData = new FormData();
                        avatarFormData.append('file', files[0].file);
                        setLoading(true);
                        const { data } = await apiFetch<API.FileUpload>(postContactAvatar.api, postContactAvatar.method, avatarFormData);
                        if (data) {
                            setSelectedProfileAvatar((prev) => [
                                {
                                    ...(prev?.[0] || {}),
                                    id: '1',
                                    url: data.url,
                                    status: 'ok',
                                },
                            ]);

                            const conId = contactId ? contactId : boardRecord.contacts._id;
                            await apiFetch(putContactByIdV2.api(conId), putContactByIdV2.method, {
                                avatar_url: data.url,
                            });
                            return {
                                isSuccess: true,
                                path: data.url,
                            };
                        }
                    } catch (error) {
                        const err = error as AxiosError;
                        console.error('contact avatar error: ', error);
                        dispatchErrorToast(err);
                        setLoading(false);
                        return {
                            isSuccess: false,
                            path: undefined,
                        };
                    }
                } else if (files.length === 0) {
                    try {
                        await apiFetch(putContactByIdV2.api(boardRecord.contacts._id), putContactByIdV2.method, {
                            avatar_url: null,
                        });
                        return {
                            isSuccess: true,
                            path: undefined,
                        };
                    } catch (error) {
                        console.error('update contact avatar error: ', error);
                        return {
                            isSuccess: false,
                            path: undefined,
                        };
                    }
                }
            }
            // avatar reset by user
            if (selectedProfileAvatar === undefined) {
                try {
                    await apiFetch(putContactByIdV2.api(boardRecord.contacts._id), putContactByIdV2.method, {
                        avatar_url: null,
                    });
                    return {
                        isSuccess: true,
                        path: undefined,
                    };
                } catch (error) {
                    console.error('update contact avatar error: ', error);
                    return {
                        isSuccess: false,
                        path: undefined,
                    };
                }
            }
            return {
                isSuccess: true,
                path: undefined,
            };
        },
        [boardRecord, dispatchErrorToast, selectedProfileAvatar],
    );

    const onPusNotification = useCallback(
        (fieldName: string) => {
            import('@/redux/slices/notification').then(({ pushNotification }) => {
                store.dispatch(
                    pushNotification({
                        notification: toastNotification(t('board_update_toast', { field: fieldName }), 'success'),
                    }),
                );
            });
        },
        [t],
    );

    const afterUpdated = useCallback(
        async (record: API.BoardItem) => {
            await onFetchBoardItem();
            tableRef?.current?.cacheMutation({
                operation: 'Update',
                record,
            });
            refresh?.();
        },
        [onFetchBoardItem, tableRef, refresh],
    );

    const onUpdate = useCallback(
        async (formData: API.BoardItemField) => {
            // Contact Avatar & Company Logo
            let contactAvatarResult;
            if (selectedRowInfo.boardType === 'Contacts') {
                contactAvatarResult = await handleContactAvatar();
            }
            let companyLogoResult;
            if (selectedRowInfo.boardType === 'Companies') {
                companyLogoResult = await handleCompanyLogo();
            }

            if ((contactAvatarResult && !contactAvatarResult?.isSuccess) || (companyLogoResult && !companyLogoResult.isSuccess)) {
                setLoading(false);
                return;
            }

            try {
                const res = await restructureFormData(formData, companyLogoResult?.path);
                if (res) {
                    setIsEditMode(false);
                    await onFetchBoardItem();
                    tableRef?.current?.cacheMutation({
                        operation: 'Update',
                        record: { ...res, ...res.fields } as unknown as API.BoardItem,
                    });
                }
            } catch (error) {
                const err = error as AxiosError;
                console.error('error:: ', err);
                if (err.response?.status === 400) {
                    if (Array.isArray(err.response.data.data)) {
                        // Error - Invalid URL
                        const errorType = checkErrorResponseType(err.response.data.data);
                        if (errorType === 'invalidUrl') {
                            const errorRes = err.response.data.data as InvalidErrorResObject[];
                            errorRes.forEach((obj) => {
                                if (obj.message === 'no-association') {
                                    setError(obj.default_field_name, { message: t('board_no_record_associated') });
                                }
                                if (obj.message === 'invalid-record') {
                                    setError(obj.default_field_name, { message: t('board_wrong_type') });
                                }
                            });
                        }
                        // Error - Conflict (Contact / Opportunity) Dilog
                        if (errorType === 'conflict') {
                            dialog({
                                title: t('board_mismatch_record_header'),
                                content: (
                                    <div>
                                        <Typography variant="Body" style={{ color: 'var(--color-light-5)', marginBottom: '16px' }}>
                                            {t('board_mismatch_record_content')}
                                        </Typography>

                                        <FieldSelect
                                            queryKey={['detailModal', 'conflict', err?.response?.data.data]}
                                            fullWidth
                                            placeholder={t('click_to_select')}
                                            request={async () =>
                                                (err?.response?.data.data as MismatchErrorResObject[]).map((item, index) => {
                                                    return {
                                                        icon: <Icon name="record" fontSize={24} color="var(--color-light-5)" />,
                                                        iconAlignment: 'flex-start',
                                                        text: item.board_item.board_item_name,
                                                        value: index,
                                                        description: item.board_item.board.type,
                                                        onClick: () => {
                                                            if (item.board_item.board.type === 'Opportunities') {
                                                                // opportunity has contact
                                                                if ('related_board_item' in item.board_item) {
                                                                    const domain = SHARE_DOMAIN;
                                                                    const url = `${domain}/${crm ? 'crm' : 'databoards'}/${
                                                                        item.board_item.related_board_item.board_id
                                                                    }/${item.board_item.related_board_item._id}`;
                                                                    mismatchRef.current = {
                                                                        type: 'Opportunities',
                                                                        // get opportunity's contact path
                                                                        path: url,
                                                                    };
                                                                    return;
                                                                }
                                                                // opportunity has no contact
                                                                mismatchRef.current = {
                                                                    type: 'Opportunities',
                                                                    path: '',
                                                                };
                                                                return;
                                                            }

                                                            // if contacts, set path to empty
                                                            if (item.board_item.board.type === 'Contacts') {
                                                                mismatchRef.current = {
                                                                    type: 'Contacts',
                                                                    path: `${item.board_item.board._id}/${item.board_item.id}`,
                                                                };
                                                            }
                                                        },
                                                    };
                                                })
                                            }
                                            onChange={() => {}}
                                        />
                                    </div>
                                ),
                                confirmText: t('confirm'),
                                cancelText: t('cancel'),
                                onConfirm: async () => {
                                    let fieldName: string;
                                    if (mismatchRef.current?.type === 'Opportunities') {
                                        fieldName = 'Contact Record URL';
                                        if (!mismatchRef.current?.path) {
                                            setValue('contact_record', '');
                                            onPusNotification(fieldName);
                                            return;
                                        }
                                        setValue('contact_record', mismatchRef.current.path);
                                        onPusNotification(fieldName);
                                        return;
                                    }
                                    if (mismatchRef.current?.type === 'Contacts') {
                                        setValue('opportunity_record', '');
                                        fieldName = 'Opportunity Record URL';
                                        onPusNotification(fieldName);
                                    }
                                },
                                onClose: () => {},
                                showCloseButton: true,
                                actionsAlign: 'flex-end',
                            });
                        }
                    }
                    setIsEditMode(true);
                    setLoading(false);
                }
            }
        },
        [
            handleCompanyLogo,
            handleContactAvatar,
            onFetchBoardItem,
            restructureFormData,
            setError,
            setValue,
            t,
            selectedRowInfo,
            onPusNotification,
            tableRef,
            dialog,
            crm,
        ],
    );

    const onSubmit = useCallback(
        async (formData: API.BoardItemField) => {
            // if (!selectedRowInfo) return;
            const { boardItemId } = selectedRowInfo;

            // Creating New Record
            if (boardItemId === 'new') {
                const submitForm = currentBoard?.fields.map((field) => {
                    if (field.default_field_name) {
                        const id = field._id;

                        const value = formData[field.default_field_name as keyof typeof formData] || null;
                        return {
                            board_field_id: id,
                            value,
                        };
                    }
                    const id = field._id;
                    const value = formData[field._id as keyof typeof formData] || null;

                    return {
                        board_field_id: id,
                        value,
                    };
                });
                if (!submitForm) return;

                let companyLogoResult;
                if (selectedRowInfo.boardType === 'Companies') {
                    companyLogoResult = await handleCompanyLogo();
                }

                // upload contact avatar
                let updatedAvatarUrl;
                let contactAvatarResult;
                if (selectedRowInfo.boardType === 'Contacts') {
                    contactAvatarResult = await handleContactAvatar();
                }

                if ((contactAvatarResult && !contactAvatarResult?.isSuccess) || (companyLogoResult && !companyLogoResult.isSuccess)) {
                    setLoading(false);
                    return;
                }

                setLoading(true);
                try {
                    const res = await onPostBoardRecord(submitForm, companyLogoResult?.path);
                    if (res && res?.status === 200) {
                        const newRowInfo = {
                            ...selectedRowInfo,
                            boardItemId: res.data?.id,
                            editMode: false,
                        };
                        setSelectedRowInfo(newRowInfo);

                        // update contact avatar url to contact
                        if (selectedRowInfo.boardType === 'Contacts' && updatedAvatarUrl) {
                            await apiFetch(putContactByIdV2.api(res.data.contact_id), putContactByIdV2.method, {
                                avatar_url: updatedAvatarUrl,
                            });
                        }
                        await onFetchBoardItem();
                        refresh?.();

                        if (closeAfterSave) {
                            onClose?.();
                            refreshLinkedContent?.();
                        }
                        setIsEditMode(false);
                    }
                    setLoading(false);

                    return;
                } catch (error) {
                    const err = error as AxiosError;
                    if (err.response?.status === 400) {
                        if (Array.isArray(err.response.data.data)) {
                            // Error - Invalid URL
                            const errorType = checkErrorResponseType(err.response.data.data);
                            if (errorType === 'invalidUrl') {
                                const errorRes = err.response.data.data as InvalidErrorResObject[];
                                errorRes.forEach((obj) => {
                                    if (obj.message === 'no-association') {
                                        setError(obj.default_field_name, { message: t('board_no_record_associated') });
                                    }
                                    if (obj.message === 'invalid-record') {
                                        setError(obj.default_field_name, { message: t('board_wrong_type') });
                                    }
                                });
                            }
                            // Error - Conflict (Contact / Opportunity) Dilog
                            if (errorType === 'conflict') {
                                dialog({
                                    title: t('board_mismatch_record_header'),
                                    content: (
                                        <div>
                                            <Typography variant="Body" style={{ color: 'var(--color-light-5)', marginBottom: '16px' }}>
                                                {t('board_mismatch_record_content')}
                                            </Typography>

                                            <FieldSelect
                                                queryKey={['detailModal', 'conflict', err?.response?.data.data]}
                                                fullWidth
                                                placeholder={t('click_to_select')}
                                                request={async () =>
                                                    (err?.response?.data.data as MismatchErrorResObject[]).map((item, index) => {
                                                        return {
                                                            icon: <Icon name="record" fontSize={24} color="var(--color-light-5)" />,
                                                            iconAlignment: 'flex-start',
                                                            text: item.board_item.board_item_name,
                                                            value: index,
                                                            description: item.board_item.board.type,
                                                            onClick: () => {
                                                                if (item.board_item.board.type === 'Opportunities') {
                                                                    // opportunity has contact
                                                                    if ('related_board_item' in item.board_item) {
                                                                        const domain = SHARE_DOMAIN;
                                                                        const url = `${domain}/${crm ? 'crm' : 'databoards'}/${
                                                                            item.board_item.related_board_item.board_id
                                                                        }/${item.board_item.related_board_item._id}`;
                                                                        mismatchRef.current = {
                                                                            type: 'Opportunities',
                                                                            // get opportunity's contact path
                                                                            path: url,
                                                                        };
                                                                        return;
                                                                    }
                                                                    // opportunity has no contact
                                                                    mismatchRef.current = {
                                                                        type: 'Opportunities',
                                                                        path: '',
                                                                    };
                                                                    return;
                                                                }

                                                                // if contacts, set path to empty
                                                                if (item.board_item.board.type === 'Contacts') {
                                                                    mismatchRef.current = {
                                                                        type: 'Contacts',
                                                                        path: `${item.board_item.board._id}/${item.board_item.id}`,
                                                                    };
                                                                }
                                                            },
                                                        };
                                                    })
                                                }
                                                onChange={() => {}}
                                            />
                                        </div>
                                    ),
                                    confirmText: 'Confirm',
                                    cancelText: 'Cancel',
                                    onConfirm: async () => {
                                        let fieldName: string;
                                        if (mismatchRef.current?.type === 'Opportunities') {
                                            fieldName = 'Contact Record URL';
                                            if (!mismatchRef.current?.path) {
                                                setValue('contact_record', '');
                                                onPusNotification(fieldName);
                                                return;
                                            }
                                            setValue('contact_record', mismatchRef.current.path);
                                            onPusNotification(fieldName);
                                            return;
                                        }
                                        if (mismatchRef.current?.type === 'Contacts') {
                                            setValue('opportunity_record', '');
                                            fieldName = 'Opportunity Record URL';
                                            onPusNotification(fieldName);
                                        }
                                    },
                                    onClose: () => {},
                                    showCloseButton: true,
                                    actionsAlign: 'flex-end',
                                });
                            }
                        }
                    }

                    setLoading(false);
                    setIsEditMode(true);
                    return;
                }
            }
            // Update Existing Record
            if (!boardRecord) return;

            // Link Board Record: check whether contact record is conflicted before update under Opportunities board
            if (isContactRecordDirty && conflictCheckRef.current && selectedRowInfo?.boardType === 'Opportunities') {
                const {
                    data: { is_conflicted },
                } = await apiFetch<{ is_conflicted: boolean }>(
                    isContactRecordConflicted.api(selectedRowInfo.boardId, selectedRowInfo.boardItemId),
                    isContactRecordConflicted.method,
                );
                if (is_conflicted) {
                    dialog({
                        title: t('board_update_url_conflicted_header'),
                        content: t('board_update_url_conflicted_content'),
                        confirmText: t('save'),
                        cancelText: t('back_to_edit'),
                        onConfirm: async () => {
                            await handleSubmit(onUpdate)();
                            conflictCheckRef.current = true;
                        },
                        onClose: () => {
                            conflictCheckRef.current = true;
                        },
                        showCloseButton: true,
                        actionsAlign: 'flex-end',
                    });

                    return;
                }
            }

            await onUpdate(formData);
        },
        [
            t,
            currentBoard,
            boardRecord,
            selectedRowInfo,
            onPostBoardRecord,
            onFetchBoardItem,
            closeAfterSave,
            setValue,
            onPusNotification,
            setError,
            setSelectedRowInfo,
            refresh,
            handleCompanyLogo,
            handleContactAvatar,
            refreshLinkedContent,
            onClose,
            isContactRecordDirty,
            handleSubmit,
            onUpdate,
            dialog,
            crm,
        ],
    );

    const onNewField = useCallback(() => {
        if (currentBoard) {
            dialogForm<FieldType>({
                title: t('fields_management_form_header_new'),
                content: (formMethods) => (
                    <FormProvider {...formMethods}>
                        <OperationFieldForm methods={formMethods} boardType={currentBoard.type} boardName={currentBoard.name} />
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
                onConfirm: async (formData, formMethods) => {
                    try {
                        const { name, type, description, data, settings, fields: childFields, child_board_name } = formData as typeof formData & {
                            fields?: unknown;
                            child_board_name?: string;
                        };

                        await apiFetch(postBoardField.api(currentBoard._id), postBoardField.method, {
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
                        });
                        refresh?.(true);
                        return true;
                    } catch (error) {
                        console.error(error);
                        const err = error as AxiosError<{ code?: number; message?: string }>;
                        if (err.response?.status === 400 && err.response?.data?.code === 40000) {
                            formMethods?.setError('child_board_name' as any, {
                                type: 'value',
                                message: t('databoard_child_board_name_duplicate'),
                            });
                            return false;
                        }
                        if (err.response?.status === 409 && err.response?.data?.message === 'Field name already exists') {
                            formMethods?.setError('name', {
                                type: 'value',
                                message: t('fields_management_form_duplicate_name'),
                            });
                        }
                        if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                            dispatchErrorToast(err);
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
                schema: FieldSchema({ t, existFields: currentBoard.fields, checkDuplicate: true }),
            });
        }
    }, [t, refresh, currentBoard, dispatchErrorToast, dialogForm]);

    if (!selectedRowInfo || fields.length === 0)
        return (
            <Space justify="center" align="center" style={{ width: '100%', height: '100%' }}>
                <CircularProgress />
            </Space>
        );

    return (
        <DialogModal
            open={open}
            onClose={onModalClose}
            sxDialog={{
                '.MuiDialog-paper': {
                    height: '100%',
                    width: '832px',
                },
            }}
            sxContent={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
            slots={slots}
        >
            <FormProvider {...methods}>
                {dialogHolder}
                {initialLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <CircularProgress />
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box
                            sx={{
                                width: '100%',
                                padding: '16px 16px 0 0',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '12px',
                            }}
                        >
                            {isEditMode ? (
                                <IconButton
                                    size="s"
                                    type="secondary"
                                    variant="text"
                                    sx={{ fontSize: '24px' }}
                                    loading={loading}
                                    disabled={loading || Object.keys(errors).length > 0}
                                    onClick={async () => {
                                        setLoading(true);
                                        await handleSubmit(onSubmit)();
                                        setLoading(false);
                                    }}
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
                                        {!loading && (
                                            <Icon
                                                name="save"
                                                style={{
                                                    color:
                                                        Object.keys(errors).length > 0
                                                            ? 'var(--color-primary-5)'
                                                            : 'var(--color-primary-1)',
                                                }}
                                            />
                                        )}
                                    </Box>
                                </IconButton>
                            ) : (
                                <IconButton
                                    size="s"
                                    type="secondary"
                                    variant="text"
                                    sx={{ fontSize: '24px' }}
                                    onClick={() => {
                                        setIsEditMode(true);
                                    }}
                                >
                                    <Icon name="edit" />
                                </IconButton>
                            )}
                            {boardRecord?.created_type === 'manual' && (
                                <IconButton size="s" type="secondary" variant="text" sx={{ fontSize: '24px' }} onClick={onRecordDelete}>
                                    <Icon name="delete" />
                                </IconButton>
                            )}
                            <Divider
                                sx={{
                                    height: '18px',
                                    width: '1px',
                                    borderColor: 'var(--color-light-3)',
                                    alignSelf: 'center',
                                }}
                                orientation="vertical"
                                variant="middle"
                                flexItem
                            />
                            <IconButton
                                size="s"
                                type="secondary"
                                variant="text"
                                sx={{ fontSize: '24px' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onModalClose(e, 'backdropClick');
                                }}
                            >
                                <Icon name="close" />
                            </IconButton>
                        </Box>

                        <DetailModalContent
                            crm={crm}
                            onSelectFile={onSelectFile}
                            selectedCompanyLogo={selectedCompanyLogo}
                            selectedProfileAvatar={selectedProfileAvatar}
                            isEditMode={isEditMode}
                            selectedRowInfo={selectedRowInfo}
                            boardRecord={boardRecord}
                            fields={fields}
                            boardType={selectedRowInfo?.boardType}
                            loading={loading}
                            currentBoard={currentBoard}
                            onClose={onClose}
                            onNewField={onNewField}
                            afterUpdated={afterUpdated}
                        />
                    </form>
                )}
            </FormProvider>
        </DialogModal>
    );
};

const DetailModalHOC = ({
    currentBoardInfo,
    currentBoard,
    tableRef,
    onClose,
    titleValue,
    refreshBoard,
    closeAfterSave,
    contactRecordLink,
    opportunityRecordLink,
    refreshLinkedContent,
    slots,
    crm,
}: Omit<DetailModalProps, 'open' | 'setSelectedRowInfo' | 'selectedRowInfo'> & {
    currentBoardInfo: CurrentBoardInfo;
    tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
    titleValue?: ColumnValue;
    refreshBoard?: () => Promise<void>;
    closeAfterSave?: boolean;
    contactRecordLink?: string;
    opportunityRecordLink?: string;
    refreshLinkedContent?: () => Promise<void>;
    slots?: { backdrop?: ElementType; root?: ElementType };
}) => {
    const [open, setOpen] = useState(true);
    const [selectedRowInfo, setSelectedRowInfo] = useState<CurrentBoardInfo>(currentBoardInfo);
    const [board, setBoard] = useState<API.Board | undefined>(currentBoard);

    return (
        <DetailModal
            open={open}
            onClose={(reason) => {
                setOpen(false);
                onClose?.(reason);
            }}
            selectedRowInfo={selectedRowInfo}
            setSelectedRowInfo={setSelectedRowInfo}
            refresh={async (refetchBoard?: boolean) => {
                if (refetchBoard && board) {
                    try {
                        const { data } = await apiFetch<API.Board>(getBoardById.api(board?._id), getBoardById.method);
                        setBoard(data);
                        refreshBoard?.();
                    } catch (error) {}
                }
                tableRef?.current?.refresh();
            }}
            currentBoard={board}
            titleValue={titleValue}
            closeAfterSave={closeAfterSave}
            contactRecordLink={contactRecordLink}
            opportunityRecordLink={opportunityRecordLink}
            refreshLinkedContent={refreshLinkedContent}
            slots={slots}
            tableRef={tableRef}
            crm={crm}
        />
    );
};

export const openDetailModal = (
    props: Omit<DetailModalProps, 'open' | 'setSelectedRowInfo' | 'selectedRowInfo'> & {
        currentBoardInfo: CurrentBoardInfo;
        tableRef?: RefObject<FlexibleTableRef<API.BoardItem>>;
        titleValue?: ColumnValue;
        refreshBoard?: () => Promise<void>;
        refreshLinkedContent?: () => Promise<void>;
        crm?: boolean;
        slots?: { backdrop?: ElementType; root?: ElementType };
    },
) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(
        createPortal(
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <QueryClientProvider client={queryClient}>
                    <DetailModalHOC {...props} />
                </QueryClientProvider>
            </LocalizationProvider>,
            document.body,
        ),
    );
};

export default DetailModal;
