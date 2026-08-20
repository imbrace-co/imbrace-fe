import { Button } from '@imbrace/ui';
import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import ImbraceLogo from '@/pages/SignIn/components/ImbraceLogo';
import LandingPageLayout from '@/pages/SignIn/components/LandingPageLayout';
import { PageHeader } from '@/pages/SignIn/StyledComponents';
import { resetCurrentEmailAndStep } from '@/redux/slices/login';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import LoginForm from './components/LoginForm';

const Otp = () => {
    const { t } = useTranslation();
    const { search } = useLocation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const account = useAppSelector((state) => state.Account);

    useEffect(() => {
        dispatch(resetCurrentEmailAndStep({ email: '', step: 0 }));
    }, [dispatch]);

    if (account.loadingStatus === 'FETCH_SUCCEEDED') return <Navigate to={{ pathname: '/ai-agent', search }} replace />;

    return (
        <LandingPageLayout>
            <ImbraceLogo />
            <PageHeader>{t('login-sign-in-to-your-account')}</PageHeader>
            <LoginForm />
            <Box sx={{ marginTop: '26px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <Typography
                    sx={{
                        fontWeight: 400,
                        fontSize: '14px',
                        lineHeight: '20px',
                        color: 'var(--color-light-7)',
                    }}
                >
                    {t('login-dont-have-an-account')}
                </Typography>

                <Button
                    text={t('login-sign-up-for-an-account')}
                    variant="link"
                    onClick={() => {
                        navigate('/signup');
                    }}
                />
            </Box>
        </LandingPageLayout>
    );
};

export default Otp;
