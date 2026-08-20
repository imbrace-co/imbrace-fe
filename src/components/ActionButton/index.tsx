import { LoadingButton } from '@mui/lab';
import type { SxProps, Theme } from '@mui/material';
import { type FC, type MouseEvent, useState } from 'react';

const ColorMapping = {
    primary: {
        backgroundColor: 'var(--color-primary-1)',
        hoverBackgroundColor: 'var(--color-primary-4)',
        textHoverBackgroundColor: 'var(--color-primary-3)',
        disabledColor: 'var(--color-primary-5)',
    },
    secondary: {
        backgroundColor: 'var(--color-secondary-1)',
        hoverBackgroundColor: 'var(--color-secondary-3)',
        textHoverBackgroundColor: 'var(--color-secondary-2)',
        disabledColor: 'var(--color-secondary-4)',
    },
};

const Styles = (
    textTransform: 'none' | 'capitalize' | 'uppercase' | 'lowercase' = 'none',
    type: keyof typeof ColorMapping = 'primary',
) => ({
    display: 'flex',
    borderRadius: '4px',
    boxShadow: 'none',
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '20px',
    letterSpacing: '2%',
    transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
    color: ColorMapping[type].backgroundColor,
    gap: '8px',
    width: 'auto',
    height: 'auto',
    padding: '4px 8px',
    textTransform: textTransform || 'none',
    '&:hover': {
        boxShadow: 'none',
        background: ColorMapping[type].textHoverBackgroundColor,
    },
    '&.Mui-disabled': {
        color: ColorMapping[type].disabledColor,
    },
    '& > svg': {
        transition: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        color: ColorMapping[type].backgroundColor,
        fontSize: 16,
    },
    '&.MuiLoadingButton-loading': {
        '& > svg': {
            color: ColorMapping[type].disabledColor,
        },
    },
    '& .MuiCircularProgress-root': {
        fontSize: 16,
        '& svg': {
            width: '1em',
            height: '1em',
        },
    },
});

interface ActionButtonProps {
    /**
     * Button inner text
     */
    text?: string;
    /**
     * Button type
     * @default primary
     */
    type?: 'primary' | 'secondary';
    /**
     * Button disabled status
     * @default false
     */
    disabled?: boolean;
    /**
     * Button loading status
     * @default false
     */
    loading?: boolean;
    /**
     * Click function
     */
    onClick?: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void;
    /**
     * Button icon
     */
    icon?: JSX.Element;
    textTransform?: 'none' | 'capitalize' | 'uppercase' | 'lowercase';
    sx?: SxProps<Theme>;
}

const ActionButton: FC<ActionButtonProps> = (props) => {
    const { text, icon, type, textTransform, onClick, sx, ...restProps } = props;
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
        setLoading(true);
        await onClick?.(e);
        setLoading(false);
    };

    return (
        <LoadingButton variant="text" loading={loading} sx={{ ...Styles(textTransform, type), ...sx }} onClick={handleClick} {...restProps}>
            {icon && icon}
            {text && <span>{text}</span>}
        </LoadingButton>
    );
};

export default ActionButton;
