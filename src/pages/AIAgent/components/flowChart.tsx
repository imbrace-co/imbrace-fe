import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Handle, Position, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { EdgeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';

import agentIcon from '@/assets/icons/ai_agent_multi.svg';
import agentActiveIcon from '@/assets/icons/ai_agent_multi_active.svg';
import agentGreenIcon from '@/assets/icons/ai_agent_green_icon.svg';
import styles from './flowChart.module.scss';
import apiFetch from '@/services/axios/handler';
import { AIAssistantType } from '@/pages/AIAssistantManagement/components/type';
import { getAIAssistantById } from '@/services/api/ai-assistant';
import { useTranslation } from 'react-i18next';
import { Icon } from '@imbrace/ui';
import plusIcon from '@/assets/icons/ai_plus.svg';

const NODE_WIDTH = 200;
const CustomNode = ({ data }: any) => {
    const isParent = data.isParent;
    const isActive = data.active;
    const isFromOrchestrator = data.isFromOrchestrator;
    const isHover = data.activeHover;
    const isAgentAddNew = data.isAgentAddNew;

    return (
        <div
            style={{
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    padding: isParent ? 0 : 10,
                    minWidth: NODE_WIDTH,
                    width: NODE_WIDTH,
                    position: 'relative',
                }}
                onMouseEnter={() => {
                    data.onHover?.();
                    if (data.isOpenForm) {
                        if (isParent || !isFromOrchestrator) return;
                        data.onOpenAgent?.();
                    }
                }}
                onClick={() => {
                    if (isParent || !isFromOrchestrator) return;
                    data.onOpenAgent?.();
                }}
            >
                <div
                    style={
                        isParent
                            ? {
                                  border: '2px solid',
                                  height: 109,
                                  width: 152,
                                  borderRadius: 20,
                                  fontSize: 16,
                                  color: isFromOrchestrator ? '#333333' : '#828282',
                                  fontWeight: isFromOrchestrator ? 800 : 400,
                                  borderColor: isFromOrchestrator ? '#4F4F4F' : '#BDBDBD',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                  position: 'relative',
                              }
                            : {
                                  fontWeight: isActive ? 'bold' : 400,
                                  fontSize: 16,
                                  marginBottom: 4,
                                  marginTop: 5,
                                  color: isHover ? '#156DF2' : '#333',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  width: NODE_WIDTH,
                                  maxWidth: NODE_WIDTH,
                              }
                    }
                    className={!isParent ? styles.childNodes : ''}
                >
                    {data.label}
                </div>
                {isParent && isFromOrchestrator && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'end',
                            alignItems: 'center',
                            position: 'absolute',
                            bottom: '-10px',
                            right: '-200px',
                        }}
                        className={styles.addNew}
                        onClick={() => {
                            data.addNewAgent();
                            // data.onHover();
                            data.onOpenAgent();
                        }}
                    >
                        <img src={plusIcon} alt="Plus Icon" />

                        <span style={{ color: '#156DF2', fontSize: '14px', marginLeft: '5px' }}>Assign Agents</span>
                    </div>
                )}

                {isParent && data.subLabel && (
                    <div
                        style={{
                            marginTop: '10px',
                            marginBottom: '20px',
                            fontSize: 16,
                            color: '#777',
                        }}
                    >
                        {data.subLabel}
                    </div>
                )}

                {!isParent && (
                    <>
                        <div
                            style={{
                                width: 50,
                                height: 50,
                                borderRadius: '50%',
                                border: '2px solid ',
                                borderColor: isHover ? '#156DF2' : isActive ? '#4F4F4F' : '#BDBDBD',
                                backgroundColor: isActive ? '#3399FC' : 'transparent',
                                margin: '0 auto',
                                marginTop: '22px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                            className={styles.childNodes}
                        >
                            <img
                                src={isHover ? agentGreenIcon : isActive ? agentActiveIcon : agentIcon}
                                alt="icon"
                                style={{ width: 22, height: 19, objectFit: 'contain', stroke: '#fff' }}
                            />
                        </div>
                    </>
                )}
            </div>
            {!isParent && isFromOrchestrator && isHover && !isAgentAddNew && (
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'center',
                    }}
                    onClick={() => {
                        data.removeAgent?.();
                    }}
                    className={!isParent ? styles.childNodes : ''}
                >
                    <Icon style={{ fontSize: 24, cursor: 'pointer' }} color="#EE7D7D" name="delete" />
                </div>
            )}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    background: '#555',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    pointerEvents: 'none',
                    opacity: 0,
                }}
            />
            {!isParent && (
                <Handle
                    type="target"
                    position={Position.Top}
                    style={{
                        background: '#555',
                        top: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        pointerEvents: 'none',
                        opacity: 0,
                    }}
                />
            )}
        </div>
    );
};

