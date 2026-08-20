import { Breadcrumb, Copy, EllipsisText, FieldSelect, Icon, List, Space, Typography, useDialog, useModal, Button } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Iframe, LoadingContainer } from '@/components/HelpCenter';
import { env } from '@/env';
import store, { history } from '@/redux/store';
import { deleteForm, getEmailTemplates } from '@/services/api/app';
import { putBoardField } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { type MarketPlaceMessageEvent, postMessage } from '@/utils/postMessage';
import QRCodeInfo from '../Campaign/components/QRCode';
import { TouchpointOperationModal } from '../Campaign/components/TouchpointOperation';
import type { FieldType as DataBoardFieldType } from '../Databoards/components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import OperationDataBoardFieldForm, {
    FieldSchema as DataBoardFieldSchema,
} from '../Databoards/components/BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import DuplicatedRecord from './businessContactCollector/duplicatedRecord';
import {
    ADD_FORM_FIELD,
    BOARD_ACCESS_WARNING,
    CHANGE_STEP,
    CLOSE,
    CREATE_NEW,
    DELETE_FORM,
    DUPLICATION_FOUND,
    EDIT_FIELD,
    EDIT_FORM_FIELD,
    EDIT_FORM_FOOTER,
    EDIT_FORM_HEADER,
    NOT_ABLE_TO_SAVE,
    OPEN_SELECT_TOUCHPOINT,
    OPEN_SHARE,
    OPEN_STARTER,
    OPEN_SUPPORT_CENTER,
    REFETCH_SELECT,
    REFRESH,
    ROUTE,
    SAVE_AND_EXIT,
    SAVE_AS_NEW_TEMPLATE,
    SELECT_TOUCHPOINT,
    SEND_ANOTHER_ONE,
    SET_BREADCRUMB,
    SET_LANGUAGE,
    SKIP,
    USE_TEMPLATE,
    DELETE_AI_ASSISTANT,
    BACK_TO_MENU,
    OPEN_KNOWLEDGE_HUB,
    OPEN_WORKFLOW_FUNCTIONS,
    SELECT_KNOWLEDGE_HUB_BOARD,
    SELECT_WORKFLOW_FUNCTIONS,
    SAVE_AND_EXIT_BEFORE_CLOSE,
    SHOW_CREATE_AI_ASSISTANT_SUCCESS,
    SHOW_FINANCIAL_MANAGEMENT_FILE_ERROR,
    SHOW_FINANCIAL_MANAGEMENT_FILE_CONTENT,
    ADD_NEW_COLUMN_TO_FINANCIAL_FILE,
    EDIT_FINANCIAL_MANAGEMENT_FILE,
    DELETE_FINANCIAL_MANAGEMENT_FILE,
    RESET_FINANCIAL_FILE,
} from './constants';
import EmailPreview from './emailCampaign/emailPreview';
import EmailTemplateForm from './emailCampaign/emailTemplateForm';
import { type EmailTemplatePayload, handleCreateEmailTemplate } from './emailCampaign/emailTemplates';
import AccessWarningModal from './formManagement/accessWarningModal';
import type { FooterFormType } from './formManagement/editFooterForm';
import EditFooterForm, { FooterFormSchema } from './formManagement/editFooterForm';
import type { HeaderFormType } from './formManagement/editHeaderForm';
import EditHeaderForm, { HeaderFormSchema } from './formManagement/editHeaderForm';
import ExistingForms from './formManagement/existingForms';
import type { FieldType } from './formManagement/operationFieldForm';
import OperationFieldForm, { FieldSchema } from './formManagement/operationFieldForm';
import styles from './journeys.module.scss';
import KnowledgeHubBoardSelection from './AIAssistantManagement/KnowledgeHubBoardSelection';
import { useNavigate } from 'react-router-dom';
import { AIAssistantChannelAdding } from './AIAssistantManagement/AIAssistantChannelAdding';
import { z } from 'zod';
import { replaceChannel } from '@/services/api/channel';
import { notify } from '@/utils/notify';
import WorkflowFunctionsSelection from './AIAssistantManagement/WorkflowFunctionsSelection';
import FinancialFileError from './FinacialReportManagement/FinancialFileError';
import FinancialFileContent from './FinacialReportManagement/FinancialFileContent';
import { AddNewColumn } from './FinacialReportManagement/AddNewColumn';
import { EditFinancalFile } from './FinacialReportManagement/EditFinancalFile';
import {
    deleteFinancialFile,
    deleteFinancialReport,
    resetFinancialFile,
    updateFinancialFile,
    updateFinancialReport,
} from '@/services/api/financialReport';

const onUpdateField = async ({
    boardId,
    fieldId,
    data,
}: {
    boardId: string;
    fieldId: string;
    data: DataBoardFieldType & {
        hidden: boolean;
    };
}) => {
    return apiFetch(putBoardField.api(boardId, fieldId), putBoardField.method, data);
};

