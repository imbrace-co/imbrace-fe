import { Button, Icon, IconButton, Space, Tabs, Tooltip, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Edge, Node } from 'reactflow';
import ReactFlow, {
    Background,
    BackgroundVariant,
    Controls,
    MarkerType,
    MiniMap,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
} from 'reactflow';

import FlexibleTable from '@/components/FlexibleTable';
import type { Columns } from '@/components/FlexibleTable/types';

import {
    BOARD_HEADER_HEIGHT,
    BOARD_PADDING_BOTTOM,
    BOARD_PADDING_TOP,
    BOARD_WIDTH,
    FIELD_HEIGHT,
    FIELD_V_GAP,
    nodeTypes,
} from '../Ontology/nodes';
import OffsetBezierEdge from './OffsetBezierEdge';

import 'reactflow/dist/style.css';

const MAX_FIELDS_COLLAPSED = 5;
const TOGGLE_HEIGHT = 30;

const BoardToggleNode = ({
    data,
}: {
    data: { isExpanded: boolean; hiddenCount: number; totalCount: number; onClick: () => void };
}) => {
    const text = data.isExpanded
        ? `Show less (${MAX_FIELDS_COLLAPSED} of ${data.totalCount})`
        : `Show ${data.hiddenCount} more`;
    return (
        <button
            type="button"
            className="nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                e.stopPropagation();
                data.onClick();
            }}
            style={{
                width: BOARD_WIDTH - 32,
                height: TOGGLE_HEIGHT,
                border: '1px dashed #135DD5',
                borderRadius: 6,
                background: '#F7F9FF',
                color: '#135DD5',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '0 8px',
                pointerEvents: 'all',
            }}
        >
            <Icon name={data.isExpanded ? 'dropUp' : 'dropDown'} style={{ fontSize: 16 }} />
            <span>{text}</span>
        </button>
    );
};

const relationNodeTypes = {
    ...nodeTypes,
    boardToggle: BoardToggleNode,
};

const edgeTypes = {
    contains: OffsetBezierEdge,
    containsItem: OffsetBezierEdge,
};

type RawNodeProperties = {
    boardId?: string;
    boardType?: string;
    description?: string;
    organizationId?: string;
    businessUnitId?: string;
    isChildTable?: boolean;
    fieldName?: string;
    dataType?: string;
    isIdentifier?: boolean;
    isUnique?: boolean;
    hidden?: boolean;
    settings?: Record<string, unknown>;
    defaultOptions?: Array<{ value?: string; _id?: string } | string>;
    itemId?: string;
};

export type OntologyEdge = {
    id: string;
    from: string;
    to: string;
    type: string;
    properties?: {
        viaFieldId?: string;
        viaFieldName?: string;
        relationKind?: string;
        parentBoardId?: string;
        childBoardId?: string;
    };
};

export type OntologyNode = {
    id: string;
    type: 'Board' | 'Field' | 'BoardItem' | string;
    label: string;
    properties: RawNodeProperties;
};

export type OntologyGraph = {
    nodes: OntologyNode[];
    edges: OntologyEdge[];
    stats?: {
        nodeCount?: number;
        edgeCount?: number;
        byType?: Record<string, number>;
        droppedStaleEdges?: number;
        seed?: {
            // Doc says board_id: string | null (null when seed_item_id resolved but board lookup failed).
            board_id?: string | null;
            item_id?: string;
            found?: boolean;
            reachable?: number;
            max_depth?: number | null;
        };
    };
};

const resolveSeedNodeId = (graph: OntologyGraph, currentBoardId: string): string => {
    const nodeIds = new Set((graph.nodes || []).map((n) => n.id));
    const fromStats = graph.stats?.seed?.board_id;
    if (fromStats) {
        const candidate = `board:${fromStats}`;
        if (nodeIds.has(candidate)) return candidate;
    }
    const fallback = `board:${currentBoardId}`;
    if (nodeIds.has(fallback)) return fallback;
    const byProp = (graph.nodes || []).find(
        (n) => n.type === 'Board' && (n.properties as { boardId?: string })?.boardId === currentBoardId,
    );
    return byProp?.id ?? fallback;
};

