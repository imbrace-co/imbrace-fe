import { Position } from 'reactflow';

// this helper function returns the intersection point
// of the line between the center of the intersectionNode and the target node

// @ts-ignore
function getNodeIntersection(intersectionNode, targetNode) {
    // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
    const { width: intersectionNodeWidth, height: intersectionNodeHeight, positionAbsolute: intersectionNodePosition } = intersectionNode;
    const targetPosition = targetNode.positionAbsolute;

    const w = intersectionNodeWidth / 2;
    const h = intersectionNodeHeight / 2;

    const x2 = intersectionNodePosition.x + w;
    const y2 = intersectionNodePosition.y + h;
    const x1 = targetPosition.x + targetNode.width / 2;
    const y1 = targetPosition.y + targetNode.height / 2;

    const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
    const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
    const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
    const xx3 = a * xx1;
    const yy3 = a * yy1;
    const x = w * (xx3 + yy3) + x2;
    const y = h * (-xx3 + yy3) + y2;

    return { x, y };
}

// returns the position (top,right,bottom or right) passed node compared to the intersection point
// @ts-ignore
function getEdgePosition(node, intersectionPoint) {
    const n = { ...node.positionAbsolute, ...node };
    const nx = Math.round(n.x);
    const ny = Math.round(n.y);
    const px = Math.round(intersectionPoint.x);
    const py = Math.round(intersectionPoint.y);

    if (px <= nx + 1) {
        return Position.Left;
    }
    if (px >= nx + n.width - 1) {
        return Position.Right;
    }
    if (py <= ny + 1) {
        return Position.Top;
    }
    if (py >= n.y + n.height - 1) {
        return Position.Bottom;
    }

    return Position.Top;
}

// returns the parameters (sx, sy, tx, ty, sourcePos, targetPos) you need to create an edge

// @ts-ignore
export function getEdgeParams(source, target) {
    const sourceIntersectionPoint = getNodeIntersection(source, target);
    const targetIntersectionPoint = getNodeIntersection(target, source);

    const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
    const targetPos = getEdgePosition(target, targetIntersectionPoint);

    return {
        sx: sourceIntersectionPoint.x,
        sy: sourceIntersectionPoint.y,
        tx: targetIntersectionPoint.x,
        ty: targetIntersectionPoint.y,
        sourcePos,
        targetPos,
    };
}

