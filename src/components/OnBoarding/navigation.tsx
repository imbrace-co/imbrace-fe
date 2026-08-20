import { Button, Space, Typography } from '@imbrace/ui';
import type { StepType } from '@reactour/tour';
import { useMutation } from '@tanstack/react-query';
import { type Dispatch, type RefObject, type SetStateAction, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { fetchAccountThunk } from '@/redux/slices/account';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { putAccount } from '@/services/api/account';
import apiFetch from '@/services/axios/handler';

import { helpCenterPopper } from '../HelpCenter';
import type { NavbarRef } from '../Navbar';

export const handelUpdateAccount = async (params: { userId: string; formData: { on_boarded: boolean } }) => {
    await apiFetch(putAccount.api.replace('{{user_id}}', params.userId), putAccount.method, params.formData);
};

const Navigation = (props: {
    currentStep: number;
    steps: StepType[];
    setCurrentStep: (step: number | ((prev: number) => number)) => void;
    navbarRef: RefObject<NavbarRef>;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}) => {
    const { currentStep, steps, setCurrentStep, navbarRef, setIsOpen } = props;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const userId = useAppSelector((state) => state.Account.id);
    const role = useAppSelector((state) => state.Account.role);

    const updateAccount = useMutation({
        mutationFn: handelUpdateAccount,
        onSuccess: () => {
            dispatch(fetchAccountThunk({ silent: true }));
            setIsOpen(false);
            helpCenterPopper?.close?.();
        },
        onError: () => {
            setIsOpen(false);
            helpCenterPopper?.close?.();
        },
    });

    const handleBack = useCallback(() => {
        if (role === 'owner' || role === 'admin') {
            if (currentStep === 2) {
                navigate('/chatroom', {
                    state: {
                        onBoarding: true,
                    },
                });
            }
            if (currentStep === 4) {
                navigate('/crm');
            }
            if (currentStep === 6) {
                navigate('/databoards');
            }
            if (currentStep === 8) {
                helpCenterPopper?.close?.();
            }
            if (currentStep === 9 && supportChannel) {
                navigate('/channels');
                navbarRef.current?.openHelpCenter({
                    channelId: supportChannel._id,
                    readOnly: true,
                });
            }
        }

        if (role === 'user') {
            if (currentStep === 2) {
                navigate('/chatroom', {
                    state: {
                        onBoarding: true,
                    },
                });
            }
            if (currentStep === 4) {
                helpCenterPopper?.close?.();
                navigate('/databoards');
            }
            if (currentStep === 5 && supportChannel) {
                navbarRef.current?.openHelpCenter({
                    channelId: supportChannel._id,
                    readOnly: true,
                });
            }
        }

        setCurrentStep((prev) => prev - 1);
    }, [currentStep, role, setCurrentStep, navbarRef, navigate, supportChannel]);

    const handleNext = useCallback(() => {
        if (currentStep === steps.length - 1) {
            updateAccount.mutate({
                userId,
                formData: {
                    on_boarded: true,
                },
            });
            return;
        }
        if (role === 'owner' || role === 'admin') {
            if (currentStep === 1) {
                navigate('/crm');
            }
            if (currentStep === 3) {
                navigate('/databoards');
            }
            if (currentStep === 5) {
                navigate('/channels');
            }
            if (currentStep === 7 && supportChannel) {
                navbarRef.current?.openHelpCenter({
                    channelId: supportChannel._id,
                    readOnly: true,
                });
            }
            if (currentStep === 8) {
                helpCenterPopper?.close?.();
                navigate('/ai-agent');
            }
        }

        if (role === 'user') {
            if (currentStep === 1) {
                navigate('/databoards');
            }
            if (currentStep === 3 && supportChannel) {
                navbarRef.current?.openHelpCenter({
                    channelId: supportChannel._id,
                    readOnly: true,
                });
            }
            if (currentStep === 4) {
                helpCenterPopper?.close?.();
                navigate('/ai-agent');
            }
        }
        setCurrentStep((prev) => prev + 1);
    }, [currentStep, role, navigate, navbarRef, updateAccount, setCurrentStep, steps.length, userId, supportChannel]);

    return (
        <Space justify="between">
            <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                {t('on_boarding_step', {
                    current: currentStep + 1,
                    total: steps.length,
                })}
            </Typography>
            <Space size={8}>
                {currentStep !== 0 && (
                    <Button
                        onClick={handleBack}
                        disabled={currentStep === 0}
                        size="s"
                        sx={{ padding: '6px 34px' }}
                        variant="outlined"
                        text={t('back')}
                    />
                )}
                <Button
                    onClick={handleNext}
                    loading={updateAccount.isPending}
                    size="s"
                    sx={{ padding: '6px 34px' }}
                    text={currentStep === steps.length - 1 ? t('done') : t('next')}
                />
            </Space>
        </Space>
    );
};

export default Navigation;
