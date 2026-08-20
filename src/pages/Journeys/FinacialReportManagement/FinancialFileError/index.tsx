import { Button, FieldText, Icon, Typography, useDialog, Spin } from '@imbrace/ui';
import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Paper,
    Tooltip,
    Pagination,
    Stack,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    styled,
    SelectChangeEvent,
} from '@mui/material';
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './index.module.scss';
import apiFetch from '@/services/axios/handler';
import { AiFinancialDocumentsFix, AiFinancialDocumentsSuggest, getListFinancialFileError } from '@/services/api/financialReport';
import { useNotify } from '@/contexts/SnackbarContext';

// Styled components for custom table appearance
const StyledTableContainer = styled(TableContainer)({
    height: 'calc(100vh - 325px)',
    overflow: 'auto',
    boxShadow: 'none',
    '& table': {
        borderCollapse: 'separate',
        borderSpacing: 0,
    },
});

const StyledTableHead = styled(TableHead)({
    backgroundColor: '#d9effe',
    '& .MuiTableRow-root': {
        backgroundColor: '#d9effe',
        '& .MuiTableCell-root': {
            color: 'var(--color-light-7)',
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: '150%',
            backgroundColor: '#d9effe',
        },
    },
});

const StyledTableRow = styled(TableRow)<{ even?: boolean }>(({ even }) => ({
    backgroundColor: even ? '#F2F2F2' : 'transparent',
    '& .MuiTableCell-root': {
        fontSize: '14px',
    },
}));

export interface FinancialFileError {
    column_name: string;
    error_type: string;
    error_message: string;
    line: string;
    csv_line: string;
    original_value: string;
    row_num: string;
    _id: string;
}

export interface FinancialFileErrorSuggest {
    columnn_idx: number;
    column_name: string;
    error_type: string;
    error_message: string;
    line_number: number;
    csv_line: string;
    suggested_fix: string;
}

const getAISuggestFix = async (error: FinancialFileError) => {
    const { data } = await apiFetch<{
        error_fix_suggestions: FinancialFileErrorSuggest[];
    }>(AiFinancialDocumentsSuggest.api(), AiFinancialDocumentsSuggest.method, {
        errors: [
            {
                column_name: error.column_name,
                error_type: error.error_type,
                error_message: error.error_message,
                line: error.line,
                csv_line: error.csv_line,
            },
        ],
    });
    return data.error_fix_suggestions[0].suggested_fix;
};

