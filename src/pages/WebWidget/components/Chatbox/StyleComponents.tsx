import { Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';

export const StyledAvatar = styled(Avatar)(() => ({
    backgroundColor: 'var(--color-light-3)',
    '& svg': { fill: 'var(--color-light-5)' },
}));
