import type { Attachment, Option } from '@imbrace/ui';
import { Dropdown, Icon, IconButton } from '@imbrace/ui';
import {
    Accordion as MuiAccordion,
    AccordionSummary as MuiAccordionSummary,
    Box,
    CircularProgress,
    Divider,
    TextField as MuiTextField,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { FETCH_SUCCEEDED } from '@/constants/app';
import ContactProfileHeader from '@/pages/Databoards/components/BoardDetailedModal/ContactProfileHeader';
import type { ProfileTabType } from '@/pages/Databoards/components/BoardDetailedModal/ContactProfileTabs';
import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import { openDetailModal } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import type { LinkedTabContentRef } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalContent';
import DetailModalFields, { SHARE_DOMAIN } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalFields';
import LinkedTabContent from '@/pages/Databoards/components/BoardDetailedModal/LinkedTabContent';
import OpportunitiesList from '@/pages/Databoards/components/BoardDetailedModal/OpportunitiesList';
import Conversations from '@/pages/Databoards/components/Conversations';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import ProfileTabs from '@/pages/Members/components/BasicInformation/components/ProfileTabs';
import { TabsContainer } from '@/pages/Members/components/BasicInformation/StyledComponents';
import { fetchContactByIdThunk } from '@/redux/slices/contact';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getBoardContactFields, postContactAvatar, putContactByIdV2 } from '@/services/api/contact';
import { getBoards, getLinkedBoardItems, putBoardRecord } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { convertDateToMMDDYYYY } from '@/utils/DateTimeUtils';

import Files from '../MemberDetailV2/files';

interface BasicInformationProps {
    onSelectFile: (files?: Attachment[]) => void;
    isPresence?: boolean;
    editable?: boolean;
    type?: string;
    onEdit: (data: Partial<API.BaseContact>) => void;
    showCropFree?: boolean;
    onClose: () => void;
    setShowProfileModal: (showProfileModal: boolean) => void;
    user?: API.Contact | API.User;
    selectedAvatarFile?: Attachment[];
    setSelectedProfileAvatar: (files?: Attachment[]) => void;
    columns?: 'one' | 'two';
    isProfileModal?: boolean;
}

export const Accordion = styled(MuiAccordion)({
    margin: 0,
    borderRadius: '0 !important',
    boxShadow: 'none',
    '& .MuiPaper-root': {
        borderRadius: '0',
        margin: 0,
        boxShadow: 'none',
    },
    '&:before': {
        opacity: 0,
    },
    '&.Mui-expanded': {
        margin: '0',
        minHeight: '0px',
    },
    borderTop: '1px solid var(--color-light-3)',
    borderBottom: '1px solid var(--color-light-3)',
    '& + .MuiAccordion-root': {
        borderTop: 'none',
    },
    '&:last-child': {
        '&.Mui-expanded': {
            borderBottom: 'none',
        },
    },
});
export const AccordionSummary = styled(MuiAccordionSummary)({
    padding: '16px 32px',
    border: 'none',

    margin: '0 !important',
    minHeight: '64px',
    '& .MuiAccordionSummary-content .Mui-expanded ': {
        margin: '0 !important',
    },
    '& .MuiAccordionSummary-content ': {
        margin: '0 !important',
    },
    '&.Mui-expanded': {
        borderBottom: '1px solid var(--color-light-3)',
    },
});

export const TextField = styled(MuiTextField, { shouldForwardProp: (props) => props !== 'width' })<{
    width?: string;
}>(({ width }) => ({
    width: width || '100%',
    '& .MuiFormHelperText-root': {
        margin: 0,
        '&.Mui-error': {
            color: 'var(--color-danger-5)',
        },
    },
    '& .MuiOutlinedInput-root': {
        minHeight: 0,
        padding: 0,
        lineHeight: '1.75',
        width: '100%',
        '& .MuiSelect-select': {
            display: 'flex',
            fontSize: '0.875rem',
        },
        '& .MuiOutlinedInput-input': {
            padding: '0',
        },
        '&.Mui-error fieldset': {
            borderColor: 'var(--color-danger-5)',
        },
        '&:hover fieldset': {
            borderColor: 'var(--color-primary-1)',
        },
        '&.Mui-error:hover fieldset': {
            borderColor: 'var(--color-danger-5)',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'var(--color-primary-1)',
        },
        '&.Mui-focused.Mui-error fieldset': {
            borderColor: 'var(--color-danger-5)',
        },
    },
    '& .MuiOutlinedInput-notchedOutline': {
        border: 'none',
    },
}));

