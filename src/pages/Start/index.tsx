import { Button, Space, Typography } from '@imbrace/ui';
import { useTour } from '@reactour/tour';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import Onboarding from './Onboarding.svg?react';

const Start = () => {
    const { t } = useTranslation();
    const { setIsOpen, setCurrentStep } = useTour();
    const navigate = useNavigate();

    return (
        <Space justify="center" size={92} style={{ padding: '64px', maxHeight: '100%', overflow: 'auto' }} direction="vertical">
            <div
                style={{
                    width: '100%',
                    maxWidth: '944px',
                    display: 'flex',
                    minHeight: '100px',
                }}
            >
                <div style={{ width: '100%', flex: '1 1 auto', textAlign: 'center' }}>
                    <Onboarding style={{ width: 'auto', height: '100%' }} />
                </div>
            </div>

            <Space size={48} direction="vertical">
                <Space size={12} direction="vertical" style={{ maxWidth: '544px', textAlign: 'center' }}>
                    <Typography variant="Heading1" style={{ color: 'var(--color-light-7)' }}>
                        {t('start_header')}
                    </Typography>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('start_description')}</Typography>
                </Space>
                <Button
                    size="l"
                    text={t('start')}
                    onClick={() => {
                        setCurrentStep(0);
                        navigate('/chatroom', {
                            state: {
                                onBoarding: true,
                            },
                        });

                        setIsOpen(true);
                    }}
                />
            </Space>
        </Space>
    );
};

export default Start;