const nodeTypes = {
    custom: CustomNode,
};

const CustomStepEdge = ({ sourceX, sourceY, targetX, targetY, markerEnd, data }: EdgeProps) => {
    const radius = 3;
    const midY = sourceY + 20;

    const isOnly = data?.isFirst && data?.isLast;

    if (isOnly) {
        const midX = (sourceX + targetX) / 2;
        return (
            <svg style={{ overflow: 'visible' }}>
                <line x1={midX} y1={sourceY} x2={midX} y2={targetY} stroke="#BDBDBD" strokeWidth={4} markerEnd={markerEnd} />
            </svg>
        );
    }

    if (data?.isFirst) {
        return (
            <svg style={{ overflow: 'visible' }}>
                <line x1={sourceX} y1={sourceY} x2={sourceX} y2={midY} stroke="#BDBDBD" strokeWidth={4} />
                <line x1={sourceX} y1={midY} x2={targetX + radius} y2={midY} stroke="#BDBDBD" strokeWidth={4} />
                <path
                    d={`M ${targetX + radius} ${midY} A ${radius} ${radius} 0 0 0 ${targetX} ${midY + radius}`}
                    stroke="#BDBDBD"
                    strokeWidth={4}
                    fill="none"
                />
                <line x1={targetX} y1={midY + radius} x2={targetX} y2={targetY} stroke="#BDBDBD" strokeWidth={4} markerEnd={markerEnd} />
            </svg>
        );
    }

    if (data?.isLast) {
        return (
            <svg style={{ overflow: 'visible' }}>
                <line x1={sourceX} y1={sourceY} x2={sourceX} y2={midY} stroke="#BDBDBD" strokeWidth={4} />
                <line x1={sourceX} y1={midY} x2={targetX - radius} y2={midY} stroke="#BDBDBD" strokeWidth={4} />
                <path
                    d={`M ${targetX - radius} ${midY} A ${radius} ${radius} 0 0 1 ${targetX} ${midY + radius}`}
                    stroke="#BDBDBD"
                    strokeWidth={4}
                    fill="none"
                />
                <line x1={targetX} y1={midY + radius} x2={targetX} y2={targetY} stroke="#BDBDBD" strokeWidth={4} markerEnd={markerEnd} />
            </svg>
        );
    }

    return (
        <svg style={{ overflow: 'visible' }}>
            <line x1={sourceX} y1={sourceY} x2={sourceX} y2={midY} stroke="#BDBDBD" strokeWidth={4} />
            <line x1={sourceX} y1={midY} x2={targetX} y2={midY} stroke="#BDBDBD" strokeWidth={4} />
            <line x1={targetX} y1={midY} x2={targetX} y2={targetY} stroke="#BDBDBD" strokeWidth={4} markerEnd={markerEnd} />
        </svg>
    );
};

const edgeTypes = {
    customStep: CustomStepEdge,
};

const getVisualCenterX = (nodes: any[]) => {
    const childNodes = nodes.filter((n) => !n.data?.isParent);
    if (childNodes.length === 0) return NODE_WIDTH / 2 + 100;

    const sorted = [...childNodes].sort((a, b) => a.position.x - b.position.x);

    if (sorted.length % 2 === 1) {
        const middle = sorted[Math.floor(sorted.length / 2)];
        return middle.position.x + NODE_WIDTH / 2;
    } else {
        const midLeft = sorted[sorted.length / 2 - 1];
        const midRight = sorted[sorted.length / 2];
        return (midLeft.position.x + midRight.position.x) / 2 + NODE_WIDTH / 2;
    }
};

