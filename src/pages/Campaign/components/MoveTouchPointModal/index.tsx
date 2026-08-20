import type { Option } from '@imbrace/ui';
import { Button, FieldSelect, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import MuiDialog from '@mui/material/Dialog';
import { uniqueId } from 'lodash';
import type { ReactElement } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { DialogActions, DialogContent } from '@/components/Dialog';
import { getCampaigns, putTouchpointById } from '@/services/api/campaign';
import apiFetch from '@/services/axios/handler';

import { CreateCampaign } from '../CreateCampaignModal';
import styles from '../TouchpointCard/index.module.scss';

interface Props {
    open: boolean;
    onClose: (campaign?: { id: string; name: string }) => void;
    touchpoint: API.Touchpoint;
}

const Dialog = (props: Props) => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<{ id: string; name: string }>();
    const [campaigns, setCampaigns] = useState<API.Campaign[]>([]);
    const [step, setStep] = useState('move');
    const { onClose, touchpoint, ...restProps } = props;
    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        watch,
    } = useForm<{ campaign_id: string }>({
        mode: 'all',
        defaultValues: {
            campaign_id: touchpoint.campaign_id || 'all',
        },
    });

    const fetchCampaigns = useCallback(async () => {
        try {
            const { data } = await apiFetch<API.PaginatedResponse<API.Campaign[]>>(getCampaigns.api(), getCampaigns.method);
            setCampaigns(data.data);
        } catch (error) {
            console.log(error);
        }
    }, []);

    useEffect(() => {
        fetchCampaigns();
    }, [fetchCampaigns]);

    const moveTouchpoint = async (campaign: { id: string; name: string }) => {
        try {
            const {
                _id,
                channel: channelData,
                id: tId,
                doc_name,
                deleted_at,
                business_unit_id,
                created_at,
                campaign_name: campaignName,
                public_id,
                organization_id,
                status: s,
                scan_qrcode_count,
                from_url_count,
                execute_workflow_name: ew,
                default_channel_workflow_name: dcw,
                campaign: tCampaign,
                wechat_config,
                ...restData
            } = touchpoint;
            if (campaign.id === 'all') {
                await apiFetch(putTouchpointById.api(touchpoint.id), putTouchpointById.method, {
                    ...restData,
                    channel_id: touchpoint?.channel?.id,
                    campaign_id: null,
                });
            } else {
                await apiFetch(putTouchpointById.api(touchpoint.id), putTouchpointById.method, {
                    ...restData,
                    channel_id: touchpoint?.channel?.id,
                    campaign_id: campaign.id,
                });
            }

            setSuccess(campaign);
            if (step !== 'move') {
                setStep('move');
            }
        } catch (error) {
            console.log(error);
            setSuccess(undefined);
        }
    };

    const submit = async ({ campaign_id }: { campaign_id: string }) => {
        try {
            const existCampaign = campaigns.filter((campaign) => campaign._id === campaign_id)?.[0];
            if (campaign_id === 'all') {
                moveTouchpoint({ id: 'all', name: t('all') });
            }
            if (existCampaign) {
                moveTouchpoint({ id: campaign_id, name: existCampaign.name });
            }
        } catch (error) {
            console.log(error);
            setSuccess(undefined);
        }
    };

    const onClick = async () => {
        try {
            setLoading(true);
            handleSubmit(submit)();
            setLoading(false);
        } catch (error) {
            setLoading(false);
        }
    };

    const onDone = () => {
        onClose(success);
    };

    const renderContent = () => {
        if (step === 'new') {
            return (
                <CreateCampaign
                    confirmText={t('create_and_move')}
                    onClose={(newCampaign) => {
                        if (newCampaign) {
                            moveTouchpoint(newCampaign);
                        } else {
                            setStep('move');
                        }
                    }}
                />
            );
        }
        if (step === 'move') {
            return (
                <>
                    <Typography
                        style={{
                            fontWeight: 800,
                            fontSize: 20,
                            letterSpacing: 'normal',
                            marginBottom: '16px',
                            padding: '32px 32px 0 32px',
                        }}
                    >
                        {success ? t('campaign_move_touchpoint_done') : t('campaign_move_touchpoint')}
                    </Typography>

                    <DialogContent>
                        <div>
                            {success ? (
                                <div className={styles.campaignCard}>
                                    <div className={styles.cardContainer}>
                                        <Space size={12} align="center">
                                            <Icon name="folderOutline" />
                                            <span>{success.name}</span>
                                        </Space>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit(submit)}>
                                    <Controller
                                        name="campaign_id"
                                        control={control}
                                        render={({ field: { onChange, ...restField }, fieldState: { error } }) => (
                                            <FieldSelect
                                                fullWidth
                                                queryKey={['campaign_list', { campaigns }]}
                                                placeholder={t('campaign_add_placeholder')}
                                                error={!!error}
                                                helperText={error?.message}
                                                request={async () =>
                                                    [
                                                        ...campaigns.map((campaign) => ({
                                                            text: campaign.name,
                                                            value: campaign._id,
                                                            icon: <Icon name="folderOutline" />,
                                                        })),
                                                        { text: 'All (as an individual touchpoint)', value: 'all' },
                                                    ] as Option[]
                                                }
                                                footer={() => {
                                                    return (
                                                        <IconButton
                                                            size="default"
                                                            variant="text"
                                                            type="secondary"
                                                            sx={{
                                                                width: '100%',
                                                                padding: '8px 12px',
                                                                gap: '12px',
                                                                justifyContent: 'flex-start',
                                                                textTransform: 'capitalize',
                                                                borderRadius: 0,
                                                            }}
                                                            onClick={() => {
                                                                setStep('new');
                                                            }}
                                                        >
                                                            <Icon
                                                                name="folderAdd"
                                                                fontSize={14}
                                                                style={{ color: 'var(--color-light-5)' }}
                                                            />
                                                            <Space size={4}>
                                                                <Typography style={{ color: 'var(--color-primary-1)' }}>
                                                                    {t('new_campaign')}
                                                                </Typography>
                                                            </Space>
                                                        </IconButton>
                                                    );
                                                }}
                                                onChange={(value) => {
                                                    if (value === 'new') {
                                                        return;
                                                    }
                                                    onChange(value);
                                                }}
                                                {...restField}
                                            />
                                        )}
                                    />
                                </form>
                            )}
                        </div>
                        <DialogActions
                            align="flex-end"
                            sx={{
                                marginTop: '32px',
                            }}
                        >
                            {success ? (
                                <Button onClick={onDone} text={t('done')} />
                            ) : (
                                <>
                                    <Button
                                        onClick={() => {
                                            onClose();
                                        }}
                                        variant="outlined"
                                        text={t('cancel')}
                                    />
                                    <Button
                                        loading={loading}
                                        onClick={onClick}
                                        disabled={!!errors.campaign_id || !watch('campaign_id') || !isDirty}
                                        text={t('move')}
                                    />
                                </>
                            )}
                        </DialogActions>
                    </DialogContent>
                </>
            );
        }
    };

    return (
        <MuiDialog
            PaperProps={{
                sx: {
                    width: 500,
                    justifyContent: 'center',
                },
            }}
            onClose={() => {
                onClose(success);
            }}
            {...restProps}
        >
            {renderContent()}
        </MuiDialog>
    );
};

