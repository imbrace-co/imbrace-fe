import { FieldDatePicker, FieldSelect, Space, Typography } from '@imbrace/ui';
import type { TFunction } from 'i18next';
import { useEffect } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

import dayjs from 'dayjs';
import apiFetch from '@/services/axios/handler';
import { getMemberListOptions } from '@/services/api/member';
import { useAppSelector } from '@/redux/store';

export const exportCsvFormSchema = (t: TFunction) =>
    z.object({
        range: z.enum(['week', 'month', '3months', '6months', '12months', 'specific_date_range', 'all'], {
            required_error: t('validation_field_required'),
        }),
        by: z.enum(['creation', 'updated'], {
            required_error: t('validation_field_required'),
        }),
        start_date: z.date().optional(),
        end_date: z.date().optional(),
        members: z.array(z.string()).min(1),
    });

export type ExportCsvFormType = z.infer<ReturnType<typeof exportCsvFormSchema>>;

const ExportCsvForm = ({ methods, knowledgeHub }: { methods: UseFormReturn<ExportCsvFormType>; knowledgeHub?: boolean }) => {
    const { control, setValue } = methods;
    const { t } = useTranslation();
    const currentUserEmail = useAppSelector((state) => state.Account.email);
    const range = useWatch({
        control,
        name: 'range',
    });
    const endDate = useWatch({
        control,
        name: 'end_date',
    });
    const startDate = useWatch({
        control,
        name: 'start_date',
    });

    useEffect(() => {
        setTimeout(() => {
            setValue('range', 'month', {
                shouldDirty: true,
                shouldValidate: true,
            });
            setValue('by', 'creation', {
                shouldDirty: true,
                shouldValidate: true,
            });
            setValue('end_date', dayjs().toDate(), {
                shouldDirty: true,
                shouldValidate: true,
            });
            setValue('members', [currentUserEmail], {
                shouldDirty: true,
                shouldValidate: true,
            });
        }, 100);
    }, [setValue, currentUserEmail]);

    const { data, isFetching } = useQuery({
        queryKey: ['membersQuery'],
        queryFn: async () => {
            const { data } = await apiFetch<{ data: API.User[] }>(getMemberListOptions.api(), getMemberListOptions.method);
            return data.data;
        },
    });

    return (
        <Space size={12} direction="vertical" align="stretch">
            <Space size={12} align="center" justify="center">
                <Controller
                    control={control}
                    name="range"
                    render={({ field }) => (
                        <FieldSelect
                            queryKey={['exportCsvForm', 'range']}
                            request={async () => {
                                return [
                                    {
                                        text: t('last_week'),
                                        value: 'week',
                                    },
                                    {
                                        text: t('last_month'),
                                        value: 'month',
                                    },
                                    {
                                        text: t('last_3_months'),
                                        value: '3months',
                                    },
                                    {
                                        text: t('last_6_months'),
                                        value: '6months',
                                    },
                                    {
                                        text: t('last_12_months'),
                                        value: '12months',
                                    },

                                    {
                                        text: t('specific_date_range'),
                                        value: 'specific_date_range',
                                    },
                                    {
                                        text: t('all_data_on_the_board'),
                                        value: 'all',
                                    },
                                ];
                            }}
                            fullWidth
                            {...field}
                        />
                    )}
                />
                <Typography style={{ color: 'var(--color-light-5)' }}>By</Typography>
                <Controller
                    control={control}
                    name="by"
                    render={({ field }) => (
                        <FieldSelect
                            queryKey={['exportCsvForm', 'by']}
                            request={async () => {
                                return [
                                    {
                                        text: t('record_creation_time'),
                                        value: 'creation',
                                    },
                                    {
                                        text: t('record_update_time'),
                                        value: 'updated',
                                    },
                                ];
                            }}
                            fullWidth
                            {...field}
                        />
                    )}
                />
            </Space>
            {range === 'specific_date_range' && (
                <Space size={12} align="end" justify="center">
                    <Controller
                        control={control}
                        name="start_date"
                        render={({ field }) => (
                            <FieldDatePicker
                                label={'Start'}
                                {...field}
                                placeholder="MM DD YYYY"
                                views={['month', 'day', 'year']}
                                maxDate={dayjs(endDate)}
                            />
                        )}
                    />
                    <div
                        style={{
                            color: 'var(--color-light-5)',
                            width: '13px',
                            fontWeight: 600,
                            fontSize: '16px',
                            marginBottom: '12px',
                        }}
                    >
                        -
                    </div>
                    <Controller
                        control={control}
                        name="end_date"
                        render={({ field }) => (
                            <FieldDatePicker
                                label={'End'}
                                {...field}
                                placeholder="MM DD YYYY"
                                views={['month', 'day', 'year']}
                                maxDate={dayjs()}
                                defaultValue={dayjs()}
                                minDate={startDate ? dayjs(startDate) : undefined}
                            />
                        )}
                    />
                </Space>
            )}

            <Controller
                control={control}
                name="members"
                render={({ field }) => (
                    <FieldSelect
                        fullWidth
                        label={`${t('send_exported_csv_to')}*`}
                        description={t('send_exported_csv_to_desc')}
                        enabled={!isFetching}
                        multiple
                        searchable
                        displayType="chip"
                        menuType="chip"
                        request={async () => {
                            return (
                                data?.map((option) => ({
                                    text: option.display_name,
                                    value: option.email,
                                })) ?? []
                            );
                        }}
                        closeOnSelect={false}
                        placeholder={t('click_to_select')}
                        emptyText={t('send_exported_csv_to_empty')}
                        searchPlaceholder={t('teams_member_list_search_placeholder')}
                        onReset={() => {
                            setValue('members', [], {
                                shouldDirty: true,
                                shouldValidate: true,
                            });
                        }}
                        {...field}
                    />
                )}
            />
        </Space>
    );
};

export default ExportCsvForm;
