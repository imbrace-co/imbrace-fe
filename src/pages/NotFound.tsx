import { Navigate, useLocation } from 'react-router-dom';

import { FETCH_SUCCEEDED } from '@/constants/app';
import { useAppSelector } from '@/redux/store';

const NotFound = () => {
    const { search } = useLocation();
    const loadingStatus = useAppSelector((state) => state.Account.loadingStatus);
    const onBoarded = useAppSelector((state) => state.Account.onBoarded);
    if (loadingStatus !== FETCH_SUCCEEDED) {
        return null;
    }

    if (!onBoarded) {
        return <Navigate to={{ pathname: '/start', search }} replace />;
    }

    return <Navigate to={{ pathname: '/ai-agent', search }} replace />;
};

export default NotFound;
