import type { Option, SelectRef } from '@imbrace/ui';
import { Button, EllipsisText, FieldSelect, FieldSwitch, FieldText, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import type { ChannelIconTypes } from '@imbrace/ui/dist/components/Icon';
import { Box, CircularProgress, FormLabel } from '@mui/material';
import { forwardRef, Fragment, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { env } from '@/env';

import AlertBar from '@/components/AlertBar';
import useDebounce from '@/hooks/useDebounce';
import type { ChannelCountType } from '@/pages/Channels';
import FacebookReconnect from '@/pages/Channels/components/ChannelActions/FacebookReconnect';
import WhatsappReconnect from '@/pages/Channels/components/ChannelActions/WhatsappReconnect';
import DialogModal from '@/pages/Credentials/components/DialogModal';
import CreateNewCredential from '@/pages/Credentials/components/NewCredential/CreateNewCredential';
import WebWidget from '@/pages/WebWidget';
import { getChannelCount, getChannelList } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';

import type { SelectChannelRef } from '../TouchpointForm';
import SelectDateRange from './selectDateRange';
import SelectWorkFlow from './selectWorkFlow';
import TooltipWithHelpIcon from '@/components/TooltipWithHelpIcon';
import { set } from 'lodash';
import InstagramReconnect from '@/pages/Channels/components/ChannelActions/InstagramReconnect';
import { useAppSelector } from '@/redux/store';

interface SelectChannelProps {
    handlerSelectChannel: (value: string, channel?: API.Channel) => void;
    touchpointData?: API.Touchpoint;
    setSelectChannelData: (value?: API.Channel) => void;
    menuType: string;
    setMenuType: (value: string) => void;
    onValidationInitial: (value: string, selectedChannelId?: string) => Promise<boolean>;
    handlerAddNewWorkflow: () => void;
    selectChannelData?: API.Channel;
    isWorkflowSaved: boolean;
}

const fetchChannel = async (channelType: API.ChannelType) => {
    const { data } = await apiFetch<API.PaginatedResponse<API.Channel[]>>(getChannelList.api(channelType), getChannelList.method);

    return data.data;
};

const fetchChannelCount = async () => {
    const { data } = await apiFetch<ChannelCountType>(getChannelCount.api(), getChannelCount.method);

    const availableChannels = Object.entries(data)
        .filter(([key, value]) => key !== 'all' && key !== 'store' && key !== 'email' && value !== 0)
        .map(([key]) => key);
    return availableChannels as API.ChannelType[];
};

const SelectChannel = forwardRef<SelectChannelRef, SelectChannelProps>((props, ref) => {
    const { t } = useTranslation();
    const { touchpointId } = useParams<{ touchpointId?: string }>();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const [openModal, setOpenModal] = useState(false);
    const {
        touchpointData,
        setSelectChannelData,
        handlerSelectChannel,
        menuType,
        setMenuType,
        onValidationInitial,
        handlerAddNewWorkflow,
        selectChannelData,
        isWorkflowSaved,
    } = props;
    const [credentialType, setCredentialType] = useState<string>();
    const urlInputRef = useRef<HTMLInputElement>(null);
    const destinationRef = useRef<SelectRef>(null);
    const [{ dialogWindow }, dialogHolder] = useDialog();
    const [focusField, setFocusField] = useState<string>();

    // states for previously selected options
    const [prevSelectChannelData, setPrevSelectChannelData] = useState<API.Channel>();
    const [ipInputValue, setIPInputValue] = useState<string>('');
    const [workflowToExecute, setWorkflowToExecute] = useState<string | number | null>(null);

    const debouncedIPInputValue = useDebounce(ipInputValue, 300);

    useImperativeHandle(ref, () => ({
        workflowToExecute: workflowToExecute,
        setWorkflowToExecute: (value: string | number) => {
            setWorkflowToExecute(value);
        },
    }));

    useEffect(() => {
        if (debouncedIPInputValue) {
            onValidationInitial(debouncedIPInputValue, selectChannelData?.id);
        }
    }, [debouncedIPInputValue, onValidationInitial, selectChannelData]);

    const {
        control,
        setValue,
        watch,
        getValues,
        clearErrors,
        formState: { dirtyFields },
    } = useFormContext();

    const handleSelectChannelType = useCallback(
        (channelType: string) => {
            setMenuType(channelType);
        },
        [setMenuType],
    );

    useEffect(() => {
        if (touchpointData && !touchpointData.default_channel_workflow_id && !touchpointData.channel && touchpointData.url) {
            setMenuType('selectUrl');
            return;
        }

        if (touchpointData && touchpointData.channel) {
            setMenuType(touchpointData.channel.config.type);

            return;
        }
    }, [touchpointData, setMenuType, setValue]);

    const handlerSelectURL = useCallback(() => {
        setMenuType('selectUrl');
        setValue('channel_id', '', { shouldDirty: true });
        setSelectChannelData(undefined);
        setFocusField('url');
    }, [setMenuType, setValue, setSelectChannelData]);

    useEffect(() => {
        if (focusField === 'url' && menuType === 'selectUrl' && urlInputRef.current) {
            urlInputRef.current.focus();
        }
    }, [urlInputRef, menuType, focusField]);

    const onResetURL = () => {
        // change isDirty state to true
        setValue('url', '', { shouldDirty: true });
        setValue('destination_url', '');

        // is already handled in handlerSelectChannel function
        // setSelectChannelData(touchpointData && touchpointData.channel ? touchpointData.channel : undefined);
        if (touchpointData?.channel) {
            handlerSelectChannel(touchpointData.channel.id, touchpointData.channel);
            setMenuType(touchpointData?.channel.config.type);
            return;
        }
        setValue('channel_id', '');
        setMenuType('selectDestination');
    };

    const handleSelectChannel = useCallback(
        async (channelId: string, channel: API.Channel) => {
            if (getValues('initial_phrase') || ipInputValue) {
                clearErrors('initial_phrase');
                await onValidationInitial(ipInputValue, channelId);
                setValue('initial_phrase', ipInputValue);
            }
            handlerSelectChannel(channelId, channel);
            setValue('utm_tracking', false);
            setValue('url', '');
            setValue('destination_url', '');
        },
        [getValues, clearErrors, handlerSelectChannel, ipInputValue, setValue, onValidationInitial],
    );

    const handleSelectNewChannel = (channelType: string) => {
        setCredentialType(channelType);
        setOpenModal(true);
    };

    const openWebWidgetSetupModal = useCallback(
        (channel: API.Channel) => {
            dialogWindow({
                title: channel.name,
                content: ({ onClose }) => (
                    <Box sx={{ height: '100%' }}>
                        <WebWidget
                            id={channel.id}
                            isModalContent
                            onCloseModal={(state?: string) => {
                                if (state === 'saveOnly' || state === 'saveAndActive') {
                                    setSelectChannelData(channel);
                                    destinationRef.current?.refresh();
                                    onClose?.(undefined, state);
                                    return;
                                }
                                setMenuType('web');
                                onClose?.(undefined, state);
                            }}
                        />
                    </Box>
                ),
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                onClose: (dontAskAgain, mode) => {
                    destinationRef.current?.refresh();
                },
                onBackdropClose: () => {
                    destinationRef.current?.refresh();
                },
                paperSx: {
                    minWidth: '1085px',
                    maxWidth: '1200px',
                    width: '1200px',
                },
            });
        },
        [dialogWindow, setMenuType, setSelectChannelData],
    );

    const onResponseChannelAfterCreate = useCallback(
        async (data: API.Channel | API.CredentialData) => {
            setMenuType((data as API.Channel).config.type);
            destinationRef.current?.refresh();
            handlerSelectChannel(data.id, data as API.Channel);

            if ((data as API.Channel).config.type === 'web') {
                openWebWidgetSetupModal(data as API.Channel);
            }
        },
        [handlerSelectChannel, setMenuType, openWebWidgetSetupModal],
    );

    const onCloseCredentialModal = useCallback(async () => {
        if (menuType === 'addNew') {
            prevSelectChannelData && handlerSelectChannel(prevSelectChannelData.id);
            prevSelectChannelData && setMenuType(prevSelectChannelData.config.type);

            setValue('initial_phrase', ipInputValue, { shouldDirty: true });
            setValue('execute_workflow_id', workflowToExecute, { shouldDirty: true });
            setSelectChannelData(prevSelectChannelData);
        }
        setOpenModal(false);
    }, [
        prevSelectChannelData,
        setSelectChannelData,
        handlerSelectChannel,
        ipInputValue,
        menuType,
        setMenuType,
        setValue,
        workflowToExecute,
    ]);

    const renderMenuOption: () => Promise<Option[]> = useCallback(async () => {
        if (menuType === 'selectDestination') {
            return [
                {
                    icon: <Icon name="widgets" fontSize={24} color="var(--color-light-5)" />,
                    iconAlignment: 'flex-start',
                    text: t('campaign_selectChannel_title'),
                    value: 'selectChannel',
                    description: t('campaign_selectChannel_sub_title'),
                    onClick: () => {
                        setMenuType('selectOptions');
                        setValue('destination_type', 'selectChannel', { shouldDirty: true, shouldValidate: true });
                    },
                },
                {
                    icon: <Icon name="link" fontSize={24} color="var(--color-light-5)" />,
                    iconAlignment: 'flex-start',
                    text: t('campaign_selectUrl_title'),
                    value: 'selectUrl',
                    description: t('campaign_selectUrl_sub_title'),
                    onClick: () => {
                        handlerSelectURL();
                        setValue('destination_type', 'selectUrl', { shouldDirty: true, shouldValidate: true });
                    },
                },
            ];
        }
        if (menuType === 'addNew') {
            return [
                {
                    icon: <Icon name="whatsapp" fontSize={24} namespace="channel" />,
                    text: t('web_widget_new_channel_whatsapp'),
                    value: 'whatsapp',
                    onClick: () => {
                        handleSelectNewChannel('whatsapp');
                    },
                },
                {
                    icon: <Icon name="line" fontSize={24} namespace="channel" />,
                    text: t('web_widget_new_channel_line'),
                    value: 'line',
                    onClick: () => {
                        handleSelectNewChannel('line');
                    },
                },
                {
                    icon: <Icon name="wechat" fontSize={24} namespace="channel" />,
                    text: t('web_widget_new_channel_wechat'),
                    value: 'wechat',
                    onClick: () => {
                        handleSelectNewChannel('wechat');
                    },
                },
                {
                    icon: <Icon name="web" fontSize={24} namespace="channel" />,
                    text: t('web_widget_new_channel_web'),
                    value: 'web',
                    onClick: () => {
                        handleSelectNewChannel('web');
                    },
                },
                {
                    icon: <Icon name="facebook" fontSize={24} namespace="channel" />,
                    text: t('web_widget_new_channel_facebook'),
                    value: 'facebook',
                    onClick: () => {
                        handleSelectNewChannel('facebook');
                    },
                },
            ];
        }
        if (menuType === 'selectOptions') {
            const channels = await fetchChannelCount();
            return channels.map((channelType) => ({
                icon: <Icon name={`${channelType}` as ChannelIconTypes['name']} fontSize={24} namespace="channel" />,
                text: t(`channel_${channelType}`),
                value: channelType,
                onClick: () => {
                    handleSelectChannelType(channelType);
                },
            }));
        }

        const channelOptions = await fetchChannel(menuType as API.ChannelType);

        return channelOptions.map((channel: API.Channel) => ({
            onClick: (e) => {
                e.stopPropagation();
                e.preventDefault();
                handleSelectChannel(channel.id, channel);
            },
            icon: <Icon name={channel.config.type as ChannelIconTypes['name']} fontSize={24} namespace="channel" />,
            text: (
                <Space direction="horizontal" justify="between" align="center" style={{ width: '100%' }}>
                    <EllipsisText text={channel.name} />
                    {channel.config.type === 'web' && channel.is_init && (
                        <Button
                            variant="outlined"
                            size="xs"
                            type="danger"
                            onClick={async (e) => {
                                openWebWidgetSetupModal(channel);
                            }}
                            text={
                                <Typography variant="Caption" style={{ textTransform: 'none' }}>
                                    {t('channel_setup_needed')}
                                </Typography>
                            }
                            sx={{
                                height: 22,
                                color: 'var(--color-danger-5)',
                                padding: '0 8px',
                                borderRadius: '4px',
                            }}
                        />
                    )}
                    {channel.config.type === 'facebook' && 'errorCode' in channel && (
                        <FacebookReconnect channel={channel} onFinish={destinationRef.current?.refresh} badge />
                    )}
                    {channel.config.type === 'instagram' && 'errorCode' in channel && (
                        <InstagramReconnect channel={channel} onFinish={destinationRef.current?.refresh} badge />
                    )}
                    {channel.config.type === 'whatsapp' && 'errorCode' in channel && (
                        <WhatsappReconnect channel={channel} onFinish={destinationRef.current?.refresh} badge />
                    )}
                </Space>
            ),
            value: channel.id,
        }));
    }, [handleSelectChannelType, menuType, handleSelectChannel, handlerSelectURL, setMenuType, t, setValue, openWebWidgetSetupModal]);

    const renderModalContent = () => {
        switch (credentialType) {
            case 'whatsapp':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            onCloseCredentialModal();
                        }}
                        searchParam={'whatsapp'}
                        onResponseAfterCreate={onResponseChannelAfterCreate}
                    />
                );
            case 'line':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            onCloseCredentialModal();
                        }}
                        searchParam={'line'}
                        onResponseAfterCreate={onResponseChannelAfterCreate}
                    />
                );
            case 'wechat':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            onCloseCredentialModal();
                        }}
                        searchParam={'wechat'}
                        onResponseAfterCreate={onResponseChannelAfterCreate}
                    />
                );
            case 'facebook':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            onCloseCredentialModal();
                        }}
                        searchParam={'facebook'}
                        onResponseAfterCreate={onResponseChannelAfterCreate}
                    />
                );
            case 'web':
                return (
                    <CreateNewCredential
                        modalState="createNew"
                        open={openModal}
                        onClose={() => {
                            onCloseCredentialModal();
                        }}
                        searchParam={'web'}
                        onResponseAfterCreate={onResponseChannelAfterCreate}
                    />
                );
            default:
                return <CircularProgress color="imbrace_blue" size={30} />;
        }
    };

    const renderSelectDateRange = () => <SelectDateRange touchpointData={touchpointData} />;

    const isPrefilledIP = () => {
        const isDirtyField = 'initial_phrase' in dirtyFields;
        if (!isDirtyField && touchpointData && !touchpointData.default_channel_workflow_id && getValues('initial_phrase')) {
            return <AlertBar severity="warning" message={t('campaign_saved_setting')} />;
        }
    };

    const missingWfAlertBar = () => {
        const isDirtyField = 'execute_workflow_id' in dirtyFields;
        if (!isDirtyField && touchpointData && !touchpointData.execute_workflow_id) {
            return <AlertBar severity="warning" message={t('campaign_missing_workflow_error')} />;
        }
    };

    const renderFields = () => (
        <>
            {selectChannelData && selectChannelData.config.type !== 'web' && (
                <Controller
                    control={control}
                    name={'initial_phrase'}
                    render={({ field, fieldState: { error } }) => (
                        <div>
                            <FieldText
                                fullWidth
                                description={t('campaign_default_initiation_phrase_subtitle')}
                                label={t('campaign_default_initiation_phrase')}
                                error={!!error}
                                helperText={error?.message}
                                {...field}
                                onChange={(e) => {
                                    setIPInputValue(e.target.value);
                                    field.onChange(e.target.value);
                                }}
                                onBlur={(e) => onValidationInitial(e.target.value)}
                                {...(menuType === 'line' && {
                                    tooltip: t('campaign_touchpoint_line_tooltip'),
                                })}
                            />
                            {isPrefilledIP()}
                        </div>
                    )}
                />
            )}

            <SelectWorkFlow
                handlerAddNewWorkflow={handlerAddNewWorkflow}
                selectChannelData={selectChannelData}
                isWorkflowSaved={isWorkflowSaved}
                setWorkflowToExecute={setWorkflowToExecute}
                missingWfAlertBar={missingWfAlertBar}
            />
            {renderSelectDateRange()}
        </>
    );

    return (
        <>
            {dialogHolder}
            <DialogModal open={openModal} modalState={'createNew'} onClose={() => setOpenModal(false)}>
                {renderModalContent()}
            </DialogModal>

            {menuType !== 'selectUrl' ? (
                <>
                    <div>
                        <Controller
                            name={'channel_id'}
                            control={control}
                            render={({ field: { onChange, value }, fieldState: { error } }) => {
                                return (
                                    <FieldSelect
                                        queryKey={[
                                            'touchpoint_destination',
                                            {
                                                menuType,
                                            },
                                        ]}
                                        label={`${t('campaign_channel_id')}*`}
                                        description={t('campaign_channel_id_subtitle')}
                                        fullWidth
                                        onChange={(e) => {
                                            if (`${e}`.startsWith('ch_')) {
                                                // only change value when select a channel
                                                onChange(e);
                                            }
                                        }}
                                        ref={destinationRef}
                                        // allowOutOfRangeValue={value.startsWith('ch_')}
                                        value={value}
                                        placeholder={t('campaign_click_select_placeholder')}
                                        error={!!error}
                                        helperText={error?.message}
                                        request={renderMenuOption}
                                        closeOnSelect={
                                            menuType !== 'selectDestination' && menuType !== 'addNew' && menuType !== 'selectOptions'
                                        }
                                        popoverProps={{
                                            disablePortal: false,
                                        }}
                                        onClose={() => {
                                            selectChannelData && setMenuType(selectChannelData?.config.type);
                                            selectChannelData && handlerSelectChannel(selectChannelData?.id, selectChannelData);
                                            // shouldDirty so picking/clearing the workflow or phrase enables the
                                            // Create/Update button (gated on formState.isDirty). Without it a web
                                            // touchpoint's workflow change never marked the form dirty.
                                            setValue('initial_phrase', ipInputValue, { shouldDirty: true });
                                            setValue('execute_workflow_id', workflowToExecute, { shouldDirty: true });
                                        }}
                                        onOpen={() => {
                                            // store initial phrase & workflow to execute to state
                                            // setPrevChannelId(getValues('channel_id'));
                                            setPrevSelectChannelData(selectChannelData);
                                            setIPInputValue(getValues('initial_phrase'));
                                            setWorkflowToExecute(getValues('execute_workflow_id'));
                                            setMenuType('selectDestination');
                                            // change isDirty state to true
                                            setValue('channel_id', '', { shouldDirty: true });
                                        }}
                                        {...(menuType === 'selectOptions' && {
                                            emptyText: t('campaign_touchpoint_no_connected_chanel'),
                                        })}
                                        {...(menuType !== 'selectDestination' &&
                                            menuType !== 'addNew' &&
                                            menuType !== 'selectOptions' && {
                                                emptyText: t('campaign_channel_id_empty'),
                                            })}
                                        {...(menuType === 'selectOptions' && {
                                            footer: () => {
                                                return (
                                                    <IconButton
                                                        size="default"
                                                        variant="text"
                                                        type="secondary"
                                                        sx={{
                                                            width: '100%',
                                                            padding: '8px 12px',
                                                            gap: '12px',
                                                            justifyContent: 'flex-start',
                                                            textTransform: 'capitalize',
                                                            borderRadius: 0,
                                                        }}
                                                        onClick={() => {
                                                            handleSelectChannelType('addNew');
                                                        }}
                                                    >
                                                        <Icon name="add" fontSize={24} style={{ color: 'var(--color-primary-1)' }} />
                                                        <Space size={4}>
                                                            <Typography
                                                                variant="BodyTight"
                                                                style={{
                                                                    color: 'var(--color-primary-1)',
                                                                }}
                                                            >
                                                                {t('campaign_add_new')}
                                                            </Typography>
                                                        </Space>
                                                    </IconButton>
                                                );
                                            },
                                        })}
                                    />
                                );
                            }}
                        />
                        {selectChannelData && selectChannelData.config.type === 'web' && (
                            <Box sx={{ marginTop: '12px' }}>
                                <FieldText
                                    fullWidth
                                    description={'This touchpoint will direct the customer to the full-page web widget'}
                                    sx={{ '.MuiInputBase-input': { fontSize: '0.875rem' } }}
                                    placeholder={`${env.VITE_APP_CHAT_HOST}/full_page.html?channel_id=${selectChannelData.id}&org_id=${organizationId}`}
                                    disabled
                                />
                            </Box>
                        )}
                    </div>
                    {!!watch('channel_id') && renderFields()}
                </>
            ) : (
                <>
                    <Controller
                        control={control}
                        name={'url'}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                inputRef={urlInputRef}
                                value={field.value}
                                onChange={field.onChange}
                                label={`${t('campaign_channel_id')}*`}
                                description={t('campaign_channel_id_subtitle')}
                                fullWidth
                                placeholder={t('campaign_selectUrl_placeholder')}
                                error={!!error}
                                onReset={onResetURL}
                                helperText={error?.message}
                            />
                        )}
                    />
                    <Space size={12}>
                        <FormLabel sx={{ gap: '4px', fontSize: '14px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                            {t('campaign_utm_tracking')}
                            <TooltipWithHelpIcon title={t('campaign_utm_tracking_tooltip')} placement="top" />
                        </FormLabel>
                        <Controller
                            control={control}
                            name={'utm_tracking'}
                            render={({ field, fieldState: { error } }) => (
                                <FieldSwitch
                                    label={''}
                                    fullWidth
                                    onChange={async (checked) => {
                                        field.onChange(checked);
                                        if (!checked) {
                                            // Clear errors when UTM tracking is disabled
                                            clearErrors(['media_name', 'source']);
                                        }
                                    }}
                                    value={field.value}
                                    helperText={''}
                                    disabled={false}
                                />
                            )}
                        />
                    </Space>
                    {touchpointId === 'new' ? <>{watch('url') && <>{renderSelectDateRange()}</>}</> : <>{renderSelectDateRange()}</>}
                </>
            )}
        </>
    );
});
export default SelectChannel;
