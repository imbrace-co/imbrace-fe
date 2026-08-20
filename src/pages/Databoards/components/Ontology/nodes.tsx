import { Tooltip } from '@mui/material';
import type { ReactNode } from 'react';
import { Handle, Position } from 'reactflow';

export const BOARD_WIDTH = 280;
export const FIELD_HEIGHT = 40;
export const FIELD_V_GAP = 6;
export const BOARD_HEADER_HEIGHT = 52;
export const BOARD_PADDING_TOP = BOARD_HEADER_HEIGHT + 12;
export const BOARD_PADDING_BOTTOM = 12;
export const OPTION_WIDTH = 120;
export const OPTION_HEIGHT = 30;

const dataTypeColors: Record<string, string> = {
    ShortText: '#EAF4FF',
    LongText: '#EAF4FF',
    Number: '#FEF3E8',
    Currency: '#FEF3E8',
    Date: '#F2ECFE',
    DateTime: '#F2ECFE',
    SingleSelection: '#E8F8EE',
    MultiSelection: '#E8F8EE',
    TableInTable: '#FDECEC',
};

const dataTypeTextColors: Record<string, string> = {
    ShortText: '#135DD5',
    LongText: '#135DD5',
    Number: '#D97706',
    Currency: '#D97706',
    Date: '#7C3AED',
    DateTime: '#7C3AED',
    SingleSelection: '#059669',
    MultiSelection: '#059669',
    TableInTable: '#DC2626',
};

const TooltipRow = ({ label, value }: { label: string; value: ReactNode }) => (
    <div style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: '18px' }}>
        <span style={{ color: '#C1C7D3', minWidth: 72 }}>{label}</span>
        <span style={{ color: '#FFFFFF', fontWeight: 500, flex: 1, wordBreak: 'break-word' }}>{value}</span>
    </div>
);

interface NodeTooltipProps {
    title: string;
    subtitle?: string;
    description?: string;
    rows?: { label: string; value: ReactNode }[];
    children: React.ReactElement;
}

const NodeTooltip = ({ title, subtitle, description, rows, children }: NodeTooltipProps) => {
    const hasDescription = description && description.trim().length > 0;
    const content = (
        <div style={{ padding: '4px 2px', maxWidth: 300 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', marginBottom: 2 }}>{title}</div>
            {subtitle && <div style={{ fontSize: 11, color: '#A8B0C3', marginBottom: 8 }}>{subtitle}</div>}
            <div
                style={{
                    fontSize: 12,
                    color: hasDescription ? '#E5E8EF' : '#6B7490',
                    marginBottom: rows?.length ? 8 : 0,
                    fontStyle: 'italic',
                }}
            >
                {hasDescription ? description : 'No description'}
            </div>
            {rows && rows.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {rows.map((row) => (
                        <TooltipRow key={row.label} label={row.label} value={row.value} />
                    ))}
                </div>
            )}
        </div>
    );
    return (
        <Tooltip
            title={content}
            placement="top"
            arrow
            enterDelay={200}
            leaveDelay={0}
            componentsProps={{
                tooltip: {
                    sx: {
                        background: '#1A2240',
                        border: '1px solid #2A335A',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        maxWidth: 320,
                    },
                },
                arrow: {
                    sx: { color: '#1A2240' },
                },
            }}
        >
            {children}
        </Tooltip>
    );
};

export interface BoardNodeData {
    label: string;
    boardType?: string;
    isChildTable?: boolean;
    description?: string;
    boardId?: string;
    organizationId?: string;
    businessUnitId?: string;
    height: number;
    isCurrent?: boolean;
}

export const BoardNode = ({ data }: { data: BoardNodeData }) => {
    const rows = [
        data.boardType && { label: 'Type', value: data.boardType },
        data.boardId && { label: 'Board ID', value: data.boardId },
        data.organizationId && { label: 'Org', value: data.organizationId },
        data.businessUnitId && { label: 'Business Unit', value: data.businessUnitId },
        typeof data.isChildTable === 'boolean' && { label: 'Child Table', value: data.isChildTable ? 'Yes' : 'No' },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <NodeTooltip title={data.label} subtitle="Board" description={data.description} rows={rows}>
            <div
                style={{
                    width: BOARD_WIDTH,
                    minHeight: data.height,
                    height: data.height,
                    border: data.isCurrent ? '2.5px solid #F59E0B' : '1.5px solid #135DD5',
                    borderRadius: 10,
                    background: '#FFFFFF',
                    boxShadow: data.isCurrent
                        ? '0 4px 16px rgba(245, 158, 11, 0.35)'
                        : '0 2px 8px rgba(19, 93, 213, 0.08)',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        height: BOARD_HEADER_HEIGHT,
                        background: data.isCurrent ? '#F59E0B' : '#135DD5',
                        color: '#FFFFFF',
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        fontSize: 15,
                        fontWeight: 700,
                        gap: 8,
                    }}
                >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {data.label}
                    </span>
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                        {data.isCurrent && (
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: '2px 6px',
                                    background: '#FFFFFF',
                                    color: '#B45309',
                                    borderRadius: 4,
                                    letterSpacing: 0.3,
                                }}
                            >
                                CURRENT
                            </span>
                        )}
                        {data.isChildTable && (
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '2px 6px',
                                    background: 'rgba(255,255,255,0.25)',
                                    borderRadius: 4,
                                }}
                            >
                                CHILD
                            </span>
                        )}
                    </span>
                </div>
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{ background: '#135DD5', top: '50%', opacity: 0, pointerEvents: 'none' }}
                />
                <Handle
                    type="source"
                    position={Position.Right}
                    style={{ background: '#135DD5', top: '50%', opacity: 0, pointerEvents: 'none' }}
                />
            </div>
        </NodeTooltip>
    );
};

