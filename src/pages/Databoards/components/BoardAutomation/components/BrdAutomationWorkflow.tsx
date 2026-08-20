import { Box } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';

import Breadcrumb from '@/components/Breadcrumb';

import BrdAutomationAPWorkflow from './BrdAutomationAPWorkflow';

const AutomationWorkflow = ({
    crm,
    knowledgeHub,
    commsiq,
    documentAi,
}: {
    crm?: boolean;
    knowledgeHub?: boolean;
    commsiq?: boolean;
    documentAi?: boolean;
}) => {
    const { t } = useTranslation();
    const { state } = useLocation();
    const navigate = useNavigate();

    // Check if we're creating a new workflow (workflowId === 'new' is the indicator)
    const isCreateNew = state?.workflowId === 'new';

    // If creating new automation, don't use existing workflow_id - always start fresh
    const [flowId, setFlowId] = useState<string | undefined>(() => {
        if (isCreateNew) return undefined;
        return state?.form?.workflow_id;
    });
    const [isWorkflowDirty, setIsWorkflowDirty] = useState<boolean>(state?.dirtyState ?? false);

    useEffect(() => {
        if (!state) {
            navigate(
                `/${knowledgeHub ? 'knowledge-hub-all' : commsiq ? 'commsiq' : crm ? 'crm' : documentAi ? 'document-ai' : 'databoards'}`,
            );
            return;
        }
    }, [navigate, state, crm, knowledgeHub, commsiq, documentAi]);

    if (!state) {
        return null;
    }

    return (
        <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    height: '60px',
                    width: '100%',
                    padding: '16px 22px',
                    borderBottom: '1px solid var(--color-light-3)',
                }}
            >
                <Breadcrumb
                    backBtnText={t('board_automation_details')}
                    currentBoard={state.board}
                    formValues={state.form}
                    from={state.from}
                    content={state.content}
                    workflowId={flowId}
                    dirtyState={isWorkflowDirty}
                />
            </Box>
            <BrdAutomationAPWorkflow
                setFlowId={setFlowId}
                flowId={flowId}
                type={state.type}
                formValues={state.form}
                boardId={state.board.id}
                content={state.content}
                setIsWorkflowDirty={setIsWorkflowDirty}
                crm={crm}
                knowledgeHub={knowledgeHub}
                isCreateNew={isCreateNew}
            />
        </Box>
    );
};

export default AutomationWorkflow;
