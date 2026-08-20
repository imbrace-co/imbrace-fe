import { fetchMethod } from '../axios/index';

export const postLoginEmail = {
    api: '/platform/v1/login/_signin_email_request',
    method: fetchMethod.POST,
};

export const postLoginOTP = {
    api: '/platform/v1/login/_signin_with_email',
    method: fetchMethod.POST,
};

export const postSignUpEmailPassword = {
    api: '/platform/v1/login/sign_up',
    method: fetchMethod.POST,
};

export const verificationCheck = {
    api: (email: string) => `/platform/v1/login/sign_up/verify/check?email=${email}`,
    method: fetchMethod.GET,
};

export const signIn = {
    api: '/platform/v1/login/sign_in',
    method: fetchMethod.POST,
};

export const resendVerificationEmail = {
    api: (email: string) => `/platform/v1/login/sign_up/verify/resend?email=${email}`,
    method: fetchMethod.GET,
};

export const forgotPassword = {
    api: (email: string) => `/platform/v1/login/forget?email=${email}`,
    method: fetchMethod.GET,
};

export const resetPassword = {
    api: '/platform/v1/login/forget/reset',
    method: fetchMethod.POST,
};

export const signUpPhotoUpload = {
    api: '/platform/v1/login/sign_in/file_up_load',
    method: fetchMethod.POST,
};

