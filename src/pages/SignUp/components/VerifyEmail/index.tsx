import { Button } from '@imbrace/ui';
import { Typography } from '@mui/material';
import type { AxiosError, AxiosResponse } from 'axios';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import ImbraceLogo from '@/pages/SignIn/components/ImbraceLogo';
import { PageHeader } from '@/pages/SignIn/StyledComponents';
import { useAppSelector } from '@/redux/store';
import { signIn, verificationCheck } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

interface Props {
    moveActiveStep: (step?: number) => void;
}

export type VerifyEmailRef = {
    resetVerifyErrorText: () => void;
};

const VerifyEmail = forwardRef<VerifyEmailRef, Props>((props, ref) => {
    // const { moveActiveStep } = props;
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentEmail = useAppSelector((state) => state.Login.currentEmailAddress);
    const { getValues, setValue } = useFormContext();
    const [loading, setLoading] = useState<boolean>(false);
    const [errorText, setErrorText] = useState<string>('');

    useImperativeHandle(ref, () => ({
        resetVerifyErrorText: () => setErrorText(''),
    }));

    useEffect(() => {
        if (currentEmail) {
            setValue('email', currentEmail);
        }
    }, [currentEmail, setValue]);

    const errorHandler = useCallback(
        (error: AxiosError<API.ErrorResponse>) => {
            const { response } = error;
            const { status, data } = response || {};

            const { field, code } = data || {};
            if (status !== 400 || !field || !code) return;

            const errorMapping: Record<string, Record<number, string>> = {
                email: {
                    1: t('error_response_email_required'),
                    3: t('error_response_email_invalid_format'),
                    40004: t('error_response_email_not_signup_or_verified'),
                },
            };

            const errorMessage = errorMapping[field as string]?.[code as number];

            if (errorMessage) {
                setErrorText(errorMessage);
            }
        },
        [setErrorText, t],
    );
    const onVerifyEmail = async () => {
        setErrorText('');
        const userEmail = getValues('email');
        setLoading(true);
        try {
            const verifyCheckRes = await apiFetch<AxiosResponse<any, API.UserSignUpFormData>>(
                verificationCheck.api(userEmail),
                verificationCheck.method,
            );
            if (verifyCheckRes.status === 200) {
                const userPass = getValues('password');
                const { status, data } = await apiFetch<API.UserSignIn>(signIn.api, signIn.method, {
                    email: userEmail,
                    password: userPass,
                });
                if (status === 200) {
                    const { token }: API.UserSignIn = data;
                    window.localStorage.setItem(IMBRACE_ACCESS_TOKEN, token);
                    navigate('/organization', { replace: true });
                    // moveActiveStep(2);
                }
            }
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            console.log('Verify Email Error Res: ', error.response);
            // user failed to sign in without password
            if (error.response?.status === 400) {
                const { data } = error.response;
                const { code, field } = data;
                if (code === 1 && field === 'password') {
                    navigate('/');
                }
            }
            errorHandler(error);
        }
        setLoading(false);
    };

    return (
        <>
            <ImbraceLogo />
            <PageHeader>{t('signup_verify_email_header')}</PageHeader>
            {!errorText ? (
                <Typography
                    variant="body2"
                    sx={{
                        width: '400px',
                        textAlign: 'center',
                        color: 'var(--color-light-5)',
                    }}
                >
                    {t('signup_verify_email_body')}
                </Typography>
            ) : (
                <Typography variant="body2" sx={{ width: '420px', color: 'var(--color-danger-1)', marginTop: '4px', textAlign: 'center' }}>
                    {errorText}
                </Typography>
            )}

            <Button
                text={t('signup_verify_email_button')}
                sx={{ marginTop: '24px', width: '100%' }}
                loading={loading}
                onClick={onVerifyEmail}
            />
        </>
    );
});

export default VerifyEmail;
