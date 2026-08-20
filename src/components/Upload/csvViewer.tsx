import { FileMIME } from '@/pages/DataboardEnhance';
import { Spin } from '@imbrace/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Papa from 'papaparse';
import SimpleBar from 'simplebar-react';
import * as XLSX from 'xlsx';

interface Props {
    url?: string | undefined;
    fileType?: string 
}

const CsvViewer = ({ url, fileType }: Props) => {
    const handleReadRemoteFile = async () => {
        if (!url) throw new Error('no file url provided');
        const isXLX = fileType === FileMIME.XLS || fileType === FileMIME.XLSX;

        if (isXLX) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
            return data;
        } else {
            const response = await fetch(url);
            const text = await response.text();
            const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
            return result.data;
        }
    };

    const { data, isLoading } = useQuery({
        queryFn: () => handleReadRemoteFile(),
        queryKey: ['knowledge-base', url],
        placeholderData: keepPreviousData,
        enabled: !!url,
    });

    const headers = data?.[0];
    const rows = data?.slice(1);

    return (
        <SimpleBar style={{ height: '100%', width: '100%', backgroundColor: 'var(--color-light-1)' }}>
            <Spin isSpinning={isLoading}>
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
                        {rows?.map((rowData, i) => (
                            <tr key={i}>
                                {rowData?.map((el, idx) => (
                                    <td key={idx}>{el}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Spin>
        </SimpleBar>
    );
};

export default CsvViewer;
