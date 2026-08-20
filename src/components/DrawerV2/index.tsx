import type { DrawerProps } from '@mui/material';
import { Box, Drawer as MuiDrawer } from '@mui/material';
import type { FC } from 'react';

import styles from './index.module.scss';

export interface CustomDrawerProps extends DrawerProps {
    width?: string;
}

const Drawer: FC<CustomDrawerProps> = (props) => {
    const { open, width = '600px', className, children, hideBackdrop, variant = 'temporary', onBackdropClick, onClose } = props;
    return (
        <MuiDrawer
            sx={{
                zIndex: 1300,
                '& .MuiDrawer-paper': {
                    display: 'flex',
                    maxWidth: width,
                    width: width ?? '100%',
                    position: 'absolute',
                    height: '100%',
                    zIndex: 800,
                    borderLeft: '1px solid #e0e0e0',
                    boxShadow: '-4px 0px 8px rgba(189, 189, 189, 0.08), -2px 0px 24px rgba(224, 224, 224, 0.2)',
                },
                '& .MuiBackdrop-root': { background: 'none' },
            }}
            variant={variant}
            anchor="right"
            hideBackdrop={hideBackdrop}
            open={open}
            className={`${styles.drawer} ${className}`}
            {...(variant === 'temporary' && {
                onBackdropClick,
            })}
            onClose={onClose}
        >
            <Box className={styles.contentContainer}>{children}</Box>
        </MuiDrawer>
    );
};
export default Drawer;
