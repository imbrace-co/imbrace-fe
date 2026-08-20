import { Button, Typography } from '@imbrace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import EmailVerifiedSvg from '@/assets/illustration/verified-email.svg?react';
import { ContentContainer, Footer, PageLayout } from '@/pages/SignIn/components/LandingPageLayout/StyledComponents';

import styles from './index.module.scss';

const EmailVerified = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <PageLayout>
            <ContentContainer>
                <EmailVerifiedSvg />
                <Typography variant="Heading1" className={styles.heading}>
                    {t('email_verified_header')}
                </Typography>
                <Typography variant="SubHeading2Light" className={styles.body}>
                    {t('email_verified_body')}
                </Typography>
                <Button
                    text={t('email_verified_continue_to_signin_button')}
                    sx={{ marginTop: '24px' }}
                    onClick={() => {
                        navigate('/');
                    }}
                />
            </ContentContainer>
            <Footer>
                <Typography variant="Caption" className={styles.copyright}>
                    Powered by{' '}
                    <a href="https://www.imbrace.co/" target="_blank" rel="noreferrer">
                        iMBrace Limited
                    </a>
                    .
                </Typography>
            </Footer>
        </PageLayout>
    );
};

export default EmailVerified;
