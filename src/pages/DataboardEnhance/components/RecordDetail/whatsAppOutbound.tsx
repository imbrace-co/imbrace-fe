import { FieldSelect, FieldText, Icon, Space, Typography } from '@imbrace/ui';
import { useQueryClient } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import type { ReactElement } from 'react';
import { useEffect, useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useAppSelector } from '@/redux/store';
import { getWhatsAppMessageListsV2 } from '@/services/api/whatsAppMessageTemplates';
import apiFetch from '@/services/axios/handler';
import { relatedRecordsQueryFn, relatedRecordsQueryKey } from '@/services/queries/board';
import { channelsQueryFn, channelsQueryKey } from '@/services/queries/channel';
import { RequiredStringSchema } from '@/utils/schema';

export const WhatsAppOutboundSchema = (t: TFunction) =>
    z.object({
        to: RequiredStringSchema(t),
        channelId: RequiredStringSchema(t),
        template: z.object({
            name: RequiredStringSchema(t),
            text: RequiredStringSchema(t),
            language: RequiredStringSchema(t),
        }),
        templateId: RequiredStringSchema(t),
        variables: z.array(RequiredStringSchema(t)).optional(),
    });

export type WhatsAppOutboundFormType = z.infer<ReturnType<typeof WhatsAppOutboundSchema>>;