export interface BasicInformationRef {
    closeBasicInfo: () => void;
    editing: boolean;
    openDialog: () => void;
}

const BasicInformation = forwardRef<BasicInformationRef, BasicInformationProps>((props, ref) => {
    const {
        editable,
        onSelectFile,
        onClose,
        showCropFree,
        setShowProfileModal,
        user,
        selectedAvatarFile,
        setSelectedProfileAvatar,
        isPresence,
        isProfileModal,
    } = props;
    const { t } = useTranslation();
    const contact = useAppSelector((state) => state.Contact.contact);
    const getContactByIdStatus = useAppSelector((state) => state.Contact.getContactByIdStatus);
    const dispatch = useAppDispatch();
    const formRef = useRef<HTMLFormElement>(null);
    const selectedRef = useRef<Option | null>(null);
    const linkedTabContentRef = useRef<LinkedTabContentRef>(null);

    const [boardFields] = useState<API.ContactBoardField[]>();

    const [editing, setEditing] = useState<boolean>(false);
    const [currentTab, setCurrentTab] = useState<ProfileTabType>('basics');

    const [currentBoardInfo, setCurrentBoardInfo] = useState<CurrentBoardInfo>();
    const [fields, setFields] = useState<Field[]>([]);
    const [createdType, setCreatedType] = useState<'system' | 'manual'>('system');
    const [boardRecord, setBoardRecord] = useState<API.BoardItem | undefined>();
    const [loading, setLoading] = useState<boolean>(false);

    const onFetchLinkedBoards = useCallback(async (boardsArray: string[]) => {
        try {
            const boardsParams = {
                limit: 0,
                skip: 0,
                sort: '-created_at',
            };
            const { data } = await apiFetch<{
                data: API.Board[];
            }>(getBoards.api(boardsParams), getBoards.method, {}, ImbraceClient, {});
            const result = data.data.filter((item) => boardsArray.includes(item.type));

            return result.reduce((acc, cur) => {
                acc[cur.type] = cur;
                return acc;
            }, {} as Record<string, API.Board>);
        } catch (error) {
            console.error('error: ', error);
        }
    }, []);

    const { data: linkedBoards, isLoading } = useQuery({
        queryKey: ['contact-linked-tabs'],
        queryFn: () => onFetchLinkedBoards(['Opportunities', 'Tasks']),
    });

    const fetchOpportunitiesData = useMemo(
        () => async (): Promise<Option[]> => {
            if (!currentBoardInfo || !linkedBoards) return [];
            try {
                const { data } = await apiFetch<{
                    data: Record<string, string | [] | null | API.AssigneeValue>[];
                }>(
                    getLinkedBoardItems.api(currentBoardInfo.boardId, currentBoardInfo.boardItemId, 'Opportunities'),
                    getLinkedBoardItems.method,
                );

                const displayDefaultFields = linkedBoards.Opportunities.fields.filter((field) => field.is_default || field.is_identifier);

                const groupedFields = displayDefaultFields?.reduce((acc: Record<string, API.BoardField>, field) => {
                    const { default_field_name } = field;
                    if (!default_field_name) return acc;

                    acc[default_field_name] = field;
                    return acc;
                }, {});

                const nameKey = groupedFields?.name?._id;
                const ownerKey = groupedFields?.owner?._id;

                return data.data.map((item) => {
                    return {
                        value: `${item.board_id}/${item.board_item_id}`,
                        text: item[nameKey] as string,
                        description: item[ownerKey] ? (item[ownerKey] as API.AssigneeValue).display_name : '',
                        icon: <Icon name="record" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                    };
                });
            } catch (error) {
                console.error('error::', error);
                return [];
            }
        },
        [currentBoardInfo, linkedBoards],
    );

    const onUpdateBoardFields = useCallback(
        async (data: Record<string, string | Record<string, string>>[], logoUrl?: string) => {
            if (!currentBoardInfo) return;
            const { boardId, boardItemId } = currentBoardInfo;
            try {
                return await apiFetch(putBoardRecord.api(boardId, boardItemId), putBoardRecord.method, {
                    ...(typeof logoUrl !== 'undefined' ? { logo_url: logoUrl } : { logo_url: '' }),
                    data,
                });
            } catch (error) {
                console.error('Update board fields error: ', error);
            }
        },
        [currentBoardInfo],
    );

    const onFetchBoardFields = useCallback(async () => {
        if (contact && getContactByIdStatus === FETCH_SUCCEEDED) {
            try {
                const { data } = await apiFetch<API.BoardItem>(getBoardContactFields.api(contact.id), getBoardContactFields.method);
                setBoardRecord(data);

                const rowInfo = {
                    boardId: data.board._id,
                    boardItemId: data._id,
                    boardType: data.board.type,
                    editMode: editing,
                };
                setCurrentBoardInfo(rowInfo);
                setCreatedType(data.created_type);

                const structuredFields = data.board.fields.map((field) => {
                    const value: string = (data.fields as Record<string, any>)[field._id as string] ?? null;
                    return {
                        contact_field: field.contact_field !== null ? field.contact_field : undefined,
                        data: field.data ? field.data : [],
                        default_field_name: field.default_field_name ? field.default_field_name : '',
                        hidden: field.hidden !== undefined ? field.hidden : false,
                        is_default: field.is_default,
                        is_identifier: field.is_identifier ? field.is_identifier : false,
                        name: field.name,
                        type: field.type,
                        _id: field._id,
                        is_unique_identifier: field.is_unique_identifier !== undefined ? field.is_unique_identifier : false,
                        value,
                    };
                });
                setFields(structuredFields);
                setLoading(false);
            } catch (error) {
                setLoading(false);
                console.error('Fetch board fields error: ', error);
            }
        }
    }, [editing, getContactByIdStatus, contact]);

    useEffect(() => {
        onFetchBoardFields();
    }, [onFetchBoardFields]);

    useImperativeHandle(ref, () => ({
        closeBasicInfo: () => {
            // setExpanded(false);
        },
        editing,
        openDialog: () => {
            // setOpenAskSave(true);
        },
    }));

    const methods = useForm<Record<string, string | []>>({
        mode: 'all',
        defaultValues: {},
    });

    const {
        handleSubmit,
        formState: { errors, isDirty },
        reset,
    } = methods;

    const closeModalAndResetState = () => {
        onClose?.();
        setBoardRecord(undefined);
        if (!isProfileModal) {
            setSelectedProfileAvatar(undefined);
        }
    };

    useEffect(() => {
        // restructure board fields
        if (contact && getContactByIdStatus === FETCH_SUCCEEDED && fields && currentBoardInfo) {
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
                if (field.default_field_name) {
                    acc[field.default_field_name] = (field.value as unknown as string) || '';
                    return acc;
                }
                acc[field._id] = (field.value as unknown as string) || '';
                return acc;
            }, {} as Record<string, string>);
            if (contact.avatar_url) {
                setSelectedProfileAvatar([
                    {
                        id: '1',
                        url: contact.avatar_url,
                        status: 'ok',
                    },
                ]);
            }

            reset({
                ...peopleFieldsObj,
                birthday: contact.birthday ? (convertDateToMMDDYYYY(contact.birthday) as string) : '',
                channel_type: contact.channel_type ? contact.channel_type : '',
                updated_at: contact.updated_at ? contact.updated_at : '',
                created_at: contact.created_at ? contact.created_at : '',
            });
            return;
        }
    }, [reset, contact, getContactByIdStatus, currentBoardInfo, fields, setSelectedProfileAvatar]);

    useEffect(() => {
        reset();
        setEditing(false);
        // setExpanded(false);
    }, [contact?.id, reset, setEditing]);

    // useEffect(() => {
    //     setExpanded(commentCount <= 0);
    // }, [contact?.id, commentCount]);

    const handleContactAvatar = async (contactId: string) => {
        const files = selectedAvatarFile?.filter((attachment) => attachment.status === 'ok');
        if (files?.[0]?.file) {
            try {
                const avatarFormData = new FormData();
                avatarFormData.append('file', files[0].file);
                setLoading(true);
                const { data } = await apiFetch<API.FileUpload>(postContactAvatar.api, postContactAvatar.method, avatarFormData);
                if (data) {
                    setSelectedProfileAvatar([
                        {
                            id: '1',
                            url: data.url,
                            status: 'ok',
                        },
                    ]);

                    await apiFetch(putContactByIdV2.api(contactId), putContactByIdV2.method, {
                        avatar_url: data.url,
                    });
                    dispatch(fetchContactByIdThunk(contactId));
                    return true;
                }
            } catch (error) {
                console.error('contact avatar error: ', error);
                setLoading(false);
                return false;
            }
        } else if (files?.length === 0) {
            try {
                await apiFetch(putContactByIdV2.api(contactId), putContactByIdV2.method, {
                    avatar_url: null,
                });
                dispatch(fetchContactByIdThunk(contactId));
                return true;
            } catch (error) {
                console.error('update contact avatar error: ', error);
                return false;
            }
        }

        return true;
    };

    const restructureFormData = async (formData: Record<string, string>) => {
        const fieldsWithValue: Record<string, string | Record<string, string>>[] = [];
        if (boardRecord) {
            fields.forEach((fieldItem: Field) => {
                const value = !fieldItem.is_default ? formData[fieldItem._id] : formData[fieldItem.default_field_name as string];

                fieldsWithValue.push({
                    key: fieldItem._id,
                    value,
                });
            });
        }
        return onUpdateBoardFields(fieldsWithValue as any);
    };

    const onSubmit = async (formData: Record<string, string | []>) => {
        if (!currentBoardInfo || !boardRecord) return;
        setLoading(true);
        if (currentBoardInfo.boardType === 'Contacts') {
            const avatarRes = await handleContactAvatar(contact?.id as string);
            if (!avatarRes) {
                setLoading(false);
                return;
            }
        }

        const res = await restructureFormData(formData as Record<string, string>);
        if (res?.status === 200) {
            dispatch(fetchContactByIdThunk(contact?.id as string));

            setEditing(false);
        }
        setLoading(false);
    };

    const onModalClose = () => {
        if (isDirty) {
            dialog({
                title: t('crm_unsave_prompt_title'),
                content: t('crm_unsave_prompt_content'),
                actionsAlign: 'flex-end',
                confirmText: t('crm_unsave_prompt_confirm_text'),
                cancelText: t('crm_unsave_prompt_cancel_text'),
                onConfirm: async () => {
                    await handleSubmit(onSubmit)();
                    closeModalAndResetState();
                },
                onClose: () => {
                    closeModalAndResetState();
                    onClose?.();
                },
            });
            return;
        }
        closeModalAndResetState();
    };

    if (!contact && getContactByIdStatus !== FETCH_SUCCEEDED && !boardFields) {
        return (
            <div>
                <CircularProgress size={'25px'} />
            </div>
        );
    }

    const renderActionButtons = () => {
        return (
            <Box
                sx={{
                    width: '100%',
                    padding: '16px 16px 0 0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                }}
            >
                {editable && (
                    <>
                        {editing ? (
                            <IconButton
                                size="s"
                                type="secondary"
                                variant="text"
                                sx={{ fontSize: '24px' }}
                                loading={loading}
                                disabled={loading}
                                onClick={async () => {
                                    await handleSubmit(onSubmit)();
                                    if (Object.keys(errors).length > 0) return;
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
                                    {!loading && <Icon name="save" color="var(--color-primary-1)" />}
                                </Box>
                            </IconButton>
                        ) : (
                            <IconButton
                                size="s"
                                type="secondary"
                                variant="text"
                                sx={{ fontSize: '24px' }}
                                onClick={() => {
                                    setEditing(true);
                                }}
                            >
                                <Icon name="edit" />
                            </IconButton>
                        )}
                    </>
                )}

                {showCropFree ? (
                    <IconButton
                        size="s"
                        type="secondary"
                        variant="text"
                        sx={{ fontSize: '24px' }}
                        onClick={() => {
                            if (editing) {
                                dialog({
                                    title: t('contacts_done_dialog_title'),
                                    content: t('contacts_done_dialog_content'),
                                    onClose: () => {
                                        reset();
                                        setShowProfileModal(true);
                                        setEditing(false);
                                        // setExpanded(false);
                                    },
                                    onConfirm: async () => {
                                        await handleSubmit(onSubmit)();
                                        if (Object.keys(errors).length > 0) return;
                                    },
                                    cancelText: t('contacts_done_dialog_exit_only'),
                                    confirmText: t('contacts_done_dialog_save_and_exit'),
                                    onBackdropClose: () => {
                                        onModalClose();
                                    },
                                    showDontAskedAgain: false,
                                    confirmButtonProps: {
                                        disabled: Object.entries(errors).length > 0,
                                    },
                                });
                            } else {
                                setShowProfileModal(true);
                                // setExpanded(false);
                            }
                        }}
                    >
                        <Icon name="fullScreen" />
                    </IconButton>
                ) : (
                    <IconButton
                        size="s"
                        type="secondary"
                        variant="text"
                        sx={{ fontSize: '24px' }}
                        onClick={() => {
                            onModalClose();
                        }}
                    >
                        <Icon name="fullScreenExit" />
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
                <IconButton size="s" type="secondary" variant="text" sx={{ fontSize: '24px' }} onClick={() => onModalClose()}>
                    <Icon name="close" />
                </IconButton>
            </Box>
        );
    };

    const renderHeader = () => {
        return (
            <ContactProfileHeader
                onSelectFile={onSelectFile}
                selectedAvatarFile={selectedAvatarFile}
                isEditMode={editing}
                loading={loading}
                selectedRowInfo={currentBoardInfo}
                createdType={createdType}
                fields={fields}
                isPresence={isPresence}
                channelType={(user as API.Contact)?.channel_type}
            />
        );
    };

    const openModal = async (type: API.BoardType, refresh?: () => Promise<void>, linkTaskToOpportunity?: boolean) => {
        const domain = SHARE_DOMAIN;
        const selectedRecordLink = `${domain}/crm/${currentBoardInfo?.boardId}/${currentBoardInfo?.boardItemId}`;

        // create Task Record linking to Opportunities
        if (linkTaskToOpportunity) {
            const opportunitiesOptions = await fetchOpportunitiesData();

            dialog({
                title: t('board_select_opportunity'),
                content: <OpportunitiesList opportunitiesOptions={opportunitiesOptions} selectedRef={selectedRef} />,
                onConfirm: async () => {
                    const opportunityLink = selectedRef.current ? `${domain}/crm/${selectedRef.current.value}` : '';

                    openDetailModal({
                        crm: true,
                        titleValue: '',
                        currentBoardInfo: {
                            boardId: linkedBoards?.[type]?._id as string,
                            boardItemId: 'new',
                            boardType: type,
                        },
                        currentBoard: linkedBoards?.[type],
                        tableRef: {} as RefObject<FlexibleTableRef<API.BoardItem>>,
                        onClose: () => {},

                        closeAfterSave: true,
                        contactRecordLink: selectedRecordLink,
                        opportunityRecordLink: opportunityLink,

                        refreshLinkedContent: refresh,
                    });
                },
                onClose: () => {},
                confirmText: t('next'),
                confirmButtonProps: {
                    sx: {
                        height: '40px',
                        width: '160px',
                    },
                },
                hideCancelButton: true,
                showCloseButton: true,
                actionsAlign: 'flex-start',
            });

            return;
        }
        openDetailModal({
            crm: true,
            titleValue: '',
            currentBoardInfo: {
                boardId: linkedBoards?.[type]?._id as string,
                boardItemId: 'new',
                boardType: type,
            },
            currentBoard: linkedBoards?.[type],
            tableRef: {} as RefObject<FlexibleTableRef<API.BoardItem>>,
            onClose: () => {},

            closeAfterSave: true,
            // prefill record link field depends on the board type
            ...(currentBoardInfo?.boardType === 'Contacts' ? { contactRecordLink: selectedRecordLink } : {}),
            ...(currentBoardInfo?.boardType === 'Opportunities' ? { opportunityRecordLink: selectedRecordLink } : {}),
            refreshLinkedContent: refresh,
        });
    };

    const renderCreateButton = (modalBoardType: API.BoardType) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: '36px',
                    right: '36px',
                    zIndex: 1000,
                }}
            >
                <IconButton
                    fontSize={16}
                    type="primary"
                    onClick={async () => {
                        if (!linkedTabContentRef.current) return;
                        openModal(modalBoardType, linkedTabContentRef?.current.fetchTabData);
                    }}
                    sx={{ borderRadius: '4px' }}
                >
                    <Icon name="add" fontSize={24} />
                </IconButton>
            </div>
        );
    };

    const renderCreateTaskButton = (modalBoardType: API.BoardType) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: '36px',
                    right: '36px',
                    zIndex: 1000,
                }}
            >
                <Dropdown
                    // disabled={selectedRowInfo?.boardItemId === 'new'}
                    arrowDownIcon={<Icon name="add" fontSize={24} />}
                    arrowUpIcon={<Icon name="close" fontSize={24} />}
                    variant="contained"
                    buttonSx={{
                        minWidth: '40px',
                        width: '40px',
                        height: '40px',
                        padding: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-primary-1)',
                        '& .textContainer': {
                            width: 0,
                            display: 'none',
                        },

                        '& svg': {
                            verticalAlign: 'middle',
                        },
                        '&:hover': {
                            backgroundColor: 'var(--color-primary-4)',
                        },
                        '&:disabled': {
                            backgroundColor: 'var(--color-primary-5)',
                            color: 'var(--color-light-1)',
                        },
                    }}
                    options={[
                        {
                            text: t('board_task_link_with_opportunity'),
                            icon: <Icon name="linkedRecord" />,
                            index: 'link-opportunity',
                        },
                        {
                            text: t('board_task_link_with_contact'),
                            icon: <Icon name="newRecord" />,
                            index: 'link-contact',
                        },
                    ]}
                    hideOnSelect
                    onSelect={(event, selectedIndex) => {
                        if (selectedIndex === 'link-opportunity') {
                            if (!linkedTabContentRef.current) return;
                            openModal(modalBoardType, linkedTabContentRef?.current.fetchTabData, true);
                        }
                        if (selectedIndex === 'link-contact') {
                            if (!linkedTabContentRef.current) return;
                            openModal(modalBoardType, linkedTabContentRef?.current.fetchTabData);
                        }
                    }}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    menuPaperProps={{
                        sx: {
                            marginTop: '-4px !important',
                        },
                    }}
                />
            </div>
        );
    };

    return (
        <FormProvider {...methods}>
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {renderActionButtons()}
                {renderHeader()}

                <TabsContainer>
                    <ProfileTabs
                        currentTab={currentTab}
                        setCurrentTab={setCurrentTab}
                        linkedBoards={linkedBoards}
                        isTabLoading={isLoading}
                    />
                </TabsContainer>

                <Scrollbars autoHide>
                    {currentTab === 'basics' && (
                        <DetailModalFields
                            loading={loading}
                            isEditMode={editing}
                            boardRecord={boardRecord}
                            columns="one"
                            selectedRowInfo={currentBoardInfo}
                            fields={fields}
                            afterUpdated={async () => {}}
                        />
                    )}
                    {currentTab === 'conversations' && <Conversations userId={user?.id} onClose={onClose} isModal={isProfileModal} />}
                    {currentTab === 'files' && <Files userId={user?.id} />}
                    {currentTab === 'opportunities' && (
                        <LinkedTabContent
                            ref={linkedTabContentRef}
                            key="opportunities"
                            boardType="Opportunities"
                            selectedRowInfo={currentBoardInfo}
                            linkedBoards={linkedBoards}
                        />
                    )}
                    {currentTab === 'tasks' && (
                        <LinkedTabContent
                            ref={linkedTabContentRef}
                            key="tasks"
                            boardType="Tasks"
                            selectedRowInfo={currentBoardInfo}
                            linkedBoards={linkedBoards}
                        />
                    )}
                </Scrollbars>
                {editing && (
                    <>
                        {currentTab === 'opportunities' && renderCreateButton('Opportunities')}
                        {currentTab === 'tasks' && renderCreateTaskButton('Tasks')}
                    </>
                )}
            </form>
        </FormProvider>
    );
});
export default BasicInformation;
