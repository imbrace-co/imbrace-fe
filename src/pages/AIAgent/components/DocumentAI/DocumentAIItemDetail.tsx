import { Button, Space, Typography } from '@imbrace/ui';
import CloseIcon from '@mui/icons-material/Close';
import { AppBar, IconButton, Toolbar } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { useNavBar } from '@/contexts/NavBarContext';
import { env } from '@/env';
import { useAppSelector } from '@/redux/store';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import type { UseCaseProps } from '../UseCaseItem';
import styles from './documentAIItemDetail.module.scss';
import SetupProgress, { type SetupStep } from './SetupProgress';
import type { LinkageView, LinkedSchema } from './type';
import { DOCUMENT_AI_STEPS, DocumentAIManagementTab, useDocumentAIForm } from './useDocumentAIFormHook';

const STEP_LABEL_KEY: Record<string, string> = {
    [DocumentAIManagementTab.Basics]: 'ai_assistant_management_basic_info',
    [DocumentAIManagementTab.Linkage]: 'ai_document_ai_linkage_title',
    [DocumentAIManagementTab.Advanced]: 'ai_document_ai_advanced_settings',
    [DocumentAIManagementTab.Knowledge]: 'ai_assistant_management_knowledge_support',
    [DocumentAIManagementTab.Preview]: 'ai_document_ai_preview_test',
};