const BOARD_X_GAP = 220;
const BOARD_Y_GAP = 80;
const CONTAINS_COLOR = '#DC2626';
const CONTAINS_ITEM_COLOR = '#0EA5E9';
const BELONG_TO_COLOR = '#7C3AED';
const CURRENT_BOARD_COLOR = '#F59E0B';

const parseFieldBoardId = (fieldId: string): string | undefined => {
    if (!fieldId.startsWith('field:')) return undefined;
    const rest = fieldId.slice('field:'.length);
    const sep = rest.lastIndexOf(':');
    if (sep === -1) return undefined;
    return `board:${rest.slice(0, sep)}`;
};

const computeBoardHeight = (visibleFieldCount: number, hasToggle: boolean): number => {
    const fieldsBlock = visibleFieldCount * (FIELD_HEIGHT + FIELD_V_GAP);
    const toggleBlock = hasToggle ? TOGGLE_HEIGHT + FIELD_V_GAP : 0;
    const base = BOARD_PADDING_TOP + fieldsBlock + toggleBlock + BOARD_PADDING_BOTTOM;
    return Math.max(base, BOARD_HEADER_HEIGHT + 40);
};

const resolveVisibleFields = (
    board: OntologyNode,
    fieldsByBoard: Record<string, OntologyNode[]>,
    expandedBoards: Set<string>,
): { visible: OntologyNode[]; total: number; hasToggle: boolean } => {
    const total = (fieldsByBoard[board.id] ?? []).length;
    const hasOverflow = total > MAX_FIELDS_COLLAPSED;
    const isExpanded = expandedBoards.has(board.id);
    const visible = !hasOverflow || isExpanded
        ? fieldsByBoard[board.id] ?? []
        : (fieldsByBoard[board.id] ?? []).slice(0, MAX_FIELDS_COLLAPSED);
    return { visible, total, hasToggle: hasOverflow };
};

