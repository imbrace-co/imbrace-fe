import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';

import { env } from '@/env';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import usePrompt from '@/hooks/usePrompt';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import apiFetch from '@/services/axios/handler';
import { useDialog } from '@imbrace/ui';

interface WorkflowFrameProps {
    workflowId?: string;
    type?: string;
    isV2?: boolean;
}

export type WorkflowCallbackObj = {
    workflowId?: string;
    name?: string;
    code: string;
    saved?: boolean;
    isNewCreated: boolean;
    savedCount: number;
    nodeIndex?: string[];
};

export type Message = {
    type: string;
    data: unknown;
};

const WorkflowFrame = forwardRef<HTMLIFrameElement, WorkflowFrameProps>((props, ref) => {
    const { t } = useTranslation();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const userId = useAppSelector((state) => state.Account.id);
    const organizationPartition = useAppSelector((state) => state.Account.partition);
    const { id } = useParams<{ id?: string }>();
    const { openHelpCenter } = useNavbar();
    const messageEventDataRef = useRef<WorkflowCallbackObj>();
    const { workflowId, type, isV2 } = props;
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const navigate = useNavigate();
    const { state } = useLocation();
    const { tag } = (state as { tag: string }) ?? {};
    const { tab } = useParams<{ tab: string; id?: string }>();
    const match = useMatch({
        path: isV2 ? '/workflow_v2/:tab/:id' : '/workflow/:tab/:id',
        end: true,
        caseSensitive: true,
    });
    const isNewAutomationWorkflow = tab === 'automations' && !id;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { i18n } = useTranslation();
    const [stateIsDirty, setStateIsDirty] = useState(false);
    const [messageEventData, setMessageEventData] = useState<WorkflowCallbackObj>();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();

    useEffect(() => {
        messageEventDataRef.current = messageEventData;
    }, [messageEventData]);

    const showPromptDialog = useCallback(() => {
        const currentMessageEventData = messageEventDataRef.current;
        // show prompt dialog in automations tab and has only one node
        if (tab === 'automations' && currentMessageEventData?.nodeIndex && currentMessageEventData.nodeIndex.length <= 1) {
            return true;
        }
        // otherwise return current dirty state
        if (tab === 'automations') {
            return stateIsDirty;
        }
        if (stateIsDirty && !currentMessageEventData) return false;
        if (currentMessageEventData?.isNewCreated && currentMessageEventData?.savedCount === 1) return true;
        if (currentMessageEventData?.workflowId === '__EMPTY__') return false;

        return stateIsDirty;
    }, [stateIsDirty, tab]);

    const deleteWorkflow = useCallback(async () => {
        // n8n retired — discard/delete is handled by the ActivePieces editor itself.
    }, []);

    const workflowDomain = useMemo(() => {
        // n8n retired — always use the (ActivePieces) V2 domain.
        return env.VITE_APP_ACTIVEPIECES_DOMAIN;
    }, []);

    const src = useMemo(() => {
        const token = localStorage.getItem('imbrace-access-token');
        const authParams = `token=${token}&organizationId=${organizationId}&userId=${userId}`;
        if (match && match.params?.id === 'new') {
            return `${workflowDomain}/workflow?lang=${i18n.language ?? 'en'}&${authParams}&tag=${tag}`;
        }

        if (workflowId && workflowId === 'new') {
            return `${workflowDomain}/workflow?lang=${i18n.language ?? 'en'}&${authParams}&tag=${type},automation`;
        }

        if (workflowId && workflowId !== 'new') {
            return `${workflowDomain}/workflow/${workflowId}?lang=${i18n.language ?? 'en'}&${authParams}&tag=${type},automation`;
        }

        return `${workflowDomain}/workflow/${typeof id === 'string' ? id : 'list'}?lang=${i18n.language ?? 'en'}&${authParams}`;
    }, [workflowDomain, i18n, id, match, tag, workflowId, type, organizationId, userId]);

    const onDiscardHandler = useCallback(() => {
        return new Promise<void>(async (resolve) => {
            const currentMessageEventData = messageEventDataRef.current;
            const { nodeIndex, isNewCreated } = currentMessageEventData || {};
            const isContainsOnlyTwoNodes = nodeIndex && nodeIndex.includes('Webhook') && nodeIndex.length <= 2;
            const isUntouched = isNewCreated && isContainsOnlyTwoNodes;
            if (isNewAutomationWorkflow) {
                if (currentMessageEventData && currentMessageEventData.nodeIndex?.length === 1) {
                    try {
                        await deleteWorkflow();
                    } catch (error) {
                        console.log(error);
                    }
                }
                resolve();
                return;
            }
            if (isUntouched) {
                try {
                    if (!currentMessageEventData?.workflowId) return;
                    await deleteWorkflow();
                } catch (error) {
                    console.log(error);
                }
            }
            resolve();
        });
    }, [deleteWorkflow, isNewAutomationWorkflow]);

    const onSaveAndExitHandler = useCallback(() => {
        return new Promise<boolean | void>((resolve) => {
            if (iframeRef.current) {
                const message: Message = {
                    type: 'saveAction',
                    data: { shouldClose: false },
                };
                iframeRef.current.contentWindow?.postMessage(message, src);

                const handler = (ev: MessageEvent) => {
                    if (ev.origin === src && ev.data.type === 'saveCompletedAction') {
                        window.removeEventListener('message', handler);
                        resolve(true);
                        return;
                    }
                    if (ev.origin === src && ev.data.type === 'saveWithErrorAction') {
                        window.removeEventListener('message', handler);
                        resolve(false);
                    }
                };

                window.addEventListener('message', handler);
            } else {
                resolve();
            }
        });
    }, [src]);

    useEffect(() => {
        const handler = (ev: MessageEvent) => {
            if ((env.VITE_APP_ENV === 'local' || env.VITE_APP_ENV === 'dev') && !('source' in ev.data)) {
                console.log('postMessage => ', ev);
            }
            if (ev.origin === workflowDomain) {
                if (ev.data.type === 'lockAction') {
                    openUnlockFeature({
                        channel: supportChannel,
                        touchpoint: supportTouchpoint,
                        openHelpCenter: (channelId: string) =>
                            openHelpCenter?.({ channelId, prefillMessage: t('unlock_feature_prefill_message'), defaultWebWidget: true }),
                    });
                }

                const data = ev.data?.data;

                if (typeof data === 'undefined') return;
                // when user click discard button in n8n save with error modal
                if (ev.data.type === 'reloadWorkflowAction') {
                    navigate(-1);
                }
                if (ev.data.type === 'dirtyAction') {
                    // workflow contains only title
                    if (!ev.data.state && messageEventData?.isNewCreated && messageEventData?.savedCount === 1) {
                        setStateIsDirty(true);
                        return;
                    }
                    setStateIsDirty(ev.data.data);
                    return;
                }

                if (data && data.code && data.code === 'success') {
                    setMessageEventData(data);
                }
            }
        };

        window.addEventListener('message', handler);

        return () => window.removeEventListener('message', handler);
    }, [navigate, messageEventData, openHelpCenter, supportChannel, supportTouchpoint, t, workflowDomain]);

    const promptObj = useMemo(
        () => ({
            title: t('workflow_prompt_title'),
            content: t('workflow_prompt_content'),
            confirmText: t('workflow_close_modal_confirm'),
            cancelText: t('workflow_close_modal_cancel'),
            saveExitFn: onSaveAndExitHandler,
            discardFn: onDiscardHandler,
        }),
        [onSaveAndExitHandler, t, onDiscardHandler],
    );

    usePrompt(promptObj, showPromptDialog());

    return (
        <>
            {dialogHolder}
            <iframe
                ref={ref ?? iframeRef}
                src={src}
                title="Workflow"
                allow="clipboard-read; clipboard-write"
                style={{
                    width: '100%',
                    height: '100%',
                    border: 0,
                    borderBottomLeftRadius: '4px',
                    borderBottomRightRadius: '4px',
                }}
            />
        </>
    );
});

export default WorkflowFrame;
