import type { StepType } from '@reactour/tour';
import { TourProvider, useTour } from '@reactour/tour';
import type { RefObject } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useOutletContext } from 'react-router-dom';

import type { NavbarRef } from '@/components/Navbar';
import Navbar from '@/components/Navbar';
import Close from '@/components/OnBoarding/close';
import Content from '@/components/OnBoarding/content';
import { Mask } from '@/components/OnBoarding/mask';
import Navigation from '@/components/OnBoarding/navigation';
import { NotificationContextProvider } from '@/contexts/NotificationContext';
import { SocketContextProvider } from '@/contexts/SocketContext';
import { useAppSelector } from '@/redux/store';
import { openHelpCenter as openHelpCenterContactSupport } from '@/components/HelpCenter';
import contactIcon from '@/assets/images/contact.png';

import styles from './index.module.scss';

type ContextType = {
    openHelpCenter?: (data: { channelId: string; prefillMessage?: string; defaultWebWidget?: boolean }) => void;
    toggleNavbar: (isExpand: boolean) => void;
};

let openHelpCenter: (data: { channelId: string; prefillMessage?: string; defaultWebWidget?: boolean }) => void;
let toggleNavbar: (isExpand: boolean) => void;
export function useNavbar() {
    return (
        useOutletContext<ContextType>() || {
            openHelpCenter,
            toggleNavbar,
        }
    );
}

const Container = ({ navbarRef, currentSteps }: { navbarRef: RefObject<NavbarRef>; currentSteps: StepType[] }) => {
    const { isOpen, currentStep, steps, setSteps } = useTour();
    const step = steps[currentStep];

    useEffect(() => {
        setSteps?.(currentSteps);
    }, [currentSteps, setSteps]);

    useEffect(() => {
        openHelpCenter = (data) => {
            navbarRef.current?.openHelpCenter(data);
        };
        toggleNavbar = (isExpand) => {
            navbarRef.current?.toggleNavbar(isExpand);
        };
    }, [navbarRef]);

    return (
        <div className={`${styles.contentContainer} mainContainer`}>
            {isOpen && <Mask root={document.querySelector('.mainContainer')} styles={step.styles} />}
            <Outlet
                context={
                    {
                        openHelpCenter: (data) => {
                            navbarRef.current?.openHelpCenter(data);
                        },
                        toggleNavbar: (isExpand: boolean) => {
                            navbarRef.current?.toggleNavbar(isExpand);
                        },
                    } satisfies ContextType
                }
            />
        </div>
    );
};

