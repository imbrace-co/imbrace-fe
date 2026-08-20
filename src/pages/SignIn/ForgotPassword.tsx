import { Button, FieldText } from '@imbrace/ui';
import { Typography } from '@mui/material';
import type { AxiosError } from 'axios';
import React, { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { FieldContainer } from '@/pages/SignIn/components/SignInForm/StyledComponents';
import { StyledDivider } from '@/pages/SignIn/index';
import { forgotPassword } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import ImbraceLogo from './components/ImbraceLogo';
import LandingPageLayout from './components/LandingPageLayout';
import { PageHeader } from './StyledComponents';

interface ResetPasswordForm {
    email: string;
}

type Field = keyof ResetPasswordForm;
interface ErrorResponse extends API.UserSignUpFormData {
    field: Field;
}

// Toggle to re-show the "Sign in with OTP" option in the future (hidden, not deleted).
const SHOW_OTP_LOGIN = false;

const ForgotPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState(false);

    const {
        control,
        handleSubmit,
        getValues,
        setError,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        mode: 'all',
        defaultValues: {
            email: '',
        },
    });

    const errorHandler = useCallback(
        (error: AxiosError<ErrorResponse>) => {
            const { response } = error;
            const { status, data } = response || {};
            const { field, code } = data || {};

            if (status !== 400 || !field || !code) return;

            const errorMapping: Record<string, Record<number, string>> = {
                email: {
                    1: t('error_response_email_required'),
                    3: t('error_response_email_invalid_format'),
                    4: t('error_response_email_existed'),
                    5: t('error_response_email_resend_email_15minutes_limit'),
                    6: t('error_response_email_account_not_found'),
                    40004: t('error_response_email_not_signup_or_verified'),
                },
            };

            const errorMessage = errorMapping[field as Field]?.[code];

            if (errorMessage) {
                setError(field, { type: 'value', message: errorMessage });
            }
        },
        [setError, t],
    );

    const onSubmit = async (formData: ResetPasswordForm) => {
        setLoading(true);
        try {
            const { email } = formData;
            await apiFetch(forgotPassword.api(email), forgotPassword.method);
            setSubmitted(true);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.log('Forgot Password Error Res: ', error.response);
            errorHandler(error);
        }
        setLoading(false);
    };

    const onClick = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <>
            <LandingPageLayout>
                <ImbraceLogo />
                {submitted ? (
                    <>
                        <PageHeader sx={{ width: '485px', textAlign: 'center', fontSize: '28px' }}>
                            {t('forgot_password_submitted_header')} {getValues('email')}{' '}
                            <Button
                                text={`(${t('forgot_password_submitted_change_email')})`}
                                variant="link"
                                size="xs"
                                sx={{
                                    display: 'inline-block',
                                    fontWeight: 800,
                                }}
                                onClick={() => {
                                    setSubmitted(false);
                                }}
                            />
                        </PageHeader>
                        <Typography
                            variant="body2"
                            sx={{
                                marginTop: '18px',
                                width: '440px',
                                textAlign: 'center',
                            }}
                        >
                            {t('forgot_password_submitted_body')}
                            <Button
                                text={t('forgot_password_submitted_resent_email')}
                                variant="link"
                                size="xs"
                                sx={{
                                    display: 'inline-block',
                                    paddingLeft: '12px',
                                    fontWeight: 800,
                                }}
                                onClick={onClick}
                            />
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'var(--color-danger-1)', marginTop: '4px' }}>
                            {errors.email?.message}
                        </Typography>
                    </>
                ) : (
                    <>
                        <PageHeader>{t('forgot_password_header')}</PageHeader>
                        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                            <FieldContainer>
                                <Controller
                                    name={'email'}
                                    control={control}
                                    rules={{
                                        pattern: {
                                            value: /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/,
                                            message: t('validation_email_pattern'),
                                        },
                                        required: {
                                            value: true,
                                            message: t('validation_email_required'),
                                        },
                                    }}
                                    render={({ field }) => (
                                        <FieldText
                                            fullWidth
                                            label={t('login-email-address')}
                                            error={!!errors?.email}
                                            helperText={errors?.email?.message}
                                            {...field}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    onClick();
                                                }
                                            }}
                                        />
                                    )}
                                />
                            </FieldContainer>

                            <Button
                                sx={{
                                    mt: '24px',
                                    width: '100%',
                                }}
                                text={t('forgot_password_send_link')}
                                onClick={onClick}
                                loading={loading}
                            />
                        </form>
                        {SHOW_OTP_LOGIN && (
                            <>
                                <StyledDivider>or</StyledDivider>
                                <Button
                                    variant="outlined"
                                    sx={{
                                        width: '100%',
                                    }}
                                    text={t('login-with-otp')}
                                    onClick={() => {
                                        navigate('/otp');
                                    }}
                                />
                            </>
                        )}
                        <Typography
                            sx={{
                                mt: '34px',
                                textAlign: 'center',
                                textDecorationLine: 'none',
                                fontWeight: 400,
                                fontSize: '14px',
                                fontHeight: '20px',
                                color: 'var(--color-light-7)',
                            }}
                        >
                            {t('login-dont-have-an-account')}
                            <Button
                                text={t('login-sign-up-for-an-account')}
                                variant="link"
                                size="xs"
                                sx={{
                                    display: 'inline-block',
                                    paddingLeft: '12px',
                                    fontWeight: 800,
                                }}
                                onClick={() => {
                                    navigate('/signup');
                                }}
                            />
                        </Typography>
                    </>
                )}
            </LandingPageLayout>
        </>
    );
};

export default ForgotPassword;
