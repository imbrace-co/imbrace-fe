import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

export const PageHeader = styled(Typography)(() => ({
    fontWeight: '800',
    fontSize: '36px',
    lineHeight: '43px',
    marginBottom: '20px',
    color: 'var(--color-light-7)',
    '@media (max-height: 700px)': {
        fontSize: '24px',
        marginBottom: '6px',
    },
}));

export const socialIconButton = {
    color: '#000',
    textTransform: 'none',
    fontWeight: '400',
    width: '100%',
    border: '1px solid #BDBDBD',
};

export const socialIconFirstButton = {
    marginBottom: '32px',
};

export const buttonStartIcon = {
    width: '22px',
    height: '22px',
    position: 'absolute',
    left: '17px',
};
