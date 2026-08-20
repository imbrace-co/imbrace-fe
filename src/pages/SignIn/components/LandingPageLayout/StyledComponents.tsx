import { Box, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Link } from 'react-router-dom';

export const PageLayout = styled(Paper)(() => ({
    width: '100%',
    height: '100vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    margin: '0',
    padding: '0',
    boxSizing: 'border-box',
    boxShadow: 'none',
    border: 'none',
    backgroundColor: '#fff',
}));

export const Header = styled(Box)(() => ({
    padding: '24px 0 0 0',
    width: '100%',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
}));

export const LanguageSelectorContainer = styled(Box)(() => ({
    position: 'absolute',
    top: '24px',
    right: '28px',
}));

export const ContentContainer = styled(Box)(() => ({
    width: '400px',
    maxWidth: '100%',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    flexShrink: 0,
    marginTop: 'auto',
    marginBottom: 'auto',
    padding: '24px 0 20px 0',
    boxSizing: 'border-box',
}));

export const Footer = styled(Box)(() => ({
    padding: '16px 0',
    width: '100%',
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
}));

export const CopyrightText = styled(Typography)(() => ({
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '16px',
    color: 'var(--color-secondary-3)',
}));

export const CopyrightLink = styled(Link)(() => ({
    fontSize: '12px',
    textAlign: 'right',
    textDecorationLine: 'underline',
    color: 'var(--color-primary-1)',
}));
