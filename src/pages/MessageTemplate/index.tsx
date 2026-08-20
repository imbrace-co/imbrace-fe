import { EllipsisText, Icon, IconButton } from '@imbrace/ui';
import debounce from 'lodash/debounce';
import type { ChangeEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Dialog from '@/components/Dialog';
import PageLayout from '@/components/PageLayout';
import type { tableColumns } from '@/components/Table/ITable';
import { FETCH_IN_PROGRESS } from '@/constants/app';
import useAccess from '@/hooks/useAccess';
import { fetchMessageTemplates } from '@/redux/slices/messageTemplates';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { deleteMessagesById } from '@/services/api/messageTemplates';
import apiFetch from '@/services/axios/handler';
import { convertDateToDDMMYYYY } from '@/utils/DateTimeUtils';

import MessageTemplateDetailDrawer from './components/MessageTemplateDetail';
import MessageTemplateList from './components/MessageTemplateList';
import OperationDrawer from './components/OperationDrawer';
import styles from './index.module.scss';

export interface MessageData {
    title: string;
    created_at: string;
    extra: string;
    id: string;
    text: string;
}
export interface TemplateType {
    open: boolean;
    template?: MessageData;
}

const MessageTemplate = () => {
    const { t } = useTranslation();
    const { isAdmin } = useAccess();
    const dispatch = useAppDispatch();
    const messageTemplatesList = useAppSelector((state) => state.MessageTemplates.list);
    const listLoadingStatus = useAppSelector((state) => state.MessageTemplates.loadingStatus);
    const total = useAppSelector((state) => state.MessageTemplates.total);
    const count = useAppSelector((state) => state.MessageTemplates.count);
    const limit = useAppSelector((state) => state.MessageTemplates.limit);
    const skip = useAppSelector((state) => state.MessageTemplates.skip);

    const [searchbarInput, setSearchbarInput] = useState('');
    const [searchRange, setSearchRange] = useState<string>('title');
    const [messageTemplateDetailDrawer, setMessageTemplateDetailDrawer] = useState<TemplateType>({
        open: false,
    });
    const [operationTemplate, setOperationTemplate] = useState<TemplateType>({
        open: false,
    });
    const [deleteDialog, setDeleteDialog] = useState<TemplateType>({
        open: false,
    });
    const [deleting, setDeleting] = useState<boolean>(false);

    const columns: tableColumns<MessageData, undefined, undefined>[] = [
        {
            id: 'title',
            disableSorter: true,
            label: 'message_templates_table_header_title',
            customize: (key: string, row: MessageData) => (
                <div
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                        setMessageTemplateDetailDrawer({
                            open: true,
                            template: row,
                        });
                    }}
                >
                    <EllipsisText text={row.title || '-'} />
                </div>
            ),
        },
        {
            id: 'created_at',
            disableSorter: true,
            label: 'message_templates_table_header_createdat',
            customize: (key: string, row: MessageData) => {
                return convertDateToDDMMYYYY(row[key as unknown as keyof MessageData]);
            },
        },
        {
            id: 'extra',
            label: '',
            disableSorter: true,
            width: 150,
            customize: (key: string, row: MessageData) => {
                return (
                    isAdmin() && (
                        <div className={styles.extraContainer}>
                            <IconButton
                                type="secondary"
                                variant="text"
                                onClick={() => {
                                    setOperationTemplate({
                                        open: true,
                                        template: row,
                                    });
                                }}
                            >
                                <Icon name="edit" />
                            </IconButton>
                            <IconButton
                                type="danger"
                                variant="text"
                                onClick={() => {
                                    setDeleteDialog({
                                        open: true,
                                        template: row,
                                    });
                                }}
                            >
                                <Icon name="delete" />
                            </IconButton>
                        </div>
                    )
                );
            },
        },
    ];

    const fetchMessageTemplatesMemo = useMemo(
        () =>
            debounce((field, search) => {
                dispatch(fetchMessageTemplates({ limit: 10, skip: 0, field, search, paginated: true }));
            }, 200),
        [dispatch],
    );

    useEffect(() => {
        fetchMessageTemplatesMemo(searchRange, searchbarInput);
    }, [fetchMessageTemplatesMemo, searchRange, searchbarInput]);

    const handleChangePage = (event: ChangeEvent<HTMLInputElement>, page: number) => {
        if (limit * (page - 1) !== skip) {
            dispatch(
                fetchMessageTemplates({ limit, skip: limit * (page - 1), field: searchRange, search: searchbarInput, paginated: true }),
            );
        }
    };

    const openAddDrawer = () => {
        setOperationTemplate({ open: true });
    };

    const reload = () => {
        dispatch(fetchMessageTemplates({ limit, skip, field: searchRange, search: searchbarInput, paginated: true }));
    };

    const onFinish = () => {
        setOperationTemplate({
            ...operationTemplate,
            open: false,
        });
        reload();
    };

    const onCancel = () => {
        setDeleteDialog({
            ...deleteDialog,
            open: false,
        });
    };

    const onDelete = async () => {
        try {
            setDeleting(true);
            if (deleteDialog.template && deleteDialog.template.id) {
                await apiFetch(deleteMessagesById.api(deleteDialog.template.id), deleteMessagesById.method);
            }
            reload();
            setDeleteDialog({
                ...deleteDialog,
                open: false,
            });
            if (messageTemplateDetailDrawer.open) {
                setMessageTemplateDetailDrawer({ ...messageTemplateDetailDrawer, open: false });
            }
            setDeleting(false);
            return true;
        } catch (error) {
            console.log(error);
            setDeleting(false);
            return true;
        }
    };

    return (
        <>
            <PageLayout title={t('message_templates')}>
                <div className={styles.listContainer}>
                    <MessageTemplateList
                        data={messageTemplatesList}
                        columns={columns}
                        searchbarInput={searchbarInput}
                        setSearchbarInput={setSearchbarInput}
                        setSearchRange={setSearchRange}
                        pagination={{
                            page: Math.ceil(skip / 10) + 1,
                            rowsPerPage: 10,
                            total,
                            count,
                        }}
                        handleChangePage={handleChangePage}
                        loading={listLoadingStatus === FETCH_IN_PROGRESS}
                        openAddDrawer={openAddDrawer}
                    />
                </div>
            </PageLayout>
            <MessageTemplateDetailDrawer
                title={t('message_templates_template_detail')}
                onClose={() => {
                    setMessageTemplateDetailDrawer({ ...messageTemplateDetailDrawer, open: false });
                }}
                onEdit={() => {
                    setMessageTemplateDetailDrawer({ ...messageTemplateDetailDrawer, open: false });
                    setOperationTemplate({
                        open: true,
                        template: messageTemplateDetailDrawer.template,
                    });
                }}
                onDelete={() => {
                    setDeleteDialog({
                        open: true,
                        template: messageTemplateDetailDrawer.template,
                    });
                }}
                deleting={deleting}
                {...messageTemplateDetailDrawer}
            />
            <OperationDrawer
                {...operationTemplate}
                onClose={() => {
                    setOperationTemplate({
                        ...operationTemplate,
                        open: false,
                    });
                }}
                title={operationTemplate.template ? t('message_templates_edit_template') : t('add_dialog_new_sample_message')}
                onFinish={onFinish}
            />
            <Dialog
                open={deleteDialog.open}
                title={t('message_templates_delete_template')}
                content={t('message_templates_will_delete', {
                    name: deleteDialog?.template?.title,
                })}
                onClose={onCancel}
                onConfirm={onDelete}
                confirmButtonProps={{
                    type: 'danger',
                }}
            />
        </>
    );
};

export default MessageTemplate;
