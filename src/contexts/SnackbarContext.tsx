import { uniqueId } from 'lodash';
import type { OptionsObject, SnackbarKey, SnackbarOrigin } from 'notistack';
import { useSnackbar } from 'notistack';
import type { PropsWithChildren, ReactNode, SyntheticEvent } from 'react';
import { createContext, useCallback, useEffect, useRef } from 'react';

import { removeNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import type { AlertVariantProps, ConversationVariantProps } from '@/Router';

export const SnackbarContext = createContext({});

let displayed: SnackbarKey[] = [];

export const useNotify = () => {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const replaceTimersRef = useRef<Map<SnackbarKey, number>>(new Map());

    const notify = useCallback(
        ({
            type,
            message,
            customAnchor,
            icon,
            persist = false,
            key: providedKey,
        }: {
            type: 'error' | 'success' | 'warning';
            message: ReactNode;
            customAnchor?: SnackbarOrigin;
            icon?: ReactNode;
            persist?: boolean;
            key?: SnackbarKey;
        }) => {
            const anchorOrigin: SnackbarOrigin = customAnchor ?? {
                vertical: 'top',
                horizontal: 'right',
            };
            const key: SnackbarKey = providedKey ?? uniqueId('notify');
            const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                snackBarId: String(key),
                key,
                anchorOrigin,
                variant: 'alert',
                type: type,
                autoHideDuration: persist ? undefined : 3000,
                persist,
                icon,
            };
            enqueueSnackbar(message, snackbarOption);
            return key;
        },
        [enqueueSnackbar, closeSnackbar],
    );
    return {notify, closeSnackbar};
};

export function SnackbarContextProvider(props: PropsWithChildren) {
    const dispatch = useAppDispatch();
    const { flashNotifications } = useAppSelector((state) => state.Notification);
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();

    const storeDisplayed = (id: SnackbarKey) => {
        displayed = [...displayed, id];
    };

    const removeDisplayed = (id: SnackbarKey) => {
        displayed = [...displayed.filter((key) => id !== key)];
    };

    useEffect(() => {
        flashNotifications.forEach((el) => {
            const {
                key,
                message,
                options,
                dismissed = false,
                anchorOrigin = {
                    vertical: 'bottom',
                    horizontal: 'left',
                },
                style,
            } = el;

            if (dismissed) {
                closeSnackbar(key);
                return;
            }

            if (displayed.includes(key)) return;

            switch (message.type) {
                case 'noti_failed': {
                    const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                        key: key,
                        anchorOrigin,
                        style,
                        onClose: (event, reason, myKey) => {
                            if (options?.onClose) {
                                options.onClose(event, reason, myKey);
                            }
                        },
                        onExited: (node, exitedKey) => {
                            // remove this snackbar from redux store
                            dispatch(removeNotification(exitedKey as string));
                            removeDisplayed(exitedKey);
                        },
                        variant: 'alert',
                        type: 'error',

                        messageData: message,
                        snackBarId: key,
                        autoHideDuration: 3000,
                    };

                    enqueueSnackbar(message.notice, snackbarOption);
                    break;
                }
                case 'noti_success': {
                    const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                        key: key,
                        anchorOrigin,
                        style,
                        onClose: (event, reason, myKey) => {
                            if (options?.onClose) {
                                options.onClose(event, reason, myKey);
                            }
                        },
                        onExited: (node, exitedKey) => {
                            // remove this snackbar from redux store
                            dispatch(removeNotification(exitedKey as string));
                            removeDisplayed(exitedKey);
                        },
                        variant: 'alert',
                        type: 'success',

                        messageData: message,
                        snackBarId: key,
                        autoHideDuration: 3000,
                    };

                    enqueueSnackbar(message.notice, snackbarOption);
                    break;
                }
                case 'noti_warning': {
                    const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                        key: key,
                        anchorOrigin,
                        style,
                        onClose: (event, reason, myKey) => {
                            if (options?.onClose) {
                                options.onClose(event, reason, myKey);
                            }
                        },
                        onExited: (node, exitedKey) => {
                            // remove this snackbar from redux store
                            dispatch(removeNotification(exitedKey as string));
                            removeDisplayed(exitedKey);
                        },
                        variant: 'alert',
                        type: 'warning',

                        messageData: message,
                        snackBarId: key,
                        autoHideDuration: 3000,
                    };

                    enqueueSnackbar(message.notice, snackbarOption);
                    break;
                }
                case 'noti_invited': {
                    const snackbarOption: OptionsObject<'alert'> & AlertVariantProps = {
                        key: key,
                        anchorOrigin,
                        style,
                        onClose: (event, reason, myKey) => {
                            if (options?.onClose) {
                                options.onClose(event, reason, myKey);
                            }
                        },
                        onExited: (node, exitedKey) => {
                            // remove this snackbar from redux store
                            dispatch(removeNotification(exitedKey as string));
                            removeDisplayed(exitedKey);
                        },
                        variant: 'alert',
                        type: 'success',

                        messageData: message,
                        snackBarId: key,
                        autoHideDuration: 3000,
                    };

                    enqueueSnackbar(message.notice, snackbarOption);
                    break;
                }
                default: {
                    const snackbarOption: OptionsObject<'conversation'> & ConversationVariantProps = {
                        key: key,
                        anchorOrigin,
                        style,
                        onClose: (event, reason, myKey) => {
                            if (options?.onClose) {
                                options.onClose(event, reason, myKey);
                            }
                        },
                        onExited: (node, exitedKey) => {
                            // remove this snackbar from redux store
                            dispatch(removeNotification(exitedKey as string));
                            removeDisplayed(exitedKey);
                        },
                        variant: 'conversation',
                        snackBarKey: key,
                        messageData: message,
                    };

                    enqueueSnackbar('', snackbarOption);
                    break;
                }
            }

            // keep track of snackbars that we've displayed
            storeDisplayed(key);
        });
        if (flashNotifications.length === 0) {
            displayed = [];
        }
    }, [closeSnackbar, dispatch, enqueueSnackbar, flashNotifications]);

    return <SnackbarContext.Provider value={{}}>{props.children}</SnackbarContext.Provider>;
}
