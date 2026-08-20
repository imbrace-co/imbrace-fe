import { Button } from '@imbrace/ui';
import { Divider, ListItemAvatar } from '@mui/material';
import MuiBox from '@mui/material/Box';
import MuiDialog from '@mui/material/Dialog';
import DialogContentText from '@mui/material/DialogContentText';
import MuiList from '@mui/material/List';
import MuiListItem from '@mui/material/ListItem';
import { styled } from '@mui/material/styles';
import type { AxiosError } from 'axios';
import type { ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import useInstagram from '@/hooks/useInstagram';
import { DialogActions, DialogContent, DialogTitle, PageName } from '@/pages/Credentials/components/FacebookDeleteDialog';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { createInstagram } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

const List = styled(MuiList)(() => ({
    margin: '32px 0',
    borderRadius: '4px',
    border: '1px solid var(--color-light-3)',
}));

const ListItem = styled(MuiListItem)(() => ({
    margin: 0,
    padding: '10px 16px 12px 16px',
    '& + .MuiListItemText-root': {
        borderRadius: '4px',
        border: '1px solid red',
    },
}));

interface InstagramDeleteProps {
    active?: boolean;
    onFinish?: () => void;
    open: boolean;
    title: string;
    content: string | ReactNode;
    onClose: (dontAskedAgain?: boolean) => void;
    cancelText?: string;
    showDontAskedAgain?: boolean;
    actionsAlign?: 'center' | 'flex-end';
    danger?: boolean;
    onBackdropClose?: () => void;
}

const InstagramDeleteDialog = (props: InstagramDeleteProps) => {
    const {
        title,
        content,
        onClose,
        cancelText,
        showDontAskedAgain,
        onBackdropClose,
        danger,
        actionsAlign,
        active,
        onFinish,
        ...restProps
    } = props;

    const dispatch = useAppDispatch();
    const { accessToken, userID, login, clear } = useInstagram();
    const { t } = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);
    const [igChannels, setIgChannels] = useState<API.InstagramChannel[]>([]);
    const [activeStep, setActiveStep] = useState<number>(0);

    const onNext = () => {
        setActiveStep(1);
    };

    const onCloseHandler = () => {
        onClose();
        clear();
        onFinish && onFinish();
        setActiveStep(0);
    };

    const dispatchErrorToast = useCallback(
        (error: AxiosError) => {
            const validateArr = error?.response?.data?.validate.split('.');
            const errorField = validateArr?.[validateArr.length - 1];

            const fieldNameMapping: Record<string, string> = {
                page_id: 'Page ID', // facebook
                igsid: 'IGSID (Instagram Scope ID)', // instagram
            };

            const message =
                error?.response?.data?.message === 'Duplicate key'
                    ? `${t('credential_notification_duplicate_key')}: ${fieldNameMapping[errorField]}`
                    : error?.response?.data?.message;

            const notificationPayload = {
                message,
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
        [dispatch, t],
    );

    const serialize = useCallback(async () => {
        try {
            if (userID && accessToken) {
                setLoading(true);
                const { data } = await apiFetch<API.InstagramChannel[]>(createInstagram.api(), createInstagram.method, {
                    access_token: accessToken,
                });
                setIgChannels(data);
                setLoading(false);
            }
        } catch (err) {
            setLoading(false);
            const error = err as AxiosError;
            dispatchErrorToast(error);
            console.log('create instagram error', err);
        }
    }, [userID, accessToken, dispatchErrorToast]);

    useEffect(() => {
        serialize();
    }, [serialize]);

    const newIgChannels = igChannels.filter((item) => !item.is_deleted);
    const deletedIgChannels = igChannels.filter((item) => item.is_deleted);
    const renderPages = () => {
        if (deletedIgChannels.length > 0 && activeStep === 0) {
            return (
                <>
                    <DialogTitle>{t('credential_deleted_title')}</DialogTitle>
                    <List>
                        {deletedIgChannels.map((page, index) => {
                            return (
                                <Fragment key={page.credential_id}>
                                    <ListItem>
                                        <ListItemAvatar sx={{ minWidth: '35px', marginRight: '27px', position: 'relative' }}>
                                            <Avatar backgroundColor={'var(--color-light-3)'} />
                                        </ListItemAvatar>
                                        <PageName>{page.name}</PageName>
                                    </ListItem>
                                    {deletedIgChannels.length > 0 && index !== deletedIgChannels.length - 1 && (
                                        <Divider sx={{ margin: '0 16px' }} />
                                    )}
                                </Fragment>
                            );
                        })}
                    </List>
                </>
            );
        }

        if (newIgChannels.length > 0 && activeStep === 1) {
            return (
                <>
                    <DialogTitle>{t('credential_created_facebook_title')}</DialogTitle>
                    <List>
                        {newIgChannels.map((page, index) => {
                            return (
                                <Fragment key={page.credential_id}>
                                    <ListItem>
                                        <ListItemAvatar sx={{ minWidth: '35px', marginRight: '27px', position: 'relative' }}>
                                            <Avatar backgroundColor={'var(--color-light-3)'} />
                                        </ListItemAvatar>
                                        <PageName>{page.name}</PageName>
                                    </ListItem>
                                    {newIgChannels.length > 0 && index !== newIgChannels.length - 1 && (
                                        <Divider sx={{ margin: '0 16px' }} />
                                    )}
                                </Fragment>
                            );
                        })}
                    </List>
                </>
            );
        }
    };

    return (
        <MuiDialog
            onClose={onBackdropClose ? onBackdropClose : onCloseHandler}
            PaperProps={{
                sx: {
                    width: 500,
                    minHeight: 291,
                    maxHeight: 'auto',
                    padding: '48px',
                },
            }}
            {...restProps}
        >
            <MuiBox
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                }}
            >
                <div>
                    {deletedIgChannels.length === 0 && (
                        <>
                            <DialogTitle>{title}</DialogTitle>
                            <DialogContent>
                                <DialogContentText>{content}</DialogContentText>
                            </DialogContent>
                        </>
                    )}

                    {deletedIgChannels.length > 0 && <>{renderPages()}</>}
                </div>
                <DialogActions align={actionsAlign}>
                    {deletedIgChannels.length !== 0 || newIgChannels.length !== 0 ? (
                        <>
                            {newIgChannels.length > 0 && activeStep === 0 ? (
                                <Button onClick={onNext} sx={{ fontWeight: 800, width: '160px' }} text={t('credential_delete_next')} />
                            ) : (
                                <Button
                                    onClick={onCloseHandler}
                                    sx={{ fontWeight: 800, width: '160px' }}
                                    text={t('credential_delete_done')}
                                />
                            )}
                        </>
                    ) : (
                        <Button loading={loading} sx={{ width: '160px' }} onClick={login} text={t('login_instagram')} />
                    )}
                </DialogActions>
            </MuiBox>
        </MuiDialog>
    );
};

export default InstagramDeleteDialog;
