import { Box } from '@mui/material';
import React from 'react';

interface Props {
    boardFields?: API.ContactBoardField[];
}

const BoardFields = (props: Props) => {
    const { boardFields } = props;

    const renderBoardFields = () => {
        return (
            <>
                {boardFields?.map((field) => {
                    const { name } = field.field;
                    return <Box key={field._id}>{name}</Box>;
                })}
            </>
        );
    };

    return <Box sx={{ padding: '0 32px' }}>{renderBoardFields()}</Box>;
};
export default BoardFields;
