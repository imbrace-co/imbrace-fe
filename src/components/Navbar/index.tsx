import { EllipsisText, Icon, Tooltip } from '@imbrace/ui';
import type { CSSObject, SxProps, Theme } from '@mui/material';
import { Badge, Box, Divider, ListSubheader as MuiListSubheader, Popover, useMediaQuery } from '@mui/material';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import MuiListItemButton from '@mui/material/ListItemButton';
import MuiListItemIcon from '@mui/material/ListItemIcon';
import MuiListItemText from '@mui/material/ListItemText';
import { styled } from '@mui/material/styles';
import { useTour } from '@reactour/tour';
// import { useQuery } from '@tanstack/react-query';
import type { Location } from 'history';
import type { ReactElement } from 'react';
import React, { forwardRef, Fragment, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { NavLinkProps } from 'react-router-dom';
import { NavLink, useLocation, useMatch, useNavigate, useParams } from 'react-router-dom';

import IconKnowledgeHub from '@/assets/icons/icon_knowledgeHub.svg?react';
//import LicenseIcon from '@/assets/icons/icon_license.svg?react';
import LogoSVG from '@/assets/icons/imbrace_logo.svg?react';
import LogoSmallSVG from '@/assets/icons/imbrace_logo_small.svg?react';
//import LLMProviderIcon from '@/assets/icons/llm_provider.svg?react';
import IconAIAgent from '@/assets/icons/new_icon/ai_agent_new_icon.svg?react';
import CommsIQIcon from '@/assets/icons/new_icon/commsIQ_new_icon.svg?react';
import DataBoardsIcon from '@/assets/icons/new_icon/databoards_new_icon.svg?react';
import DocIQIcon from '@/assets/icons/new_icon/docIQ_new_icon.svg?react';
import FlowOpsIcon from '@/assets/icons/new_icon/flow_ops_new_icon.svg?react';
import GovernCoreIcon from '@/assets/icons/new_icon/gonvern_core_new_icon.svg?react';
import InsightIQIcon from '@/assets/icons/new_icon/insightIQ_new_icon.svg?react';
import AccountSettingPopper from '@/components/AccountSettingPopper';
import Avatar from '@/components/Avatar';
import { notificationCenter } from '@/components/NotificationCenter';
import { app_version, build_version } from '@/config/app';
import { useDeveloperPortal } from '@/contexts/DeveloperPortalContext';
import { useNavBar } from '@/contexts/NavBarContext';
import { env } from '@/env';
import useAccess from '@/hooks/useAccess';
import { useAppSelector } from '@/redux/store';

// import apiFetch from '@/services/axios/handler';
import { openHelpCenter } from '../HelpCenter';
import NavbarMask from '../OnBoarding/mask';
import styles from './index.module.scss';

const openedMixin = (theme: Theme): CSSObject => ({
    [theme.breakpoints.down('md')]: {
        width: 240,
    },
    [theme.breakpoints.up('md')]: {
        width: 256,
    },
    [theme.breakpoints.up('lg')]: {
        width: 256,
    },
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    overflowX: 'hidden',
    [theme.breakpoints.down('md')]: {
        width: 50,
    },
    [theme.breakpoints.up('md')]: {
        width: 60,
    },
    [theme.breakpoints.up('lg')]: {
        width: 72,
    },
});

const ListSubheader = styled(MuiListSubheader)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    [theme.breakpoints.down('md')]: {
        [`& svg.${styles.logo}`]: {
            height: 35,
            marginLeft: 17,
            [`&.${styles.small}`]: {
                height: 40,
                marginLeft: 0,
            },
        },
    },
    [theme.breakpoints.up('md')]: {
        [`& svg.${styles.logo}`]: {
            height: 39,
            marginLeft: 20,
            [`&.${styles.small}`]: {
                height: 45,
                marginLeft: 5,
            },
        },
    },
    [theme.breakpoints.up('lg')]: {
        [`& svg.${styles.logo}`]: {
            height: 44,
            marginLeft: 24,
            [`&.${styles.small}`]: {
                height: 50,
                marginLeft: 10,
            },
        },
    },
}));

export const ListItemText = styled(MuiListItemText)<{ open: boolean }>(({ open }) => ({
    transition: 'opacity 0.3s ease',
    margin: 0,
    ...(!open && {
        opacity: 0,
        flex: 0,
    }),
    '& .MuiTypography-root': {
        fontSize: '0.875rem',
        fontWeight: 'bold',
    },
}));

