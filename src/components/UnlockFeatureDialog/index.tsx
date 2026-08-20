import { Button, Space, Typography } from '@imbrace/ui';
import { QRCode } from 'antd';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import { env } from '@/env';
import { CAMPAIGN_QRCODE_URL } from '@/services/baseURL';

import Dialog from '../Dialog';

const UnlockFeature = ({
    openHelpCenter,
    channel,
    touchpoint,
    title,
    content,
    initialStep,
}: {
    openHelpCenter?: (channelId: string) => void;
    channel?: API.Channel;
    touchpoint?: API.Touchpoint;
    title?: string;
    content?: string;
    initialStep?: number;
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(true);
    const [step, setStep] = useState(initialStep || 1);
    const qrCodeUrl = touchpoint ? encodeURI(`${CAMPAIGN_QRCODE_URL}?id=${touchpoint._id}&env=${env.VITE_APP_ENV}`) : '';

    return (
        <Dialog
            open={open}
            title={step === 1 ? t('unlock_feature_title') : title || t('unlock_feature_accept_title')}
            content={
                step === 1 ? (
                    <Typography style={{ whiteSpace: 'pre-wrap' }}>{t('unlock_feature_desc')}</Typography>
                ) : (
                    ({ onClose }) => (
                        <>
                            <Typography style={{ color: 'var(--color-light-5)' }}>{content || t('unlock_feature_accept_desc')}</Typography>
                            <Space size={48} style={{ marginTop: '48px' }} align="start">
                                <Space size={8} direction="vertical">
                                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                        {t('via', { via: 'Web Chat' })}
                                    </Typography>
                                    <div
                                        style={{
                                            width: '60px',
                                            aspectRatio: '1/1',
                                            borderRadius: '100%',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {channel && (
                                            <img style={{ maxWidth: '100%' }} src={channel?.config?.chatbot_avatar} alt="imbrace support" />
                                        )}
                                    </div>
                                    {
                                        <Button
                                            onClick={() => {
                                                onClose?.();
                                                if (channel) {
                                                    openHelpCenter?.(channel._id);
                                                }
                                            }}
                                            size="xxs"
                                            variant="link"
                                            text={t('start_chat')}
                                        />
                                    }
                                </Space>
                                <Space size={8} direction="vertical" align="start">
                                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                        {t('via', { via: 'Whatsapp' })}
                                    </Typography>
                                    <div
                                        style={{
                                            width: '88px',
                                            aspectRatio: '1/1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {touchpoint && (
                                            <QRCode
                                                style={{
                                                    padding: 0,
                                                    borderRadius: 0,
                                                }}
                                                errorLevel="H"
                                                bordered={false}
                                                bgColor="white"
                                                size={88}
                                                iconSize={88 * 0.4}
                                                value={qrCodeUrl ? qrCodeUrl + '&isFromQRcode=true' : ''}
                                                icon={touchpoint?.logo}
                                            />
                                        )}
                                    </div>
                                </Space>
                            </Space>
                        </>
                    )
                )
            }
            showCloseButton
            onBackdropClose={() => {
                setOpen(false);
            }}
            onClose={() => {
                setOpen(false);
            }}
            hideCancelButton
            hideConfirmButton={step === 2}
            onConfirm={() => {
                if (step === 1) {
                    setStep(2);
                    return;
                }
            }}
            confirmText={t('upgrade_now')}
            confirmButtonProps={{
                size: 'default',
            }}
            actionsAlign="flex-start"
        />
    );
};

export const openUnlockFeature = (props: {
    openHelpCenter?: (channelId: string) => void;
    channel?: API.Channel;
    touchpoint?: API.Touchpoint;
    title?: string;
    content?: string;
    initialStep?: number;
}) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<UnlockFeature {...props} />, document.body));
};
