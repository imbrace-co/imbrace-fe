import { Button, Icon, Spin, Tabs, Typography, useDialog } from '@imbrace/ui';
import CloseIcon from '@mui/icons-material/Close';
import { AppBar, IconButton, Toolbar } from '@mui/material';
import type { SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FormProvider, useWatch } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

import aiAgentExportIcon from '@/assets/icons/ai_agent_export.svg';
import agentChildDiagram from '@/assets/images/ai_agent/agentChild.png';
import agentParentDiagram from '@/assets/images/ai_agent/agentParent.png';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { useNavBar } from '@/contexts/NavBarContext';
import { env } from '@/env';
import { agentTypeValue, useAIAssistantForm } from '@/pages/AIAssistantManagement/useAIAssistantFormHook';
import { useAppSelector } from '@/redux/store';
import { getChannelList } from '@/services/api/channel';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import styles from './useCaseDetail.module.scss';
import type { UseCaseProps } from './UseCaseItem';
import { useExportAIAgentDialog } from './useExportAIAgentDialog';
const TAB_VALUE = {
    DEMO: { title: 'preview', value: 'demo' },
    BASIC_INFOR: { title: 'ai_assistant_management_basic_info', value: 'basic' },
    BEHAVIOR_SETTING: { title: 'ai_assistant_management_behavior_setting', value: 'behavior' },
    KNOWLEDGE_SUPPORT: { title: 'ai_assistant_management_knowledge_support', value: 'knowledge' },
    ADVANCED_SETTINGS: { title: 'ai_agent_advanced_settings', value: 'advanced' },
};
const USE_CASE_TYPE = {
    DEFAULT: 'default',
    CUSTOM: 'custom',
};

const extractChannelIdFromDemoUrl = (url?: string): string | undefined => {
    if (!url) return;
    try {
        const parsed = new URL(url, window.location.origin);
        return (
            parsed.searchParams.get('channel_id') ?? parsed.searchParams.get('channel') ?? parsed.searchParams.get('channelId') ?? undefined
        );
    } catch {
        return;
    }
};

