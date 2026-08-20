import { Button, Icon, IconButton } from '@imbrace/ui';
import type { Breakpoint, DialogProps } from '@mui/material';
import { Box, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface DialogModalProps extends DialogProps {
    header: string;
    onClose: () => void;
    children: JSX.Element;
    onAction?: () => void;
}

const WorkflowDialogModal = (props: DialogModalProps) => {
    const { header, open, onClose, children, onAction } = props;
    const { t } = useTranslation();

    return (
        <Dialog
            scroll="paper"
            maxWidth={'xl' as Breakpoint}
            fullWidth
            open={open}
            onClose={onClose}
            transitionDuration={{ enter: 500, exit: 500 }}
            sx={{
                '& .MuiPaper-root': {
                    margin: '29px 64px',
                    boxShadow: 'none',
                    height: '100%',
                    borderRadius: '4px',
                },
                '& div': { overflowY: 'visible', padding: '0' },
            }}
        >
            <DialogTitle sx={{ borderBottom: '1px solid #E0E0E0', padding: '0' }}>
                <Box
                    sx={{
                        padding: '0 16px 0 24px !important',
                        height: '48px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '4px',
                    }}
                >
                    <Box sx={{ display: 'flex', gap: '12px' }}>
                        <Typography sx={{ color: 'var(--color-light-5)', fontSize: '14px', fontWeight: 800, lineHeight: '16.8px' }}>
                            {header}
                        </Typography>
                        {onAction && (
                            <Button
                                variant="link"
                                text={t('automation_workflow_edit')}
                                size="xs"
                                onClick={onAction}
                                endIcon={<Icon name="forwardIos" />}
                                sx={{
                                    fontSize: '12px',
                                    fontWeight: 400,
                                    lineHeight: '130%',
                                    '& svg': {
                                        width: '12px',
                                    },
                                }}
                            />
                        )}
                    </Box>
                    <IconButton
                        size="xs"
                        variant="text"
                        type="secondary"
                        sx={{
                            margin: '-2px 0',
                        }}
                        onClick={onClose}
                    >
                        <Icon name="close" />
                    </IconButton>
                </Box>
            </DialogTitle>

            <DialogContent sx={{ borderRadiusBottom: '4px' }}>{children}</DialogContent>
        </Dialog>
    );
};
export default WorkflowDialogModal;
