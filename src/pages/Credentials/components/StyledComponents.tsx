import { Button, DialogTitle, Paper, Select, Typography } from '@mui/material';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

import TextField from '@/components/TextField';

export const StyledInput = styled(TextField)(() => {
    return {
        width: '100%',
        height: '40px',
        marginBottom: '24px',
        fontSize: '14px',
        fontWeight: 400,
        lineHeight: '24px',
        '& .MuiInputBase-input': {
            padding: '8.5px 14px',
        },
        '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--color-light-3)',
        },
    };
});

export const StyledSelect = styled(Select)(({ theme }) => ({
    width: '100%',
    backgroundColor: 'none',
    '.MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--color-light-3)',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--color-primary-1)',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
        borderColor: 'var(--color-primary-1)',
    },

    'label + &': {
        marginTop: theme.spacing(3),
    },
    '& .MuiInputBase-input': {
        display: 'flex',
        alignItems: 'center',
        borderRadius: 4,
        position: 'relative',
        backgroundColor: 'none',
        border: 'none',
        fontSize: 16,
        padding: '8.5px 14px',
        height: '23px !important',

        '& :focus': {
            backgroundColor: 'red',
            borderColor: 'var(--color-light-5) !important',
        },
    },
}));

export const StyledDialogTitle = styled(DialogTitle)(() => ({
    padding: '16px 24px 12px 24px',
    fontSize: '20px',
    fontWeight: 800,
    lineHeight: '24px',
    color: 'var(--color-light-7)',
}));

export const StyledSubtitle = styled(Typography)(() => ({
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '20.3px',
    color: 'var(--color-light-5)',
    textTransform: 'capitalize',
}));

export const StyledButton = styled(Button)<{ width?: string }>(({ width }) => {
    return {
        width: width ? width : '100%',
        height: '40px',
        color: 'var(--color-light-1)',
        backgroundColor: 'var(--color-primary-1)',
        borderRadius: '10px',
        '&:hover': { color: 'var(--color-primary-1)' },
        '&.Mui-disabled': {
            border: 'var(--color-light-3)',
            backgroundColor: 'var(--color-light-3)',
            color: 'var(--color-light-5)',
        },
    };
});

export const StyledMenuPaper = styled(Paper)(() => ({
    padding: '8px 12px !important',
    fontSize: '14px',
    lineHeight: '21px',
    fontWeight: 400,
    borderRadius: '0 0 4px 4px',
    border: '1px solid var(--color-light-3)',
    borderTop: 'none',

    '& li': {
        height: '37px',
    },
}));

export const StyledChip = styled(Chip)(() => ({
    padding: '4px',
    height: '22px',
    backgroundColor: 'var(--color-light-1)',
    color: 'var(--color-primary-6)',
    cursor: 'pointer',

    '&:hover': {
        backgroundColor: 'var(--color-primary-2)',
    },
}));

export const StyledDescription = styled(Typography)(() => ({
    color: 'var(--color-light-5)',
    fontSize: '14px',
    fontWeight: 400,
    lineHeight: '19px',
    paddingBottom: 2,
}));
