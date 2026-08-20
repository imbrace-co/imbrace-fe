import ListItemText from '@mui/material/ListItemText';
import styled from '@mui/material/styles/styled';

const AddNewViewText = styled(ListItemText)(({ theme }) => ({
    '& .MuiTypography-root': { fontSize: 16, lineHeight: '21px', fontWeight: 500 },
}));

export default AddNewViewText;
