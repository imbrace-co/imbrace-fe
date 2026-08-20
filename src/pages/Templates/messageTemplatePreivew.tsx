import { Icon, Space } from '@imbrace/ui';
import { Popover } from '@mui/material';
import { useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';

import styles from '@/index.module.scss';

const MessageTemplatePreview = ({ messageTemplate }: { messageTemplate: API.MessageTemplate }) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    return (
        <>
            <Space
                justify="center"
                style={{ width: '32px' }}
                aria-owns={open ? 'mouse-over-popover' : undefined}
                aria-haspopup="true"
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
            >
                <Icon name="templatePreview" style={{ display: 'inline-block', fontSize: 24, color: 'var(--color-light-4)' }} />
            </Space>

            <Popover
                id="mouse-over-popover"
                sx={{ pointerEvents: 'none' }}
                open={open}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                slotProps={{
                    paper: {
                        sx: {
                            overflow: 'hidden',
                            padding: '0',
                            width: 500,
                            maxHeight: 600,
                            marginTop: '4px',
                            boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                        },
                    },
                }}
                disableRestoreFocus
            >
                <Scrollbars autoHeight autoHeightMax={600}>
                    <Space size={16} align="start" direction="vertical" style={{ padding: '32px' }}>
                        <div className={`${styles.preview} ql-preview`} dangerouslySetInnerHTML={{ __html: messageTemplate.text }}></div>
                    </Space>
                </Scrollbars>
            </Popover>
        </>
    );
};

export default MessageTemplatePreview;
