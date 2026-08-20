import { Button, FieldText, Icon, IconButton } from '@imbrace/ui';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { InputAdornment } from '@mui/material';
import ListItemIcon from '@mui/material/ListItemIcon';
import type { AxiosError } from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { FieldContainer } from '@/pages/SignIn/components/SignInForm/StyledComponents';
import { passwordRequirements } from '@/pages/SignUp/components/SignUpForm';
import { ListItem, ListItemText, ValidationList } from '@/pages/SignUp/StyledComponents';
import { resetPassword } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import ImbraceLogo from './components/ImbraceLogo';
import LandingPageLayout from './components/LandingPageLayout';
import { PageHeader } from './StyledComponents';

interface ResetPasswordForm {
    email: string;
    password: string;
}

type Field = keyof ResetPasswordForm;

interface ErrorResponse extends API.UserSignUpFormData {
    field: Field;
}

const ResetPassword = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [queryParameters] = useSearchParams();
    const email = queryParameters.get('email');
    const verify_code = queryParameters.get('verify_code');
    const [loading, setLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState(true);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [passwordValidations, setPasswordValidations] = useState<Record<number, boolean | null>>({
        0: null,
        1: null,
        2: null,
        3: null,
        4: null,
        5: null,
    });

    const {
        control,
        setValue,
        getValues,
        handleSubmit,
        setError,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordForm>({
        mode: 'all',
        defaultValues: {
            email: '',
            password: '',
        },
    });

    useEffect(() => {
        if (email) setValue('email', email);
    }, [setValue, email]);

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
                    5: t('error_response_email_resend_email_15minutes_limit'),
                    6: t('login_reset_password_email_not_found'),
                    40001: t('error_response_email_unauthorized_request'),
                    40004: t('error_response_email_not_signup_or_verified'),
                },
                password: {
                    1: t('error_response_password_required'),
                    3: t('error_response_password_invalid_format'),
                },
                verify_code: {
                    1: t('error_response_verify_code_required'),
                },
            };

            const errorMessage = errorMapping[field as string]?.[code as number];

            if (errorMessage) {
                setError(field, { type: 'value', message: errorMessage });
            }
        },
        [setError, t],
    );

    const currentPassword = watch('password', '');
    const handleClickShowPassword = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.currentTarget.blur();
        setShowPassword((show) => !show);
    };

    const checkPasswordValidation = useCallback(() => {
        setPasswordValidations({
            0: null,
            1: null,
            2: null,
            3: null,
            4: null,
            5: null,
        });
        passwordRequirements.forEach((req, index) => {
            const result = req.test(getValues('password'));
            if (!result) {
                setPasswordValidations((prev) => ({ ...prev, [index]: false }));
            }
        });
    }, [getValues]);

    const onSubmit = useCallback(
        async (formData: ResetPasswordForm) => {
            setLoading(true);
            setIsSubmitted(true);
            checkPasswordValidation();
            if (!passwordRequirements.every((req) => req.test(getValues('password')))) {
                setLoading(false);
                setError('password', { type: 'value', message: '' });
                return;
            }

            try {
                const payload = {
                    ...formData,
                    verify_code,
                };
                const { status } = await apiFetch(resetPassword.api, resetPassword.method, payload);
                if (status === 200) {
                    setLoading(false);
                    navigate('/');
                }
            } catch (err) {
                setLoading(false);
                const error = err as AxiosError<ErrorResponse>;
                console.log('Reset Password Error Res: ', error.response);
                errorHandler(error);
            }
        },
        [checkPasswordValidation, setError, getValues, verify_code, navigate, errorHandler],
    );

    const onClick = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <>
            <LandingPageLayout>
                <ImbraceLogo />
                <PageHeader>{t('reset_password')}</PageHeader>
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
                                    disabled
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            onClick();
                                        }
                                    }}
                                    formControlSx={{ '& .MuiFormLabel-root': { color: 'var(--color-light-7)' } }}
                                />
                            )}
                        />
                        <Controller
                            name={'password'}
                            control={control}
                            rules={{
                                required: {
                                    value: true,
                                    message: t('validation_password_required'),
                                },
                            }}
                            render={({ field }) => (
                                <FieldText
                                    fullWidth
                                    label={t('forgot_password_new_password')}
                                    error={!!errors?.password}
                                    helperText={errors?.password?.message}
                                    {...field}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            onClick();
                                        }
                                    }}
                                    type={showPassword ? 'text' : 'password'}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    type="secondary"
                                                    variant="text"
                                                    size="s"
                                                    aria-label="toggle password visibility"
                                                    onClick={handleClickShowPassword}
                                                    disableRipple
                                                    sx={{ marginRight: '8px', borderRadius: '8px' }}
                                                >
                                                    {showPassword ? <Icon name="visibility" /> : <Icon name="visibilityOff" />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </FieldContainer>
                    <ValidationList dense>
                        {passwordRequirements.map((req, index) => {
                            const isValidPassword = passwordValidations[index];
                            return (
                                <ListItem
                                    key={index}
                                    style={{
                                        color: req.test(currentPassword)
                                            ? 'var(--color-green-1)'
                                            : (isValidPassword || isValidPassword === null) && !isSubmitted
                                            ? 'var(--color-secondary-3)'
                                            : 'var(--color-danger-1)',
                                    }}
                                >
                                    <ListItemText>
                                        {t(req.text)}
                                        <ListItemIcon sx={{ width: '16px' }}>
                                            {req.test(currentPassword) ? (
                                                <CheckCircleOutlineIcon style={{ color: 'var(--color-green-1)' }} />
                                            ) : (isValidPassword || isValidPassword === null) && !isSubmitted ? (
                                                <>
                                                    <CheckCircleOutlineIcon style={{ color: 'var(--color-light-3)' }} />
                                                </>
                                            ) : (
                                                <HighlightOffIcon style={{ color: 'var(--color-danger-1)' }} />
                                            )}
                                        </ListItemIcon>
                                    </ListItemText>
                                </ListItem>
                            );
                        })}
                    </ValidationList>

                    <Button
                        sx={{
                            mt: '24px',
                            width: '100%',
                        }}
                        text={t('reset_password_button')}
                        onClick={onClick}
                        loading={loading}
                    />
                </form>
            </LandingPageLayout>
        </>
    );
};
export default ResetPassword;
