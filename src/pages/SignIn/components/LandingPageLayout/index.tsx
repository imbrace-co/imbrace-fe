import { Typography } from '@imbrace/ui';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import type { SxProps } from '@mui/material';
import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import React from 'react';

import ActionButton from '@/components/ActionButton';

import LanguageSelector from '../LanguageSelector';
import styles from './index.module.scss';
import { ContentContainer, Footer, Header, LanguageSelectorContainer, PageLayout } from './StyledComponents';

interface Props {
    children: ReactNode;
    header?: ReactNode;
    backBtnText?: string;
    onBack?: () => void;
    sx?: SxProps;
}

const LandingPageLayout = (props: Props) => {
    const { children, header, backBtnText, onBack, ...restProps } = props;

    const currentYear = new Date().getFullYear();

    return (
        <PageLayout {...restProps}>
            {onBack && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: '26px',
                        left: '24px',
                    }}
                >
                    <ActionButton onClick={onBack} type="secondary" text={backBtnText} icon={<ArrowBackIosNewIcon sx={{ height: 19 }} />} />
                </Box>
            )}

            <LanguageSelectorContainer>
                <LanguageSelector />
            </LanguageSelectorContainer>
            {header && <Header>{header}</Header>}
            <ContentContainer>{children}</ContentContainer>
            <Footer>
                <Typography variant="Caption" className={styles.copyright}>
                    Powered by{' '}
                    <a href="https://www.imbrace.co/" target="_blank" rel="noreferrer">
                        iMBrace Limited
                    </a>{' '}
                    {currentYear}.
                </Typography>
            </Footer>
        </PageLayout>
    );
};

export default LandingPageLayout;
