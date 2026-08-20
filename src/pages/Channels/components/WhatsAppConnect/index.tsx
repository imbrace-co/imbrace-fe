import { Button } from '@imbrace/ui';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import useWhatsAppEmbedded from '@/hooks/useWhatsAppEmbedded';
import { InstructionHeader, InstructionText, SubTitle } from '@/pages/Channels/components/FacebookConnect';
import store from '@/redux/store';
import { createWhatsappV3 } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

interface WhatsAppConnectType {
    setSubmitState?: (state: boolean) => void;
    onClose: () => void;
    onReload?: () => void;
    onResponseAfterCreate?: (data: API.Channel) => void;
}

const WhatsAppConnect = (props: WhatsAppConnectType) => {
    const { onClose, onReload } = props;
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const { step, login: whatsappOnBoarding, accessToken, code, phoneNumberID, wabaID, clear } = useWhatsAppEmbedded();
    const [loading, setLoading] = useState<boolean>(false);

    const serialize = useCallback(async () => {
        try {
            if (wabaID && phoneNumberID && (code || accessToken)) {
                const res = await apiFetch<API.WhatsAppChannel>(createWhatsappV3.api(), createWhatsappV3.method, {
                    config: {
                        // CODE flow (preferred) sends a fresh one-time code the
                        // backend exchanges for a long-lived business token;
                        // access_key is the legacy token-flow fallback.
                        ...(code ? { code } : { access_key: accessToken }),
                        phone_number_id: phoneNumberID,
                        business_account_id: wabaID,
                    },
                });

                if (res.status === 200) {
                    setLoading(false);
                    onReload && onReload();
                    clear();
                    onClose();
                    if (pathname === '/channels/new') {
                        navigate('/channels');
                    }
                }
                setLoading(false);
            }
            console.log('- - - - ');
            console.log('wabaID:: ', wabaID);
            console.log('phoneNumberID:: ', phoneNumberID);
            console.log('accessToken:: ', accessToken);
            console.log('step: ', step);
            setLoading(false);
        } catch (err) {
            setLoading(false);
            clear();
            const error = err as AxiosError;
            console.error(`WhatsApp Onboarding error at ${step}: `, error);
            const message = error?.response?.data?.message;

            const notificationPayload = {
                message: `Failed creating WhatsApp channel: ${message}`,
                messageType: 'noti_failed',
            };
            import('@/redux/slices/notification').then(({ pushNotification }) => {
                store.dispatch(pushNotification({ notification: notificationPayload }));
            });
        }
    }, [step, accessToken, code, phoneNumberID, wabaID, navigate, onClose, onReload, pathname, clear]);

    useEffect(() => {
        serialize();
    }, [serialize]);

    const renderInstruction = () => {
        return (
            <>
                <InstructionHeader>{t('channels_desc_whatsapp')}</InstructionHeader>

                <SubTitle>{t('channels_what_can_it_do')}</SubTitle>
                <InstructionText>
                    <Trans i18nKey="channels_what_whatsapp" t={t} />
                </InstructionText>

                <SubTitle>{t('channels_ready_to_connect')}</SubTitle>
                <InstructionText>{t('channels_ready_whatsapp')}</InstructionText>

                <InstructionText
                    sx={{
                        mt: '24px',
                        color: 'var(--color-light-7)',
                    }}
                >
                    {t('channels_step_by_step_guide')}
                </InstructionText>
            </>
        );
    };

    return (
        <div className={styles.container}>
            <div className={styles.instructionContainer}>{renderInstruction()}</div>

            <div className={styles.footer}>
                <Button
                    disabled={loading}
                    loading={loading}
                    sx={{
                        backgroundColor: 'var(--color-primary-1)',
                        textTransform: 'uppercase',
                        width: '160px',
                        height: '40px',
                        borderRadius: '10px',
                        marginTop: '24px',
                    }}
                    text={t('start')}
                    onClick={async () => {
                        await whatsappOnBoarding();
                        setLoading(true);
                    }}
                />
            </div>
        </div>
    );
};

export default WhatsAppConnect;