export const ListItemIcon = styled(MuiListItemIcon)<{ open: boolean }>(({ theme, open }) => ({
    minWidth: 'auto',
    marginRight: open ? 12 : 0,
    transition: 'all 0.3s ease',
    color: 'currentcolor',
    '& svg': {
        color: 'var(--color-secondary-3)',
        transition: 'all 0.3s ease',
    },

    [theme.breakpoints.down('md')]: {
        '& svg': {
            fontSize: 14,
            width: 14,
            height: 14,
        },
    },
    [theme.breakpoints.up('md')]: {
        '& svg': {
            fontSize: 14,
            width: 20,
            height: 20,
        },
    },
    [theme.breakpoints.up('lg')]: {
        '& svg': {
            fontSize: 18,
            width: 24,
            height: 24,
        },
    },
}));

export const ListItemButton = styled(MuiListItemButton)(({ theme }) => ({
    color: 'var(--color-light-5)',
    position: 'relative',
    width: '100%',
    '&:hover': {
        backgroundColor: 'var(--color-light-2)',
    },
    '&.active': {
        color: '#ffffff',
        backgroundColor: 'var(--color-accent-yellow-2)',
        '& svg': {
            color: '#ffffff',
        },
    },

    [theme.breakpoints.down('md')]: {
        maxHeight: 35,
        height: 35,
        '> a': {
            paddingLeft: '17px !important',
        },
    },
    [theme.breakpoints.up('md')]: {
        maxHeight: 45,
        height: 45,
        '> a': {
            paddingLeft: '20px !important',
        },
    },
    [theme.breakpoints.up('lg')]: {
        maxHeight: 65,
        height: 65,
        '> a': {
            paddingLeft: '24px !important',
        },
    },
})) as typeof MuiListItemButton;

interface SettingButtonProps {
    open: boolean;
}

const SettingButton = styled(ListItemButton, {
    shouldForwardProp: (prop) => prop !== 'open',
})<SettingButtonProps>(({ theme, open }) => ({
    paddingRight: open ? undefined : 0,
    justifyContent: open ? 'flex-start' : 'center',

    '& svg': {
        color: 'var(--color-secondary-3)',
    },
    [theme.breakpoints.down('md')]: {
        gap: undefined,
        paddingLeft: open ? '17px !important' : '0 !important',
    },
    [theme.breakpoints.up('md')]: {
        gap: undefined,
        paddingLeft: open ? '20px !important' : '0 !important',
    },
    [theme.breakpoints.up('lg')]: {
        gap: undefined,
        paddingLeft: open ? '24px !important' : '0 !important',
    },
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
    }),
}));

type AccessType = keyof Omit<ReturnType<typeof useAccess>, 'isTeamAdmin' | 'isUnderRole' | 'isUnderAndEqualRole' | 'getTeamPermission'>;

interface Menu {
    id: string;
    to?: string;
    icon?: ReactElement;
    access?: AccessType | AccessType[] | (() => boolean);
    hide?: boolean;
    subMenus?: Menu[];
    defaultExpand?: boolean;
    tooltip?: string;
    tooltipOnBoarding?: string;
    isActive?: (match: Record<string, string | undefined> | null, location: Location) => boolean;
}

const getDeveloperPortalMenu = (): Menu => ({
    id: 'menu_developer_portal',
    to: '/developer-portal',
    tooltip: 'Developer Portal',
    access: () => true,
    icon: <Icon name="developerPortal" />,
});

// Toggle to re-show the Teams tab in Govern Core in the future (hidden, not deleted).
const SHOW_TEAMS_TAB = false;

