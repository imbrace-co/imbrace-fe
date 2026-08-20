import { FacebookLoginClient } from '@greatsumini/react-facebook-login';
import { useCallback, useState } from 'react';

import { env } from '@/env';

interface FacebookPage {
    name: string;
    picture?: Picture;
    access_token?: string;
    id: string;
    exist?: boolean;
    willDelete?: boolean;
}

export interface Picture {
    data: Data;
}

export interface Data {
    height: number;
    is_silhouette: boolean;
    url: string;
    width: number;
}

const useFacebook = () => {
    const [pages, setPages] = useState<FacebookPage[]>();
    const [accessToken, setAccessToken] = useState<string>();
    const [userID, setUserID] = useState<string>();

    const init = async () => {
        FacebookLoginClient.clear();
        await FacebookLoginClient.loadSdk('en_US');
        FacebookLoginClient.init({ appId: env.VITE_APP_FACEBOOK_APP_ID, version: 'v15.0', xfbml: true });
    };

    const getPages = async () => {
        try {
            const FB = FacebookLoginClient.getFB();
            FB.api('/me/accounts', { fields: 'name,picture,tasks,access_token' }, async (response) => {
                const { data } = response as { data: FacebookPage[] };
                console.log('pages: ', data);
                setPages(data);
            });
        } catch (error) {
            console.log(error);
            setPages([]);
        }
    };

    const DEMO_SCOPE =
        'public_profile,email,pages_show_list,pages_messaging,pages_manage_metadata,pages_read_user_content,pages_manage_engagement,leads_retrieval,pages_manage_ads,business_management';
    const DEFAULT_SCOPE =
        'public_profile,email,pages_show_list,pages_messaging,pages_manage_metadata,pages_read_user_content,pages_manage_engagement,leads_retrieval,pages_manage_ads';

    const login = async () => {
        await init();

        const loginOptions: {
            return_scopes: boolean;
            scope?: string;
            config_id?: string;
        } = {
            return_scopes: true,
            scope: DEFAULT_SCOPE,
        };

        switch (env.VITE_APP_ENV) {
            case 'dev':
                loginOptions.config_id = env.VITE_APP_FACEBOOK_CONFIG_ID;
                delete loginOptions.scope;
                break;
            case 'staging':
                if (env.VITE_APP_FACEBOOK_CONFIG_ID) {
                    loginOptions.config_id = env.VITE_APP_FACEBOOK_CONFIG_ID;
                    delete loginOptions.scope;
                }
                break;
            case 'demo':
                if (env.VITE_APP_FACEBOOK_CONFIG_ID) {
                    loginOptions.config_id = env.VITE_APP_FACEBOOK_CONFIG_ID;
                    delete loginOptions.scope;
                } else {
                    loginOptions.scope = DEMO_SCOPE;
                }
                break;
            case 'prod':
                if (env.VITE_APP_FACEBOOK_CONFIG_ID) {
                    loginOptions.config_id = env.VITE_APP_FACEBOOK_CONFIG_ID;
                    delete loginOptions.scope;
                }
                break;
            default:
                break;
        }

        FacebookLoginClient.login(
            ({ authResponse }) => {
                console.log('Login Success!', authResponse);
                getPages();
                setAccessToken(authResponse?.accessToken);
                setUserID(authResponse?.userID);
            },
            {
                ...loginOptions,
            },
        );
    };

    const clear = useCallback(() => {
        setPages(undefined);
        setAccessToken(undefined);
        setUserID(undefined);
    }, []);

    return {
        pages,
        accessToken,
        userID,
        login,
        clear,
    };
};

export default useFacebook;
