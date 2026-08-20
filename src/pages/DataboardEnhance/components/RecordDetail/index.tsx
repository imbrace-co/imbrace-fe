import type { Attachment, DropdownRef } from '@imbrace/ui';
import { Dropdown, EllipsisText, Icon, IconButton, Illustration, Space, Typography, Upload, useDialog } from '@imbrace/ui';
import { Divider, ListItemButton } from '@mui/material';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { Link, useMatch } from 'react-router-dom';
import SimpleBar from 'simplebar-react';

import { ListItemIcon, ListItemText } from '@/components/Navbar/index';
import { useNotify } from '@/contexts/SnackbarContext';
import { env } from '@/env';
import { FieldTypeIcon } from '@/pages/Databoards/utils';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getContactCommentById, getContactConversationsById } from '@/services/api/contact';
import { deleteBoardRecord } from '@/services/api/crm';
import { emailOutbound, whatsappOutbound } from '@/services/api/outbound';
import apiFetch from '@/services/axios/handler';
import { useBoards, useRelatedRecordsInfinite } from '@/services/queries/board';
import { supportedImageFileExtensions, supportedImageFileMIME } from '@/utils';

import { TeamTags } from '../Conversations/ConversationCard';
import EditableColumn, { EditableIdentifier } from './editableColumn';
import type { EmailOutboundFormType } from './emailOutbound';
import EmailOutbound, { EmailOutboundSchema } from './emailOutbound';
import useRecordDetailHelper from './hooks';
import styles from './index.module.scss';
import type { RecordValue } from './types';
import type { WhatsAppOutboundFormType } from './whatsAppOutbound';
import WhatsAppOutbound, { WhatsAppOutboundSchema } from './whatsAppOutbound';
export interface RecordDetailProps {
    board?: API.Board;
    record?: API.BoardItem;
    refresh: () => Promise<void>;
    inModal?: boolean;
    readOnly?: boolean;
}

const filterDefaultFields = {
    Contacts: ['last_seen', 'display_name', 'created_at', 'updated_at'],
};

