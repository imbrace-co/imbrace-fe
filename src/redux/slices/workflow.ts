import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';

import { FETCH_FAILED, FETCH_IN_PROGRESS, FETCH_SUCCEEDED, IDLE } from '@/constants/app';
import type { NodeTypeDescription, Workflow } from '@/pages/Workflow/workflow.types';
import { fetchAutomationWorkflows } from '@/services/api/boardAutomation';
import { getAllNodes, getAllWorkflows } from '@/services/api/workflow';
import { IpsClient } from '@/services/axios';

import apiFetch from '../../services/axios/handler';
import type { AsyncThunkOptions } from './index.types';
import type { FetchAllWorkFlowListPayload, FetchNodesPayload, FetchPresetsPayload, InitialState } from './workflow.types';

const initialState: InitialState = {
    fetchNodesLoadingStatus: IDLE,
    fetchPresetsLoadingStatus: IDLE,
    fetchAllWorkFlowListLoadingStatus: IDLE,
    nodes: [],
    presets: [],
    workflows: [],
    triggerNodes: [],
};

const sortNodes = (nodeList: NodeTypeDescription[]) => {
    return [...nodeList].sort((a, b) => (a.displayName.toLowerCase() > b.displayName.toLowerCase() ? 1 : -1));
};

export const fetchNodes = createAsyncThunk<FetchNodesPayload, void, AsyncThunkOptions>(
    'Workflow/fetchNodes',
    async (params, { rejectWithValue }) => {
        try {
            const { data } = await apiFetch<{ data: NodeTypeDescription[] }>(getAllNodes.api(), getAllNodes.method);

            const payload: FetchNodesPayload = {
                nodes: sortNodes([...data.data]),
                triggerNodes: data.data.filter((node) => node.codex && node.codex.categories?.indexOf('Channel Triggers') !== -1),
            };
            return payload;
        } catch (err) {
            const error = err as AxiosError;
            let message = 'Something went wrong';
            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data;
            }
            return rejectWithValue({ message });
        }
    },
);

export const fetchPresets = createAsyncThunk<FetchPresetsPayload, void, AsyncThunkOptions>(
    'Workflow/fetchPresets',
    async (params, { rejectWithValue }) => {
        try {
            const { data } = await apiFetch<{ data: Workflow[] }>(getAllWorkflows.api(), getAllWorkflows.method);

            const presets = data.data
                .filter((workflow) => workflow.tags.findIndex((tag) => tag.name === 'preset') !== -1)
                .map(
                    (workflow) =>
                        ({
                            name: 'n8n-nodes-base.executeWorkflow',
                            displayName: workflow.name,
                            description: '',
                            icon: 'fa:network-wired',
                            defaults: {
                                color: 'rgb(255, 109, 90)',
                                name: 'network-wired',
                                workflowId: workflow.id,
                            },
                            version: 1,
                            inputs: [],
                            outputs: [],
                            properties: [],
                            group: [],
                        } as NodeTypeDescription),
                );

            const payload: FetchPresetsPayload = {
                presets: sortNodes([...presets]),
            };
            return payload;
        } catch (err) {
            const error = err as AxiosError;
            let message = 'Something went wrong';
            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data;
            }
            return rejectWithValue({ message });
        }
    },
);

export const fetchAllWorkFlowList = createAsyncThunk<FetchAllWorkFlowListPayload, string | undefined, AsyncThunkOptions>(
    'Workflow/fetchAllWorkFlowList',
    async (tabIndex, { rejectWithValue }) => {
        try {
            if (typeof tabIndex !== 'undefined' && tabIndex === 'board') {
                const { data } = await apiFetch<API.WorkflowListItem[]>(
                    fetchAutomationWorkflows.api,
                    fetchAutomationWorkflows.method,
                    {},
                    IpsClient,
                );
                return {
                    workflows: data,
                };
            }
            const { data } = await apiFetch<{ data: API.WorkflowListItem[] }>(getAllWorkflows.api(), getAllWorkflows.method);

            return {
                workflows: data.data,
            };
        } catch (err) {
            const error = err as AxiosError;
            let message = 'Something went wrong';
            if (!error.response) {
                if (err instanceof Error) {
                    message = err.message;
                }
            } else {
                message = error.response.data;
            }
            return rejectWithValue({ message });
        }
    },
);

export const workflowSlice = createSlice({
    name: 'Workflow',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder.addCase(fetchNodes.pending, (state) => {
            if (state.fetchNodesLoadingStatus === IDLE || state.fetchNodesLoadingStatus === FETCH_SUCCEEDED) {
                state.fetchNodesLoadingStatus = FETCH_IN_PROGRESS;
            }
        });
        builder.addCase(fetchNodes.fulfilled, (state, action) => {
            if (state.fetchNodesLoadingStatus === FETCH_IN_PROGRESS) {
                return {
                    ...state,
                    loadingStatus: FETCH_SUCCEEDED,
                    ...action.payload,
                };
            }
        });
        builder.addCase(fetchNodes.rejected, (state, action) => {
            state.fetchNodesLoadingStatus = FETCH_FAILED;
            if (action.payload) {
                state.error = action.payload.message;
            } else {
                state.error = action.error;
            }
        });
        builder.addCase(fetchPresets.pending, (state) => {
            if (state.fetchPresetsLoadingStatus === IDLE || state.fetchPresetsLoadingStatus === FETCH_SUCCEEDED) {
                state.fetchPresetsLoadingStatus = FETCH_IN_PROGRESS;
            }
        });
        builder.addCase(fetchPresets.fulfilled, (state, action) => {
            if (state.fetchPresetsLoadingStatus === FETCH_IN_PROGRESS) {
                return {
                    ...state,
                    loadingStatus: FETCH_SUCCEEDED,
                    ...action.payload,
                };
            }
        });
        builder.addCase(fetchPresets.rejected, (state, action) => {
            state.fetchPresetsLoadingStatus = FETCH_FAILED;
            if (action.payload) {
                state.error = action.payload.message;
            } else {
                state.error = action.error;
            }
        });
        //'Workflow/fetchAllWorkFlowList'
        builder.addCase(fetchAllWorkFlowList.pending, (state) => {
            if (state.fetchAllWorkFlowListLoadingStatus === IDLE || state.fetchAllWorkFlowListLoadingStatus === FETCH_SUCCEEDED) {
                state.fetchAllWorkFlowListLoadingStatus = FETCH_IN_PROGRESS;
            }
        });
        builder.addCase(fetchAllWorkFlowList.fulfilled, (state, action) => {
            if (state.fetchAllWorkFlowListLoadingStatus === FETCH_IN_PROGRESS) {
                return {
                    ...state,
                    fetchAllWorkFlowListLoadingStatus: FETCH_SUCCEEDED,
                    ...action.payload,
                };
            }
        });
        builder.addCase(fetchAllWorkFlowList.rejected, (state, action) => {
            state.fetchAllWorkFlowListLoadingStatus = FETCH_FAILED;
            if (action.payload) {
                state.error = action.payload.message;
            } else {
                state.error = action.error;
            }
        });
    },
});

export default workflowSlice.reducer;
