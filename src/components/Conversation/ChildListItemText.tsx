import ListItemText from '@mui/material/ListItemText';
import styled from '@mui/material/styles/styled';

const getBorderColor = (status?: 'online' | API.StatusType) => {
    switch (status) {
        case 'spam':
            return 'var(--color-danger-5)';
        case 'rep needed':
            return 'var(--color-accent-yellow-2)';
        // case 'active':
        //     return 'var(--color-primary-1)';
        case 'online':
            return 'var(--color-green-1)';
        case 'closed':
        default:
            return 'var(--color-light-5)';
    }
};

interface ChildListItemTextProps {
    isStatus?: boolean;
    statusType?: 'online' | API.StatusType;
}

const ChildListItemText = styled(ListItemText, {
    shouldForwardProp: (props) => props !== 'isStatus' && props !== 'statusType',
})<ChildListItemTextProps>(({ isStatus, statusType, sx }) => ({
    color: 'inherit',
    '& .MuiTypography-root': {
        ...sx,
        lineHeight: '20px',
    },
    ...(isStatus && {
        borderLeft: `5px solid ${getBorderColor(statusType)}`,
        paddingLeft: '10px',
    }),
}));

export default ChildListItemText;