export const OperationDropdown = ({
    id,
    link,
    disabledDelete,
    deleteRecord,
}: {
    id: string;
    link: string;
    disabledDelete: boolean;
    deleteRecord?: UseMutationResult<void, Error, void, unknown>;
}) => {
    const [selected, setSelected] = useState<string>();
    const [toggle, setToggle] = useState<boolean>(false);
    const { t } = useTranslation();
    const dropdownRef = useRef<DropdownRef>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (toggle) {
            timer = setTimeout(() => {
                setToggle(false);
            }, 2000);
        }

        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [toggle]);

    const onSelect = async (selectedIndex: string) => {
        try {
            if (selectedIndex === 'copy_share_link' || selectedIndex === 'copy_record_id') {
                if (selected === selectedIndex && toggle) {
                    return;
                }

                setSelected(selectedIndex);
                setToggle(true);
                if (selectedIndex === 'copy_share_link') {
                    await navigator.clipboard.writeText(link);
                }
                if (selectedIndex === 'copy_record_id') {
                    await navigator.clipboard.writeText(id);
                }
            } else {
                if (selectedIndex === selected) {
                    return;
                }
                deleteRecord?.mutate();
                dropdownRef.current?.close();
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <Dropdown
            ref={dropdownRef}
            variant="text"
            icon={<Icon name="more" fontSize={24} />}
            hideArrow
            onSelect={(e, selectedIndex) => {
                onSelect(selectedIndex);
            }}
            selectedIndex={selected}
            options={[
                {
                    text: selected === 'copy_share_link' && toggle ? t('copied') : 'Copy Share Link',
                    index: 'copy_share_link',
                },
                {
                    text: selected === 'copy_record_id' && toggle ? t('copied') : 'Copy Record ID',
                    index: 'copy_record_id',
                },
                {
                    type: 'divider',
                },
                {
                    text: 'Delete',
                    index: 'delete',
                    loading: deleteRecord?.isPending,
                    disabled: disabledDelete,
                    tooltip: disabledDelete ? t('crm_record_not_deletable') : undefined,
                    textColor: 'var(--color-danger-1)',
                },
            ]}
        />
    );
};

const fetchConversations = async ({ queryKey }: { queryKey: [string, 'conversations', { filterChannels: API.ChannelType[] }] }) => {
    const [userId] = queryKey;
    if (!userId) {
        throw new Error('User Id is missing');
    }

    const api = getContactConversationsById.api(userId, 'web');
    const { data } = await apiFetch<{ data: API.ContactConversation[] }>(api, getContactCommentById.method);

    return data.data;
};

const WebWidgetCTA = ({ userId }: { userId: string }) => {
    const navigate = useNavigate();
    const [{ dialog }] = useDialog();
    const { t } = useTranslation();

    const { data: conversations = [] } = useQuery({
        queryKey: [userId, 'conversations', { filterChannels: ['web'] }],
        queryFn: fetchConversations,
    });

    const handleNoPermissionNotify = () => {
        const targetConversation = conversations[0];
        dialog({
            title: t('conversation_no_permission_to_access'),
            content: (
                <Space direction="vertical" size={24}>
                    <span>{t('conversation_no_permission_to_access_desc')}</span>
                    <div className={styles.conversations}>
                        <Space className={styles.container}>
                            <div className={styles.conversation}>
                                <div>
                                    {targetConversation.conversation && (
                                        <Icon
                                            namespace="channel"
                                            name={targetConversation.conversation.channel_type}
                                            style={{ fontSize: 24 }}
                                        />
                                    )}
                                </div>

                                <EllipsisText
                                    text={targetConversation.conversation?.name}
                                    style={{ fontSize: 14, color: 'var(--color-light-7)' }}
                                />
                            </div>

                            <TeamTags teams={targetConversation.teams} />
                        </Space>
                    </div>
                </Space>
            ),
            onConfirm: async () => {},
            onClose: () => {},
            actionsAlign: 'flex-end',
            confirmText: t('done'),
            hideCancelButton: true,
        });
    };

    return (
        <IconButton
            variant="outlined"
            sx={{
                padding: '3px',
            }}
            onClick={() => {
                const targetConversation = conversations[0];
                if (targetConversation) {
                    if (targetConversation.available_team_conversations && targetConversation.available_team_conversations.length > 0) {
                        navigate(`/chatroom?conv_id=${targetConversation.available_team_conversations[0]._id}`);
                    } else {
                        handleNoPermissionNotify();
                    }
                }
            }}
        >
            <Icon name="chatMessage" />
        </IconButton>
    );
};

export const DetailHeader = ({
    board,
    record,
    onSelectFile,
    onDataUpdate,
    extraOperation,
    hiedOperation,
    readOnly,
}: {
    board: API.Board;
    record: API.BoardItem;
    onSelectFile: (files?: Attachment[]) => void;
    onDataUpdate: (data: { fieldId: string; value: RecordValue; recordId: string }) => Promise<API.BoardItem | undefined>;
    extraOperation?: ReactNode;
    hiedOperation?: boolean;
    readOnly?: boolean;
}) => {
    const [{ dialogForm }, dialogsHolder] = useDialog();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const {notify} = useNotify();
    const currentUserEmail = useAppSelector((state) => state.Account.email);
    const { data: boards } = useBoards({ isDefault: true });

    const contactBoard = useMemo(() => {
        return boards?.filter((b) => b.type === 'Contacts')[0];
    }, [boards]);

    const contactIdentifierField = useMemo(() => {
        return contactBoard?.fields.find((field) => field.is_identifier);
    }, [contactBoard]);

    const emailField = useMemo(() => {
        return contactBoard?.fields.find((field) => field.default_field_name === 'email');
    }, [contactBoard]);

    const whatsappField = useMemo(() => {
        return contactBoard?.fields.find((field) => field.default_field_name === 'whatsapp_id');
    }, [contactBoard]);

    const { data: contactsRelationData } = useRelatedRecordsInfinite({
        boardId: board._id,
        recordId: record._id,
        relatedBoardId: board.type === 'Opportunities' ? contactBoard?._id : undefined,
        params: { skip: 0, limit: 0, link: true },
    });

    const deleteRecord = useMutation({
        mutationFn: async () => {
            if (board?._id && record?._id) {
                await apiFetch(deleteBoardRecord.api(board?._id, record._id), deleteBoardRecord.method);
            }
        },
        onError: (error) => {
            const notificationPayload = {
                message: error.message,
                messageType: 'noti_failed',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
        onSuccess: () => {
            navigate(-1);
        },
    });

    const sendWhatsappOutbound = useMutation({
        mutationFn: async (formData: {
            channel_id: string;
            phone_number: string;
            template: {
                name: string;
                text: string;
                language: string;
            };
            variables?: string[];
        }) => {
            const { data } = await apiFetch<{ data: { board_item: API.BoardItem } }>(
                whatsappOutbound.api(),
                whatsappOutbound.method,
                formData,
            );
            return data.data;
        },
        onSuccess: (data) => {
            notify({
                type: 'success',
                message: (
                    <Typography>
                        <Trans i18nKey="sent_whatsapp_outbound_success">
                            Sent successfully. Find record on
                            <Link to={`/databoards/${data.board_item.board_id}`}>“WhatsApp Outbound Records”</Link> data board.
                        </Trans>
                    </Typography>
                ),
            });
        },
    });

    const sendEmailOutbound = useMutation({
        mutationFn: async (formData: {
            sender_email: string;
            audience_group: {
                board_id: string;
                board_item_ids: string[];
            };
            subject: string;
            content: {
                content: string;
                files?: Attachment[];
            };
        }) => {
            const { data } = await apiFetch<{ data: API.BoardItem[] }>(emailOutbound.api(), emailOutbound.method, formData);
            return data.data;
        },
        onSuccess: (data) => {
            notify({
                type: 'success',
                message: (
                    <Typography>
                        <Trans i18nKey="sent_email_outbound_success">
                            Sent successfully. Find record on
                            <Link to={`/databoards/${data[0].board_id}`}>Email Outbound Records”</Link> data board.
                        </Trans>
                    </Typography>
                ),
            });
        },
    });

    const identifierField = useMemo(() => {
        return board?.fields.find((field) => field.is_identifier);
    }, [board]);

    const recordName = useMemo(() => {
        if (identifierField) {
            return record?.fields[identifierField._id] as string;
        }
        return '';
    }, [identifierField, record]);

    const recordLogo = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.avatar_url;
        }
        return record?.logo_url;
    }, [board, record]);

    const createdAt = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.created_at;
        }
        return record?.created_at;
    }, [board, record]);

    const updatedAt = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.updated_at;
        }
        return record?.updated_at;
    }, [board, record]);

    const shouldShowEmail = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.email;
        }
        if (board?.type === 'Opportunities' && emailField) {
            const allRows = contactsRelationData ? contactsRelationData.pages.flatMap((d) => d.data) : [];
            return allRows.some((row) => row.fields[emailField._id]);
        }

        return false;
    }, [board, record, contactsRelationData, emailField]);

    const shouldShowWhatsapp = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.channel_type === 'whatsapp' || record?.contacts?.whatsapp_id;
        }
        if (board?.type === 'Opportunities' && whatsappField) {
            const allRows = contactsRelationData ? contactsRelationData.pages.flatMap((d) => d.data) : [];
            return allRows.some((row) => row.fields[whatsappField._id]);
        }
        return false;
    }, [board, record, contactsRelationData, whatsappField]);

    const shouldShowWidget = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.channel_type === 'web';
        }
        return false;
    }, [board, record]);

    return (
        <Space style={{
              backgroundColor: board.type === 'Contacts' ?'#FEF5E8' :'transparent'
        }} size={24} direction="vertical" align="stretch" className={styles.header}>
            {dialogsHolder}
            <Space size={8} direction="vertical" align="stretch">
                {!hiedOperation && (
                    <Space size={12} justify="end">
                        <OperationDropdown
                            id={record._id}
                            link={`${env.VITE_APP_HOST}/crm/${board._id}/${record._id}`}
                            disabledDelete={record.created_type !== 'manual'}
                            deleteRecord={deleteRecord}
                        />
                        {extraOperation}
                    </Space>
                )}
                <Space size={12}>
                    {(board.type === 'Contacts' || board.type === 'Companies') && (
                        <div>
                            <Upload
                                type="avatar"
                                value={
                                    recordLogo
                                        ? [
                                              {
                                                  id: '1',
                                                  url: recordLogo,
                                                  status: 'ok',
                                              },
                                          ]
                                        : []
                                }
                                uploadButtonDisplay="hover"
                                fileValidation={async (file: File) => {
                                    const { size, name, type } = file;
                                    const extension = name.split('.')[1];
                                    if (
                                        (!extension || supportedImageFileExtensions.indexOf(extension) === -1) &&
                                        supportedImageFileMIME.indexOf(type) === -1
                                    ) {
                                        return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                                    }

                                    if (board.type === 'Contacts' && size > 500 * 1000) {
                                        return t('error_file_size', { size: '500 KB' });
                                    }
                                    if (board.type === 'Companies' && size > 20 * 1000 * 1000) {
                                        return t('error_file_size', { size: '20 MB' });
                                    }
                                    return true;
                                }}
                                accept="image/png, image/jpeg, .svg"
                                onChange={onSelectFile}
                                {...(board.type === 'Companies' && {
                                    defaultIcon: <Icon name="photoOutlined" fontSize={36} />,
                                })}
                            />
                        </div>
                    )}
                    <Space size={8} direction="vertical" align="start">
                        {identifierField && (
                            <EditableIdentifier
                                value={recordName}
                                fieldId={identifierField?._id}
                                recordId={record._id}
                                updateData={onDataUpdate}
                                readonly={readOnly}
                            />
                        )}
                        <Space size={4} direction="vertical" align="start">
                            <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>{`${t('last_updated')} ${dayjs(
                                updatedAt ?? createdAt,
                            ).format('MM/DD/YYYY h:mm A')}`}</Typography>
                            <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>{`${t('since')} ${dayjs(
                                createdAt,
                            ).format('MM/DD/YYYY')}`}</Typography>
                        </Space>
                    </Space>
                </Space>
            </Space>
            <Space size={12}>
                {shouldShowEmail && (
                    <IconButton
                        variant="outlined"
                        sx={{
                            padding: '3px',
                        }}
                        onClick={() => {
                            dialogForm<EmailOutboundFormType>({
                                title: t('send_an_email_outbound'),
                                defaultValues: {
                                    sender_email: currentUserEmail,
                                    to: board.type === 'Contacts' ? record._id : '',
                                },
                                content: (methods) => (
                                    <EmailOutbound
                                        boardType={board.type}
                                        boardId={board._id}
                                        methods={methods}
                                        recordId={record._id}
                                        relatedBoardId={contactBoard?._id}
                                        emailFieldId={emailField?._id}
                                        identifierFieldId={contactIdentifierField?._id}
                                    />
                                ),
                                confirmText: t('send'),
                                hideCancelButton: true,
                                onConfirm: async (formData) => {
                                    try {
                                        await sendEmailOutbound.mutateAsync({
                                            subject: formData.subject,
                                            content: formData.content,
                                            sender_email: formData.sender_email,
                                            audience_group: {
                                                board_id: board.type === 'Contacts' ? board._id : contactBoard?._id,
                                                board_item_ids: [formData.to],
                                            },
                                        });
                                        return true;
                                    } catch (error) {
                                        console.error('send email outbound error: ', error);
                                    }
                                },
                                paperSx: {
                                    minWidth: '714px',
                                },
                                onClose: () => {},
                                schema: EmailOutboundSchema(t),
                                actionsAlign: 'flex-start',
                                showCloseButton: true,
                                confirmButtonProps: {
                                    size: 'default',
                                },
                            });
                        }}
                    >
                        <Icon name="emailOutline" />
                    </IconButton>
                )}
                {shouldShowWhatsapp && (
                    <IconButton
                        variant="outlined"
                        sx={{
                            padding: '3px',
                        }}
                        onClick={() => {
                            dialogForm<WhatsAppOutboundFormType>({
                                title: t('send_a_whatsapp_outbound'),
                                content: (methods) => (
                                    <WhatsAppOutbound
                                        methods={methods}
                                        boardType={board.type}
                                        boardId={board._id}
                                        recordId={record._id}
                                        relatedBoardId={contactBoard?._id}
                                        whatsAppFieldId={whatsappField?._id}
                                        identifierFieldId={contactIdentifierField?._id}
                                    />
                                ),
                                defaultValues: {
                                    channelId: '',
                                    to: board.type === 'Contacts' ? record?.contacts?.whatsapp_id : '',
                                },
                                confirmText: t('send'),
                                hideCancelButton: true,
                                onConfirm: async (formData) => {
                                    try {
                                        await sendWhatsappOutbound.mutateAsync({
                                            channel_id: formData.channelId,
                                            phone_number: formData.to,
                                            template: formData.template,
                                            variables: formData.variables,
                                        });
                                        return true;
                                    } catch (error) {
                                        console.error('send whatsapp outbound error: ', error);
                                    }
                                },
                                onClose: () => {},
                                schema: WhatsAppOutboundSchema(t),
                                showCloseButton: true,
                                actionsAlign: 'flex-start',
                                confirmButtonProps: {
                                    size: 'default',
                                },
                            });
                        }}
                    >
                        <Icon name="whatsapp" />
                    </IconButton>
                )}
                {shouldShowWidget && record.contacts?._id && <WebWidgetCTA userId={record.contacts?._id} />}
            </Space>
        </Space>
    );
};

