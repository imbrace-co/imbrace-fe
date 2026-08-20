import { useBoardById } from '@/services/queries/board';
import { Space, Typography, Icon, Button, SelectRef, useDialog } from '@imbrace/ui';
import { useState } from 'react';
import Papa from 'papaparse';
import { useEffect } from 'react';
import IconArrowRight from '@/assets/icons/icon_arrow_right.svg?react';
import { isValidPhoneNumber } from 'libphonenumber-js';
import moment from 'moment';
import { isEmail } from '@/utils/StringHelper';
import { useRef } from 'react';
import { FieldTypesOptions } from '../../utils';
import { useMemo } from 'react';
import { t } from 'i18next';
import CircularProgress from '@mui/material/CircularProgress';
import { urlRegex } from '@/utils';
import { FieldSchema } from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { useCallback } from 'react';
import OperationFieldForm from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { FormProvider } from 'react-hook-form';
import { FieldType } from '../BoardSetting/ManageFields/components/FieldFormModal/operationFieldForm';
import { importCsv, importExcel, postBoardField, postBoardFile, postBoardUpload } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { AxiosError } from 'axios';
import { ImbraceFileUpload } from '@/services/axios';
import { useQueryClient } from '@tanstack/react-query';
import { useNotify } from '@/contexts/SnackbarContext';
import { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { Select as MuiSelect, MenuItem, FormControl, InputLabel, Select } from '@mui/material';
import * as XLSX from 'xlsx';

interface MappingRow {
    fileColumn: string;
    boardField: API.BoardField | undefined;
    isMatched: boolean;
}

const MappingData = ({
    file,
    id,
    onBack,
    onClose,
    tableRef,
}: {
    file: string | File;
    id: string;
    onBack: () => void;
    onClose?: () => void;
    tableRef?: React.RefObject<FlexibleTableRef<API.BoardItem>>;
}) => {
    const selectRefs = useRef<(SelectRef | null)[]>([]);
    const refCurrentFileType = useRef<'csv' | 'excel' | undefined>('csv');
    const [mappingData, setMappingData] = useState<MappingRow[]>([]);
    const { data: boardData, isLoading, refetch: refetchBoard } = useBoardById(id);
    const [importFileLoading, setImportFileLoading] = useState(false);

    const { notify } = useNotify();

    const [{ dialog, dialogForm }, dialogHolder] = useDialog();

    const refetch = useCallback(() => {
        refetchBoard();
    }, [refetchBoard]);

    const queryClient = useQueryClient();

    const refFileRecords = useRef<Record<string, string>[]>([]);

    const typeOptions = useMemo(() => {
        if (boardData?.fields.find((field) => field.type === 'RichText')) {
            return [
                ...FieldTypesOptions(t),
                {
                    value: 'RichText',
                    text: t('field_rich_text'),
                    icon: <Icon name="richText" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                },
            ];
        }
        return FieldTypesOptions(t);
    }, [t, boardData]);

    const handleCSV = (file: File | string): Promise<{ headers: string[]; records: Record<string, string>[] }> => {
        return new Promise((resolve, reject) => {
            // Handle URL case
            if (typeof file === 'string') {
                // Fetch CSV content from URL
                fetch(file)
                    .then((response) => response.text())
                    .then((csvContent) => {
                        Papa.parse(csvContent, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (results) => {
                                if (results.data && results.data.length > 0) {
                                    const records = results.data as Record<string, string>[];
                                    const headers = Object.keys(records[0]).sort((a, b) => a.localeCompare(b));
                                    refFileRecords.current = records;
                                    resolve({ headers, records });
                                } else {
                                    reject(new Error('No data in file'));
                                }
                            },
                            error: (error: any) => {
                                console.error('Error parsing CSV from URL:', error);
                                reject(new Error('Cannot parse CSV from URL'));
                            },
                        });
                    })
                    .catch((error) => {
                        console.error('Error fetching CSV from URL:', error);
                        reject(new Error('Cannot fetch CSV from URL'));
                    });
                return;
            }

            // Original File handling
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.data && results.data.length > 0) {
                        const records = results.data as Record<string, string>[];
                        const headers = Object.keys(records[0]).sort((a, b) => a.localeCompare(b));
                        refFileRecords.current = records;
                        resolve({ headers, records });
                    } else {
                        reject(new Error('No data in file'));
                    }
                },
                error: (error) => {
                    console.error('Error reading file CSV:', error);
                    reject(new Error('Cannot read file CSV'));
                },
            });
        });
    };

    const handleExcel = (file: File): Promise<{ headers: string[]; records: Record<string, string>[] }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];

                    // Convert Excel to JSON with header row
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                    if (jsonData.length < 2) {
                        // Need at least headers and one data row
                        reject(new Error('No data in file'));
                        return;
                    }

                    // First row as headers
                    const headers = (jsonData[0] as string[]).map((h) => h.toString().trim());

                    // Convert remaining rows to records
                    const records = jsonData.slice(1)
                    .filter((row): row is any[] => 
                        Array.isArray(row) && row.some(cell => cell !== undefined && cell !== null && cell !== '')
                    )
                    .map((row) => {
                        const record: Record<string, string> = {};
                        headers.forEach((header, index) => {
                            const cellValue = row[index];
                            record[header] = cellValue !== undefined && cellValue !== null 
                                ? cellValue.toString() 
                                : '';
                        });
                        return record;
                    });

                refFileRecords.current = records;
                resolve({ headers, records });
                } catch (error) {
                    console.error('Error reading Excel file:', error);
                    reject(new Error('Cannot read Excel file'));
                }
            };

            reader.onerror = () => {
                reject(new Error('Error reading file'));
            };

            reader.readAsBinaryString(file);
        });
    };

    const getFileFromUrl = async (url: string): Promise<{ file: Blob; type: string }> => {
        try {
            const response = await fetch(url);
            const contentType = response.headers.get('content-type');
            const blob = await response.blob();

            // Determine file type from content-type header or URL extension
            let type = 'csv'; // default
            if (contentType?.includes('spreadsheet') || contentType?.includes('excel') || url.match(/\.(xlsx|xls)$/i)) {
                type = 'excel';
                refCurrentFileType.current = 'excel';
            } else if (contentType?.includes('csv') || url.match(/\.csv$/i)) {
                type = 'csv';
                refCurrentFileType.current = 'csv';
            }

            return { file: blob, type };
        } catch (error) {
            console.error('Error fetching file from URL:', error);
            throw new Error('Failed to fetch file from URL');
        }
    };

    const getFileHeaderAndRecords = async (file: File | string): Promise<{ headers: string[]; records: Record<string, string>[] }> => {
        // Handle URL case
        if (typeof file === 'string') {
            const { file: fileBlob, type } = await getFileFromUrl(file);
            // Convert Blob to File for consistent handling
            const actualFile = new File([fileBlob], 'downloaded-file.' + type, { type: fileBlob.type });
            if (type === 'excel') {
                return handleExcel(actualFile);
            } else {
                return handleCSV(actualFile);
            }
        }
        // Handle local File case
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            refCurrentFileType.current = 'csv';
            return handleCSV(file);
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            refCurrentFileType.current = 'excel';
            return handleExcel(file);
        } else {
            throw new Error('Unsupported file format. Please use CSV or Excel files.');
        }
    };

    const checkRecordHeaderValid = (recordValue: string, boardField: API.BoardField) => {
        switch (boardField.type) {
            case 'Attachment':
                return urlRegex.test(recordValue);
            case 'Number':
                return !isNaN(Number(recordValue)) && recordValue.trim() !== '';
            case 'Date':
                return moment(recordValue).isValid();
            case 'Time':
                return moment(recordValue, 'HH:mm').isValid();
            case 'Datetime':
                return moment(recordValue).isValid();
            case 'Email':
                return isEmail(recordValue);
            case 'Phone':
                const cleanedNumber = recordValue.replace(/[\s()\-\.]/g, '');
                return isValidPhoneNumber(cleanedNumber);
            case 'Checkbox':
                const value = recordValue.trim().toLowerCase();
                return value === 'checked' || value === 'not checked';
            default:
                return true;
        }
    };

    const getMappingData = async () => {
        try {
            const { headers, records } = await getFileHeaderAndRecords(file);
            const boardFields = boardData?.fields || [];

            const mappingRows: MappingRow[] = headers.map((header) => {
                // Clean the header by removing BOM and trimming
                const cleanHeader = header.replace(/^\uFEFF/, '').trim();

                const matchingBoardField = boardFields.find((field) => field.name.toLowerCase() === cleanHeader.toLowerCase());

                // Rest of the code remains the same
                let isValidType = true;
                if (matchingBoardField) {
                    isValidType = records.slice(0, 10).every((record) => {
                        const value = record[header];
                        return value ? checkRecordHeaderValid(value, matchingBoardField) : true;
                    });
                }

                return {
                    fileColumn: cleanHeader,
                    boardField: matchingBoardField || undefined,
                    isMatched: !!matchingBoardField && isValidType,
                };
            });

            setMappingData(mappingRows);
        } catch (error) {
            console.error('Error in getMappingData:', error);
            notify({
                type: 'error',
                message: t('crm_import_file_mapped_fail'),
            });
            setMappingData([]);
        }
    };

    const onCreateField = useCallback(
        async (
            id: string,
            data: FieldType & {
                hidden: boolean;
            },
        ) => {
            const { data: responseData } = await apiFetch<API.Board>(postBoardField.api(id), postBoardField.method, data);
            const createdField = responseData.fields.find((field) => field.name === data.name);
            return createdField;
        },
        [],
    );

    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current && boardData) {
            getMappingData();
            isInitialMount.current = false;
        }
    }, [boardData]);

    useEffect(() => {
        selectRefs.current = Array(mappingData.length).fill(null);
    }, [mappingData.length]);

    const onNewField = useCallback(
        (index: number) => {
            if (!id) return;
            dialogForm<FieldType>({
                title: t('fields_management_form_header_new'),
                content: (methods) => (
                    <FormProvider {...methods}>
                        <OperationFieldForm methods={methods} boardType={boardData?.type} boardName={boardData?.name} />
                    </FormProvider>
                ),
                defaultValues: {
                    name: '',
                },
                confirmText: t('create'),
                showUnsavedDialog: true,
                showCloseButton: true,
                hideCancelButton: true,
                actionsAlign: 'flex-start',
                onClose: () => {},
                onConfirm: async (formData, methods) => {
                    try {
                        const { name, type, description, settings, data } = formData;
                        const createdField = await onCreateField(id, {
                            name,
                            description,
                            type,
                            hidden: false,
                            data,
                            settings,
                        });
                        selectRefs.current[index]?.close();
                        await queryClient.refetchQueries({ queryKey: ['boards'] });
                        // onChangeField(createdField, index, true, true);
                        return true;
                    } catch (error) {
                        const err = error as AxiosError;
                        if (err.response?.status === 409 && err.response?.data?.message === 'Field name already exists') {
                            methods?.setError('name', {
                                type: 'value',
                                message: t('fields_management_form_duplicate_name'),
                            });
                        }
                        if (err.response?.status === 409 && err.response?.data?.message === 'Value cannot be duplicated') {
                            const message = err?.response?.data?.message;
                        }
                        return false;
                    }
                },
                confirmButtonProps: {
                    sx: {
                        minWidth: '160px',
                        height: '40px',
                    },
                },
                schema: FieldSchema({ t, existFields: boardData?.fields, checkDuplicate: true }),
            });
        },
        [t, onCreateField, boardData],
    );

    const onChangeField = useCallback(
        (selectedField: API.BoardField | undefined, index: number, isNotImport = false, isCreateNew = false) => {
            if (isNotImport) {
                setMappingData((prevData) => {
                    const newData = [...prevData];
                    newData.splice(index, 1);
                    return newData;
                });
                return;
            }

            setMappingData((prevData) => {
                const validateRecords = (field: API.BoardField | undefined, fileColumn: string) => {
                    if (!field) return true;

                    return refFileRecords.current.slice(0, 10).every((record) => {
                        const value = record[fileColumn];
                        return value ? checkRecordHeaderValid(value, field) : true;
                    });
                };

                const createNewMapping = (field: API.BoardField | undefined, currentMapping: MappingRow) => {
                    const isRecordsValid = validateRecords(field, currentMapping.fileColumn);
                    return {
                        ...currentMapping,
                        boardField: field,
                        isMatched: !!field && isRecordsValid,
                    };
                };

                const newMappingData = [...prevData];
                if (isCreateNew) {
                    newMappingData[index] = createNewMapping(selectedField, newMappingData[index]);
                    return newMappingData;
                }

                const isFieldAlreadySelected = selectedField && prevData.some((mapping) => mapping.boardField?._id === selectedField._id);
                if (isFieldAlreadySelected) {
                    notify({
                        type: 'error',
                        message: 'You have already selected this field, please select another field',
                    });
                    return prevData;
                }
                // update mapping
                newMappingData[index] = createNewMapping(selectedField, newMappingData[index]);
                return newMappingData;
            });
        },
        [notify],
    );

    // Update the error message to include type mismatch
    const renderErrorMessage = (mapping: MappingRow) => {
        if (!mapping.isMatched && mapping.boardField) {
            return t('crm_import_the_data_does_not_align_with_field');
        }
        if (!mapping.isMatched) {
            return t('crm_import_please_choose_a_field');
        }
        return '';
    };

    // Add ref to store uploaded file URL
    const uploadedFileUrlRef = useRef<string | null>(null);

    const getFileUrl = async (file: File) => {
        // If URL is already stored, return it
        if (uploadedFileUrlRef.current) {
            return uploadedFileUrlRef.current;
        }

        const formData = new FormData();
        formData.append('', file);
        const { data } = await apiFetch<API.FileUpload>(postBoardFile.api, postBoardFile.method, formData, ImbraceFileUpload);
        uploadedFileUrlRef.current = data.url;
        return data.url;
    };

    const exportErrorCsv = (errorRecords: API.DataImportError[]) => {
        // Add error information to each row's data
        const csvData = errorRecords.map((record) => ({
            'Row Number': record.row + 1, // Adding 1 to make it 1-based for users
            'Error Message': record.error,
            ...record.data,
        }));

        const csv = Papa.unparse(csvData, {
            quotes: true,
            header: true,
        });

        // Create blob and download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `import_errors_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const importFile = useCallback(
        async (file: File | string) => {
            try {
                setImportFileLoading(true);
                // If file is string (URL), use directly
                // If file is File object, check stored URL or upload new
                const fileUrl = typeof file === 'string' ? file : await getFileUrl(file);
                const mappings = mappingData.map((mapping) => ({
                    csvHeader:  mapping.fileColumn,
                    boardFieldId: mapping.boardField?._id,
                    boardFieldName: mapping.boardField?.name,
                }));

                const { data } = await apiFetch<API.ImportFileResponse>(
                    refCurrentFileType.current === 'excel' ? importExcel.api(id) : importCsv.api(id),
                    refCurrentFileType.current === 'excel' ? importExcel.method : importCsv.method,
                    {
                        fileUrl,
                        mappings,
                    },
                );
                // Success all
                if (data.results.successful + data.results.skipped === data.results.total) {
                    tableRef?.current?.refresh();
                    const message = data.results.skipped > 0 ? `Import data successfully with ${data.results.skipped} data skipped` : t('crm_import_file_mapped_success');
                    notify({
                        type: 'success',
                        message: message,
                    });
                    onClose?.();
                } 
                else {
                    tableRef?.current?.refresh();
                    notify({
                        type: 'error',
                        message: t('crm_import_file_mapped_error'),
                    });
                    exportErrorCsv(data.results.details.errors);
                }
            } catch (error) {
                console.error('Error in onImport:', error);
                notify({
                    type: 'error',
                    message: t('crm_import_file_mapped_fail'),
                });
            } finally {
                setImportFileLoading(false);
            }
        },
        [id, mappingData, notify, onClose],
    );

    const isInvalidMappingData = useMemo(() => mappingData.length === 0 || mappingData.some((mapping) => !mapping.isMatched), [mappingData]);
    

    const onShowConfirmImport = useCallback(async () => {
        dialog({
            title: `${t('crm_import_file_mapped_confirm', { length: refFileRecords.current.length, boardName: boardData?.name })}`,
            content: () => <></>,
            confirmText: t('crm_import_file_mapped_confirm_button'),
            showCloseButton: true,
            hideCancelButton: false,
            hideConfirmButton: false,
            onConfirm: () => {
                importFile(file);
            },
        });
    }, [id, mappingData, importFile]);

    if (isLoading) {
        return <CircularProgress size={10} sx={{ color: 'var(--color-light-4)' }} />;
    }

    return (
        <>
            {dialogHolder}
            <Space align="start" direction="vertical" size={16} style={{ width: '100%' }}>
                <Typography style={{ color: 'var(--color-light-5)' }}>{t('crm_import_file_mapped_verify_columns')}</Typography>
                {/* Headers */}
                <Space direction="horizontal" size={16} style={{ width: '100%' }}>
                    <div style={{ width: '260px' }}>
                        <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                            {t('crm_import_file_mapped_columns_in_file')}
                        </Typography>
                    </div>
                    <div style={{ flex: 1 }}>
                        <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                            {t('crm_import_file_mapped_fields_in_board')}
                        </Typography>
                    </div>
                    <div style={{ width: 40 }} />
                </Space>

                {/* Mapping Rows */}
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                    {mappingData.map((mapping, index) => (
                        <Space
                            key={index}
                            direction="horizontal"
                            size={16}
                            style={{
                                width: '100%',
                                marginBottom: '25px',
                            }}
                        >
                            <Space
                                justify="start"
                                align="center"
                                style={{
                                    width: '228px',
                                    height: '40px',
                                    border: '1px solid var(--color-light-2)',
                                    backgroundColor: 'var(--color-light-2)',
                                    paddingLeft: '10px',
                                }}
                            >
                                <Typography>{mapping.fileColumn || '-'}</Typography>
                            </Space>
                            <IconArrowRight />
                            <div style={{ flex: 1, position: 'relative' }}>
                                <FormControl variant="filled" fullWidth error={!mapping.isMatched}>
                                    <Select
                                        variant="outlined"
                                        value={mapping.boardField?._id || ''}
                                        label={t('crm_import_select_field')}
                                        onChange={(event) => {
                                            // Only handle actual field selections here
                                            if (event.target.value) {
                                                const selectedField = boardData?.fields.find((field) => field._id === event.target.value);
                                                onChangeField(selectedField, index);
                                            }
                                        }}
                                        sx={{
                                            '& legend': { display: 'none' },
                                            '& fieldset': { top: 0 },
                                            backgroundColor: 'none',
                                            boxShadow: 'none',
                                            border: !mapping.isMatched ? '1px solid #FF4D4F' : '1px solid #E0E0E0',
                                            '.MuiOutlinedInput-notchedOutline': { border: 0 },
                                            '&.MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                                border: 0,
                                            },
                                            '.MuiSelect-select': {
                                                padding: '8px 12px',
                                                color: 'var(--color-light-7)',
                                                fontSize: '14px',
                                                display: 'flex',
                                                alignItems: 'center',
                                            },
                                            '.MuiSvgIcon-root': {
                                                fill: 'var(--color-light-4)',
                                                margin: 0,
                                                padding: 0,
                                                transition: 'fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                                                fontSize: '1.5rem',
                                                right: '8px',
                                            },
                                        }}
                                        endAdornment={
                                            mapping.boardField?._id && (
                                                <Icon
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => onChangeField(undefined, index)}
                                                    name="close"
                                                />
                                            )
                                        }
                                        inputProps={mapping.boardField?._id ? { IconComponent: () => null } : undefined}
                                    >
                                        {boardData?.fields.map((field) => (
                                            <MenuItem
                                                key={field._id}
                                                value={field._id}
                                                sx={{
                                                    fontSize: '14px',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--color-light-2)',
                                                    },
                                                }}
                                            >
                                                <Space direction="horizontal" align="center">
                                                    {typeOptions.find((option) => option.value === field.type)?.icon}
                                                    <span style={{ marginLeft: 8 }}>{field.name}</span>
                                                </Space>
                                            </MenuItem>
                                        ))}
                                        <MenuItem disabled divider />
                                        <MenuItem>
                                            <Button
                                                startIcon={<Icon name="close" />}
                                                type="danger"
                                                sx={{ textTransform: 'uppercase' }}
                                                variant="link"
                                                text={t('crm_import_do_not_import_this_column')}
                                                onClick={() => onChangeField(undefined, index, true)}
                                            />
                                        </MenuItem>
                                        <MenuItem>
                                            <Button
                                                startIcon={<Icon name="add" />}
                                                variant="link"
                                                sx={{ textTransform: 'uppercase' }}
                                                text={t('crm_import_create_new_field')}
                                                onClick={() => onNewField(index)}
                                            />
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                                <Typography
                                    style={{
                                        color: '#FF4D4F',
                                        fontSize: '12px',
                                        position: 'absolute',
                                        bottom: '-25px',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {renderErrorMessage(mapping)}
                                </Typography>
                            </div>
                            <div style={{ width: 40, textAlign: 'center' }}>
                                {mapping.isMatched ? (
                                    <Icon style={{ border: '1px solid #14AC4E', color: '#14AC4E', borderRadius: '50%' }} name="check" />
                                ) : (
                                    <Icon style={{ color: '#FF4D4F', borderRadius: '50%', width: '20px', height: '20px' }} name="error" />
                                )}
                            </div>
                        </Space>
                    ))}
                </Space>

                {/* Actions */}
                <Space style={{ width: '100%', marginTop: '32px' }} direction="horizontal" justify="end" size={16}>
                    <Button sx={{ marginRight: '16px', textTransform: 'uppercase' }} variant="link" text={t('back')} onClick={onBack} />
                    <Button
                        loading={importFileLoading}
                        variant="contained"
                        text={t('next')}
                        disabled={isInvalidMappingData}
                        onClick={() => {
                            onShowConfirmImport();
                        }}
                    />
                </Space>
            </Space>
        </>
    );
};

export default MappingData;
