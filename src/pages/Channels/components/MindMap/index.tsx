import 'reactflow/dist/style.css';
import './index.css';

import { Button, Space } from '@imbrace/ui';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ReactFlow, { useEdgesState, useNodesState } from 'reactflow';

import PageLayout from '@/components/PageLayout';

import Channel360Node from './components/channel360Node';
import PrimaryNode from './components/primaryNode';
import SecondaryNode from './components/secondaryNode';
import FloatingConnectionLine from './FloatingConnectionLine';
import FloatingEdge from './FloatingEdge';
import { createNodesAndEdges } from './utils';

// interface INode {
//     data: {
//         label: string;
//         nodeType: string;
//     };
//     draggable: boolean;
//     position: XYPosition;
//     sourcePosition: Position;
//     targetPosition: Position;
//     style: CSSProperties;
//     type: 'primary' | 'secondary' | 'channel360';
// }

// interface Type {
//     type: 'primary' | 'secondary' | 'channel360';
// }

const nodeTypes = {
    channel360: Channel360Node,
    primary: PrimaryNode,
    secondary: SecondaryNode,
};
const edgeTypes = {
    floating: FloatingEdge,
};

const NodeAsHandleFlow = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const componentRef = useRef(null);
    // const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges(componentRef.current.offsetLeft);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    const createNodesAndEdgesMemoized = useCallback(() => {
        // @ts-ignore
        const offsetLeft = componentRef.current ? componentRef.current.offsetLeft : null;
        if (offsetLeft !== null) {
            // return createNodesAndEdges(offsetLeft);
            const { nodes: initialNodes, edges: initialEdges } = createNodesAndEdges(offsetLeft);
            // @ts-ignore
            setNodes(initialNodes);
            // @ts-ignore
            setEdges(initialEdges);

            return;
        } else {
            // Handle the case where offsetLeft is null
            // You can either not call the function or pass a default value
            // return createNodesAndEdges(defaultValue);
        }
    }, [componentRef, setNodes, setEdges]);

    useEffect(() => {
        createNodesAndEdgesMemoized();
    }, [createNodesAndEdgesMemoized]);

    // const onConnect = useCallback(
    //     (params: any) =>
    //         setEdges((eds) =>
    //             addEdge(
    //                 {
    //                     ...params,
    //                     type: 'floating',
    //                     markerEnd: { type: MarkerType.Arrow },
    //                 },
    //                 eds,
    //             ),
    //         ),
    //     [setEdges],
    // );

    const renderExtra = () => (
        <Space size={12}>
            <Button
                text={t('credentials_add_new_button')}
                sx={{ padding: 0, width: '127px' }}
                onClick={() => {
                    navigate('/channels/new');
                }}
            />
        </Space>
    );

    // useEffect(() => {
    //     // Get the current component
    //     const currentComponent = componentRef.current;
    //
    //     if (currentComponent) {
    //         const width = currentComponent.clientWidth;
    //         const height = currentComponent.clientHeight;
    //         const offsetLeft = currentComponent.offsetLeft;
    //         console.log('componentRef: ', componentRef);
    //         console.log('Width: ', width);
    //         console.log('Height: ', height);
    //         console.log('OffsetLeft: ', offsetLeft);
    //     }
    // }, []);

    return (
        <div ref={componentRef} style={{ height: '100%' }}>
            <PageLayout title={t('channels_heading')} rightSideComponent={renderExtra()}>
                <div className="floatingEdges">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        // onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        edgeTypes={edgeTypes}
                        connectionLineComponent={FloatingConnectionLine}
                        elementsSelectable={true}
                        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
                    ></ReactFlow>
                </div>
            </PageLayout>
        </div>
    );
};

export default NodeAsHandleFlow;
