import { Button, FieldText } from '@imbrace/ui';
import type { AxiosError, AxiosResponse } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { FieldContainer } from '@/pages/SignIn/components/SignInForm/StyledComponents';
import { updateCurrentEmail } from '@/redux/slices/login';
import { useAppDispatch } from '@/redux/store';
import { postLoginEmail } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

interface UserSubmitForm {
    email: string;
}

function LoginForm() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState<boolean>(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [searchParams] = useSearchParams();
    const emailQuery = searchParams.get('email');
    const {
        control,
        handleSubmit,
        setError,
        reset,
        formState: { errors },
    } = useForm<UserSubmitForm>({
        mode: 'all',
        defaultValues: {
            email: '',
        },
    });

    useEffect(() => {
        if (emailQuery) {
            reset({
                email: emailQuery,
            });
        }
    }, [reset, emailQuery]);

    const sendOTP = useCallback(async (params: { email: string }) => {
        try {
            setLoading(true);
            const res = await apiFetch(postLoginEmail.api, postLoginEmail.method, params);
            setLoading(false);
            return res;
        } catch (err) {
            setLoading(false);
            const error = err as AxiosError<API.ErrorResponse>;
            console.log('sendOTP error', error.response);
            return error.response;
        }
    }, []);
    const onSubmit = async (formData: UserSubmitForm) => {
        const sendOtpRes: AxiosResponse | AxiosError | undefined = await sendOTP(formData);
        if (sendOtpRes?.status === 201) {
            dispatch(updateCurrentEmail(formData.email));
            navigate('/verification', { replace: true });
        }
        if (sendOtpRes?.status === 400 && sendOtpRes?.data?.code === 40000) {
            setError('email', {
                type: 'value',
                message: t('error_response_email_invalid_format'),
            });
        }
    };

    const onClick = () => {
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };

    return (
        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
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
                            placeholder={t('login-email-address')}
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
                text={t('login-button-sign-in')}
                onClick={onClick}
                loading={loading}
            />
        </form>
    );
}

export default LoginForm;
