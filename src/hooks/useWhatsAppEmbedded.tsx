import { FacebookLoginClient } from '@greatsumini/react-facebook-login';
import { useCallback, useEffect, useState } from 'react';

import { env } from '@/env';

const useWhatsAppEmbedded = (channel?: API.Channel) => {
    const [accessToken, setAccessToken] = useState<string>();
    const [code, setCode] = useState<string>();
    const [phoneNumberID, setPhoneNumberID] = useState<string>();
    const [wabaID, setWabaID] = useState<string>();
    const [step, setStep] = useState<string>();

    const sessionInfoListener = (event: any) => {
        if (event.origin !== 'https://www.facebook.com') return;

        try {
            const data = JSON.parse(event.data);
            if (data.type === 'WA_EMBEDDED_SIGNUP') {
                if (data.event === 'FINISH') {
                    setStep('FINISH');
                    const { phone_number_id, waba_id } = data.data;

                    // handling received data
                    setWabaID(waba_id);
                    setPhoneNumberID(phone_number_id);
                    console.log('phone_number_id: ', phone_number_id);
                    console.log('waba_id: ', waba_id);
                } else {
                    // if user cancels the Embedded Signup flow
                    const { current_step } = data.data;
                    console.log('user cancelled at step: ', current_step);
                    setStep(current_step);
                }
            }
        } catch {
            // Don’t parse info that’s not a JSON
            setStep('ERROR');
            console.error('Non JSON Response', event.data);
        }
    };

    useEffect(() => {
        window.addEventListener('message', sessionInfoListener);
        return () => {
            window.removeEventListener('message', sessionInfoListener);
        };
    }, []);

    const init = async () => {
        FacebookLoginClient.clear();
        await FacebookLoginClient.loadSdk('en_US');
        FacebookLoginClient.init({ appId: env.VITE_APP_FACEBOOK_APP_ID, version: 'v19.0', xfbml: true, cookie: true });
    };

    const handleLoginResponse = (response: any) => {
        const authResponse = response?.authResponse;
        console.log('WhatsApp Login Success!', authResponse);
        // CODE flow returns a fresh one-time `code` (preferred — never cached,
        // exchanged server-side for a long-lived business token). TOKEN flow
        // (fallback when no config_id) returns accessToken.
        const responseCode = authResponse?.code as string | undefined;
        if (responseCode) setCode(responseCode);
        if (authResponse?.accessToken) setAccessToken(authResponse.accessToken);
        if (!responseCode && !authResponse?.accessToken && !step) {
            setStep('CLOSED');
        }
    };

    const login = async () => {
        await init();
        const configId = env.VITE_APP_WHATSAPP_CONFIG_ID as string | undefined;
        const FB = (window as any).FB;

        // CODE flow: call window.FB.login DIRECTLY. The @greatsumini wrapper does
        // not forward config_id/response_type/override_default_response_type, so
        // FB falls back to returning a token (stale-cache prone). Calling FB.login
        // directly with these params makes FB return a fresh one-time `code` that
        // the backend exchanges for a long-lived business token.
        if (configId && FB?.login) {
            FB.login(handleLoginResponse, {
                config_id: configId,
                response_type: 'code',
                override_default_response_type: true,
                extras: {
                    feature: 'whatsapp_embedded_signup',
                    sessionInfoVersion: 3,
                },
            });
            return;
        }

        // Fallback (no config_id for this env's app): legacy scope/token flow.
        FacebookLoginClient.login(handleLoginResponse, {
            scope: 'business_management,whatsapp_business_management,whatsapp_business_messaging',
            feature: 'whatsapp_embedded_signup',
            return_scopes: true,
            extras: {
                version: 2,
                feature: 'whatsapp_embedded_signup',
                return_scopes: true,
                sessionInfoVersion: 2,
            },
        });
    };

    const clear = useCallback(() => {
        setAccessToken(undefined);
        setCode(undefined);
        setPhoneNumberID(undefined);
        setWabaID(undefined);
        setStep(undefined);
    }, []);

    return {
        step,
        accessToken,
        code,
        phoneNumberID,
        wabaID,
        login,
        clear,
    };
};

export default useWhatsAppEmbedded;
