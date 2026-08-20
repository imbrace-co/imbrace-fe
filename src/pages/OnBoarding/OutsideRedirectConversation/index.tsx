import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { push } from 'redux-first-history';

import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getTeamConversationsByTextSearch } from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';

function OutsideRedirectConversation() {
    const location = useLocation();
    const dispatch = useAppDispatch();
    const businessUnitList = useAppSelector((state) => state.BusinessUnit.businessUnitList);
    const prevLocationPath = useRef('');

    interface ConversationData {
        data: Array<{
            id: string;
            [key: string]: any;
        }>;
    }
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const conversationId = queryParams.get('conv_id') || '';
        const businessUnitId = businessUnitList[0].id;
        const fetchConversation = async () => {
            try {
                const { data } = await apiFetch<ConversationData>(
                    getTeamConversationsByTextSearch.api(businessUnitId, conversationId),
                    getTeamConversationsByTextSearch.method,
                );

                const tcuId = data?.data.length > 0 ? data?.data[0].id : '';
                const navigationURL = tcuId ? `/chatroom?conv_id=${tcuId}` : '/chatroom';
                dispatch(push(navigationURL));
            } catch (error) {
                console.log(error);
            }
        };

        if (prevLocationPath.current !== location?.pathname) {
            prevLocationPath.current = location?.pathname;
            fetchConversation();
        }
    }, [location, dispatch, businessUnitList]);

    return null;
}

export default OutsideRedirectConversation;
