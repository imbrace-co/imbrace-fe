import styled from '@emotion/styled';
import { Chip } from '@mui/material';

export const PendingChip = styled(Chip)(() => ({
    padding: '4px 8px',
    color: 'var(--color-light-4)',
    border: '1px solid var(--color-light-4)',
    borderRadius: '4px',
    height: '24px',
    '& .MuiChip-label': {
        padding: 0,
        width: '100%',
    },
}));

export const DisabledRoleChip = styled(Chip)(() => ({
    backgroundColor: 'var(--color-light-2)',
    color: 'var(--color-light-4)',
    padding: '4px 0',
    height: '24px',
    borderRadius: '30px',
}));

export const roleAttr = (role: API.Role) => {
    switch (role) {
        case 'admin':
            return {
                role: 'team_role_admin',
                color: 'var(--color-primary-1)',
                bgColor: 'var(--color-primary-3)',
            };
        case 'member':
            return {
                role: 'team_role_member',
                color: 'var(--color-accent-yellow-2)',
                bgColor: 'var(--color-accent-yellow-7)',
            };
        default:
            return {
                role: '',
                color: '#333',
                bgColor: '#fff',
            };
    }
};

export const RoleChip = styled(Chip, { shouldForwardProp: (props) => props !== 'role' })<{
    role: API.Role;
}>(({ role }) => {
    return {
        backgroundColor: roleAttr(role).bgColor,
        color: roleAttr(role).color,
        padding: '4px 0',
        height: '24px',
        borderRadius: '30px',
    };
});
