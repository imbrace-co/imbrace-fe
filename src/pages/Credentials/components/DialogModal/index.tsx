import { Icon, IconButton } from '@imbrace/ui';
import type { Breakpoint, DialogProps } from '@mui/material';
import { Box, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import React, { useRef } from 'react';
import SimpleBar from 'simplebar-react';

import styles from './index.module.scss';

interface DialogModalProps extends DialogProps {
    modalState: string;
    title?: string;
    subtitle?: string;
    onClose: () => void;
    header?: JSX.Element;
    children: JSX.Element;
    isFetching?: boolean;
}

const DialogModal = (props: DialogModalProps) => {
    const { open, onClose, header, children, modalState, isFetching } = props;
    const dialogRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const dialogSize = (state: string) => {
        switch (state) {
            case 'new':
                return { size: 'sm', padding: '48px', height: 'auto', width: 'auto' };
            case 'edit':
            case 'createNew':
                return { size: 'md', padding: '32px', height: '90%', width: '832px' };

            default:
                return { size: 'sm', padding: '48px', height: 'auto', width: 'auto' };
        }
    };

    const { size, padding, height, width } = dialogSize(modalState);

    return (
        <Dialog
            ref={dialogRef}
            scroll="paper"
            fullWidth={false}
            maxWidth={size as Breakpoint}
            open={open}
            onClose={onClose}
            transitionDuration={{ enter: 300, exit: 0 }}
            sx={{
                '& .MuiPaper-root': {
                    padding: padding,
                    boxShadow: 'none',
                    height: height,
                    width: width,
                },
                '& div': modalState === 'new' ? { overflowY: 'visible' } : null,
            }}
        >
            {modalState !== 'new' && (
                <DialogActions sx={{ position: 'absolute', top: '24px', right: '24px' }}>
                    <IconButton variant="text" aria-label="close" size="s" type="secondary" onClick={onClose}>
                        <Icon name="close" fontSize={20} />
                    </IconButton>
                </DialogActions>
            )}
            <DialogTitle id="scroll-dialog-title" sx={{ padding: 0 }}>
                {header}
            </DialogTitle>
            <DialogContent
                sx={{
                    padding: 0,
                }}
            >
                {isFetching ? (
                    <Box sx={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <CircularProgress size={22} />
                    </Box>
                ) : (
                    <SimpleBar autoHide className={styles.simpleBar} scrollableNodeProps={{ ref: contentRef }}>
                        {children}
                    </SimpleBar>
                )}
            </DialogContent>
        </Dialog>
    );
};
export default DialogModal;
