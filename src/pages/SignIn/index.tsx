import styled from '@emotion/styled';
import { Button } from '@imbrace/ui';
import { Divider, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { resetCurrentEmailAndStep } from '@/redux/slices/login';
import { useAppDispatch } from '@/redux/store';

import ImbraceLogo from './components/ImbraceLogo';
import LandingPageLayout from './components/LandingPageLayout';
import SignInForm from './components/SignInForm';
import { PageHeader } from './StyledComponents';

const SignInContainer = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

export const StyledDivider = styled(Divider)(() => ({
    width: '100%',
    margin: '12px 0',
}));

const SignIn = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    return (
        <LandingPageLayout>
            <ImbraceLogo />
            <PageHeader>{t('login-sign-in-to-your-account')}</PageHeader>

            <SignInContainer>
                <SignInForm />
            </SignInContainer>

            <Typography
                sx={{
                    mt: '20px',
                    textAlign: 'center',
                    fontWeight: 400,
                    fontSize: '14px',
                    color: 'var(--color-light-7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                }}
            >
                <span>{t('login-dont-have-an-account')}</span>
                <Button
                    text={t('login-sign-up-for-an-account')}
                    variant="link"
                    size="xs"
                    sx={{ fontWeight: 800 }}
                    onClick={() => {
                        dispatch(resetCurrentEmailAndStep({ email: '', step: 0 }));
                        navigate('/signup');
                    }}
                />
            </Typography>
        </LandingPageLayout>
    );
};

export default SignIn;
