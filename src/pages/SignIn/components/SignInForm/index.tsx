import { Button, FieldText, Icon, IconButton } from '@imbrace/ui';
import { InputAdornment } from '@mui/material';
import type { AxiosError } from 'axios';
import React, { useCallback, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { replace } from 'redux-first-history';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { passwordRequirements } from '@/pages/SignUp/components/SignUpForm';
import { ListItem, ListItemText, ValidationList } from '@/pages/SignUp/StyledComponents';
import { exchangeAccessTokenThunk } from '@/redux/slices/access';
import { updateCurrentEmail, updateCurrentSignupStep, updateCustomerId } from '@/redux/slices/login';
import { fetchOrganizationListThunk } from '@/redux/slices/organization';
import { useAppDispatch } from '@/redux/store';
import { signIn } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import { FieldContainer, ForgotPassword } from './StyledComponents';
import { useDeveloperPortal } from '@/contexts/DeveloperPortalContext';

interface UserSubmitForm {
    email: string;
    password: string;
}

type Field = keyof UserSubmitForm;

interface ErrorResponse extends API.UserSignUpFormData {
    field: Field;
}

function SignInForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { isDeveloperPortal } = useDeveloperPortal();
    const [loading, setLoading] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useAppDispatch();

    const {
        getValues,
        control,
        setError,
        handleSubmit,
        formState: { errors },
    } = useForm<UserSubmitForm>({
        mode: 'all',
        defaultValues: {
            email: '',
            password: '',
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
                    40004: t('error_response_password_incorrect_or_unverified_email'),
                },
                password: {
                    1: t('error_response_password_required'),
                    3: t('error_response_password_invalid_format'),
                    7: t('error_response_email_not_signup_or_verified'),
                    40005: t('error_response_password_incorrect_or_unverified_email'),
                },
            };

            const errorMessage = errorMapping[field as Field]?.[code];
            if (errorMessage) {
                setError(field, { type: 'value', message: errorMessage });
            }
        },
        [setError, t],
    );

    const handleClickShowPassword = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.currentTarget.blur();
        setShowPassword((show) => !show);
    };

    const onSubmit = async (formData: UserSubmitForm) => {
        setLoading(true);
        try {
            const signInRes = await apiFetch<API.UserSignIn>(signIn.api, signIn.method, formData);
            if (signInRes.status === 200) {
                const { token, customerId } = signInRes.data;
                window.localStorage.setItem(IMBRACE_ACCESS_TOKEN, token);
                dispatch(updateCurrentEmail(getValues('email')));
                dispatch(updateCustomerId(customerId));
                // legacy login_mode = use x-access-token (thunk needs this flag to call exchange)
                window.localStorage.setItem('login_mode', 'legacy');
                const orgsRes: any = await dispatch(fetchOrganizationListThunk({ limit: 10, skip: 0 }));
                const orgList = orgsRes?.payload?.list || [];
                if (orgList.length > 0) {
                    // OSS single-tenant: auto-pick first org and exchange pre-auth token
                    // (replaces the removed SelectOrganization UI step).
                    // The thunk handles: exchange → fetch BU + account → set isLoggedIn → navigate to /chatroom
                    await dispatch(exchangeAccessTokenThunk({ organizationId: orgList[0].id }));
                } else {
                    await dispatch(replace('/start'));
                }
            }
        } catch (err) {
            setLoading(false);
            const error = err as AxiosError<ErrorResponse>;
            console.log('Sign In Error Res: ', error.response);
            if (error.response?.data.code === 7) {
                // user not verified, go to step 2
                dispatch(updateCurrentEmail(getValues('email')));
                dispatch(updateCurrentSignupStep(1));
                navigate('/signup');
                return;
            }
            if (error.response?.data.code === 40004 || error.response?.data.code === 40005) {
                // user not verified or incorrect password (both fields red bordered)
                setError('email', { type: 'value', message: '' });
                setError('password', { type: 'value', message: t('error_response_password_incorrect_or_unverified_email') });
                return;
            }
            errorHandler(error);
        }
    };

    const onClick = () => {
        handleSubmit(onSubmit)();
    };

    const tooltipContent = () => (
        <ValidationList dense>
            {passwordRequirements.map((req, index) => (
                <ListItem sx={{ color: 'var(--color-light-7)' }} key={index}>
                    <ListItemText sx={{ color: 'var(--color-light-7)', fontSize: '12px' }}>{t(req.text)}</ListItemText>
                </ListItem>
            ))}
        </ValidationList>
    );

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
            <FieldContainer>
                <Controller
                    name={'email'}
                    control={control}
                    rules={{
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
                <Controller
                    name={'password'}
                    control={control}
                    render={({ field }) => (
                        <FieldText
                            fullWidth
                            label={t('login-password')}
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
                            tooltip={tooltipContent()}
                            tooltipSx={{
                                maxWidth: '450px',
                                padding: '0 16px 0 0',
                            }}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            type="secondary"
                                            variant="text"
                                            size="s"
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
            <ForgotPassword to={'/forgot-password'}>{t('login-forgot-password')}</ForgotPassword>
            <Button
                sx={{
                    mt: '24px',
                    width: '100%',
                    background: isDeveloperPortal ? 'var(--color-developer-portal)' : '#FA9917',
                }}
                text={t('login-button-sign-in')}
                onClick={onClick}
                loading={loading}
            />
        </form>
    );
}

export default SignInForm;
