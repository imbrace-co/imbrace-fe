import { TextField as MuiTextField } from '@mui/material';
import { styled } from '@mui/material/styles';

const TextField = styled(MuiTextField)({
    width: '100%',
    '& .MuiFormHelperText-root': {
        margin: 0,
        color: 'var(--color-danger-5)',
        '&.Mui-error': {
            color: 'var(--color-danger-5)',
        },
    },
    '& .MuiOutlinedInput-root': {
        minHeight: 40,
        padding: 0,
        '& .MuiSelect-select': {
            display: 'flex',
        },
        '& .MuiOutlinedInput-input': {
            padding: '8.5px 14px',
        },
        '&.Mui-error': {
            borderColor: 'var(--color-danger-5)',
        },
        '&.Mui-error fieldset': {
            borderColor: 'var(--color-danger-5)',
        },
        '&:hover fieldset': {
            borderColor: 'var(--color-primary-1)',
        },
        '&.Mui-error:hover fieldset': {
            borderColor: 'var(--color-danger-5)',
        },
        '&.Mui-focused fieldset': {
            borderColor: 'var(--color-primary-1)',
        },
        '&.Mui-focused.Mui-error fieldset': {
            borderColor: 'var(--color-danger-5)',
        },
        '&.Mui-disabled fieldset': {
            borderColor: 'var(--color-light-3)',
        },
    },
    '& textarea ~ fieldset::before': {
        backgroundImage: 'none',
    },
});

export default TextField;
