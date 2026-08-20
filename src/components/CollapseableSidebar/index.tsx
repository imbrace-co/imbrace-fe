import type { CSSObject, Theme } from '@mui/material';
import { Drawer } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { FC } from 'react';
import React from 'react';

interface Props {
    sidebarOpen: boolean;
    children?: React.ReactNode;
}

const drawerWidth = 400;

const openedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.easeOut,
        duration: 0.5,
    }),
    overflowX: 'hidden',
    width: drawerWidth,
});

const closedMixin = (theme: Theme): CSSObject => ({
    transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.easeIn,
        duration: 0.7,
    }),
    overflowX: 'hidden',
    width: 0,
});

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
    ...(open && {
        ...openedMixin(theme),
        '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
        ...closedMixin(theme),
        '& .MuiDrawer-paper': closedMixin(theme),
    }),
}));

const CollapseSidebar: FC<Props> = (props) => {
    const { sidebarOpen } = props;

    return (
        <StyledDrawer
            variant="permanent"
            anchor="right"
            open={sidebarOpen}
            PaperProps={{
                sx: {
                    overflowY: 'hidden',
                    width: sidebarOpen ? drawerWidth : 0,
                    borderLeft: '1px solid var(--color-light-3)',
                    position: 'relative',
                },
            }}
        >
            {props.children}
        </StyledDrawer>
    );
};

export default CollapseSidebar;
