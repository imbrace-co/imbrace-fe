import type { AlertProps } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import type { SnackbarKey } from 'notistack';
import { SnackbarProvider } from 'notistack';
import { useEffect } from 'react';
import { useMatch } from 'react-router-dom';

import SnackAlert from './components/Alert/SnackAlert';
import SnackMessage from './components/Snackbar';
import { IMBRACE_ACCESS_TOKEN } from './constants/app';
import { SnackbarContextProvider } from './contexts/SnackbarContext';
import styles from './index.module.scss';
import { fetchAccountThunk } from './redux/slices/account';
import { fetchBusinessUnitThunk } from './redux/slices/businessUnit';
import { fetchNotificationsThunk } from './redux/slices/notification';
import type { FlashNotifications } from './redux/slices/notification.types';
import { useAppDispatch, useAppSelector } from './redux/store';
import useImbraceRoutes from './routes';

export type AlertVariantProps = Omit<AlertProps, 'message' | 'onClose'> & {
    snackBarId: string;
    messageData?: FlashNotifications['message'];
};
export type ConversationVariantProps = {
    messageData: FlashNotifications['message'];
    snackBarKey: SnackbarKey;
    showDismissIcon?: boolean;
};
declare module 'notistack' {
    interface VariantOverrides {
        alert: AlertVariantProps;
        conversation: ConversationVariantProps;
    }
}

function Router() {
    const dispatch = useAppDispatch();
    // const [searchParams] = useSearchParams();
    // const navigate = useNavigate();
    // const location = useLocation();
    const matchWorkflow = useMatch('/workflow/:tab/:id');
    const matchTouchpoint = useMatch('/touchpoint/:id');

    const id = useAppSelector((state) => state.Account.id);
    const loadingStatus = useAppSelector((state) => state.Account.loadingStatus);
    const businessUnitList = useAppSelector((state) => state.BusinessUnit.businessUnitList);
    const buLoadingStatus = useAppSelector((state) => state.BusinessUnit.loadingStatus);

    const element = useImbraceRoutes();

    // const paymentStatus = useMemo(() => searchParams.get('payment_status'), [searchParams]);

    // const unlockProModal = useCallback(() => {
    //     dialog({
    //         title: 'Welcome to iMBrace Pro!',
    //         content: (
    //             <Space size={16} direction="vertical">
    //                 <Typography>
    //                     Congratulations! You’ve successfully unlocked advanced analytics, unlimited storage, enhanced collaboration,
    //                     priority support, and seamless integration.
    //                 </Typography>
    //                 <Typography>
    //                     Elevate your productivity and achieve remarkable results with our Pro version. Embrace success today!
    //                 </Typography>
    //             </Space>
    //         ),
    //         hideCancelButton: true,
    //         confirmText: 'Done',
    //         actionsAlign: 'flex-start',
    //         backdropClosable: false,
    //         onClose: () => {},
    //         onConfirm: async () => {
    //             navigate(location.pathname, {
    //                 replace: true,
    //             });
    //         },
    //     });
    // }, [location, navigate]);

    // useEffect(() => {
    //     if (paymentStatus) {
    //         if (paymentStatus === 'paid') {
    //             unlockProModal();
    //         }
    //         localStorage.setItem('payment_status', paymentStatus);
    //     }
    // }, [paymentStatus, unlockProModal]);

    useEffect(() => {
        const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
        if (loadingStatus === 'IDLE' && token) {
            dispatch(fetchAccountThunk());
            dispatch(fetchBusinessUnitThunk({ limit: 10, skip: 0 }));
        }
    }, [dispatch, loadingStatus]);

    useEffect(() => {
        if (id && businessUnitList?.[0]?.id) {
            dispatch(fetchNotificationsThunk({ limit: 10, skip: 0 }));
        }
    }, [dispatch, id, businessUnitList]);



    const setOverscrollBehaviorX = (value: string) => {
        document.body.style.setProperty('overscroll-behavior-x', value);
    };

    useEffect(() => {
        // Disable horizontal scroll when on workflow or touchpoint page
        if (matchWorkflow || matchTouchpoint) {
            setOverscrollBehaviorX('none');
            return;
        }
        setOverscrollBehaviorX('auto');
    }, [matchWorkflow, matchTouchpoint]);

    if (loadingStatus === 'FETCH_IN_PROGRESS' || buLoadingStatus === 'FETCH_IN_PROGRESS') {
        return (
            <div className={styles.loadingContainer}>
                <CircularProgress size={'25px'} />
            </div>
        );
    }

    return (
        <SnackbarProvider
            maxSnack={6}
            Components={{
                alert: SnackAlert,
                conversation: SnackMessage,
            }}
            classes={{
                containerRoot: styles.snackBarRoot,
            }}
        >
            <SnackbarContextProvider>{element}</SnackbarContextProvider>
        </SnackbarProvider>
    );
}

export default Router;
