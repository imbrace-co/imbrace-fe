import type { ButtonProps } from '@imbrace/ui';
import { Button, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { Box, ThemeProvider, Typography as MuiTypography } from '@mui/material';
import Checkbox from '@mui/material/Checkbox';
import MuiDialog from '@mui/material/Dialog';
import MuiDialogActions from '@mui/material/DialogActions';
import MuiDialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import MuiDialogTitle from '@mui/material/DialogTitle';
import type { SxProps, Theme } from '@mui/material/styles';
import { createTheme, styled } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { ChangeEvent, MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/App';
import { getCustomMUITheme } from '@/contexts/ThemeContext';

export const DialogTitle = styled(MuiDialogTitle)(() => ({
    padding: 0,
    color: 'var(--color-light-7)',
    fontSize: 20,
    fontWeight: 800,
    lineHeight: '32px',
    textAlign: 'left',
}));

export const DialogContent = styled(MuiDialogContent)(() => ({
    padding: '0 32px 32px 32px',
    '& .MuiDialogContentText-root': {
        fontSize: '14px',
        fontWeight: 400,
        fontStyle: 'normal',
        letterSpacing: '0.25px',
        lineHeight: '16px',
        color: 'var(--color-light-5)',
        textAlign: 'left',
    },
}));

export const DialogActions = styled(MuiDialogActions, { shouldForwardProp: (propName) => propName !== 'align' })(
    ({ align }: { align?: 'center' | 'flex-end' | 'flex-start' }) => ({
        padding: 0,
        marginTop: '24px',
        width: '100%',
        display: 'flex',
        justifyContent: align ?? 'center',
    }),
);

export interface DialogProps {
    /**
     * open
     * @default
     */
    open: boolean;
    /**
     * Dialog title
     * @default
     */
    title: string | ReactNode;
    /**
     * Dialog content
     * @default
     */
    content:
        | string
        | ReactNode
        | ((data: {
              onClose?: (dontAskAgain?: boolean) => void;
              onConfirm?: (dontAskAgain?: boolean) => Promise<boolean | void> | void;
          }) => ReactNode);
    /**
     * onClose
     * @param dontAskAgain boolean
     */
    onClose?: (dontAskAgain?: boolean) => Promise<void> | void;
    /**
     * onConfirm
     * @param dontAskedAgain boolean
     * @returns true -> will trigger onClose
     *          false -> do nothing after onConfirm
     */
    onConfirm?: (dontAskAgain?: boolean) => Promise<boolean | void> | void;
    /**
     * Cancel button text
     * @default
     */
    cancelText?: string;
    /**
     * Confirm button text
     * @default
     */
    confirmText?: string;
    /**
     * Show Dont Asked Again checkbox
     * @default
     */
    showDontAskedAgain?: boolean;
    /**
     * Show close button
     * @default
     */
    showCloseButton?: boolean;
    /**
     * Buttons align
     * @default
     */
    actionsAlign?: 'center' | 'flex-end' | 'flex-start';
    /**
     * onBackdropClose
     * @param dontAskedAgain boolean
     */
    onBackdropClose?: () => void;
    disabledConfirmText?: boolean;
    /**
     * Hide confirm button
     */
    hideConfirmButton?: boolean;
    /**
     * Hide cancel button
     */
    hideCancelButton?: boolean;
    /**
     * Confirm button props
     */
    confirmButtonProps?: ButtonProps;
    /**
     * Cancel button props
     */
    cancelButtonProps?: ButtonProps;
    paperSx?: SxProps<Theme>;
    backdropClosable?: boolean;
}

interface DialogHOCProps extends Omit<DialogProps, 'open'> {
    backdropClosable?: boolean;
}

const Dialog = (props: DialogProps) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);
    const [cancelLoading, setCancelLoading] = useState<boolean>(false);
    const [dontAskedAgain, setDontAskedAgain] = useState<boolean>(false);
    const {
        title,
        content,
        onClose,
        onConfirm,
        cancelText,
        confirmText,
        showDontAskedAgain,
        onBackdropClose,
        actionsAlign = 'flex-end',
        hideConfirmButton,
        hideCancelButton,
        confirmButtonProps,
        cancelButtonProps,
        showCloseButton,
        paperSx,
        backdropClosable,
        ...restProps
    } = props;

    const onClick = async () => {
        try {
            setLoading(true);
            const shouldClose = await onConfirm?.(dontAskedAgain);
            if (shouldClose) {
                onClose?.();
            }
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    const onCloseHandler = async (
        event: Record<string, never> | ReactMouseEvent<HTMLButtonElement, MouseEvent>,
        reason?: 'backdropClick' | 'escapeKeyDown',
    ) => {
        try {
            if (!backdropClosable && reason === 'backdropClick') {
                return;
            }
            setCancelLoading(true);
            if (backdropClosable && reason === 'backdropClick' && onBackdropClose) {
                onBackdropClose();
                setCancelLoading(false);
                return;
            }
            await onClose?.(dontAskedAgain);
            setCancelLoading(false);
        } catch (error) {
            setCancelLoading(false);
        }
    };

    const handleChangeDontAskedAgain = (event: ChangeEvent<HTMLInputElement>) => {
        setDontAskedAgain(event.target.checked);
    };

    return (
        <MuiDialog
            onClose={onCloseHandler}
            PaperProps={{
                sx: {
                    width: 500,
                    justifyContent: 'center',
                    ...paperSx,
                },
            }}
            {...restProps}
        >
            <Space align="start" justify="between" style={{ marginBottom: '16px', padding: '32px 32px 0 32px' }}>
                <div>
                    <Typography style={{ color: 'var(--color-light-7)' }} variant="Heading2">
                        {title}
                    </Typography>
                </div>

                {showCloseButton && (
                    <IconButton
                        size="xs"
                        variant="text"
                        type="secondary"
                        sx={{
                            margin: '-2px 0',
                        }}
                        onClick={() => onClose?.(dontAskedAgain)}
                    >
                        <Icon name="close" />
                    </IconButton>
                )}
            </Space>
            <DialogContent>
                {typeof content === 'function' ? content({ onClose, onConfirm }) : <DialogContentText>{content}</DialogContentText>}
                {showDontAskedAgain && (
                    <Box
                        sx={{
                            display: 'flex',
                            gap: '12px',
                            mt: '12px',
                            alignItems: 'center',
                        }}
                    >
                        <Checkbox
                            id="dontask"
                            onChange={handleChangeDontAskedAgain}
                            disableRipple
                            sx={{
                                color: '#e0e0e0',
                                width: 16,
                                height: 16,
                            }}
                        />
                        <MuiTypography
                            htmlFor="dontask"
                            component="label"
                            style={{
                                cursor: 'pointer',
                                color: 'var(--color-light-7)',
                                fontSize: '0.875rem',
                            }}
                        >
                            {t('delete_dont_ask_again')}
                        </MuiTypography>
                    </Box>
                )}
                {(!hideCancelButton || !hideConfirmButton) && (
                    <DialogActions align={actionsAlign}>
                        {!hideCancelButton && (
                            <Button
                                onClick={(e) => {
                                    onCloseHandler?.(e);
                                }}
                                variant="outlined"
                                size="s"
                                loading={cancelLoading}
                                text={cancelText || t('cancel')}
                                {...cancelButtonProps}
                            />
                        )}
                        {!hideConfirmButton && (
                            <Button
                                key="submitButton"
                                loading={loading}
                                onClick={onClick}
                                variant="contained"
                                size="s"
                                text={confirmText || t('delete')}
                                {...confirmButtonProps}
                            />
                        )}
                    </DialogActions>
                )}
            </DialogContent>
        </MuiDialog>
    );
};

const DialogHOC = ({ onClose, onConfirm, onBackdropClose, backdropClosable = true, ...restProps }: Omit<DialogProps, 'open'>) => {
    const [open, setOpen] = useState(true);
    const client = useQueryClient(queryClient);
    const MUItheme = useMemo(() => createTheme(getCustomMUITheme('light')), []);

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <ThemeProvider theme={MUItheme}>
                <QueryClientProvider client={client}>
                    <Dialog
                        open={open}
                        onClose={async (dontAskAgain) => {
                            await onClose?.(dontAskAgain);
                            setOpen(false);
                        }}
                        onConfirm={async (dontAskAgain) => {
                            const result = await onConfirm?.(dontAskAgain);
                            setOpen(false);
                            return result;
                        }}
                        onBackdropClose={() => {
                            if (onBackdropClose) {
                                onBackdropClose();
                            }
                            setOpen(false);
                        }}
                        backdropClosable={backdropClosable}
                        {...restProps}
                    />
                </QueryClientProvider>
            </ThemeProvider>
        </LocalizationProvider>
    );
};
export const dialog = (props: DialogHOCProps) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<DialogHOC {...props} />, document.body));
};

export default Dialog;