function FlowChart({
    OrchestratorSubAgents,
    assistantId,
    agentAssistant,
    isFromOrchestrator,
    agentName,
    openAgent,
    isOpenAgentForm,
    removeAgent,
    onAddNewAgent,
    isNewAgentProgressing,
    isOrchestratorEmpty,
}: {
    assistantId?: string;
    agentAssistant?: string;
    isFromOrchestrator?: boolean;
    OrchestratorSubAgents?: Array<any>;
    agentName?: string;
    isNewAgentProgressing?: boolean;
    openAgent?: ({ data, index }: { data: any; index: number }) => void;
    isOpenAgentForm?: boolean;
    removeAgent?: (index: number) => void;
    onAddNewAgent?: () => void;
    isOrchestratorEmpty?: boolean;
}) {
    const subAgentsDefault = [
        {
            id: 'default1',
            assistant_id: 'default',
            name: '',
            instructions: '',
        },
    ];

    const [subAgents, setSubAgents] = useState(isOrchestratorEmpty ? subAgentsDefault : OrchestratorSubAgents || null);
    const [assistantName, setAssistantName] = useState<string>('');
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const { t } = useTranslation();

    const { fitView } = useReactFlow();

    useEffect(() => {
        setSubAgents(OrchestratorSubAgents || null);
    }, [OrchestratorSubAgents]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const responseData = await apiFetch<{ data: AIAssistantType }>(
                    `${getAIAssistantById.api(assistantId)}`,
                    getAIAssistantById.method,
                );
                setSubAgents(responseData.data.sub_agents);
                setAssistantName(responseData.data.name);
            } catch (err) {
                console.error('Fetch failed:', err);
            }
        };
        if (assistantId) {
            fetchData();
        }
    }, [assistantId]);

    const baseNodes = useMemo(() => {
        if (!subAgents) return [];
        
        return subAgents.map((item, index) => ({
            id: (index + 2).toString(),
            type: 'custom',
            data: {
                label: item.name,
                active: item.assistant_id === agentAssistant,
                activeHover: isFromOrchestrator ? hoveredNodeId === (index + 2).toString() : false,
                onHover: () => {
                    if (isNewAgentProgressing) return;
                    setHoveredNodeId((index + 2).toString());
                },
                isFromOrchestrator,
                onOpenAgent: () => {
                    if (isNewAgentProgressing) return;
                    openAgent?.({ data: item, index });
                },
                isOpenForm: isOpenAgentForm,
                removeAgent: () => {
                    if (hoveredNodeId === (index + 2).toString()) {
                        removeAgent?.(index);
                    }
                },
                isAgentAddNew: isNewAgentProgressing,
            },
            position: { x: 100 + index * 230, y: 225 },
        }));
    }, [subAgents, hoveredNodeId]);

    const centerX = useMemo(() => getVisualCenterX(baseNodes), [baseNodes]);

    const nodes = useMemo(() => {
        const parentPositionX = baseNodes.length === 0 ? 100 : centerX - NODE_WIDTH / 2;
        return [
            {
                id: '1',
                type: 'custom',
                data: {
                    label: isFromOrchestrator ? agentName : assistantName,
                    subLabel: t('ai_agent_role_orchestrator'),
                    isParent: true,
                    onOpenAgent: () => {
                        if (isNewAgentProgressing) return;
                        const agentLength = subAgents?.length;
                        if (agentLength || agentLength === 0) {
                            openAgent?.({ data: subAgents?.[agentLength], index: agentLength });
                        }
                    },
                    onHover: () => {
                        if (isNewAgentProgressing) return;
                        const agentLength = subAgents?.length;
                        if (agentLength || agentLength === 0) {
                            setHoveredNodeId((agentLength + 2).toString());
                        }
                    },
                    isFromOrchestrator,
                    addNewAgent: () => onAddNewAgent?.(),
                },
                position: { x: parentPositionX, y: 0 },
            },
            ...baseNodes,
        ];
    }, [centerX, baseNodes, assistantName]);

    useEffect(() => {
        if (nodes.length > 0 && baseNodes.length > 0) {
            setTimeout(() => {
                fitView({ padding: 0.2, duration: 500 });
            }, 0);
        }
    }, [nodes.length, fitView, baseNodes.length, isOpenAgentForm]);

    useLayoutEffect(() => {
        if (nodes.length > 0 && baseNodes.length > 0) {
            fitView({ padding: 0.2, duration: 500 });
        }
    }, [nodes.length, baseNodes.length, fitView, isOpenAgentForm]);

    useEffect(() => {
        const handleResize = () => {
            if (baseNodes.length > 0) {
                fitView({ padding: 0.2, duration: 500 });
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [fitView, baseNodes.length]);

    const edges = useMemo(() => {
        return baseNodes.map((node, index) => ({
            id: `e1-${node.id}`,
            source: '1',
            target: node.id,
            type: 'customStep',
            style: { strokeWidth: 4, stroke: '#BDBDBD' },
            data: {
                isFirst: index === 0,
                isLast: index === baseNodes.length - 1,
            },
        }));
    }, [baseNodes]);

    return (
        <div style={{ width: '100%', height: 315 }} className={isFromOrchestrator ? styles.orchestrator : styles.agent}>
            {(subAgents || isFromOrchestrator) && (
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    controls={false}
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    panOnScroll={false}
                    zoomOnDoubleClick={false}
                    panOnDrag={false}
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                />
            )}
        </div>
    );
}

export default FlowChart;