const DocumentAIItemDetail = (props: {
    item?: UseCaseProps;
    onClose?: () => void;
    setSelectedItem: (item: any) => void;
    refetchDocumentAIList: () => Promise<UseCaseProps[] | undefined>;
}) => {
    const { item, onClose, setSelectedItem, refetchDocumentAIList } = props;
    const { _id: document_ai_config_id, assistant_id, title: name } = item ?? {};
    const { isSmallNavBar, setIsNavBarAutoExpand } = useNavBar();
    const {
        formMethods,
        renderBasicTab,
        renderLinkageTab,
        renderAdvancedTab,
        renderKnowledgeTab,
        onSubmit,
        onDelete,
        tab,
        setTab,
        linkageView,
        setLinkageView,
        dialogHolder,
        exitForm,
        removeLinkedSchema,
        loading,
    } = useDocumentAIForm({
        id: assistant_id,
        useCaseId: document_ai_config_id,
        demoUrl: (item as any)?.demo_url,
        onBack: () => {
            refetchDocumentAIList();
            onClose?.();
        },
        onCreateSuccess: async (createdId: string) => {
            const list = await refetchDocumentAIList();
            const created = list?.find((i) => i._id === createdId);
            if (created) setSelectedItem(created);
        },
        onUpdateSuccess: async (updatedId: string) => {
            const list = await refetchDocumentAIList();
            const updated = list?.find((i) => i._id === updatedId);
            if (updated) setSelectedItem(updated);
        },
    });

    const { t, i18n } = useTranslation();
    const isAllowModify = getIsAllowModify();
    const iframeChatWidgetRef = useRef<HTMLIFrameElement>(null);
    const token = window.localStorage.getItem(IMBRACE_ACCESS_TOKEN);
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const initialLang = useRef(i18n.language || 'en').current;

    const isCreateMode = !item;
    const steps: SetupStep[] = useMemo(() => DOCUMENT_AI_STEPS.map((value) => ({ value, label: t(STEP_LABEL_KEY[value]) })), [t]);
    const currentIndex = steps.findIndex((s) => s.value === tab);
    const isLastStep = currentIndex === steps.length - 1;

    const [furthestIndex, setFurthestIndex] = useState(isCreateMode ? 0 : steps.length - 1);
    useEffect(() => {
        if (!isCreateMode) setFurthestIndex(steps.length - 1);
    }, [isCreateMode, steps.length]);
    useEffect(() => {
        setFurthestIndex((prev) => Math.max(prev, currentIndex));
    }, [currentIndex]);

    const linkedSchemas = (formMethods.watch('linked_schemas') as LinkedSchema[]) || [];
    const watchedName = formMethods.watch('name');
    // Where the footer "Back" goes inside the Linkage step:
    //  - a sub-view (select-list / auto-upload / …) → the selected-schemas overview when
    //    schemas exist, otherwise the 3-option "choose" screen;
    //  - the choose screen → overview when schemas exist, else fall through to prev step.
    // `null` means "no in-Linkage target" → go to the previous wizard step.
    let linkageBackTarget: LinkageView | null = null;
    if (tab === DocumentAIManagementTab.Linkage) {
        if (linkageView === 'choose') {
            linkageBackTarget = linkedSchemas.length > 0 ? 'overview' : null;
        } else if (linkageView !== 'overview') {
            linkageBackTarget = linkedSchemas.length > 0 ? 'overview' : 'choose';
        }
    }
    const showFooterBack = (isCreateMode && currentIndex > 0) || linkageBackTarget !== null;
    const isDirty = formMethods.formState.isDirty;

    // Guard the host as well as the id: without it the literal becomes
    // "undefined/?..." — a relative URL, which is truthy here and would pass
    // the check below, then load this app inside itself via the SPA fallback.
    const chatHost = env.VITE_APP_INTERNAL_AI_CHAT_HOST;
    const previewSrc =
        assistant_id && chatHost
            ? `${chatHost}/?imbraceToken=${token}&organizationId=${organizationId}&lang=${initialLang}&isAgentDemo=true&agentId=${assistant_id}`
            : '';

    const backToList = () => {
        setIsNavBarAutoExpand(true);
        exitForm();
    };

    // Validate the current step before allowing forward navigation (create mode).
    // Linkage step is optional — agents can be created without any linked schema.
    const validateCurrentStep = async (): Promise<boolean> => {
        if (tab === DocumentAIManagementTab.Basics) {
            return formMethods.trigger(['name', 'vlm_model', 'llm_model']);
        }
        if (tab === DocumentAIManagementTab.Advanced) {
            return formMethods.trigger(['source_languages']);
        }
        return true;
    };

    const goToStep = async (value: string, index: number) => {
        // Going backward is always allowed; forward requires validation in create mode
        if (index > currentIndex && isCreateMode) {
            const ok = await validateCurrentStep();
            if (!ok) return;
        }
        setTab(value as DocumentAIManagementTab);
    };

    const handleNext = async () => {
        if (isLastStep) {
            onSubmit();
            return;
        }
        const ok = await validateCurrentStep();
        if (!ok) return;
        // On Knowledge Support (last step before Preview) in create mode, save the
        // agent first (creates it server-side so Preview iframe has a real
        // assistant_id), then jump straight to the Preview & Test tab.
        if (isCreateMode && tab === DocumentAIManagementTab.Knowledge) {
            await onSubmit();
            const previewIndex = steps.findIndex((s) => s.value === DocumentAIManagementTab.Preview);
            if (previewIndex >= 0) {
                setFurthestIndex((prev) => Math.max(prev, previewIndex));
                setTab(DocumentAIManagementTab.Preview);
            }
            return;
        }
        const nextIndex = currentIndex + 1;
        setFurthestIndex((prev) => Math.max(prev, nextIndex));
        setTab(steps[nextIndex].value as DocumentAIManagementTab);
    };

    const primaryButtonText = () => {
        if (!isCreateMode) return t('save');
        if (isLastStep) return t('ai_document_ai_deploy_agent');
        if (tab === DocumentAIManagementTab.Knowledge) return t('ai_document_ai_confirm_and_test');
        return t('next');
    };

    return (
        <>
            {dialogHolder}
            <AppBar
                position="sticky"
                sx={{
                    backgroundColor: '#FA9917',
                    boxShadow: 'none',
                    borderBottom: '1px solid var(--color-light-3)',
                }}
            >
                <Toolbar sx={{ justifyContent: 'flex-end', minHeight: '50px !important', paddingRight: '10px!important' }}>
                    <IconButton onClick={backToList} sx={{ color: '#fff', alignSelf: 'end', display: 'unset!important' }}>
                        <CloseIcon />
                    </IconButton>
                </Toolbar>
            </AppBar>

            <div className={styles.container} style={{ width: `calc(100vw - ${isSmallNavBar ? 60 : 208}px` }}>
                <SetupProgress
                    agentName={watchedName || name || (isCreateMode ? 'Doc Agent' : '')}
                    steps={steps}
                    currentValue={tab}
                    furthestIndex={furthestIndex}
                    onStepClick={goToStep}
                    linkedSchemas={linkedSchemas}
                    onRemoveSchema={removeLinkedSchema}
                    isEditMode={!isCreateMode}
                    description={formMethods.watch('description') || (item as any)?.short_description || ''}
                    onDelete={!isCreateMode ? () => onDelete() : undefined}
                    deleteDisabled={loading || !isAllowModify}
                />

                <div className={styles.content}>
                    {tab === DocumentAIManagementTab.Basics && (
                        <div className={`${styles.tabContent} ${!isAllowModify ? styles.viewOnly : ''}`}>{renderBasicTab()}</div>
                    )}
                    {tab === DocumentAIManagementTab.Linkage && (
                        <div className={`${styles.tabContent} ${!isAllowModify ? styles.viewOnly : ''}`}>{renderLinkageTab()}</div>
                    )}
                    {tab === DocumentAIManagementTab.Advanced && (
                        <div className={`${styles.tabContent} ${!isAllowModify ? styles.viewOnly : ''}`}>{renderAdvancedTab()}</div>
                    )}
                    {tab === DocumentAIManagementTab.Knowledge && (
                        <div className={`${styles.tabContent} ${!isAllowModify ? styles.viewOnly : ''}`}>{renderKnowledgeTab()}</div>
                    )}
                    {tab === DocumentAIManagementTab.Preview && (
                        <div className={styles.tabContent} style={{ display: 'flex', flexDirection: 'column' }}>
                            {previewSrc ? (
                                <iframe
                                    ref={iframeChatWidgetRef}
                                    src={previewSrc}
                                    sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-top-navigation"
                                    scrolling="no"
                                    title="Document AI Preview"
                                    style={{ width: '100%', flex: 1, border: 'none', minHeight: 0 }}
                                />
                            ) : (
                                <Space
                                    justify="center"
                                    align="center"
                                    style={{ paddingTop: '64px', minHeight: '300px' }}
                                    direction="vertical"
                                >
                                    <Typography variant="Body" style={{ color: '#828282' }}>
                                        {t('ai_document_ai_preview_after_deploy')}
                                    </Typography>
                                </Space>
                            )}
                        </div>
                    )}

                    {tab !== DocumentAIManagementTab.Preview && (
                        <div className={styles.bottomButton}>
                            <div>
                                {showFooterBack && (
                                    <Button
                                        text={t('back')}
                                        variant="outlined"
                                        onClick={() => {
                                            if (linkageBackTarget) {
                                                setLinkageView(linkageBackTarget);
                                            } else {
                                                setTab(steps[currentIndex - 1].value as DocumentAIManagementTab);
                                            }
                                        }}
                                    />
                                )}
                            </div>
                            <Button
                                loading={loading}
                                disabled={loading || !isAllowModify || (!isCreateMode && !isDirty)}
                                text={primaryButtonText()}
                                variant="contained"
                                onClick={() => (isCreateMode && !isLastStep ? handleNext() : onSubmit())}
                            />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default DocumentAIItemDetail;
