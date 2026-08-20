import { Box } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ProfileContainer = styled(Box)(() => ({
    paddingLeft: '32px',
    paddingBottom: '24px',
    display: 'flex',
    gap: '24px',
}));

export const ProfileContent = styled(Box)(() => ({
    display: 'flex',
    flexDirection: 'column',
}));

export const SubProfileInfo = styled(Box)(() => ({
    display: 'flex',
}));

export const TabsContainer = styled(Box)(() => ({
    marginTop: '32px',
    display: 'flex',
    paddingLeft: '32px',
    borderBottom: '1px solid var(--color-light-3)',
}));

export const BasicFieldContainer = styled(Box, { shouldForwardProp: (propName) => propName !== 'isEditMode' })(
    ({ isEditMode }: { isEditMode?: boolean }) => ({
        height: 'auto',
        display: 'flex',
        gap: '16px',
        padding: isEditMode ? 0 : '10px 0',
    }),
);

export const BasicsLabelContainer = styled(Box, { shouldForwardProp: (props) => props !== 'alignTop' })<{
    alignTop?: boolean;
}>(({ alignTop }) => {
    return {
        minWidth: '115px',
        display: 'flex',
        gap: '8px',
        alignSelf: alignTop ? 'flex-start' : 'center',

        '& > p': {
            color: 'var(--color-secondary-3)',
        },

        '& svg': { fontSize: '20px' },
    };
});

export const BasicsField = styled(Box, { shouldForwardProp: (props) => props !== 'isEmptyValue' })<{
    isEmptyValue?: boolean;
    isEditMode?: boolean;
}>(({ isEmptyValue, isEditMode }) => {
    return {
        flexGrow: 1,
        ...(!isEditMode && {
            '& > div > p': {
                color: isEmptyValue ? 'var(--color-light-4)' : 'var(--color-light-7)',
            },
        }),
    };
});

export const ModalHeading = styled(Box)(() => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
}));
