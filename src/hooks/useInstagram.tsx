import { FacebookLoginClient } from '@greatsumini/react-facebook-login';
import { useCallback, useState } from 'react';

import { env } from '@/env';

const useInstagram = () => {
    const [accessToken, setAccessToken] = useState<string>();
    const [userID, setUserID] = useState<string>();

    const init = async () => {
        FacebookLoginClient.clear();
        await FacebookLoginClient.loadSdk('en_US');
        FacebookLoginClient.init({ appId: env.VITE_APP_INSTAGRAM_APP_ID, version: 'v14.0', xfbml: true });
    };

    const login = async () => {
        await init();
        const requestPermissions = ['pages_show_list', 'pages_manage_metadata', 'instagram_basic', 'instagram_manage_messages'];
        FacebookLoginClient.login(
            ({ authResponse }) => {
                console.log('Login Success!', authResponse);
                setAccessToken(authResponse?.accessToken);
                setUserID(authResponse?.userID);
            },
            {
                scope: requestPermissions.join(','),
                return_scopes: true,
                extras: { setup: { channel: 'IG_API_ONBOARDING' } },
            },
        );
    };

    const clear = useCallback(() => {
        setAccessToken(undefined);
        setUserID(undefined);
    }, []);

    return {
        accessToken,
        userID,
        login,
        clear,
    };
};

export default useInstagram;
