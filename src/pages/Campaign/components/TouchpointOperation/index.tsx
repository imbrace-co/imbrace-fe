import { zodResolver } from '@hookform/resolvers/zod';
import { Button, EllipsisText, Space, Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { isAfter, startOfDay } from 'date-fns';
import type { TFunction } from 'i18next';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { useNavigate, useParams } from 'react-router-dom';
import SimpleBar from 'simplebar-react';
import { getCookie } from 'typescript-cookie';
import { z } from 'zod';

import { dialog } from '@/components/Dialog';
import PageLayout from '@/components/PageLayout';
import { env } from '@/env';
import usePrompt from '@/hooks/usePrompt';
import type { TouchpointFormRef } from '@/pages/Campaign/components/TouchpointForm';
import TouchpointForm from '@/pages/Campaign/components/TouchpointForm';
import {
    getTouchpointById,
    getTouchpointList,
    postTouchpoint,
    postValidateTouchpointInitial,
    putTouchpointById,
} from '@/services/api/campaign';
import { postBoardUpload } from '@/services/api/crm';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { getCampaignQrcodeUrl } from '@/services/baseURL';
import { addLeadingZero } from '@/utils/NumberHelper';
import {
    AttachmentSchema,
    MaxLengthStringSchema,
    RequiredAndMaxLengthStringSchema,
    SpaceCheckStringSchema,
    URLStringSchema,
} from '@/utils/schema';

import type { IsMissingType } from '../RightQRcode';
import RightQRcode from '../RightQRcode';
import styles from './index.module.scss';

export const channelsTypes: ('web' | 'line' | 'wechat' | 'whatsapp' | 'facebook')[] = ['web', 'line', 'wechat', 'whatsapp', 'facebook'];

const TouchpointPostSchema = (t: TFunction) =>
    z
        .object({
            name: RequiredAndMaxLengthStringSchema(t, 150),
            description: MaxLengthStringSchema(t, 500),
            initial_phrase: SpaceCheckStringSchema(t),
            logo: AttachmentSchema.optional().superRefine((val, ctx) => {
                if (val?.some((attachment) => attachment.error)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: val.filter((attachment) => attachment.error)[0].error,
                        fatal: true,
                    });
                    return z.NEVER;
                }
            }),
            channel_id: z.string().optional(),
            url: URLStringSchema(t).optional(),
            destination_url: z.string().optional(),
            paid_keywords: z.string().optional(),
            source: z.string().optional(),
            start_datetime: z.date().nullable().optional(),
            end_datetime: z.date().nullable().optional(),
            media_name: z.string().optional(),
            execute_workflow_id: z.string().optional(),
            campaign_id: z.string().optional(),
            is_paused: z.boolean().optional(),
            is_archived: z.boolean().optional(),
            destination_type: z.enum(['selectChannel', 'selectUrl']).optional(),
            utm_tracking: z.boolean().optional(),
        })
        .superRefine((val, ctx) => {
            if (val.destination_type === 'selectUrl' && !val.url) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                    path: ['url'],
                });
                return z.NEVER;
            }
            if (!val.channel_id && !val.url) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_channel_id_required'),
                    fatal: true,
                    path: ['channel_id'],
                });
                return z.NEVER;
            }
            if (val.utm_tracking) {
                if (!val.media_name?.trim()) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                        path: ['media_name'],
                    });
                }
                if (!val.source?.trim()) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('validation_field_required'),
                        fatal: true,
                        path: ['source'],
                    });
                }
                if (!val.media_name?.trim() || !val.source?.trim()) {
                    return z.NEVER;
                }
            }
        });

type TouchpointPostType = z.infer<ReturnType<typeof TouchpointPostSchema>>;

