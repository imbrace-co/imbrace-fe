import { Box, CircularProgress } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import React from 'react';
import SimpleBar from 'simplebar-react';

interface Props {
    url: string;
}

const CsvViewer = ({ url }: Props) => {
    const handleReadRemoteFile = async () => {
        try {
            const response = await fetch(url);
            const text = await response.text();
            // split the text by newline
            const lines = text.split('\n');
            // map through all the lines and split each line by comma.
            return lines.map((line) => line.split(','));
        } catch (error) {
            console.error(error);
        }
    };

    const { data, isLoading } = useQuery({
        queryFn: () => handleReadRemoteFile(),
        queryKey: ['knowledge-base', url],
        placeholderData: keepPreviousData,
    });

    const headers = data?.[0];
    const rows = data?.slice(1);

    if (isLoading) {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: '32px',
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <CircularProgress size={20} />
            </Box>
        );
    }
    return (
        <SimpleBar style={{ height: '100%', width: '100%' }}>
            <table
                style={{
                    width: 'max-content',
                    height: 'max-content',
                    overflow: 'auto',
                    padding: '8px',
                    backgroundColor: 'var(--color-light-1)',
                }}
            >
                <thead>
                    <tr>
                        {headers?.map((header, i) => (
                            <th key={i} style={{ textAlign: 'left' }}>
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows?.map((rowData, i) => {
                        return (
                            <tr key={i}>
                                {rowData?.map((el, idx) => {
                                    return <td key={idx}>{el}</td>;
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </SimpleBar>
    );
};
export default CsvViewer;