const buildLayout = (
    graph: OntologyGraph,
    seedBoardNodeId: string,
    expandedBoards: Set<string>,
    onToggleBoard: (boardNodeId: string) => void,
): { nodes: Node[]; edges: Edge[] } => {
    const boardNodes = (graph.nodes || []).filter((n) => n.type === 'Board');
    const fieldNodes = (graph.nodes || []).filter((n) => n.type === 'Field');
    const itemNodes = (graph.nodes || []).filter((n) => n.type === 'BoardItem');
    if (boardNodes.length === 0) return { nodes: [], edges: [] };

    const fieldsByBoard: Record<string, OntologyNode[]> = {};
    fieldNodes.forEach((f) => {
        const boardNodeId = parseFieldBoardId(f.id);
        if (!boardNodeId) return;
        (fieldsByBoard[boardNodeId] ??= []).push(f);
    });

    const seed = boardNodes.find((n) => n.id === seedBoardNodeId) ?? boardNodes[0];

    // Layered layout: assign each board a layer (column) based on its shortest
    // directed CONTAINS distance from seed. Ancestors get negative layers,
    // descendants positive; seed sits at 0. Result: edges flow left→right in
    // topology order, avoiding the zig-zag that a naïve seed-vs-others split
    // produces on chains (e.g. Parent → Child → Grandchild).
    const outgoing: Record<string, string[]> = {};
    const incoming: Record<string, string[]> = {};
    (graph.edges || [])
        .filter((e) => e.type === 'CONTAINS')
        .forEach((e) => {
            (outgoing[e.from] ??= []).push(e.to);
            (incoming[e.to] ??= []).push(e.from);
        });

    const layerByBoard: Record<string, number> = { [seed.id]: 0 };
    const queue: string[] = [seed.id];
    while (queue.length > 0) {
        const current = queue.shift()!;
        const currentLayer = layerByBoard[current];
        (outgoing[current] || []).forEach((next) => {
            const candidate = currentLayer + 1;
            if (layerByBoard[next] === undefined || candidate < layerByBoard[next]) {
                layerByBoard[next] = candidate;
                queue.push(next);
            }
        });
        (incoming[current] || []).forEach((prev) => {
            const candidate = currentLayer - 1;
            if (layerByBoard[prev] === undefined || candidate > layerByBoard[prev]) {
                layerByBoard[prev] = candidate;
                queue.push(prev);
            }
        });
    }

    // Any board the BFS couldn't reach (disconnected) gets dropped to the
    // right-most column so it doesn't collide with the chain.
    const reachedLayers = Object.values(layerByBoard);
    const maxLayer = reachedLayers.length ? Math.max(...reachedLayers) : 0;
    const floatingLayer = maxLayer + 1;
    boardNodes.forEach((b) => {
        if (layerByBoard[b.id] === undefined) layerByBoard[b.id] = floatingLayer;
    });

    const boardsByLayer: Record<number, OntologyNode[]> = {};
    boardNodes.forEach((b) => {
        const layer = layerByBoard[b.id];
        (boardsByLayer[layer] ??= []).push(b);
    });

    const sortedLayers = Object.keys(boardsByLayer)
        .map((n) => Number(n))
        .sort((a, b) => a - b);
    const minLayer = sortedLayers[0] ?? 0;

    // Pre-compute each layer's total height so we can vertically center them.
    const layerHeights: Record<number, number> = {};
    sortedLayers.forEach((layer) => {
        const total = boardsByLayer[layer].reduce((acc, b, idx) => {
            const { visible, hasToggle } = resolveVisibleFields(b, fieldsByBoard, expandedBoards);
            return acc + computeBoardHeight(visible.length, hasToggle) + (idx > 0 ? BOARD_Y_GAP : 0);
        }, 0);
        layerHeights[layer] = total;
    });
    const tallestLayer = Math.max(...Object.values(layerHeights), 0);

    const rfNodes: Node[] = [];

    const pushBoardWithFields = (board: OntologyNode, x: number, y: number) => {
        const { visible, total, hasToggle } = resolveVisibleFields(board, fieldsByBoard, expandedBoards);
        const isExpanded = expandedBoards.has(board.id);
        const height = computeBoardHeight(visible.length, hasToggle);
        rfNodes.push({
            id: board.id,
            type: 'boardNode',
            position: { x, y },
            style: { width: BOARD_WIDTH, height },
            data: {
                label: board.label,
                boardType: board.properties.boardType,
                isChildTable: board.properties.isChildTable,
                description: board.properties.description,
                boardId: board.properties.boardId,
                organizationId: board.properties.organizationId,
                businessUnitId: board.properties.businessUnitId,
                height,
                isCurrent: board.id === seedBoardNodeId,
            },
            draggable: true,
        });
        visible.forEach((field, i) => {
            const fy = BOARD_PADDING_TOP + i * (FIELD_HEIGHT + FIELD_V_GAP);
            const defaultOptions = (field.properties.defaultOptions || [])
                .map((opt) => (typeof opt === 'string' ? opt : opt?.value || ''))
                .filter(Boolean);
            rfNodes.push({
                id: field.id,
                type: 'fieldNode',
                position: { x: 16, y: fy },
                parentNode: board.id,
                extent: 'parent',
                data: {
                    label: field.label,
                    dataType: field.properties.dataType || '',
                    isIdentifier: field.properties.isIdentifier,
                    isUnique: field.properties.isUnique,
                    hidden: field.properties.hidden,
                    description: field.properties.description,
                    defaultOptions,
                },
                draggable: false,
                selectable: false,
            });
        });
        if (hasToggle) {
            const toggleY = BOARD_PADDING_TOP + visible.length * (FIELD_HEIGHT + FIELD_V_GAP);
            rfNodes.push({
                id: `toggle:${board.id}`,
                type: 'boardToggle',
                position: { x: 16, y: toggleY },
                parentNode: board.id,
                extent: 'parent',
                data: {
                    isExpanded,
                    hiddenCount: total - visible.length,
                    totalCount: total,
                    onClick: () => onToggleBoard(board.id),
                },
                draggable: false,
                selectable: true,
                focusable: false,
            });
        }
        return height;
    };

    sortedLayers.forEach((layer) => {
        const boardsInLayer = boardsByLayer[layer];
        // Sort boards within a layer alphabetically by label for stable output;
        // keeps left→right flow clean when a layer has multiple siblings.
        boardsInLayer.sort((a, b) => a.label.localeCompare(b.label));
        const layerHeight = layerHeights[layer];
        let cursorY = (tallestLayer - layerHeight) / 2;
        const x = (layer - minLayer) * (BOARD_WIDTH + BOARD_X_GAP);
        boardsInLayer.forEach((board) => {
            const h = pushBoardWithFields(board, x, cursorY);
            cursorY += h + BOARD_Y_GAP;
        });
    });

    // Layout items to the right of the board stack (if any).
    const itemsX = (Math.max(...sortedLayers) - minLayer + 1) * (BOARD_WIDTH + BOARD_X_GAP);
    itemNodes.forEach((item, i) => {
        rfNodes.push({
            id: item.id,
            type: 'fieldNode',
            position: { x: itemsX, y: i * (FIELD_HEIGHT + FIELD_V_GAP) },
            data: {
                label: item.label,
                dataType: 'Item',
                description: item.properties.itemId,
            },
            draggable: true,
            selectable: true,
        });
    });

    const relevantEdges = (graph.edges || []).filter((e) => e.type === 'CONTAINS' || e.type === 'CONTAINS_ITEM');

    // Stagger parallel edges between same node pair.
    const pairCounts = new Map<string, number>();
    relevantEdges.forEach((edge) => {
        const key = [edge.from, edge.to].sort().join('::');
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    });
    const pairIndex = new Map<string, number>();
    const EDGE_OFFSET_STEP = 26;

    const rfEdges: Edge[] = relevantEdges.map((edge) => {
        const pairKey = [edge.from, edge.to].sort().join('::');
        const total = pairCounts.get(pairKey) ?? 1;
        const idx = pairIndex.get(pairKey) ?? 0;
        pairIndex.set(pairKey, idx + 1);
        const offset = total <= 1 ? 0 : (idx - (total - 1) / 2) * EDGE_OFFSET_STEP;

        const isContainsItem = edge.type === 'CONTAINS_ITEM';
        const color = isContainsItem ? CONTAINS_ITEM_COLOR : CONTAINS_COLOR;
        const viaName = edge.properties?.viaFieldName;
        const label = isContainsItem
            ? viaName
                ? `contains · ${viaName}`
                : 'contains'
            : viaName
              ? `contains · ${viaName}`
              : 'contains';

        return {
            id: edge.id,
            source: edge.from,
            target: edge.to,
            type: isContainsItem ? 'containsItem' : 'contains',
            animated: false,
            label,
            labelStyle: { fontSize: 11, fontWeight: 600, color },
            labelBgStyle: { background: '#FFFFFF' },
            data: { offset },
            style: { stroke: color, strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
        };
    });

    return { nodes: rfNodes, edges: rfEdges };
};

const Legend = () => (
    <Box
        sx={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 5,
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #E5E8EF',
            borderRadius: '8px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            fontSize: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
    >
        <Typography style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>Legend</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 18, height: 2, background: CONTAINS_COLOR, borderRadius: 1 }} />
            <span style={{ color: '#010E3C', fontWeight: 500 }}>CONTAINS</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 18, height: 2, background: CONTAINS_ITEM_COLOR, borderRadius: 1 }} />
            <span style={{ color: '#010E3C', fontWeight: 500 }}>CONTAINS_ITEM</span>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, marginTop: 0.5, color: '#70778F', fontSize: 11 }}>
            <span aria-hidden style={{ fontSize: 12 }}>✥</span>
            <span>Drag to rearrange</span>
        </Box>
    </Box>
);

