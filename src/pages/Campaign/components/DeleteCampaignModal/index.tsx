import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';

import Dialog from '@/components/Dialog';

const DialogHOC = ({
    onClose,
    onConfirm,
}: {
    onConfirm: (step: number, dontAskedAgain?: boolean) => Promise<boolean | void>;
    onClose: (step: number) => Promise<void>;
}) => {
    const { t } = useTranslation();
    const [dialogState, setDialogState] = useState<{
        title: string;
        content: string;
        confirmText: string;
        cancelText: string;
        open: boolean;
        step: number;
        loading: boolean;
    }>({
        title: t('campaign_delete'),
        content: t('campaign_delete_description'),
        confirmText: t('delete_everything'),
        cancelText: t('move_to_all'),
        open: true,
        step: 1,
        loading: false,
    });

    const handleConfirm = async (dontAskedAgain?: boolean) => {
        setDialogState((prev) => ({
            ...prev,
            loading: true,
        }));
        const skip = await onConfirm(dialogState.step, dontAskedAgain);
        if (dialogState.step === 1) {
            if (skip) {
                setDialogState((prev) => ({
                    ...prev,
                    open: false,
                    loading: false,
                }));
                return;
            }
            setDialogState((prev) => ({
                ...prev,
                title: t('campaign_delete_touchpoint'),
                content: t('campaign_delete_touchpoint_description'),
                confirmText: t('delete'),
                step: 2,
                loading: false,
            }));
        }
        if (dialogState.step === 2) {
            setDialogState((prev) => ({
                ...prev,
                open: false,
                loading: false,
            }));
        }
        if (dialogState.step === 3) {
            setDialogState((prev) => ({
                ...prev,
                open: false,
                loading: false,
            }));
        }
    };

    const handleClose = useCallback(async () => {
        setDialogState((prev) => ({
            ...prev,
            loading: true,
        }));
        await onClose(dialogState.step);
        if (dialogState.step !== 3) {
            setDialogState((prev) => ({
                ...prev,
                title: t('campaign_deleted'),
                content: t('campaign_deleted_description'),
                confirmText: t('done'),
                step: 3,
                loading: false,
            }));
        } else {
            setDialogState((prev) => ({
                ...prev,
                open: false,
                loading: false,
            }));
        }
    }, [onClose, dialogState.step, t]);

    const handleBackdropClose = useCallback(() => {
        setDialogState((prev) => ({
            ...prev,
            open: false,
            loading: false,
        }));
    }, []);

    return (
        <Dialog
            {...dialogState}
            onConfirm={handleConfirm}
            onClose={handleClose}
            confirmButtonProps={{
                type: dialogState.step === 3 ? 'primary' : 'danger',
            }}
            actionsAlign="flex-end"
            hideCancelButton={dialogState.step === 3}
            onBackdropClose={handleBackdropClose}
            backdropClosable
            showDontAskedAgain={dialogState.step === 2}
        />
    );
};

export const openDeleteCampaignDialog = (props: {
    onConfirm: (step: number, dontAskedAgain?: boolean) => Promise<boolean | void>;
    onClose: (step: number) => Promise<void>;
}) => {
    const fragment = document.createDocumentFragment();
    const root = createRoot(fragment);
    return root.render(createPortal(<DialogHOC {...props} />, document.body));
};