const Menus: Menu[] = [
    {
        id: 'menu_context_center',
        to: '/internal-ai-chat',
        tooltip: 'menu_context_center_tooltip',
        access: 'internal_ai_chat',
        icon: <InsightIQIcon />,
    },
    {
        id: 'menu_ai_agent',
        to: '/ai-agent',
        tooltip: 'menu_ai_agent_tooltip',
        access: 'ai_agent',
        icon: <IconAIAgent />,
    },
    
    {
        id: 'menu_dociq',
        tooltip: 'menu_dociq_tooltip',
        icon: <DocIQIcon />,
        access: () => true,
        defaultExpand: true,
        subMenus: [
            {
                id: 'menu_document_models_v2',
                to: '/document-models',
                tooltip: 'menu_document_models_v2_tooltip',
                access: 'databoards',
            },
        ],
    },
    {
        id: 'menu_databoards',
        to: '/databoards',
        tooltip: 'menu_databoards_tooltip',
        tooltipOnBoarding: 'on_boarding_databoards_menu_tooltip',
        access: 'databoards',
        icon: <DataBoardsIcon />,
    },
    {
        id: 'menu_commsiq',
        icon: <CommsIQIcon />,
        access: () => true,
        defaultExpand: true,
        subMenus: [
            {
                id: 'menu_chatroom',
                to: '/chatroom',
                tooltip: 'menu_chatroom_tooltip',
                tooltipOnBoarding: 'on_boarding_conversation_menu_tooltip',
                access: 'conversation',
                // icon: <Icon name="conversations" />,
            },
            {
                id: 'menu_channels',
                to: '/channels',
                tooltip: 'menu_channels_tooltip',
                tooltipOnBoarding: 'on_boarding_channels_menu_tooltip',
                // icon: <Icon name="widgets" />,
                access: 'channels',
            },
            {
                id: 'menu_campaign',
                to: env.VITE_APP_ENV === 'demo' ? '/campaign/grid' : '/campaign/list',
                tooltip: 'menu_campaign_tooltip',
                // icon: <>
                access: 'campaign',
                isActive: (match, location) => {
                    return location.pathname.includes('/touchpoint');
                },
            },
        ],
    },
    {
        id: 'menu_flowops',
        icon: <FlowOpsIcon />,
        access: () => true,
        defaultExpand: true,
        subMenus: [
            {
                id: 'menu_workflow_v2',
                to: '/workflow-v2',
                // icon: <Icon name="deviceHub" />,
                access: 'workflows_v2',
                tooltip: 'menu_workflow_tooltip',
                isActive: (match, location) => {
                    return location.pathname.includes('/workflow-v2') || location.pathname.includes('/workflow_v2/');
                },
            },
        ],
    },
    {
        id: 'menu_knowledgeHub',
        to: '/knowledge-hub-all',
        icon: <IconKnowledgeHub />,
        access: 'knowledge_hub',
        tooltip: 'menu_knowledgeHub_tooltip',
    },
    {
        id: 'menu_govern_core',
        icon: <GovernCoreIcon />,
        access: 'isAdmin',
        subMenus: [
            ...(SHOW_TEAMS_TAB
                ? ([
                      {
                          id: 'menu_teams',
                          to: '/teams',
                          // icon: <Icon name="allTeams" />,
                          access: ['isAdmin', 'teams'],
                          tooltip: 'menu_teams_tooltip',
                      },
                  ] as Menu[])
                : []),
            {
                id: 'menu_members',
                to: '/member',
                // icon: <Icon name="orgMembers" />,
                access: ['isAdmin', 'member'],
                tooltip: 'menu_members_tooltip',
            },
            {
                id: 'menu_templates',
                to: '/templates',
                // icon: <Icon name="stickyNote2Outlined" />,
                access: ['isAdmin', 'templates'],
                tooltip: 'menu_templates_tooltip',
            },
            {
                id: 'menu_llm_provider',
                to: '/llm-provider',
                // icon: <LLMProviderIcon style={{ width: '1em', height: '1em' }} />,
                access: ['isAdmin'],
                tooltip: 'menu_llm_provider_tooltip',
            },
            {
                id: 'menu_generate_external_token',
                to: '/external/generate-external-token',
                // icon: <Icon name="credentials" />,
                access: ['isAdmin'],
                tooltip: 'menu_generate_external_token_tooltip',
            },
        ],
    },
];

interface ListItemTooltipProps {
    title: string;
    children: ReactElement;
    disableInteractive?: boolean;
    disableHoverListener?: boolean;
    disableFocusListener?: boolean;
    placement?: 'left' | 'right' | 'top' | 'bottom';
    enterDelay?: number;
    enterNextDelay?: number;
    defaultOpen?: boolean;
    sx?: SxProps<Theme>;
    arrow?: boolean;
}

