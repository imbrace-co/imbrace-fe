import { Illustration, Typography } from '@imbrace/ui';
import type { QueryObserverResult, RefetchOptions } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';

import JourneyCard from './journeyCard';
import styles from './journeys.module.scss';

const Journeys = ({
    data,
    searchValue,
    refetch,
}: {
    data?: API.Journey[];
    searchValue?: string;
    refetch: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<API.Journey[], Error>>;
}) => {
    const { t } = useTranslation();
    const { openHelpCenter } = useNavbar();
    const support = useAppSelector((state) => state.Account.support);
    const dummyFinancialManagementJourney = {
        channel: {
            id: '',
            name: '',
            channel_type: '',
        },
        _id: 'app_b0dfe364-a09c-4f78-8e93-79abecb3084f',
        doc_name: 'App',
        icon: {
            namespace: 'channel',
            name: 'financialManagement',
            _id: '66617324ccf3d3cc6fccc856',
        },
        is_hidden: false,
        title: 'Financial Management - iMBrace Limited',
        description: 'Manage and generate your financial data with ease with AI',
        url: 'http://localhost:8080/app/openai-assistant',
        organization_id: 'org_imbrace',
        version: '2024-05-08T03:02:15.551Z',
        workflow_id: '3597',
        options: {
            is_active: false,
            interaction: {
                type: 'MODAL',
                data: {
                    type: 'financial_management',
                },
            },
        },
        product_id: 'product_731499d7-4c95-4260-97eb-965e72962b9b',
        app_type: 'marketplace',
        is_active: true,
        is_deleted: false,
        categories: ['Support', 'Sales', 'Service'],
        channels_or_platforms: ['imbraceai'],
        sub_workflows: [],
        product_type: 'financial_management',
        product_code: 'financial_management',
        direct_data_board: [],
        tags: [],
        updated_at: '2025-01-03T02:31:21.004Z',
        public_id: '5b0fdb36-99f9-44c6-befe-e2c1db1be2dd',
        created_at: '2024-06-06T08:28:20.805Z',
        user_progress: {
            status: 'IN_USE',
            steps: 3,
            finished: true,
        },
        id: 'app_b0dfe364-a09c-4f78-8e94-79abecb3084f',
    };

    const dummyData = [
        dummyFinancialManagementJourney,
        ...(data ?? []),
    ];

    return (
        <>
            {(!dummyData || dummyData?.length === 0) && (
                <Illustration
                    name="appPuzzle"
                    description={
                        <Typography style={{ width: 500, fontSize: 16, color: 'var(--color-light-5)', fontWeight: 600 }}>
                            <Trans i18nKey={'journey_empty_desc'}>
                                Currently don’t have any Journey enabled. Browse our <Link to="/journeys/libraries">Journey libraries</Link>
                                or request
                                <button
                                    style={{ display: 'inline', fontSize: 16, padding: 0, fontWeight: 600 }}
                                    onClick={() => {
                                        openUnlockFeature({
                                            title: t('new_inquiry_title'),
                                            content: t('new_inquiry_desc'),
                                            channel: support.customer?.channel,
                                            touchpoint: support.app?.touchpoint,
                                            initialStep: 2,
                                            openHelpCenter: (channelId) => {
                                                openHelpCenter?.({
                                                    channelId,
                                                    prefillMessage: t('new_inquiry_prefill_message'),
                                                    defaultWebWidget: true,
                                                });
                                            },
                                        });
                                    }}
                                >
                                    customized solution
                                </button>
                                !
                            </Trans>
                        </Typography>
                    }
                />
            )}
            {dummyData && dummyData?.length > 0 && (
                <div className={styles.container}>
                    {dummyData?.map((orgApp) => {
                        return <JourneyCard key={`orgApp-${orgApp._id}`} orgApp={orgApp as API.Journey} refetch={refetch} />;
                    })}
                </div>
            )}
        </>
    );
};

export default Journeys;
