import { Button, FieldText } from '@imbrace/ui';
import { Typography } from '@mui/material';
import MuiDialog from '@mui/material/Dialog';
import type { AxiosError } from 'axios';
import axios from 'axios';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { DialogActions, DialogContent } from '@/components/Dialog';
import { postCampaign } from '@/services/api/campaign';
import apiFetch from '@/services/axios/handler';

interface Props {
    open: boolean;
    onClose: (campaign?: { id: string; name: string }) => void;
}

export const CreateCampaign = ({
    onClose,
    confirmText,
}: {
    onClose: (campaign?: { id: string; name: string }) => void;
    confirmText?: string;
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const { t } = useTranslation();
    const {
        control,
        handleSubmit,
        formState: { errors },
        watch,
        setError,
    } = useForm<{ name: string }>({
        mode: 'all',
    });

    const submit = async ({ name }: { name: string }) => {
        try {
            setLoading(true);
            const { data } = await apiFetch<API.CampaignBase>(postCampaign.api(), postCampaign.method, {
                name,
            });
            setLoading(false);
            onClose({
                id: data.id || data._id,
                name: data.name,
            });
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            setLoading(false);
            if (axios.isAxiosError(error)) {
                const { response } = error;
                if (response?.data) {
                    const { data } = response;
                    if (data?.key?.name === 1 && data.message === 'Duplicate key') {
                        setError('name', { type: 'value', message: t('validation_campaign_exists') });
                    }
                }
            }
            console.log(error);
        }
    };

    const onClick = async () => {
        try {
            handleSubmit(submit)();
        } catch (error) {
            setLoading(false);
        }
    };
    return (
        <>
            <Typography
                sx={{
                    fontWeight: 800,
                    fontSize: 20,
                    marginBottom: '16px',
                    padding: '32px 32px 0 32px',
                }}
            >
                {t('campaign_add_title')}
            </Typography>
            <DialogContent>
                <div>
                    <form onSubmit={handleSubmit(submit)}>
                        <Controller
                            name="name"
                            control={control}
                            rules={{
                                required: t('campaign_validation_require'),
                            }}
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    fullWidth
                                    placeholder={t('campaign_add_placeholder')}
                                    error={!!error}
                                    helperText={error?.message}
                                    {...field}
                                />
                            )}
                        />
                    </form>
                </div>
                <DialogActions
                    align="flex-end"
                    sx={{
                        marginTop: '32px',
                    }}
                >
                    <Button onClick={() => onClose()} variant="outlined" text={t('cancel')} />
                    <Button
                        loading={loading}
                        onClick={onClick}
                        disabled={!!errors.name || !watch('name')}
                        text={confirmText || t('create')}
                    ></Button>
                </DialogActions>
            </DialogContent>
        </>
    );
};

const Dialog = (props: Props) => {
    const { onClose, ...restProps } = props;

    return (
        <MuiDialog
            PaperProps={{
                sx: {
                    width: 500,
                    justifyContent: 'center',
                },
            }}
            onClose={() => {
                onClose();
            }}
            {...restProps}
        >
            <CreateCampaign onClose={onClose} />
        </MuiDialog>
    );
};

const DialogHOC = ({ onClose, ...restProps }: Omit<Props, 'open'>) => {
    const [open, setOpen] = useState(true);
    return (
        <Dialog
            open={open}
            onClose={(campaignId) => {
                onClose(campaignId);
                setOpen(false);
            }}
            {...restProps}
        />
    );
};

export const openCreateCampaignDialog = (props: Omit<Props, 'open'>) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<DialogHOC {...props} />, document.body));
};
