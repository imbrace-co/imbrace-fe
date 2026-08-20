import type { OptionsObject } from 'notistack';

const toastTopRight: OptionsObject['anchorOrigin'] = {
    horizontal: 'right',
    vertical: 'top',
};

const waringTopRight = {
    messageType: 'noti_warning',
    variant: 'warning',
    anchorOrigin: toastTopRight,
};

const errorMessage = (message: string) => {
    const newNotification = {
        message,
        messageType: 'noti_failed',
        variant: 'error',
    };
    import('@/redux/store').then(({ store }) => {
        import('@/redux/slices/notification').then(({ pushNotification }) => {
            store.dispatch(pushNotification({ notification: newNotification }));
        });
    });
};

export { errorMessage, waringTopRight };
