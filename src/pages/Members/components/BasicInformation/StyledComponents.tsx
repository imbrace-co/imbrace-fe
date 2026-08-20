import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ProfileContainer = styled(Box)(() => ({
    paddingLeft: '32px',
    display: 'flex',
    gap: '24px',
}));

export const ProfileContent = styled(Box)(() => ({
    display: 'flex',
    flexDirection: 'column',
}));

export const BirthdayGenderContainer = styled(Box)(() => ({
    display: 'flex',
}));

export const TabsContainer = styled(Box)(() => ({
    display: 'flex',
    padding: '0 32px',
    borderBottom: '1px solid var(--color-light-3)',
}));

export const BasicsLabelContainer = styled(Box)(() => ({
    minWidth: '115px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',

    '& > p': {
        color: 'var(--color-secondary-3)',
    },
}));

export const BasicsField = styled(Box, { shouldForwardProp: (props) => props !== 'isEmptyValue' })<{ isEmptyValue?: boolean }>(
    ({ isEmptyValue }) => ({
        '& p': {
            color: isEmptyValue ? 'var(--color-light-4)' : 'var(--color-light-7)',
        },
    }),
);
