import { Icon, IconButton, Space } from '@imbrace/ui';
import type { DrawerProps, SxProps, Theme } from '@mui/material';
import { Box, Drawer as MuiDrawer, Typography } from '@mui/material';
import type { FC, ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';

import styles from './index.module.scss';

export interface CustomDrawerProps extends Omit<DrawerProps, 'title'> {
    width?: string;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    showBackButton?: boolean;
    onBackBtnClick?: () => void;
    onClose: () => void;
    onBackdropClick?: () => void;
    extraButton?: () => ReactNode;
    title?: ReactNode;
    headerSx?: SxProps<Theme>;
    contentSx?: SxProps<Theme>;
}

const Drawer: FC<CustomDrawerProps> = (props) => {
    const {
        open,
        width = '600px',
        minWidth = 400,
        maxWidth = window.innerWidth * 0.9,
        resizable = false,
        onClose,
        className,
        children,
        title,
        showBackButton,
        onBackBtnClick,
        hideBackdrop,
        variant = 'temporary',
        onBackdropClick,
        extraButton,
        headerSx,
        contentSx,
    } = props;

    const [drawerWidth, setDrawerWidth] = useState<number>(parseInt(width) || 600);
    const isResizing = useRef(false);

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            if (!resizable) return;
            e.preventDefault();
            isResizing.current = true;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                if (!isResizing.current) return;
                const newWidth = window.innerWidth - moveEvent.clientX;
                if (newWidth >= minWidth && newWidth <= maxWidth) {
                    setDrawerWidth(newWidth);
                }
            };

            const handleMouseUp = () => {
                isResizing.current = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            };

            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [resizable, minWidth, maxWidth],
    );

    const currentWidth = resizable ? `${drawerWidth}px` : width;

    return (
        <MuiDrawer
            sx={{
                zIndex: 1300,
                '& .MuiDrawer-paper': {
                    display: 'flex',
                    maxWidth: resizable ? 'none' : currentWidth,
                    width: currentWidth ?? '100%',
                    position: 'absolute',
                    height: '100%',
                    zIndex: 800,
                    boxShadow: '2px 2px 16px 4px rgba(0,0,0,0.1)',
                },
            }}
            variant={variant}
            anchor="right"
            hideBackdrop={hideBackdrop}
            open={open}
            className={`${styles.drawer} ${className}`}
            {...(variant === 'temporary' && {
                onBackdropClick,
            })}
        >
            {resizable && (
                <div
                    className={styles.resizeHandle}
                    onMouseDown={handleMouseDown}
                />
            )}
            <Box className={styles.header} sx={headerSx}>
                <div className={styles.title}>
                    {showBackButton && (
                        <IconButton size="xs" variant="text" type="secondary" onClick={onBackBtnClick}>
                            <Icon name="backIos" style={{ marginRight: '18px', fontSize: 18 }} />
                        </IconButton>
                    )}
                    <Typography variant="h6">{title}</Typography>
                </div>
                <Space>
                    {extraButton?.()}
                    <IconButton
                        size="xs"
                        variant="text"
                        type="secondary"
                        onClick={() => {
                            onClose();
                        }}
                    >
                        <Icon fontSize={24} name="close" />
                    </IconButton>
                </Space>
            </Box>
            <Box className={styles.contentContainer} sx={contentSx}>{children}</Box>
        </MuiDrawer>
    );
};
export default Drawer;
