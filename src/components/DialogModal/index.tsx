import { IconButton } from '@imbrace/ui';
import ClearIcon from '@mui/icons-material/Clear';
import ErrorIcon from '@mui/icons-material/Error';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import WarningIcon from '@mui/icons-material/Warning';
import type { SxProps } from '@mui/material';
import { Box, Button, Dialog as MuiDialog, Typography } from '@mui/material';
import type { DialogProps } from '@mui/material/Dialog';
import { styled } from '@mui/material/styles';
import type { ElementType, FC } from 'react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

const Dialog = styled(MuiDialog)(() => ({
    '& .MuiPaper-root': {
        overflow: 'hidden',
    },
}));

interface DialogModalProps extends DialogProps {
    open: boolean;
    modalState?: string;
    subtitle?: string;
    children: JSX.Element;
    mode?: string;
    title?: string;
    showClose?: boolean;
    showHeader?: boolean;
    handleClose?: () => void;
    onConfirm?: () => void;
    onCancel?: () => void;
    customContentIcon?: JSX.Element;
    confirmButtonText?: string;
    cancelButtonText?: string;
    sxContent?: SxProps;
    sxDialog?: SxProps;
    sxHeader?: SxProps;
    slots?: { backdrop?: ElementType; root?: ElementType };
}
interface ModeTypes {
    alert: { icon: JSX.Element };
    'alert-only-ok': { icon: JSX.Element };
    notice: { icon: JSX.Element };
    'fill-in-info': { icon: JSX.Element };
    'system-message': { icon: JSX.Element };
    'fill-in-info-mutiple': { icon: JSX.Element };
    delete: { icon: JSX.Element };
}
const DialogModal: FC<DialogModalProps> = (props) => {
    const { t } = useTranslation();
    const {
        open,
        onClose,
        handleClose,
        onConfirm,
        onCancel,
        children,
        mode,
        title,
        subtitle,
        content,
        customContentIcon,
        confirmButtonText,
        cancelButtonText,
        showClose,
        showHeader,
        sxContent,
        sxDialog,
        sxHeader,
        slots,
    } = props;
    const modeTypes = {
        alert: {
            icon: <WarningIcon className={styles.contentIcon} color={'error'} />,
        },
        'alert-only-ok': {
            icon: <WarningIcon className={styles.contentIcon} color={'error'} />,
        },
        notice: {
            icon: <ErrorIcon className={styles.contentIcon} sx={{ color: '#39F' }} />,
        },
        'fill-in-info': {
            icon: <div></div>,
        },
        'system-message': {
            icon: <div></div>,
        },
        'fill-in-info-mutiple': {
            icon: <div></div>,
        },
        delete: {
            icon: <div></div>,
        },
    };

    return (
        <Dialog maxWidth={'md'} fullWidth={true} open={open} onClose={onClose} sx={sxDialog} slots={slots}>
            <Box className={styles.container}>
                {showHeader && (
                    <Box className={styles.header} sx={sxHeader}>
                        {showClose && mode !== 'fill-in-info' && (
                            <IconButton onClick={handleClose} variant="text" type="secondary" size="xs" disableRipple>
                                <ClearIcon />
                            </IconButton>
                        )}
                        <Typography variant="h6" sx={{ color: '#39F', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {title || (mode === 'alert' || mode === 'alert-only-ok' ? 'Alert' : '')}
                        </Typography>
                        {subtitle && (
                            <Typography variant="subtitle1" gutterBottom>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                )}
                <Box className={styles.content} sx={sxContent}>
                    {customContentIcon ? <Box sx={{ mr: 3 }}>{customContentIcon}</Box> : mode && modeTypes[mode as keyof ModeTypes]?.icon}
                    {children ? children : <Typography>{content || ''}</Typography>}
                </Box>
                {mode && (
                    <Box className={styles.actionPanel}>
                        {mode === 'alert' && (
                            <Fragment>
                                <Button variant="contained" onClick={onCancel} className={styles.cancelButton}>
                                    {cancelButtonText || t('cancel')}
                                </Button>
                                <Button variant="contained" onClick={onConfirm} className={styles.confirmButton}>
                                    {confirmButtonText || t('confirm')}
                                </Button>
                            </Fragment>
                        )}
                        {mode === 'alert-only-ok' && (
                            <Button variant="contained" onClick={onConfirm} className={styles.confirmButton}>
                                {confirmButtonText || t('confirm')}
                            </Button>
                        )}
                        {mode === 'fill-in-info' && (
                            <Button variant="contained" onClick={onConfirm} className={styles.confirmButton}>
                                {confirmButtonText || t('done')}
                            </Button>
                        )}
                        {mode === 'system-message' && (
                            <Button variant="contained" onClick={onConfirm} className={styles.confirmButton} endIcon={<ThumbUpIcon />}>
                                {confirmButtonText || t('acknowledged')}
                            </Button>
                        )}
                        {mode === 'delete' && (
                            <Button variant="contained" onClick={onConfirm} className={styles.confirmButton}>
                                {confirmButtonText || t('delete')}
                            </Button>
                        )}
                    </Box>
                )}
            </Box>
        </Dialog>
    );
};

export default DialogModal;
