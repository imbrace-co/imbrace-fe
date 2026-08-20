import { fetchMethod } from '../axios/index';

export const postIdentityGoogleSignup = {
    api: '/platform/v1/identity/_signup_google',
    method: fetchMethod.POST,
};

export const postIdentityGoogleSignin = {
    api: '/platform/v1/identity_access/_signin_google',
    method: fetchMethod.POST,
};

export const postIdentityEmailSignUp = {
    api: '/platform/v1/identity/_signup_email',
    method: fetchMethod.POST,
};

export const postIdentityEmailSignIn = {
    api: '/platform/v1/identity_access/_signin_email',
    method: fetchMethod.POST,
};
