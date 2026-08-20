import MuiListItemButton from '@mui/material/ListItemButton';
import styled from '@mui/material/styles/styled';

interface ListItemButtonProps {
    isActive?: boolean;
}

const ListItemButton = styled(MuiListItemButton, { shouldForwardProp: (props) => props !== 'isActive' })<ListItemButtonProps>(
    ({ theme, isActive }) => ({
        paddingRight: '17px',
        paddingLeft: '23px',
        color: 'var(--color-light-7)',
        ...(isActive && {
            color: theme.palette.imbrace_blue.main,
            backgroundColor: 'rgba(173,214,255,0.5)',
            '&:hover': {
                backgroundColor: 'rgba(173,214,255,0.5)',
            },
            '& .MuiTypography-root': {
                fontWeight: 500,
            },
        }),
    }),
);

export default ListItemButton;
