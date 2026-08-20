import { Button, FieldSelect, FieldText } from '@imbrace/ui';
import { Box, Grid, Typography } from '@mui/material';
import type { AxiosError } from 'axios';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import type { FieldValues, SubmitHandler } from 'react-hook-form';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import CountryData from '@/assets/countryData.json';
import { supportedLangs } from '@/i18n';
import { FieldContainer } from '@/pages/SignIn/components/SignInForm/StyledComponents';
import { PageHeader } from '@/pages/SignIn/StyledComponents';
import { resetCurrentEmailAndStep } from '@/redux/slices/login';
import { useAppDispatch, useAppSelector } from '@/redux/store';

interface Props {
    moveActiveStep: (step?: number) => void;
}

export type CreateAccountFormRef = {
    handleFormSubmit: () => void;
};

const CreateAccountForm = forwardRef<CreateAccountFormRef, Props>((props, ref) => {
    // const { moveActiveStep } = props;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentEmail = useAppSelector((state) => state.Login.currentEmailAddress);

    const {
        control,
        handleSubmit,
        setValue,
        getValues,
        setError,
        // clearErrors,
        // watch,
        formState: { errors },
    } = useFormContext();
    const [loading, setLoading] = useState<boolean>(false);
    // const [selectedProfilePhoto, setSelectedProfilePhoto] = useState<File | undefined | string>();

    useImperativeHandle(ref, () => ({
        handleFormSubmit: () => {
            handleSubmit(onSubmit)();
        },
    }));

    const errorHandler = useCallback(
        (error: AxiosError<API.ErrorResponse>) => {
            const { response } = error;
            const { status, data } = response || {};

            const { field, code } = data || {};
            if (status !== 400 || !field || !code) return;

            const errorMapping: Record<string, Record<number, string>> = {
                file: {
                    40010: t('error_response_reached_file_limit'),
                },
            };

            const errorMessage = errorMapping[field as string]?.[code as number];
            if (errorMessage) {
                setError(field, { type: 'value', message: errorMessage });
            }
        },
        [setError, t],
    );

    const onSubmit: SubmitHandler<FieldValues> = useCallback(async () => {
        setLoading(true);
        try {
            // if (selectedProfilePhoto) {
            //     const profilePhotoFormData = new FormData();
            //     profilePhotoFormData.append('file', selectedProfilePhoto);
            //     const { data } = await apiFetch<API.FileUpload>(signUpPhotoUpload.api, signUpPhotoUpload.method, profilePhotoFormData);
            //     setValue('file', data?.url);
            // }

            setLoading(false);
            navigate('/organization', { replace: true });
            // moveActiveStep();
        } catch (err) {
            setLoading(false);
            const error = err as AxiosError<API.ErrorResponse>;
            errorHandler(error);
        }
    }, [errorHandler, navigate]);

    const onClick = useCallback(() => {
        dispatch(resetCurrentEmailAndStep({ email: '', step: 0 }));

        handleSubmit(onSubmit)();
    }, [dispatch, handleSubmit, onSubmit]);

    // const onSelectProfilePhoto = (e: FormEvent<HTMLInputElement>) => {
    //     clearErrors('file');
    //     const target = e.target as HTMLInputElement;
    //     if (!target.files || target.files.length === 0) {
    //         setSelectedProfilePhoto(undefined);
    //         setValue('profilePhoto', '');
    //         return;
    //     }
    //     setValue('file', target?.files?.[0]);
    //     setSelectedProfilePhoto(target?.files?.[0]);
    // };

    const languageOptions = () => {
        return Object.keys(supportedLangs).map((key) => ({
            value: key,
            text: supportedLangs[key],
        }));
    };

    const countryOptions = () =>
        CountryData.map((country) => ({
            value: country.value,
            text: t(`country_${country.value}`),
        }));

    useEffect(() => {
        const lang = localStorage.getItem('i18nextLng') ? localStorage.getItem('i18nextLng') : 'en';
        setValue('language', lang);

        const loginEmail = getValues('email') || currentEmail;
        setValue('email', loginEmail);
    }, [currentEmail, getValues, setValue]);

    return (
        <>
            <PageHeader>{t('signup_create_your_account')}</PageHeader>
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
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                disabled
                                fullWidth
                                label={`${t('signup_email')}*`}
                                error={!!error}
                                helperText={error?.message}
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
                        name={'firstName'}
                        control={control}
                        rules={{
                            required: {
                                value: true,
                                message: t('validation_first_name_required'),
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={`${t('signup_first_name')}*`}
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
                        name={'lastName'}
                        control={control}
                        rules={{
                            required: {
                                value: true,
                                message: t('validation_last_name_required'),
                            },
                        }}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                fullWidth
                                label={`${t('signup_last_name')}*`}
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
                    <Box>
                        <Grid container spacing={10}>
                            <Grid item xs={2}>
                                {/** TODO: change to FieldUpload  */
                                /* <AvatarUploader
                                    width={60}
                                    height={60}
                                    avatarProps={{ width: 60, height: 60 }}
                                    uploadBtnProps={{
                                        sx: {
                                            width: 24,
                                            height: 24,
                                            minWidth: 22,
                                            right: -4,
                                            bottom: -6,
                                            padding: 0,
                                        },
                                    }}
                                    iconProps={{ sx: { width: 13, height: 13 } }}
                                    avatarUrl={watch('profilePhoto')}
                                    selectedFile={selectedProfilePhoto}
                                    onSelectFile={onSelectProfilePhoto}
                                /> */}
                            </Grid>
                            <Grid item xs={10}>
                                <Typography variant="body2" sx={{ color: 'var(--color-light-7)', fontWeight: 800 }}>
                                    {t('signup_upload_profile_photo')}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'var(--color-light-5)' }}>
                                    {t('signup_upload_profile_photo_body')}
                                </Typography>
                            </Grid>
                        </Grid>
                        <Typography sx={{ fontSize: '12px', color: 'var(--color-danger-1)', marginLeft: '12px' }}>
                            {typeof errors.file?.message === 'string' ? errors.file?.message : undefined}
                        </Typography>
                    </Box>

                    <Controller
                        name={'country'}
                        control={control}
                        rules={{
                            required: {
                                value: true,
                                message: t('validation_country_required'),
                            },
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => (
                            <FieldSelect
                                queryKey={['countryOptions']}
                                label={`${t('signup_country')}*`}
                                fullWidth
                                onChange={(event) => {
                                    onChange(event);
                                }}
                                value={value}
                                placeholder={t('click_to_select')}
                                error={!!error}
                                helperText={error?.message}
                                request={async () => countryOptions()}
                            />
                        )}
                    />
                    <Controller
                        name={'language'}
                        control={control}
                        rules={{
                            required: {
                                value: true,
                                message: t('validation_language_required'),
                            },
                        }}
                        render={({ field: { onChange, value }, fieldState: { error } }) => {
                            return (
                                <FieldSelect
                                    queryKey={['languageOptions']}
                                    label={`${t('signup_language')}*`}
                                    fullWidth
                                    onChange={(event) => {
                                        onChange(event);
                                    }}
                                    value={value}
                                    error={!!error}
                                    helperText={error?.message}
                                    request={async () => languageOptions()}
                                />
                            );
                        }}
                    />
                </FieldContainer>
                <Button
                    sx={{
                        mt: '24px',
                        width: '100%',
                    }}
                    text={t('signup_button_next')}
                    onClick={onClick}
                    loading={loading}
                />
            </form>
        </>
    );
});
export default CreateAccountForm;
