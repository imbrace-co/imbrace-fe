import type { ReactNode, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useMatch } from 'react-router-dom';
import { useLocation, useNavigate } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { t } from 'i18next';
import { Button, DropdownRef, FieldCurrency, FieldNumber, FieldSelect } from '@imbrace/ui';
import {
    Dropdown,
    DropdownMenu,
    DropdownMenuItem,
    Icon,
    IconButton,
    Illustration,
    Space,
    Typography,
    Upload,
    useDialog,
} from '@imbrace/ui';
import { Box, Divider, ListItemButton, Popover, Tooltip } from '@mui/material';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import SimpleBar from 'simplebar-react';
import { ListItemIcon, ListItemText } from '@/components/Navbar/index';
import { AttachmentValue } from '@/components/FlexibleTable/types';
import Attachment from '@/components/FlexibleTable/attachment';
import EditableColumn, { EditableIdentifier } from './editableColumn';
import Notes from './Notes';
import UploadDocuments from './uploadDocuments';
import EmailOutbound, { EmailOutboundSchema } from '../emailOutbound';
import WhatsAppOutbound, { WhatsAppOutboundSchema } from '../whatsAppOutbound';
import { useNotify } from '@/contexts/SnackbarContext';
import { useBoards, useRelatedRecordsInfinite } from '@/services/queries/board';
import useRecordDetailHelper from '../hooks';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { deleteBoardRecord } from '@/services/api/crm';
import { emailOutbound, whatsappOutbound } from '@/services/api/outbound';
import apiFetch from '@/services/axios/handler';
import { env } from '@/env';
import { FieldTypeIcon } from '@/pages/Databoards/utils';
import type { EmailOutboundFormType } from '../emailOutbound';
import type { WhatsAppOutboundFormType } from '../whatsAppOutbound';
import type { RecordValue } from '../types';
import type { UploadFormType } from '../../ImportDataboardFile';
import { FileStatus } from '@/pages/KnowledgeBase/components/FileUploadButton';
import ShareIcon from '@/assets/icons/icon_share.svg?react';
import styles from './index.module.scss';
import { getMembers } from '@/services/api/user';
import { queryClient } from '@/App';

export interface RecordDetailProps {
    board?: API.Board;
    record?: API.BoardItem;
    refresh: () => Promise<void>;
    inModal?: boolean;
    readOnly?: boolean;
}

export const ShareButton = ({ id, link }: { id: string; link: string }) => {
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
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <Dropdown
            ref={dropdownRef}
            variant="text"
            icon={<ShareIcon />}
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
            ]}
        />
    );
};

