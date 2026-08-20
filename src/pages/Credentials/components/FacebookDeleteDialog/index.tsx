import { Button } from '@imbrace/ui';
import { Divider, ListItemAvatar } from '@mui/material';
import MuiBox from '@mui/material/Box';
import MuiDialog from '@mui/material/Dialog';
import MuiDialogActions from '@mui/material/DialogActions';
import MuiDialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import MuiDialogTitle from '@mui/material/DialogTitle';
import MuiList from '@mui/material/List';
import MuiListItem from '@mui/material/ListItem';
import MuiListItemText from '@mui/material/ListItemText';
import { styled } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/Avatar';
import useFacebook from '@/hooks/useFacebook';
import { createFacebook } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

interface Page {
    credential_id: string;
    name: string;
}

export const DialogTitle = styled(MuiDialogTitle)(() => ({
    padding: 0,
    marginBottom: '12px',
    color: 'var(--color-light-7)',
    fontSize: 20,
    fontWeight: 800,
    lineHeight: '24px',
    textAlign: 'left',
}));

export const DialogContent = styled(MuiDialogContent)(() => ({
    flex: 'none',
    padding: 0,
    marginBottom: '32px',
    '& .MuiDialogContentText-root': {
        fontSize: '14px',
        fontWeight: 400,
        fontStyle: 'normal',
        letterSpacing: '0.25px',
        lineHeight: '17.5px',
        color: 'var(--color-light-5)',
        textAlign: 'left',
    },
}));

export const DialogActions = styled(MuiDialogActions, { shouldForwardProp: (propName) => propName !== 'align' })(
    ({ align }: { align?: 'center' | 'flex-end' }) => ({
        padding: 0,
        width: '100%',
        display: 'flex',
        justifyContent: align ?? 'center',
    }),
);

export const PageName = styled(MuiListItemText)(() => ({
    margin: 0,
    '& span.MuiTypography-root': {
        color: 'var(--color-light-7)',
        fontSize: '1.125rem',
        lineHeight: '19px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
    '& p.MuiTypography-root': {
        color: 'var(--color-light-5)',
        fontSize: '0.875rem',
        lineHeight: '16px',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
    },
}));

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

interface FacebookDeleteProps {
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

const FacebookDeleteDialog = (props: FacebookDeleteProps) => {
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

    const { pages, accessToken, userID, login, clear } = useFacebook();
    const { t } = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);
    const [pagesToBeCreated, setPagesToBeCreated] = useState<Page[]>([]);
    const [pagesToBeDeleted, setPagesToBeDeleted] = useState<Page[]>([]);
    const [activeStep, setActiveStep] = useState<number>(0);

    const onNext = () => {
        setActiveStep(1);
    };

    const onCloseHandler = async () => {
        await Promise.all([clear(), onFinish && onFinish(), onClose()]);
        await new Promise((resolve) => setTimeout(resolve, 1500)); // avoid flickered modal when closing
        setActiveStep(0);
        setPagesToBeDeleted([]);
        setPagesToBeCreated([]);
    };

    const serialize = useCallback(async () => {
        try {
            if (userID && pages && accessToken) {
                setLoading(true);
                const { data } = await apiFetch<API.FacebookChannel[]>(createFacebook.api(), createFacebook.method, {
                    access_token: accessToken,
                });

                const toBeDeleted = data.filter((page) => page.is_deleted);
                setPagesToBeDeleted(toBeDeleted);
                const toBeCreated = data.filter((page) => !page.is_deleted);
                setPagesToBeCreated(toBeCreated);

                if (toBeDeleted.length === 0 && toBeCreated.length > 0) {
                    setActiveStep(1);
                }
                setLoading(false);
            }
        } catch (error) {
            setLoading(false);
            console.error('Facebook pages serializing error: ', error);
        }
    }, [pages, userID, accessToken]);

    useEffect(() => {
        serialize();
    }, [serialize]);

    const renderPages = () => {
        if (pagesToBeDeleted && activeStep === 0) {
            return (
                <>
                    <DialogTitle>{t('credential_deleted_title')}</DialogTitle>
                    <List>
                        {pagesToBeDeleted.map((page, index) => {
                            return (
                                <Fragment key={page.credential_id}>
                                    <ListItem>
                                        <ListItemAvatar sx={{ minWidth: '35px', marginRight: '27px', position: 'relative' }}>
                                            <Avatar backgroundColor={'var(--color-light-3)'} />
                                        </ListItemAvatar>
                                        <PageName>{page.name}</PageName>
                                    </ListItem>
                                    {pagesToBeDeleted.length > 0 && index !== pagesToBeDeleted.length - 1 && (
                                        <Divider sx={{ margin: '0 16px' }} />
                                    )}
                                </Fragment>
                            );
                        })}
                    </List>
                </>
            );
        }

        if (pagesToBeCreated && activeStep === 1) {
            return (
                <>
                    <DialogTitle>{t('credential_created_facebook_title')}</DialogTitle>
                    <List>
                        {pagesToBeCreated.map((page, index) => {
                            return (
                                <Fragment key={page.credential_id}>
                                    <ListItem>
                                        <ListItemAvatar sx={{ minWidth: '35px', marginRight: '27px', position: 'relative' }}>
                                            <Avatar backgroundColor={'var(--color-light-3)'} />
                                        </ListItemAvatar>
                                        <PageName>{page.name}</PageName>
                                    </ListItem>
                                    {pagesToBeCreated.length > 0 && index !== pagesToBeCreated.length - 1 && (
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
                    minHeight: '291px',
                    padding: '32px',
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
                    {pagesToBeDeleted.length === 0 && pagesToBeCreated.length === 0 && (
                        <>
                            <DialogTitle>{title}</DialogTitle>
                            <DialogContent>
                                <DialogContentText>{content}</DialogContentText>
                            </DialogContent>
                        </>
                    )}

                    {(pagesToBeDeleted.length > 0 || pagesToBeCreated.length > 0) && <>{renderPages()}</>}
                </div>
                <DialogActions align={actionsAlign}>
                    {pagesToBeDeleted.length !== 0 || pagesToBeCreated.length !== 0 ? (
                        <>
                            {pagesToBeCreated.length > 0 && activeStep === 0 ? (
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
                        <Button sx={{ width: '160px' }} loading={loading} onClick={login} text={t('login_facebook')} />
                    )}
                </DialogActions>
            </MuiBox>
        </MuiDialog>
    );
};

const DialogHOC = (props: Omit<FacebookDeleteProps, 'open' | 'onClose'>) => {
    const [open, setOpen] = useState(true);
    return <FacebookDeleteDialog open={open} onClose={() => setOpen(false)} actionsAlign={'flex-end'} {...props} />;
};

export const facebookDeleteDialog = (props: Omit<FacebookDeleteProps, 'open' | 'onClose'>) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<DialogHOC {...props} />, document.body));
};

export default FacebookDeleteDialog;