const UseCaseItemDetail = (props: {
    item?: UseCaseProps;
    agentType?: string;
    onClose?: () => void;
    setSelectedItem: (item: UseCaseProps) => void;
    refetchTemplateList: () => Promise<UseCaseProps[] | undefined>;
}) => {
    const { item, onClose, setSelectedItem, refetchTemplateList, agentType } = props;
    const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const { i18n } = useTranslation();
    const initialLang = useRef(i18n.language || 'en').current;
    const {
        _id,
        title,
        description,
        short_description,
        features,
        demo_url,
        suggestion_prompts,
        supported_channels,
        assistant_id,
        type,
        version,
        channel_id,
    } = item ?? {};

    const {
        renderBasicTab,
        renderBehaviorTab,
        renderKnowledgeHubTab,
        renderAdvancedTab,
        onSubmit,
        setTab: setTabAIAssistant,
        dialogHolder,
        exitForm,
        isValid,
        isDirty,
        loading,
        onRemoveAIAgent,
        isEnableStreaming,
        formMethods,
        openParent,
        isAgentSwitching,
        knowledgeBoards,
        databoards,
        folders,
        openKnowledgeFolderSelection,
        openDataboardSelection,
        editData,
    } = useAIAssistantForm({
        id: assistant_id,
        AIAgentId: _id,
        isDuplicate: false,
        isAIAgent: true,
        isUseCaseVersion2: version === 2,
        isCustomAIAgent: type === USE_CASE_TYPE.CUSTOM,
        supportedChannels:
            type === USE_CASE_TYPE.CUSTOM ? undefined : supported_channels?.map((channel) => channel.icon as API.ChannelType),
        onBack: () => {
            refetchTemplateList();
            onClose?.();
        },
        onCreateSuccess: async (createdId: string) => {
            const templateList = await refetchTemplateList();
            const createdTemplate = templateList?.find((templateItem) => templateItem._id === createdId);
            if (createdTemplate) {
                setSelectedItem(createdTemplate);
            }
        },
        onUpdateSuccess: async (updatedId: string) => {
            const templateList = await refetchTemplateList();
            const updatedTemplate = templateList?.find((templateItem) => templateItem._id === updatedId);
            if (updatedTemplate) {
                setSelectedItem(updatedTemplate);
            }
        },
    });
    const [searchParams] = useSearchParams();
    const initialTab =
        searchParams.get('tab') === 'behavior'
            ? TAB_VALUE.BEHAVIOR_SETTING.value
            : item
            ? TAB_VALUE.DEMO.value
            : TAB_VALUE.BASIC_INFOR.value;
    const [tab, setTab] = useState<string>(initialTab);
    const { t } = useTranslation();
    const iframeChatWidgetRef = useRef<HTMLIFrameElement | null>(null);
    const isAllowModify = getIsAllowModify();
    const isStreamingRef = useRef(false);
    const isIframeReady = useRef(false);
    const workflowId = (editData as any)?.metadata?.workflow_id ?? (editData as any)?.workflow_id;
    const [webWidgetChannel, setWebWidgetChannel] = useState<API.Channel | undefined>(undefined);
    const [webWidgetChannelLoading, setWebWidgetChannelLoading] = useState(false);
    const [{ dialog: exportDialog }, exportDialogHolder] = useDialog();
    const { canExport, openExportDialog } = useExportAIAgentDialog({ dialog: exportDialog, id: _id, name: title });

    const derivedWorkflowId = workflowId || webWidgetChannel?.workflow_id;
    const derivedWorkflowName = editData?.workflow_name || webWidgetChannel?.name;
    const workflowDisplayName = derivedWorkflowName || t('workflow');
    const effectiveChannelId = channel_id || extractChannelIdFromDemoUrl(demo_url);
    const workflowHref = derivedWorkflowId
        ? (webWidgetChannel as any)?.version === 2
            ? `/workflow-v2?flowId=${encodeURIComponent(String(derivedWorkflowId))}`
            : `/workflow/channels/${encodeURIComponent(String(derivedWorkflowId))}`
        : undefined;
    // Without a host the template literal yields "undefined/?..." — a relative
    // URL that nginx's SPA fallback answers with index.html, so the iframe
    // re-embeds this very app (and NotFound bounces it back to /ai-agent with
    // the query string intact, nesting forever). Render nothing instead.
    const chatHost = env.VITE_APP_INTERNAL_AI_CHAT_HOST;
    const demoIframeSrc =
        assistant_id && chatHost
            ? `${chatHost}/?imbraceToken=${token}&organizationId=${organizationId}&lang=${initialLang}&isAgentDemo=true&agentId=${assistant_id}`
            : undefined;

    const { isSmallNavBar, setIsNavBarAutoExpand } = useNavBar();
    const { control } = formMethods;
    const { setValue, getValues } = formMethods;

    useEffect(() => {
        if (initialTab === TAB_VALUE.BEHAVIOR_SETTING.value) {
            setTabAIAssistant(initialTab as any);
        }
    }, [initialTab, setTabAIAssistant]);

    useEffect(() => {
        setValue('agent_type', agentTypeValue.agent);
        setValue('is_orchestrator', false);
    }, [agentType, setValue]);

    const isOrchesValue = useWatch({
        control,
        name: 'is_orchestrator',
    });
    const subAgents = useWatch({
        control,
        name: 'sub_agents',
    });
    const leadBy = useWatch({
        control,
        name: 'team_leads',
    });
    const boardIds = useWatch({
        control,
        name: 'board_ids',
    });
    const folderIds = useWatch({
        control,
        name: 'folder_ids',
    });
    useEffect(() => {
        setValue('agent_type', isOrchesValue ? agentTypeValue.teamLead : agentTypeValue.agent);
    }, [isOrchesValue, setValue]);

    const isOrchestrator = getValues('agent_type') === agentTypeValue.teamLead;
    const AIAgentTabs = [
        { value: TAB_VALUE.BASIC_INFOR.value, label: t(TAB_VALUE.BASIC_INFOR.title) },
        {
            value: TAB_VALUE.BEHAVIOR_SETTING.value,
            label: t(TAB_VALUE.BEHAVIOR_SETTING.title),
        },
        {
            value: TAB_VALUE.KNOWLEDGE_SUPPORT.value,
            label: t(TAB_VALUE.KNOWLEDGE_SUPPORT.title),
            disabled: loading,
        },
        {
            value: TAB_VALUE.ADVANCED_SETTINGS.value,
            label: t(TAB_VALUE.ADVANCED_SETTINGS.title),
        },
        { value: TAB_VALUE.DEMO.value, label: t(TAB_VALUE.DEMO.title), disabled: !item },
    ];

    const onSwitchTab = (tab_value: string): void => {
        setTab(tab_value);
        if (tab_value !== TAB_VALUE.BASIC_INFOR.value) {
            setTabAIAssistant(tab_value as any);
        }
    };

    // If user was previously on removed tab, fallback
    useEffect(() => {
        if (tab === 'multi_agent') {
            setTab(TAB_VALUE.ADVANCED_SETTINGS.value);
        }
    }, [tab]);

    useEffect(() => {
        isStreamingRef.current = isEnableStreaming;
    }, [isEnableStreaming]);

    useEffect(() => {
        if (!effectiveChannelId) {
            setWebWidgetChannel(undefined);
            return;
        }

        let cancelled = false;
        const fetchWebWidgetChannel = async () => {
            setWebWidgetChannelLoading(true);
            try {
                const api = getChannelList.api('web');
                const { data } = await apiFetch<{ data: API.Channel[] }>(api, getChannelList.method);
                if (cancelled) return;

                const matched = (data?.data ?? []).find(
                    (c) => c._id === effectiveChannelId || c.id === effectiveChannelId || c.public_id === effectiveChannelId,
                );
                setWebWidgetChannel(matched);
            } catch {
                if (!cancelled) setWebWidgetChannel(undefined);
            } finally {
                if (!cancelled) setWebWidgetChannelLoading(false);
            }
        };

        fetchWebWidgetChannel();
        return () => {
            cancelled = true;
        };
    }, [effectiveChannelId]);

    useEffect(() => {
        const iframe = iframeChatWidgetRef.current;
        if (!iframe) return;

        const TARGET_ORIGIN = '*';

        const postOnce = (payload: any) => {
            const cw = iframe.contentWindow;
            if (!cw) return false;
            try {
                cw.postMessage(payload, TARGET_ORIGIN);
                return true;
            } catch {
                return false;
            }
        };

        const postWithRetry = (payload: any, maxAttempts = 10, baseDelayMs = 50) => {
            let attempts = 0;
            const trySend = () => {
                attempts += 1;
                if (postOnce(payload)) return;
                if (attempts < maxAttempts) {
                    const delay = baseDelayMs * Math.min(8, attempts);
                    setTimeout(trySend, delay);
                }
            };
            trySend();
        };

        const postAll = () => {
            postWithRetry({ theme: 'ai-agent', suggestion_prompts });
            postWithRetry({ assistantId: assistant_id });
        };

        if (isIframeReady.current && isEnableStreaming) {
            postWithRetry({ enableStreaming: true });
        }

        const handleMessageFromChild = (event: MessageEvent) => {
            if (event.data?.action === 'READY') {
                isIframeReady.current = true;
                postAll();
                if (isStreamingRef.current || isEnableStreaming) {
                    postWithRetry({ enableStreaming: true });
                }
            }
        };
        window.addEventListener('message', handleMessageFromChild);

        return () => {
            window.removeEventListener('message', handleMessageFromChild);
        };
    }, [tab, suggestion_prompts, isEnableStreaming, assistant_id]);

    const backToList = () => {
        setIsNavBarAutoExpand(true);
        exitForm();
    };
    const executeSave = () => {
        onSubmit();
    };

    const agentChildQuantity = subAgents?.filter((subAgent) => !subAgent.is_new)?.length;

    return (
        <>
            {dialogHolder}
            {exportDialogHolder}
            <FormProvider {...formMethods}>
                <AppBar
                    position="sticky"
                    sx={{
                        backgroundColor: '#FA9917',
                        boxShadow: 'none',
                        borderBottom: '1px solid var(--color-light-3)',
                    }}
                >
                    <Toolbar sx={{ justifyContent: 'flex-end', minHeight: '50px !important', paddingRight: '10px!important' }}>
                        <IconButton
                            onClick={backToList}
                            sx={{
                                color: '#fff',
                                alignSelf: 'end',
                                display: 'unset!important',
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>
                <div className={styles.container} style={{ width: `calc(100vw - ${isSmallNavBar ? 60 : 208}px`, position: 'relative' }}>
                    <div className={styles.sidebar}>
                        <h3>{title || t('ai_agent_custom_title')}</h3>
                        <p>{description || short_description || t('ai_agent_custom_desc')}</p>
                        {type === USE_CASE_TYPE.DEFAULT && (
                            <section>
                                {features && features.length > 0 && (
                                    <>
                                        <h3>{t('ai_agent_feature')}</h3>
                                        <div className={styles.featureList}>
                                            {features?.map((feature, key) => (
                                                <div key={key}>
                                                    <svg
                                                        width="20px"
                                                        height="20px"
                                                        viewBox="0 0 20 20"
                                                        fill="none"
                                                        xmlns="http://www.w3.org/2000/svg"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            clipRule="evenodd"
                                                            d="M6.6665 7.50033L1.6665 6.66699L4.1665 15.0003H15.8332L18.3332 6.66699L13.3332 7.50033L9.99984 1.66699L6.6665 7.50033ZM9.99984 5.02627L7.53761 9.33517L4.03171 8.75085L5.40656 13.3337H14.5931L15.968 8.75085L12.4621 9.33517L9.99984 5.02627Z"
                                                            fill="#FA9917"
                                                        />
                                                        <path d="M4.1665 16.667H15.8332V18.3337H4.1665V16.667Z" fill="#FA9917" />
                                                    </svg>

                                                    <span>{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                                {/* {integrations && integrations.length > 0 && (
                                    <div className={styles.iconContainer}>
                                        <h3>{t('ai_agent_integrations')}</h3>
                                        {renderIntegrations()}
                                    </div>
                                )} */}
                            </section>
                        )}
                        {(isOrchestrator || (subAgents?.length || 0) > 0) && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={agentParentDiagram} alt="orchestrator diagram" style={{ width: '190px' }} />

                                <Typography
                                    style={{
                                        marginTop: '15px',
                                        color: '#828282',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Trans
                                        i18nKey="ai_orchestrator_coordinates_ai_agent"
                                        values={{ count: agentChildQuantity }}
                                        components={[
                                            <span
                                                style={{
                                                    color: '#156DF2',
                                                    fontWeight: 800,
                                                }}
                                            />,
                                        ]}
                                    />
                                </Typography>
                            </div>
                        )}
                        {!isAgentSwitching && !isOrchestrator && (leadBy?.length || 0) > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={agentChildDiagram} alt="agent diagram" style={{ width: '230px' }} />

                                <Typography
                                    style={{
                                        marginTop: '30px',
                                        color: '#828282',
                                    }}
                                >
                                    Under the orchestration of{' '}
                                    {leadBy?.map((leader, index) => (
                                        <span key={leader.assistant_id || leader.name || index}>
                                            {' '}
                                            {index > 0 && 'and'}{' '}
                                            <button
                                                type="button"
                                                style={{
                                                    fontWeight: 800,
                                                    color: '#4F4F4F',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    padding: 0,
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => leader.assistant_id && openParent(leader.assistant_id)}
                                            >
                                                {' '}
                                                {leader.name}
                                            </button>{' '}
                                        </span>
                                    ))}
                                </Typography>
                            </div>
                        )}
                        {/* Workflow (Web Widget) */}
                        <div style={{ marginTop: '20px' }}>
                            <Typography variant="BodyBold" style={{ fontSize: '14px', color: '#4F4F4F', marginBottom: '8px' }}>
                                {t('ai_agent_workflow_web_widget')}
                            </Typography>
                            {loading || webWidgetChannelLoading ? (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div
                                        style={{
                                            width: '18px',
                                            marginRight: '8px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            marginTop: '8px',
                                        }}
                                    >
                                        <Spin isSpinning />
                                    </div>
                                </div>
                            ) : derivedWorkflowId || derivedWorkflowName ? (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span
                                        style={{
                                            width: 26,
                                            height: 26,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flex: '0 0 26px',
                                            marginRight: '8px',
                                        }}
                                    >
                                        <Icon name="deviceHub" fontSize={26} style={{ color: '#156DF2' }} />
                                    </span>
                                    {derivedWorkflowId ? (
                                        <a
                                            href={workflowHref}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ color: '#2F80ED', fontSize: '14px', textDecoration: 'none' }}
                                        >
                                            {workflowDisplayName}
                                        </a>
                                    ) : (
                                        <span style={{ color: '#2F80ED', fontSize: '14px' }}>{workflowDisplayName}</span>
                                    )}
                                </div>
                            ) : (
                                <Typography variant="Body" style={{ color: '#828282', fontSize: '14px' }}>
                                    {t('ai_agent_no_workflow_data')}
                                </Typography>
                            )}
                        </div>

                        {/* Linked Resources */}
                        <div style={{ marginTop: '32px' }}>
                            <Typography variant="BodyBold" style={{ fontSize: '14px', color: '#4F4F4F', marginBottom: '8px' }}>
                                {t('ai_agent_linked_resources')}
                            </Typography>
                            {loading ? (
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <div
                                        style={{
                                            width: '18px',
                                            marginRight: '8px',
                                            marginTop: '8px',
                                            display: 'flex',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Spin isSpinning />
                                    </div>
                                </div>
                            ) : (folderIds && folderIds.length > 0) || (boardIds && boardIds.length > 0) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(folderIds || []).map((folderId) => {
                                        const folder = folders?.find((f) => (f as any)._id === folderId);
                                        return (
                                            <span
                                                key={folderId}
                                                onClick={() => openKnowledgeFolderSelection(folderId)}
                                                style={{
                                                    color: '#2F80ED',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                {(folder as any)?.name || folderId}
                                            </span>
                                        );
                                    })}
                                    {(boardIds || []).map((boardId) => {
                                        const board = [...knowledgeBoards, ...databoards].find((b) => b.id === boardId);
                                        const isKnowledgeBoard = board?.type === 'KnowledgeHub';
                                        const onClick = () =>
                                            isKnowledgeBoard
                                                ? openKnowledgeFolderSelection(undefined, boardId)
                                                : openDataboardSelection(boardId);
                                        return (
                                            <span
                                                key={boardId}
                                                onClick={onClick}
                                                style={{
                                                    color: '#2F80ED',
                                                    fontSize: '14px',
                                                    cursor: 'pointer',
                                                    textDecoration: 'underline',
                                                }}
                                            >
                                                {board?.name || boardId}
                                            </span>
                                        );
                                    })}
                                </div>
                            ) : (
                                <Typography variant="Body" style={{ color: '#828282', fontSize: '14px' }}>
                                    {t('ai_agent_no_linked_resources')}
                                </Typography>
                            )}
                        </div>
                    </div>
                    <div className={styles.content}>
                        {canExport && (
                            <button
                                type="button"
                                className={styles.exportIconBtn}
                                onClick={() => openExportDialog()}
                                aria-label={t('ai_agent_use_case_menu_export')}
                                title={t('ai_agent_use_case_menu_export')}
                            >
                                <img className={styles.exportIconImg} src={aiAgentExportIcon} alt="" aria-hidden="true" />
                            </button>
                        )}
                        <div className={styles.tabsContainer}>
                            <div className={styles.tabsRow}>
                                <Tabs
                                    currentTab={tab}
                                    tabs={AIAgentTabs}
                                    onChange={(event: SyntheticEvent, newValue: any) => onSwitchTab(newValue)}
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>
                        {tab === TAB_VALUE.DEMO.value && (
                            <div className={styles.tabContent}>
                                <div className={styles.contentInner}>
                                    {demoIframeSrc ? (
                                        <iframe
                                            ref={iframeChatWidgetRef}
                                            src={demoIframeSrc}
                                            sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-top-navigation"
                                            allow="clipboard-read; clipboard-write"
                                            scrolling="no"
                                            title="Embedded Page"
                                            className={styles.demoIframe}
                                        />
                                    ) : (
                                        <Typography variant="Body" style={{ color: '#828282', padding: '64px 0', textAlign: 'center' }}>
                                            {t(
                                                'ai_agent_preview_unavailable',
                                                'Preview is unavailable — the embedded AI chat host is not configured.',
                                            )}
                                        </Typography>
                                    )}
                                </div>
                            </div>
                        )}
                        {tab === TAB_VALUE.BASIC_INFOR.value && (
                            <div className={`${styles.tabContent} ${styles.matchContentHeigh} ${!isAllowModify && styles.viewOnly}`}>
                                {renderBasicTab()}
                            </div>
                        )}
                        {(tab === TAB_VALUE.BEHAVIOR_SETTING.value ||
                            tab === TAB_VALUE.KNOWLEDGE_SUPPORT.value ||
                            tab === TAB_VALUE.ADVANCED_SETTINGS.value) && (
                            <div className={`${styles.tabContent} ${!isAllowModify && styles.noPermission}`}>
                                {tab === TAB_VALUE.BEHAVIOR_SETTING.value && renderBehaviorTab()}
                                {tab === TAB_VALUE.KNOWLEDGE_SUPPORT.value && renderKnowledgeHubTab()}
                                {tab === TAB_VALUE.ADVANCED_SETTINGS.value && renderAdvancedTab()}
                            </div>
                        )}
                    </div>
                </div>
                <div
                    className={styles.bottomButton}
                    style={{ width: `calc(100vw - ${isSmallNavBar ? 60 : 208}px)`, left: `${isSmallNavBar ? 60 : 208}px)` }}
                >
                    <div>
                        <Button text={t('back')} variant="outlined" onClick={() => backToList()} />
                        {type === USE_CASE_TYPE.CUSTOM && (
                            <Button
                                disabled={loading || !isAllowModify || (leadBy?.length || 0) > 0}
                                text={t('delete')}
                                type="danger"
                                onClick={() => onRemoveAIAgent()}
                            />
                        )}
                    </div>
                    <Button
                        loading={loading}
                        disabled={item && (!isValid || loading || !isDirty)}
                        text={item ? t('save') : t('create')}
                        variant="contained"
                        onClick={() => executeSave()}
                    />
                </div>
            </FormProvider>
        </>
    );
};

export default UseCaseItemDetail;
