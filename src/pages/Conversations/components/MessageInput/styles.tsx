import type { IconButtonTypeMap } from '@mui/material/IconButton';
import MuiIconButton from '@mui/material/IconButton';
import type { OverridableComponent } from '@mui/material/OverridableComponent';
import { styled } from '@mui/material/styles';

interface StyledButtonProps {
    isActive?: boolean;
}

export const StyledIconButton = styled(MuiIconButton, { shouldForwardProp: (prop) => prop !== 'isActive' })<StyledButtonProps>(
    ({ isActive }) => ({
        ...(isActive && { color: 'var(--color-primary-1)' }),
    }),
) as OverridableComponent<IconButtonTypeMap<StyledButtonProps>>;
