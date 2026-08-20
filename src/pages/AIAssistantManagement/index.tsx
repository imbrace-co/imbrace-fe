'use client';
import { Button, Illustration, Search, Space, Spin, Typography } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { QueryFunction, useQuery } from '@tanstack/react-query';
import { useDebounce } from '@uidotdev/usehooks';
import { useNavigate } from 'react-router';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { getAIAssistant, getAIAssistantById } from '@/services/api/ai-assistant';
import apiFetch from '@/services/axios/handler';
import styles from './index.module.scss';
import { OpenAIAssistant } from './components/type';
import AssistantCard from './components/aiAssistantCard';
import { useSearchParams } from 'react-router-dom';

const handleFetchAIAssistants: QueryFunction<OpenAIAssistant[], ['aiAssistantManagement', string | undefined]> = async ({ queryKey }) => {
    const [, search] = queryKey;

    const response = await apiFetch<OpenAIAssistant[]>(getAIAssistant.api(), getAIAssistant.method, {
        name: search || undefined,
    });
    return response.data;
};

const AIAssistantManagement = () => {
    const searchParams = useSearchParams();
    const router = useNavigate();
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const [isPending, startTransition] = useTransition();

    const { data, isFetching, refetch } = useQuery({
        queryKey: ['aiAssistantManagement', debouncedSearch],
        queryFn: handleFetchAIAssistants,
        initialData: [],
    });

    const onRoute = useCallback(
        (url: string) => {
            startTransition(() => {
                router(url);
            });
        },
        [router],
    );

    return (
        <Spin isSpinning={isPending || isFetching}>
            <Space size={0} direction="vertical" align="stretch" style={{ height: '100%', padding: '32px', overflow: 'auto' }}>
                <Space justify="between" align="center" style={{ marginBottom: '16px' }}>
                    <Typography variant="Heading2">{t('ai_assistant_management')}</Typography>
                    <Space size={12}>
                        <Search
                            sx={{ width: '353px' }}
                            placeholder={t('ai_assistant_management_search_by_assistant_role_name')}
                            value={search}
                            onSearch={setSearch}
                        />
                        <Button
                            text={t('create_new')}
                            onClick={() => {
                               router(`/journey/ai-assistant-management/new`);
                            }}
                        />
                    </Space>
                </Space>
                <div style={{ flex: 1 }}>
                    <Spin>
                        {data.length > 0 && (
                            <div className={styles.container}>
                                {data?.map((assistant) => {
                                    return <AssistantCard key={assistant.id} assistant={assistant} onRoute={onRoute} refetch={refetch} />;
                                })}
                            </div>
                        )}
                        {data.length === 0 && (
                            <Illustration
                                name={search ? 'fileSearch' : 'formMissing'}
                                description={
                                    <Typography variant="SubHeading2">
                                        {search ? (
                                            <div>
                                                {t('ai_assistant_management_search_empty_guide_1')} {'\n'}{' '}
                                                {t('ai_assistant_management_search_empty_guide_2')}
                                                <button
                                                    onClick={() => {
                                                        onRoute(`/ai-assistant-management/form/create?${searchParams.toString()}`);
                                                    }}
                                                >
                                                    {' '}
                                                    {t('ai_assistant_management_search_empty_guide_3')}
                                                </button>{' '}
                                                {t('ai_assistant_management_search_empty_guide_4')}
                                            </div>
                                        ) : (
                                            <div>
                                                {t('ai_assistant_management_list_empty_guide_1')}{' '}
                                                <button
                                                    onClick={() => {
                                                        onRoute(`/ai-assistant-management/form/create?${searchParams.toString()}`);
                                                    }}
                                                >
                                                    {t('ai_assistant_management_list_empty_guide_2')}
                                                </button>{' '}
                                                {t('ai_assistant_management_list_empty_guide_3')} {'\n'}{' '}
                                                {t('ai_assistant_management_list_empty_guide_4')}
                                            </div>
                                        )}
                                    </Typography>
                                }
                            />
                        )}
                    </Spin>
                </div>
            </Space>
        </Spin>
    );
};

export default AIAssistantManagement;