export const IframeContainer = ({
    url,
    onClose,
    id,
    title,
    appType,
    handleOpenHelpCenter,
    changeTitle,
    journey,
    iframeRef,
    onIframeRef,
}: {
    url: string;
    id: string;
    onClose: () => void | (() => void);
    title?: string | React.ReactNode;
    appType: 'marketplace' | 'customization';
    handleOpenHelpCenter?: (prefillMessage?: string) => void;
    changeTitle?: (title: string | ReactNode) => void;
    iframeRef: RefObject<HTMLIFrameElement>;
    onIframeRef: (el: HTMLIFrameElement | null) => void;
    journey?: API.Journey;
}) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(url ? true : false);
    const { t, i18n } = useTranslation();
    const languageRef = useRef(i18n.language);
    const [{ dialogForm, dialog }, dialogHolder] = useDialog();
    const [{ modal }, modalHolder] = useModal();

    const updateField = useMutation({
        mutationFn: onUpdateField,
    });

    useEffect(() => {
        postMessage({
            action: SET_LANGUAGE,
            data: {
                language: i18n.language,
            },
            target: iframeRef.current?.contentWindow,
            origin: env.VITE_APP_ENV === 'local' ? '*' : env.VITE_APP_WCS_HOST,
        });
    }, [i18n.language, iframeRef]);

    const iframeUrl = useMemo(() => {
        if (env.VITE_APP_ENV === 'local') {
            const newUrl = new URL(url);
            newUrl.searchParams.append('ac', localStorage.getItem('imbrace-access-token') || '');
            newUrl.searchParams.append('t', id);
            newUrl.searchParams.append('lang', languageRef.current ?? 'en');
            return `${document.location.origin}/marketplace/iframe${newUrl
                .toString()
                .slice(newUrl.toString().indexOf('co/') + 2, newUrl.toString().length)}`;
        }
        const newUrl = new URL(url);

        if (newUrl.host.includes('imbrace.co')) {
            newUrl.searchParams.append('ac', localStorage.getItem('imbrace-access-token') || '');
            if (appType === 'marketplace') {
                newUrl.searchParams.append('t', id);
            }
        }
        newUrl.searchParams.append('lang', languageRef.current ?? 'en');
        return newUrl.toString();
    }, [url, id, appType]);

    const createEmailTemplate = useMutation({
        mutationFn: handleCreateEmailTemplate,
    });

    const openDuplicationDialog = useCallback(
        (
            event: MarketPlaceMessageEvent,
            messageData: { process_type: any; contacts: API.MeilisearchItem[]; payload: any; is_csv: any },
        ) => {
            const type = messageData.process_type;
            dialog({
                title:
                    type === 'individual'
                        ? t('journey_business_contact_collector_duplication_title_individual')
                        : t('journey_business_contact_collector_duplication_title_multiple'),
                content: (methods) => (
                    <Space size={12} align="start" direction="vertical">
                        <Typography style={{ color: 'var(--color-light-5)' }}>
                            {type === 'individual'
                                ? t('journey_business_contact_collector_duplication_desc_individual')
                                : t('journey_business_contact_collector_duplication_desc_multiple')}
                        </Typography>
                        {type === 'individual' ? (
                            <List
                                items={messageData.contacts?.map((item: API.MeilisearchItem, index: number) => {
                                    return {
                                        text: <DuplicatedRecord item={item} crm />,
                                    };
                                })}
                            />
                        ) : null}
                    </Space>
                ),
                cancelText: t('journey_business_contact_collector_duplication_skip_text'),
                confirmText: t('create_new'),
                onClose: async () => {
                    postMessage({
                        event,
                        action: SKIP,
                        origin: event?.origin,
                        data: {
                            type: 'business_contact_collector',
                            payload: messageData.payload,
                            process_type: messageData.process_type,
                            is_csv: messageData.is_csv,
                        },
                    });
                },
                onConfirm: async () => {
                    postMessage({
                        event,
                        action: CREATE_NEW,
                        origin: event?.origin,
                        data: {
                            type: 'business_contact_collector',
                            payload: messageData.payload,
                            process_type: messageData.process_type,
                            is_csv: messageData.is_csv,
                        },
                    });
                },
            });
        },
        [dialog, t],
    );

    const removeForm = useMutation({
        mutationFn: async (formId: string) => {
            await apiFetch(deleteForm.api(formId), deleteForm.method);
        },
    });



    const replaceAIAssistantChannel = useMutation({
        mutationFn: async ({
            data,
        }: {
            data: {
                name: string;
                workflow_id: string;
                channel_type: API.ChannelType;
                channel_id: string;
            };
        }) => {
            return await apiFetch<API.Channel>(replaceChannel.api(), replaceChannel.method, data);
        },
    });

    const openCreateNewTemplates = useCallback(
        (
            event: MarketPlaceMessageEvent,
            defaultValue?: {
                subject: string;
                content: {
                    content: string;
                    files: {
                        name: string;
                        file_id: string;
                        url: string;
                        id: string;
                    }[];
                };
                board_id?: string | undefined;
            },
        ) => {
            dialogForm<EmailTemplatePayload>({
                title: t('journey_new_email_template'),
                defaultValues: defaultValue,
                content: (methods) => <EmailTemplateForm methods={methods} appId={id} disabledAudience />,
                onConfirm: async (formData) => {
                    const template = await createEmailTemplate.mutateAsync({ formData, appId: id });
                    postMessage({
                        event,
                        action: SAVE_AS_NEW_TEMPLATE,
                        data: {
                            subject: template.subject,
                            content: {
                                content: template.body,
                                files: template.attachments.map((attachment) => ({
                                    ...attachment,
                                    id: attachment.file_id,
                                })),
                            },
                            board_id: template.board_id,
                        },
                        origin: event?.origin,
                    });
                    return true;
                },
                onClose: () => {},

                hideCancelButton: true,
                confirmText: t('create'),
                actionsAlign: 'flex-start',
                confirmButtonProps: {
                    size: 'default',
                },
                paperSx: {
                    width: 832,
                    maxWidth: 832,
                },
                showCloseButton: true,
            });
        },
        [id, t, createEmailTemplate, dialogForm],
    );

    const openChoseTemplate = useCallback(
        (event: MarketPlaceMessageEvent, boardId: string) => {
            dialogForm<{ template: string }>({
                title: t('journey_choose_template_to_use'),
                content: ({ control }) => (
                    <Controller
                        control={control}
                        name="template"
                        render={({ field, fieldState: { error } }) => (
                            <FieldSelect
                                fullWidth
                                queryKey={['emailTemplate', { journeyId: id, dataBoard: journey?.data_board }]}
                                placeholder={t('click_to_select')}
                                formControlSx={{
                                    marginTop: '8px',
                                }}
                                searchable
                                {...field}
                                request={async () => {
                                    const searchParams = new URLSearchParams();
                                    // searchParams.append('app_id', id);
                                    const {
                                        data: { data: emailTemplates },
                                    } = await apiFetch<{ data: API.EmailTemplate[] }>(
                                        getEmailTemplates.api(),
                                        getEmailTemplates.method,
                                        searchParams,
                                    );

                                    return emailTemplates.map((emailTemplate) => ({
                                        text: emailTemplate.name,
                                        value: JSON.stringify(emailTemplate),
                                        extra: () => <EmailPreview emailTemplate={emailTemplate} />,
                                        description: `${emailTemplate.category?.name || '—'}`,
                                    }));
                                }}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />
                ),
                onConfirm: async ({ template }) => {
                    if (template) {
                        try {
                            const templateData = JSON.parse(template) as API.EmailTemplate;
                            postMessage({
                                event,
                                action: USE_TEMPLATE,
                                data: {
                                    body: templateData.body,
                                    subject: templateData.subject,
                                    attachments: templateData.attachments,
                                    name: templateData.name,
                                },
                                origin: event?.origin,
                            });
                        } catch (error) {}
                    }

                    return true;
                },
                onClose: () => {},
                hideCancelButton: true,
                confirmText: t('apply'),
                confirmButtonProps: {
                    size: 'default',
                },
                showCloseButton: true,
                actionsAlign: 'flex-start',
            });
        },
        [id, t, dialogForm, journey?.data_board],
    );

    const openFormManagementStarter = useCallback(
        (event: MarketPlaceMessageEvent) => {
            const onRoute = (targetUrl: string) => {
                postMessage({
                    action: ROUTE,
                    data: {
                        url: targetUrl,
                    },
                    event,
                    origin: event?.origin,
                });
            };
            const onOpenStarter = () => {
                openFormManagementStarter(event);
            };
            dialog({
                title: t('journey_starter_title'),
                content: ({ onClose: onDialogClose }) => (
                    <Space size={16} style={{ marginTop: '8px' }}>
                        <Space
                            direction="vertical"
                            size={12}
                            className={styles.card}
                            style={{ flex: 1, height: '142px' }}
                            onClick={() => {
                                onDialogClose?.();
                                postMessage({
                                    action: ROUTE,
                                    data: {
                                        url: '/form-management/form/create',
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            }}
                        >
                            <Space justify="between" style={{ width: '100%' }}>
                                <div style={{ width: '32px', height: '32px' }}>
                                    <Icon
                                        name="formAdd"
                                        style={{
                                            fontSize: 32,
                                            color: 'var(--color-secondary-3)',
                                        }}
                                    />
                                </div>
                            </Space>
                            <Space
                                size={0}
                                direction="vertical"
                                align="start"
                                justify="end"
                                style={{ overflow: 'hidden', width: '100%', height: 64 }}
                            >
                                <EllipsisText
                                    element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                    text={t('journey_start_new_form')}
                                />
                                <div style={{ maxHeight: '40px' }}>
                                    <EllipsisText
                                        element={
                                            <Typography
                                                variant="Body"
                                                style={{
                                                    color: 'var(--color-secondary-3)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    WebkitLineClamp: 2,
                                                    display: '-webkit-box',
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            />
                                        }
                                        text={t('journey_start_new_form_desc')}
                                        whiteSpace="pre-wrap"
                                    />
                                </div>
                            </Space>
                        </Space>
                        <Space
                            direction="vertical"
                            size={12}
                            className={styles.card}
                            style={{ flex: 1, height: '140px' }}
                            onClick={() => {
                                onDialogClose?.();
                                modal({
                                    hideHeader: true,
                                    content: ({ onClose: onModalClose }) => (
                                        <ExistingForms onClose={onModalClose} onRoute={onRoute} onOpenStarter={onOpenStarter} />
                                    ),
                                    paperSx: {
                                        margin: '112px 100px',
                                        maxWidth: '1080px',
                                        height: 'calc(100vh - 224px)',
                                    },
                                });
                            }}
                        >
                            <Space justify="between" style={{ width: '100%' }}>
                                <div style={{ width: '32px', height: '32px' }}>
                                    <Icon
                                        name="form"
                                        style={{
                                            fontSize: 32,
                                            color: 'var(--color-secondary-3)',
                                        }}
                                    />
                                </div>
                            </Space>
                            <Space
                                size={0}
                                direction="vertical"
                                align="start"
                                justify="end"
                                style={{ overflow: 'hidden', width: '100%', height: 62 }}
                            >
                                <EllipsisText
                                    element={<Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }} />}
                                    text={t('journey_start_with_existing_form')}
                                />
                                <div style={{ maxHeight: '40px' }}>
                                    <EllipsisText
                                        element={
                                            <Typography
                                                variant="Body"
                                                style={{
                                                    color: 'var(--color-secondary-3)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    WebkitLineClamp: 2,
                                                    display: '-webkit-box',
                                                    WebkitBoxOrient: 'vertical',
                                                }}
                                            />
                                        }
                                        text={t('journey_start_with_existing_form_desc')}
                                        whiteSpace="pre-wrap"
                                    />
                                </div>
                            </Space>
                        </Space>
                    </Space>
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperSx: {
                    width: 600,
                },
            });
        },
        [t, dialog, modal],
    );

    const openFormManagementShare = useCallback(
        (form: FormManagement.Form) => {
            const formUrl = `${env.VITE_APP_WCS_HOST}/form-management/form/${form._id}`;
            dialog({
                title: (
                    <Space align="start" size={8} direction="vertical">
                        <Typography variant="Heading2">{form.name}</Typography>
                        <Typography style={{ color: 'var(--color-light-5)' }}>
                            {t('journey_form_management_public_share_desc', { name: form.board_name })}
                        </Typography>
                    </Space>
                ),
                content: () => (
                    <Space direction="vertical" align="start" size={24} style={{ marginTop: '8px', width: '100%' }}>
                        <Space size={12} align="end" style={{ width: '100%' }}>
                            <Space style={{ flex: 1, overflow: 'hidden' }} direction="vertical" align="start" size={8}>
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    {t('journey_form_management_public_share_url_and_qr_code')}
                                </Typography>
                                <Copy
                                    displayText={formUrl}
                                    copyValue={formUrl}
                                    copyIcon={<Icon name="linkSide" />}
                                    copyText={t('copy_url')}
                                />
                            </Space>
                            <QRCodeInfo url={formUrl} logo={form.logo} fileName={`${form.name} QR Code`} />
                        </Space>
                        <Space direction="vertical" align="start" size={8}>
                            <Typography style={{ color: 'var(--color-light-5)' }}>
                                {t('journey_form_management_public_embed_code')}
                            </Typography>
                            <Copy
                                displayText={`<iframe src="${formUrl}" />`}
                                copyValue={`<iframe src="${formUrl}" />`}
                                copyIcon={<Icon name="copyCode" />}
                                copyText={t('copy_code')}
                                typographyProps={{
                                    style: {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        WebkitLineClamp: 4,
                                        display: '-webkit-box',
                                        WebkitBoxOrient: 'vertical',
                                    },
                                }}
                                spaceProps={{
                                    align: 'start',
                                }}
                                ellipsisTextProps={{
                                    whiteSpace: 'pre-wrap',
                                }}
                            />
                        </Space>
                    </Space>
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperSx: {
                    width: 600,
                },
            });
        },
        [t, dialog],
    );
    
    const openFinancialFileError = useCallback((event: MarketPlaceMessageEvent) => {
        if (event.data.action === 'SHOW_FINANCIAL_MANAGEMENT_FILE_ERROR' && 'data' in event.data) {
            const { data } = event.data;
            const { id, fileName } = data;
            dialog({
                title: fileName,
                content: ({ onClose: onDialogClose }) => (
                    <FinancialFileError
                        id={id}
                        onClose={() => onDialogClose?.()}
                        onFixSuccess={() => {
                            postMessage({
                                action: 'FIXED_FINANCIAL_MANAGEMENT_FILE_ERROR',
                                data: {
                                    fixedFileId: id,
                                },
                                event,
                                origin: event?.origin,
                            });
                            onDialogClose?.();
                        }}
                    />
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperSx: {
                    maxWidth: '80%',
                    width: '80%',
                    height: '100%',
                },
            });
        }
    }, []);

    const openFinancialFileContent = useCallback((event: MarketPlaceMessageEvent) => {
        if (event.data.action === 'SHOW_FINANCIAL_MANAGEMENT_FILE_CONTENT' && 'data' in event.data) {
            const { data } = event.data;
            const { id, fileName, type } = data;
            dialog({
                title: fileName,
                content: ({ onClose: onDialogClose }) => <FinancialFileContent id={id} onClose={() => onDialogClose?.()} type={type} />,
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperSx: {
                    maxWidth: '80%',
                    width: '80%',
                    height: '100%',
                },
            });
        }
    }, []);

    const addNewColumnFinancialFile = useCallback((event: MarketPlaceMessageEvent) => {
        if (event.data.action === 'ADD_NEW_COLUMN_TO_FINANCIAL_FILE' && 'data' in event.data) {
            const { data } = event.data;
            dialogForm<{
                columnName: string;
                columnType: string;
            }>({
                title: 'Add New Column',
                content: (methods) => (
                    <FormProvider {...methods}>
                        <AddNewColumn methods={methods} />
                    </FormProvider>
                ),
                defaultValues: {
                    columnName: '',
                    columnType: '',
                },
                backdropClosable: false,
                confirmText: t('add'),
                actionsAlign: 'flex-start',
                showUnsavedDialog: false,
                showCloseButton: true,
                hideCancelButton: true,
                onClose: async () => {},
                onConfirm: async (formData, methods) => {
                    const { columnName, columnType } = formData;
                    postMessage({
                        action: 'ADDED_NEW_COLUMN_TO_FINANCIAL_FILE',
                        data: {
                            columnName,
                            columnType,
                        },
                        event,
                        origin: event?.origin,
                    });
                    return true;
                },
                confirmButtonProps: {
                    sx: {
                        minWidth: '160px',
                        height: '40px',
                    },
                },
                schema: z.object({
                    columnName: z.string().superRefine((val, ctx) => {
                        if (val.trim().length === 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });
                            return z.NEVER;
                        }
                    }),
                    columnType: z.string().superRefine((val, ctx) => {
                        if (val.trim().length === 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });
                            return z.NEVER;
                        }
                    }),
                }),
            });
        }
    }, []);

    const editFinancialManagementFile = useCallback((event: MarketPlaceMessageEvent) => {
        if (event.data.action === 'EDIT_FINANCIAL_MANAGEMENT_FILE' && 'data' in event.data) {
            const { data } = event.data;
            console.log({ data });
            const { id, fileName, fileDescription, type } = data;
            dialogForm<{
                fileName: string;
                fileDescription: string;
            }>({
                title: type === 'file' ? 'Edit Financial Management File' : 'Edit Financial Report',
                content: (methods) => (
                    <FormProvider {...methods}>
                        <EditFinancalFile methods={methods} fileName={fileName} fileDescription={fileDescription} type={type} />
                    </FormProvider>
                ),
                defaultValues: {
                    fileName: fileName,
                    fileDescription: fileDescription,
                },
                backdropClosable: false,
                confirmText: t('update'),
                actionsAlign: 'flex-start',
                showUnsavedDialog: false,
                showCloseButton: true,
                hideCancelButton: true,
                onClose: async () => {},
                onConfirm: async (formData, methods) => {
                    const { fileName, fileDescription } = formData;
                    const { data } = await apiFetch<{ id: string; filename: string }>(
                        type === 'file' ? updateFinancialFile.api(id) : updateFinancialReport.api(id),
                        type === 'file' ? updateFinancialFile.method : updateFinancialReport.method,
                        {
                            fileName,
                            report_name: fileName,
                            description: fileDescription,
                        },
                    );

                    if (data.editedFile) {
                        postMessage({
                            action: 'REFRESH',
                            event,
                            origin: event?.origin,
                        });
                        notify({
                            message: 'File updated successfully',
                            messageType: 'noti_success',
                            variant: 'success',
                        });
                        return true;
                    }
                    return false;
                },
                confirmButtonProps: {
                    sx: {
                        minWidth: '160px',
                        height: '40px',
                    },
                },
                schema: z.object({
                    fileName: z.string().superRefine((val, ctx) => {
                        if (val.trim().length === 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });
                            return z.NEVER;
                        }
                    }),
                    fileDescription: z.string().superRefine((val, ctx) => {
                        if (val.trim().length === 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });
                            return z.NEVER;
                        }
                    }),
                }),
            });
        }
    }, []);

    useEffect(() => {
        const urlObj = new URL(iframeUrl);
        const handler = (event: MarketPlaceMessageEvent) => {
            const { action } = event.data;
            console.log('event', action, event);
            if ((env.VITE_APP_ENV === 'dev' || env.VITE_APP_ENV === 'local') && !('source' in event.data)) {
                console.log('app content message', event);
            }
            if (event.origin === urlObj.origin) {
                switch (action) {
                    case DUPLICATION_FOUND: {
                        const { data: messageData } = event.data;
                        openDuplicationDialog(event, messageData);
                        break;
                    }
                    case USE_TEMPLATE: {
                        const { data } = event.data;
                        openChoseTemplate(event, data.boardId);
                        // openChoseTemplate(event);
                        break;
                    }
                    case SAVE_AS_NEW_TEMPLATE: {
                        const { data: messageData } = event.data;
                        openCreateNewTemplates(event, messageData);
                        break;
                    }
                    case ROUTE: {
                        const { data: messageData } = event.data;
                        if (messageData.state) {
                            history.push(messageData.url, {
                                ...messageData.state,
                                refetch: true,
                            });
                        } else {
                            history.push(messageData.url);
                        }
                        onClose();
                        break;
                    }
                    case CLOSE:
                        onClose();
                        break;
                    case EDIT_FIELD: {
                        const { data } = event.data;
                        const { board, field, type: productType, name: fieldName } = data;
                        dialogForm<DataBoardFieldType>({
                            title: t('fields_management_form_header_edit'),
                            content: (methods) => (
                                <FormProvider {...methods}>
                                    <OperationDataBoardFieldForm
                                        boardType={board.type}
                                        boardName={board.name}
                                        boardField={field}
                                        methods={methods}
                                    />
                                </FormProvider>
                            ),
                            confirmText: t('update'),
                            defaultValues: {
                                ...field,
                                data: field.data && field.data.length > 0 ? field.data : undefined,
                            },
                            actionsAlign: 'flex-start',
                            showUnsavedDialog: true,
                            showCloseButton: true,
                            hideCancelButton: true,
                            onClose: async () => {},
                            onConfirm: async (formData, methods) => {
                                try {
                                    const { name, type, description, settings, data: optionData } = formData;

                                    await updateField.mutateAsync({
                                        boardId: board._id,
                                        fieldId: field._id,
                                        data: {
                                            name,
                                            description,
                                            type,
                                            hidden: false,
                                            data: optionData,
                                            settings,
                                        },
                                    });
                                    postMessage({
                                        action: REFETCH_SELECT,
                                        data: {
                                            type: productType,
                                            select: fieldName ?? 'campaign_tag',
                                        },
                                        event,
                                        origin: event?.origin,
                                    });
                                    return true;
                                } catch (error) {
                                    const err = error as AxiosError;
                                    if (
                                        err.response?.status === 409 &&
                                        err.response?.data?.message.includes('Field name cannot be duplicated')
                                    ) {
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
                                        import('@/redux/slices/notification').then(({ pushNotification }) => {
                                            store.dispatch(
                                                pushNotification({
                                                    notification: notificationPayload,
                                                }),
                                            );
                                        });
                                        postMessage({
                                            action: REFETCH_SELECT,
                                            data: {
                                                type: 'email_campaign',
                                                select: 'campaign_tag',
                                            },
                                            event,
                                            origin: event?.origin,
                                        });
                                        return true;
                                    }
                                    if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                                        const message = err?.response?.data?.message;

                                        const notificationPayload = {
                                            message,
                                            messageType: 'noti_failed',
                                            variant: 'error',
                                        };
                                        import('@/redux/slices/notification').then(({ pushNotification }) => {
                                            store.dispatch(
                                                pushNotification({
                                                    notification: notificationPayload,
                                                }),
                                            );
                                        });
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
                            schema: DataBoardFieldSchema({
                                t,
                                existFields: board.fields.filter((boardField) => boardField._id !== field._id),
                                checkDuplicate: true,
                            }),
                        });
                        break;
                    }
                    case SEND_ANOTHER_ONE: {
                        onClose()?.();
                        break;
                    }
                    case OPEN_SELECT_TOUCHPOINT: {
                        modal({
                            title: t('new_campaign_touchpoint'),
                            content: ({ onClose: onModalClose }) => (
                                <TouchpointOperationModal
                                    touchpointId="new"
                                    onAfterCreate={(touchpoint) => {
                                        postMessage({
                                            action: SELECT_TOUCHPOINT,
                                            data: {
                                                type: 'email_campaign',
                                                touchpoint: touchpoint,
                                            },
                                            event,
                                            origin: event?.origin,
                                        });
                                        onModalClose();
                                    }}
                                />
                            ),
                        });
                        break;
                    }
                    case OPEN_SUPPORT_CENTER: {
                        const { data } = event.data;
                        handleOpenHelpCenter?.(data.prefilledMessage);
                        break;
                    }
                    case OPEN_STARTER: {
                        const { data: messageData } = event.data;
                        switch (messageData.type) {
                            case 'form_management':
                                openFormManagementStarter(event);
                                break;
                            default:
                                break;
                        }
                        break;
                    }
                    case OPEN_SHARE: {
                        const { data: messageData } = event.data;
                        switch (messageData.type) {
                            case 'form_management':
                                openFormManagementShare(messageData.form);
                                break;
                            default:
                                break;
                        }
                        break;
                    }
                    case ADD_FORM_FIELD: {
                        const { data: messageData } = event.data;
                        dialogForm<FieldType, ReturnType<typeof FieldSchema>>({
                            title: t('add_new_field'),
                            content: (methods) => <OperationFieldForm methods={methods} />,
                            onClose: () => {},
                            onConfirm: async (formData) => {
                                postMessage({
                                    action: ADD_FORM_FIELD,
                                    data: {
                                        type: messageData.type,
                                        field: {
                                            ...formData,
                                            is_default: false,
                                        },
                                        index: messageData.index,
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                                return true;
                            },
                            hideCancelButton: true,
                            confirmText: t('add'),
                            confirmButtonProps: {
                                size: 'default',
                            },
                            actionsAlign: 'flex-start',
                            schema: FieldSchema({ t, existFields: messageData.existFields, checkDuplicate: true }),
                        });
                        break;
                    }
                    case EDIT_FORM_FIELD: {
                        const { data: messageData } = event.data;
                        dialogForm<FieldType, ReturnType<typeof FieldSchema>>({
                            title: messageData.field.is_default ? t('edit_default_field') : t('edit_customized_field'),
                            defaultValues: {
                                ...messageData.field,
                            },
                            content: (methods) => (
                                <OperationFieldForm methods={methods} formField={messageData.field} currentForm={messageData.currentForm} />
                            ),
                            onClose: () => {},
                            onConfirm: async (formData) => {
                                postMessage({
                                    action: EDIT_FORM_FIELD,
                                    data: {
                                        type: messageData.type,
                                        field: {
                                            ...messageData.field,
                                            ...formData,
                                            is_default: messageData.field.is_default ?? false,
                                        },
                                        index: messageData.index,
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                                return true;
                            },
                            hideCancelButton: true,
                            confirmText: t('update'),
                            confirmButtonProps: {
                                size: 'default',
                            },
                            actionsAlign: 'flex-start',
                            schema: FieldSchema({
                                t,
                                existFields: messageData.existFields,
                                checkDuplicate: !messageData.currentForm && !messageData.field.is_default,
                            }),
                        });
                        break;
                    }
                    case EDIT_FORM_HEADER: {
                        const { data: messageData } = event.data;
                        dialogForm<HeaderFormType, ReturnType<typeof HeaderFormSchema>>({
                            title: t('edit_form_header'),
                            defaultValues: {
                                header: messageData.header,
                                sub_header: messageData.sub_header,
                                banner_image: messageData.banner_image
                                    ? [{ id: 'banner1', url: messageData.banner_image, status: 'ok' }]
                                    : undefined,
                            },
                            content: (methods) => <EditHeaderForm methods={methods} />,
                            onClose: () => {},
                            onConfirm: async (formData) => {
                                postMessage({
                                    action: EDIT_FORM_HEADER,
                                    data: {
                                        type: messageData.type,
                                        ...formData,
                                        banner_image: formData.banner_image?.[0]?.url,
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                                return true;
                            },
                            hideCancelButton: true,
                            confirmText: t('update'),
                            actionsAlign: 'flex-start',
                            confirmButtonProps: {
                                size: 'default',
                            },
                            schema: HeaderFormSchema(t),
                        });
                        break;
                    }
                    case EDIT_FORM_FOOTER: {
                        const { data: messageData } = event.data;
                        dialogForm<FooterFormType, ReturnType<typeof FooterFormSchema>>({
                            title: t('edit_form_footer'),
                            defaultValues: {
                                footer: messageData.footer,
                                submit_button_text: messageData.submit_button_text,
                            },
                            content: (methods) => <EditFooterForm methods={methods} />,
                            onClose: () => {},
                            onConfirm: async (formData) => {
                                postMessage({
                                    action: EDIT_FORM_FOOTER,
                                    data: {
                                        type: messageData.type,
                                        ...formData,
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                                return true;
                            },
                            hideCancelButton: true,
                            confirmText: t('update'),
                            confirmButtonProps: {
                                size: 'default',
                            },
                            actionsAlign: 'flex-start',
                            schema: FooterFormSchema(t),
                        });
                        break;
                    }
                    case DELETE_FORM: {
                        const { data: messageData } = event.data;
                        dialog({
                            title: t('journey_form_management_delete_form_title'),
                            content: t('journey_form_management_delete_form_desc'),
                            onConfirm: async () => {
                                try {
                                    await removeForm.mutateAsync(messageData.id);
                                    postMessage({
                                        action: REFRESH,
                                        event,
                                        origin: event?.origin,
                                    });
                                    return true;
                                } catch (error) {
                                    console.log(error);
                                    return false;
                                }
                            },
                            confirmButtonProps: {
                                type: 'danger',
                            },
                        });
                        break;
                    }
                    case SET_BREADCRUMB: {
                        const { data: messageData } = event.data;
                        console.log('messageData', messageData, 'SET_BREADCRUMB');
                        if (!messageData.items || messageData.items.length === 0) {
                            changeTitle?.(title);
                            return;
                        }
                        changeTitle?.(
                            <Space size={12} onClick={(e) => e.stopPropagation()}>
                                <Typography style={{ fontWeight: 700, color: 'var(--color-light-5)' }}>{title}</Typography>
                                <Breadcrumb
                                    items={messageData.items.map(({ action: itemAction, ...item }) => ({
                                        ...item,
                                        onClick: () => {
                                            if (itemAction) {
                                                if (itemAction.route) {
                                                    postMessage({
                                                        action: ROUTE,
                                                        data: {
                                                            url: item.path,
                                                        },
                                                        event,
                                                        origin: event?.origin,
                                                    });
                                                }
                                                if (typeof itemAction.step === 'number') {
                                                    postMessage({
                                                        action: CHANGE_STEP,
                                                        data: {
                                                            type: 'form_management',
                                                            step: itemAction.step,
                                                        },
                                                        event,
                                                        origin: event?.origin,
                                                    });
                                                }
                                            }
                                            return;
                                        },
                                    }))}
                                    isActive={(path) => path === messageData.activePath}
                                    separator={<Icon name="forwardIos" />}
                                />
                            </Space>,
                        );
                        break;
                    }
                    case BOARD_ACCESS_WARNING: {
                        const { data: messageData } = event.data;
                        dialog({
                            title: t('journey_form_management_form_change_access_warning_title'),
                            content: () => <AccessWarningModal forms={messageData.forms} />,
                            confirmText: t('update'),
                            backdropClosable: false,
                            onConfirm: async () => {
                                postMessage({
                                    action: BOARD_ACCESS_WARNING,
                                    data: {
                                        type: 'form_management',
                                        confirm: true,
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            },
                            onClose: () => {
                                postMessage({
                                    action: BOARD_ACCESS_WARNING,
                                    data: {
                                        type: 'form_management',
                                        confirm: false,
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            },
                            showCloseButton: false,
                        });
                        break;
                    }
                    case SAVE_AND_EXIT: {
                        dialog({
                            title: t('journey_save_and_exit_dialog_title'),
                            content: t('journey_save_and_exit_dialog_desc'),
                            confirmText: t('save_and_exit'),
                            cancelText: t('discard'),
                            backdropClosable: false,
                            onConfirm: async () => {
                                postMessage({
                                    action: SAVE_AND_EXIT,
                                    data: {
                                        action: 'confirm',
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            },
                            onClose: async () => {
                                postMessage({
                                    action: SAVE_AND_EXIT,
                                    data: {
                                        action: 'cancel',
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            },
                        });
                        break;
                    }
                    case NOT_ABLE_TO_SAVE: {
                        dialog({
                            title: t('journey_not_able_to_save_dialog_title'),
                            content: t('journey_not_able_to_save_dialog_desc'),
                            confirmText: t('back_to_edit'),
                            cancelText: t('discard'),
                            backdropClosable: false,
                            onConfirm: async () => {
                                postMessage({
                                    action: NOT_ABLE_TO_SAVE,
                                    data: {
                                        action: 'confirm',
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            },
                            onClose: async () => {
                                postMessage({
                                    action: NOT_ABLE_TO_SAVE,
                                    data: {
                                        action: 'cancel',
                                    },
                                    event,
                                    origin: event?.origin,
                                });
                            },
                        });
                        break;
                    }
                    case SHOW_FINANCIAL_MANAGEMENT_FILE_ERROR: {
                        openFinancialFileError(event);
                        break;
                    }
                    case SHOW_FINANCIAL_MANAGEMENT_FILE_CONTENT: {
                        openFinancialFileContent(event);
                        break;
                    }
                    case ADD_NEW_COLUMN_TO_FINANCIAL_FILE: {
                        addNewColumnFinancialFile(event);
                        break;
                    }
                    case EDIT_FINANCIAL_MANAGEMENT_FILE: {
                        editFinancialManagementFile(event);
                        break;
                    }
                    case DELETE_FINANCIAL_MANAGEMENT_FILE: {
                        const {
                            data: { id, type },
                        } = event.data;
                        dialog({
                            title: `${t('ai_assistant_management_delete')} this ${type === 'file' ? 'file' : 'report'}?`,
                            content: 'If you choose to proceed, you won’t be able to undo this action.',
                            confirmText: 'Yes',
                            cancelText: 'Cancel',
                            onConfirm: async () => {
                                try {
                                    const { data } = await apiFetch<{ message: string; success: boolean }>(
                                        type === 'file' ? deleteFinancialFile.api(id) : deleteFinancialReport.api(id),
                                        type === 'file' ? deleteFinancialFile.method : deleteFinancialReport.method,
                                    );
                                    if (data.message || data.success) {
                                        postMessage({
                                            action: REFRESH,
                                            event,
                                            origin: event?.origin,
                                        });
                                        notify({
                                            message: type === 'file' ? 'File deleted successfully' : 'Report deleted successfully',
                                            messageType: 'noti_success',
                                            variant: 'success',
                                        });
                                        return true;
                                    }
                                } catch (error) {
                                    console.log(error);
                                    return false;
                                }
                            },
                            confirmButtonProps: {
                                type: 'danger',
                                sx: {
                                    width: '105px',
                                    height: '32px',
                                    padding: '0px',
                                },
                            },
                            cancelButtonProps: {
                                sx: {
                                    width: '105px',
                                    height: '32px',
                                    padding: '0px',
                                },
                            },
                        });
                        break;
                    }
                    case RESET_FINANCIAL_FILE: {
                        const {
                            data: { fileId },
                        } = event.data;
                        dialog({
                            title: `Are you sure to reset this file ?`,
                            content: 'If you choose to proceed, all your changes will be reverted to the original version.',
                            confirmText: 'Yes',
                            cancelText: 'Cancel',
                            onConfirm: async () => {
                                try {
                                    const { data } = await apiFetch<{ success: boolean }>(
                                        resetFinancialFile.api(),
                                        resetFinancialFile.method,
                                        {
                                            file_id: fileId,
                                        },
                                    );
                                    if (data.success) {
                                        postMessage({
                                            action: REFRESH,
                                            event,
                                            origin: event?.origin,
                                        });
                                        notify({
                                            message: 'File reset successfully',
                                            messageType: 'noti_success',
                                            variant: 'success',
                                        });
                                        return true;
                                    }
                                } catch (error: any) {
                                    console.log(error);
                                    notify({
                                        message: 'Failed to reset file',
                                        messageType: 'noti_failed',
                                        variant: 'error',
                                    });
                                    return false;
                                }
                            },
                            confirmButtonProps: {
                                type: 'danger',
                                sx: {
                                    width: '105px',
                                    height: '32px',
                                    padding: '0px',
                                },
                            },
                            cancelButtonProps: {
                                sx: {
                                    width: '105px',
                                    height: '32px',
                                    padding: '0px',
                                },
                            },
                        });
                        break;
                    }
                    default:
                        break;
                }
            }
        };

        window.addEventListener('message', handler);

        return () => window.removeEventListener('message', handler);
    }, [
        iframeUrl,
        id,
        t,
        url,
        openChoseTemplate,
        openCreateNewTemplates,
        onClose,
        updateField,
        handleOpenHelpCenter,
        dialogForm,
        title,
        openDuplicationDialog,
        openFormManagementStarter,
        dialog,
        removeForm,
        changeTitle,
        openFormManagementShare,
        modal,
    ]);

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
            }}
            style={{ width: '100%', height: '100%' }}
        >
            {dialogHolder}
            {modalHolder}
            <Iframe
                ref={(el) => {
                    if (onIframeRef) onIframeRef(el);
                }}
                src={iframeUrl}
                frameBorder={0}
                title={typeof title === 'string' ? title : 'app content'}
                onLoad={(e) => {
                    setLoading(false);
                }}
                allow="clipboard-write"
            />
            {loading && (
                <LoadingContainer>
                    <CircularProgress size={25} />
                </LoadingContainer>
            )}
        </div>
    );
};