const ListItemTooltip: React.FC<ListItemTooltipProps> = ({
    title,
    children,
    disableInteractive = false,
    disableHoverListener = false,
    disableFocusListener = false,
    placement = 'right',
    enterDelay = 0,
    enterNextDelay = 0,
    defaultOpen = false,
    sx,
    arrow = false,
}) => {
    const { pathname } = useLocation();
    const [open, setOpen] = useState(defaultOpen);

    const handleTooltipClose = () => {
        if (defaultOpen) {
            return;
        }
        setOpen(false);
    };

    const handleTooltipOpen = () => {
        setOpen(true);
    };

    useEffect(() => {
        setOpen(defaultOpen);
    }, [defaultOpen]);

    useEffect(() => {
        if (defaultOpen) {
            return;
        }
        const timeout = setTimeout(() => {
            setOpen(false);
        }, 500);

        return () => {
            if (timeout) {
                clearTimeout(timeout);
            }
        };
    }, [pathname, defaultOpen]);

    return (
        <Tooltip
            title={title}
            open={open}
            onClose={handleTooltipClose}
            onOpen={handleTooltipOpen}
            disableInteractive={disableInteractive}
            disableHoverListener={disableHoverListener}
            disableFocusListener={disableFocusListener}
            placement={placement}
            enterDelay={enterDelay}
            enterNextDelay={enterNextDelay}
            leaveDelay={0}
            sx={sx}
            arrow={arrow}
        >
            {children}
        </Tooltip>
    );
};

const MenuLink = forwardRef<
    HTMLAnchorElement,
    Omit<NavLinkProps, 'to' | 'isActive'> & {
        to: string;
        customIsActive?: (match: Record<string, string | undefined> | null, location: Location) => boolean;
    }
>(({ customIsActive, ...props }, ref) => {
    const location = useLocation();
    return (
        <NavLink
            ref={ref}
            {...props}
            className={({ isActive }) =>
                isActive || (customIsActive && customIsActive(null, location))
                    ? `${props.className} ${styles.active}`
                    : `${props.className}`
            }
        />
    );
});

