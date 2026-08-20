import { Icon, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import React, { useCallback } from 'react';
import type { NodeProps } from 'reactflow';
import { Handle, Position } from 'reactflow';

import { nodeTypeProps } from '@/pages/Channels/components/MindMap/utils';

function PrimaryNode(props: NodeProps) {
    const {
        data: { label, nodeType },
        sourcePosition,
        targetPosition,
        selected,
    } = props;

    const renderIcon = useCallback(() => {
        switch (nodeType) {
            case 'website':
                return <Icon namespace="channel" name="website" fontSize={24} />;
            case 'physicalstore':
                return <Icon namespace="channel" name="store" fontSize={24} />;
            case 'tiktok':
                return <Icon namespace="channel" name="tiktok" fontSize={24} />;
            case 'twitter':
                return <Icon namespace="channel" name="twitter" fontSize={24} />;
            case 'sms':
                return <Icon namespace="channel" name="sms" fontSize={24} />;
            case 'instagram':
                return <Icon namespace="channel" name="instagram" fontSize={24} />;
            case 'line':
                return <Icon namespace="channel" name="line" fontSize={24} />;
            case 'email':
                return <Icon namespace="channel" name="email" fontSize={24} />;
            case 'facebook':
                return <Icon namespace="channel" name="facebook" fontSize={24} />;
            case 'whatsapp':
                return <Icon namespace="channel" name="whatsapp" fontSize={24} />;
            case 'wechat':
                return <Icon namespace="channel" name="wechat" fontSize={24} />;
            case 'crm':
                return <Icon namespace="channel" name="crm" fontSize={24} />;
            default:
                return undefined;
        }
    }, [nodeType]);

    return (
        <Box
            sx={{
                height: '48px',
                minWidth: '107px',
                padding: '12px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                border: selected ? `1px solid ${nodeTypeProps[nodeType].nodeBorderColor}` : '1px solid transparent',
                borderRadius: '8px',
                '&:hover': {
                    border: `1px solid ${nodeTypeProps[nodeType].nodeBorderColor}`,
                },
            }}
        >
            <Handle type="target" position={targetPosition ?? Position.Right} style={{ borderRadius: 0 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {renderIcon()}
                <Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }}>
                    {label}
                </Typography>
            </Box>
            <Handle type="source" position={sourcePosition ?? Position.Bottom} style={{ borderRadius: 0 }} />
        </Box>
    );
}

export default PrimaryNode;
