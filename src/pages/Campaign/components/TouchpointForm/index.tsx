import { FieldSelect, FieldText, FieldUpload } from '@imbrace/ui';
import { Typography } from '@mui/material';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import type { Message, WorkflowCallbackObj } from '@/pages/N8n';
import WorkflowFrame from '@/pages/N8n';
import { useAppSelector } from '@/redux/store';
import { supportedImageFileExtensions, supportedImageFileMIME } from '@/utils';

import { checkDate, getChannelIcon } from '../campaignCommonFunc';
import WorkflowDialogModal from '../DialogModal';
import styles from './index.module.scss';
import SelectChannel from './selectChannel';
import SelectMedia from './selectMedia';

interface TouchpointFormType {
    touchpointData?: API.Touchpoint;
    setSelectedQRCodeLogo: (value?: File | string) => void;
    selectedQRCodeLogo?: File | string;
    qRCodeLogoUrl?: string;
    setIsMissing: (value: 'channel' | 'workflow' | null) => void;
    onValidationInitial: (value: string, selectedChannelId?: string) => Promise<boolean>;
}

export type TouchpointFormRef = {
    selectChannelData?: API.Channel;
    setSelectChannelData: (value?: API.Channel) => void;
    setMenuType: (value: string) => void;
    menuType: string;
};

export type SelectChannelRef = {
    workflowToExecute: string | number | null;
    setWorkflowToExecute: (workflowId: string | number) => void;
};