export const DetailHeader = ({
    board,
    record,
    formValues,
    onDataUpdate,
    onSubmit,
    extraOperation,
    readOnly,
    isDirty,
    isLoading,
}: {
    board: API.Board;
    record: API.BoardItem;
    formValues: RecordValue;
    onDataUpdate: (data: { fieldId: string; value: API.RecordValue; recordId: string }) => void;
    onSubmit: () => Promise<void>;
    extraOperation?: ReactNode;
    hiedOperation?: boolean;
    readOnly?: boolean;
    isDirty?: boolean;
    isLoading?: boolean;
}) => {
    const [{ dialogForm }, dialogsHolder] = useDialog();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { notify } = useNotify();
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
            console.log('deleteRecord onSuccess');
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
                        <Trans
                            i18nKey="sent_whatsapp_outbound_success"
                        >
                            Sent successfully. Find record on
                            <Link to={`/databoards/${data.board_item.board_id}`}>"WhatsApp Outbound Records"</Link>{' '}
                            data board.
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
                files?: AttachmentValue[];
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
                            <Link to={`/databoards/${data[0].board_id}`}>Email Outbound Records"</Link>{' '}
                            data board.
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
        if (identifierField && formValues) {
            return (formValues as Record<string, RecordValue>)[identifierField._id] as string;
        }
        return '';
    }, [identifierField, formValues]);

    const createdAt = useMemo(() => {
        return record?.created_at;
    }, [board, record]);

    const updatedAt = useMemo(() => {
        return record?.updated_at;
    }, [board, record]);

    const shouldShowEmail = useMemo(() => {
        if (board?.type === 'Opportunities' && emailField) {
            const allRows = contactsRelationData ? contactsRelationData.pages.flatMap((d) => d.data) : [];
            return allRows.some((row) => row.fields[emailField._id]);
        }

        return false;
    }, [board, record, contactsRelationData, emailField]);

    const shouldShowWhatsapp = useMemo(() => {
        if (board?.type === 'Opportunities' && whatsappField) {
            const allRows = contactsRelationData ? contactsRelationData.pages.flatMap((d) => d.data) : [];
            return allRows.some((row) => row.fields[whatsappField._id]);
        }
        return false;
    }, [board, record, contactsRelationData, whatsappField]);

    return (
        <Space size={0} direction="vertical" align="stretch" className={styles.header}>
            {dialogsHolder}
            <Space size={8} direction="vertical" align="stretch">
                <Space size={12} justify="end">
                    <IconButton
                        size="s"
                        type="primary"
                        variant="text"
                        sx={{ fontSize: '24px' }}
                        disabled={!isDirty || isLoading || readOnly}
                        onClick={onSubmit}
                        loading={isLoading}
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
                    <ShareButton id={record._id} link={`${env.VITE_APP_HOST}/crm/${board._id}/${record._id}`} />
                    <IconButton
                        disabled={record.created_type !== 'manual' || readOnly}
                        size="s"
                        type="danger"
                        variant="text"
                        loading={isLoading}
                        sx={{ fontSize: '24px', color: '#EE7D7D', '&:hover': { color: '#EE7D7D' } }}
                        onClick={() => deleteRecord.mutate()}
                    >
                        <Icon name="delete" />
                    </IconButton>
                    {extraOperation}
                </Space>

                <Space size={12}>
                    <Space size={8} direction="vertical" align="start">
                        {identifierField && (
                            <EditableIdentifier
                                value={recordName}
                                fieldId={identifierField?._id}
                                recordId={record._id}
                                readonly={readOnly}
                                updateData={onDataUpdate}
                            />
                        )}
                        <Space size={4} direction="vertical" align="start">
                            <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>{`${t('last_updated')} ${dayjs(
                                updatedAt ?? createdAt,
                            ).format('MM/DD/YYYY h:mm A')}`}</Typography>
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
            </Space>
        </Space>
    );
};

const EditableField = ({
    field,
    record,
    value,
    onDataUpdate,
    readOnly,
    onUploadDocument,
}: {
    field: API.BoardField;
    record: API.BoardItem;
    value: RecordValue;
    onDataUpdate: (data: { fieldId: string; value: RecordValue; recordId: string }) => Promise<void>;
    readOnly?: boolean;
    onUploadDocument?: (initValue: AttachmentValue[], fieldId: string) => void;
}) => {
    const { type, name, _id } = field;
    const valueEnum = field.data?.reduce((prev, current) => {
        return {
            ...prev,
            [current._id]: current.value,
        };
    }, {});

    if (type === 'Notes') {
        return (
            <Notes
                fieldName={name}
                bordered
                containerStyle={{ width: '100%' }}
                notes={value as API.NotesValue[]}
                onChange={(notes) => {
                    onDataUpdate({ fieldId: _id, value: notes as API.RecordValue, recordId: record._id });
                }}
                readOnly={readOnly}
            />
        );
    }

    if (type === 'Attachment') {
        const maxAttachment = 10;
        return (
            <Space key={_id} size={4} direction="vertical" align="start" style={{ width: '100%', marginBottom: '16px' }}>
                <Space justify="between" size={8} style={{ color: 'var(--color-light-5)', fontSize: 20, width: '100%' }}>
                    <Space>
                        {FieldTypeIcon(type)}
                        <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                            {name}
                        </Typography>
                    </Space>
                    <div>
                        <Tooltip
                            title={t('error_max_attach_files', { max: maxAttachment })}
                            disableHoverListener={(value ? (value as AttachmentValue[]) : []).length < maxAttachment}
                            placement="top-start"
                            arrow
                        >
                            <span>
                                <Button
                                    variant="link"
                                    startIcon={<Icon name="add" />}
                                    disabled={(value ? (value as AttachmentValue[]) : []).length >= maxAttachment || readOnly}
                                    text="Upload Documents"
                                    size="s"
                                    type="primary"
                                    sx={{ fontWeight: '400' }}
                                    onClick={() => {
                                        onUploadDocument?.(value as AttachmentValue[], _id);
                                    }}
                                />
                            </span>
                        </Tooltip>
                    </div>
                </Space>
                <Space size={4} direction="vertical" align="start" style={{ width: '100%', paddingLeft: '12px', paddingTop: '10px' }}>
                    <Attachment
                        value={value as AttachmentValue[]}
                        fieldId={_id}
                        onUpdate={async (newValue?: AttachmentValue[]) => {
                            if (_id) {
                                await onDataUpdate({
                                    fieldId: _id,
                                    recordId: record._id,
                                    value: newValue,
                                });
                            }
                        }}
                    />
                </Space>
            </Space>
        );
    }

    return (
        <>
            <Space key={_id} size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                <Space size={8} style={{ color: 'var(--color-light-5)', fontSize: 20 }}>
                    {FieldTypeIcon(type)}
                    <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                        {name}
                    </Typography>
                </Space>
                <EditableColumn
                    fieldType={type}
                    value={value as API.RecordValue}
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
        </>
    );
};

