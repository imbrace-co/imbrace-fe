import { IconButton, Switch } from '@imbrace/ui';
import DeleteIcon from '@mui/icons-material/Delete';
import DeviceHubIcon from '@mui/icons-material/DeviceHub';
import { Grid, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import useFacebook from '@/hooks/useFacebook';
import FacebookDeleteDialog from '@/pages/Credentials/components/FacebookDeleteDialog';
import { createFacebook } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

interface FacebookActionsProps {
    active?: boolean;
    onFinish?: () => void;
    workflowId?: string;
}

const FacebookActions = (props: FacebookActionsProps) => {
    const { active, onFinish, workflowId } = props;
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { pages, accessToken, userID, login } = useFacebook();
    const [openDialog, setOpenDialog] = useState<boolean>(false);

    const serialize = useCallback(async () => {
        try {
            if (userID && pages) {
                const res = await apiFetch<API.FacebookChannel[]>(createFacebook.api(), createFacebook.method, {
                    access_token: accessToken,
                });
                if (res.status === 200) {
                    onFinish && onFinish();
                }
            }
        } catch (error) {
            console.log(error);
        }
    }, [pages, userID, accessToken, onFinish]);

    useEffect(() => {
        serialize();
    }, [serialize]);

    return (
        <>
            <FacebookDeleteDialog
                open={openDialog}
                title={t('credential_delete_facebook_title')}
                content={<Trans i18nKey="credential_delete_facebook_body" t={t} />}
                onClose={() => setOpenDialog(false)}
                actionsAlign={'flex-end'}
                onFinish={onFinish}
            />

            <Grid container spacing={0} justifyContent="center" alignItems="center">
                <Grid
                    item
                    sx={{
                        display: 'flex',
                    }}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Typography
                        sx={{
                            fontSize: '0.875rem',
                            fontWeight: 400,
                            lineHeight: '21px',
                            letterSpacing: '0.01071em',
                            color: 'var(--color-light-7)',
                        }}
                    >
                        {t('status_active')}
                    </Typography>
                    <Switch
                        type="xs"
                        checked={active}
                        onChange={async () => {
                            await login();
                            return true;
                        }}
                    />
                </Grid>
                {workflowId && (
                    <Grid item>
                        <IconButton
                            sx={{ ...(!workflowId && { color: 'var(--color-light-4)' }) }}
                            onClick={() => {
                                // always link to ap-wf workflow (v2)
                                navigate('/workflow-v2', {
                                    state: {
                                        flowId: workflowId,
                                    },
                                });
                            }}
                        >
                            <DeviceHubIcon />
                        </IconButton>
                    </Grid>
                )}
                <Grid item>
                    <IconButton onClick={() => setOpenDialog(true)}>
                        <DeleteIcon />
                    </IconButton>
                </Grid>
            </Grid>
        </>
    );
};

export default FacebookActions;
