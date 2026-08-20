import { Button, FieldSelect, FieldText, Space, Typography } from '@imbrace/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, forwardRef, useImperativeHandle, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';

interface AmazonBedrockCredentials {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    region: string;
}

interface AmazonBedrockProviderProps {
    onCancel: () => void;
    onConnect: (config: AmazonBedrockCredentials) => void | Promise<void>;
    providerName: string;
    initialValues?: Partial<AmazonBedrockCredentials>;
}

export interface AmazonBedrockProviderRef {
    submit: () => Promise<void>;
}

const regionOptions = [
    { value: 'us-east-1', text: 'us-east-1' },
    { value: 'us-east-2', text: 'us-east-2' },
    { value: 'us-west-2', text: 'us-west-2' },
    { value: 'eu-west-1', text: 'eu-west-1' },
    { value: 'ap-southeast-1', text: 'ap-southeast-1' },
];

const AmazonBedrockProvider = forwardRef<AmazonBedrockProviderRef, AmazonBedrockProviderProps>(
    ({ onCancel, onConnect, providerName, initialValues }, ref) => {
        const { t } = useTranslation();
        const [showGuide, setShowGuide] = useState(true);

        const bedrockSchema = useMemo(
            () =>
                z.object({
                    accessKeyId: z
                        .string()
                        .min(1, t('llm_provider_access_key_id_required'))
                        .superRefine((val, ctx) => {
                            if (val.trim().length === 0) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message: t('llm_provider_access_key_id_required'),
                                });
                            }
                        }),
                    secretAccessKey: z
                        .string()
                        .min(1, t('llm_provider_secret_access_key_required'))
                        .superRefine((val, ctx) => {
                            if (val.trim().length === 0) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message: t('llm_provider_secret_access_key_required'),
                                });
                            }
                        }),
                    sessionToken: z.string().optional(),
                    region: z
                        .string()
                        .min(1, t('llm_provider_region_required'))
                        .superRefine((val, ctx) => {
                            if (val.trim().length === 0) {
                                ctx.addIssue({
                                    code: z.ZodIssueCode.custom,
                                    message: t('llm_provider_region_required'),
                                });
                            }
                        }),
                }),
            [t],
        );

        const {
            control,
            handleSubmit,
            formState: { isSubmitting },
        } = useForm<AmazonBedrockCredentials>({
            resolver: zodResolver(bedrockSchema),
            mode: 'onBlur',
            defaultValues: {
                accessKeyId: initialValues?.accessKeyId || '',
                secretAccessKey: initialValues?.secretAccessKey || '',
                sessionToken: initialValues?.sessionToken || '',
                region: initialValues?.region || 'us-east-1',
            },
        });

        const onSubmit = async (values: AmazonBedrockCredentials) => {
            await onConnect(values);
        };

        useImperativeHandle(ref, () => ({
            submit: async () => {
                await handleSubmit(onSubmit)();
            },
        }));

    return (
        <Space direction="vertical" style={{ width: '100%' }} align="start">
            <Space
                direction="horizontal"
                justify="between"
                align="center"
                style={{ width: '100%', marginBottom: '8px' }}
            >
                <Typography variant="Body" style={{ color: '#4F4F4F' }}>
                    {t('llm_provider_enter_credentials', { provider: 'Amazon Bedrock' })}
                </Typography>
                <Button
                    variant="link"
                    size="xs"
                    text={showGuide ? t('llm_provider_hide') : t('llm_provider_need_help')}
                    onClick={() => setShowGuide((prev) => !prev)}
                    sx={{ padding: 0 }}
                />
            </Space>

            {showGuide && (
                <Space
                    direction="vertical"
                    align="start"
                    style={{
                        width: '100%',
                        borderRadius: '4px',
                        padding: '16px 16px 12px',
                        marginBottom: '24px',
                    }}
                >
                    <Typography variant="BodyBold" style={{ marginBottom: '8px' }}>
                        {t('llm_provider_bedrock_guide_title')}
                    </Typography>
                    <ol
                        style={{
                            paddingLeft: '20px',
                            margin: 0,
                            color: '#4F4F4F',
                            fontSize: '13px',
                            lineHeight: '20px',
                        }}
                    >
                        <li>{t('llm_provider_bedrock_step1')}</li>
                        <li>{t('llm_provider_bedrock_step2')}</li>
                        <li>{t('llm_provider_bedrock_step3')}</li>
                        <li>
                            {t('llm_provider_bedrock_step_attach')}
                            <br />
                            • {t('llm_provider_bedrock_step_attach_detail')}
                        </li>
                        <li>
                            {t('llm_provider_bedrock_step_copy')}
                            <br />
                            • {t('llm_provider_access_key_id')}
                            <br />
                            • {t('llm_provider_secret_access_key')}
                        </li>
                        <li>{t('llm_provider_bedrock_step_region')}</li>
                        <li>{t('llm_provider_bedrock_step_paste')}</li>
                    </ol>
                </Space>
            )}

            <Space direction="vertical" align="start" style={{ width: '100%', gap: '16px' }}>
                <Controller
                    name="accessKeyId"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_access_key_id')}
                            placeholder={t('llm_provider_access_key_id_placeholder')}
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />

                <Controller
                    name="secretAccessKey"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_secret_access_key')}
                            placeholder={t('llm_provider_secret_access_key_placeholder')}
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />

                <Controller
                    name="sessionToken"
                    control={control}
                    render={({ field }) => (
                        <FieldText
                            {...field}
                            fullWidth
                            label={t('llm_provider_session_token')}
                            placeholder={t('llm_provider_session_token_placeholder')}
                        />
                    )}
                />

                <Controller
                    name="region"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldSelect
                            {...field}
                            fullWidth
                            label={t('llm_provider_region')}
                            placeholder={t('llm_provider_select_aws_region')}
                            queryKey={['bedrock_regions']}
                            request={async () => regionOptions}
                            error={!!error}
                            helperText={error?.message}
                        />
                    )}
                />
            </Space>
        </Space>
    );
    },
);

(AmazonBedrockProvider as any).displayName = 'AmazonBedrockProvider';

export default AmazonBedrockProvider;


