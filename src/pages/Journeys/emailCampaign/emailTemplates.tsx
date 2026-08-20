import type { TextEditorProps } from '@imbrace/ui';
import { Button, EllipsisText, Icon, IconButton, Search, Space, Typography, useDialog } from '@imbrace/ui';
import type { QueryFunction } from '@tanstack/react-query';
import { useMutation, useQuery } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import type SimpleBarCore from 'simplebar-core';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns, FlexibleTableRef, RequestParameters } from '@/components/FlexibleTable/types';
import LinkButton from '@/components/LinkButton';
import PageLayout from '@/components/PageLayout';
import { deleteEmailTemplate, getAppById, getEmailTemplates, postEmailTemplate, putEmailTemplate } from '@/services/api/app';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import styles from '../config.module.scss';
import EmailPreview from './emailPreview';
import EmailTemplateForm from './emailTemplateForm';

const fetchApp: QueryFunction<
    {
        email?: string;
        data_board?: Record<
            string,
            {
                board_name: string;
            }
        >;
    },
    [string, string | undefined]
> = async ({ queryKey }) => {
    const [, appId] = queryKey;
    if (!appId) {
        throw new Error('App Id is missing');
    }
    const { data } = await apiFetch<{ data: API.Journey }>(getAppById.api(appId), getAppById.method);
    return {
        email: data.data.channel?.name,
        data_board: data.data.data_board,
    };
};

const fetchEmailTemplate = (appId?: string) => async (params: RequestParameters, signal?: AbortSignal) => {
    if (!appId) {
        throw new Error('App Id is missing');
    }
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
        searchParams.append('search', `${globalFilter}`);
    }
    searchParams.append('app_id', appId);
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

export const handleCreateEmailTemplate = async (params: { formData: EmailTemplatePayload; appId: string }) => {
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
        app_id: params.appId,
    });
    return data.data;
};

const handleUpdateEmailTemplate = async (params: { templateId: string; formData: EmailTemplatePayload; appId: string }) => {
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
        app_id: params.appId,
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
    const { appId } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const simpleBarRef = useRef<SimpleBarCore>(null);
    const [globalSearch, setGlobalSearch] = useState<string>('');
    const [searchInput, setSearchInput] = useState<string>('');
    const tableRef = useRef<FlexibleTableRef<API.EmailTemplate>>(null);
    const [{ dialogForm }, dialogHolder] = useDialog();
    const { data, isFetching } = useQuery({
        queryKey: ['orgApp', appId],
        queryFn: fetchApp,
        enabled: !!appId,
    });

    const createEmailTemplate = useMutation({
        mutationFn: handleCreateEmailTemplate,
    });

    const updateEmailTemplate = useMutation({
        mutationFn: handleUpdateEmailTemplate,
    });

    const removeEmailTemplate = useMutation({
        mutationFn: handleDeleteEmailTemplate,
    });

    const columns: Columns<API.EmailTemplate & { id: string }> = [
        {
            id: 'name',
            accessorKey: 'name',
            header: t('name'),
            enableEditing: false,
            maxSize: 266,
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
            id: 'category.category_name',
            accessorKey: 'category.category_name',
            header: t('category'),
            enableEditing: false,
            enableSorting: true,
        },
        {
            id: 'board_name',
            accessorKey: 'board_name',
            header: t('audience'),
            enableEditing: false,
            enableSorting: true,
            cell: ({ cell, row }) => {
                if (!row.original.board_id) {
                    return <Typography style={{ color: 'var(--color-light-4)' }}>—</Typography>;
                }
                return (
                    <EllipsisText
                        text={
                            row.original.board_id && data?.data_board?.[row.original.board_id]
                                ? t('all_subscribers')
                                : (cell.getValue() as string)
                        }
                        element={<Typography />}
                    />
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
                                if (appId) {
                                    dialogForm<EmailTemplatePayload>({
                                        title: t('journey_new_email_template'),
                                        content: (methods) => (
                                            <EmailTemplateForm
                                                methods={methods}
                                                appId={appId}
                                                dataBoards={data?.data_board}
                                                templateId={row.original.id}
                                            />
                                        ),
                                        defaultValues: {
                                            name: row.original.name,
                                            subject: row.original.subject,
                                            category: row.original.category?.category_id,
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
                                            await updateEmailTemplate.mutateAsync({ templateId: row.original.id, formData, appId });
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
                                }
                            }}
                        >
                            <Icon name="edit" />
                        </IconButton>
                        <IconButton
                            variant="text"
                            type="secondary"
                            size="s"
                            loading={removeEmailTemplate.isPending}
                            onClick={async () => {
                                await removeEmailTemplate.mutateAsync({ templateId: row.original.id });
                                tableRef.current?.refresh();
                            }}
                        >
                            <Icon name="delete" />
                        </IconButton>
                    </Space>
                );
            },
        },
    ];

    const openCreateNewTemplates = () => {
        if (appId) {
            dialogForm<EmailTemplatePayload>({
                title: t('journey_new_email_template'),
                content: (methods) => <EmailTemplateForm methods={methods} appId={appId} dataBoards={data?.data_board} />,
                onConfirm: async (formData) => {
                    await createEmailTemplate.mutateAsync({ formData, appId });
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
        }
    };

    const onSearchDebounce = debounce((searchText) => {
        setGlobalSearch(searchText);
    }, 300);

    const onResetSearchInput = useCallback(() => {
        onSearchDebounce('');
        setSearchInput('');
    }, [onSearchDebounce]);

    const onBack = useCallback(async () => {
        navigate(-1);
    }, [navigate]);

    return (
        <PageLayout
            onBack={onBack}
            backBtnText={t('menu_journeys')}
            title={t('journey_email_template_title', { email: data?.email })}
            extra={
                <Space justify="between">
                    <Search
                        placeholder={t('search')}
                        value={searchInput}
                        onSearch={(value) => {
                            setSearchInput(value);
                            onSearchDebounce(value);
                        }}
                        sx={{
                            width: '248px',
                        }}
                        onReset={() => {
                            onResetSearchInput();
                        }}
                    />
                    <Button
                        text={t('create_new')}
                        onClick={() => {
                            openCreateNewTemplates();
                        }}
                    />
                </Space>
            }
            loading={isFetching}
            simpleBarRef={simpleBarRef}
        >
            {dialogHolder}
            <div className={styles.container}>
                <FlexibleTable<API.EmailTemplate & { id: string }>
                    ref={tableRef}
                    queryKey={['emailTemplates', appId]}
                    request={fetchEmailTemplate(appId)}
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
                                        openCreateNewTemplates();
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
        </PageLayout>
    );
};

export default EmailTemplates;
