import { Button } from '@imbrace/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import { fetchNotificationsThunk } from '@/redux/slices/notification';
import store from '@/redux/store';
import { dismissAllNotifications } from '@/services/api/notification';
import apiFetch from '@/services/axios/handler';

import Drawer from '../Drawer';
import styles from './index.module.scss';
import type { NotificationTabsRef } from './notificationTabs';
import NotificationTabs from './notificationTabs';

const queryClient = new QueryClient();

const NotificationCenterDrawer = () => {
    const [open, setOpen] = useState(false);
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const notificationTabRef = useRef<NotificationTabsRef>(null);

    const handleDismissAll = async () => {
        try {
            setLoading(true);
            await apiFetch(dismissAllNotifications.api, dismissAllNotifications.method, {
                type: notificationTabRef.current?.getType() !== 'all' ? notificationTabRef.current?.getType() : undefined,
            });
            queryClient.refetchQueries({
                queryKey: ['notifications', { type: notificationTabRef.current?.getType() || 'all' }],
            });
            store.dispatch(fetchNotificationsThunk({ skip: 0, limit: 50 }));
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    const onClose = () => {
        setOpen(false);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setOpen(true);
        });
        return () => {
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <Drawer
                open={open}
                className={styles.notificationDrawer}
                title={t('notification_drawer_heading')}
                onBackdropClick={onClose}
                onClose={onClose}
                extraButton={() => (
                    <Button
                        variant="text"
                        type="secondary"
                        size="xxs"
                        sx={{
                            fontWeight: 400,
                            textTransform: 'capitalize',
                        }}
                        text={t('dismiss_all')}
                        loading={loading}
                        onClick={handleDismissAll}
                    />
                )}
            >
                <NotificationTabs onClose={onClose} ref={notificationTabRef} />
            </Drawer>
        </QueryClientProvider>
    );
};

export const notificationCenter = () => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<NotificationCenterDrawer />, document.body));
};

export default NotificationCenterDrawer;
