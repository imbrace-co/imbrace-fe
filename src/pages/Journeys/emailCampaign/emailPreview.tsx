import { EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import type { PopoverProps } from '@mui/material';
import { Divider, Popover } from '@mui/material';
import { useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';

import styles from '@/index.module.scss';

const EmailPreview = ({ emailTemplate }: { emailTemplate: API.EmailTemplate }) => {
    const [anchorEl, setAnchorEl] = useState<PopoverProps['anchorEl']>(null);
    const { t } = useTranslation();
    const open = Boolean(anchorEl);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        const boundingClientRect = event.currentTarget.getBoundingClientRect();
        const getBoundingClientRect = () => {
            return boundingClientRect;
        };
        setAnchorEl({
            nodeType: 1,
            getBoundingClientRect,
        });
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    return (
        <>
            <Space justify="center" style={{ width: '32px' }} onMouseEnter={handlePopoverOpen}>
                <Icon name="templatePreview" style={{ display: 'inline-block', fontSize: 24, color: 'var(--color-light-4)' }} />
            </Space>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
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
            >
                <Scrollbars autoHeight autoHeightMax={600}>
                    <Space size={16} align="start" direction="vertical" style={{ padding: '32px' }}>
                        <Space size={12} justify="start">
                            <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                {t('journey_email_subject_title')}
                            </Typography>
                            <EllipsisText text={emailTemplate.subject} element={<Typography />} />
                        </Space>
                        <Divider flexItem />
                        <div className={`${styles.preview} ql-preview`} dangerouslySetInnerHTML={{ __html: emailTemplate.body }}></div>
                    </Space>
                </Scrollbars>
            </Popover>
        </>
    );
};

export default EmailPreview;
