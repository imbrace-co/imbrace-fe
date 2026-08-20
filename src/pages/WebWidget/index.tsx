import { TinyColor } from '@ctrl/tinycolor';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, EllipsisText, FieldSwitch, FieldText, FieldUpload, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { type QueryFunction, useMutation, useQuery } from '@tanstack/react-query';
import type { Transition } from 'history';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import type SimpleBarCore from 'simplebar-core';
import { z } from 'zod';

import Loading from '@/components/Loading';
import PageLayout from '@/components/PageLayout';
import Stepper from '@/components/Stepper';
import useNotification from '@/hooks/useNotification';
import usePrompt from '@/hooks/usePrompt';
import ColorPicker from '@/pages/WebWidget/components/ColorPicker';
import { getChannelById, putChannelByBuId } from '@/services/api/channel';
import { postBoardUpload } from '@/services/api/crm';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { emailRegex, supportedImageFileExtensions, supportedImageFileMIME, urlRegex } from '@/utils';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import { AttachmentSchema, RequiredAndMaxLengthStringSchema } from '@/utils/schema';

import ChatBox from './components/Chatbox';
import EmailFallbackTemplate from './components/EmailFallbackTemplate';
import WebWidgetCode, { WebWidgetURL } from './components/WebWidgetCode';
import styles from './index.module.scss';

export const WebWidgetFormSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        // step1
        window_name: RequiredAndMaxLengthStringSchema(t, 60),
        chatbot_name: RequiredAndMaxLengthStringSchema(t, 30),
        welcome_message: RequiredAndMaxLengthStringSchema(t, 200),
        header_color: z
            .string({ required_error: t('validation_field_required') })
            .regex(/([0-9a-f]{3}){1,2}$/i, {
                message: t('validation_color_pattern'),
            })
            .superRefine((val, ctx) => {
                if (!val) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
                const color = new TinyColor(val);
                if (!color.isValid) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_color_pattern'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
            }),
        primary_color: z
            .string({ required_error: t('validation_field_required') })
            .regex(/([0-9a-f]{3}){1,2}$/i, {
                message: t('validation_color_pattern'),
            })
            .superRefine((val, ctx) => {
                if (!val) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
                const color = new TinyColor(val);
                if (!color.isValid) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_color_pattern'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
            }),
        secondary_color: z
            .string({ required_error: t('validation_field_required') })
            .regex(/([0-9a-f]{3}){1,2}$/i, {
                message: t('validation_color_pattern'),
            })
            .superRefine((val, ctx) => {
                if (!val) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
                const color = new TinyColor(val);
                if (!color.isValid) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_color_pattern'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
            }),
        background_color: z
            .string({ required_error: t('validation_field_required') })
            .regex(/([0-9a-f]{3}){1,2}$/i, {
                message: t('validation_color_pattern'),
            })
            .superRefine((val, ctx) => {
                if (!val) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
                const color = new TinyColor(val);
                if (!color.isValid) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_color_pattern'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
            }),
        font_size: z.string().min(1, t('validation_field_required')),
        window_logo: AttachmentSchema.optional().superRefine((val, ctx) => {
            if (val?.some((attachment) => attachment.error)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: val.filter((attachment) => attachment.error)[0].error,
                    fatal: true,
                });
                return z.NEVER;
            }
        }),
        chatbot_avatar: AttachmentSchema.optional().superRefine((val, ctx) => {
            if (val?.some((attachment) => attachment.error)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: val.filter((attachment) => attachment.error)[0].error,
                    fatal: true,
                });
                return z.NEVER;
            }
        }),
        // step2
        action_button_text: RequiredAndMaxLengthStringSchema(t, 40),
        button_url: z
            .string({ required_error: t('validation_field_required') })
            .regex(urlRegex, {
                message: t('validation_fallback_url_pattern'),
            })
            .superRefine((val, ctx) => {
                if (!val || val.length < 1 || val.trim().length <= 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
            }),
        email: z
            .string({ required_error: t('validation_field_required') })
            .regex(emailRegex, {
                message: t('validation_fallback_email_pattern'),
            })
            .superRefine((val, ctx) => {
                if (!val || val.length < 1 || val.trim().length <= 0) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                    });

                    return z.NEVER;
                }
            }),
        subject_title: RequiredAndMaxLengthStringSchema(t, 80),
        profile_name: RequiredAndMaxLengthStringSchema(t, 30),
        e_signature_name: z.string().optional(),
        e_signature_information: z.string().optional(),
        show_powered_by: z.boolean({ required_error: t('validation_field_required') }),
        legal_disclaimer: z.string().optional(),
        e_signature_logo: AttachmentSchema.optional().superRefine((val, ctx) => {
            if (val?.some((attachment) => attachment.error)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: val.filter((attachment) => attachment.error)[0].error,
                    fatal: true,
                });
                return z.NEVER;
            }
        }),
    });

