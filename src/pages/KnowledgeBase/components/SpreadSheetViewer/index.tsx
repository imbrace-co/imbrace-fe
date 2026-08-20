import { Box, CircularProgress } from '@mui/material';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useCallback } from 'react';
import SimpleBar from 'simplebar-react';
import * as XLSX from 'xlsx';

interface SpreadSheetViewerProps {
    url: string;
}

type DataType = Record<string, string[]>[];

const SpreadSheetViewer = ({ url }: SpreadSheetViewerProps) => {
    const handleFetchFromUrl = useCallback(async (): Promise<DataType> => {
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const data = new Uint8Array(response.data);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            return XLSX.utils.sheet_to_json(sheet, { header: 1 });
        } catch (error) {
            console.error('Error fetching or parsing Excel file:', error);
            return [];
        }
    }, [url]);

    const { data: excelData, isLoading } = useQuery<DataType>({
        queryFn: () => handleFetchFromUrl(),
        queryKey: ['knowledge-base', url],
        placeholderData: keepPreviousData,
    });

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
            {excelData ? (
                <table
                    style={{
                        overflow: 'auto',
                        padding: '8px',
                        backgroundColor: 'var(--color-light-1)',
                    }}
                >
                    <thead>
                        <tr>
                            {Object.keys(excelData[0]).map((key) => (
                                <th key={key}>{key}</th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {excelData.map((individualExcelData, index) => {
                            return (
                                <tr key={index}>
                                    {Object.keys(individualExcelData).map((key) => {
                                        return <td key={key}>{individualExcelData[key]}</td>;
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            ) : (
                <div>Data is empty</div>
            )}
        </SimpleBar>
    );
};

export default SpreadSheetViewer;
