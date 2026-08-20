import { FieldSelect, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { FC } from 'react';
import { useCallback, useRef } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { getWorkflowsAutomationV2 } from '@/services/api/workflow';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';

interface SelectWorkFlowProps {
    handlerAddNewWorkflow: () => void;
    selectChannelData?: API.Channel;
    isWorkflowSaved: boolean;
    setWorkflowToExecute: (workflowId: string | number) => void;
    missingWfAlertBar: () => JSX.Element | undefined;
}

const SelectWorkFlow: FC<SelectWorkFlowProps> = (props) => {
    const { t } = useTranslation();
    const { features } = useAccess();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const { openHelpCenter } = useNavbar();
    const needUpgradeRef = useRef(false);
    const isAllowModifyWorkflow = getIsAllowModify();

    const { handlerAddNewWorkflow, selectChannelData, setWorkflowToExecute, missingWfAlertBar } = props;
    const {
        control,
        getValues,
        formState: { errors },
        watch,
    } = useFormContext();

    const fetchWorkFlows = useCallback(async () => {
        if (!selectChannelData) {
            return [];
        }
        try {
            const { data } = await apiFetch<{ data: API.WorkflowListItem[] }>(
                getWorkflowsAutomationV2.api(selectChannelData?.config.type),
                getWorkflowsAutomationV2.method,
            );
            if (data) {
                const needUpgrade = features.workflows({ channelWorkflowCount: data.data.length });
                needUpgradeRef.current = needUpgrade;
                // Only show the channel's existing default-workflow row when it actually has one.
                // Legacy Mongo stored it as `channel.workflow_id`; the Postgres channel model has no
                // such field, so without this guard the row renders with an empty value (labelled with
                // the channel name) and is unselectable — the select ignores clicks on empty values.
                const defaultWorkflow = selectChannelData?.workflow_id
                    ? [
                          {
                              value: selectChannelData.workflow_id,
                              text: selectChannelData.name,
                              icon: <Icon namespace="workflow" name="workflowTrigger" fontSize={20} />,
                          },
                      ]
                    : [];
                const workflowList = [
                    ...defaultWorkflow,
                    ...data.data.map((workflow) => ({
                        value: workflow.id,
                        text: workflow.name,
                        icon: <Icon namespace="workflow" name="subWorkflow" fontSize={20} />,
                    })),
                ];
                return workflowList;
            }
            return [];
        } catch (error) {
            console.error(error);
            return [];
        }
    }, [selectChannelData, features]);

    return (
        <Controller
            control={control}
            name={'execute_workflow_id'}
            rules={{
                required: t('validation_subworkflow_name_pattern'),
                validate: {
                    checkIsNew: (value: string) => {
                        if (value === 'addNew') {
                            return t('campaign_execute_workflow_required');
                        }
                        return true;
                    },
                },
            }}
            render={({ field }) => {
                const { onChange, value } = field;
                return (
                    <Box>
                        <FieldSelect
                            fullWidth
                            label={t('campaign_workflow')}
                            description={watch('initial_phrase') ? t('campaign_workflow_subtitle') : t('campaign_workflow_subtitle_empty')}
                            value={value as string | number}
                            onChange={(val) => {
                                if (!val) return;
                                if (val !== 'addNew') {
                                    setWorkflowToExecute(val);
                                    onChange(val);
                                }
                            }}
                            error={!!errors?.execute_workflow_id}
                            helperText={errors?.execute_workflow_id?.message as string}
                            queryKey={['channel-workflows', watch('channel_id'), selectChannelData?.config.type]}
                            request={fetchWorkFlows}
                            containerStyle={{ height: '40px' }}
                            disabled={!watch('initial_phrase')}
                            popoverProps={{
                                disablePortal: false,
                            }}
                            footer={() => {
                                const needUpgrade = needUpgradeRef.current;
                                if (!isAllowModifyWorkflow) return;
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
                                            if (needUpgrade) {
                                                openUnlockFeature({
                                                    channel: supportChannel,
                                                    touchpoint: supportTouchpoint,
                                                    openHelpCenter: (channelId: string) =>
                                                        openHelpCenter?.({
                                                            channelId,
                                                            prefillMessage: t('unlock_feature_prefill_message'),
                                                            defaultWebWidget: true,
                                                        }),
                                                });
                                                return;
                                            }
                                            setWorkflowToExecute(getValues('execute_workflow_id'));
                                            handlerAddNewWorkflow();
                                        }}
                                    >
                                        <Icon name="add" fontSize={24} style={{ color: 'var(--color-primary-1)' }} />
                                        <Space size={4}>
                                            <Typography style={{ color: 'var(--color-primary-1)' }}>{t('campaign_add_new')}</Typography>
                                            {needUpgrade && (
                                                <Icon fontSize={16} name="premium" style={{ color: 'var(--color-primary-1)' }} />
                                            )}
                                        </Space>
                                    </IconButton>
                                );
                            }}
                        />
                        {missingWfAlertBar()}
                    </Box>
                );
            }}
        />
    );
};

export default SelectWorkFlow;
