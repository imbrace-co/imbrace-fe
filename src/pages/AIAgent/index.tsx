import { Button, Typography, useDialog } from '@imbrace/ui';
import type { CSSProperties } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import agentIcon from '@/assets/icons/ai_agent.svg';
import documentAIIcon from '@/assets/icons/ai_agent_document_ai.svg';
import aiAgentThumb from '@/assets/illustration/ai-agent-thumb.svg';
import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { useNavBar } from '@/contexts/NavBarContext';
import { useNotify } from '@/contexts/SnackbarContext';
import { env } from '@/env';
import useDebounce from '@/hooks/useDebounce';
import { useAppSelector } from '@/redux/store';
import { getTemplates } from '@/services/api/ai';
import apiFetch from '@/services/axios/handler';
import { warmupActivePiecesIframe } from '@/services/activepieces/warmup';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import ImportAIAgentDialog from './components/ImportAIAgentDialog';
import MyAITab from './components/MyAI/MyAITab';
import DetailModalContainer from './components/useCaseDetailModalContainer';
import type { UseCaseProps } from './components/UseCaseItem';
import styles from './index.module.scss';
export enum AI_TYPE {
    AGENT = 'agent',
    DOCUMENT_AI = 'document_ai',
}

const AIAgent = () => {
    const [templates, setTemplates] = useState<Array<UseCaseProps>>([]);
    const [searchAiAgentInput, setSearchAiAgentInput] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<UseCaseProps | undefined>(undefined);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [hasLoadedInitialData, setHasLoadedInitialData] = useState<boolean>(false);
    const { t } = useTranslation();
    const [{ dialog }, dialogHolder] = useDialog();

    const debouncedSearchInput = useDebounce(searchAiAgentInput, 300);
    const isAllowCreateNew = getIsAllowModify();
    const { setIsSmallNavBar, setIsNavBarAutoExpand } = useNavBar();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { notify } = useNotify();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    const baseUrl = token && organizationId ? `${env.VITE_APP_ACTIVEPIECES_DOMAIN}/projects?token=${token}&organizationId=${organizationId}` : '';
    const processedNavBarId = useRef<string | null>(null);

    const documentAIItems = templates.filter((tpl) => tpl.agent_type === 'document_ai' && !tpl.assistant_id?.startsWith('builtin-'));

    const [selectedCreateType, setSelectedCreateType] = useState<AI_TYPE>(AI_TYPE.AGENT);

    const agentTypeItemStyles: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '0 10px',
        alignItems: 'center',
    };
    const agentTypeContentStyles: CSSProperties = {
        color: '#828282',
        maxWidth: '200px',
        margin: '23px 0',
        textAlign: 'center',
        lineHeight: '16px',
    };

    useEffect(() => {
        if (!baseUrl) return;
        warmupActivePiecesIframe(baseUrl);
    }, [baseUrl]);

    const getTemplateList = useCallback(async () => {
        try {
            const searchParams = new URLSearchParams();
            if (debouncedSearchInput) {
                searchParams.append('title', debouncedSearchInput);
            }
            const { data } = await apiFetch<{ data: Array<UseCaseProps> }>(getTemplates.api, getTemplates.method, searchParams);
            setTemplates(data.data);
            return data.data;
        } catch (error) {
            console.error('fetch templates error: ', error);
        }
    }, [debouncedSearchInput]);

    useEffect(() => {
        getTemplateList();
    }, [getTemplateList]);

    useEffect(() => {
        if (id) {
            getTemplateList().finally(() => {
                setHasLoadedInitialData(true);
            });
        } else {
            setHasLoadedInitialData(false);
        }
    }, [getTemplateList, id]);

    useEffect(() => {
        if (!id) {
            processedNavBarId.current = null;
        }
    }, [id]);

    useEffect(() => {
        if (id && hasLoadedInitialData) {
            const documentAI = documentAIItems.find((item) => item._id === id);
            if (documentAI) {
                setSelectedItem(documentAI);
                setIsOpen(true);
                if (processedNavBarId.current !== id) {
                    setIsSmallNavBar(true);
                    setIsNavBarAutoExpand(false);
                    processedNavBarId.current = id;
                }
                setSelectedCreateType(AI_TYPE.DOCUMENT_AI);
                return;
            }

            const agent = templates.find((template) => template._id === id && template.agent_type !== 'document_ai');
            if (agent) {
                setSelectedItem(agent);
                setIsOpen(true);
                if (processedNavBarId.current !== id) {
                    setIsSmallNavBar(true);
                    setIsNavBarAutoExpand(false);
                    processedNavBarId.current = id;
                }
                setSelectedCreateType(AI_TYPE.AGENT);
                return;
            }

            notify({
                type: 'error',
                message: 'AI Agent not found or you may not have access to this organization.',
            });

            navigate('/ai-agent');
        }
    }, [documentAIItems, hasLoadedInitialData, id, navigate, notify, setIsNavBarAutoExpand, setIsSmallNavBar, templates]);

    const showImportAIAgentDialog = () => {
        dialog({
            title: t('ai_agent_import_dialog_title'),
            content: ({ onClose }) => (
                <ImportAIAgentDialog
                    onClose={onClose}
                    onInstalled={async () => {
                        await getTemplateList();
                    }}
                />
            ),
            hideConfirmButton: true,
            hideCancelButton: true,
            showCloseButton: true,
            paperSx: { width: 600, maxWidth: 600 },
        });
    };

    const showCreateAIDialog = () => {
        const colStyle: CSSProperties = {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 28px',
            gap: 16,
        };
        const descStyle: CSSProperties = {
            color: '#6B7280',
            fontSize: 14,
            lineHeight: 1.5,
            maxWidth: 220,
        };
        const dividerStyle: CSSProperties = {
            width: 1,
            background: 'rgba(0,0,0,0.08)',
            alignSelf: 'stretch',
        };
        const startCreate = (type: AI_TYPE, onClose?: () => void) => {
            setIsOpen(true);
            setSelectedItem(undefined);
            setIsSmallNavBar(true);
            setSelectedCreateType(type);
            onClose?.();
        };

        dialog({
            title: '',
            paperSx: {
                maxWidth: '1100px',
                width: '90vw',
                padding: '28px 40px 36px',
            },
            content: ({ onClose }) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <Typography
                        variant="Heading2"
                        style={{ textAlign: 'center', fontSize: 20, fontWeight: 700 }}
                    >
                        {t(
                            'ai_agent_modal_what_type',
                            'What type of AI would you like to create?',
                        )}
                    </Typography>

                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            alignItems: 'stretch',
                        }}
                    >
                        {/* General Agent */}
                        <div style={colStyle}>
                            <img src={agentIcon} alt="General Agent" style={{ width: 48 }} />
                            <Typography variant="Body" style={descStyle}>
                                {t(
                                    'ai_agent_modal_desc',
                                    'Create a smart AI agent that performs tasks and interacts autonomously',
                                )}
                            </Typography>
                            <Button
                                variant="outlined"
                                text={t('ai_agent_modal_general_agents', 'General Agents')}
                                onClick={() => startCreate(AI_TYPE.AGENT, onClose)}
                                sx={{ width: '100%', marginTop: 'auto' }}
                            />
                        </div>

                        <div style={dividerStyle} />

                        {/* Document AI */}
                        <div style={colStyle}>
                            <img src={documentAIIcon} alt="Document AI" style={{ width: 48 }} />
                            <Typography variant="Body" style={descStyle}>
                                {t(
                                    'ai_agent_document_ai_modal_desc',
                                    'Create document intelligence to automatically transform documents into structured data.',
                                )}
                            </Typography>
                            <Button
                                variant="outlined"
                                text={t('ai_agent_modal_doc_agents', 'Doc Agents')}
                                onClick={() => startCreate(AI_TYPE.DOCUMENT_AI, onClose)}
                                sx={{ width: '100%', marginTop: 'auto' }}
                            />
                        </div>
                    </div>
                </div>
            ),
            hideConfirmButton: true,
            hideCancelButton: true,
            showCloseButton: true,
        });
    };

    return (
        <>
            {dialogHolder}
            <div className={styles.aiContainer}>
                <div className={styles.heroBanner}>
                    <div className={styles.heroContent}>
                        <Typography variant="Heading1" className={styles.heroTitle}>
                            {t('ai_agent_hero_title_top', 'AI-DRIVEN')}
                        </Typography>
                        <Typography variant="Heading1" className={styles.heroTitle}>
                            {t('ai_agent_hero_title_bottom', 'PRODUCTIVITY AT SCALE')}
                        </Typography>
                        <Typography variant="Body" className={styles.heroSubtitle}>
                            {t(
                                'ai_agent_hero_subtitle',
                                'Built to automate, designed to empower. Explore our suite of intelligent assistants tailored for your business needs.',
                            )}
                        </Typography>
                    </div>
                    <img src={aiAgentThumb} alt="AI agent" className={styles.heroThumb} />
                </div>

                <div className={styles.tabContent}>
                    <MyAITab
                        searchInput={searchAiAgentInput}
                        onSearchInputChange={setSearchAiAgentInput}
                        templates={templates}
                        onSelectTemplate={(itemId) => navigate(`/ai-agent/${itemId}`)}
                        onRemovedTemplate={getTemplateList}
                        onImport={showImportAIAgentDialog}
                        onCreateNew={showCreateAIDialog}
                        isAllowCreateNew={isAllowCreateNew}
                    />
                </div>

                <Outlet />
            </div>
            <DetailModalContainer
                item={selectedItem}
                isOpen={isOpen}
                handleClose={() => {
                    setIsSmallNavBar(false);
                    setIsOpen(false);
                    if (id) {
                        navigate('/ai-agent');
                    }
                }}
                refetchTemplateList={getTemplateList}
                refetchDocumentAIList={getTemplateList}
                setSelectedItem={setSelectedItem}
                selectedType={selectedCreateType}
            />
        </>
    );
};

export default AIAgent;