const WhatsAppOutbound = ({
    methods,
    boardId,
    recordId,
    relatedBoardId,
    boardType,
    whatsAppFieldId,
    identifierFieldId,
}: {
    methods: UseFormReturn<WhatsAppOutboundFormType>;
    boardId: string;
    recordId: string;
    relatedBoardId?: string;
    boardType: API.BoardType;
    whatsAppFieldId?: string;
    identifierFieldId?: string;
}) => {
    const { control, setValue, getValues, reset } = methods;
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const businessUnitId = useAppSelector((state) => state.BusinessUnit.businessUnitList[0].id);
    const { fields, remove, replace } = useFieldArray({
        control,
        name: 'variables' as never,
    });
    const currentChannelId = useWatch({
        control,
        name: 'channelId',
    });
    const currentTemplateId = useWatch({
        control,
        name: 'templateId',
    });
    const currentVariables = useWatch({
        control,
        name: 'variables',
    });

    useEffect(() => {
        const templates = queryClient.getQueryData<API.WhatsAppMessageTemplate[]>(['whatsappTemplates', currentChannelId]);
        const targetTemplate = templates?.find((template) => template.id === currentTemplateId);
        const variables = targetTemplate?.text.match(/{{\d+}}/g);

        if (variables) {
            replace(variables.map(() => ''));
        } else {
            replace([]);
        }
        if (targetTemplate) {
            setValue('template.name', targetTemplate.template_name, {
                shouldValidate: true,
            });
            setValue('template.text', targetTemplate.text, {
                shouldValidate: true,
            });
            setValue('template.language', targetTemplate.language, {
                shouldValidate: true,
            });
        }
    }, [currentTemplateId, replace, queryClient, currentChannelId, remove, setValue]);

    const templatePreview = useMemo(() => {
        if (!currentTemplateId) return null;
        const templates = queryClient.getQueryData<API.WhatsAppMessageTemplate[]>(['whatsappTemplates', currentChannelId]);
        const targetTemplate = templates?.find((template) => template.id === currentTemplateId);
        if (!targetTemplate) return null;
        const variables = targetTemplate?.text.match(/{{\d+}}/g);
        if (variables) {
            const result: ReactElement[] = [];
            let variableNum = 0;
            const splitText = targetTemplate.text.split(/{{\d+}}/g);
            splitText.forEach((text, index) => {
                if (index === splitText.length - 1) {
                    result.push(<span key={`text-${index}`}>{text}</span>);
                    return;
                }
                result.push(<span key={`text-${index}`}>{text}</span>);
                if (currentVariables?.[variableNum]) {
                    result.push(<span key={`text-${index}-variable-${variableNum}`}>{currentVariables[variableNum]}</span>);
                } else {
                    result.push(
                        <span style={{ color: 'var(--color-light-4)' }} key={`text-${index}-variable-${variableNum}`}>{`{{${
                            variableNum + 1
                        }}}`}</span>,
                    );
                }

                variableNum += 1;
            });
            return result;
        }
        return targetTemplate.text;
    }, [currentTemplateId, queryClient, currentChannelId, currentVariables]);

    return (
        <Space size={24} align="stretch" direction="vertical">
            {boardType === 'Opportunities' && (
                <Controller
                    control={control}
                    name="to"
                    render={({ field, fieldState: { error } }) => (
                        <FieldSelect
                            fullWidth
                            label={`${t('send_to_associated_contacts')}*`}
                            queryKey={relatedRecordsQueryKey({
                                boardId,
                                recordId,
                                relatedBoardId,
                                params: { skip: 0, limit: 0, link: true },
                            })}
                            request={async (params) => {
                                const data = await relatedRecordsQueryFn({
                                    boardId,
                                    recordId,
                                    relatedBoardId,
                                    params: { skip: 0, limit: 0, link: true },
                                })(params);
                                if (!getValues('to')) {
                                    reset({
                                        ...getValues(),
                                        to: data.data.filter((item) => item.fields[whatsAppFieldId || ''])[0]?._id,
                                    });
                                }
                                return data;
                            }}
                            querySelect={(data) => {
                                return data.data
                                    .filter((item) => item.fields[whatsAppFieldId || ''])
                                    .map((item) => ({
                                        text: item.fields[identifierFieldId || ''],
                                        value: item._id,
                                    }));
                            }}
                            placeholder={t('click_to_select')}
                            error={!!error}
                            helperText={error?.message}
                            {...field}
                        />
                    )}
                />
            )}
            <Controller
                control={control}
                name="channelId"
                render={({ field: { value, onChange }, fieldState: { error } }) => (
                    <FieldSelect<string, ReturnType<typeof channelsQueryKey>, API.Channel[]>
                        queryKey={channelsQueryKey('whatsapp')}
                        label={`${t('send_the_outbound_through')}*`}
                        request={async (params) => {
                            const data = await channelsQueryFn('whatsapp')(params);
                            if (!getValues('channelId')) {
                                reset({ ...getValues(), channelId: data[0]._id });
                            }
                            return data;
                        }}
                        querySelect={(data) => {
                            return data.map((channel) => ({
                                text: channel.name,
                                value: channel._id,
                                icon: <Icon namespace="channel" name="whatsapp" fontSize={24} />,
                            }));
                        }}
                        fullWidth
                        value={value}
                        onChange={onChange}
                        error={!!error}
                        helperText={error?.message}
                    />
                )}
            />
            <Controller
                control={control}
                name="templateId"
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect<string, ['whatsappTemplates', string], API.WhatsAppMessageTemplate[]>
                        queryKey={['whatsappTemplates', currentChannelId]}
                        label={`${t('whatsapp_outbound_message')}*`}
                        request={async ({ queryKey }) => {
                            const [, channelId] = queryKey;
                            if (!channelId) return [];

                            const api = getWhatsAppMessageListsV2.api(businessUnitId, channelId, 0, 0);
                            const { data } = await apiFetch<API.PaginatedResponse<API.WhatsAppMessageTemplate[]>>(
                                api,
                                getWhatsAppMessageListsV2.method,
                            );

                            reset({
                                ...getValues(),
                                templateId: data.data.filter((template) => template.status === 'APPROVED')[0]?.id,
                            });

                            return data.data.filter((template) => template.status === 'APPROVED');
                        }}
                        querySelect={(data) =>
                            data.map((template) => ({
                                text: template.template_name,
                                value: template.id,
                            }))
                        }
                        fullWidth
                        {...field}
                        error={!!error}
                        helperText={error?.message}
                    />
                )}
            />
            {templatePreview && (
                <Space size={0} direction="vertical" align="stretch">
                    <Typography variant="BodyBold">{t('message_preview')}</Typography>
                    <Typography variant="Body">{templatePreview}</Typography>
                </Space>
            )}
            {fields.map((tField, index) => {
                return (
                    <Controller
                        key={tField.id}
                        control={control}
                        name={`variables.${index}`}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                label={`${t('variable_content')} {{${index + 1}}}*`}
                                fullWidth
                                {...field}
                                {...(field.value && { onReset: () => setValue(`variables.${index}`, '') })}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />
                );
            })}
        </Space>
    );
};

export default WhatsAppOutbound;
