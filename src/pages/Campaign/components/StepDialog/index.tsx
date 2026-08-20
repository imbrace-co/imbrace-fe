import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';

import type { DialogProps } from '@/components/Dialog';
import Dialog from '@/components/Dialog';

interface StepDialogProps extends Omit<DialogProps, 'open' | 'confirmText'> {
    title: string[];
    content: string[];
    confirmText: string[];
}

const DialogHOC = ({
    title,
    content,
    showDontAskedAgain,
    confirmText,
    onClose,
    onConfirm,
    onBackdropClose,
    ...restProps
}: StepDialogProps) => {
    const [dialogState, setDialogState] = useState<{
        open: boolean;
        title: string;
        content: string;
        confirmText: string;
        showDontAskedAgain?: boolean;
        hideCancelButton?: boolean;
        onConfirm?: () => void;
    }>({
        open: true,
        title: title[0],
        content: content[0],
        showDontAskedAgain,
        confirmText: confirmText[0],
    });

    const handleConfirm = async (dontAskedAgain?: boolean) => {
        const success = await onConfirm?.(dontAskedAgain);
        if (success) {
            setDialogState((prev) => ({
                ...prev,
                title: title[1],
                content: content[1],
                confirmText: confirmText[1],
                showDontAskedAgain: false,
                hideCancelButton: true,
                onConfirm: () => {
                    setDialogState((state) => ({
                        ...state,
                        open: false,
                    }));
                },
            }));
        }
    };

    const handleClose = useCallback(() => {
        onClose?.();
        setDialogState((prev) => ({
            ...prev,
            open: false,
        }));
    }, [onClose]);

    const handleBackdropClose = useCallback(() => {
        if (onBackdropClose) {
            onBackdropClose();
        }
        setDialogState((prev) => ({
            ...prev,
            open: false,
        }));
    }, [onBackdropClose]);

    return <Dialog onClose={handleClose} onConfirm={handleConfirm} onBackdropClose={handleBackdropClose} {...restProps} {...dialogState} />;
};

export const openStepDialog = (props: StepDialogProps) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<DialogHOC {...props} />, document.body));
};
