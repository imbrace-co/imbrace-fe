import type { EdgeProps } from 'reactflow';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';

// Custom edge that offsets the bezier control points by a vertical amount based on
// `data.offset`, so parallel edges between the same pair of nodes don't overlap.
const OffsetBezierEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    style,
    label,
    labelStyle,
    labelBgStyle,
    data,
}: EdgeProps) => {
    const offset = typeof data?.offset === 'number' ? data.offset : 0;
    // Shift endpoints vertically so different siblings take visually different paths.
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY: sourceY + offset,
        targetX,
        targetY: targetY + offset,
        sourcePosition,
        targetPosition,
    });

    return (
        <>
            <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
            {label != null && label !== '' && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: '#FFFFFF',
                            boxShadow: '0 0 0 1px rgba(124, 58, 237, 0.15)',
                            pointerEvents: 'all',
                            whiteSpace: 'nowrap',
                            ...(labelBgStyle as React.CSSProperties),
                            ...(labelStyle as React.CSSProperties),
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default OffsetBezierEdge;
