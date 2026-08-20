import { Typography } from '@imbrace/ui';
import React from 'react';
import { useTranslation } from 'react-i18next';

import ErrorSvg from '@/assets/illustration/error404-1.svg?react';
import { ContentContainer, Footer, PageLayout } from '@/pages/SignIn/components/LandingPageLayout/StyledComponents';
import styles from '@/pages/SignUp/components/EmailVerified/index.module.scss';

const InvalidInvitation = () => {
    const { t } = useTranslation();

    return (
        <PageLayout>
            <ContentContainer>
                <ErrorSvg />
                <Typography variant="Heading1" className={styles.heading}>
                    {t('invalid_invitation_header')}
                </Typography>
                <Typography variant="SubHeading2Light" className={styles.body}>
                    {t('invalid_invitation_content')}
                </Typography>
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

export default InvalidInvitation;
