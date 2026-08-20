import { List, ListItem as MuiListItem, ListItemText as MuiListItemText } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ValidationList = styled(List)(() => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    listStyleType: 'disc',
    paddingLeft: '26px',
    color: 'var(--color-secondary-3)',
}));

export const ListItem = styled(MuiListItem)(() => ({
    margin: '2px 0',
    padding: 0,
    minHeight: '20px',
    height: 'auto',
    display: 'list-item',
    listStyleType: 'disc',

    '& .MuiSvgIcon-root': {
        paddingLeft: '8px',
        fontSize: '20px',
        flexShrink: 0,
    },
}));

export const ListItemText = styled(MuiListItemText)(() => ({
    margin: 0,
    fontWeight: 400,
    fontSize: '14px',

    '& .MuiTypography-root': {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '4px',
        flexWrap: 'nowrap',
        lineHeight: '20px',
    },
    '& .MuiListItemIcon-root': {
        minWidth: 'unset',
        flexShrink: 0,
        paddingTop: '2px',
    },
}));
