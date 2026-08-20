import { Switch } from '@imbrace/ui';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import { deactivateUser, reactivateUser } from '@/services/api/user';
import apiFetch from '@/services/axios/handler';

interface ActivateSwitchProps {
    isActive: boolean;
    userId: string;
    reload: () => void;
}

const ActivateSwitch: FC<ActivateSwitchProps> = (props) => {
    const { isActive, userId, reload } = props;
    const [checked, setChecked] = useState<boolean>(isActive);
    const { t } = useTranslation();

    const suspendDialog = async () => {
        return new Promise((resolve) =>
            dialog({
                title: t('member_suspend_dialog_title'),
                content: t('member_suspend_dialog_body'),
                confirmText: t('suspend'),
                confirmButtonProps: {
                    type: 'danger',
                },
                onConfirm: async () => {
                    try {
                        const { data } = await apiFetch<{
                            status: 'active' | 'deactivated';
                        }>(deactivateUser.api, deactivateUser.method, {
                            user_id: userId,
                        });
                        setChecked(data.status === 'active');
                        reload();
                    } catch (error) {
                        console.error(error);
                    }
                    resolve(true);
                },
                onClose: () => {
                    setChecked(true);
                    resolve(true);
                },
                onBackdropClose: () => {
                    setChecked(true);
                    resolve(true);
                },
            }),
        );
    };

    const reactivateDialog = () => {
        return new Promise((resolve) =>
            dialog({
                title: t('member_reactivate_dialog_title'),
                content: t('member_reactivate_dialog_body'),
                confirmText: t('reactivate'),
                onConfirm: async () => {
                    try {
                        const { data } = await apiFetch<{
                            status: 'active' | 'deactivated';
                        }>(reactivateUser.api, reactivateUser.method, {
                            user_id: userId,
                        });
                        setChecked(data.status === 'active');
                        reload();
                    } catch (error) {
                        console.error(error);
                    }
                    resolve(true);
                },
                onClose: () => {
                    setChecked(false);
                    resolve(true);
                },
                onBackdropClose: () => {
                    setChecked(false);
                    resolve(true);
                },
            }),
        );
    };

    const handleChange = async (isChecked: boolean) => {
        if (isChecked) {
            await reactivateDialog();
        } else {
            await suspendDialog();
        }
    };

    return <Switch type={'small'} checked={checked} onChange={handleChange} />;
};

export default ActivateSwitch;
