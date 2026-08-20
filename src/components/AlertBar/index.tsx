import { Icon, IconButton } from '@imbrace/ui';
import Alert from '@mui/material/Alert';
import { useState } from 'react';

interface AlertBarProps {
    severity: 'success' | 'info' | 'warning' | 'error';
    icon?: JSX.Element;
    message: string;
}

const colorMapping = {
    warning: 'var(--color-accent-yellow-2)',
    success: 'var(--color-green-2)',
    info: 'var(--color-primary-9)',
    error: 'var(--color-danger-2)',
};
const bgMapping = {
    warning: 'var(--color-accent-yellow-5)',
    success: 'var(--color-green-4)',
    info: 'var(--color-secondary-4)',
    error: 'var(--color-danger-3)',
};

const AlertBar = (props: AlertBarProps) => {
    const { severity, icon, message } = props;
    const [open, setOpen] = useState(true);

    return (
        <>
            {open && (
                <Alert
                    severity={severity}
                    iconMapping={{
                        warning: icon ? icon : <Icon name="errorOutline" fontSize="inherit" color={colorMapping[severity]} />,
                        success: icon ? icon : <Icon name="checkCircle" fontSize="inherit" color={colorMapping[severity]} />,
                        info: icon ? icon : <Icon name="info" fontSize="inherit" color={colorMapping[severity]} />,
                        error: icon ? icon : <Icon name="errorOutline" fontSize="inherit" color={colorMapping[severity]} />,
                    }}
                    action={
                        <IconButton
                            aria-label="close"
                            size="xs"
                            onClick={() => {
                                setOpen(false);
                            }}
                            sx={{
                                color: 'inherit',
                                backgroundColor: 'inherit',
                                '&:hover': {
                                    backgroundColor: bgMapping[severity],
                                },
                            }}
                        >
                            <Icon name="close" fontSize={12} />
                        </IconButton>
                    }
                    sx={{
                        mt: '4px',
                        padding: '8px 12px',
                        minHeight: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        fontWeight: 400,
                        lineHeight: '16.8px',

                        '& .MuiPaper-root': {
                            padding: '0px !important',
                            display: 'flex',
                            alignItems: 'center',
                        },
                        '& .MuiAlert-icon': {
                            padding: 0,
                            fontSize: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            color: '#FA9917',
                        },
                        '& .MuiAlert-message': {
                            padding: 0,
                            paddingRight: '8px',
                            paddingTop: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            color: colorMapping[severity],
                        },
                        '& .MuiAlert-action': {
                            marginRight: '8px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            width: '6px',
                            height: '6px',
                            color: colorMapping[severity],
                            '& .MuiIconButton-root': {
                                transition: 'all 0.1s ease-in-out',
                                fontSize: '12px',

                                width: '16px',
                                height: '16px',
                            },

                            '& .MuiIconButton-root:hover': {
                                borderRadius: '4px',
                                backgroundColor: 'var(--color-accent-yellow-5)',
                            },
                        },
                    }}
                >
                    {message}
                </Alert>
            )}
        </>
    );
};

export default AlertBar;
