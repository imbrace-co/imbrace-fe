import { Button, Spin, Typography } from '@imbrace/ui';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
} from '@mui/material';
import React, { useState, useEffect } from 'react';
import styles from './index.module.scss';
import apiFetch from '@/services/axios/handler';
import { getFinancialFileDetailsById, getFinancialReportDetailsById } from '@/services/api/financialReport';
import { Space } from '@imbrace/ui';
import { useNotify } from '@/contexts/SnackbarContext';

interface FinancialFileContentProps {
    id: string;
    onClose: () => void;
    type: 'file' | 'report';
}

const FinancialFileContent: React.FC<FinancialFileContentProps> = ({ id, onClose, type }) => {
    const [content, setContent] = useState<Record<string, any>[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);

    const { notify } = useNotify();

    const getFileDetailsById = async (id: string) => {
        try {
            setIsLoading(true);
            const { data } = await apiFetch<{
                message: string;
                importedFile: {
                    data: Record<string, any>[];
                    pagination: {
                        total: string;
                        page: number;
                        limit: number;
                        total_pages: number;
                    };
                };
                report: {
                    data: Record<string, any>[];
                    pagination: {
                        total: string;
                        page: number;
                        limit: number;
                        total_pages: number;
                    };
                };
            }>(
                type === 'file'
                    ? getFinancialFileDetailsById.api(id, page, rowsPerPage)
                    : getFinancialReportDetailsById.api(id, page, rowsPerPage),
                type === 'file' ? getFinancialFileDetailsById.method : getFinancialReportDetailsById.method,
            );

            if (type === 'file') {
                setTotalPages(data.importedFile.pagination.total_pages);
                setContent(data.importedFile.data);
            } else {
                setTotalPages(data.report.pagination.total_pages);
                setContent(data.report.data);
            }
            setIsLoading(false);
        } catch (err) {
            setIsLoading(false);
            notify({
                message: 'Failed to get file details. Please try again later.',
                type: 'error',
            });
            onClose();
            console.log(err);
        }
    };

    useEffect(() => {
        getFileDetailsById(id);
    }, [page, rowsPerPage]);

    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    const handleRowsPerPageChange = (event: SelectChangeEvent<number>) => {
        setRowsPerPage(Number(event.target.value));
        setPage(1);
    };

    return (
        <Spin isSpinning={isLoading}>
            <Space direction="vertical" justify="start" align="start" style={{ width: '100%', height: '100%' }}>
                {content.length > 0 && (
                    <>
                        <TableContainer
                            className={styles.tableContainer}
                            style={{
                                height: 'calc(100vh - 220px)',
                                overflow: 'auto',
                            }}
                        >
                            <Table stickyHeader>
                                <TableHead className={styles.tableHead}>
                                    <TableRow>
                                        {Object.keys(content[0])
                                            .filter((key) => key !== 'id')
                                            .map((header, index) => (
                                                <TableCell key={index}>{header}</TableCell>
                                            ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {content.map((row, index) => (
                                        <TableRow key={row.id} className={index % 2 === 1 ? styles.tableRowEven : styles.tableRowOdd}>
                                            {Object.entries(row)
                                                .filter(([key]) => key !== 'id')
                                                .map(([key, value], cellIndex) => (
                                                    <TableCell key={cellIndex}>{value !== null ?value.toString() :""}</TableCell>
                                                ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <div className={styles.paginationControls}>
                            <FormControl size="small" className={styles.rowsPerPageControl} style={{ minWidth: '150px' }}>
                                <InputLabel id="content-rows-per-page-label">Rows per page</InputLabel>
                                <Select
                                    labelId="content-rows-per-page-label"
                                    value={rowsPerPage}
                                    label="Rows per page"
                                    onChange={handleRowsPerPageChange}
                                >
                                    <MenuItem value={5}>5</MenuItem>
                                    <MenuItem value={10}>10</MenuItem>
                                    <MenuItem value={25}>25</MenuItem>
                                    <MenuItem value={50}>50</MenuItem>
                                </Select>
                            </FormControl>
                            <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" shape="rounded" />
                        </div>
                        <Space direction="horizontal" justify="end" align="end" style={{ width: '100%' }}>
                            <Button variant="contained" onClick={onClose} text="Close" />
                        </Space>
                    </>
                )}
            </Space>
        </Spin>
    );
};

export default FinancialFileContent;
