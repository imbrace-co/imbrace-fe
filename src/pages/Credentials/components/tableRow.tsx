import { EllipsisText, Icon, IconButton, Space } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { deleteCredential, deleteN8nCredential } from '@/services/api/workflow';
import apiFetch from '@/services/axios/handler';
import { formatCredentialName } from '@/utils/StringHelper';

import styles from '../index.module.scss';
import { editCredentialDialog } from './EditCredential';
import { facebookDeleteDialog } from './FacebookDeleteDialog';

const TableRow = ({ item, refresh }: { item: API.Credential; refresh: () => void }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [setNodeRef, entry] = useIntersectionObserver({});

    const removeChannelCredential = useMutation({
        mutationFn: async (credentialId: string) => {
            await apiFetch(deleteCredential.api(credentialId), deleteCredential.method);
        },
        onError: (error) => {
            console.log('deleteCredential error: ', error);
            const notificationPayload = {
                message: t('credential_notification_delete_error'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
    });

    const removeNormalCredential = useMutation({
        mutationFn: async (credentialId: string) => {
            await apiFetch(deleteN8nCredential.api(credentialId), deleteN8nCredential.method);
            return true;
        },
        onError: (error) => {
            console.log('deleteCredential error: ', error);
            const notificationPayload = {
                message: t('credential_notification_delete_error'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
    });

    const handleDeleteNotify = useCallback(
        (isChannelCredential = false) => {
            dialog({
                title: t('credential_delete_credential_workflows_title'),
                content: <Trans i18nKey="credential_delete_credential_workflows_body" />,
                onConfirm: async () => {
                    let result;
                    if (isChannelCredential) {
                        result = await removeChannelCredential.mutateAsync(item.id);
                    } else {
                        result = await removeNormalCredential.mutateAsync(item.id);
                    }

                    if (result) {
                        refresh();
                    }
                },
                onClose: () => {},
                actionsAlign: 'flex-end',
                confirmButtonProps: {
                    type: 'danger',
                },
            });
        },
        [t, refresh, item.id, removeNormalCredential, removeChannelCredential],
    );

    const handleInUseNotify = useCallback(() => {
        const { touchpoints } = item;

        dialog({
            title: t('credential_delete_in_use_title'),
            content: (
                <Space direction="vertical" size={12} style={{ gap: '12px' }}>
                    <span>
                        <Trans i18nKey="credential_delete_in_use_content">
                            If you delete this credential, the following <strong>touchpoint will be paused</strong>. Its analytics and setup
                            will be stopped immediately.
                        </Trans>
                    </span>
                    <div className={styles.campaigns}>
                        <div>
                            {touchpoints.map((touchpoint) => (
                                <div key={touchpoint.id} className={styles.campaign}>
                                    <Icon name="campaign" style={{ fontSize: 24, color: 'var(--color-light-4)' }} />
                                    <EllipsisText text={touchpoint.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </Space>
            ),
            onConfirm: async () => {
                handleDeleteNotify();
            },
            onClose: () => {},
            actionsAlign: 'flex-end',
            confirmButtonProps: {
                type: 'danger',
                sx: {
                    width: '147px',
                    height: '40px',
                },
            },
            cancelButtonProps: {
                sx: {
                    width: '147px',
                    height: '40px',
                },
            },
        });
    }, [t, handleDeleteNotify, item]);

    const handleDeleteCredential = async () => {
        const { touchpoints, channel } = item;

        if (touchpoints?.length > 0) {
            handleInUseNotify();
        } else {
            handleDeleteNotify(!!channel);
        }
    };

    const handleDeleteFacebook = useCallback(() => {
        facebookDeleteDialog({
            title: t('credential_delete_facebook_title'),
            content: <Trans i18nKey="credential_delete_facebook_body" t={t} />,
            onFinish: () => {
                refresh();
            },
        });
    }, [t, refresh]);

    const handleEditCredential = useCallback(() => {
        editCredentialDialog({
            credentialType: item.type,
            name: item.name,
            credentialId: item.id,
            onFetchCredential: () => {
                refresh();
            },
        });
    }, [item, refresh]);

    return (
        <div
            ref={(ref) => {
                if (ref) {
                    setNodeRef(ref);
                }
            }}
            onClick={() => handleEditCredential()}
            className={styles.tableRow}
        >
            {entry?.isIntersecting && (
                <>
                    <div>{item.name}</div>
                    <div>{formatCredentialName(item.type)}</div>
                    <div>{format(new Date(item.updatedAt || ''), 'yyyy-MM-dd HH:mm')}</div>
                    <div>
                        <Box sx={{ width: '56px', display: 'flex', justifyContent: 'flex-end' }}>
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (item.type !== 'Facebook') {
                                        handleDeleteCredential();
                                    } else {
                                        handleDeleteFacebook();
                                    }
                                }}
                                type="secondary"
                                variant="text"
                                size="s"
                            >
                                <Icon name="delete" />
                            </IconButton>
                        </Box>
                    </div>
                </>
            )}
        </div>
    );
};

export default TableRow;
