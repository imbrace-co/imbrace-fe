import { Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

function Channel360Node(props: NodeProps) {
    const { data } = props;

    return (
        <Box
            sx={{
                position: 'fixed',
                margin: 'auto',
                height: '130px',
                width: '170px',
                borderRadius: '90%',
                padding: '10px',
                backgroundColor: '#fff',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                '&:hover': {
                    backgroundColor: '#fff',
                },
            }}
        >
            <Handle id="top" type="target" position={Position.Top} style={{ borderRadius: 0 }} />
            <Handle id="bottom" type="target" position={Position.Bottom} style={{ borderRadius: 0 }} />
            <div>
                <Typography variant="Heading2">{data.label}</Typography>
            </div>
            {/*<Handle type="source" position={Position.Bottom} style={{ borderRadius: 0 }} />*/}
        </Box>
    );
}

export default Channel360Node;
