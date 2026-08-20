import '../index.css';

import { Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import { Handle, Position } from 'reactflow';

import { nodeTypeProps } from '@/pages/Channels/components/MindMap/utils';

function SecondaryNode(props: any) {
    const {
        data: { label, nodeType },
        sourcePosition,
        targetPosition,
        selected,
    } = props;

    return (
        <Box
            sx={{
                // height: '36px',
                padding: '8px',
                background: 'transparent',
                border: selected ? '2px solid #FFF' : undefined,
                position: 'relative',
            }}
        >
            {/*<Handle type="target" position={Position.Right} style={{ borderRadius: 0 }} />*/}
            {targetPosition === 'left' ? (
                <Typography
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        width: 'max-content',
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        right: 0,
                        minWidth: '100px',
                        paddingRight: '8px',
                        color: 'var(--color-light-7)',
                    }}
                >
                    {label}
                </Typography>
            ) : (
                <Typography style={{ color: 'var(--color-light-7)' }}>{label}</Typography>
            )}

            <Handle
                id="secondaryNodeHandle"
                style={{
                    opacity: 1,
                    width: '4px',
                    height: '24px',
                    borderRadius: 0,
                    border: 'none',
                    backgroundColor: nodeTypeProps[nodeType].secondaryHandle,
                }}
                type="source"
                // position={Position.Bottom}
                position={sourcePosition ?? Position.Bottom}
            />
        </Box>
    );
}

export default SecondaryNode;
