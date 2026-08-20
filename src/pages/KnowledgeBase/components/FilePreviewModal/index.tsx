import { EllipsisText, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import type { SxProps, Theme } from '@mui/material';
import { Divider } from '@mui/material';
import MuiDialog from '@mui/material/Dialog';
import type { HTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

import styles from './index.module.scss';

interface ModalProps {
    open: boolean;
    onClose?: () => void;
    title: string | ReactNode;
    paperSx?: SxProps<Theme>;
    children?: ReactNode | ReactNode[] | string;
    containerProps?: HTMLAttributes<HTMLDivElement>;
}
const FilePreviewModal = (props: ModalProps) => {
    const { open, onClose, title, paperSx, children, containerProps } = props;
    return (
        <MuiDialog
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    margin: '29px 64px',
                    width: '100%',
                    justifyContent: 'center',
                    maxWidth: '1600px',
                    maxHeight: '100vh',
                    height: 'calc(100vh - 58px)',
                    ...paperSx,
                },
            }}
        >
            <div className={styles.modal}>
                <div className={styles.header}>
                    <Space justify="between" className={styles.titleContainer}>
                        <EllipsisText
                            element={<Typography style={{ color: 'var(--color-secondary-3)', fontWeight: 700 }} />}
                            text={title}
                        />

                        <IconButton
                            size="xs"
                            variant="text"
                            type="secondary"
                            onClick={() => {
                                onClose?.();
                            }}
                        >
                            <Icon name="close" />
                        </IconButton>
                    </Space>
                    <Divider flexItem />
                </div>

                <div {...containerProps} className={`${styles.body} ${containerProps?.className || ''}`}>
                    {children}
                </div>
            </div>
        </MuiDialog>
    );
};

const ModalHOC = ({
    content,
    onClose,
    ...restProps
}: Omit<ModalProps, 'open' | 'children'> & { content: (params: { onClose: () => void }) => ReactNode | ReactNode[] }) => {
    const [open, setOpen] = useState(true);
    const handleOnClose = () => {
        setOpen(false);
        onClose?.();
    };

    return (
        <FilePreviewModal {...restProps} open={open} onClose={handleOnClose}>
            {content({ onClose: handleOnClose })}
        </FilePreviewModal>
    );
};

export const openFilePreview = (
    props: Omit<ModalProps, 'open' | 'children'> & { content: (params: { onClose: () => void }) => ReactNode | ReactNode[] },
) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<ModalHOC {...props} />, document.body));
};

export default FilePreviewModal;
