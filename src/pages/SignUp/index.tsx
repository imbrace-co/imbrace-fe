import { Button } from '@imbrace/ui';
import { Typography } from '@mui/material';
import type { AxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import ImbraceLogo from '@/pages/SignIn/components/ImbraceLogo';
import LandingPageLayout from '@/pages/SignIn/components/LandingPageLayout';
import type { VerifyEmailRef } from '@/pages/SignUp/components/VerifyEmail';
import VerifyEmail from '@/pages/SignUp/components/VerifyEmail';
import { resetCurrentEmailAndStep, updateCurrentSignupStep } from '@/redux/slices/login';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { resendVerificationEmail } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import type { SignUpFormRef } from './components/SignUpForm';
import SignUpForm from './components/SignUpForm';
import Stepper from './components/Stepper';

const SignUp = () => {
    const { t } = useTranslation();
    const VerifyEmailRef = useRef<VerifyEmailRef>(null);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const currentSignupStep = useAppSelector((state) => state.Login.currentSignupStep);
    const currentEmailAddress = useAppSelector((state) => state.Login.currentEmailAddress);

    const SignUpFormRef = useRef<SignUpFormRef>(null);
    // const CreateAccountFormRef = useRef<CreateAccountFormRef>(null);
    const [errorText, setErrorText] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const methods = useForm<API.UserSignUpForm>({
        mode: 'all',
        defaultValues: {
            email: '',
            password: '',
            firstName: '',
            lastName: '',
            file: '',
            country: '',
            language: '',
            companyName: '',
            companySize: '',
            organizationName: '',
        },
    });

    const { getValues, setValue } = methods;

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
                    5: t('error_response_email_resend_email_15minutes_limit'),
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

    const moveActiveStep = (step?: number) => {
        if (step) {
            dispatch(updateCurrentSignupStep(step));
            return;
        }
        dispatch(updateCurrentSignupStep(currentSignupStep + 1));
    };

    const renderStepContent = () => {
        if (currentSignupStep === 0) {
            return <SignUpForm ref={SignUpFormRef} moveActiveStep={moveActiveStep} />;
        }
        if (currentSignupStep === 1) {
            return <VerifyEmail ref={VerifyEmailRef} moveActiveStep={moveActiveStep} />;
        }
    };

    const goToStep = (step: number) => {
        // cannot go back to 'sign up' & 'verify email' step
        if (step === 0) return;
        if (step === 1) {
            SignUpFormRef.current?.handleFormSubmit();
            return;
        }
        // if (step === 3) {
        //     CreateAccountFormRef.current?.handleFormSubmit();
        //     return;
        // }
        if (step > currentSignupStep) return;
        moveActiveStep(step);
    };

    const steps = (
        <Stepper
            canClick={true}
            goToStep={goToStep}
            activeStep={currentSignupStep}
            disabledSteps={[0, 1]}
            steps={[
                t('signup_stepper_signup'),
                t('signup_stepper_verify_email'),
                // t('signup_stepper_create_an_account'),
                // t('signup_stepper_create_an_org'),
            ]}
        />
    );

    const onResendVerificationEmail = async () => {
        setErrorText('');
        VerifyEmailRef.current?.resetVerifyErrorText();
        const userEmail = getValues('email');
        setLoading(true);
        try {
            await apiFetch(resendVerificationEmail.api(userEmail), resendVerificationEmail.method);
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            console.log('Verify Email Error Res: ', error.response);
            errorHandler(error);
        }
        setLoading(false);
        navigate('/', { replace: true });
    };

    const renderFormFooter = () => {
        if (currentSignupStep === 1) {
            return (
                <>
                    <Typography
                        sx={{
                            mt: '34px',
                            width: '500px',
                            textAlign: 'center',
                            textDecorationLine: 'none',
                            fontWeight: 400,
                            fontSize: '14px',
                            fontHeight: '20px',
                            color: 'var(--color-light-7)',
                        }}
                    >
                        {t('signup_email_not_received')}
                        <Button
                            text={t('forgot_password_submitted_resent_email')}
                            variant="link"
                            size="xs"
                            sx={{
                                display: 'inline-block',
                                paddingLeft: '12px',
                                fontWeight: 800,
                            }}
                            onClick={onResendVerificationEmail}
                            loading={loading}
                        />
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--color-danger-1)', marginTop: '4px' }}>
                        {errorText}
                    </Typography>
                </>
            );
        }
        return (
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
                {t('signup_already_have_an_account')}
                <Button
                    text={t('signup_sign_in_with_email')}
                    variant="link"
                    size="xs"
                    sx={{
                        display: 'inline-block',
                        paddingLeft: '12px',
                        fontWeight: 800,
                    }}
                    onClick={() => {
                        dispatch(resetCurrentEmailAndStep({ email: '', step: 0 }));

                        navigate('/');
                    }}
                />
            </Typography>
        );
    };

    useEffect(() => {
        if (currentEmailAddress) setValue('email', currentEmailAddress);
    }, [setValue, currentEmailAddress]);

    return (
        <LandingPageLayout
            header={steps}
            {...(currentSignupStep === 3 && { onBack: () => goToStep(currentSignupStep - 1) })}
            backBtnText={t('signup_stepper_previous_step')}
        >
            {currentSignupStep === 0 && <ImbraceLogo />}

            <FormProvider {...methods}>{renderStepContent()}</FormProvider>

            {renderFormFooter()}
        </LandingPageLayout>
    );
};

export default SignUp;
