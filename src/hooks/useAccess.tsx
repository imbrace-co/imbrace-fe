import { useMemo } from 'react';

import { useAppSelector } from '@/redux/store';

const isFeatureLock = ({ setting, value }: { setting?: string[] | number; value: number | string }) => {
    if (typeof setting === 'undefined' || typeof value === 'undefined') {
        return false;
    }
    if (typeof setting === 'number') {
        return +value >= setting;
    }
    if (Array.isArray(setting) && typeof value === 'string') {
        return setting.indexOf(value) !== -1;
    }
    return false;
};

const useAccess = () => {
    const role = useAppSelector((state) => state.Account.role);
    const modules = useAppSelector((state) => state.Account.organizationModules);
    const lockFeatures = useAppSelector((state) => state.Account.organizationLockFeatures);

    return useMemo(
        () => ({
            isAgent: () => role !== 'owner',
            isAdmin: () => true,
            isOwner: () => role === 'owner',
            isTechnician: () => false,
            isTeamAdmin: (_teamId: string) => true,
            // Owner + member have the same full permission; the only rule is that a
            // member cannot act on the OWNER account. So: the owner can manage anyone,
            // and anyone can manage a non-owner target — only the owner is protected.
            isUnderRole: (compareRole: API.Role) => role === 'owner' || compareRole !== 'owner',
            isUnderAndEqualRole: (compareRole: API.Role) => {
                if (role === 'owner') return true;
                return compareRole !== 'owner';
            },
            getTeamPermission: (_orgRole?: API.Role, _isJoined?: boolean, _teamRole?: API.TeamRoleType) => ({
                createTeam: true,
                deleteTeam: true,
                activeTeam: true,
                teamOperation: true,
                inviteUser: true,
                removeUser: true,
                editTeamRole: true,
                joinTeam: true,
                viewTeamMembers: true,
                leaveTeam: true,
            }),
            ai_agent: () => true,
            internal_ai_chat: () => modules?.internal_ai_chat,
            access_control: () => modules?.access_control,
            conversation: () => modules?.conversation,
            crm: () => modules?.crm,
            databoards: () => modules?.databoards,
            knowledge_hub: () => modules?.knowledge_hub,
            knowledge_hub_beta: () => modules?.knowledge_hub_beta,
            campaign: () => modules?.campaign,
            workflows: () => modules?.workflows,
            workflows_v2: () => modules?.workflows_v2,
            channels: () => modules?.channels,
            credentials: () => modules?.credentials,
            analytics: () => modules?.analytics,
            knowledge_base: () => modules?.knowledge_base,
            teams: () => modules?.teams,
            member: () => modules?.member,
            templates: () => modules?.templates,
            events: () => modules?.events,

            features: {
                teams: ({ assignMode, total }: { assignMode?: API.TeamMode; total?: number }) => {
                    if (assignMode) {
                        return isFeatureLock({ setting: lockFeatures?.teams?.assign_mode, value: assignMode });
                    }
                    if (typeof total === 'number') {
                        return isFeatureLock({ setting: lockFeatures?.teams?.total, value: total });
                    }
                    return false;
                },
                analytics: ({ operation }: { operation: string }) => {
                    return isFeatureLock({ setting: lockFeatures?.analytics?.widget?.operation, value: operation });
                },
                channels: ({ eachChannelCount }: { eachChannelCount: number }) => {
                    return isFeatureLock({ setting: lockFeatures?.channels?.each_channel_count, value: eachChannelCount });
                },
                credentials: ({ eachChannelCount }: { eachChannelCount: number }) => {
                    return isFeatureLock({ setting: lockFeatures?.channels?.each_channel_count, value: eachChannelCount });
                },
                workflows: ({
                    channelWorkflowCount,
                    dataBoardsAutomationOperation,
                    automationWorkflowOperation,
                }: {
                    channelWorkflowCount?: number;
                    dataBoardsAutomationOperation?: string;
                    automationWorkflowOperation?: string;
                }) => {
                    if (typeof channelWorkflowCount === 'number') {
                        return isFeatureLock({ setting: lockFeatures?.workflows?.channel_workflow?.count, value: channelWorkflowCount });
                    }
                    if (dataBoardsAutomationOperation) {
                        return isFeatureLock({
                            setting: lockFeatures?.workflows?.data_boards_automation?.operation,
                            value: dataBoardsAutomationOperation,
                        });
                    }
                    if (automationWorkflowOperation) {
                        return isFeatureLock({
                            setting: lockFeatures?.workflows?.automation_workflow?.operation,
                            value: automationWorkflowOperation,
                        });
                    }
                    return false;
                },
            },
        }),
        [role, modules, lockFeatures],
    );
};

export default useAccess;
