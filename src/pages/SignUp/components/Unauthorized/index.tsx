import { Button, Typography } from '@imbrace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ErrorSvg from '@/assets/illustration/error404-1.svg?react';
import { ContentContainer, Footer, PageLayout } from '@/pages/SignIn/components/LandingPageLayout/StyledComponents';
import styles from '@/pages/SignUp/components/EmailVerified/index.module.scss';

const Unauthorized404 = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <PageLayout>
            <ContentContainer>
                <ErrorSvg />
                <Typography variant="Heading1" className={styles.heading}>
                    {t('email_verified_error_header')}
                </Typography>
                <Typography variant="SubHeading2Light" className={styles.body}>
                    {t('email_unauthorized_error_body')}
                </Typography>
                <Button text={t('email_unauthorized_error_button')} sx={{ marginTop: '24px' }} onClick={() => navigate('/')} />
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

export default Unauthorized404;