export interface FieldNodeData {
    label: string;
    dataType: string;
    isIdentifier?: boolean;
    isUnique?: boolean;
    hidden?: boolean;
    description?: string;
    defaultOptions?: string[];
}

export const FieldNode = ({ data }: { data: FieldNodeData }) => {
    const bg = dataTypeColors[data.dataType] ?? '#F4F6FB';
    const color = dataTypeTextColors[data.dataType] ?? '#70778F';

    const rows = [
        { label: 'Data type', value: data.dataType },
        typeof data.isIdentifier === 'boolean' && { label: 'Identifier', value: data.isIdentifier ? 'Yes' : 'No' },
        typeof data.isUnique === 'boolean' && { label: 'Unique', value: data.isUnique ? 'Yes' : 'No' },
        typeof data.hidden === 'boolean' && { label: 'Hidden', value: data.hidden ? 'Yes' : 'No' },
        data.defaultOptions && data.defaultOptions.length > 0 && { label: 'Options', value: data.defaultOptions.join(', ') },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <NodeTooltip title={data.label} subtitle="Field" description={data.description} rows={rows}>
            <div
                style={{
                    width: BOARD_WIDTH - 32,
                    height: FIELD_HEIGHT,
                    borderRadius: 6,
                    background: '#FFFFFF',
                    border: '1px solid #E5E8EF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 10px',
                    fontSize: 13,
                    position: 'relative',
                    cursor: 'default',
                }}
            >
                <span
                    style={{
                        fontWeight: 600,
                        color: '#010E3C',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                    }}
                >
                    {data.isIdentifier && (
                        <span
                            style={{
                                fontSize: 9,
                                fontWeight: 700,
                                color: '#D97706',
                                background: '#FEF3E8',
                                padding: '1px 4px',
                                borderRadius: 3,
                            }}
                        >
                            ID
                        </span>
                    )}
                    {data.label}
                </span>
                <span
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: bg,
                        color,
                    }}
                >
                    {data.dataType}
                </span>
                <Handle type="source" position={Position.Right} style={{ background: '#70778F', opacity: 0 }} />
            </div>
        </NodeTooltip>
    );
};

export interface OptionNodeData {
    label: string;
    parentFieldId?: string;
    value?: string;
}

export const OptionNode = ({ data }: { data: OptionNodeData }) => {
    const rows = [
        data.value && { label: 'Value', value: data.value },
        data.parentFieldId && { label: 'Parent field', value: data.parentFieldId },
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <NodeTooltip title={data.label} subtitle="Option" rows={rows}>
            <div
                style={{
                    width: OPTION_WIDTH,
                    height: OPTION_HEIGHT,
                    borderRadius: 999,
                    background: '#E8F8EE',
                    border: '1px solid #059669',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    position: 'relative',
                    cursor: 'default',
                }}
            >
                <Handle
                    type="target"
                    position={Position.Left}
                    style={{ background: '#059669', opacity: 0, pointerEvents: 'none' }}
                />
                {data.label}
            </div>
        </NodeTooltip>
    );
};

export const nodeTypes = {
    boardNode: BoardNode,
    fieldNode: FieldNode,
    optionNode: OptionNode,
};
