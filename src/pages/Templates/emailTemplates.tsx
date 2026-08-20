import type { TextEditorProps } from '@imbrace/ui';
import { EllipsisText, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import styles from '@/pages/Journeys/config.module.scss';
import type { PageLayoutChildrenProps } from '@/pages/Templates';
import EmailTemplateFormV2 from '@/pages/Templates/emailTemplateForm';
import EmailPreview from '@/pages/Templates/emailTemplatePreview';
import { deleteEmailTemplate, getEmailTemplates, postEmailTemplate, putEmailTemplate } from '@/services/api/app';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

const fetchEmailTemplate = (field: 'title' | 'content' | 'all') => async (params: RequestParameters, signal?: AbortSignal) => {
    const { pagination, globalFilter, sorters } = params;
    const sort = !sorters || sorters?.length === 0 ? '' : `{"${sorters[0]?.id}":"${sorters[0]?.desc ? 'desc' : ''}"}`;

    const searchParams = new URLSearchParams();
    if (pagination) {
        searchParams.append('limit', `${pagination.pageSize}`);
        searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
    }
    if (sort) {
        searchParams.append('sort', `${sort}`);
    }
    if (globalFilter) {
        searchParams.append('q', `${globalFilter}`);
        searchParams.append('field', `${field}`);
    }
    const { data } = await apiFetch<API.PaginatedMetaResponse<API.EmailTemplate[]>>(
        getEmailTemplates.api(),
        getEmailTemplates.method,
        searchParams,
        ImbraceClient,
        { signal },
    );

    return {
        data:
            data.data?.map((template) => ({
                id: template._id,
                ...template,
            })) ?? [],

        meta: {
            total: data.meta.count,
            skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
            limit: pagination?.pageSize ?? 20,
        },
    };
};

export const handleCreateEmailTemplate = async (params: { formData: EmailTemplatePayload }) => {
    const { data } = await apiFetch<{ data: API.EmailTemplate }>(postEmailTemplate.api(), postEmailTemplate.method, {
        name: params.formData.name,
        category: params.formData.category,
        subject: params.formData.subject,
        body: params.formData.content?.content,
        attachments: params.formData.content?.files
            ?.filter((file) => file.status === 'ok')
            ?.map((file) => ({
                name: file.name,
                url: file.url,
                file_id: file.fileId,
            })),
        board_id: params.formData.board_id,
    });
    return data.data;
};

const handleUpdateEmailTemplate = async (params: { templateId: string; formData: EmailTemplatePayload }) => {
    const { data } = await apiFetch(putEmailTemplate.api(params.templateId), putEmailTemplate.method, {
        name: params.formData.name,
        category: params.formData.category,
        subject: params.formData.subject,
        body: params.formData.content?.content,
        attachments: params.formData.content?.files
            ?.filter((file) => file.status === 'ok')
            ?.map((file) => ({
                name: file.name,
                url: file.url,
                file_id: file.fileId,
            })),
        board_id: params.formData.board_id,
        // app_id: params.appId,
    });
    return data;
};

const handleDeleteEmailTemplate = async (params: { templateId: string }) => {
    const { data } = await apiFetch(deleteEmailTemplate.api(params.templateId), deleteEmailTemplate.method);
    return data;
};

export interface EmailTemplatePayload {
    name: string;
    subject: string;
    content: TextEditorProps['value'];
    category: string;
    board_id?: string;
}

const EmailTemplates = () => {
    const { tableRef, globalSearch, field } = useOutletContext<PageLayoutChildrenProps>();

    const { t } = useTranslation();
    const [{ dialogForm, dialog }, dialogHolder] = useDialog();

    const createEmailTemplate = useMutation({
        mutationFn: handleCreateEmailTemplate,
    });

    const updateEmailTemplate = useMutation({
        mutationFn: handleUpdateEmailTemplate,
    });

    const removeEmailTemplate = useMutation({
        mutationFn: handleDeleteEmailTemplate,
    });

    const openCreateNewEmailTemplates = useCallback(() => {
        dialogForm<EmailTemplatePayload>({
            title: t('journey_new_email_template'),
            content: (methods) => <EmailTemplateFormV2 methods={methods} />,
            onConfirm: async (formData) => {
                // Clean up the content
                if (formData.content && formData.content.content) {
                    // Remove multiple trailing <p><br></p> tags
                    formData.content.content = formData.content.content.replace(/(<p><br><\/p>)+$/, '');
                }
                await createEmailTemplate.mutateAsync({ formData });
                tableRef.current?.refresh();

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
    }, [createEmailTemplate, dialogForm, t, tableRef]);

    const columns: Columns<API.EmailTemplate & { id: string }> = [
        {
            id: 'name',
            accessorKey: 'name',
            header: t('name'),
            enableEditing: false,
            size: 400,
            maxSize: 500,
            meta: {
                cellStyle: {
                    padding: '7px 0',
                },
            },
            cell: ({ cell, column, row }) => {
                return (
                    <Space size={4} align="center" justify="start">
                        <Space size={4}>
                            <EmailPreview emailTemplate={row.original} />
                        </Space>

                        <EllipsisText text={cell.getValue() as string} element={<Typography />} />
                    </Space>
                );
            },
            enableSorting: true,
        },
        {
            id: 'category',
            accessorKey: 'category',
            header: t('category'),
            enableEditing: false,
            enableSorting: true,
            cell: ({ cell, row }) => {
                return (
                    <Typography
                        style={{
                            color: !cell.getValue() ? 'var(--color-light-4)' : 'inherit',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            wordBreak: 'break-word',
                        }}
                    >
                        {cell.getValue() ? row.original?.category?.name : '—'}
                    </Typography>
                );
            },
        },
        {
            id: 'operation',
            accessorKey: 'operation',
            enableEditing: false,
            header: () => null,
            maxSize: 124,
            meta: {
                cellStyle: {
                    padding: '7px 0',
                },
            },
            cell: ({ row }) => {
                return (
                    <Space size={12}>
                        <IconButton
                            variant="text"
                            type="secondary"
                            size="s"
                            onClick={() => {
                                dialogForm<EmailTemplatePayload>({
                                    title: t('email_template_edit'),
                                    content: (methods) => {
                                        return <EmailTemplateFormV2 methods={methods} templateId={row.original.id} />;
                                    },
                                    defaultValues: {
                                        name: row.original.name,
                                        subject: row.original.subject,
                                        category: row.original.category?.id,
                                        board_id: row.original.board_id,
                                        content: {
                                            content: row.original.body,
                                            files: row.original.attachments.map((attachment) => ({
                                                ...attachment,
                                                id: attachment.file_id,
                                                fileId: attachment.file_id,
                                                status: 'ok',
                                            })),
                                        },
                                    },
                                    onConfirm: async (formData) => {
                                        // Clean up the content
                                        if (formData.content && formData.content.content) {
                                            // Remove multiple trailing <p><br></p> tags
                                            formData.content.content = formData.content.content.replace(/(<p><br><\/p>)+$/, '');
                                        }

                                        await updateEmailTemplate.mutateAsync({ templateId: row.original.id, formData });
                                        tableRef.current?.refresh();

                                        return true;
                                    },
                                    onClose: () => {},

                                    hideCancelButton: true,
                                    confirmText: t('update'),
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
                            }}
                        >
                            <Icon name="edit" />
                        </IconButton>
                        <IconButton
                            variant="text"
                            type="secondary"
                            size="s"
                            onClick={async () => {
                                dialog({
                                    title: t('template_delete_dialog_title'),
                                    content: () => (
                                        <Typography style={{ color: 'var(--color-light-5)' }}>
                                            {/*"{row.original.name}" will be deleted, and you will not be able to access and use from now on.*/}
                                            {t('template_delete_dialog_content', { name: row.original.name })}
                                        </Typography>
                                    ),
                                    onConfirm: async () => {
                                        await removeEmailTemplate.mutateAsync({ templateId: row.original.id });
                                        tableRef.current?.refresh();
                                    },
                                    confirmText: t('delete'),
                                    confirmButtonProps: {
                                        size: 's',
                                        type: 'danger',
                                    },
                                });
                            }}
                        >
                            <Icon name="delete" />
                        </IconButton>
                    </Space>
                );
            },
        },
    ];

    return (
        <>
            {dialogHolder}
            <div className={styles.container}>
                <FlexibleTable<API.EmailTemplate & { id: string }>
                    ref={tableRef}
                    queryKey={['emailTemplates']}
                    request={fetchEmailTemplate(field)}
                    columns={columns}
                    fullWidth
                    globalFilter={globalSearch}
                    disableHoverEffect
                    emptyImage={'messageTemplates'}
                    emptyMessage={
                        <Typography style={{ fontSize: 16, lineHeight: '24px', fontWeight: 600 }}>
                            <Trans i18nKey="journey_email_templates_empty_message">
                                <LinkButton
                                    onClick={() => {
                                        openCreateNewEmailTemplates();
                                    }}
                                >
                                    Create your first template
                                </LinkButton>{' '}
                                now and start to facilitate the team!
                            </Trans>
                        </Typography>
                    }
                />
            </div>
        </>
    );
};

export default EmailTemplates;