const ImbraceMenus = memo(
    ({
        menuExpand,
        open,
        toggleMenuExpand,
    }: {
        menuExpand: Record<string, boolean>;
        open: boolean;
        toggleMenuExpand: (menuId: string) => void;
    }) => {
        const { t } = useTranslation();
        const access = useAccess();
        const { isDeveloperPortal } = useDeveloperPortal();
        const { isOpen, currentStep } = useTour();
        // const navigate = useNavigate();
        const role = useAppSelector((state) => state.Account.role);
        const location = useLocation();
        const isShowLicenseTab = useAppSelector((state) => state.License.isShow);
        const [submenuAnchor, setSubmenuAnchor] = useState<{ el: HTMLElement; menuId: string } | null>(null);

        useEffect(() => {
            setSubmenuAnchor(null);
        }, [location]);

        const showOnBoardingTooltip = useCallback(
            (menuId: string) => {
                switch (menuId) {
                    case 'menu_chatroom':
                        return (role === 'admin' || role === 'owner' || role === 'user') && currentStep === 0;
                        
                    case 'menu_databoards':
                        return (role === 'admin' || role === 'owner' || role === 'user') && currentStep === 4;
                        
                    case 'menu_channels':
                        return (role === 'admin' || role === 'owner') && currentStep === 6;
                        
                    default:
                        return false;
                }
            },
            [currentStep, role],
        );

        const renderMenu = useCallback(
            (menuItems: Menu[], isSub?: boolean) => {
                // Add developer portal menu if enabled
                const menusToRender = isDeveloperPortal && !isSub ? [getDeveloperPortalMenu(), ...menuItems] : menuItems;

                return menusToRender.map((menu) => {
                    const accessKey = menu.access;
                    if (!menu.access || menu.hide) {
                        return null;
                    }
                    if (typeof accessKey === 'string') {
                        const accessFunc = access[accessKey];
                        if (typeof accessFunc === 'function') {
                            if (!accessFunc?.()) {
                                return null;
                            }
                        }
                    }
                    if (Array.isArray(accessKey)) {
                        const shouldHide = accessKey.some((key) => {
                            const accessFunc = access[key];
                            if (typeof accessFunc === 'function') {
                                return !accessFunc?.();
                            }
                            return false;
                        });
                        if (shouldHide) {
                            return null;
                        }
                    }
                    if (menu.subMenus) {
                        const license = menu.subMenus.find((item) => item.id === 'License');
                        if (license) {
                            license.hide = !isShowLicenseTab;
                        }

                        const hide = menu.subMenus
                            .map((subMenu) => {
                                const subAccessKey = subMenu.access;
                                if (!subMenu.access || subMenu.hide) {
                                    return true;
                                }
                                if (typeof subAccessKey === 'string') {
                                    const accessFunc = access[subAccessKey];
                                    if (typeof accessFunc === 'function') {
                                        if (!accessFunc?.()) {
                                            return true;
                                        }
                                    }
                                }
                                if (Array.isArray(subAccessKey)) {
                                    const shouldHide = subAccessKey.some((key) => {
                                        const accessFunc = access[key];
                                        if (typeof accessFunc === 'function') {
                                            return !accessFunc?.();
                                        }
                                        return false;
                                    });
                                    if (shouldHide) {
                                        return true;
                                    }
                                }
                                return false;
                            })
                            .some((shouldHide) => !shouldHide);

                        if (!hide) {
                            return null;
                        }

                        const isSubmenuOpen = submenuAnchor?.menuId === menu.id;
                        return (
                            <Fragment key={menu.id}>
                                <ListItemTooltip
                                    title={menu.tooltip && open ? t(menu.tooltip) : t(menu.id)}
                                    disableInteractive
                                    disableHoverListener={open}
                                    disableFocusListener
                                    placement="right"
                                    enterDelay={500}
                                    enterNextDelay={500}
                                >
                                    <SettingButton
                                        onClick={(e) => {
                                            setSubmenuAnchor(isSubmenuOpen ? null : { el: e.currentTarget as HTMLElement, menuId: menu.id });
                                        }}
                                        open={open}
                                        sx={isSubmenuOpen ? { backgroundColor: 'var(--color-light-2)' } : undefined}
                                    >
                                        {menu.icon && <ListItemIcon open={open}>{menu.icon}</ListItemIcon>}
                                        {open && <ListItemText open={open} primary={t(menu.id)} />}
                                        <Box
                                            component="span"
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--color-secondary-3)',
                                                transition: 'transform 0.2s ease',
                                                transform: isSubmenuOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                                ...(open
                                                    ? { marginLeft: 'auto', paddingRight: '4px' }
                                                    : { position: 'absolute', right: 4, top: '50%', transform: `translateY(-50%) ${isSubmenuOpen ? 'rotate(90deg)' : 'rotate(0deg)'}` }),
                                            }}
                                        >
                                            <Icon name="chevronRight" style={{ fontSize: open ? 16 : 12, color: 'inherit' }} />
                                        </Box>
                                    </SettingButton>
                                </ListItemTooltip>
                                <Popover
                                    open={isSubmenuOpen}
                                    anchorEl={submenuAnchor?.el}
                                    onClose={() => setSubmenuAnchor(null)}
                                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                    disableAutoFocus
                                    disableEnforceFocus
                                >
                                    <List component="div" disablePadding sx={{ minWidth: 160 }}>
                                        {renderMenu(menu.subMenus, true)}
                                    </List>
                                </Popover>
                            </Fragment>
                        );
                    }
                    if (menu.to) {
                        const url = menu.to;
                        // Check if this menu item is active
                        const isMenuActive = location.pathname === url || (menu.isActive && menu.isActive(null, location));

                        const iconSx = {
                            '& svg': { color: 'currentcolor' },
                            ...(menu.id === 'menu_context_center' && isMenuActive && {
                                '& svg path:nth-of-type(1)': { fill: 'white' },
                                '& svg path:nth-of-type(2)': { fill: 'white' },
                                '& svg path:nth-of-type(n+3)': { fill: 'white' },
                            }),
                            ...(menu.id === 'License' && isMenuActive && {
                                '& svg path:nth-of-type(1)': { fill: 'white' },
                            }),
                            ...(menu.id === 'menu_ai_agent' && isMenuActive && {
                                '& svg path:nth-of-type(1)': { fill: 'white' },
                                '& svg path:nth-of-type(2)': { fill: 'white' },
                                '& svg path:nth-of-type(3)': { fill: 'white' },
                                '& svg path:nth-of-type(n+4)': { fill: 'white' },
                            }),
                        };

                        if (isSub) {
                            return (
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                <ListItemButton
                                    key={menu.id}
                                    component={MenuLink as any}
                                    to={url}
                                    customIsActive={menu.isActive}
                                    className={menu.id}
                                    sx={{ paddingLeft: '16px', color: 'var(--color-light-5)', minHeight: 48 }}
                                >
                                    {menu.icon && (
                                        <ListItemIcon sx={iconSx} open={true}>
                                            {menu.icon}
                                        </ListItemIcon>
                                    )}
                                    <ListItemText open={true} primary={t(menu.id)} />
                                </ListItemButton>
                            );
                        }

                        return (
                            <ListItemTooltip
                                key={menu.id}
                                title={menu.tooltip && open ? t(menu.tooltip) : t(menu.id)}
                                disableHoverListener={open && !isOpen.valueOf}
                                disableFocusListener
                                disableInteractive
                                placement="right"
                                enterDelay={500}
                                enterNextDelay={500}
                                {...(isOpen.valueOf() &&
                                    showOnBoardingTooltip(menu.id) &&
                                    menu.tooltipOnBoarding && {
                                        title: t(menu.tooltipOnBoarding),
                                        defaultOpen: true,
                                        arrow: true,
                                        sx: {
                                            '& .MuiTooltip-tooltip': {
                                                background: 'white',
                                                boxShadow: '0px 0px 4px 0px #E0E0E033, 0px 0px 12px 0px #E0E0E0E0',
                                            },
                                            '& .MuiTooltip-arrow': {
                                                color: 'white',
                                            },

                                            zIndex: 100000,
                                        },
                                    })}
                            >
                                <MenuLink
                                    className={`${menu.id} ${styles.menuLink} ${
                                        menu.access === 'ai_agent' ? styles.internalIcon : ''
                                    }`}
                                    to={url}
                                    customIsActive={menu.isActive}
                                >
                                    {menu.icon && (
                                        <ListItemIcon sx={iconSx} open={open}>
                                            {menu.icon}
                                        </ListItemIcon>
                                    )}
                                    <ListItemText open={open} primary={t(menu.id)} />
                                </MenuLink>
                            </ListItemTooltip>
                        );
                    }
                    return null;
                });
            },
            [access, menuExpand, open, t, toggleMenuExpand, isOpen, showOnBoardingTooltip, location, isDeveloperPortal, submenuAnchor, setSubmenuAnchor],
        );

        return renderMenu(Menus);
    },
);

