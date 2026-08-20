import { Button, FieldText, Icon, IconButton } from '@imbrace/ui';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import { InputAdornment } from '@mui/material';
import ListItemIcon from '@mui/material/ListItemIcon';
import type { AxiosError, AxiosResponse } from 'axios';
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import type { FieldValues, SubmitHandler } from 'react-hook-form';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { FieldContainer } from '@/pages/SignIn/components/SignInForm/StyledComponents';
import { PageHeader } from '@/pages/SignIn/StyledComponents';
import { postSignUpEmailPassword } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import { ListItem, ListItemText, ValidationList } from '../../StyledComponents';

interface Props {
    moveActiveStep: (step?: number) => void;
}

export type SignUpFormRef = {
    handleFormSubmit: () => void;
};

export const passwordRequirements = [
    {
        text: 'signup_password_validation_12_characters',
        test: (value: string) => value.length >= 12,
    },
    {
        text: 'signup_password_validation_1_lowercase',
        test: (value: string) => /[a-z]/.test(value),
    },
    {
        text: 'signup_password_validation_1_uppercase',
        test: (value: string) => /[A-Z]/.test(value),
    },
    {
        text: 'signup_password_validation_1_number',
        test: (value: string) => /[0-9]/.test(value),
    },
    {
        text: 'signup_password_validation_special_character',
        test: (value: string) => /[!@#$%^&*_()+\-=[\]{}|]/.test(value),
    },
];

const SignUpForm = forwardRef<SignUpFormRef, Props>((props, ref) => {
    const { moveActiveStep } = props;
    const { t } = useTranslation();
    const { control, getValues, watch, handleSubmit, setError } = useFormContext();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
    const [passwordValidations, setPasswordValidations] = useState<Record<number, boolean | null>>({
        0: null,
        1: null,
        2: null,
        3: null,
        4: null,
        5: null,
    });

    useImperativeHandle(ref, () => ({
        handleFormSubmit: () => {
            handleSubmit(onSubmit)();
        },
    }));

    const currentPassword = watch('password', '');
    const handleClickShowPassword = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        e.currentTarget.blur();
        setShowPassword((show) => !show);
    };

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
                    4: t('error_response_email_existed'),
                },
                password: {
                    1: t('error_response_password_required'),
                    3: t('error_response_password_invalid_format'),
                },
            };

            const errorMessage = errorMapping[field as string]?.[code as number];

            if (errorMessage) {
                setError(field, { type: 'value', message: errorMessage });
            }
        },
        [setError, t],
    );

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

    const onSubmit: SubmitHandler<FieldValues> = useCallback(
        async (formData) => {
            setIsSubmitted(true);
            checkPasswordValidation();
            if (!passwordRequirements.every((req) => req.test(getValues('password')))) {
                setError('password', { type: 'value', message: '' });
                return;
            }

            try {
                setLoading(true);
                const { email, password } = formData;
                const res = await apiFetch<AxiosResponse<any, API.UserSignUpFormData>>(
                    postSignUpEmailPassword.api,
                    postSignUpEmailPassword.method,
                    {
                        email,
                        password,
                    },
                );
                if (res.status === 200) {
                    moveActiveStep();
                }
                setLoading(false);
            } catch (err) {
                setLoading(false);
                const error = err as AxiosError<API.ErrorResponse>;
                errorHandler(error);
                console.log('Sign Up Error Res: ', error.response);
            }
        },
        [setError, checkPasswordValidation, getValues, errorHandler, moveActiveStep],
    );

    const onClick = () => {
        handleSubmit(onSubmit)();
    };

    return (
        <>
            <PageHeader>{t('signup_for_free')}</PageHeader>

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
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={t('signup_email')}
                                error={!!error}
                                helperText={error?.message}
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
                        rules={{
                            required: {
                                value: true,
                                message: t('validation_password_required'),
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                fullWidth
                                label={t('signup_password')}
                                error={!!error}
                                helperText={error?.message}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        onClick();
                                    }
                                }}
                                {...field}
                                type={showPassword ? 'text' : 'password'}
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
                    text={t('signup_button_sign_up')}
                    onClick={onClick}
                    loading={loading}
                />
            </form>
        </>
    );
});
export default SignUpForm;
