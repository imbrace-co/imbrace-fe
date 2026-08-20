import { Box, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

export const StyledPaper = styled(Paper)(() => ({
    borderRadius: 0,
    position: 'relative',
    paddingBottom: '52px',
    width: '100%',

    '& .disclaimer': {
        backgroundColor: 'transparent',
        width: 'inherit',
        color: '#828282',
        position: 'absolute',
        left: '10px',
        bottom: '-60px',
        textAlign: 'left',

        '&::before': {
            content: "'*'",
            fontSize: '12px',
            position: 'absolute',
            top: '5px',
            left: '-8px',
        },
    },
}));

export const HeaderContainer = styled(Box)(() => ({
    padding: '20px 16px 0 16px',
}));

export const Header = styled(Box)(() => ({
    paddingLeft: '56px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
}));

export const EmailTitle = styled('div')(() => ({
    width: '65%',
    fontSize: '22px',
    marginRight: '17px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    '& div': {
        display: 'flex',
        alignItems: 'center',
    },
}));

export const IconContainer = styled('div')(() => ({
    width: '35%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '& div > svg': {
        padding: '0 2px',
        width: '24px',
        height: '24px',
        fill: '#5F6368',
    },
}));

export const EmailProfile = styled('div')(() => ({
    height: '80px',
    width: 'calc(100% - 42px)',
    display: 'flex',
    alignItems: 'center',

    '& .avatarContainer': {
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },

    '& > svg': {
        marginRight: '16px',
    },
    '& div.profileContainer': {
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',

        '& > div:first-of-type': {
            paddingLeft: '16px',
        },
    },
}));

export const ProfileColumn = styled('div')((props: { width?: string }) => ({
    width: props.width ? `calc(${props.width})` : '100%',
    display: 'flex',
    flexDirection: 'column',

    '& .profileDetail': {
        display: 'flex',
        alignItems: 'center',
        '& .profileDisplayName': {
            width: '65%',
        },
    },
    '& > span > svg': {
        fill: '#333',
    },
    '& span.icons': {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '5px',
    },
    '& span.fallbackEmail': {
        height: '21px',
        fontSize: '14px',
        flex: 1,
        paddingLeft: '3px',
        minWidth: '50px',
        display: 'flex',
        alignItems: 'center',
    },
    '@media (max-width: 1024px)': {
        '& span.fallbackEmail': {
            minWidth: '90px',
        },
        '& span.icons': {
            gap: '2px',
            '& > svg:nth-of-type(-n + 2)': {
                display: 'none',
            },
        },
    },
}));

export const ProfileText = styled('div')(() => ({
    height: '20px',
    fontSize: '14px',
    fontWeight: 500,
    LineHeight: '20px',
    letterSpacing: '0.02em',
    display: 'flex',

    '& span': {
        fontSize: '12px',
        lineHeight: '14.56px',
        letterSpacing: '0.02em',
        color: '#5F6368',
        display: 'inline-flex',
        alignItems: 'center',
    },
    '& span.icons': {
        justifyContent: 'flex-end',
        textAlign: 'right',
    },

    '& span.timestamp': {
        minWidth: '50px',
        justifyContent: 'flex-end',
        alignItems: 'center',
        fontWeight: 300,
    },
    '@media (max-width: 1024px)': {
        '& span.timestamp': {
            display: 'none',
        },
    },

    '& span.toMe': {
        fontWeight: 400,
    },
}));

export const EmailBody = styled(Box)(() => ({
    padding: '44px 48px 0 48px',
    width: '100%',
    color: 'var(--color-light-7)',
}));

export const EmailFooter = styled(Box)(() => ({
    padding: '0 48px 0 48px',
    width: '100%',
    color: '#BDBDBD',
}));

export const ESignatureContainer = styled(Box)(() => ({
    marginTop: '60px',
    marginBottom: '36px',
    display: 'flex',

    '& .imgContainer': {
        marginRight: '12px',
        objectFit: 'cover',
        aspectRatio: '5/3',
    },

    '& .textContainer': {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
    },
}));
