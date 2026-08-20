import { FieldSwitch } from '@imbrace/ui';
import type { AxiosError, AxiosResponse } from 'axios';
import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import { notificationPayload } from '@/pages/Teams/components/teamHelper';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { putTeamV2 } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

interface ActivateSwitchProps {
    isActive: boolean;
    current: API.TeamListItem;
    reload: () => void;
    disabled?: boolean;
    tooltip?: ReactNode;
}

const ActivateSwitch: FC<ActivateSwitchProps> = (props) => {
    const { isActive, current, disabled, tooltip, reload } = props;
    const [checked, setChecked] = useState<boolean>(isActive);
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const suspendDialog = async () => {
        await new Promise(async (resolve, reject) => {
            const deactiveTeam = async () => {
                try {
                    resolve(true);
                    const { data } = await apiFetch<{
                        name: string;
                        is_disabled: boolean;
                    }>(putTeamV2.api(current.id), putTeamV2.method, {
                        is_disabled: true,
                    });
                    setChecked(!data.is_disabled);
                    reload();
                } catch (error) {
                    const err = error as AxiosError;
                    const {
                        data: { code },
                    } = err.response as AxiosResponse<API.ErrorResponse>;
                    console.error('deactive error: ', err.response);

                    if (code === 8) {
                        dispatch(
                            pushNotification({
                                notification: notificationPayload(t('teams_default_team_delete_tooltip')),
                            }),
                        );
                    }
                }
            };

            if (localStorage.getItem('dont_asked_deactive_team_again') === 'true') {
                await deactiveTeam();
                return;
            }
            dialog({
                title: t('teamlist_suspend_dialog_title'),
                content: t('teamlist_suspend_dialog_body'),
                confirmText: t('deactivate'),
                confirmButtonProps: {
                    type: 'danger',
                },
                showDontAskedAgain: true,
                onConfirm: async (dontAskedAgain) => {
                    if (dontAskedAgain) {
                        localStorage.setItem('dont_asked_deactive_team_again', 'true');
                    }
                    await deactiveTeam();
                },
                onClose: () => {
                    reject({ message: 'cancel' });
                },
                onBackdropClose: () => {
                    reject({ message: 'cancel' });
                },
            });
        });
    };

    const reactivate = async () => {
        try {
            const { data } = await apiFetch<{ is_disabled: boolean }>(putTeamV2.api(current.id), putTeamV2.method, {
                is_disabled: false,
            });

            setChecked(!data.is_disabled); // !data.is_disabled === true
            reload();
        } catch (error) {
            const err = error as AxiosError;
            const {
                data: { code },
            } = err.response as AxiosResponse<API.ErrorResponse>;
            console.error('reactive error: ', err.response);

            if (code === 8) {
                dispatch(
                    pushNotification({
                        notification: notificationPayload(t('teams_default_team_delete_tooltip')),
                    }),
                );
            }
        }
    };

    const handleChange = async (isChecked: boolean) => {
        if (isChecked) {
            await reactivate();
        } else {
            await suspendDialog();
        }
    };

    return (
        <FieldSwitch
            disabled={disabled}
            formControlSx={{ width: 'auto' }}
            value={checked}
            onChange={handleChange}
            switchLabel={() => t('active')}
            tooltip={tooltip}
        />
    );
};

export default ActivateSwitch;