interface DialogHOCProps {
    touchpoint: API.Touchpoint;
    onClose: (campaign?: { id: string; name: string }) => void;
}

const DialogHOC = ({ touchpoint, onClose }: DialogHOCProps) => {
    const [open, setOpen] = useState(true);
    return (
        <Dialog
            open={open}
            onClose={(campaign) => {
                setOpen(false);
                onClose(campaign);
            }}
            touchpoint={touchpoint}
        />
    );
};

interface DialogsProps {
    container?: HTMLElement;
}
interface DialogsRef {
    open: (props: DialogHOCProps) => void;
}
type DialogItems = DialogHOCProps & {
    key: string;
};
export const Dialogs = forwardRef<DialogsRef, DialogsProps>((props, ref) => {
    const [items, setItems] = useState<DialogItems[]>([]);

    const onClose = (key: string) => {
        setItems((prev) => prev.filter((item) => item.key !== key));
    };

    useImperativeHandle(ref, () => ({
        open: (dialogProps) => {
            const key = uniqueId('imbrace-move-dialog');
            setItems((prev) => {
                const clone = [...prev];
                clone.push({
                    key,
                    ...dialogProps,
                });
                return clone;
            });
        },
    }));

    return createPortal(
        <>
            {items.map((item) => {
                const { key, ...restProps } = item;
                return (
                    <DialogHOC
                        key={`imbrace-move-dialog-${key}`}
                        {...restProps}
                        onClose={(campaign) => {
                            restProps.onClose?.(campaign);
                            onClose(key);
                        }}
                    />
                );
            })}
        </>,
        props.container || document.body,
    );
});

type DialogAPI = {
    openMoveDialog: (dialogProps: DialogHOCProps) => void;
};

type UseDialogType = (props?: DialogsProps) => [DialogAPI, ReactElement];

export const useMoveTouchPointDialog: UseDialogType = (props) => {
    const notificationsRef = useRef<DialogsRef>(null);

    const contextHolder = useMemo(() => <Dialogs ref={notificationsRef} {...props} />, [props]);

    const api = useMemo<DialogAPI>(
        () => ({
            openMoveDialog: (dialogProps: DialogHOCProps) => {
                notificationsRef.current?.open(dialogProps);
            },
        }),
        [],
    );

    return [api, contextHolder];
};