export const DetailFields = ({
    board,
    record,
    onDataUpdate,
    readOnly,
}: {
    board: API.Board;
    record: API.BoardItem;
    onDataUpdate: (data: { fieldId: string; value: RecordValue; recordId: string }) => Promise<API.BoardItem | undefined>;
    readOnly?: boolean;
}) => {
    const { t } = useTranslation();
    return (
        <div style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
            <SimpleBar style={{ width: '100%', height: '100%' }}>
                <Space size={16} direction="vertical" className={styles.body}>
                    {board.fields
                        .filter((field) => {
                            if (board.type === 'Contacts' && field.contact_field) {
                                return !filterDefaultFields[board.type].includes(field.contact_field) && !field.hidden_on_record;
                            }
                            return !field.is_identifier && !field.hidden_on_record;
                        })
                        .map((field) => {
                            const { type, name, _id } = field;
                            const valueEnum = field.data?.reduce((prev, current) => {
                                return {
                                    ...prev,
                                    [current._id]: current.value,
                                };
                            }, {});
                            const value = record?.fields?.[_id] || null;

                            return (
                                <Space key={_id} size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                                    <Space size={8} style={{ color: 'var(--color-light-5)', fontSize: 20 }}>
                                        {FieldTypeIcon(type)}
                                        <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                                            {name}
                                        </Typography>
                                    </Space>
                                    <EditableColumn
                                        fieldType={type}
                                        value={value}
                                        meta={{
                                            defaultFieldName: field.default_field_name,
                                            defaultCountryCode: field.settings?.default_country_code,
                                            defaultCurrencyCode: field.settings?.default_currency_code,
                                        }}
                                        {...((type === 'SingleSelection' || type === 'MultipleSelection' || type === 'Priority') && {
                                            dataEnum: valueEnum,
                                        })}
                                        record={record}
                                        fieldId={_id}
                                        editable={type !== 'RichText'}
                                        {...(field?.default_field_name === 'stage' && {
                                            disabled: () => {
                                                return record.fields[field._id] === 'Unidentified Lead';
                                            },
                                            disabledTooltip: t('crm_field_stage_disabled_desc'),
                                        })}
                                        {...(field?.default_field_name === 'created_at' && {
                                            disabled: () => {
                                                return record.created_type === 'system';
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
                                        updateData={onDataUpdate}
                                        readonly={readOnly}
                                    />
                                </Space>
                            );
                        })}
                </Space>
            </SimpleBar>
        </div>
    );
};

const CRMBackButton = ({ boardId }: { boardId: string }) => {
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    return (
        <ListItemButton
            onClick={() => {
                navigate(`/crm/${boardId}`, { state: location.state });
            }}
            sx={{ justifyContent: 'flex-end' }}
            className={styles.listItemButton}
        >
            <ListItemIcon
                open={true}
                sx={{
                    '& svg': {
                        fontSize: 15,
                    },
                    mr: 1,
                }}
            >
                <Icon name="backIos" />
            </ListItemIcon>
            <ListItemText open={true} primary={t('menu_crm')} sx={{ color: '#828282' }} />
        </ListItemButton>
    );
};

const RecordDetail = (props: RecordDetailProps) => {
    const { board, record, refresh, inModal, readOnly } = props;
    const [{ dialog }, dialogsHolder] = useDialog();
    const { t } = useTranslation();
    const { onSelectFile, onDataUpdate } = useRecordDetailHelper({ board, record, refresh, dialog, crm: true });
    const crmMatch = useMatch({
        path: '/crm/:boardId/:recordId',
        end: true,
        caseSensitive: true,
    });
    if (!board || !record) {
        return <Illustration name="recordMissing2" description={t('no_associated_records_found')} />;
    }

    return (
        <Space size={0} direction="vertical" className={styles.container} align="stretch">
            {dialogsHolder}
            {(!inModal && board.type !== 'Contacts') && <CRMBackButton boardId={crmMatch?.params?.boardId || ''} />}
            <DetailHeader
                board={board}
                record={record}
                onSelectFile={onSelectFile}
                onDataUpdate={onDataUpdate}
                hiedOperation={inModal || board.type === 'Contacts'}
                readOnly={readOnly}
            />
            {board.type !== 'Contacts' && <Divider flexItem /> }
            <DetailFields board={board} record={record} onDataUpdate={onDataUpdate} readOnly={readOnly} />
        </Space>
    );
};

export default RecordDetail;