export type WebWidgetFormType = z.infer<ReturnType<typeof WebWidgetFormSchema>>;

const onUpload = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('', file);
    const { data } = await apiFetch<{ url: string }[]>(postBoardUpload.api, postBoardUpload.method, uploadFormData, ImbraceFileUpload);
    return {
        url: data?.[0]?.url || '',
        id: '1',
        name: file.name,
        size: file.size,
    };
};

const fetchChannel: QueryFunction<API.ChannelWebWidget, ['channel', string | undefined]> = async ({ queryKey }) => {
    const [, channelId] = queryKey;
    if (!channelId) {
        throw new Error('channel Id is missing');
    }

    const api = getChannelById.api(channelId);
    const { data } = await apiFetch<API.ChannelWebWidget>(api, getChannelById.method);
    return data;
};

interface WebWidgetProps {
    id?: string;
    isModalContent?: boolean;
    onCloseModal?: (state: string) => void;
}

const WebWidget = (props: WebWidgetProps) => {
    const { id, isModalContent, onCloseModal } = props;
    const { t } = useTranslation();
    const { channelId } = useParams<{ channelId: string }>();
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [editing, setEditing] = useState<boolean>(false);
    const formRef = useRef<HTMLFormElement>(null);
    const containerRef = useRef<SimpleBarCore>(null);
    const [{ dialog }, dialogHolder] = useDialog();
    const { showViewOnlyToast } = useNotification();

    // const [open, setOpen] = useState<boolean>(false);
    const [showPromptDialog, setShowPromptDialog] = useState(false);
    const isAllowModifyChannel = getIsAllowModify();

    const currentChannelId = channelId ?? id;
    let isToastShowed = false;
    const methods = useForm<WebWidgetFormType>({
        mode: 'all',
        defaultValues: {
            // step1
            window_name: '',
            chatbot_name: '',
            welcome_message: t('web_widget_welcome_message_placeholder'),
            primary_color: '156df2',
            header_color: '156df2',
            secondary_color: 'eaebf2',
            // step2
            action_button_text: t('web_widget_cta_button_text_placeholder'),
            button_url: '',
            email: '',
            subject_title: '',
            profile_name: '',
            e_signature_name: '',
            e_signature_information: '',
            show_powered_by: true,
            legal_disclaimer: t('email_template_legal_disclaimer_placeholder'),
        },
        resolver: zodResolver(WebWidgetFormSchema(t), { async: true }, { mode: 'async' }),
    });

    const {
        data: currentChannel,
        refetch,
        isLoading: isLoadingChannel,
    } = useQuery({
        queryKey: ['channel', currentChannelId],
        queryFn: fetchChannel,
        enabled: !!currentChannelId,
    });

    useEffect(() => {
        containerRef?.current?.getScrollElement()?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [activeStep]);

    useEffect(() => {
        if (!isAllowModifyChannel && !isToastShowed) {
            showViewOnlyToast();
            isToastShowed = true;
        }
    }, [isAllowModifyChannel]);

    const activeChannel = useMutation({
        mutationFn: async (cId: string) => {
            await apiFetch<API.ChannelWebWidget>(putChannelByBuId.api(cId), putChannelByBuId.method, {
                active: true,
            });
        },
    });

    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
        watch,
        trigger,
        setError,
        getValues,
        clearErrors,
    } = methods;

    useEffect(() => {
        if (currentChannel) {
            const {
                window_name,
                window_logo,
                chatbot_name,
                welcome_message,
                chatbot_avatar,
                primary_color,
                header_color,
                secondary_color,
                background_color,
                font_size,
            } = currentChannel?.config || {};
            const {
                action_button_text,
                button_url,
                email,
                subject_title,
                profile_name,
                e_signature_logo,
                e_signature_name,
                e_signature_information,
                show_powered_by,
                legal_disclaimer,
            } = currentChannel?.config?.email_config || {};
            reset({
                window_name: window_name || '',
                chatbot_name: chatbot_name || '',
                window_logo: window_logo ? [{ id: 'window_logo', url: window_logo, status: 'ok' }] : undefined,
                chatbot_avatar: chatbot_avatar
                    ? [
                          {
                              id: 'chatbot_avatar',
                              url: chatbot_avatar,
                              status: 'ok',
                          },
                      ]
                    : undefined,
                welcome_message: welcome_message || t('web_widget_welcome_message_placeholder'),
                primary_color: (primary_color && primary_color.replace('#', '')) || '156df2',
                header_color: (header_color && header_color.replace('#', '')) || '156df2',
                background_color: (background_color && background_color.replace('#', '')) || 'ffffff',
                font_size: font_size || '16',
                secondary_color: (secondary_color && secondary_color.replace('#', '')) || 'eaebf2',
                action_button_text: action_button_text || t('web_widget_cta_button_text_placeholder'),
                button_url: button_url || '',
                email: email || '',
                subject_title: subject_title || '',
                profile_name: profile_name || '',
                e_signature_name: e_signature_name || '',
                e_signature_information: e_signature_information || '',
                e_signature_logo: e_signature_logo
                    ? [
                          {
                              id: 'e_signature_logo',
                              url: e_signature_logo,
                              status: 'ok',
                          },
                      ]
                    : undefined,
                show_powered_by: show_powered_by || true,
                legal_disclaimer: legal_disclaimer || t('email_template_legal_disclaimer_placeholder'),
            });
        }
    }, [currentChannel, reset, t]);

    const handleEdit = useCallback(
        async (formData: WebWidgetFormType) => {
            if (!currentChannelId) return;

            try {
                setEditing(true);
                const channelData = {
                    ...formData,
                    window_logo: formData.window_logo?.filter((attachment) => attachment.status === 'ok')?.[0]?.url,
                    chatbot_avatar: formData.chatbot_avatar?.filter((attachment) => attachment.status === 'ok')?.[0]?.url,
                    e_signature_logo: formData.e_signature_logo?.filter((attachment) => attachment.status === 'ok')?.[0]?.url,
                };

                const newData = {
                    is_init: false,
                    config: {
                        type: 'web',
                        window_name: channelData.window_name,
                        window_logo: channelData.window_logo,
                        chatbot_name: channelData.chatbot_name,
                        welcome_message: channelData.welcome_message,
                        chatbot_avatar: channelData.chatbot_avatar,
                        primary_color: `#${channelData.primary_color}`,
                        header_color: `#${channelData.header_color}`,
                        background_color: `#${channelData.background_color}`,
                        font_size: channelData.font_size,
                        secondary_color: `#${channelData.secondary_color}`,
                        email_config: {
                            email: channelData.email,
                            subject_title: channelData.subject_title,
                            profile_name: channelData.profile_name,
                            e_signature_logo: channelData.e_signature_logo,
                            e_signature_name: channelData.e_signature_name,
                            e_signature_information: channelData.e_signature_information,
                            show_powered_by: channelData.show_powered_by,
                            legal_disclaimer: channelData.legal_disclaimer,
                            action_button_text: channelData.action_button_text,
                            button_url: channelData.button_url,
                        },
                    },
                };
                await apiFetch<API.ChannelWebWidget>(putChannelByBuId.api(currentChannelId), putChannelByBuId.method, {
                    ...newData,
                });
                refetch();

                setEditing(false);
            } catch (error) {
                console.error(error);
                setEditing(false);
            }
        },
        [refetch, currentChannelId],
    );

    const onSave = useCallback(
        async (formData: WebWidgetFormType) => {
            try {
                if (currentChannel && isDirty) {
                    await handleEdit(formData);
                    return;
                }
            } catch (error) {
                console.error(error);
                setActiveStep((prev) => prev - 1);
            }
        },
        [currentChannel, isDirty, handleEdit],
    );

    const onNext = () => {
        if (activeStep === 2) return;
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };

    const onBack = () => {
        if (Object.keys(errors).length > 0) return;
        setActiveStep((prev) => prev - 1);
    };

    const goToStep = async (step: number) => {
        if (step === 1) {
            const result = await trigger([
                'window_name',
                'window_logo',
                'chatbot_name',
                'welcome_message',
                'primary_color',
                'header_color',
                'secondary_color',
                'background_color',
                'font_size',
                'chatbot_avatar',
            ]);
            if (!result) return;
        }
        if (step === 2) {
            const result = await trigger();
            if (!result) return;
        }
        setActiveStep(step);
    };

    const isStepValid = (step: number, formData: WebWidgetFormType) => {
        switch (step) {
            case 0:
                return !!formData.window_name && !!formData.chatbot_name && !!formData.welcome_message;
            case 1:
                return !!formData.action_button_text && !!formData.button_url && !!formData.email;
            default:
                return true;
        }
    };

    const goToStepHandler = async () => {
        if (!isStepValid(activeStep, watch())) {
            return;
        }
        await goToStep(activeStep + 1);
    };

    const renderStep = () => {
        if (activeStep === 0) {
            return (
                <>
                    <Space key="step1" direction="vertical" size={24} className={!isAllowModifyChannel ? 'not-allow-pointer' : ''}>
                        <Controller
                            control={control}
                            name="window_name"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={t('web_widget_title')}
                                    placeholder={t('web_widget_title_placeholder')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="window_logo"
                            render={({ field, fieldState: { error } }) => (
                                <FieldUpload
                                    {...field}
                                    error={!!error}
                                    helperText={error?.message}
                                    type="avatar"
                                    onUpload={onUpload}
                                    fileValidation={async (file: File) => {
                                        const { size, name, type } = file;
                                        const extension = name.split('.')[1];
                                        if (
                                            (!extension || supportedImageFileExtensions.indexOf(extension) === -1) &&
                                            supportedImageFileMIME.indexOf(type) === -1
                                        ) {
                                            return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                                        }
                                        if (size > 5 * 1000 * 1000) {
                                            return t('error_image_file_size', { size: '5 MB' });
                                        }
                                        return true;
                                    }}
                                    label={t('web_widget_window_logo_upload')}
                                    description={
                                        <Typography style={{ color: 'var(--color-light-5)' }}>
                                            {t('web_widget_window_logo_upload_subtitle')}
                                            <br />
                                            {t('web_widget_file_upload_tips')}
                                            <br />
                                            {t('web_widget_file_upload_tips2')}
                                        </Typography>
                                    }
                                    defaultIcon={<Icon name="personSharp" style={{ fontSize: 30 }} />}
                                    onChange={(files) => {
                                        field.onChange(files);

                                        if (
                                            files?.some(
                                                (file) =>
                                                    file.status === 'uploading' ||
                                                    file.status === 'deleting' ||
                                                    file.status === 'missingFile',
                                            )
                                        ) {
                                            setError('root.hasProcessingFiles', {
                                                type: 'custom',
                                                message: 'hasProcessingFiles',
                                            });
                                        } else {
                                            clearErrors('root.hasProcessingFiles');
                                        }
                                    }}
                                    accept="image/png, image/jpeg, .svg"
                                />
                            )}
                        />

                        <Controller
                            control={control}
                            name="chatbot_name"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={t('web_widget_bot_name')}
                                    placeholder={t('web_widget_bot_name_placeholder')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="chatbot_avatar"
                            render={({ field, fieldState: { error } }) => (
                                <FieldUpload
                                    {...field}
                                    error={!!error}
                                    helperText={error?.message}
                                    type="avatar"
                                    onUpload={onUpload}
                                    fileValidation={async (file: File) => {
                                        const { size, name, type } = file;
                                        const extension = name.split('.')[1];
                                        if (
                                            (!extension || supportedImageFileExtensions.indexOf(extension) === -1) &&
                                            supportedImageFileMIME.indexOf(type) === -1
                                        ) {
                                            return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                                        }
                                        if (size > 5 * 1000 * 1000) {
                                            return t('error_image_file_size', { size: '5 MB' });
                                        }
                                        return true;
                                    }}
                                    label={t('web_widget_file_upload')}
                                    description={
                                        <Typography style={{ color: 'var(--color-light-5)' }}>
                                            {t('web_widget_file_upload_subtitle')}
                                            <br />
                                            {t('web_widget_file_upload_tips')}
                                            <br />
                                            {t('web_widget_file_upload_tips2')}
                                        </Typography>
                                    }
                                    defaultIcon={<Icon name="personSharp" style={{ fontSize: 30 }} />}
                                    onChange={(files) => {
                                        field.onChange(files);

                                        if (
                                            files?.some(
                                                (file) =>
                                                    file.status === 'uploading' ||
                                                    file.status === 'deleting' ||
                                                    file.status === 'missingFile',
                                            )
                                        ) {
                                            setError('root.hasProcessingFiles', {
                                                type: 'custom',
                                                message: 'hasProcessingFiles',
                                            });
                                        } else {
                                            clearErrors('root.hasProcessingFiles');
                                        }
                                    }}
                                    accept="image/png, image/jpeg, .svg"
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="welcome_message"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={t('web_widget_welcome_message')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />

                        <Space size={10} style={{ width: '100%' }} align="start">
                            <ColorPicker<WebWidgetFormType>
                                name={'primary_color'}
                                control={control}
                                label={t('web_widget_primary_color')}
                                placeholder={t('web_widget_primary_color_placeholder')}
                            />

                            <ColorPicker<WebWidgetFormType>
                                name={'secondary_color'}
                                control={control}
                                label={t('web_widget_secondary_color')}
                                placeholder={t('web_widget_secondary_color_placeholder')}
                            />
                        </Space>
                        <Space size={10} style={{ width: '100%' }} align="start">
                            <ColorPicker<WebWidgetFormType>
                                name={'header_color'}
                                control={control}
                                label={t('web_widget_header_color')}
                                placeholder={t('web_widget_header_color_placeholder')}
                            />
                            <ColorPicker<WebWidgetFormType>
                                name={'background_color'}
                                control={control}
                                label={t('web_widget_background_color')}
                                placeholder={t('web_widget_background_color_placeholder')}
                            />
                        </Space>
                        <Space size={10} style={{ width: '100%' }} align="start">
                            <Controller
                                control={control}
                                name="font_size"
                                render={({ field, fieldState: { error } }) => (
                                    <FieldText
                                        {...field}
                                        fullWidth
                                        label={`${t('web_widget_font_size')} ( px )`}
                                        placeholder={t('web_widget_background_color_placeholder')}
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                        </Space>
                    </Space>
                    <div className={styles.button}>
                        <Button
                            text={t('web_widget_next')}
                            onClick={goToStepHandler}
                            disabled={!isStepValid(activeStep, watch())}
                            sx={{ width: '160px' }}
                        />
                    </div>
                </>
            );
        }
        if (activeStep === 1) {
            return (
                <>
                    <Space
                        key="step2"
                        direction="vertical"
                        size={24}
                        align="stretch"
                        className={!isAllowModifyChannel ? 'not-allow-pointer' : ''}
                    >
                        <Controller
                            control={control}
                            name="subject_title"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    description={t('web_widget_fallback_email_subject_desc')}
                                    label={`${t('web_widget_fallback_email_subject')}*`}
                                    placeholder={t('email_template_subject_title_placeholder')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="profile_name"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={`${t('web_widget_fallback_email_profile_name')}*`}
                                    placeholder={t('web_widget_title_placeholder')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="email"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={`${t('web_widget_fallback_email')}*`}
                                    description={t('web_widget_fallback_email_desc')}
                                    placeholder={'no-reply@company.com'}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Space size={10} align="start">
                            <Controller
                                control={control}
                                name="action_button_text"
                                render={({ field, fieldState: { error } }) => (
                                    <FieldText
                                        {...field}
                                        fullWidth
                                        label={t('web_widget_action_button')}
                                        error={!!error}
                                        helperText={error?.message}
                                    />
                                )}
                            />
                            <Controller
                                control={control}
                                name="button_url"
                                render={({ field, fieldState: { error } }) => (
                                    <FieldText
                                        {...field}
                                        fullWidth
                                        label={t('web_widget_button_url')}
                                        error={!!error}
                                        helperText={error?.message}
                                        placeholder="http://"
                                    />
                                )}
                            />
                        </Space>

                        <Typography
                            style={{
                                color: 'var(--color-light-5)',
                            }}
                        >
                            {t('web_widget_action_button_tips')}
                        </Typography>

                        <Controller
                            control={control}
                            name="e_signature_logo"
                            render={({ field, fieldState: { error } }) => (
                                <FieldUpload
                                    {...field}
                                    error={!!error}
                                    helperText={error?.message}
                                    type="avatar"
                                    onUpload={onUpload}
                                    fileValidation={async (file: File) => {
                                        const { size, name, type } = file;
                                        const extension = name.split('.')[1];
                                        if (
                                            (!extension || supportedImageFileExtensions.indexOf(extension) === -1) &&
                                            supportedImageFileMIME.indexOf(type) === -1
                                        ) {
                                            return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                                        }
                                        if (size > 5 * 1000 * 1000) {
                                            return t('error_image_file_size', { size: '5 MB' });
                                        }
                                        return true;
                                    }}
                                    label={t('email_template_upload_company_logo')}
                                    description={
                                        <Typography style={{ color: 'var(--color-light-5)' }}>
                                            {t('web_widget_file_upload_tips')}
                                            <br />
                                            {t('web_widget_file_upload_tips2')}
                                        </Typography>
                                    }
                                    defaultIcon={<Icon name="personSharp" style={{ fontSize: 30 }} />}
                                    onChange={(files) => {
                                        field.onChange(files);

                                        if (
                                            files?.some(
                                                (file) =>
                                                    file.status === 'uploading' ||
                                                    file.status === 'deleting' ||
                                                    file.status === 'missingFile',
                                            )
                                        ) {
                                            setError('root.hasProcessingFiles', {
                                                type: 'custom',
                                                message: 'hasProcessingFiles',
                                            });
                                        } else {
                                            clearErrors('root.hasProcessingFiles');
                                        }
                                    }}
                                    accept="image/png, image/jpeg, .svg"
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="e_signature_name"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={t('email_template_esignature_team_name')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="e_signature_information"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={t('email_template_esignature_contact_info')}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="show_powered_by"
                            render={({ field, fieldState: { error } }) => (
                                <FieldSwitch
                                    {...field}
                                    switchLabel={() => <Typography variant="BodyBold">{t('email_template_display_powered_by')}</Typography>}
                                    error={!!error}
                                    helperText={error?.message}
                                    onChange={async (checked) => {
                                        field.onChange(checked);
                                    }}
                                    labelPlacement="start"
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="legal_disclaimer"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    label={t('email_template_legal_disclaimer')}
                                    error={!!error}
                                    helperText={error?.message}
                                    multiline
                                    rows={7}
                                />
                            )}
                        />
                    </Space>
                    <div className={styles.button}>
                        <Button variant={'outlined'} text={t('web_widget_back')} onClick={onBack} sx={{ width: '160px' }} />
                        <Button
                            text={t('web_widget_next')}
                            onClick={goToStepHandler}
                            loading={editing}
                            disabled={!isStepValid(activeStep, watch())}
                            sx={{ width: '160px' }}
                        />
                    </div>
                </>
            );
        }
        if (activeStep === 2 && currentChannel) {
            return (
                <div className={styles.infoContainer}>
                    <Space size={8} direction="vertical" align="start" style={{ width: '100%' }}>
                        <Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }}>
                            {t('web_widget_method1')}
                        </Typography>
                        <Space size={12} direction="vertical" align="start" className={styles.description}>
                            <Space direction="vertical" size={4} align="start">
                                <Typography variant={'BodyBold'} style={{ color: 'var(--color-light-7)' }}>
                                    {t('web_widget_code_option1')}
                                </Typography>
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    <Trans i18nKey="web_widget_code_snippet_description_1" values={{ tag: '&lt;/body&gt;' }} shouldUnescape>
                                        Copy and paste the installation code before the <strong>body</strong> on the pages you want this web
                                        widget to appear.
                                    </Trans>
                                </Typography>
                            </Space>
                            <Space direction="vertical" size={4} align="start">
                                <Typography variant={'BodyBold'} style={{ color: 'var(--color-light-7)' }}>
                                    {t('web_widget_code_option2')}
                                </Typography>
                                <Typography style={{ color: 'var(--color-light-5)' }}>
                                    <Trans
                                        i18nKey="web_widget_code_snippet_description_2"
                                        values={{ tag: `&lt;/header&gt; ${t('or')} &lt;/footer&gt;`.toLocaleLowerCase() }}
                                        shouldUnescape
                                    >
                                        Copy and paste the installation code on <strong>header or footer</strong> if you want the web widget
                                        to appear on <strong>all</strong> pages.
                                    </Trans>
                                </Typography>
                            </Space>
                        </Space>
                        <div className={styles.codeSnippet}>
                            <WebWidgetCode channelId={currentChannel.id} />
                        </div>
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                        <Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }}>
                            {t('web_widget_method2')}
                        </Typography>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('web_widget_method2_desc')}</Typography>
                        <div className={styles.codeSnippet} style={{ marginTop: '4px' }}>
                            <WebWidgetURL channelId={currentChannel.id} />
                        </div>
                    </Space>
                    <div className={styles.button}>
                        <Button
                            variant={'outlined'}
                            text={t('web_widget_back')}
                            onClick={() => {
                                if (!currentChannelId) {
                                    navigate(`/channels/${currentChannel.id}/web_widget`, { replace: true });
                                }
                                onBack();
                            }}
                            sx={{ width: '160px' }}
                        />
                        <Button
                            text={t('web_widget_finish')}
                            onClick={() => {
                                const dontAskedAgain = window.localStorage.getItem('dont_asked_save_web_widget_dialog_again');
                                if (!dontAskedAgain || dontAskedAgain === 'false') {
                                    dialog({
                                        title: t('web_widget_done_dialog_title'),
                                        content: t('web_widget_done_dialog_content'),
                                        showDontAskedAgain: true,
                                        confirmText: t('web_widget_done_dialog_save_and_activate'),
                                        cancelText: t('web_widget_done_dialog_save_only'),
                                        onConfirm: async (dontAskAgain?: boolean) => {
                                            if (!currentChannelId) return true;
                                            setLoading(true);
                                            try {
                                                if (dontAskAgain) {
                                                    window.localStorage.setItem('dont_asked_save_web_widget_dialog_again', 'true');
                                                }
                                                await handleSubmit(onSave)();
                                                await activeChannel.mutateAsync(currentChannelId);
                                                if (isModalContent) {
                                                    onCloseModal && onCloseModal('saveAndActive');
                                                    return;
                                                }
                                            } catch (error) {
                                                console.error('update channel active state error: ', error);
                                            }

                                            setLoading(false);
                                            return true;
                                        },
                                        onClose: async (dontAskAgain?: boolean) => {
                                            if (dontAskAgain) {
                                                window.localStorage.setItem('dont_asked_save_web_widget_dialog_again', 'true');
                                            }
                                            setShowPromptDialog(false);
                                            await trigger();
                                            await handleSubmit(onSave)();
                                            if (isModalContent) {
                                                onCloseModal && onCloseModal('saveOnly');
                                                return;
                                            }
                                            navigate('/channels', { replace: true });
                                        },
                                    });
                                } else {
                                    navigate('/channels', { replace: true });
                                }
                            }}
                            sx={{ width: '160px' }}
                            disabled={!isDirty}
                        />
                    </div>
                </div>
            );
        }

        return null;
    };

    useEffect(() => {
        setShowPromptDialog(isDirty);
    }, [isDirty]);

    const onSaveAndExitHandler = useCallback(
        async (tx?: Transition) => {
            return new Promise<boolean | void>(async (resolve) => {
                const formData = getValues();
                const channelData = {
                    ...formData,
                    window_logo: formData.window_logo?.filter((attachment) => attachment.status === 'ok')?.[0]?.url,
                    chatbot_avatar: formData.chatbot_avatar?.filter((attachment) => attachment.status === 'ok')?.[0]?.url,
                    e_signature_logo: formData.e_signature_logo?.filter((attachment) => attachment.status === 'ok')?.[0]?.url,
                };

                const newData = {
                    is_init: false,
                    config: {
                        type: 'web',
                        // required fields
                        ...(channelData.window_name && channelData.window_name !== '' && { window_name: channelData.window_name }),
                        ...(channelData.chatbot_name && channelData.chatbot_name !== '' && { chatbot_name: channelData.chatbot_name }),
                        ...(channelData.welcome_message !== '' && { welcome_message: channelData.welcome_message }),
                        window_logo: channelData.window_logo,
                        chatbot_avatar: channelData.chatbot_avatar,
                        primary_color: `#${channelData.primary_color}`,
                        header_color: `#${channelData.header_color}`,
                        background_color: `#${channelData.background_color}`,
                        font_size: channelData.font_size,
                        secondary_color: `#${channelData.secondary_color}`,
                        email_config: {
                            // required fields
                            ...(channelData.subject_title &&
                                channelData.subject_title !== '' && { subject_title: channelData.subject_title }),
                            ...(channelData.email && channelData.email !== '' && { email: channelData.email }),
                            ...(channelData.profile_name && channelData.profile_name !== '' && { profile_name: channelData.profile_name }),
                            ...(channelData.action_button_text && { action_button_text: channelData.action_button_text }),
                            ...(channelData.button_url && { button_url: channelData.button_url }),
                            e_signature_logo: channelData.e_signature_logo,
                            e_signature_name: channelData.e_signature_name,
                            e_signature_information: channelData.e_signature_information,
                            legal_disclaimer: channelData.legal_disclaimer,
                            show_powered_by: channelData.show_powered_by,
                        },
                    },
                };
                await apiFetch<API.ChannelWebWidget>(putChannelByBuId.api(currentChannelId as string), putChannelByBuId.method, {
                    ...newData,
                });
                resolve(true);
            });
        },
        [currentChannelId, getValues],
    );

    const handlePromptConfirm = () => {
        return Object.keys(errors).length <= 0;
    };

    const promptObj = useMemo(
        () => ({
            title: t('channels_save_and_exit_prompt_title'),
            content: t('channels_save_and_exit_prompt_content'),
            confirmText: t('save_and_exit'),
            cancelText: t('discard'),
            saveExitFn: onSaveAndExitHandler,
            discardFn: () =>
                new Promise<void>((resolve) => {
                    resolve();
                }),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    usePrompt(promptObj, showPromptDialog, handlePromptConfirm);

    if (loading || isLoadingChannel) {
        return <Loading />;
    }

    return (
        <>
            {dialogHolder}
            <div className={styles.pageFrameContainer}>
                <div className={styles.leftPanel}>
                    <PageLayout
                        isModalPageLayout={isModalContent}
                        title={
                            <EllipsisText
                                text={`${t('web_widget_header')} - ${currentChannel?.name}`}
                                element={
                                    <Typography
                                        variant="Inherit"
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            WebkitLineClamp: 2,
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                    />
                                }
                                whiteSpace="pre-wrap"
                            />
                        }
                        onBack={() => {
                            navigate('/channels');
                        }}
                        backBtnText={t('channels_list')}
                        simpleBarRef={containerRef}
                    >
                        <div className={styles.container}>
                            <div className={styles.steps}>
                                <Stepper
                                    canClick={true}
                                    onNext={onNext}
                                    goToStep={goToStep}
                                    activeStep={activeStep}
                                    steps={[
                                        t('channel_web_widget_step_style'),
                                        t('channel_web_widget_step_fallback_email'),
                                        t('channel_web_widget_step_channel_id'),
                                    ]}
                                />
                            </div>
                            <div className={styles.inner}>
                                <div className={styles.renderstep}>
                                    <FormProvider {...methods}>
                                        <form ref={formRef} onSubmit={handleSubmit(onSave)} className={styles.infoContainer}>
                                            {renderStep()}
                                        </form>
                                    </FormProvider>
                                </div>
                            </div>
                        </div>
                    </PageLayout>
                </div>
                <div className={activeStep === 1 ? styles.rightPanelEmailFallback : styles.rightPanel}>
                    {(activeStep === 0 || activeStep === 2) && (
                        <div className={styles.inner}>
                            <div className={styles.preview}>
                                <Typography
                                    style={{
                                        color: 'var(--color-light-5)',
                                    }}
                                >
                                    {t('web_widget_preview')}
                                </Typography>
                                <ChatBox
                                    title={watch('window_name')}
                                    welcomeMessage={watch('welcome_message')}
                                    botName={watch('chatbot_name')}
                                    primaryColor={'#' + watch('primary_color')}
                                    headerColor={'#' + watch('header_color')}
                                    backgroundColor={'#' + watch('background_color')}
                                    fontSize={watch('font_size')}
                                    secondaryColor={'#' + watch('secondary_color')}
                                    windowLogo={watch('window_logo')?.[0]?.url}
                                    chatbotAvatar={watch('chatbot_avatar')?.[0]?.url}
                                />
                            </div>
                        </div>
                    )}
                    {activeStep === 1 && (
                        <EmailFallbackTemplate
                            displayCtaBtn={true}
                            fallbackEmail={watch('email')}
                            subjectTitle={watch('subject_title')}
                            profileDisplayName={watch('profile_name')}
                            ctaBtnText={t('web_widget_email_fallback_btn_text')}
                            displayPoweredBy={watch('show_powered_by')}
                            legalDisclaimer={watch('legal_disclaimer')}
                            eSignaturePic={watch('e_signature_logo')?.[0]?.url}
                            eSignatureTeamName={watch('e_signature_name')}
                            eSignatureContactInfo={watch('e_signature_information')}
                            action_button_text={watch('action_button_text')}
                        />
                    )}
                </div>
            </div>
        </>
    );
};

export default WebWidget;