export const TouchpointOperationModal = ({
    touchpointId,
    onAfterCreate,
}: {
    touchpointId: string;
    onAfterCreate?: (touchpoint: API.Touchpoint) => void;
}) => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { state } = useLocation();
    const { campaignId } = (state as { campaignId?: string }) ?? {};
    const TouchpointFormRef = useRef<TouchpointFormRef>(null);
    const navigate = useNavigate();

    const [selectedQRCodeLogo, setSelectedQRCodeLogo] = useState<File | undefined | string>();
    const [isMissing, setIsMissing] = useState<IsMissingType>(null);
    const [showPromptDialog, setShowPromptDialog] = useState(false);

    const methods = useForm<TouchpointPostType>({
        mode: 'all',
        defaultValues: {
            name: '',
            initial_phrase: '',
            execute_workflow_id: '',
            description: '',
            paid_keywords: '',
            source: '',
            start_datetime: new Date(),
            end_datetime: null,
            campaign_id: campaignId,
            utm_tracking: false,
        },
        resolver: zodResolver(TouchpointPostSchema(t)),
    });

    const {
        handleSubmit,
        formState: { isDirty, errors, isValid },
        setValue,
        getValues,
        setError,
        reset,
        watch,
        trigger,
    } = methods;

    const renderDeletedTouchpointDialog = useCallback(() => {
        dialog({
            title: t('campaign_deleted_touchpoint_dialog_title'),
            content: t('campaign_deleted_touchpoint_dialog_content'),
            onConfirm: () => {
                navigate('/campaign/list/all');
            },
            onClose: () => {
                TouchpointFormRef.current?.setSelectChannelData(undefined);
                TouchpointFormRef.current?.setMenuType('');
                reset({
                    name: '',
                    execute_workflow_id: '',
                    description: '',
                    initial_phrase: '',
                    paid_keywords: '',
                    utm_tracking: false,
                    source: '',
                    start_datetime: new Date(),
                    end_datetime: null,
                    channel_id: '',
                    url: '',
                    destination_url: '',
                });

                navigate('/touchpoint/new');
            },
            onBackdropClose: () => {},
            backdropClosable: false,
            confirmText: t('campaign_deleted_touchpoint_dialog_confirm'),
            cancelText: t('campaign_deleted_touchpoint_dialog_cancel'),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reset, t]);

    const fetchTouchpointTotal = useCallback(async () => {
        try {
            let count = 0;
            const response = await apiFetch<API.PaginatedResponse<API.Touchpoint[]>>(getTouchpointList.api({}), getTouchpointList.method);
            if (response.data.data) {
                count = response.data.data.length;
            }
            const newTitle = t('campaign_new_title', { number: addLeadingZero(count + 1).toString() });
            if (watch('name') === '') {
                setValue('name', newTitle);
            }
            return count;
        } catch (error) {
            console.error('error: ', error);
        }
    }, [watch, setValue, t]);

    const fetchTouchpointDataById = useCallback(async () => {
        if (!touchpointId) return;

        try {
            const { data } = await apiFetch<API.Touchpoint>(getTouchpointById.api(touchpointId), getTouchpointById.method);
            return data;
        } catch (err) {
            const error = err as AxiosError;
            console.error('error: ', error);
            if (error.response?.status === 404 && error.response?.statusText === 'Not Found') {
                renderDeletedTouchpointDialog();
            }
        }
    }, [touchpointId, renderDeletedTouchpointDialog]);

    const onCreateTouchpoint = async (postData: API.TouchpointPostType) => {
        try {
            // remove initial_phrase key from payload if it is empty
            if (!postData.initial_phrase || postData.initial_phrase === '') {
                delete postData.initial_phrase;
            }
            const { data } = await apiFetch<API.Touchpoint>(postTouchpoint.api(), postTouchpoint.method, postData);
            return data;
        } catch (error) {
            console.error('fetch pricing schemes error: ', error);
        }
    };

    const onUpdateTouchpoint = async (postData: API.TouchpointPostType) => {
        if (!touchpointId) return;

        try {
            // remove initial_phrase key from payload if it is empty
            if (!postData.initial_phrase || postData.initial_phrase === '') {
                delete postData.initial_phrase;
            }
            const { data } = await apiFetch<API.Touchpoint>(putTouchpointById.api(touchpointId), putTouchpointById.method, postData);
            if (data.deleted_at) {
                renderDeletedTouchpointDialog();
                return;
            }
            return data;
        } catch (error) {
            console.error('fetch pricing schemes error: ', error);
        }
    };

    const touchpointQuery = useQuery({
        queryFn: fetchTouchpointDataById,
        queryKey: ['touchpoint', { id: touchpointId }],
        enabled: touchpointId !== 'new',
    });

    const { data: touchpointData, isLoading } = touchpointQuery;

    const touchpointMutation = useMutation({
        mutationFn: touchpointId === 'new' ? onCreateTouchpoint : onUpdateTouchpoint,
        onSuccess: (data) => {
            if (!data) return;
            const id = data?.id;
            queryClient.setQueryData(['touchpoint', { id }], data);
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            onAfterCreate?.(data);
        },
    });

    const { isLoading: isLoadingTouchpointTotal } = useQuery({
        queryFn: () => fetchTouchpointTotal(),
        queryKey: ['touchpointTotal'],
        enabled: touchpointId === 'new',
    });

    const validInitial = useCallback(
        async (initialValue: string, selectedChannelId?: string) => {
            const replaceMissingChannel = touchpointData && touchpointData.channel.is_deleted && selectedChannelId;
            // Check if selectedChannelId is falsy and touchpointData channel is not deleted
            if (!replaceMissingChannel) {
                // Check if initialValue is falsy or getValues('channel_id') is falsy
                if (!initialValue || !getValues('channel_id')) {
                    return;
                }
            }

            try {
                const { data } = await apiFetch<{ duplicate: boolean }>(
                    postValidateTouchpointInitial.api(),
                    postValidateTouchpointInitial.method,
                    {
                        channel_id: replaceMissingChannel ? selectedChannelId : getValues('channel_id'),
                        initial_phrase: initialValue,
                    },
                );
                return data.duplicate;
            } catch (error) {
                console.error(error);
            }
        },
        [getValues, touchpointData],
    );

    const onValidationInitial = useCallback(
        async (initialValue: string, selectedChannelId?: string) => {
            if (touchpointData && touchpointData.initial_phrase === initialValue && !touchpointData?.channel.is_deleted) {
                return false;
            }
            const isDuplicate = await validInitial(initialValue, selectedChannelId);
            if (!!isDuplicate) {
                setError(
                    'initial_phrase',
                    {
                        type: 'focus',
                        message: t('campaign_initial_phrase_error'),
                    },
                    { shouldFocus: true },
                );
            }
            return !isDuplicate;
        },
        [setError, t, validInitial, touchpointData],
    );

    useEffect(() => {
        const init = () => {
            if (!!touchpointData && Object.keys(touchpointData).length > 0) {
                const { channel, url, destination_url } = touchpointData;
                setTimeout(() => {
                    setSelectedQRCodeLogo(touchpointData.logo);
                    reset({
                        name: touchpointData.name || '',
                        execute_workflow_id: touchpointData?.execute_workflow_id || '',
                        logo: touchpointData.logo
                            ? [
                                  {
                                      id: '1',
                                      url: touchpointData.logo,
                                      status: 'ok',
                                  },
                              ]
                            : undefined,
                        media_name: touchpointData.media_name,
                        description: touchpointData.description || '',
                        paid_keywords: touchpointData.paid_keywords.join(','),
                        utm_tracking: touchpointData.utm_tracking,
                        source: touchpointData.source || '',
                        initial_phrase: touchpointData.initial_phrase || '',
                        start_datetime: touchpointData.start_datetime ? new Date(touchpointData.start_datetime) : new Date(),
                        end_datetime: touchpointData.end_datetime ? new Date(touchpointData.end_datetime) : null,
                        channel_id: channel && !channel.is_deleted ? channel.id : '',
                        url: url || '',
                        destination_url: destination_url || '',
                        destination_type: url ? 'selectUrl' : 'selectChannel',
                    });
                    // Async resolver doesn't recompute isValid on reset; trigger it so the
                    // Update button enables for valid touchpoints (e.g. URL type with no isMissing).
                    trigger();

                    if (channel) {
                        TouchpointFormRef.current?.setSelectChannelData(channel);
                        setIsMissing(null);

                        // over duration check
                        if (touchpointData.end_datetime && touchpointData.start_datetime) {
                            const today = new Date();
                            const overDuration = isAfter(today, startOfDay(new Date(touchpointData.end_datetime)));
                            if (overDuration) {
                                setError('start_datetime', {
                                    type: 'focus',
                                    message: t('campaign_over_duration_error'),
                                });
                                setError(
                                    'end_datetime',
                                    {
                                        type: 'focus',
                                    },
                                    { shouldFocus: true },
                                );
                                setIsMissing('overDuration');
                            }
                        }

                        // missing channel
                        if (channel.is_deleted) {
                            TouchpointFormRef.current?.setSelectChannelData(undefined);
                            setIsMissing('channel');
                            setError(
                                'channel_id',
                                {
                                    type: 'focus',
                                    message: t('campaign_missing_channel_error'),
                                },
                                { shouldFocus: true },
                            );
                            return;
                        } else {
                            TouchpointFormRef.current?.setSelectChannelData(channel);
                        }

                        // missing workflow
                        if (!touchpointData?.execute_workflow_id) {
                            setIsMissing('workflow');
                            setValue('execute_workflow_id', channel?.workflow_id || '');
                        }
                    }
                });
            }
        };
        init();
    }, [touchpointData, reset, setError, t, setValue, trigger]);

    const onSave = useCallback(
        async (formData: TouchpointPostType) => {
            if (!touchpointId) return;
            setShowPromptDialog(false);

            try {
                const {
                    name,
                    initial_phrase,
                    channel_id,
                    description,
                    paid_keywords,
                    source,
                    utm_tracking,
                    media_name,
                    start_datetime,
                    end_datetime,
                    execute_workflow_id,
                    url,
                    destination_url,
                    logo,
                } = formData;
                let updatedQRCodeLogoUrl;
                const logoFiles = logo?.filter((attachment) => attachment.status === 'ok' && attachment.file);
                if (logoFiles && logoFiles.length > 0 && logoFiles[0].file) {
                    const QRCodeLogoFormData = new FormData();
                    QRCodeLogoFormData.append('', logoFiles[0].file);
                    const { data } = await apiFetch<{ url: string }[]>(
                        postBoardUpload.api,
                        postBoardUpload.method,
                        QRCodeLogoFormData,
                        ImbraceFileUpload,
                    );
                    updatedQRCodeLogoUrl = data?.[0]?.url || '';
                } else {
                    updatedQRCodeLogoUrl = logo?.[0]?.url || '';
                }

                const postData: API.TouchpointPostType = {
                    name: name,
                    initial_phrase,
                    destination_url: destination_url || null,
                    execute_workflow_id: execute_workflow_id || null,
                    logo: updatedQRCodeLogoUrl,
                    description,
                    paid_keywords: paid_keywords ? (paid_keywords.includes(',') ? paid_keywords.split(',') : [paid_keywords]) : [],
                    source,
                    utm_tracking,
                    media_name: media_name,
                    start_datetime: start_datetime ? new Date(start_datetime.setHours(0, 0, 0, 0)) : null,
                    end_datetime: end_datetime ? new Date(end_datetime.setHours(23, 59, 59, 59)) : null,
                    campaign_id: campaignId ?? touchpointData?.campaign_id,
                    is_archived: touchpointData?.is_archived ?? false,
                    is_paused: touchpointData?.is_archived ?? false,
                    // for backend to differentiate channel destination or url destination
                    ...(TouchpointFormRef.current?.menuType === 'selectUrl'
                        ? { channel_id: null, url }
                        : {
                              url: null,
                              channel_id,
                          }),
                };
                await touchpointMutation.mutateAsync(postData);
            } catch (error) {
                console.error('error: ', error);
            }
        },
        [campaignId, touchpointData, touchpointId, touchpointMutation],
    );

    const onUpdate = useCallback(
        async (formData: TouchpointPostType) => {
            if (!touchpointId) return;
            setShowPromptDialog(false);

            try {
                if (TouchpointFormRef.current?.selectChannelData || getValues('url')) {
                    const {
                        name,
                        initial_phrase,
                        channel_id,
                        description,
                        paid_keywords,
                        source,
                        utm_tracking,
                        media_name,
                        start_datetime,
                        end_datetime,
                        execute_workflow_id,
                        url,
                        destination_url,
                        logo,
                    } = formData;
                    let updatedQRCodeLogoUrl;
                    const logoFiles = logo?.filter((attachment) => attachment.status === 'ok' && attachment.file);
                    if (logoFiles && logoFiles.length > 0 && logoFiles[0].file) {
                        const QRCodeLogoFormData = new FormData();
                        QRCodeLogoFormData.append('', logoFiles[0].file);
                        const { data } = await apiFetch<{ url: string }[]>(
                            postBoardUpload.api,
                            postBoardUpload.method,
                            QRCodeLogoFormData,
                            ImbraceFileUpload,
                        );
                        updatedQRCodeLogoUrl = data?.[0]?.url || '';
                    } else {
                        updatedQRCodeLogoUrl = logo?.[0]?.url || '';
                    }

                    const postData: API.TouchpointPostType = {
                        name: name,
                        initial_phrase,
                        destination_url: destination_url || null,
                        execute_workflow_id: execute_workflow_id || null,
                        logo: updatedQRCodeLogoUrl ?? touchpointData?.logo,
                        description,
                        paid_keywords: paid_keywords ? (paid_keywords.includes(',') ? paid_keywords.split(',') : [paid_keywords]) : [],
                        source,
                        utm_tracking,
                        media_name: media_name,
                        start_datetime: start_datetime ? new Date(start_datetime.setHours(0, 0, 0, 0)) : null,
                        end_datetime: end_datetime ? new Date(end_datetime.setHours(23, 59, 59, 59)) : null,
                        campaign_id: campaignId ?? touchpointData?.campaign_id,
                        is_archived: touchpointData?.is_archived ?? false,
                        is_paused: touchpointData?.is_archived ?? false,
                        // for backend to differentiate channel destination or url destination
                        ...(TouchpointFormRef.current?.menuType === 'selectUrl'
                            ? { channel_id: null, url }
                            : {
                                  url: null,
                                  channel_id,
                              }),
                    };

                    await touchpointMutation.mutateAsync(postData);
                }
            } catch (error) {
                console.error('error: ', error);
            }
        },
        [campaignId, touchpointData, touchpointId, getValues, touchpointMutation],
    );

    const onGenerate = useCallback(() => {
        if (Object.keys(errors).length > 0) return;
        handleSubmit(onSave)();
    }, [handleSubmit, onSave, errors]);

    const onRevise = useCallback(async () => {
        await handleSubmit(onUpdate)();
    }, [handleSubmit, onUpdate]);

    const handlePromptConfirm = () => {
        return Object.keys(errors).length <= 0;
    };

    const promptObj = useMemo(
        () => ({
            title: t('campaign_touchpoint_prompt_title'),
            content: t('campaign_touchpoint_prompt_content'),
            confirmText: t('campaign_close_modal_confirm'),
            cancelText: t('campaign_close_modal_cancel'),
            saveExitFn: onRevise,
            discardFn: () =>
                new Promise<void>((resolve) => {
                    resolve();
                }),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useEffect(() => {
        setShowPromptDialog(isDirty);
    }, [isDirty]);

    usePrompt(promptObj, showPromptDialog, handlePromptConfirm);

    const disabledCondition = useCallback(() => {
        if (isMissing) {
            return false;
        }
        return !isDirty || !isValid;
    }, [isMissing, isDirty, isValid]);

    const renderButton = () => {
        return (
            <div className={styles.button} style={{ marginTop: '48px' }}>
                <Button
                    text={touchpointId === 'new' ? t('create') : t('update')}
                    onClick={onGenerate}
                    disabled={disabledCondition()}
                    loading={touchpointMutation.isPending}
                />
            </div>
        );
    };

    const getQRCodeUrl = () => {
        if (touchpointData?.wechat_config?.wechat_url_with_initiation_phase) {
            return encodeURI(touchpointData.wechat_config.wechat_url_with_initiation_phase);
        }
        if (touchpointData?.utm_tracking) {
            const baseUrl = touchpointData?.url;
            const customEncode = (str: string) => {
                if (!str) return '';
                return str.replace(/ /g, '+').replace(/,/g, '%2C');
            };

            const utmParams = [
                `utm_source=${customEncode(touchpointData?.source || '')}`,
                `utm_medium=${customEncode(touchpointData?.media_name || '')}`,
                `utm_campaign=${customEncode(touchpointData?.name || '')}`,
                `utm_id=${touchpointData?.id || ''}`,
                `utm_content=${customEncode(touchpointData?.description || '')}`,
            ];

            if (touchpointData?.paid_keywords && touchpointData.paid_keywords.length > 0) {
                utmParams.push(`utm_term=${customEncode(touchpointData.paid_keywords.join(','))}`);
            }
            return `${baseUrl}?${utmParams.filter((param) => !param.endsWith('=')).join('&')}`;
        }
        return encodeURI(
            `${getCampaignQrcodeUrl()}?id=${touchpointData?.id}&orgId=${touchpointData?.organization_id || getCookie('org_id')}&env=${
                env.VITE_APP_ENV
            }&isFromQRcode=true`,
        );
    };

    if (isLoading || touchpointMutation.isPending) {
        return (
            <Space justify="center" align="center" style={{ width: '100%', height: '100%' }}>
                <CircularProgress size={'25px'} />
            </Space>
        );
    }

    return (
        <div className={styles.pageFrameContainer}>
            <div className={styles.leftPanel}>
                <SimpleBar autoHide style={{ height: '100%' }}>
                    <div className={styles.modalContainer}>
                        <Space direction="vertical" size={44} align="stretch" className={styles.inner}>
                            {isLoadingTouchpointTotal ? (
                                <CircularProgress size={'20px'} />
                            ) : (
                                <EllipsisText
                                    text={watch('name')}
                                    element={
                                        <Typography
                                            variant="Heading1"
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
                            )}
                            <FormProvider {...methods}>
                                <form className={styles.infoContainer}>
                                    <TouchpointForm
                                        ref={TouchpointFormRef}
                                        touchpointData={touchpointData}
                                        setIsMissing={setIsMissing}
                                        setSelectedQRCodeLogo={setSelectedQRCodeLogo}
                                        selectedQRCodeLogo={selectedQRCodeLogo}
                                        onValidationInitial={onValidationInitial}
                                    />
                                </form>
                            </FormProvider>
                        </Space>
                        {renderButton()}
                    </div>
                </SimpleBar>
            </div>
            <RightQRcode
                loading={touchpointMutation.isPending}
                isMissing={isMissing}
                isDirty={isDirty}
                isNew={touchpointId === 'new'}
                touchpointData={touchpointData}
                qRCodeUrl={getQRCodeUrl()}
                logo={watch('logo')?.[0]?.url ?? touchpointData?.logo}
            />
        </div>
    );
};

const TouchpointOperation = () => {
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const { touchpointId } = useParams<{ touchpointId?: string }>();
    const { state } = useLocation();
    const { campaignId } = (state as { campaignId?: string }) ?? {};
    const TouchpointFormRef = useRef<TouchpointFormRef>(null);
    const navigate = useNavigate();

    const [selectedQRCodeLogo, setSelectedQRCodeLogo] = useState<File | undefined | string>();
    const [isMissing, setIsMissing] = useState<IsMissingType>(null);
    const [showPromptDialog, setShowPromptDialog] = useState(false);

    const methods = useForm<TouchpointPostType>({
        mode: 'all',
        defaultValues: {
            name: '',
            channel_id: '',
            url: '',
            destination_url: '',
            initial_phrase: '',
            execute_workflow_id: '',
            description: '',
            paid_keywords: '',
            source: '',
            utm_tracking: false,
            start_datetime: new Date(),
            end_datetime: null,
            campaign_id: campaignId,
        },
        resolver: zodResolver(TouchpointPostSchema(t)),
    });

    const {
        handleSubmit,
        formState: { isDirty, errors, isValid },
        setValue,
        getValues,
        setError,
        reset,
        watch,
        trigger,
    } = methods;

    const renderDeletedTouchpointDialog = useCallback(() => {
        dialog({
            title: t('campaign_deleted_touchpoint_dialog_title'),
            content: t('campaign_deleted_touchpoint_dialog_content'),
            onConfirm: () => {
                navigate(`/campaign/list/${campaignId ?? touchpointData?.campaign_id ?? 'all'}`);
            },
            onClose: () => {
                TouchpointFormRef.current?.setSelectChannelData(undefined);
                TouchpointFormRef.current?.setMenuType('');
                reset({
                    name: '',
                    execute_workflow_id: '',
                    description: '',
                    paid_keywords: '',
                    source: '',
                    utm_tracking: false,
                    initial_phrase: '',
                    start_datetime: new Date(),
                    end_datetime: null,
                    channel_id: '',
                    url: '',
                    destination_url: '',
                });

                navigate('/touchpoint/new');
            },
            onBackdropClose: () => {},
            backdropClosable: false,
            confirmText: t('campaign_deleted_touchpoint_dialog_confirm'),
            cancelText: t('campaign_deleted_touchpoint_dialog_cancel'),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reset, t]);

    const fetchTouchpointTotal = useCallback(async () => {
        try {
            let count = 0;
            const response = await apiFetch<API.PaginatedResponse<API.Touchpoint[]>>(getTouchpointList.api({}), getTouchpointList.method);
            if (response.data.data) {
                count = response.data.data.length;
            }
            const newTitle = t('campaign_new_title', { number: addLeadingZero(count + 1).toString() });
            if (watch('name') === '') {
                setValue('name', newTitle);
            }
            return count;
        } catch (error) {
            console.error('error: ', error);
        }
    }, [watch, setValue, t]);

    const fetchTouchpointDataById = useCallback(async () => {
        if (!touchpointId) return;

        try {
            const { data } = await apiFetch<API.Touchpoint>(getTouchpointById.api(touchpointId), getTouchpointById.method);
            return data;
        } catch (err) {
            const error = err as AxiosError;
            console.error('error: ', error);
            if (error.response?.status === 404 && error.response?.statusText === 'Not Found') {
                renderDeletedTouchpointDialog();
            }
        }
    }, [touchpointId, renderDeletedTouchpointDialog]);

    const onCreateTouchpoint = async (postData: API.TouchpointPostType) => {
        try {
            // remove initial_phrase key from payload if it is empty
            if (!postData.initial_phrase || postData.initial_phrase === '') {
                delete postData.initial_phrase;
            }
            const { data } = await apiFetch<API.Touchpoint>(postTouchpoint.api(), postTouchpoint.method, postData);
            return data;
        } catch (error) {
            console.error('fetch pricing schemes error: ', error);
        }
    };

    const onUpdateTouchpoint = async (postData: API.TouchpointPostType) => {
        if (!touchpointId) return;

        try {
            // remove initial_phrase key from payload if it is empty
            if (!postData.initial_phrase || postData.initial_phrase === '') {
                delete postData.initial_phrase;
            }
            const { data } = await apiFetch<API.Touchpoint>(putTouchpointById.api(touchpointId), putTouchpointById.method, postData);
            if (data.deleted_at) {
                renderDeletedTouchpointDialog();
                return;
            }
            return data;
        } catch (error) {
            console.error('fetch pricing schemes error: ', error);
        }
    };

    const touchpointQuery = useQuery({
        queryFn: fetchTouchpointDataById,
        queryKey: ['touchpoint', { id: touchpointId }],
        enabled: touchpointId !== 'new',
    });

    const { data: touchpointData, isLoading } = touchpointQuery;

    const touchpointMutation = useMutation({
        mutationFn: touchpointId === 'new' ? onCreateTouchpoint : onUpdateTouchpoint,
        onSuccess: (data) => {
            if (!data) return;
            const id = data?.id;
            queryClient.setQueryData(['touchpoint', { id }], data);
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });

            navigate(`/touchpoint/${id}`, {
                replace: true,
            });
        },
    });

    const { isLoading: isLoadingTouchpointTotal } = useQuery({
        queryFn: () => fetchTouchpointTotal(),
        queryKey: ['touchpointTotal'],
        enabled: touchpointId === 'new',
    });

    const validInitial = useCallback(
        async (initialValue: string, selectedChannelId?: string) => {
            const replaceMissingChannel = touchpointData && touchpointData.channel.is_deleted && selectedChannelId;
            // Check if selectedChannelId is falsy and touchpointData channel is not deleted
            if (!replaceMissingChannel) {
                // Check if initialValue is falsy or getValues('channel_id') is falsy
                if (!initialValue || !getValues('channel_id')) {
                    return;
                }
            }

            try {
                const { data } = await apiFetch<{ duplicate: boolean }>(
                    postValidateTouchpointInitial.api(),
                    postValidateTouchpointInitial.method,
                    {
                        channel_id: replaceMissingChannel ? selectedChannelId : getValues('channel_id'),
                        initial_phrase: initialValue,
                    },
                );
                return data.duplicate;
            } catch (error) {
                console.error(error);
            }
        },
        [getValues, touchpointData],
    );

    const onValidationInitial = useCallback(
        async (initialValue: string, selectedChannelId?: string) => {
            if (touchpointData && touchpointData.initial_phrase === initialValue && !touchpointData?.channel.is_deleted) {
                return false;
            }
            const isDuplicate = await validInitial(initialValue, selectedChannelId);
            if (!!isDuplicate) {
                setError(
                    'initial_phrase',
                    {
                        type: 'focus',
                        message: t('campaign_initial_phrase_error'),
                    },
                    { shouldFocus: true },
                );
            }
            return !isDuplicate;
        },
        [setError, t, validInitial, touchpointData],
    );

    useEffect(() => {
        const init = () => {
            if (!!touchpointData && Object.keys(touchpointData).length > 0) {
                const { channel, url, destination_url } = touchpointData;
                setTimeout(() => {
                    setSelectedQRCodeLogo(touchpointData.logo);
                    reset({
                        name: touchpointData.name || '',
                        execute_workflow_id: touchpointData?.execute_workflow_id || '',
                        logo: touchpointData.logo
                            ? [
                                  {
                                      id: '1',
                                      url: touchpointData.logo,
                                      status: 'ok',
                                  },
                              ]
                            : undefined,
                        media_name: touchpointData.media_name,
                        description: touchpointData.description || '',
                        paid_keywords: touchpointData.paid_keywords.join(','),
                        source: touchpointData.source || '',
                        utm_tracking: touchpointData.utm_tracking,
                        initial_phrase: touchpointData.initial_phrase || '',
                        start_datetime: touchpointData.start_datetime ? new Date(touchpointData.start_datetime) : new Date(),
                        end_datetime: touchpointData.end_datetime ? new Date(touchpointData.end_datetime) : null,
                        channel_id: channel && !channel.is_deleted ? channel.id : '',
                        url: url || '',
                        destination_url: destination_url || '',
                        destination_type: url ? 'selectUrl' : 'selectChannel',
                    });
                    // Async resolver doesn't recompute isValid on reset; trigger it so the
                    // Update button enables for valid touchpoints (e.g. URL type with no isMissing).
                    trigger();

                    if (channel) {
                        TouchpointFormRef.current?.setSelectChannelData(channel);
                        setIsMissing(null);

                        // over duration check
                        if (touchpointData.end_datetime && touchpointData.start_datetime) {
                            const today = new Date();
                            const overDuration = isAfter(today, startOfDay(new Date(touchpointData.end_datetime)));
                            if (overDuration) {
                                setError('start_datetime', {
                                    type: 'focus',
                                    message: t('campaign_over_duration_error'),
                                });
                                setError(
                                    'end_datetime',
                                    {
                                        type: 'focus',
                                    },
                                    { shouldFocus: true },
                                );
                                setIsMissing('overDuration');
                            }
                        }

                        // missing channel
                        if (channel.is_deleted) {
                            TouchpointFormRef.current?.setSelectChannelData(undefined);
                            setIsMissing('channel');
                            setError(
                                'channel_id',
                                {
                                    type: 'focus',
                                    message: t('campaign_missing_channel_error'),
                                },
                                { shouldFocus: true },
                            );
                            return;
                        } else {
                            TouchpointFormRef.current?.setSelectChannelData(channel);
                        }

                        // missing workflow
                        if (!touchpointData?.execute_workflow_id) {
                            setIsMissing('workflow');
                            setValue('execute_workflow_id', channel?.workflow_id || '');
                        }
                    }
                });
            }
        };
        init();
    }, [touchpointData, reset, setError, t, setValue, trigger]);

    const onSave = useCallback(
        async (formData: TouchpointPostType) => {
            if (!touchpointId) return;
            setShowPromptDialog(false);

            try {
                const {
                    name,
                    initial_phrase,
                    channel_id,
                    description,
                    paid_keywords,
                    source,
                    utm_tracking,
                    media_name,
                    start_datetime,
                    end_datetime,
                    execute_workflow_id,
                    url,
                    destination_url,
                    logo,
                } = formData;

                let updatedQRCodeLogoUrl;
                const logoFiles = logo?.filter((attachment) => attachment.status === 'ok' && attachment.file);
                if (logoFiles && logoFiles.length > 0 && logoFiles[0].file) {
                    const QRCodeLogoFormData = new FormData();
                    QRCodeLogoFormData.append('', logoFiles[0].file);
                    const { data } = await apiFetch<{ url: string }[]>(
                        postBoardUpload.api,
                        postBoardUpload.method,
                        QRCodeLogoFormData,
                        ImbraceFileUpload,
                    );
                    updatedQRCodeLogoUrl = data?.[0]?.url || '';
                } else {
                    updatedQRCodeLogoUrl = logo?.[0]?.url || '';
                }

                const postData: API.TouchpointPostType = {
                    name: name,
                    initial_phrase,
                    destination_url: destination_url || null,
                    execute_workflow_id: execute_workflow_id || null,
                    logo: updatedQRCodeLogoUrl,
                    description,
                    media_name: media_name,
                    paid_keywords: paid_keywords ? (paid_keywords.includes(',') ? paid_keywords.split(',') : [paid_keywords]) : [],
                    source,
                    utm_tracking,
                    start_datetime: start_datetime ? new Date(start_datetime.setHours(0, 0, 0, 0)) : null,
                    end_datetime: end_datetime ? new Date(end_datetime.setHours(23, 59, 59, 59)) : null,
                    campaign_id: campaignId ?? touchpointData?.campaign_id,
                    is_archived: touchpointData?.is_archived ?? false,
                    is_paused: touchpointData?.is_archived ?? false,
                    // for backend to differentiate channel destination or url destination
                    ...(TouchpointFormRef.current?.menuType === 'selectUrl'
                        ? { channel_id: null, url }
                        : {
                              url: null,
                              channel_id,
                          }),
                };
                touchpointMutation.mutate(postData);
            } catch (error) {
                console.error('error: ', error);
            }
        },
        [campaignId, touchpointData, touchpointId, touchpointMutation],
    );

    const onUpdate = useCallback(
        async (formData: TouchpointPostType) => {
            if (!touchpointId) return;
            setShowPromptDialog(false);

            try {
                if (TouchpointFormRef.current?.selectChannelData || getValues('url')) {
                    const {
                        name,
                        initial_phrase,
                        channel_id,
                        description,
                        paid_keywords,
                        source,
                        utm_tracking,
                        media_name,
                        start_datetime,
                        end_datetime,
                        execute_workflow_id,
                        url,
                        destination_url,
                        logo,
                    } = formData;
                    let updatedQRCodeLogoUrl;
                    const logoFiles = logo?.filter((attachment) => attachment.status === 'ok' && attachment.file);
                    if (logoFiles && logoFiles.length > 0 && logoFiles[0].file) {
                        const QRCodeLogoFormData = new FormData();
                        QRCodeLogoFormData.append('', logoFiles[0].file);
                        const { data } = await apiFetch<{ url: string }[]>(
                            postBoardUpload.api,
                            postBoardUpload.method,
                            QRCodeLogoFormData,
                            ImbraceFileUpload,
                        );
                        updatedQRCodeLogoUrl = data?.[0]?.url || '';
                    } else {
                        updatedQRCodeLogoUrl = logo?.[0]?.url || '';
                    }

                    const postData: API.TouchpointPostType = {
                        name: name,
                        initial_phrase,
                        destination_url: destination_url || null,
                        execute_workflow_id: execute_workflow_id || null,
                        logo: updatedQRCodeLogoUrl ?? touchpointData?.logo,
                        description,
                        paid_keywords: paid_keywords ? (paid_keywords.includes(',') ? paid_keywords.split(',') : [paid_keywords]) : [],
                        source,
                        utm_tracking,
                        media_name: media_name,
                        start_datetime: start_datetime ? new Date(start_datetime.setHours(0, 0, 0, 0)) : null,
                        end_datetime: end_datetime ? new Date(end_datetime.setHours(23, 59, 59, 59)) : null,
                        campaign_id: campaignId ?? touchpointData?.campaign_id,
                        is_archived: touchpointData?.is_archived ?? false,
                        is_paused: touchpointData?.is_archived ?? false,
                        // for backend to differentiate channel destination or url destination
                        ...(TouchpointFormRef.current?.menuType === 'selectUrl'
                            ? { channel_id: null, url }
                            : {
                                  url: null,
                                  channel_id,
                              }),
                    };

                    touchpointMutation.mutate(postData);
                }
            } catch (error) {
                console.error('error: ', error);
            }
        },
        [campaignId, touchpointData, touchpointId, getValues, touchpointMutation],
    );

    const onGenerate = useCallback(() => {
        if (Object.keys(errors).length > 0) return;
        handleSubmit(onSave)();
    }, [handleSubmit, onSave, errors]);

    const onRevise = useCallback(async () => {
        await handleSubmit(onUpdate)();
    }, [handleSubmit, onUpdate]);

    const handlePromptConfirm = () => {
        return Object.keys(errors).length <= 0;
    };

    const promptObj = useMemo(
        () => ({
            title: t('campaign_touchpoint_prompt_title'),
            content: t('campaign_touchpoint_prompt_content'),
            confirmText: t('campaign_close_modal_confirm'),
            cancelText: t('campaign_close_modal_cancel'),
            saveExitFn: onRevise,
            discardFn: () =>
                new Promise<void>((resolve) => {
                    resolve();
                }),
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useEffect(() => {
        setShowPromptDialog(isDirty);
    }, [isDirty]);

    usePrompt(promptObj, showPromptDialog, handlePromptConfirm);

    const disabledCondition = useCallback(() => {
        if (isMissing) {
            return false;
        }
        return !isDirty || !isValid;
    }, [isMissing, isDirty, isValid]);

    const renderButton = () => {
        return (
            <div className={styles.button}>
                <Button
                    text={touchpointId === 'new' ? t('campaign_next') : t('campaign_update')}
                    onClick={onGenerate}
                    disabled={disabledCondition()}
                    loading={touchpointMutation.isPending}
                    size="s"
                />
            </div>
        );
    };

    if (isLoading || touchpointMutation.isPending) {
        return (
            <Space justify="center" align="center" style={{ width: '100%', height: '100%' }}>
                <CircularProgress size={'25px'} />
            </Space>
        );
    }

    const getQRCodeUrl = () => {
        if (touchpointData?.wechat_config?.wechat_url_with_initiation_phase) {
            return encodeURI(touchpointData.wechat_config.wechat_url_with_initiation_phase);
        }
        if (touchpointData?.utm_tracking) {
            const baseUrl = touchpointData?.url;
            const customEncode = (str: string) => {
                if (!str) return '';
                return str.replace(/ /g, '+').replace(/,/g, '%2C');
            };

            const utmParams = [
                `utm_source=${customEncode(touchpointData?.source || '')}`,
                `utm_medium=${customEncode(touchpointData?.media_name || '')}`,
                `utm_campaign=${customEncode(touchpointData?.name || '')}`,
                `utm_id=${touchpointData?.id || ''}`,
                `utm_content=${customEncode(touchpointData?.description || '')}`,
            ];

            if (touchpointData?.paid_keywords && touchpointData.paid_keywords.length > 0) {
                utmParams.push(`utm_term=${customEncode(touchpointData.paid_keywords.join(','))}`);
            }
            return `${baseUrl}?${utmParams.filter((param) => !param.endsWith('=')).join('&')}`;
        }
        return encodeURI(
            `${getCampaignQrcodeUrl()}?id=${touchpointData?.id}&orgId=${touchpointData?.organization_id || getCookie('org_id')}&env=${
                env.VITE_APP_ENV
            }&isFromQRcode=true`,
        );
    };

    return (
        <div className={styles.pageFrameContainer}>
            <div className={styles.leftPanel}>
                <PageLayout
                    title={
                        <>
                            {isLoadingTouchpointTotal ? (
                                <CircularProgress size={'20px'} />
                            ) : (
                                <EllipsisText
                                    text={watch('name')}
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
                            )}
                        </>
                    }
                    onBack={() => navigate(`/campaign/list/${campaignId ?? touchpointData?.campaign_id ?? 'all'}`)}
                    backBtnText={t('campaign_back')}
                    rightSideComponent={renderButton()}
                    containerStyle={{
                        marginBottom: '4px',
                        alignItems: 'flex-end',
                        maxWidth: '530px',
                        borderBottom: '1px solid var(--color-light-3)',
                        paddingBottom: '12px',
                    }}
                >
                    <div className={styles.inner}>
                        <FormProvider {...methods}>
                            <form className={styles.infoContainer}>
                                <TouchpointForm
                                    ref={TouchpointFormRef}
                                    touchpointData={touchpointData}
                                    setIsMissing={setIsMissing}
                                    setSelectedQRCodeLogo={setSelectedQRCodeLogo}
                                    selectedQRCodeLogo={selectedQRCodeLogo}
                                    onValidationInitial={onValidationInitial}
                                />
                            </form>
                        </FormProvider>
                    </div>
                </PageLayout>
            </div>
            <RightQRcode
                loading={touchpointMutation.isPending}
                isMissing={isMissing}
                isDirty={isDirty}
                isNew={touchpointId === 'new'}
                touchpointData={touchpointData}
                qRCodeUrl={getQRCodeUrl()}
                logo={watch('logo')?.[0]?.url ?? touchpointData?.logo}
            />
        </div>
    );
};

export default TouchpointOperation;
