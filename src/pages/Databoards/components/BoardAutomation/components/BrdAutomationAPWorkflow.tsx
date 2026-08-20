import { Box, CircularProgress } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { env } from '@/env';
import type { BoardAutomationFormValue } from '@/pages/Databoards/components/BoardAutomation';
import { useAppSelector } from '@/redux/store';
import type { CreateFlowPayload, FlowResponse } from '@/services/api/apWorkflow';
import { postApWorkflowFlow } from '@/services/api/apWorkflow';
import { ApWorkflowClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

const IMBRACE_ACCESS_TOKEN = 'imbrace-access-token';

interface BrdAutomationAPWorkflowProps {
    setFlowId: (id: string) => void;
    flowId?: string;
    type?: string;
    formValues?: BoardAutomationFormValue;
    boardId: string;
    content: API.AutomationWorkflow | 'new' | undefined;
    setIsWorkflowDirty: (value: boolean) => void;
    crm?: boolean;
    knowledgeHub?: boolean;
    isCreateNew?: boolean;
}

export type WorkflowCallbackObj = {
    workflowId?: string;
    name?: string;
    code: string;
    saved?: boolean;
    isNewCreated: boolean;
    savedCount: number;
    nodeIndex: string[];
};

export type Message = {
    type: string;
    data: unknown;
};

const BrdAutomationAPWorkflow = (props: BrdAutomationAPWorkflowProps) => {
    const { flowId, setFlowId, isCreateNew } = props;
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Track if we've already started creating flow (prevents duplicate calls in StrictMode)
    const hasStartedCreating = useRef(false);

    const [isCreatingFlow, setIsCreatingFlow] = useState(false);
    // If creating new, always start fresh (ignore any passed flowId)
    const [internalFlowId, setInternalFlowId] = useState<string | undefined>(() => {
        if (isCreateNew) return undefined;
        return flowId;
    });

    // Sync external flowId changes (but not when creating new)
    useEffect(() => {
        if (isCreateNew) return; // Don't sync when creating new
        if (flowId) {
            setInternalFlowId(flowId);
        }
    }, [flowId, isCreateNew]);

    const workflowDomain = useMemo(() => {
        return env.VITE_APP_ACTIVEPIECES_DOMAIN || '';
    }, []);

    const requestCreateNewFlow = useCallback(async (): Promise<FlowResponse> => {
        if (!organizationId) {
            throw new Error('Missing organizationId');
        }

        const payload: CreateFlowPayload = {
            displayName: 'Untitled',
            folderName: 'Board Automation',
            metadata: {
                tags: [
                    { id: '73', name: 'board' },
                    { id: '61', name: 'automation' },
                ],
            },
        };

        const response = await apiFetch<FlowResponse>(
            postApWorkflowFlow.api,
            postApWorkflowFlow.method,
            payload,
            ApWorkflowClient,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'x-organization-id': organizationId,
                },
            },
        );

        return response.data;
    }, [organizationId]);

    // Create new flow on mount if isCreateNew and no flowId exists
    useEffect(() => {
        if (!isCreateNew) return;
        if (internalFlowId) return;
        if (!organizationId) return;
        if (hasStartedCreating.current) return; // Already started, skip (handles StrictMode double-mount)

        hasStartedCreating.current = true;
        let cancelled = false;

        const createFlow = async () => {
            setIsCreatingFlow(true);

            try {
                const created = await requestCreateNewFlow();
                if (cancelled) return;
                setInternalFlowId(created.id);
                setFlowId(created.id);
            } catch (error) {
                console.error('Failed to create new flow:', error);
                // Reset flag so user can retry if needed
                hasStartedCreating.current = false;
            } finally {
                if (!cancelled) setIsCreatingFlow(false);
            }
        };

        createFlow();

        return () => {
            cancelled = true;
        };
    }, [isCreateNew, internalFlowId, organizationId, requestCreateNewFlow, setFlowId]);

    const src = useMemo(() => {
        const token = localStorage.getItem(IMBRACE_ACCESS_TOKEN);
        if (!token || !organizationId || !workflowDomain) return '';

        // New URL format for AP Workflow
        if (internalFlowId) {
            return `${workflowDomain}/flows/${internalFlowId}?token=${token}&organizationId=${organizationId}`;
        }

        // Default to projects page if no flowId
        return `${workflowDomain}/projects?token=${token}&organizationId=${organizationId}`;
    }, [workflowDomain, internalFlowId, organizationId]);

    // Show loading while creating new flow
    if (isCreatingFlow) {
        return (
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <iframe
            ref={iframeRef}
            src={src}
            allow="clipboard-read; clipboard-write"
            title="Workflow"
            style={{
                width: '100%',
                height: '100%',
                border: 0,
            }}
        />
    );
};

export default BrdAutomationAPWorkflow;