export const DetailFields = ({
    onUploadDocument,
    board,
    record,
    onDataUpdate,
    readOnly,
    formValues,
}: {
    onUploadDocument: (initValue: AttachmentValue[], fieldId: string) => void;
    board: API.Board;
    record: API.BoardItem;
    onDataUpdate: (data: { fieldId: string; value: RecordValue; recordId: string }) => Promise<void>;
    readOnly?: boolean;
    formValues: RecordValue;
}) => {
    const { t } = useTranslation();

    const headerFields = getHeaderFields(board);
    const headerFieldNames = headerFields.fields.map((f) => f.name);

    return (
        <div style={{ flex: 1, width: '100%', overflow: 'hidden' }}>
            <SimpleBar style={{ width: '100%', height: '100%' }}>
                <Space size={16} direction="vertical" className={styles.body}>
                    {board.fields
                        .filter((field) => {
                            return !field.is_identifier && !field.hidden_on_record && !headerFieldNames.includes(field.name as any);
                        })
                        .map((field) => {
                            const value = formValues ? (formValues[field._id as keyof typeof formValues] as RecordValue) : '';
                            return (
                                <EditableField
                                    onUploadDocument={onUploadDocument}
                                    value={value}
                                    field={field}
                                    record={record}
                                    onDataUpdate={onDataUpdate}
                                    readOnly={readOnly}
                                />
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
                        color: 'var(--color-light-9)',
                    },
                    mr: 1,
                }}
            >
                <Icon name="backIos" />
            </ListItemIcon>
            <Typography variant="BodyTight" style={{ color: 'var(--color-light-9)' }}>
                {t('menu_crm')}
            </Typography>
        </ListItemButton>
    );
};

const TopField = ({
    title,
    value,
    selectedOptionStyle,
    menuOptions,
    isDate,
    isCurrency,
    isNumber,
    isAssignee,
    onChange,
    disabled = false,
    field,
    readOnly,
    board,
}: {
    title: string;
    value: RecordValue;
    selectedOptionStyle?: React.CSSProperties;
    menuOptions?: { text: string; textColor?: string; icon?: React.ReactNode; handler: () => void }[];
    isDate?: boolean;
    isCurrency?: boolean;
    isNumber?: boolean;
    isAssignee?: boolean;
    onChange?: (value: string) => void;
    disabled?: boolean;
    field?: API.BoardField;
    readOnly?: boolean;
    board?: API.Board;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const [isFocus, setIsFocus] = useState(false);
    const formControlRef = useRef<HTMLDivElement>(null);
    const [isTextTruncated, setIsTextTruncated] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);
    const [errorTooltip, setErrorTooltip] = useState({
        open: false,
        message: '',
    });

    useEffect(() => {
        const element = textRef.current;
        if (element) {
            setIsTextTruncated(element.scrollWidth > element.clientWidth);
        }
    }, [value]);

    const togglePopover = () => {
        if (anchorEl) {
            setAnchorEl(null);
        } else {
            setAnchorEl(containerRef.current);
        }
    };

    const renderValue = () => {
        if (isCurrency) {
            if (value) {
                if (typeof value === 'object' && 'amounts' in value && 'currency_code' in value) {
                    return `${value.currency_code} ${value.amounts}`;
                }
                return value;
            }
            return '';
        }
        if (isDate) {
            return value ? dayjs(value as string).format('MM/DD/YYYY') : '';
        }
        if (isAssignee) {
            if (value && typeof value === 'object' && 'display_name' in value) {
                return value.display_name;
            } else {
                const users = queryClient.getQueryData<Record<string, string>[]>(['TopField', { type: 'Assignee', fieldId: field?._id || '' }]);
                const user = users?.find((user: Record<string, string>) => user.value === value);
                return user?.text;
            }
        }
        return value;
    };

    const TextContent = (
        <Typography
            ref={textRef}
            style={{
                textAlign: 'start',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                ...selectedOptionStyle,
            }}
        >
            {renderValue() as string}
        </Typography>
    );

    const renderPopover = () => {
        if (isCurrency) {
            return (
                <Popover
                    open={open}
                    style={{ width: anchorEl?.offsetWidth }}
                    anchorEl={anchorEl}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    disableAutoFocus
                    disableEnforceFocus
                    disablePortal
                    slotProps={{
                        paper: {
                            sx: {
                                padding: '8px',
                            },
                        },
                    }}
                    onClose={() => {
                        if (!isFocus) {
                            togglePopover();
                        }
                    }}
                >
                    <div
                        style={{ width: '100%' }}
                        onMouseEnter={() => {
                            setIsFocus(true);
                        }}
                        onMouseLeave={() => {
                            setIsFocus(false);
                        }}
                    >
                        <FieldCurrency
                            fullWidth
                            sx={{
                                minWidth: 'auto',
                                height: '38px',
                                background: 'white',
                            }}
                            InputProps={{ ref: formControlRef }}
                            formControlSx={{ width: '100%', minWidth: 'auto' }}
                            defaultCurrency={field?.settings?.default_currency_code}
                            value={value && typeof value === 'object' && 'amounts' in value && 'currency_code' in value ? value : undefined}
                            placeholder={''}
                            onChange={(currencyValue) => {
                                onChange?.(currencyValue as string);
                            }}
                        />
                    </div>
                </Popover>
            );
        }
        if (isNumber) {
            return (
                <Popover
                    open={open}
                    style={{ width: anchorEl?.offsetWidth }}
                    anchorEl={anchorEl}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    slotProps={{
                        paper: {
                            sx: {
                                // width: 300,
                                padding: '8px',
                            },
                        },
                    }}
                    onClose={() => {
                        // togglePopover();
                    }}
                >
                    <div
                        style={{ width: '100%' }}
                        onFocus={() => {
                            setIsFocus(true);
                        }}
                        onBlur={() => {
                            setIsFocus(false);
                        }}
                    >
                        <Tooltip open={errorTooltip.open} title={errorTooltip.message} disableFocusListener placement="top" arrow>
                            <div style={{ width: '100%' }}>
                                <FieldNumber
                                    value={value}
                                    onChange={async (e, isValidNumber) => {
                                        if (!isValidNumber) {
                                            setErrorTooltip({
                                                open: true,
                                                message: t('crm_number_field_validation_tooltip'),
                                            });
                                            return;
                                        }
                                        setErrorTooltip((prev) => ({
                                            ...prev,
                                            open: false,
                                        }));
                                        onChange?.(e.target.value ? (e.target.value as string) : '');
                                    }}
                                />
                            </div>
                        </Tooltip>
                    </div>
                </Popover>
            );
        }
        if (isDate) {
            return (
                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={() => {
                        togglePopover();
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    slotProps={{
                        paper: {
                            sx: {
                                overflow: 'visible',
                                borderRadius: '8px',
                                marginTop: '4px',
                                paddingBottom: '12px',
                                boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                            },
                        },
                    }}
                >
                    <div
                        onMouseEnter={() => {
                            setIsFocus(true);
                        }}
                        onMouseLeave={() => {
                            setIsFocus(false);
                        }}
                    >
                        <LocalizationProvider dateAdapter={AdapterDayjs}>
                            <StaticDatePicker
                                value={dayjs(new Date())}
                                onChange={(date) => {
                                    setIsFocus(false);
                                    onChange?.(date?.toISOString() || '');
                                    togglePopover();
                                }}
                            />
                        </LocalizationProvider>
                    </div>
                </Popover>
            );
        }
        if (isAssignee) {
            return (
                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={() => {
                        togglePopover();
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    slotProps={{
                        paper: {
                            sx: {
                                overflow: 'visible',
                                borderRadius: '8px',
                                marginTop: '4px',
                                paddingBottom: '4px',
                                boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                            },
                        },
                    }}
                >
                    <div
                        style={{ width: anchorEl?.offsetWidth }}
                        onMouseEnter={() => {
                            setIsFocus(true);
                        }}
                        onMouseLeave={() => {
                            setIsFocus(false);
                        }}
                    >
                        <FieldSelect<string | number>
                            queryKey={['TopField', { type: 'Assignee', fieldId: field?._id || '' }]}
                            fullWidth
                            InputProps={{ ref: formControlRef }}
                            formControlSx={{ width: '100%', minWidth: '300' }}
                            value={value as string | number}
                            onChange={(v) => {
                                onChange?.(v as string);
                            }}
                            placeholder={''}
                            {...(value && {
                                onReset: () => {
                                    onChange?.('');
                                },
                            })}
                            request={async () => {
                                const { data } = await apiFetch<API.User[]>(getMembers.api, getMembers.method, {
                                    status: 'active',
                                });
                                return data.map(user => ({
                                    value: user.id,
                                    text: user.display_name
                                }));
                            }}
                        />
                    </div>
                </Popover>
            );
        }
        if (menuOptions?.length && menuOptions?.length > 0) {
            return (
                <DropdownMenu
                    open={open}
                    onClose={togglePopover}
                    disableAutoFocusItem
                    anchorEl={anchorEl}
                    anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'left',
                    }}
                    transformOrigin={{
                        vertical: 'top',
                        horizontal: 'left',
                    }}
                    disableEnforceFocus
                    sx={{
                        '& .MuiPaper-root': {
                            marginTop: '4px',
                            width: anchorEl?.offsetWidth,
                        },
                    }}
                >
                    {menuOptions?.map((option, index) => {
                        return (
                            <div>
                                <DropdownMenuItem
                                    sx={{
                                        padding: '8px 16px',
                                        '&:hover': {
                                            backgroundColor: '#F5F5F5',
                                        },
                                    }}
                                    onClick={() => {
                                        option.handler?.();
                                        setAnchorEl(null);
                                        onChange?.(option.text);
                                    }}
                                >
                                    <Space style={{ marginRight: '16px' }}>{option.icon}</Space>
                                    {option.text && <Typography style={{ color: option.textColor }}>{option.text}</Typography>}
                                </DropdownMenuItem>
                            </div>
                        );
                    })}
                </DropdownMenu>
            );
        }
        return null;
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '33%',
                height: '75px',
                backgroundColor: '#FAFAFA',
                paddingTop: '16px',
                paddingLeft: '24px',
            }}
            onClick={() => {
                if (!disabled && !isFocus && !readOnly) {
                    togglePopover();
                }
            }}
        >
            <Space size={8} direction="vertical" align="start">
                <Space size={8} direction="vertical" justify="start" style={{ width: '100%' }}>
                    <Typography style={{ textAlign: 'start', width: '100%', color: 'var(--color-light-5)' }}>{title}</Typography>
                    {isTextTruncated ? <Tooltip title={renderValue() as string}>{TextContent}</Tooltip> : TextContent}
                </Space>
            </Space>
            {renderPopover()}
        </div>
    );
};

const HEADER_FIELDS = {
    TASK: {
        PRIORITY: 'Priority',
        DUE_DATE: 'Due Date',
        STATUS: 'Status',
        TYPE: 'Type',
        ASSIGNEE: 'Assignee',
        TASK_OWNER: 'Task Owner',
    },
    PRODUCT: {
        UNIT_PRICE: 'Unit Price',
        SOLD: 'Sold',
        STOCK: 'In Stock',
        ID: 'ID',
        TAGS: 'Tags',
        DESCRIPTION: 'Description',
    },
    OPPORTUNITY: {
        PRIORITY: 'Priority',
        STAGE: 'Stage',
        TYPE: 'Type',
        ASSIGNEE: 'Assignee',
        OWNER: 'Owner',
    },
} as const;

const COLOR_MAPS = {
    PRIORITY: {
        Low: '#41E680',
        Medium: '#FBB351',
        High: '#EA5567',
        'Very High': 'rgba(175, 2, 2, 1)',
    },
    STATUS: {
        Backlogs: '#828282',
        'To-Dos': 'rgb(100, 100, 100)',
        'In-Progress': '#14AC4E',
        'In-Review': '#FA9917',
        Done: '#3399FC',
    },
} as const;

const getHeaderFields = (board: API.Board) => {
    const findField = (name: string) => board?.fields.find((field) => field.name === name && field.is_default);
    switch (board?.type) {
        case 'Tasks':
            return {
                fields: Object.values(HEADER_FIELDS.TASK).map((name) => ({
                    name,
                    field: findField(name),
                })),
                topFields: [
                    HEADER_FIELDS.TASK.PRIORITY,
                    HEADER_FIELDS.TASK.DUE_DATE,
                    HEADER_FIELDS.TASK.STATUS,
                    HEADER_FIELDS.TASK.TASK_OWNER,
                ],
                bottomFields: [HEADER_FIELDS.TASK.TYPE, HEADER_FIELDS.TASK.ASSIGNEE],
            };
        case 'Products':
            return {
                fields: Object.values(HEADER_FIELDS.PRODUCT).map((name) => ({
                    name,
                    field: findField(name),
                })),
                topFields: [
                    HEADER_FIELDS.PRODUCT.UNIT_PRICE,
                    HEADER_FIELDS.PRODUCT.SOLD,
                    HEADER_FIELDS.PRODUCT.STOCK,
                    HEADER_FIELDS.PRODUCT.ID,
                ],
                bottomFields: [HEADER_FIELDS.PRODUCT.TAGS, HEADER_FIELDS.PRODUCT.DESCRIPTION],
            };
        case 'Opportunities':
            return {
                fields: Object.values(HEADER_FIELDS.OPPORTUNITY).map((name) => ({
                    name,
                    field: findField(name),
                })),
                topFields: [HEADER_FIELDS.OPPORTUNITY.PRIORITY, HEADER_FIELDS.OPPORTUNITY.STAGE, HEADER_FIELDS.OPPORTUNITY.OWNER],
                bottomFields: [HEADER_FIELDS.OPPORTUNITY.TYPE, HEADER_FIELDS.OPPORTUNITY.ASSIGNEE],
            };
        default:
            return { fields: [], topFields: [], bottomFields: [] };
    }
};

const FixedHeaderFields = ({
    board,
    record,
    onDataUpdate,
    formValues,
    readOnly,
}: {
    board: API.Board;
    record: API.BoardItem;
    onDataUpdate: (data: { fieldId: string; value: RecordValue; recordId: string }) => Promise<void>;
    formValues: RecordValue;
    readOnly?: boolean;
}) => {
    const headerFields = getHeaderFields(board);
    const fieldsMap = Object.fromEntries(headerFields.fields.map(({ name, field }) => [name, field]));

    const getValue = (fieldName: string) => {
        const field = fieldsMap[fieldName];
        if (fieldName === 'Task Owner') {
            return record?.created_by || '';
        }
        if (fieldName === 'ID') {
            return record?._id || '';
        }
        return (formValues as Record<string, RecordValue>)[field?._id || ''];
    };

    const renderTopFields = () => (
        <Space justify="between" style={{ width: '100%', marginBottom: '16px' }} direction="horizontal">
            {headerFields.topFields.map((fieldName) => {
                const field = fieldsMap[fieldName];
                const value = getValue(fieldName);
                const isDate = fieldName.includes('Date');
                const isPriority = fieldName === HEADER_FIELDS.TASK.PRIORITY;
                const isStatus = fieldName === HEADER_FIELDS.TASK.STATUS;
                const isCurrency = fieldName === HEADER_FIELDS.PRODUCT.UNIT_PRICE;
                const isNumber = fieldName === HEADER_FIELDS.PRODUCT.STOCK || fieldName === HEADER_FIELDS.PRODUCT.SOLD;
                const isAssignee = fieldName === HEADER_FIELDS.OPPORTUNITY.OWNER;
                const isDisabled = fieldName === HEADER_FIELDS.TASK.TASK_OWNER || fieldName === HEADER_FIELDS.PRODUCT.ID;

                return (
                    <TopField
                        key={fieldName}
                        title={fieldName}
                        value={value}
                        selectedOptionStyle={{
                            ...(isPriority && { color: COLOR_MAPS.PRIORITY[value as keyof typeof COLOR_MAPS.PRIORITY] }),
                            ...(isStatus && { color: COLOR_MAPS.STATUS[value as keyof typeof COLOR_MAPS.STATUS] }),
                            ...(isDisabled && { textDecoration: 'underline' }),
                            ...(fieldName === HEADER_FIELDS.PRODUCT.STOCK && {
                                color: value === '' ? '#828282' : Number(value) > 0 ? '#14AC4E' : 'rgb(234, 85, 103)',
                            }),
                        }}
                        isCurrency={isCurrency}
                        isDate={isDate}
                        isNumber={isNumber}
                        isAssignee={isAssignee}
                        disabled={isDisabled}
                        menuOptions={
                            field?.data?.map((item) => ({
                                text: item.value,
                                ...(isPriority && { textColor: COLOR_MAPS.PRIORITY[item.value as keyof typeof COLOR_MAPS.PRIORITY] }),
                                ...(isStatus && { textColor: COLOR_MAPS.STATUS[item.value as keyof typeof COLOR_MAPS.STATUS] }),
                                handler: () => {},
                            })) || []
                        }
                        onChange={(newValue) => {
                            if (field) {
                                onDataUpdate({ fieldId: field._id || '', value: newValue, recordId: record._id });
                            }
                        }}
                        field={field}
                        board={board}
                        readOnly={readOnly}
                    />
                );
            })}
        </Space>
    );

    return (
        <Space size={16} direction="vertical" style={{ width: '100%', paddingTop: '16px', paddingLeft: '28px', paddingRight: '24px' }}>
            <Space style={{ width: '100%', borderBottom: '1px solid var(--color-light-3)', paddingBottom: '16px' }} direction="vertical">
                {renderTopFields()}
                {headerFields.bottomFields.map((fieldName) => {
                    const field = fieldsMap[fieldName];
                    if (!field) return null;
                    return (
                        <EditableField
                            key={fieldName}
                            field={field}
                            record={record}
                            value={getValue(fieldName)}
                            onDataUpdate={onDataUpdate}
                            readOnly={readOnly}
                        />
                    );
                })}
            </Space>
        </Space>
    );
};

const RecordDetailEnhance = (props: RecordDetailProps) => {
    const { board, record, refresh, inModal, readOnly } = props;
    const [{ dialog, dialogForm }, dialogsHolder] = useDialog();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const { onMultipleFieldsUpdate } = useRecordDetailHelper({
        board,
        record,
        refresh: async () => {
            await refresh();
        },
        dialog,
        crm: true,
    });

    const methods = useForm<Record<string, API.RecordValue>>({
        mode: 'all',
        defaultValues: record?.fields,
    });

    const {
        control,
        formState: { isDirty, isValid },
        handleSubmit,
        setValue,
        watch,
        reset,
    } = methods;

    useEffect(() => {
        if (record?.fields) {
            reset(record.fields);
        }
    }, [record, reset]);

    const formValues = watch();

    const onDataUpdate = async (data: { fieldId: string; value: RecordValue; recordId: string }) => {
        setValue(data.fieldId, data.value as any, { shouldDirty: true });
    };

    const crmMatch = useMatch({
        path: '/crm/:boardId/:recordId',
        end: true,
        caseSensitive: true,
    });

    if (!board || !record) {
        return <Illustration name="recordMissing2" description={t('no_associated_records_found')} />;
    }

    const onUploadDocument = (initValue: AttachmentValue[] = [], fieldId: string) => {
        dialogForm<UploadFormType>({
            title: `${t('upload_attach_files_modal_title')} (${initValue?.length || 0}/10)`,
            content: (methods) => (
                <UploadDocuments
                    methods={methods}
                    max={10}
                    leftAmounts={10 - (initValue?.length || 0)}
                    uploadProps={{
                        fileValidation: (file) => Promise.resolve(true),
                        accept: '*',
                        multiple: true,
                    }}
                    hint={t('upload_attach_files_modal_description', { max: 10 })}
                />
            ),
            defaultValues: {
                url: '',
                files: [],
            },
            onConfirm: async (data) => {
                const newFiles = data.files
                    ? data.files.map((file) => ({
                          type: 'file',
                          data: {
                              name: file.name,
                              url: '',
                              extension: file.file?.type,
                          },
                          extra: {
                              ...file,
                              type: file.file?.type,
                          },
                      }))
                    : [];

                const newUrlFile = data.url
                    ? [
                          {
                              type: 'url',
                              data: {
                                  name: data.url,
                                  url: data.url,
                                  extension: 'url',
                              },
                              extra: {
                                  id: `${(initValue || []).length}`,
                                  name: data.url,
                                  url: data.url,
                                  isValid: true,
                                  status: 'ok' as FileStatus,
                              },
                          },
                      ]
                    : [];

                const attachmentValue = [...(initValue || []), ...newFiles, ...newUrlFile];

                onDataUpdate({ fieldId, value: attachmentValue as AttachmentValue[], recordId: record._id });
                return true;
            },
            onClose: () => {},
            actionsAlign: 'flex-start',
            hideCancelButton: true,
            confirmText: t('upload_attach_files_button'),
            confirmButtonProps: {
                size: 'default',
            },
            showCloseButton: true,
        });
    };

    const onSubmit = async (data: Record<string, API.RecordValue>) => {
        try {
            setIsLoading(true);
            const updatedRecord = await onMultipleFieldsUpdate(record?._id || '', data);
            reset(updatedRecord?.fields || record?.fields);
            setIsLoading(false);
        } catch (error) {
            setIsLoading(false);
        }
    };

    return (
        <Space size={0} direction="vertical" className={styles.container} align="stretch">
            {dialogsHolder}
            <CRMBackButton boardId={crmMatch?.params?.boardId || ''} />
            <DetailHeader
                isDirty={isDirty}
                formValues={formValues}
                board={board}
                record={record}
                onDataUpdate={onDataUpdate}
                onSubmit={() => handleSubmit(onSubmit)()}
                isLoading={isLoading}
                readOnly={readOnly}
            />
            <FixedHeaderFields readOnly={readOnly} board={board} record={record} onDataUpdate={onDataUpdate} formValues={formValues} />
            <DetailFields
                onUploadDocument={onUploadDocument}
                board={board}
                record={record}
                onDataUpdate={onDataUpdate}
                readOnly={readOnly}
                formValues={formValues}
            />
        </Space>
    );
};

export default RecordDetailEnhance;
