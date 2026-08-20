import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';

export const ForgotPassword = styled(Link)(() => ({
    display: 'block',
    marginTop: '4px',
    marginLeft: 'auto',
    fontWeight: 400,
    fontSize: '14px',
    textAlign: 'right',
    textDecorationLine: 'underline',
    color: 'var(--color-light-5)',
}));

export const FieldContainer = styled(Box)(() => ({
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
}));