export type NavbarRef = {
    openHelpCenter: (data: { channelId: string; prefillMessage?: string; defaultWebWidget?: boolean; readOnly?: boolean }) => void;
    getListElem: () => HTMLElement | null;
    toggleNavbar: (isExpand: boolean) => void;
};

const Navbar = forwardRef<NavbarRef>((props, ref) => {
    const location = useLocation();
    const match = useMatch({
        path: '/workflow/:tab/:id',
        end: true,
        caseSensitive: true,
    });
    const databoardAutomationMatch = useMatch({
        path: '/databoards/:boardId/automations',
        end: true,
        caseSensitive: true,
    });

    const { tab } = useParams<{ tab: string; id: string }>();
    const unreadCount = useAppSelector((state) => state.Notification.unreadCount);
    const { isDeveloperPortal } = useDeveloperPortal();
    const { t } = useTranslation();
    const isBiggerScreen = useMediaQuery('(min-width:1280px)', { noSsr: true });
    const [open, setOpen] = useState(true);
    const [isHelpCenterOpen, setIsHelpCenterOpen] = useState(false);
    const [isSettingPartOpen, setIsSettingPartOpen] = useState(false);

    const [menuExpand, setMeneExpand] = useState<Record<string, boolean>>({});
    const [isAccountSettingOpen, setIsAccountSettingOpen] = useState(false);
    const [accountPopperAnchorEl, setAccountPopperAnchorEl] = useState<null | HTMLElement>(null);
    const navigate = useNavigate();
    const accountAvatar = useAppSelector((state) => state.Account.avatar);
    const displayName = useAppSelector((state) => state.Account.displayName);
    const firstName = useAppSelector((state) => state.Account.firstName);
    const lastName = useAppSelector((state) => state.Account.lastName);
    const supportChannelId = useAppSelector((state) => state.Account.support?.customer?.channel?._id);
    const helpCenterButtonRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const { isSmallNavBar, setIsSmallNavBar, isNavBarAutoExpand } = useNavBar();

    useEffect(() => {
        isSmallNavBar && setOpen(!isSmallNavBar);
    }, [isSmallNavBar]);

    useEffect(() => {
        setOpen(isNavBarAutoExpand);
    }, [isNavBarAutoExpand]);

    useImperativeHandle(ref, () => ({
        openHelpCenter: (data) => {
            if (helpCenterButtonRef?.current) {
                setIsHelpCenterOpen(true);
                openHelpCenter({
                    target: helpCenterButtonRef.current,
                    channelId: data.channelId,
                    prefillMessage: data?.prefillMessage,
                    defaultWebWidget: data.defaultWebWidget,
                    readOnly: data.readOnly,
                    onClose: () => {
                        setIsHelpCenterOpen(false);
                    },
                });
            }
        },
        getListElem: () => {
            return listRef.current;
        },
        toggleNavbar: (isExpand: boolean) => {
            setOpen(isExpand);
            setIsSmallNavBar(!isExpand);
        },
    }));

    const handleAccountSettingClick = (event: React.MouseEvent<HTMLElement>): void => {
        event.stopPropagation();
        setAccountPopperAnchorEl(event.currentTarget);
        setIsAccountSettingOpen((prevState) => !prevState);
    };

    const handleAccountSettingClose = () => {
        setAccountPopperAnchorEl(null);
        setIsAccountSettingOpen(false);
    };

    const toggleMenuExpand = useCallback(
        (menuId: string) => {
            setMeneExpand({
                ...menuExpand,
                [menuId]: !menuExpand[menuId],
            });
        },
        [menuExpand],
    );

    useEffect(() => {
        setMeneExpand((prev) => {
            const newExpand: Record<string, boolean> = { ...prev };

            // Set default expand for menus with defaultExpand
            Menus.forEach((menu) => {
                if (menu.subMenus && menu.defaultExpand && prev[menu.id] === undefined) {
                    newExpand[menu.id] = true;
                }
            });

            // Handle setting tabs
            const settingTabs = ['teams', 'member', 'templates', 'llm-provider'];
            const isOpenSettingTab = settingTabs.some((settingTab) => location.pathname.includes(`/${settingTab}`));
            newExpand.menu_govern_core = isOpenSettingTab;
            setIsSettingPartOpen(isOpenSettingTab);

            // Auto expand parent menu when child is active
            const dociqPaths = ['/databoards'];
            const commsiqPaths = ['/chatroom', '/campaign', '/touchpoint', '/channels'];
            const flowopsPaths = ['/workflow-v2', '/workflow_v2/', '/events'];

            if (dociqPaths.some((path) => location.pathname.includes(path))) {
                newExpand.menu_dociq = true;
            }
            if (commsiqPaths.some((path) => location.pathname.includes(path))) {
                newExpand.menu_commsiq = true;
            }

            if (flowopsPaths.some((path) => location.pathname.includes(path))) {
                newExpand.menu_flowops = true;
            }

            return newExpand;
        });
    }, [location.pathname]);

    useEffect(() => {
        if (menuExpand && isSettingPartOpen) {
            const timeout = setTimeout(() => {
                const listElement = menuRef.current;
                if (listElement) {
                    listElement.scrollTo({
                        top: listElement.scrollHeight,
                        behavior: 'smooth',
                    });
                }
            }, 200);
            return () => clearTimeout(timeout);
        }
    }, [menuExpand, isSettingPartOpen]);

    useEffect(() => {
        setOpen(isBiggerScreen);
    }, [isBiggerScreen]);

    const renderNavbarBack = useCallback(() => {
        if (match && match.params?.tab) {
            return (
                <ListItemButton
                    onClick={() => {
                        navigate(`/workflows/${tab}`, { replace: true, state: location.state });
                    }}
                    sx={{ justifyContent: 'flex-end' }}
                >
                    <ListItemIcon
                        open={open}
                        sx={{
                            '& svg': {
                                fontSize: 15,
                            },
                            mr: 1,
                        }}
                    >
                        <Icon name="backIos" />
                    </ListItemIcon>
                    <ListItemText open={open} primary={t(`workflows_tab_${tab}`)} sx={{ color: 'var(--color-secondary-3)' }} />
                </ListItemButton>
            );
        }
        if (databoardAutomationMatch && databoardAutomationMatch.params?.boardId) {
            return (
                <ListItemButton
                    onClick={() => {
                        navigate(`/databoards/${tab}`, { replace: true, state: location.state });
                    }}
                    sx={{ justifyContent: 'flex-end' }}
                >
                    <ListItemIcon
                        open={open}
                        sx={{
                            '& svg': {
                                fontSize: 15,
                            },
                            mr: 1,
                        }}
                    >
                        <Icon name="backIos" />
                    </ListItemIcon>
                    <ListItemText open={open} primary={t('menu_databoards')} sx={{ color: 'var(--color-secondary-3)' }} />
                </ListItemButton>
            );
        }
        return null;
    }, [databoardAutomationMatch, match, navigate, open, tab, t, location]);

    return (
        <>
            <Drawer
                variant="permanent"
                open={open && !isSmallNavBar}
                sx={{ zIndex: 1300 }}
                PaperProps={{
                    sx: {
                        boxSizing: 'border-box',
                    },
                }}
                className="navList"
            >
                <List className={`${styles.container} ${isDeveloperPortal ? styles.developerMode : ''}`} component="nav" ref={listRef}>
                    <ListSubheader
                        id="nested-list-subheader"
                        className={styles.listSubHeader}
                        sx={{
                            height: '69px',
                            p: 0,
                            cursor: 'pointer',
                            marginBottom: '16px',
                            marginTop: isDeveloperPortal ? '16px' : '0px',
                        }}
                        onClick={() => navigate('/chatroom')}
                    >
                        {!isSmallNavBar && <LogoSVG className={`${styles.logo} ${open ? styles.show : styles.hide}`} />}
                        <LogoSmallSVG className={`${styles.logo} ${styles.small} ${open && !isSmallNavBar ? styles.hide : styles.show}`} />
                    </ListSubheader>
                    {renderNavbarBack()}
                    <div className={styles.navbar_inner} ref={menuRef}>
                        <ImbraceMenus open={open && !isSmallNavBar} toggleMenuExpand={toggleMenuExpand} menuExpand={menuExpand} />
                    </div>
                </List>
                {/* Sidebar bottom */}
                <Box sx={{ bottom: 0, left: 0 }}>
                    <div style={{ padding: 10 }}>
                        <Tooltip title={build_version ? `build(${build_version})` : ''} open={false}>
                            <span>{`v.${app_version}`}</span>
                        </Tooltip>
                    </div>
                    {supportChannelId && (
                        <ListItemTooltip
                            title={t('get_support')}
                            disableHoverListener={open && !isSmallNavBar}
                            disableFocusListener
                            placement="right"
                        >
                            <ListItemButton
                                className={isHelpCenterOpen ? 'menu_get_support active' : 'menu_get_support'}
                                ref={helpCenterButtonRef}
                                onClick={(event) => {
                                    setIsHelpCenterOpen(true);
                                    openHelpCenter({
                                        target: event.currentTarget,
                                        channelId: supportChannelId,
                                        onClose: () => {
                                            setIsHelpCenterOpen(false);
                                        },
                                    });
                                }}
                            >
                                <ListItemIcon open={open && !isSmallNavBar}>
                                    <Icon name="help" />
                                </ListItemIcon>

                                <ListItemText open={open && !isSmallNavBar} primary={t('get_support')} />
                            </ListItemButton>
                        </ListItemTooltip>
                    )}
                    <ListItemTooltip title={t('menu_notification')} disableHoverListener={open} disableFocusListener placement="right">
                        <ListItemButton
                            onClick={() => {
                                notificationCenter();
                            }}
                        >
                            <ListItemIcon open={open}>
                                <Badge color="error" badgeContent={unreadCount}>
                                    <Icon name="notifications" />
                                </Badge>
                            </ListItemIcon>

                            <ListItemText open={open && !isSmallNavBar} primary={t('menu_notification')} />
                        </ListItemButton>
                    </ListItemTooltip>
                    <ListItemTooltip title={t('menu_account')} disableHoverListener={open} disableFocusListener placement="right">
                        <ListItemButton onClick={handleAccountSettingClick}>
                            <ListItemIcon open={open}>
                                <Avatar
                                    displayName={displayName}
                                    firstName={firstName}
                                    lastName={lastName}
                                    isActive={true}
                                    avatarUrl={accountAvatar}
                                    width="24px"
                                    height="24px"
                                />
                            </ListItemIcon>
                            <ListItemText open={open && !isSmallNavBar} primary={<EllipsisText text={displayName} />} />
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Icon name="dropRight" style={{ fontSize: 16 }} />
                            </div>
                        </ListItemButton>
                    </ListItemTooltip>
                    <Divider />
                    <ListItemButton
                        onClick={() => {
                            setOpen(!open);
                            setIsSmallNavBar(open);
                        }}
                        sx={{ justifyContent: 'flex-end' }}
                    >
                        <ListItemIcon
                            open={open}
                            sx={{
                                width: open ? 24 : '100%',
                                justifyContent: 'flex-start',
                                '& svg': {
                                    fontSize: 24,
                                },
                                marginRight: 0,
                            }}
                        >
                            {open ? <Icon name="navCollapse" /> : <Icon name="navExpand" />}
                        </ListItemIcon>
                    </ListItemButton>
                </Box>
            </Drawer>
            <NavbarMask root={document.querySelector('.navList')} />
            {/* <NotificationDrawer open={drawerIsOpen} closeDrawerOnClick={toggleNotificationCenter} /> */}
            <AccountSettingPopper open={isAccountSettingOpen} anchorEl={accountPopperAnchorEl} onClose={handleAccountSettingClose} />
        </>
    );
});

export default Navbar;
