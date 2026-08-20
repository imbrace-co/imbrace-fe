import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { useOutletContext, useParams } from 'react-router';

import Journeys from './journeys';
import Libraries from './libraries';

const JourneysTabContainer = () => {
    const { tab } = useParams();
    const { data, searchValue, refetch } = useOutletContext<{
        data?: API.JourneyLibrary[] | API.Journey[];
        searchValue?: string;
        refetch: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<API.Journey[], Error>>;
    }>();
    if (tab === 'libraries') {
        return <Libraries data={data as API.JourneyLibrary[]} searchValue={searchValue} />;
    }

    if (tab === 'org') {
        return <Journeys data={data as API.Journey[]} searchValue={searchValue} refetch={refetch} />;
    }
    return null;
};

export default JourneysTabContainer;