const PrivateLayout = () => {
    const navbarRef = useRef<NavbarRef>(null);
    const isLoggedIn = useAppSelector((state) => state.Access.isLoggedIn);
    const role = useAppSelector((state) => state.Account.role);
    const { t } = useTranslation();
    const supportChannelId = useAppSelector((state) => state.Account.support?.customer?.channel?._id);

    const steps = useMemo(() => {
        if (role === 'owner' || role === 'admin') {
            return [
                {
                    selector: '.menu_chatroom',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_conversation_menu_title')}
                            content={t('on_boarding_conversation_menu_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                },
                {
                    selector: '.menu_chatroom',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_conversation_page_title')}
                            content={t('on_boarding_conversation_page_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowHeight, height }) => {
                        return [32, windowHeight - height - 32];
                    },
                    styles: {
                        maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                    },
                },
                {
                    selector: '.menu_crm',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_crm_menu_title')}
                            content={t('on_boarding_crm_menu_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                },
                {
                    selector: '.menu_crm',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_crm_page_title')}
                            content={t('on_boarding_crm_page_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowHeight, height }) => {
                        return [32, windowHeight - height - 32];
                    },
                    styles: {
                        maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                    },
                },
                {
                    selector: '.menu_databoards',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_databoards_menu_title')}
                            content={t('on_boarding_databoards_menu_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                },
                {
                    selector: '.menu_databoards',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_databoards_page_title')}
                            content={t('on_boarding_databoards_page_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowHeight, height }) => {
                        return [32, windowHeight - height - 32];
                    },
                    styles: {
                        maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                    },
                },
                {
                    selector: '.menu_channels',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_channels_menu_title')}
                            content={t('on_boarding_channels_menu_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                },
                {
                    selector: '.menu_channels',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_channels_page_title')}
                            content={t('on_boarding_channels_page_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                    styles: {
                        maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                    },
                },
                {
                    selector: '.menu_get_support',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_help_center_menu_title')}
                            content={t('on_boarding_help_center_menu_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                },
                {
                    selector: '.menu_journeys',
                    content: (popoverContentProps) => (
                        <Content
                            title={t('on_boarding_journey_menu_title')}
                            content={t('on_boarding_journey_menu_desc')}
                            {...popoverContentProps}
                        />
                    ),

                    position: ({ windowWidth, windowHeight, width, height }) => {
                        return [windowWidth - width - 32, windowHeight - height - 32];
                    },
                },
            ] as StepType[];
        }
        return [
            {
                selector: '.menu_chatroom',
                content: (popoverContentProps) => (
                    <Content
                        title={t('on_boarding_conversation_menu_title')}
                        content={t('on_boarding_conversation_menu_desc')}
                        {...popoverContentProps}
                    />
                ),

                position: ({ windowWidth, windowHeight, width, height }) => {
                    return [windowWidth - width - 32, windowHeight - height - 32];
                },
            },
            {
                selector: '.menu_chatroom',
                content: (popoverContentProps) => (
                    <Content
                        title={t('on_boarding_conversation_page_title')}
                        content={t('on_boarding_conversation_page_desc')}
                        {...popoverContentProps}
                    />
                ),

                position: ({ windowHeight, height }) => {
                    return [32, windowHeight - height - 32];
                },
                styles: {
                    maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                },
            },
            {
                selector: '.menu_databoards',
                content: (popoverContentProps) => (
                    <Content
                        title={t('on_boarding_databoards_menu_title')}
                        content={t('on_boarding_databoards_menu_desc')}
                        {...popoverContentProps}
                    />
                ),

                position: ({ windowWidth, windowHeight, width, height }) => {
                    return [windowWidth - width - 32, windowHeight - height - 32];
                },
            },
            {
                selector: '.menu_databoards',
                content: (popoverContentProps) => (
                    <Content
                        title={t('on_boarding_databoards_page_title')}
                        content={t('on_boarding_databoards_page_desc')}
                        {...popoverContentProps}
                    />
                ),

                position: ({ windowHeight, height }) => {
                    return [32, windowHeight - height - 32];
                },
                styles: {
                    maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                },
            },
            {
                selector: '.menu_get_support',
                content: (popoverContentProps) => (
                    <Content
                        title={t('on_boarding_help_center_menu_title')}
                        content={t('on_boarding_help_center_menu_desc')}
                        {...popoverContentProps}
                    />
                ),

                position: ({ windowWidth, windowHeight, width, height }) => {
                    return [windowWidth - width - 32, windowHeight - height - 32];
                },
            },
            {
                selector: '.menu_journeys',
                content: (popoverContentProps) => (
                    <Content
                        title={t('on_boarding_journey_menu_title')}
                        content={t('on_boarding_journey_menu_desc')}
                        {...popoverContentProps}
                    />
                ),

                position: ({ windowWidth, windowHeight, width, height }) => {
                    return [windowWidth - width - 32, windowHeight - height - 32];
                },
            },
        ] as StepType[];
    }, [t, role]);

    if (!isLoggedIn) {
        return <Navigate to={{ pathname: '/' }} replace />;
    }

    return (
        <NotificationContextProvider>
            <SocketContextProvider>
                <TourProvider
                    steps={steps}
                    padding={{
                        mask: 0,
                    }}
                    styles={{
                        popover: (base) => ({
                            ...base,
                            maxWidth: 500,
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px',
                            boxShadow: '0px 0px 4px 0px #E0E0E033, 0px 4px 12px 0px #E0E0E0E0',
                            borderRadius: '4px',
                        }),
                        maskWrapper: (base) => ({ ...base, color: 'transparent', displayBlur: 'none' }),
                        close: (base) => ({ ...base }),
                    }}
                    showBadge={false}
                    components={{
                        Close: ({ onClick, disabled }) => <Close onClick={onClick} disabled={disabled} />,
                        Navigation: ({ currentStep, steps: navigationSteps, setCurrentStep, setIsOpen }) => (
                            <Navigation
                                currentStep={currentStep}
                                steps={navigationSteps}
                                setCurrentStep={setCurrentStep}
                                navbarRef={navbarRef}
                                // @ts-ignore Boolean should be boolean
                                setIsOpen={setIsOpen}
                            />
                        ),
                    }}
                    onClickMask={() => {}}
                >
                    <div className={styles.app}>
                        <Navbar ref={navbarRef} />
                        <Container navbarRef={navbarRef} currentSteps={steps} />
                        {/* <img
                            className={styles.logoChat}
                            src={contactIcon}
                            alt="contact us"
                            onClick={(event) => {
                                openHelpCenterContactSupport({
                                    target: event.currentTarget,
                                    channelId: supportChannelId || '',
                                    defaultWebWidget: true,
                                });
                            }}
                        /> */}
                    </div>
                </TourProvider>
            </SocketContextProvider>
        </NotificationContextProvider>
    );
};

export default PrivateLayout;
