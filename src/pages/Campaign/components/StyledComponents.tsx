import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
export const FormLabel = styled(Typography)(() => ({
    display: 'flex',
    gap: '12px',
    flexDirection: 'row',
    color: 'var(--color-light-7)',
    fontStyle: 'normal',
    fontWeight: 700,
    fontSize: 14,
    lineHeight: '24px',
}));

export const SubTitleText = styled(Typography)(() => ({
    fontWeight: '400',
    fontSize: '14px',
    lineHeight: '150%',
    color: 'var(--color-light-5)',
    marginBottom: '10px',
}));