const TouchpointForm = forwardRef<TouchpointFormRef, TouchpointFormType>((props, ref) => {
    const { t } = useTranslation();
    const { touchpointData, setIsMissing, onValidationInitial } = props;
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const organizationPartition = useAppSelector((state) => state.Account.partition);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const SelectChannelRef = useRef<SelectChannelRef>(null);
    const [openNewWorkflowN8n, setOpenNewWorkflowN8n] = useState(false);
    const [selectChannelData, setSelectChannelData] = useState<API.Channel>();
    const [isWorkflowSaved, setIsWorkflowSaved] = useState(false);
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
    const [isNodeViewDirty, setIsNodeViewDirty] = useState(false);
    const [messageEventData, setMessageEventData] = useState<WorkflowCallbackObj>();
    const [menuType, setMenuType] = useState<string>(
        touchpointData && touchpointData.channel
            ? touchpointData.channel && !touchpointData.channel.is_deleted
                ? touchpointData.channel.config.type
                : ''
            : touchpointData && !touchpointData.default_channel_workflow_id && !touchpointData.channel && touchpointData.url
            ? 'selectUrl'
            : 'selectDestination',
    );

    const workflowDomain = useMemo(() => {
        return '';
    }, [organizationPartition, organizationId]);

    useImperativeHandle(ref, () => ({
        selectChannelData,
        setSelectChannelData: (value?: API.Channel) => {
            setSelectChannelData(value);
        },
        setMenuType: (value: string) => {
            setMenuType(value);
        },
        menuType,
    }));

    const { control, setValue, watch, trigger, setError, clearErrors } = useFormContext();

    const isUntouchedWorkflow = useCallback(() => {
        const { nodeIndex, isNewCreated } = messageEventData || {};

        if (!isNewCreated) {
            return false;
        }

        const isIncludeStart = nodeIndex && nodeIndex.includes('Webhook') && nodeIndex.length > 2;
        return isIncludeStart || (nodeIndex && nodeIndex.length > 1);
    }, [messageEventData]);

    const handlerSelectChannel = useCallback(
        async (selectValue: string, channelData?: API.Channel) => {
            const { workflow_id } = channelData || {};
            setSelectChannelData(channelData);
            setValue('channel_id', selectValue);
            setValue('execute_workflow_id', workflow_id || '');
            setIsMissing(null);
        },
        [setIsMissing, setValue],
    );

    const handlerAddNewWorkflow = useCallback(() => {
        setOpenNewWorkflowN8n(true);
    }, []);

    const handleAddNewWorkflowClose = useCallback(() => {
        if (messageEventData && messageEventData.workflowId === '__EMPTY__') {
            setValue('execute_workflow_id', SelectChannelRef.current?.workflowToExecute ?? touchpointData?.execute_workflow_id);

            setOpenNewWorkflowN8n(false);
            return;
        }
        if (isWorkflowSaved && messageEventData && messageEventData?.savedCount > 1) {
            setOpenNewWorkflowN8n(false);
            return;
        }
        // NodeView is dirty, prompt save&exit dialog
        if (isNodeViewDirty) {
            setDeleteConfirmDialog(true);
            return;
        }
        // NodeView is not dirty, prompt save&exit dialog for newly created workflow (savedCount: 1)
        if (!isNodeViewDirty && messageEventData && messageEventData?.savedCount === 1) {
            setDeleteConfirmDialog(true);
            return;
        }
        if (!isNodeViewDirty && messageEventData && messageEventData?.saved) {
            setOpenNewWorkflowN8n(false);
            setValue('execute_workflow_id', messageEventData?.workflowId);
            return;
        }
        setValue('execute_workflow_id', SelectChannelRef.current?.workflowToExecute ?? touchpointData?.execute_workflow_id);

        setOpenNewWorkflowN8n(false);
    }, [isNodeViewDirty, isWorkflowSaved, messageEventData, setValue, touchpointData]);

    const handlerCallBack = useCallback(
        async (data?: WorkflowCallbackObj) => {
            if (data) {
                setValue('execute_workflow_id', data.workflowId ?? '', { shouldDirty: true });
            }
        },
        [setValue],
    );

    const onDiscardHandler = useCallback(async () => {
        return new Promise<void>(async (resolve) => {
            // const isNewlyDiscardWorkflow = messageEventData?.isNewCreated && messageEventData?.savedCount === 1;
            // Legacy delete logic removed

            // discard will eventually set wf to exec to prev selected option & close the iframe
            setValue('execute_workflow_id', SelectChannelRef.current?.workflowToExecute ?? touchpointData?.execute_workflow_id);
            await trigger('execute_workflow_id');

            setOpenNewWorkflowN8n(false);
            setDeleteConfirmDialog(false);

            resolve();
        });
    }, [setValue, trigger, touchpointData]);

    const onSaveAndExitHandler = useCallback(async () => {
        if (iframeRef.current) {
            const message: Message = {
                type: 'saveAction',
                data: { shouldClose: true },
            };
            iframeRef.current.contentWindow?.postMessage(message, workflowDomain);
        }
        // setOpenNewWorkflowN8n(false);
        setDeleteConfirmDialog(false);
    }, [workflowDomain]);

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if (ev.origin === workflowDomain) {
                const data = ev.data?.data;
                setIsWorkflowSaved(data?.saved ?? false);

                if (ev.data.type === 'closeAction') {
                    setOpenNewWorkflowN8n(false);
                    return;
                }
                if (ev.data.type === 'dirtyAction') {
                    // setDeleteConfirmDialog(ev.data.data);
                    setIsNodeViewDirty(ev.data.data);
                    return;
                }
                // if (ev.data.type === 'reloadWorkflowAction') {
                //     setOpenNewWorkflowN8n(false);
                //     return;
                // }
                if (typeof data === 'undefined') return;
                if (data && data.code && data.code === 'newWorkflow') {
                    setMessageEventData((prev) => ({
                        ...prev,
                        code: 'success',
                        isNewCreated: true,
                        saved: true,
                        savedCount: 1,
                        workflowId: data?.workflowId,
                    }));
                }
                if (data && data.code && data.code === 'success' && handlerCallBack) {
                    setMessageEventData(data);
                    handlerCallBack(data);
                }
            }
        };

        window.addEventListener('message', handler);

        return () => window.removeEventListener('message', handler);
    }, [handlerCallBack, workflowDomain]);

    useEffect(() => {
        if (deleteConfirmDialog) {
            dialog({
                title: t('campaign_close_modal_title'),
                content: t('campaign_close_modal_content'),
                onConfirm: onSaveAndExitHandler,
                onClose: onDiscardHandler,
                onBackdropClose: () => {
                    setDeleteConfirmDialog(false);
                },
                confirmText: t('campaign_close_modal_confirm'),
                cancelText: t('campaign_close_modal_cancel'),
            });
        }
    }, [deleteConfirmDialog, onDiscardHandler, onSaveAndExitHandler, t]);

    return (
        <>
            {((touchpointData && touchpointData.channel) || selectChannelData) && (
                <WorkflowDialogModal
                    header={t('campaign_execute_workflow_iframe_title')}
                    open={openNewWorkflowN8n}
                    onClose={handleAddNewWorkflowClose}
                >
                    <WorkflowFrame
                        ref={iframeRef}
                        workflowId={'new'}
                        type={
                            touchpointData && touchpointData.channel ? touchpointData.channel.config.type : selectChannelData?.config.type
                        }
                    />
                </WorkflowDialogModal>
            )}
            <div className={styles.container}>
                <Controller
                    control={control}
                    name={'name'}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                fullWidth
                                label={`${t('campaign_form_name')}*`}
                                sx={{ '.MuiInputBase-input': { fontSize: '0.875rem' } }}
                                placeholder={t('campaign_qrcode_name_placeholder')}
                                error={!!error}
                                helperText={error?.message}
                                description={
                                    watch('utm_tracking') && (
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {t('campaign_utm_campaign_subtitle')}
                                        </Typography>
                                    )
                                }
                                {...field}
                            />
                        );
                    }}
                />
                <Controller
                    control={control}
                    name={'description'}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                multiline
                                fullWidth
                                label={t('campaign_description_title')}
                                sx={{ '.MuiInputBase-input': { fontSize: '0.875rem' } }}
                                placeholder={t('campaign_description_placeholder')}
                                error={!!error}
                                helperText={error?.message}
                                description={
                                    watch('utm_tracking') && (
                                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                            {t('campaign_utm_content_subtitle')}
                                        </Typography>
                                    )
                                }
                                {...field}
                            />
                        );
                    }}
                />
                <Controller
                    control={control}
                    name={'paid_keywords'}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                multiline
                                fullWidth
                                // label={t('campaign_paid_keywords_title')}
                                label={t('campaign_paid_keyword')}
                                sx={{ '.MuiInputBase-input': { fontSize: '0.875rem' } }}
                                placeholder={t('campaign_paid_keyword_placeholder')}
                                description={
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {watch('utm_tracking') ? t('campaign_utm_term_subtitle') : t('campaign_paid_keyword_subtitle')}
                                    </Typography>
                                }
                                error={!!error}
                                helperText={error?.message}
                                {...field}
                            />
                        );
                    }}
                />
                <Controller
                    control={control}
                    name={'source'}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                multiline
                                fullWidth
                                label={`${t('campaign_source')}${watch('utm_tracking') ? '*' : ''}`}
                                sx={{ '.MuiInputBase-input': { fontSize: '0.875rem' } }}
                                description={
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {watch('utm_tracking') ? t('campaign_utm_source_subtitle') : t('campaign_source_subtitle')}
                                    </Typography>
                                }
                                placeholder={t('campaign_source_placeholder')}
                                error={!!error}
                                helperText={error?.message}
                                {...field}
                            />
                        );
                    }}
                />
                <SelectMedia />

                <SelectChannel
                    ref={SelectChannelRef}
                    handlerSelectChannel={handlerSelectChannel}
                    touchpointData={touchpointData}
                    setSelectChannelData={setSelectChannelData}
                    menuType={menuType}
                    setMenuType={setMenuType}
                    onValidationInitial={onValidationInitial}
                    handlerAddNewWorkflow={handlerAddNewWorkflow}
                    selectChannelData={selectChannelData}
                    isWorkflowSaved={isWorkflowSaved}
                />

                {checkDate(watch('start_datetime'), watch('end_datetime')) && (
                    <>
                        {selectChannelData ? (
                            <FieldSelect
                                fullWidth
                                queryKey={['channel_list']}
                                label={`${t('campaign_touchpoint_title')}*`}
                                description={t('campaign_touchpoint_subtitle')}
                                request={() => [
                                    {
                                        icon: getChannelIcon(
                                            selectChannelData?.config?.type || touchpointData?.channel?.config?.type || '',
                                            true,
                                        ),
                                        value: selectChannelData?._id ?? touchpointData?.channel?._id ?? '',
                                        text: selectChannelData?.name || touchpointData?.channel?.name || '',
                                    },
                                ]}
                                value={selectChannelData?._id ?? touchpointData?.channel?._id ?? ''}
                                disabled
                                hideArrow
                            />
                        ) : (
                            <Controller
                                control={control}
                                name={'destination_url'}
                                rules={{
                                    pattern: {
                                        value: /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/,
                                        message: t('validation_url_pattern'),
                                    },
                                    required: {
                                        value: true,
                                        message: t('validation_qrcode_required'),
                                    },
                                    validate: {
                                        checkSpace: (val: string) => val.trim().length > 0 || t('validation_url_pattern'),
                                    },
                                }}
                                render={({ field, fieldState: { error } }) => {
                                    return (
                                        <FieldText
                                            fullWidth
                                            label={`${t('campaign_touchpoint_title')}*`}
                                            description={t('campaign_touchpoint_subtitle')}
                                            placeholder={t('campaign_selectUrl_placeholder')}
                                            error={!!error}
                                            helperText={error?.message}
                                            {...field}
                                        />
                                    );
                                }}
                            />
                        )}
                    </>
                )}
                <Controller
                    name="logo"
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldUpload
                                {...field}
                                type="avatar"
                                fullWidth
                                label={t('campaign_logo_upload')}
                                description={
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                        {t('campaign_file_upload_tips')}
                                        <br />
                                        {t('campaign_file_upload_tips2')}
                                    </Typography>
                                }
                                error={!!error}
                                helperText={error?.message}
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
                                        return t('error_file_size', { size: '5 MB' });
                                    }
                                    return true;
                                }}
                                onChange={(files) => {
                                    field.onChange(files);

                                    if (
                                        files?.some(
                                            (file) =>
                                                file.status === 'uploading' || file.status === 'deleting' || file.status === 'missingFile',
                                        )
                                    ) {
                                        setError('root.hasProcessingFiles', { type: 'custom', message: 'hasProcessingFiles' });
                                    } else {
                                        clearErrors('root.hasProcessingFiles');
                                    }
                                }}
                                accept="image/png, image/jpeg, .svg"
                            />
                        );
                    }}
                />
            </div>
        </>
    );
});

export default TouchpointForm;