enum OntologyTab {
    Preview = 'preview',
    List = 'list',
}

const PreviewTab = ({ currentBoardId, graph }: { currentBoardId: string; graph: OntologyGraph }) => {
    const seedBoardNodeId = useMemo(() => resolveSeedNodeId(graph, currentBoardId), [graph, currentBoardId]);
    const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set());
    const onToggleBoard = useCallback((boardNodeId: string) => {
        setExpandedBoards((prev) => {
            const next = new Set(prev);
            if (next.has(boardNodeId)) next.delete(boardNodeId);
            else next.add(boardNodeId);
            return next;
        });
    }, []);
    const computed = useMemo(
        () => buildLayout(graph, seedBoardNodeId, expandedBoards, onToggleBoard),
        [graph, seedBoardNodeId, expandedBoards, onToggleBoard],
    );
    const [nodes, setNodes, onNodesChange] = useNodesState(computed.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(computed.edges);

    useEffect(() => {
        setNodes((prev) => {
            const prevById = new Map(prev.map((n) => [n.id, n]));
            return computed.nodes.map((n) => {
                const previous = prevById.get(n.id);
                if (!previous) return n;
                if (n.type === 'boardNode' && previous.type === 'boardNode') {
                    return { ...n, position: previous.position };
                }
                return n;
            });
        });
        setEdges(computed.edges);
    }, [computed, setNodes, setEdges]);

    return (
        <Box sx={{ width: '100%', height: '60vh', position: 'relative', background: '#F7F9FC', borderRadius: 1 }}>
            <Legend />
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={relationNodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    proOptions={{ hideAttribution: true }}
                    minZoom={0.2}
                    maxZoom={1.5}
                    nodesDraggable
                    nodesConnectable={false}
                    elementsSelectable
                >
                    <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#D6DCE6" />
                    <MiniMap
                        pannable
                        zoomable
                        nodeColor={(n) => (n.type === 'boardNode' ? '#135DD5' : '#C1C7D3')}
                        maskColor="rgba(19, 93, 213, 0.06)"
                    />
                    <Controls showInteractive={false} />
                </ReactFlow>
            </ReactFlowProvider>
        </Box>
    );
};

export type ContainsRow = {
    id: string;
    sourceBoardId: string;
    targetBoardId: string;
    sourceLabel: string;
    targetLabel: string;
    viaFieldId?: string;
    viaFieldName?: string;
    // Display label — original underlying edge is always CONTAINS/CONTAINS_ITEM,
    // but when the current board is the target we flip the row so it reads as
    // `BELONG_TO` from the current board's point of view.
    edgeType: 'CONTAINS' | 'CONTAINS_ITEM' | 'BELONG_TO';
    isOutgoing: boolean;
};

const stripBoardPrefix = (id: string) => (id.startsWith('board:') ? id.slice('board:'.length) : id);

// Flip a row so the current board ends up as the source. Rebrand the edge type
// to BELONG_TO so the UI reads naturally from the current board's point of view
// (e.g. `Child BELONG_TO Parent` instead of `Parent CONTAINS Child`).
const orientRowToCurrent = (row: ContainsRow, currentBoardId: string): ContainsRow => {
    if (row.sourceBoardId === currentBoardId) return row;
    if (row.targetBoardId !== currentBoardId) return row; // transitive edge — leave as-is
    return {
        ...row,
        sourceBoardId: row.targetBoardId,
        targetBoardId: row.sourceBoardId,
        sourceLabel: row.targetLabel,
        targetLabel: row.sourceLabel,
        edgeType: 'BELONG_TO',
        isOutgoing: true,
    };
};

const ListTab = ({
    currentBoardId,
    graph,
    connections,
    onEditRelation,
    onDeleteRelation,
}: {
    currentBoardId: string;
    graph: OntologyGraph;
    connections?: API.BoardConnectionsResponse;
    onEditRelation?: (row: ContainsRow) => void;
    onDeleteRelation?: (row: ContainsRow) => void;
}) => {
    const { t } = useTranslation();

    const rows: ContainsRow[] = useMemo(() => {
        if (connections && Array.isArray(connections.connections)) {
            const labelMap: Record<string, string> = {};
            if (connections.source?.board_id) {
                labelMap[connections.source.board_id] = connections.source.name;
            }
            connections.connections.forEach((c) => {
                labelMap[c.board_id] = c.name;
            });
            // Same edge appears twice in the response (once from each endpoint's
            // perspective, with flipped direction). Dedupe by the directed pair
            // + via field so each relationship shows up once.
            const seen = new Set<string>();
            const collected: ContainsRow[] = [];
            connections.connections.forEach((c) => {
                (c.links || []).forEach((link) => {
                    const isIncoming = link.direction === 'incoming';
                    const sourceId = isIncoming ? link.otherBoardId : c.board_id;
                    const targetId = isIncoming ? c.board_id : link.otherBoardId;
                    const key = `${sourceId}->${targetId}|${link.viaFieldName ?? ''}`;
                    if (seen.has(key)) return;
                    seen.add(key);
                    collected.push(
                        orientRowToCurrent(
                            {
                                id: `conn:${sourceId}->${targetId}:${link.viaFieldName ?? ''}`,
                                sourceBoardId: sourceId,
                                targetBoardId: targetId,
                                sourceLabel: labelMap[sourceId] ?? sourceId,
                                targetLabel: labelMap[targetId] ?? targetId,
                                viaFieldId: link.viaFieldId,
                                viaFieldName: link.viaFieldName,
                                edgeType: 'CONTAINS',
                                isOutgoing: sourceId === currentBoardId,
                            },
                            currentBoardId,
                        ),
                    );
                });
            });
            return collected;
        }

        const labelById: Record<string, string> = {};
        (graph.nodes || [])
            .filter((n) => n.type === 'Board' || n.type === 'BoardItem')
            .forEach((n) => {
                labelById[n.id] = n.label;
            });
        const seedBoardNodeId = `board:${currentBoardId}`;
        return (graph.edges || [])
            .filter((e) => e.type === 'CONTAINS' || e.type === 'CONTAINS_ITEM')
            .map((edge) =>
                orientRowToCurrent(
                    {
                        id: edge.id,
                        sourceBoardId: stripBoardPrefix(edge.from),
                        targetBoardId: stripBoardPrefix(edge.to),
                        sourceLabel: labelById[edge.from] ?? edge.from,
                        targetLabel: labelById[edge.to] ?? edge.to,
                        viaFieldId: edge.properties?.viaFieldId,
                        viaFieldName: edge.properties?.viaFieldName,
                        edgeType: edge.type as 'CONTAINS' | 'CONTAINS_ITEM',
                        isOutgoing: edge.from === seedBoardNodeId,
                    },
                    currentBoardId,
                ),
            );
    }, [graph, connections, currentBoardId]);

    const columns: Columns<ContainsRow> = useMemo(
        () => [
            {
                id: 'source',
                accessorKey: 'sourceLabel',
                header: t('databoard_relations_list_col_source'),
                enableEditing: false,
                enableSorting: false,
                minSize: 160,
                cell: ({ row }) => {
                    const isCurrent = row.original.sourceBoardId === currentBoardId;
                    return (
                        <Typography
                            variant="Body"
                            style={{
                                color: isCurrent ? CURRENT_BOARD_COLOR : undefined,
                                fontWeight: isCurrent ? 700 : 400,
                            }}
                        >
                            {row.original.sourceLabel}
                        </Typography>
                    );
                },
            },
            {
                id: 'type',
                accessorKey: 'edgeType',
                header: t('databoard_ontology_list_col_type'),
                enableEditing: false,
                enableSorting: false,
                minSize: 140,
                maxSize: 160,
                cell: ({ row }) => (
                    <Typography
                        variant="Body"
                        style={{
                            color:
                                row.original.edgeType === 'CONTAINS_ITEM'
                                    ? CONTAINS_ITEM_COLOR
                                    : row.original.edgeType === 'BELONG_TO'
                                        ? BELONG_TO_COLOR
                                        : CONTAINS_COLOR,
                            fontWeight: 600,
                            fontSize: 12,
                        }}
                    >
                        {row.original.edgeType}
                    </Typography>
                ),
            },
            {
                id: 'target',
                accessorKey: 'targetLabel',
                header: t('databoard_relations_list_col_target'),
                enableEditing: false,
                enableSorting: false,
                minSize: 160,
                cell: ({ row }) => {
                    const isCurrent = row.original.targetBoardId === currentBoardId;
                    return (
                        <Typography
                            variant="Body"
                            style={{
                                color: isCurrent ? CURRENT_BOARD_COLOR : undefined,
                                fontWeight: isCurrent ? 700 : 400,
                            }}
                        >
                            {row.original.targetLabel}
                        </Typography>
                    );
                },
            },
            {
                id: 'via',
                accessorKey: 'viaFieldName',
                header: t('databoard_ontology_list_col_via'),
                enableEditing: false,
                enableSorting: false,
                minSize: 200,
                cell: ({ row }) => (
                    <Typography
                        variant="Body"
                        style={{ color: row.original.viaFieldName ? 'var(--color-light-7)' : 'var(--color-light-4)' }}
                    >
                        {row.original.viaFieldName || '—'}
                    </Typography>
                ),
            },
            {
                id: 'operation',
                accessorKey: 'id',
                header: () => null,
                enableEditing: false,
                enableSorting: false,
                maxSize: 124,
                meta: { cellStyle: { padding: '7px 0' } },
                cell: ({ row, isHover, isRowSelected }) => {
                    const visible = isHover || isRowSelected;
                    const canModify = row.original.isOutgoing && row.original.edgeType === 'CONTAINS';
                    if (!canModify) {
                        return (
                            <Space
                                size={12}
                                justify="end"
                                direction="horizontal"
                                style={{
                                    width: '100%',
                                    opacity: visible ? 1 : 0,
                                    pointerEvents: 'none',
                                    transition: 'opacity 0.15s ease',
                                }}
                            >
                                <Tooltip title={t('databoard_relations_list_locked_tooltip')} placement="top" arrow>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', color: '#C1C7D3' }}>
                                        <Icon name="lock" style={{ fontSize: 18 }} />
                                    </span>
                                </Tooltip>
                            </Space>
                        );
                    }
                    return (
                        <Space
                            size={12}
                            justify="end"
                            direction="horizontal"
                            style={{
                                width: '100%',
                                opacity: visible ? 1 : 0,
                                pointerEvents: visible ? 'auto' : 'none',
                                transition: 'opacity 0.15s ease',
                            }}
                        >
                            <IconButton
                                variant="text"
                                type="secondary"
                                size="s"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditRelation?.(row.original);
                                }}
                                sx={{ color: '#135DD5', '&:hover': { color: '#135DD5' } }}
                            >
                                <Icon name="edit" />
                            </IconButton>
                            <IconButton
                                variant="text"
                                type="danger"
                                size="s"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteRelation?.(row.original);
                                }}
                                sx={{ color: '#EE7D7D', '&:hover': { color: '#EE7D7D' } }}
                            >
                                <Icon name="delete" />
                            </IconButton>
                        </Space>
                    );
                },
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [t, onEditRelation, onDeleteRelation, currentBoardId],
    );

    return (
        <FlexibleTable<ContainsRow>
            showFilter={false}
            pagination={{ pageIndex: 0, pageSize: 10000 }}
            paginationStyle={{ display: 'none' }}
            queryKey={['ontologyList', currentBoardId, rows.length]}
            dataSource={rows}
            columns={columns}
            fullWidth
            emptyMessage={
                <Typography style={{ fontSize: 14, color: 'var(--color-light-5)' }}>
                    {t('databoard_relations_list_empty')}
                </Typography>
            }
        />
    );
};

