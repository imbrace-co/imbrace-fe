import { zodResolver } from '@hookform/resolvers/zod';
import type { ButtonProps } from '@imbrace/ui';
import { Button, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { createTheme, type SxProps, type Theme, ThemeProvider } from '@mui/material';
import MuiDialog from '@mui/material/Dialog';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import type { DefaultValues, FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { HistoryRouter as Router } from 'redux-first-history/rr6';
import type { z } from 'zod';

import { queryClient } from '@/App';
import { getCustomMUITheme } from '@/contexts/ThemeContext';

import { history } from '../../redux/store';
import type { DialogProps } from '.';
import { dialog, DialogActions, DialogContent } from '.';
export interface DialogFormProps<F extends FieldValues, S extends z.ZodType<F>>
    extends Omit<DialogProps, 'showDontAskedAgain' | 'onConfirm' | 'content' | 'confirmButtonProps'> {
    /**
     * onClose
     */
    onClose: () => void;
    /**
     * onConfirm
     * @param formData
     * @returns true -> will trigger onClose
     *          false -> do nothing after onConfirm
     */
    onConfirm: (formData: F, methods: UseFormReturn<F, any>) => Promise<boolean | void>;
    /**
     * Dialog content
     * @param methods hook from methods
     * @default
     */
    content: (methods: UseFormReturn<F, any>, onClose: () => void) => ReactNode;
    defaultValues?: DefaultValues<F>;
    showUnsavedDialog?: boolean;
    confirmButtonProps?: ButtonProps | ((formData?: F) => ButtonProps);
    paperSx?: SxProps<Theme>;
    schema?: S;
}

interface DialogHOCProps<F extends FieldValues, S extends z.ZodType<F>> extends Omit<DialogFormProps<F, S>, 'open'> {
    backdropClosable?: boolean;
}

const FormAction = ({
    methods,
    onSubmit,
    onClose,
    loading,
    actionsAlign,
    hideCancelButton,
    cancelText,
    cancelButtonProps,
    confirmText,
    confirmButtonProps,
}: {
    methods: UseFormReturn<any, any, any>;
    onSubmit: () => void;
    onClose: () => void;
    loading: boolean;
    actionsAlign: 'center' | 'flex-end' | 'flex-start';
    hideCancelButton?: boolean;
    cancelText?: string;
    cancelButtonProps?: ButtonProps;
    confirmText?: string;
    confirmButtonProps?: ButtonProps | ((formData?: any) => ButtonProps);
}) => {
    const { t } = useTranslation();
    const { isDirty, isValid, errors } = methods.formState;

    return (
        <DialogActions align={actionsAlign}>
            {!hideCancelButton && (
                <Button
                    onClick={() => {
                        onClose();
                    }}
                    variant="outlined"
                    size="s"
                    text={cancelText || t('cancel')}
                    {...cancelButtonProps}
                />
            )}
            <Button
                key="submitButton"
                loading={loading}
                disabled={!isDirty || !isValid || Object.keys(errors).length !== 0}
                onClick={onSubmit}
                variant="contained"
                size="s"
                text={confirmText || t('delete')}
                {...(typeof confirmButtonProps === 'function' ? confirmButtonProps(methods.watch()) : confirmButtonProps)}
            />
        </DialogActions>
    );
};

const DialogForm = <F extends FieldValues, S extends z.ZodType<F>>(props: DialogFormProps<F, S>) => {
    const { t } = useTranslation();

    const [loading, setLoading] = useState<boolean>(false);
    const {
        title,
        content,
        onClose,
        onConfirm,
        cancelText,
        confirmText,
        onBackdropClose,
        actionsAlign = 'flex-end',
        hideCancelButton,
        confirmButtonProps,
        cancelButtonProps,
        showCloseButton,
        defaultValues,
        showUnsavedDialog = false,
        paperSx,
        schema,
        ...restProps
    } = props;

    const methods = useForm<F>({
        mode: 'all',
        defaultValues,
        resolver: schema ? zodResolver(schema, { async: true }, { mode: 'async' }) : undefined,
    });

    const onClick = async () => {
        await methods.handleSubmit(onSubmit)();
    };

    const onSubmit: SubmitHandler<F> = useCallback(
        async (formData) => {
            setLoading(true);
            try {
                const result = await onConfirm(formData, methods);
                if (result) {
                    onClose();
                }
                setLoading(false);
            } catch (err) {
                console.log('dialogForm onSubmit err: ', err);
                setLoading(false);
            }
        },
        [methods, onClose, onConfirm],
    );

    const onCloseHandler = useCallback(
        (event?: Record<string, never>, reason?: 'backdropClick' | 'escapeKeyDown') => {
            if (showUnsavedDialog && methods.formState.isDirty) {
                dialog({
                    title: t('crm_unsave_prompt_title'),
                    content: t('crm_unsave_prompt_content'),
                    actionsAlign: 'flex-end',
                    confirmText: t('crm_unsave_prompt_confirm_text'),
                    cancelText: t('crm_unsave_prompt_cancel_text'),
                    onConfirm: async () => {
                        await methods.handleSubmit(onSubmit)();
                        return false;
                    },
                    onClose: () => {
                        onClose();
                    },
                });
                return;
            }
            if (reason === 'backdropClick' && onBackdropClose) {
                onBackdropClose();
                return;
            }
            onClose();
        },
        [methods, onBackdropClose, onClose, onSubmit, showUnsavedDialog, t],
    );

    // useEffect(() => {
    //     methods.trigger();
    // }, [methods]);

    const children = useMemo(() => {
        return content(methods, onCloseHandler);
    }, [methods, content, onCloseHandler]);

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
            scroll="paper"
            {...restProps}
        >
            <Space align="start" justify="between" style={{ marginBottom: '16px', padding: '32px 32px 0 32px' }}>
                <div>
                    <Typography style={{ color: 'var(--color-light-7)' }} variant="Heading2">
                        {title}
                    </Typography>
                </div>

                {showCloseButton && (
                    <IconButton size="xs" variant="text" type="secondary" onClick={() => onClose()}>
                        <Icon name="close" />
                    </IconButton>
                )}
            </Space>
            <DialogContent>
                <FormProvider {...methods}>
                    <form onSubmit={methods.handleSubmit(onSubmit)}>
                        <div>{children}</div>

                        <FormAction
                            methods={methods}
                            loading={loading}
                            actionsAlign={actionsAlign}
                            hideCancelButton={hideCancelButton}
                            confirmButtonProps={confirmButtonProps}
                            cancelButtonProps={cancelButtonProps}
                            confirmText={confirmText}
                            cancelText={cancelText}
                            onSubmit={onClick}
                            onClose={onClose}
                        />
                    </form>
                </FormProvider>
            </DialogContent>
        </MuiDialog>
    );
};

const DialogHOC = <F extends FieldValues, S extends z.ZodType<F>>({
    onClose,
    onConfirm,
    onBackdropClose,
    backdropClosable = true,
    ...restProps
}: DialogHOCProps<F, S>) => {
    const [open, setOpen] = useState(true);
    const client = useQueryClient(queryClient);
    const MUItheme = useMemo(() => createTheme(getCustomMUITheme('light')), []);

    return (
        <Router history={history}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
                <ThemeProvider theme={MUItheme}>
                    <QueryClientProvider client={client}>
                        <DialogForm
                            open={open}
                            onClose={() => {
                                onClose();
                                setOpen(false);
                            }}
                            onConfirm={async (formData, methods) => {
                                const result = await onConfirm(formData, methods);

                                return result;
                            }}
                            onBackdropClose={() => {
                                if (!backdropClosable) {
                                    return;
                                }
                                if (onBackdropClose) {
                                    onBackdropClose();
                                }
                                setOpen(false);
                            }}
                            {...restProps}
                        />
                    </QueryClientProvider>
                </ThemeProvider>
            </LocalizationProvider>
        </Router>
    );
};
export const dialogForm = <F extends FieldValues, S extends z.ZodType<F> = z.ZodTypeAny>(props: DialogHOCProps<F, S>) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);

    return root.render(createPortal(<DialogHOC {...props} />, document.body));
};

export default DialogForm;
