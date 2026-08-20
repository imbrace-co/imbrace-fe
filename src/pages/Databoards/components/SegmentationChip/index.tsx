import { EllipsisText, Icon, Space, Tooltip } from '@imbrace/ui';
import { Chip } from '@mui/material';
import { forwardRef, type MouseEvent as ReactMouseEvent } from 'react';

interface SegmentationChipProps {
    name: string;
    description?: string;
    onClick: (event: ReactMouseEvent<HTMLDivElement, MouseEvent>) => void;
    onDelete?: () => void;
}

const SegmentationChip = forwardRef<HTMLDivElement, SegmentationChipProps>(({ name, description, onClick, onDelete }, ref) => {
    return (
        <Chip
            ref={ref}
            label={
                <Space size={4}>
                    <EllipsisText text={name} />
                    {description && (
                        <Tooltip title={description} placement="top" arrow>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Icon name="info" style={{ fontSize: '16px', color: 'var(--color-light-4)' }} />
                            </div>
                        </Tooltip>
                    )}
                </Space>
            }
            sx={{
                maxWidth: '280px',
                background: 'var(--color-primary-3)',
                padding: '8px 12px 8px 12px',
                borderRadius: '4px',
                height: '40px',
                gap: '4px',
                cursor: 'pointer',
                '&:hover': {
                    background: 'var(--color-primary-5)',
                },
                '&:active': {
                    boxShadow: 'none',
                },
                '& .MuiChip-deleteIcon': {
                    margin: 0,
                    display: 'flex',
                },
                '& .MuiChip-label': {
                    fontSize: 14,
                    lineHeight: '16px',
                    padding: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    WebkitLineClamp: 2,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                },
            }}
            onClick={onClick}
            {...(onDelete && {
                deleteIcon: (
                    <div>
                        <Icon
                            name="close"
                            style={{
                                fontSize: 16,
                                color: 'var(--color-primary-1)',
                            }}
                        />
                    </div>
                ),
                onDelete: (e: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
                    e.stopPropagation();
                    onDelete();
                },
            })}
        />
    );
});

export default SegmentationChip;
