'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Illustration, Search, Space, Spin, Typography } from '@imbrace/ui';
import type { QueryFunction } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@uidotdev/usehooks';
import { useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { z } from 'zod';

import { getForms } from '@/services/api/app';
import apiFetch from '@/services/axios/handler';

import FormCard from './formCard';
import styles from './index.module.scss';

const handleFetchForm: QueryFunction<FormManagement.Form[], ['formManagement', string | undefined]> = async ({ queryKey }) => {
    const [, search] = queryKey;

    const { data } = await apiFetch<{ data: FormManagement.Form[] }>(getForms.api(), getForms.method, {
        search: search || undefined,
    });
    return data.data;
};

const formSchema = z.object({
    formId: z.string(),
});

type FormType = z.infer<typeof formSchema>;

const ExistingForms = ({
    onClose,
    onRoute,
    onOpenStarter,
}: {
    onClose: () => void;
    onRoute: (url: string) => void;
    onOpenStarter: () => void;
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 300);
    const {
        setValue,
        watch,
        formState: { isValid },
        handleSubmit,
        reset,
    } = useForm<FormType>({
        mode: 'all',
        resolver: zodResolver(
            formSchema,
            {
                async: true,
            },
            { mode: 'async' },
        ),
    });
    const selectedId = watch('formId');

    const { data, isFetching } = useQuery({
        queryKey: ['formManagement', debouncedSearch],
        queryFn: handleFetchForm,
        initialData: [],
    });

    const onSubmit = (formData: FormType) => {
        onClose();
        onRoute(`/form-management/form/create?extends=${formData.formId}`);
    };

    return (
        <Space
            size={24}
            direction="vertical"
            align="stretch"
            style={{ height: '100%', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
        >
            <Space size={24} direction="vertical" align="stretch" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
                <Space justify="between" align="center" style={{ width: '100%', padding: '32px', paddingBottom: 0 }}>
                    <Typography variant="Heading2">{t('journey_form_management_existing_form_title')}</Typography>
                    <div>
                        <Search
                            placeholder={t('search_by_form_or_data_board_name')}
                            sx={{ width: '500px' }}
                            value={search}
                            onSearch={(searchValue) => {
                                setSearch(searchValue);
                                reset({});
                            }}
                            onReset={() => {
                                setSearch('');
                            }}
                        />
                    </div>
                </Space>
                <Scrollbars autoHide>
                    <div style={{ padding: '32px', paddingTop: 0, paddingBottom: 0, height: '100%' }}>
                        <Spin isSpinning={isFetching}>
                            {data.length > 0 && (
                                <div className={styles.formsContainer}>
                                    {data?.map((form) => {
                                        return (
                                            <FormCard
                                                isSelected={selectedId === form._id}
                                                key={form._id}
                                                form={form}
                                                onRoute={onRoute}
                                                onClick={() => {
                                                    setValue('formId', form._id, {
                                                        shouldValidate: true,
                                                    });
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                            {data.length === 0 && (
                                <Illustration
                                    name={search ? 'fileSearch' : 'formMissing'}
                                    description={
                                        <Typography variant="SubHeading2">
                                            {search ? (
                                                <Trans i18nKey="journey_form_management_form_search_empty">
                                                    No matching result has been found. \n Check the spelling or create{' '}
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            onOpenStarter();
                                                        }}
                                                    >
                                                        a new form
                                                    </button>{' '}
                                                    for it now.
                                                </Trans>
                                            ) : (
                                                <Trans i18nKey="journey_form_management_form_empty">
                                                    Create your first
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            onOpenStarter();
                                                        }}
                                                    >
                                                        collecting form
                                                    </button>{' '}
                                                    now \n and start to engage with your customers!
                                                </Trans>
                                            )}
                                        </Typography>
                                    }
                                />
                            )}
                        </Spin>
                    </div>
                </Scrollbars>
            </Space>
            <Space size={8} style={{ padding: '32px', paddingTop: 0 }}>
                <Button
                    text={t('back')}
                    variant="outlined"
                    onClick={() => {
                        onClose();
                    }}
                />
                <Button
                    text={t('apply')}
                    disabled={!isValid}
                    onClick={() => {
                        handleSubmit(onSubmit)();
                    }}
                />
            </Space>
        </Space>
    );
};

export default ExistingForms;
