import './verification.css';

import { Button } from '@imbrace/ui';
import Typography from '@mui/material/Typography';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import LogoSVG from '@/assets/icons/imbrace_logo.svg?react';
import { IMBRACE_ACCESS_TOKEN, IMBRACE_REFRESH_TOKEN } from '@/constants/app';
import { resetCurrentEmailAndStep } from '@/redux/slices/login';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { postLoginEmail } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import Copyright from './components/Copyright';
import OTPForm from './components/LoginForm/OTPForm';

const captionText = {
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '20px',
    color: 'var(--color-light-5)',
};

function Verification() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const loginEmail = useAppSelector((state) => state.Login.currentEmailAddress);
    const [otpFetching, setOtpFetching] = useState<boolean>(false);
    const [isBtnDisabled, setIsBtnDisabled] = useState<boolean | undefined>(undefined);
    const [countdown, setCountdown] = useState<number>(60);

    const resendOTP = useCallback(
        async (email: string | null) => {
            try {
                setOtpFetching(true);
                const res = await apiFetch(postLoginEmail.api, postLoginEmail.method, { email });
                setOtpFetching(false);
                return res;
            } catch (err) {
                setOtpFetching(false);
                const error = err as AxiosError<API.ErrorResponse>;
                console.log('resedOTP error: ', error);
                navigate('/', { replace: true });
            }
        },
        [navigate],
    );

    const handleResendOtp = async () => {
        if (isBtnDisabled) return;

        setIsBtnDisabled(true);
        setCountdown(60);

        await resendOTP(loginEmail);
    };

    useEffect(() => {
        const timeInterval = setInterval(() => {
            if (countdown > 0) {
                setCountdown((currCountdown) => currCountdown - 1);
            }
            if (countdown === 0) {
                clearInterval(timeInterval);
                setIsBtnDisabled(false);
            }
        }, 1000);
        return () => {
            clearInterval(timeInterval);
        };
    }, [countdown]);

    useEffect(() => {
        if (!loginEmail) {
            navigate('/', { replace: true });
        }
    }, [loginEmail, navigate]);

    return (
        <div className="verification-page-root">
            <div className="verification-page-container">
                <LogoSVG className="verification-page-logo" />
                <Typography
                    sx={{
                        width: '690px',
                        textAlign: 'center',
                        fontWeight: 800,
                        fontSize: 28,
                        lineHeight: '34px',
                        color: 'var(--color-light-7)',
                        margin: '83px 0 48px 0',
                    }}
                >
                    {t('otp-check-your-email-for-otp')}
                    {loginEmail}
                    <Button
                        text={`(${t('otp-use-another-email')})`}
                        variant="link"
                        sx={{
                            marginLeft: '12px',
                            display: 'inline-block',
                        }}
                        onClick={() => {
                            localStorage.removeItem(IMBRACE_REFRESH_TOKEN);
                            localStorage.removeItem(IMBRACE_ACCESS_TOKEN);
                            dispatch(resetCurrentEmailAndStep({ email: '', step: 0 }));

                            navigate('/otp', { replace: true });
                        }}
                    />
                </Typography>
                <Typography
                    sx={{
                        ...captionText,
                        marginBottom: '12px',
                    }}
                >
                    {t('otp-enter-here')}
                </Typography>
                <OTPForm />
                <Typography sx={{ ...captionText, marginTop: '6px' }}>{t('otp-check-your-spam-folder')}</Typography>
                <Typography sx={{ ...captionText, color: 'var(--color-light-7)', marginTop: '14px' }}>
                    {t('otp-resend-caption')}
                    <Button
                        text={isBtnDisabled ? `${countdown}` : t('resend-otp')}
                        variant="link"
                        sx={{
                            marginLeft: '12px',
                            display: 'inline-block',
                            fontWeight: 800,
                            fontSize: '14px',
                            lineHeight: '20px',
                            letterSpacing: '0.02em',
                            color: 'var(--color-primary-1)',
                        }}
                        onClick={() => handleResendOtp()}
                        disabled={otpFetching || isBtnDisabled}
                    />
                </Typography>
            </div>
            <Copyright className="verification-page-copyright" />
        </div>
    );
}

export default Verification;
