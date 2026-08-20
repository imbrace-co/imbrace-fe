import type { SerializedError } from '@reduxjs/toolkit';

import type { NodeTypeDescription } from '@/pages/Workflow/workflow.types';

export interface InitialState {
    fetchNodesLoadingStatus: LoadingStatus;
    fetchPresetsLoadingStatus: LoadingStatus;
    fetchAllWorkFlowListLoadingStatus: LoadingStatus;
    nodes: NodeTypeDescription[];
    triggerNodes: NodeTypeDescription[];
    presets: NodeTypeDescription[];
    workflows: API.WorkflowListItem[];
    error?: string | SerializedError;
}

export interface FetchNodesPayload {
    nodes: NodeTypeDescription[];
    triggerNodes: NodeTypeDescription[];
}
export interface FetchAllWorkFlowListPayload {
    workflows: API.WorkflowListItem[];
}
export interface FetchPresetsPayload {
    presets: NodeTypeDescription[];
}