const FinancialFileError = ({ id, onClose, onFixSuccess }: { id: string; onClose: void; onFixSuccess: () => void }) => {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [totalPages, setTotalPages] = useState(0);
    // Replace single loadingRowId with a map of row IDs to loading states
    const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
    const [fixSuggestions, setFixSuggestions] = useState<Record<string, string>>({});
    const [errorRows, setErrorRows] = useState<string[]>([]);
    const [{ dialog }, dialogHolder] = useDialog();
    const [allFinancialFileErrors, setAllFinancialFileErrors] = useState<FinancialFileError[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const notify = useNotify();

    // Calculate displayed data based on current pagination state
    const financialFileError = useMemo(() => {
        const startIndex = (page - 1) * rowsPerPage;
        return allFinancialFileErrors.slice(startIndex, startIndex + rowsPerPage);
    }, [allFinancialFileErrors, page, rowsPerPage]);

    useEffect(() => {
        let isMounted = true;
        
        const fetchData = async () => {
            if (isLoading) return;
            setIsLoading(true);
            try {
                const { data } = await apiFetch<{
                    data: FinancialFileError[];
                    pagination: {
                        total: string;
                        page: number;
                        limit: number;
                        total_pages: number;
                    };
                }>(getListFinancialFileError.api(id), getListFinancialFileError.method);
                if (isMounted) {
                    setAllFinancialFileErrors(data.data);
                    setTotalPages(Math.ceil(data.data.length / rowsPerPage));
                }
            } catch (err) {
                console.log(err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };
        fetchData();
        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, []);

    // Recalculate total pages when rows per page changes
    useEffect(() => {
        if (allFinancialFileErrors.length > 0) {
            setTotalPages(Math.ceil(allFinancialFileErrors.length / rowsPerPage));
            // Reset to page 1 when changing rows per page to avoid out of bounds
            setPage(1);
        }
    }, [rowsPerPage, allFinancialFileErrors.length]);

    // Initialize errorRows with all row IDs that don't have fix suggestions when component mounts
    useEffect(() => {
        const initialErrorRows = allFinancialFileErrors
            .filter((row) => !fixSuggestions[row._id] || fixSuggestions[row._id].trim() === '')
            .map((row) => row._id);
        setErrorRows(initialErrorRows);
    }, [allFinancialFileErrors]);


    // Update handle fix change to update the fix suggestions state
    const handleFixChange = (id: string, newValue: string) => {
        setFixSuggestions((prev) => ({
            ...prev,
            [id]: newValue,
        }));

        // Remove from errorRows if value is not empty
        if (newValue.trim() !== '' && errorRows.includes(id)) {
            setErrorRows((prev) => prev.filter((rowId) => rowId !== id));
        }
        // Add to errorRows if value becomes empty
        else if (newValue.trim() === '' && !errorRows.includes(id)) {
            setErrorRows((prev) => [...prev, id]);
        }
    };

    const handleFixAll = async () => {
        setIsLoading(true);
        try {
            const errorsWithFixes = allFinancialFileErrors.map((error) => ({
                column_name: error.column_name,
                error_type: error.error_type,
                error_message: error.error_message,
                line_number: error.line,
                csv_line: error.csv_line,
            }));
            const { data } = await apiFetch<{
                success: boolean;
                error_fix_no: number;
            }>(AiFinancialDocumentsFix.api(), AiFinancialDocumentsFix.method, {
                file_id: id,
                errors: errorsWithFixes,
            });
            if (data.success) {
                notify.notify({
                    message: `Successfully fixed all errors`,
                    type: 'success',
                });
                onFixSuccess?.();
            }
        } catch (error) {
            console.error('Error fixing financial file:', error);
            notify.notify({
                message: `Error when fixing financial file. Please try again.`,
                type: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Update function to handle AI suggestion button click with row-specific loading state
    const handleAISuggest = async (row: FinancialFileError) => {
        // Set loading state for this specific row
        setLoadingRows((prev) => ({
            ...prev,
            [row._id]: true,
        }));

        try {
            const suggestion = await getAISuggestFix(row);
            setFixSuggestions((prev) => ({
                ...prev,
                [row._id]: suggestion,
            }));
            // Remove the row from errorRows if a valid suggestion was provided
            if (suggestion && suggestion.trim() !== '') {
                setErrorRows((prev) => prev.filter((rowId) => rowId !== row._id));
            }
        } catch (error) {
            console.error('Error getting AI suggestion:', error);
        } finally {
            // Clear loading state for this specific row
            setLoadingRows((prev) => ({
                ...prev,
                [row._id]: false,
            }));
        }
    };

    const handleFix = async () => {
        // Check if there are still rows with errors
        if (errorRows.length > 0) {
            dialog({
                title: t('Unfixed Errors'),
                content: t('There are still {{count}} errors that have not been fixed. You have to fix all errors before proceeding.', {
                    count: errorRows.length,
                }),
                confirmText: 'Back',
                hideCancelButton: true,
                onConfirm: () => {
                    return false;
                },
            });
            return;
        }
        proceedWithFix();
    };

    const proceedWithFix = async () => {
        setIsLoading(true);
        try {
            const errorsWithFixes = financialFileError
                .filter((error) => fixSuggestions[error._id] && fixSuggestions[error._id].trim() !== '')
                .map((error) => ({
                    column_name: error.column_name,
                    error_type: error.error_type,
                    error_message: error.error_message,
                    line_number: error.line,
                    csv_line: error.csv_line,
                    suggested_fix: fixSuggestions[error._id] || '',
                }));

            const { data } = await apiFetch<{
                success: boolean;
                error_fix_no: number;
            }>(AiFinancialDocumentsFix.api(), AiFinancialDocumentsFix.method, {
                file_id: id,
                errors: errorsWithFixes,
            });
            if (data.success) {
                notify.notify({
                    message: `Successfully fixed ${data.error_fix_no} errors`,
                    type: 'success',
                });
                onFixSuccess?.();
            }
        } catch (error) {
            notify.notify({
                message: `Error when fixing financial file. Please try again.`,
                type: 'error',
            });
            // Optionally display error notification
        } finally {
            setIsLoading(false);
        }
    };

    // Handle page change
    const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
        setPage(value);
    };

    // Handle rows per page change
    const handleRowsPerPageChange = (event: SelectChangeEvent<number>) => {
        const newRowsPerPage = event.target.value as number;
        setRowsPerPage(newRowsPerPage);
        // Calculate and update totalPages directly here
        setTotalPages(Math.ceil(allFinancialFileErrors.length / newRowsPerPage));
        setPage(1); // Reset to first page when changing rows per page

        // Check which rows don't have fix suggestions on the first page with new rows per page
        const newPageData = allFinancialFileErrors.slice(0, newRowsPerPage);

        const rowsWithoutFix = newPageData
            .filter((row) => !fixSuggestions[row._id] || fixSuggestions[row._id].trim() === '')
            .map((row) => row._id);

        setErrorRows(rowsWithoutFix);
    };
    
    return (
        <Spin isSpinning={isLoading}>
            <div className={styles.container}>
                {dialogHolder}
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    <StyledTableContainer>
                        <Table stickyHeader aria-label="financial file errors table">
                            <StyledTableHead>
                                <TableRow>
                                    <TableCell align="center" style={{ width: 120 }}>
                                        {t('Row Number')}
                                    </TableCell>
                                    <TableCell style={{ minWidth: 200 }}>{t('Column')}</TableCell>
                                    <TableCell style={{ minWidth: 200 }}>{t('Original Value')}</TableCell>
                                    <TableCell style={{ minWidth: 250 }}>{t('Error Message')}</TableCell>
                                </TableRow>
                            </StyledTableHead>
                            <TableBody>
                                {financialFileError.map((row, index) => (
                                    <React.Fragment key={row._id}>
                                        <StyledTableRow even={index % 2 === 1} sx={{ '& td': { borderBottom: 'none' } }}>
                                            <TableCell align="center">
                                                <Typography>{row.row_num}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography
                                                    style={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        wordBreak: 'break-word',
                                                    }}
                                                >
                                                    {row.column_name}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography>{row.original_value}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip placement="top" arrow title={row.error_message}>
                                                    <Typography style={{ color: 'var(--color-error)' }}>{row.error_message}</Typography>
                                                </Tooltip>
                                            </TableCell>
                                        </StyledTableRow>
                                        <StyledTableRow even={index % 2 === 1}>
                                            <TableCell colSpan={4} style={{ paddingTop: 0, paddingBottom: 16 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <FieldText
                                                        size="small"
                                                        fullWidth
                                                        value={fixSuggestions[row._id] || ''}
                                                        onChange={(e) => handleFixChange(row._id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        error={errorRows.includes(row._id)}
                                                        placeholder="Enter fix suggestion here..."
                                                    />
                                                    <Tooltip title={'Suggest AI Fix'} placement="top" arrow>
                                                        <Button
                                                            loading={loadingRows[row._id] === true}
                                                            variant="outlined"
                                                            startIcon={<Icon name="tips" />}
                                                            size="xxs"
                                                            onClick={() => handleAISuggest(row)}
                                                        />
                                                    </Tooltip>
                                                </Box>
                                            </TableCell>
                                        </StyledTableRow>
                                    </React.Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </StyledTableContainer>

                    {/* Pagination and Rows Per Page */}
                    <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center" sx={{ mt: 2, mb: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel id="rows-per-page-label">{t('Rows per page')}</InputLabel>
                            <Select
                                labelId="rows-per-page-label"
                                value={rowsPerPage}
                                label={t('Rows per page')}
                                onChange={(event: SelectChangeEvent<number>) => handleRowsPerPageChange(event)}
                            >
                                <MenuItem value={5}>5</MenuItem>
                                <MenuItem value={10}>10</MenuItem>
                                <MenuItem value={25}>25</MenuItem>
                                <MenuItem value={50}>50</MenuItem>
                                <MenuItem value={100}>100</MenuItem>
                            </Select>
                        </FormControl>

                        <Pagination count={totalPages} page={page} onChange={handlePageChange} color="primary" shape="rounded" />
                    </Stack>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button loading={isLoading} sx={{ marginRight: 2 }} size="default" variant="outlined" text="Fix By Inputed Suggestion Prompts" onClick={handleFix} />
                    <Button loading={isLoading} size="default" variant="contained" text="Auto Fix All By AI" onClick={handleFixAll} />
                </Box>
            </div>
        </Spin>
    );
};

export default FinancialFileError;
