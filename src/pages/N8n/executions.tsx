import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppSelector } from '@/redux/store';

const Executions = () => {
    const { i18n } = useTranslation();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const userId = useAppSelector((state) => state.Account.id);
    const organizationPartition = useAppSelector((state) => state.Account.partition);

    const src = useMemo(() => {
        const workflowDomain = '';
        const token = localStorage.getItem('imbrace-access-token');
        return `${workflowDomain}/executions/list?lang=${i18n.language ?? 'en'}&token=${token}&organizationId=${organizationId}&userId=${userId}`;
    }, [organizationPartition, i18n, organizationId, userId]);

    return <iframe src={src} frameBorder="0" allow="clipboard-read; clipboard-write" title="workflow executions iframe" style={{ width: '100%', height: '100%' }} />;
};

export default Executions;