const nodeTypes = [
    // LEFT
    {
        label: 'WhatsApp',
        nodeType: 'whatsapp',
        targetHandle: 'top',
        position: {
            x: 900,
            y: 50,
        },
        style: {
            background: '#00B9001A',
        },
        edgeStyle: {
            stroke: '#2AC347',
            opacity: 0.5,
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Top,
    },
    {
        label: 'WeChat',
        nodeType: 'wechat',
        targetHandle: 'top',
        position: {
            x: 900,
            y: 192,
        },
        style: {
            background: '#01C45F1A',
        },
        edgeStyle: {
            stroke: '#01C45F',
            opacity: 0.5,
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
    },
    {
        label: 'CRM',
        nodeType: 'crm',
        targetHandle: 'top',
        position: {
            x: 900,
            y: 309,
        },
        style: {
            background: '#FEF5E8',
        },
        edgeStyle: {
            stroke: '#FA9917',
            opacity: 0.5,
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
        secondary: [
            {
                label: 'Salesforce',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'Zoho',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'Freshworks',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'Microsoft Dynamics',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'HubSpot',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'WooCommerce',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
        ],
    },
    {
        label: 'Website',
        nodeType: 'website',
        targetHandle: 'bottom',
        position: {
            x: 900,
            y: 574,
        },
        style: {
            background: '#2D86FA1A',
        },
        edgeStyle: {
            stroke: '#2D86FA',
            opacity: 0.5,
        },
        isSelectable: true,
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
        secondary: [
            {
                label: 'Web Widget',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'Google Analytics',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
            {
                label: 'Web Forms',
                sourcePosition: Position.Left,
                type: 'secondary',
            },
        ],
    },
    {
        label: 'Physical Store',
        nodeType: 'physicalstore',
        targetHandle: 'bottom',
        position: {
            x: 900,
            y: 730,
        },
        style: {
            background: '#EA55671A',
        },
        edgeStyle: {
            stroke: '#EA5567',
            opacity: 0.5,
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
        secondary: [
            {
                label: 'Campaign QR Codes',
                // style: {
                //     background: '#2D86FA',
                // },
                sourcePosition: Position.Left,
                type: 'secondary',
            },
        ],
    },
    {
        label: 'Tik Tok',
        nodeType: 'tiktok',
        targetHandle: 'bottom',
        position: {
            x: 900,
            y: 877,
        },
        style: {
            background: '#0000001A',
        },
        edgeStyle: {
            stroke: '#000000',
            opacity: 0.5,
        },
        sourcePosition: Position.Left,
        targetPosition: Position.Right,
    },
    // Left
    {
        label: 'Twitter',
        nodeType: 'twitter',
        targetHandle: 'bottom',
        position: {
            x: 400,
            y: 877,
        },
        style: {
            background: '#1D9BF01A',
        },
        edgeStyle: {
            stroke: '#1D9BF0',
            opacity: 0.5,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Bottom,
    },
    {
        label: 'SMS',
        nodeType: 'sms',
        targetHandle: 'bottom',
        position: {
            x: 400,
            y: 730,
        },
        style: {
            background: '#01B41F1A',
        },
        edgeStyle: {
            stroke: '#01B41F',
            opacity: 0.5,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
    },
    {
        label: 'Instagram',
        nodeType: 'instagram',
        targetHandle: 'bottom',
        position: {
            x: 400,
            y: 574,
        },
        style: {
            background: '#E0447D1A',
        },
        edgeStyle: {
            stroke: '#E0447D',
            opacity: 0.5,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        secondary: [
            {
                label: 'Messenger',
                sourcePosition: Position.Right,
                type: 'secondary',
            },
            {
                label: 'Comments',
                sourcePosition: Position.Right,
                type: 'secondary',
            },
            {
                label: 'Ads Management',
                sourcePosition: Position.Right,
                type: 'secondary',
            },
        ],
    },
    {
        label: 'LINE',
        nodeType: 'line',
        targetHandle: 'top',
        position: {
            x: 400,
            y: 309,
        },
        style: {
            background: '#00B9001A',
        },
        edgeStyle: {
            stroke: '#00B900',
            opacity: 0.5,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
    },
    {
        label: 'Email',
        nodeType: 'email',
        targetHandle: 'top',
        position: {
            x: 400,
            y: 192,
        },
        style: {
            background: '#EE8D171A',
        },
        edgeStyle: {
            stroke: '#EE8D17',
            opacity: 0.5,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
    },
    {
        label: 'Facebook',
        nodeType: 'facebook',
        targetHandle: 'top',
        position: {
            x: 400,
            y: 60,
        },
        style: {
            background: '#1677E41A',
        },
        edgeStyle: {
            stroke: '#1677E4',
            opacity: 0.5,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        secondary: [
            {
                label: 'Messenger',
                sourcePosition: Position.Right,
                type: 'secondary',
            },
            {
                label: 'Comments',
                sourcePosition: Position.Right,
                type: 'secondary',
            },
            {
                label: 'Ads Management',
                sourcePosition: Position.Right,
                type: 'secondary',
            },
        ],
    },
];

export function createNodesAndEdges(offsetLeft: number) {
    const nodes = [];
    const edges = [];
    const center = { x: (window.innerWidth + offsetLeft) / 2, y: window.innerHeight / 2 };

    nodes.push({
        id: 'target',
        data: { label: 'iMBrace 360' },
        position: center,
        type: 'channel360',
        draggable: false,
    });

    for (let i = 0; i < 12; i++) {
        // const degrees = i * (360 / 12);
        // const radians = degrees * (Math.PI / 180);
        // const x = 360 * Math.cos(radians) + center.x;
        // const x = nodeTypes[i].position.x ?? 360 * Math.cos(radians) + center.x;

        const x = i < 6 ? center.x + 300 : center.x - 300;

        // const y = 360 * Math.sin(radians) + center.y;
        // const y = nodeTypes[i].position.y ?? 360 * Math.sin(radians) + center.y;
        let y: number;
        if (i < 3) {
            y = center.y - 425 + i * 125;
        } else if (i < 6) {
            y = center.y + 250 + (i - 3) * 125;
        } else if (i < 9) {
            y = center.y + 500 - (i - 6) * 125;
        } else {
            y = center.y - 175 - (i - 9) * 125;
        }

        nodes.push({
            id: `${i}`,
            data: { label: `${nodeTypes[i].label}`, nodeType: nodeTypes[i].nodeType },
            position: { x, y },
            // ...(nodeTypes[i].nodeType === 'website'
            //     ? { position: { x: nodeTypes[i].position.x, y: nodeTypes[i].position.y } }
            //     : { position: { x, y } }),

            draggable: false,
            type: 'primary',
            style: nodeTypes[i].style,
            sourcePosition: nodeTypes[i].sourcePosition,
            targetPosition: nodeTypes[i].targetPosition,
        });

        edges.push({
            id: `edge-${i}`,
            target: 'target',
            source: `${i}`,
            // type: 'floating',
            type: 'simplebezier',
            markerEnd: {
                // type: MarkerType.Arrow,
            },
            draggable: false,
            style: nodeTypes[i].edgeStyle,
            nodeType: nodeTypes[i].nodeType,
            // ...(nodeTypes[i].nodeType === 'website' ? { targetHandle: 'bottom' } : { targetHandle: 'top' }),
            targetHandle: nodeTypes[i].targetHandle,
        });

        if (nodeTypes[i]) {
            const secondary = nodeTypes[i].secondary;
            if (Array.isArray(secondary) && secondary.length > 0) {
                secondary.forEach((s, index) => {
                    const middleIndex = Math.floor(secondary.length / 2);
                    const secondaryX = nodeTypes[i].targetPosition === 'right' ? x + 200 : x - 100;
                    // const secondaryY = y + (index - middleIndex) * 40;
                    const secondaryNodeHeight = 36; // Replace this with the actual height of the nodes
                    const secondaryY = y + secondaryNodeHeight / 2 + (index - middleIndex) * 40;

                    nodes.push({
                        id: `${i}-${index}`,
                        data: { label: `${s.label}`, nodeType: nodeTypes[i].nodeType },
                        position: { x: secondaryX, y: secondaryY },
                        draggable: false,
                        type: s.type,
                        // style: s.style,
                        sourcePosition: s.sourcePosition,
                        targetPosition: nodeTypes[i].targetPosition,
                    });

                    edges.push({
                        id: `edge-${i}-${index}`,
                        target: `${i}`,
                        source: `${i}-${index}`,
                        type: 'bezier',
                        markerEnd: {
                            // type: MarkerType.Arrow,
                        },
                        draggable: false,
                        style: nodeTypes[i].edgeStyle,
                        nodeType: nodeTypes[i].nodeType,
                    });
                });
            }
        }
    }

    return { nodes, edges };
}

interface NodeTypeProp {
    nodeBgColor: string;
    nodeBorderColor: string;
    edgeColor: string;
    secondaryHandle: string;
}

interface NodeTypeProps {
    [key: string]: NodeTypeProp;
}

export const nodeTypeProps: NodeTypeProps = {
    website: {
        nodeBgColor: '#2D86FA1A',
        nodeBorderColor: '#2D86FA',
        edgeColor: '#2D86FA',
        secondaryHandle: '#2D86FA',
    },
    physicalstore: {
        nodeBgColor: '#EA55671A',
        nodeBorderColor: '#EA5567',
        edgeColor: '#EA5567',
        secondaryHandle: '#EA5567',
    },
    tiktok: {
        nodeBgColor: '#0000001A',
        nodeBorderColor: '#000000',
        edgeColor: '#000000',
        secondaryHandle: '#000000',
    },
    twitter: {
        nodeBgColor: '#1D9BF01A',
        nodeBorderColor: '#1D9BF0',
        edgeColor: '#1D9BF0',
        secondaryHandle: '#1D9BF0',
    },
    sms: {
        nodeBgColor: '#01B41F1A',
        nodeBorderColor: '#01B41F',
        edgeColor: '#01B41F',
        secondaryHandle: '#01B41F',
    },
    instagram: {
        nodeBgColor: '#E0447D1A',
        nodeBorderColor: '#C837AB',
        edgeColor: '#E0447D',
        secondaryHandle: '#E0447D',
    },
    line: {
        nodeBgColor: '#00B9001A',
        nodeBorderColor: '#00B900',
        edgeColor: '#00B900',
        secondaryHandle: '#00B900',
    },
    email: {
        nodeBgColor: '#EE8D171A',
        nodeBorderColor: '#EE8D17',
        edgeColor: '#EE8D17',
        secondaryHandle: '#EE8D17',
    },
    facebook: {
        nodeBgColor: '#1677E41A',
        nodeBorderColor: '#1677E4',
        edgeColor: '#1677E4',
        secondaryHandle: '#1677E4',
    },
    whatsapp: {
        nodeBgColor: '#00B9001A',
        nodeBorderColor: '#00B900',
        edgeColor: '#2AC347',
        secondaryHandle: '#5FEF7C',
    },
    wechat: {
        nodeBgColor: '#01C45F1A',
        nodeBorderColor: '#01C45F',
        edgeColor: '#01C45F',
        secondaryHandle: '#00DC80',
    },
    crm: {
        nodeBgColor: '#FEF5E8',
        nodeBorderColor: '#FA9917',
        edgeColor: '#FA9917',
        secondaryHandle: '#FA9917',
    },
};
