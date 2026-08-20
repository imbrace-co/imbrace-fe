import { EllipsisText, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import React, { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import styles from '@/pages/Journeys/config.module.scss';
import type { MessageTemplatePayload, PageLayoutChildrenProps } from '@/pages/Templates/index';
import MessageTemplateForm, {
    handleCreateMessageTemplate,
    handleDeleteMessageTemplate,
    handleUpdateMessageTemplate,
} from '@/pages/Templates/messageTemplateForm';
import MessageTemplatePreview from '@/pages/Templates/messageTemplatePreivew';
import { useAppSelector } from '@/redux/store';
import { getMessageTemplatesListV2 } from '@/services/api/messageTemplates';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

const fetchMessageTemplates =
    (businessId: string, field: string, globalSearch?: string) => async (params: RequestParameters, signal?: AbortSignal) => {
        const { pagination, globalFilter, sorters } = params;
        const sort = !sorters || sorters?.length === 0 ? '-updated_at' : `${sorters[0]?.desc ? '-' : ''}${sorters[0]?.id}`;

        const searchParams = new URLSearchParams();
        searchParams.append('business_unit_id', businessId);
        if (pagination) {
            searchParams.append('limit', `${pagination.pageSize}`);
            searchParams.append('skip', `${pagination.pageIndex * pagination.pageSize}`);
            searchParams.append('sort', `${sort}`);
        }
        if (globalFilter) {
            searchParams.append('q', `${globalSearch}`);
        }
        switch (field) {
            case 'title':
                searchParams.append('fields', `${'title'}`);
                break;
            case 'content':
                searchParams.append('fields', `${'text'}`);
                break;
            default:
                searchParams.append('fields', `${'title,text'}`);
        }

        const { data } = await apiFetch<API.PaginatedResponse<API.MessageTemplate[]>>(
            getMessageTemplatesListV2.api(),
            getMessageTemplatesListV2.method,
            searchParams,
            ImbraceClient,
            {
                signal,
            },
        );
        return {
            data: data.data,
            meta: {
                total: data.count,
                skip: (pagination?.pageIndex ?? 0) * (pagination?.pageSize ?? 0),
                limit: pagination?.pageSize ?? 20,
            },
        };
    };

const MessageTemplates = () => {
    const businessId = useAppSelector((state) => state.BusinessUnit.businessUnitList)[0]?.id;
    const { t, i18n } = useTranslation();
    const [{ dialogForm, dialog }, dialogHolder] = useDialog();
    const { tableRef, field, globalSearch } = useOutletContext<PageLayoutChildrenProps>();

    const createMessageTemplate = useMutation({
        mutationFn: handleCreateMessageTemplate,
    });

    const updateEmailTemplate = useMutation({
        mutationFn: handleUpdateMessageTemplate,
    });

    const removeMessageTemplate = useMutation({
        mutationFn: handleDeleteMessageTemplate,
    });

    const openCreateNewMsgTemplates = useCallback(() => {
        dialogForm<MessageTemplatePayload>({
            title: t('add_dialog_new_sample_message'),
            content: (methods) => <MessageTemplateForm methods={methods} />,
            onConfirm: async (formData) => {
                await createMessageTemplate.mutateAsync({ formData, businessId: businessId });
                tableRef.current?.refresh();

                return true;
            },
            onClose: () => {},
            defaultValues: {
                title: '',
                category: '',
                template_language: i18n.language,
                text: '',
            },
            hideCancelButton: true,
            confirmText: t('create'),
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            paperSx: {
                width: 500,
                maxWidth: 500,
            },
            showCloseButton: true,
        });
    }, [dialogForm, i18n, t, createMessageTemplate, businessId, tableRef]);

    const columns: Columns<API.MessageTemplate> = [
        {
            id: 'title',
            accessorKey: 'title',
            header: t('name'),
            enableEditing: false,
            maxSize: 266,
            meta: {
                cellStyle: {
                    padding: '7px 0',
                },
            },
            cell: ({ cell, row }) => {
                return (
                    <Space size={4} align="center" justify="start">
                        <Space size={4}>
                            <MessageTemplatePreview messageTemplate={row.original} />
                        </Space>

                        <EllipsisText text={cell.getValue() as string} element={<Typography />} />
                    </Space>
                );
            },
            enableSorting: true,
        },
        {
            id: 'language',
            accessorKey: 'template_language',
            header: t('language'),
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
                        {cell.getValue() ? t(`user_language_${cell.getValue()}`) : '—'}
                    </Typography>
                );
            },
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
                                dialogForm<MessageTemplatePayload>({
                                    title: t('add_dialog_edit_sample_message'),
                                    content: (methods) => <MessageTemplateForm methods={methods} />,
                                    onConfirm: async (formData) => {
                                        await updateEmailTemplate.mutateAsync({ templateId: row.original._id || '', formData });
                                        tableRef.current?.refresh();

                                        return true;
                                    },
                                    onClose: () => {},
                                    defaultValues: {
                                        title: row.original.title,
                                        category: row.original?.category ? row.original.category.id : '',
                                        template_language: row.original.template_language,
                                        text: row.original.text,
                                    },
                                    hideCancelButton: true,
                                    confirmText: t('update'),
                                    actionsAlign: 'flex-start',
                                    confirmButtonProps: {
                                        size: 'default',
                                    },
                                    paperSx: {
                                        width: 500,
                                        maxWidth: 500,
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
                                            {t('template_delete_dialog_content', { name: row.original.title })}
                                        </Typography>
                                    ),
                                    onConfirm: async () => {
                                        await removeMessageTemplate.mutateAsync({ templateId: row.original._id || '' });
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
        <div className={styles.container}>
            {dialogHolder}
            <FlexibleTable<API.MessageTemplate>
                ref={tableRef}
                queryKey={['messageTemplates']}
                request={fetchMessageTemplates(businessId, field, globalSearch)}
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
                                    openCreateNewMsgTemplates();
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
    );
};

export default MessageTemplates;