interface RelationsGraphProps {
    currentBoardId: string;
    graph: OntologyGraph;
    connections?: API.BoardConnectionsResponse;
    onAddRelation?: () => void;
    onEditRelation?: (row: ContainsRow) => void;
    onDeleteRelation?: (row: ContainsRow) => void;
}

const RelationsGraph = ({ currentBoardId, graph, connections, onAddRelation, onEditRelation, onDeleteRelation }: RelationsGraphProps) => {
    const { t } = useTranslation();
    const [tab, setTab] = useState<OntologyTab>(OntologyTab.Preview);
    // Dedupe connection links — backend reports each edge twice (once per endpoint).
    const uniqueConnectionLinkCount = (() => {
        if (!connections) return 0;
        const seen = new Set<string>();
        (connections.connections || []).forEach((c) => {
            (c.links || []).forEach((link) => {
                const isIncoming = link.direction === 'incoming';
                const sourceId = isIncoming ? link.otherBoardId : c.board_id;
                const targetId = isIncoming ? c.board_id : link.otherBoardId;
                seen.add(`${sourceId}->${targetId}|${link.viaFieldName ?? ''}`);
            });
        });
        return seen.size;
    })();
    const edgeCount = connections
        ? uniqueConnectionLinkCount
        : (graph.edges || []).filter((e) => e.type === 'CONTAINS' || e.type === 'CONTAINS_ITEM').length;
    const boardCount = connections
        ? (connections.connected_board_ids?.length || 0) + 1
        : (graph.nodes || []).filter((n) => n.type === 'Board').length;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
            <Space direction="horizontal" align="center" justify="between" style={{ width: '100%' }}>
                <Box>
                    <Typography variant="SubHeading2">{t('databoard_relations_graph_subtitle')}</Typography>
                    <Typography style={{ color: '#70778F', fontSize: 12 }}>
                        {t('databoard_relations_graph_stats', {
                            defaultValue: '{{boards}} models · {{relations}} relations',
                            boards: boardCount,
                            relations: edgeCount,
                        })}
                    </Typography>
                </Box>
                {onAddRelation && (
                    <Button
                        variant="contained"
                        startIcon={<Icon name="add" />}
                        text={t('databoard_add_relation_btn')}
                        onClick={onAddRelation}
                    />
                )}
            </Space>
            <Tabs
                tabs={[
                    { label: t('databoard_relations_tab_preview'), value: OntologyTab.Preview },
                    { label: t('databoard_relations_tab_list'), value: OntologyTab.List },
                ]}
                value={tab}
                onChange={(_event, value) => setTab(value as OntologyTab)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ borderBottom: '1px solid #E0E0E0' }}
            />
            {tab === OntologyTab.Preview && <PreviewTab currentBoardId={currentBoardId} graph={graph} />}
            {tab === OntologyTab.List && (
                <ListTab
                    currentBoardId={currentBoardId}
                    graph={graph}
                    connections={connections}
                    onEditRelation={onEditRelation}
                    onDeleteRelation={onDeleteRelation}
                />
            )}
        </Box>
    );
};

export default RelationsGraph;
