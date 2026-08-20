import { Button, EllipsisText, Icon, IconButton, Space, Switch, Tooltip, Typography } from '@imbrace/ui';
import { FormControlLabel } from '@mui/material';
import type { QueryObserverResult } from '@tanstack/react-query';
import moment from 'moment';
import { useCallback } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { dialog } from '@/components/Dialog';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { pausedBoardAutomationWithWorkflowId } from '@/services/api/boardAutomation';
import { deleteChannelWorkflowById, deleteN8nWorkflowById, patchN8nWorkflowById, putChannelWorkflowById } from '@/services/api/workflow';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

const hasAutomationTag = (item: API.WorkflowListItem) => item.tags.findIndex((tag) => tag.name === 'automation') !== -1;

const TableRow = ({
    workflow,
    tabIndex,
    currentChannel,
    refetch,
    isAllowModifyWorkflow = true,
    isV2 = false,
}: {
    workflow: API.WorkflowListItem;
    tabIndex: string;
    currentChannel?: API.ChannelType;
    refetch: () => Promise<QueryObserverResult<API.WorkflowListItem[], Error>>;
    isAllowModifyWorkflow?: boolean;
    isV2?: boolean;
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const [setNodeRef, entry] = useIntersectionObserver({});
    const { features } = useAccess();
    const { openHelpCenter } = useNavbar();

    const handleActive = async (id: string, checked: boolean) => {
        if (features.workflows({ automationWorkflowOperation: 'active' }) && tabIndex === 'automations') {
            openUnlockFeature({
                channel: supportChannel,
                touchpoint: supportTouchpoint,
                openHelpCenter: (channelId: string) =>
                    openHelpCenter?.({ channelId, prefillMessage: t('unlock_feature_prefill_message'), defaultWebWidget: true }),
            });
            return false;
        }
        await activeWorkFlowById(id, checked);
        refetch();
        return true;
    };

    const activeWorkFlowById = useCallback(
        (id: string, checked: boolean) => {
            if (tabIndex === 'channels') {
                return apiFetch(putChannelWorkflowById.api(id), putChannelWorkflowById.method, {
                    active: checked,
                });
            }
            return apiFetch(patchN8nWorkflowById.api(+id), patchN8nWorkflowById.method, {
                active: checked,
            });
        },
        [tabIndex],
    );

    const renderDeleteTitle = (inUse: boolean, isChannelAutomation: boolean) => {
        if (tabIndex === 'channels') {
            if (inUse) {
                return t('workflow_delete_channel_in_use_title');
            }
            if (isChannelAutomation) {
                return t('workflow_delete_workflow_title');
            }
            return t('workflow_delete_channel_title');
        } else if (tabIndex === 'presets') {
            return t('workflow_delete_presets_title');
        } else {
            return t('workflow_delete_workflow_title');
        }
    };

    const renderDeleteContent = (inUse: boolean, isChannelAutomation: boolean) => {
        if (tabIndex === 'channels') {
            if (inUse) {
                return (
                    <span>
                        <Trans i18nKey="workflow_delete_channel_in_use_content">
                            If you delete this workflow, the following <strong>touchpoint will be paused</strong>. Its analytics and setup
                            will be stopped immediately.
                        </Trans>
                    </span>
                );
            }
            if (isChannelAutomation) {
                return t('workflow_delete_workflow_content');
            }
            return (
                <span>
                    <Trans i18nKey="workflow_delete_channel_content">
                        If you choose to proceed, you won’t be able to undo this action. Please be aware that once you delete this workflow,
                        the associated <strong>channel and credential will also be deleted.</strong>
                    </Trans>
                </span>
            );
        } else if (tabIndex === 'presets') {
            return t('workflow_delete_presets_content');
        } else if (tabIndex === 'board') {
            return (
                <span>
                    <Trans i18nKey="workflow_delete_board_workflow_content">
                        If you delete this workflow, the following <strong>board automation will become invalid</strong> and need to be
                        updated.
                    </Trans>
                </span>
            );
        } else {
            return t('workflow_delete_workflow_content');
        }
    };

    const handleInUseNotify = (item: API.WorkflowListItem) => {
        const { touchpoints, board } = item;

        dialog({
            title: renderDeleteTitle(true, false),
            content: (
                <Space direction="vertical" size={24}>
                    {renderDeleteContent(true, false)}
                    <div className={styles.campaigns}>
                        <div>
                            {touchpoints?.map((touchpoint) => (
                                <div key={touchpoint.id} className={styles.campaign}>
                                    <Icon name="campaign" style={{ fontSize: 24 }} />
                                    <EllipsisText text={touchpoint.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                                </div>
                            ))}
                            {board?.map((boardItem) => (
                                <div key={boardItem._id} className={styles.campaign}>
                                    <Icon name="clientProfile" style={{ fontSize: 24 }} />
                                    <EllipsisText text={boardItem.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                </Space>
            ),
            onConfirm: async () => {
                await handleDeleteNotify(item);
            },
            onClose: () => {},
            actionsAlign: 'flex-end',
            confirmButtonProps: {
                type: 'danger',
            },
        });
    };

    const handleDeleteNotify = async (item: API.WorkflowListItem) => {
        const { id } = item;
        const boardInUse = item.board && item.board.length > 0;

        const isChannelAutomation = tabIndex === 'channels' && hasAutomationTag(item);

        let dontAskedAgain = window.localStorage.getItem('dont_asked_delete_workflow_again');
        if (tabIndex === 'channels') {
            dontAskedAgain = window.localStorage.getItem('dont_asked_delete_channel_automation_again');
        }
        if (dontAskedAgain !== 'true' || (tabIndex === 'channels' && !hasAutomationTag(item))) {
            dialog({
                title: renderDeleteTitle(false, isChannelAutomation),
                content: renderDeleteContent(false, isChannelAutomation),
                onConfirm: async (isDontAskedAgain) => {
                    if (isDontAskedAgain) {
                        if (tabIndex === 'channels') {
                            window.localStorage.setItem('dont_asked_delete_channel_automation_again', 'true');
                        } else {
                            window.localStorage.setItem('dont_asked_delete_workflow_again', 'true');
                        }
                    }
                    await onDeleteWorkFlowById(id, boardInUse);
                },
                onClose: () => {},
                showDontAskedAgain: tabIndex !== 'channels' || isChannelAutomation,
                actionsAlign: 'flex-end',
                confirmButtonProps: {
                    type: 'danger',
                },
            });
        } else {
            await onDeleteWorkFlowById(id, boardInUse);
        }
    };

    const handleDeleteWorkFlow = async (item: API.WorkflowListItem) => {
        const { touchpoints, board } = item;

        if ((touchpoints && touchpoints.length > 0) || (board && board.length > 0)) {
            handleInUseNotify(item);
        } else {
            handleDeleteNotify(item);
        }
    };

    const onDeleteWorkFlowById = async (id?: string, boardInUse?: boolean) => {
        try {
            if (id) {
                if (tabIndex === 'channels') {
                    await deleteChannelWorkFlowById(id);
                    /* TODO:another api */
                } else if (tabIndex === 'board') {
                    const deleteRes = await deleteWorkFlowById(id);
                    if (deleteRes.status === 200 && boardInUse) {
                        await apiFetch(
                            pausedBoardAutomationWithWorkflowId.api(id),
                            pausedBoardAutomationWithWorkflowId.method,
                            {},
                            ImbraceClient,
                        );
                    }
                } else {
                    await deleteWorkFlowById(id);
                }
                refetch();
            }
        } catch (error) {
            console.log(error);
        }
    };

    const deleteChannelWorkFlowById = useCallback(async (id: string) => {
        try {
            return await apiFetch(deleteChannelWorkflowById.api(id), deleteChannelWorkflowById.method);
        } catch (error) {
            console.log('deleteWorkFlowById error: ', error);
            throw error;
        }
    }, []);

    const deleteWorkFlowById = useCallback(async (id: string) => {
        try {
            return await apiFetch(deleteN8nWorkflowById.api(id), deleteN8nWorkflowById.method);
        } catch (error) {
            console.log('deleteWorkFlowById error: ', error);
            throw error;
        }
    }, []);

    return (
        <div
            ref={(ref) => {
                if (ref) {
                    setNodeRef(ref);
                }
            }}
            className={styles.tableRow}
        >
            {/* {entry?.isIntersecting && ( */}
                <>
                    <div
                        onClick={() =>
                            navigate(`/workflow${isV2 ? '_v2' : ''}/${tabIndex}/${workflow.id}`, {
                                state: {
                                    currentChannel,
                                },
                            })
                        }
                    >
                        {tabIndex === 'channels' && (
                            <Icon
                                namespace="workflow"
                                name={!hasAutomationTag(workflow) ? 'workflowTrigger' : 'subWorkflow'}
                                style={{ fontSize: 24 }}
                            />
                        )}
                        <span>{workflow.name}</span>
                        {tabIndex === 'channels' && !hasAutomationTag(workflow) && (
                            <Tooltip arrow placement="top" title={t('workflow_default_channel_workflow_description')}>
                                <span className={styles.tag}>{t('default')}</span>
                            </Tooltip>
                        )}
                    </div>
                    {tabIndex === 'channels' &&
                        (!hasAutomationTag(workflow) ? (
                            <EllipsisText text={workflow.channel?.name ?? ''} style={{ fontSize: 14 }} />
                        ) : (
                            <div />
                        ))}
                    <div>{moment(workflow.updatedAt).format('yyyy-MM-DD HH:mm')}</div>
                    <div>
                        {tabIndex === 'channels' && !hasAutomationTag(workflow) && workflow.channel && workflow.channel.is_init && (
                            <Button
                                className={!isAllowModifyWorkflow ? 'view-only' : ''}
                                variant="outlined"
                                size="xs"
                                type="danger"
                                onClick={() => {
                                    navigate(`/channels/${workflow?.channel?.id}/web_widget`);
                                }}
                                text={
                                    <Typography variant="Caption" style={{ textTransform: 'none' }}>
                                        {t('channel_setup_needed')}
                                    </Typography>
                                }
                                sx={{
                                    height: 22,
                                    width: 97,
                                    color: 'var(--color-danger-5)',
                                    padding: '0 8px',
                                    borderRadius: '4px',
                                }}
                            />
                        )}
                        {tabIndex !== 'presets' &&
                            isAllowModifyWorkflow &&
                            ((tabIndex === 'channels' && !hasAutomationTag(workflow)) || tabIndex === 'automations') && (
                                <FormControlLabel
                                    sx={{
                                        '& .MuiTypography-root': {
                                            fontSize: '0.875rem',
                                        },
                                        gap: '12px',
                                        marginRight: '5px',
                                    }}
                                    control={
                                        <Tooltip
                                            title={t('channels_active_tooltip')}
                                            placement="top"
                                            arrow
                                            disableHoverListener={!isAllowModifyWorkflow || !workflow.channel?.is_init}
                                        >
                                            <div>
                                                <Switch
                                                    type="xs"
                                                    onChange={async (checked) => {
                                                        return handleActive(workflow.id, checked);
                                                    }}
                                                    disabled={!isAllowModifyWorkflow || workflow.channel?.is_init}
                                                    checked={workflow.active}
                                                />
                                            </div>
                                        </Tooltip>
                                    }
                                    label={
                                        tabIndex === 'automations' && features.workflows({ automationWorkflowOperation: 'active' }) ? (
                                            <Space size={4}>
                                                <Typography>{t('status_active')}</Typography>{' '}
                                                <Icon name="premium" style={{ color: 'var(--color-primary-1)' }} />
                                            </Space>
                                        ) : (
                                            t('status_active')
                                        )
                                    }
                                    labelPlacement="start"
                                />
                            )}
                        {isAllowModifyWorkflow && (
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorkFlow(workflow);
                                }}
                                variant="text"
                                size="s"
                                type="secondary"
                            >
                                <Icon name="delete" />
                            </IconButton>
                        )}
                    </div>
                </>
            {/* )} */}
        </div>
    );
};

export default TableRow;
