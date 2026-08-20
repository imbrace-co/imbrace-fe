import ListItemText from '@mui/material/ListItemText';
import styled from '@mui/material/styles/styled';

type Props = {
    sx?: {
        color?: string;
        fontSize?: string | number;
        fontWeight?: string | number;
        lineHeight?: string | number;
    };
};

const HeaderListItemText = styled(ListItemText)((props: Props) => {
    return {
        color: props?.sx?.color || 'var(--color-light-7)',
        '& .MuiTypography-root': {
            fontSize: props?.sx?.fontSize || '1rem',
            fontWeight: props?.sx?.fontWeight || 500,
            lineHeight: props?.sx?.lineHeight || 'initial',
        },
        paddingLeft: 0,
    };
});

export default HeaderListItemText;
