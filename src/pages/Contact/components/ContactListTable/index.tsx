import { Search } from '@imbrace/ui';
import DownloadIcon from '@mui/icons-material/Download';
import { LoadingButton } from '@mui/lab';
import { Box } from '@mui/material';
import moment from 'moment';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Table from '@/components/Table';
import type { handleChangePageType, tableColumns } from '@/components/Table/ITable';
import useAccess from '@/hooks/useAccess';
import { exportContactCsv } from '@/services/api/contact';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';
interface ContactListTableProps {
    data: API.Contact[];
    columns: tableColumns<API.Contact, undefined, undefined>[];
    searchbarInput: string;
    setSearchbarInput: (search: string) => void;
    handleChangePage: handleChangePageType;
    pagination: API.pagination;
    handleChangeRowsPerPage?: () => void;
    handelSort?: () => void;
    loading: boolean;
    reload: () => void;
}
const ContactListTable: FC<ContactListTableProps> = (props) => {
    const { data, columns, searchbarInput, setSearchbarInput, handleChangePage, handleChangeRowsPerPage, handelSort, pagination, loading } =
        props;
    const [exporting, setExporting] = useState(false);
    const { t } = useTranslation();
    const { isAdmin } = useAccess();

    const resetSearchInput = () => {
        setSearchbarInput('');
    };

    const handleExportCSV = async () => {
        try {
            setExporting(true);
            const reponse = await apiFetch<Blob>(exportContactCsv.api, exportContactCsv.method);

            const url = window.URL.createObjectURL(new Blob([reponse.data]));
            const link = document.createElement('a');

            link.setAttribute('href', url);
            link.setAttribute('download', `contacts_${moment().format('yyyy-MM-DD')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setExporting(false);
        } catch (error) {
            console.log(error);
            setExporting(false);
        }
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.heading}>
                    <Search
                        value={searchbarInput}
                        placeholder={t('contact_search')}
                        onSearch={(inputValue) => setSearchbarInput(inputValue)}
                        onReset={resetSearchInput}
                    />

                    {isAdmin() && (
                        <Box sx={{ ml: 2, display: 'flex', gap: 2 }}>
                            <LoadingButton
                                variant="contained"
                                sx={{
                                    minWidth: 240,
                                    height: 40,
                                    padding: '12px 0',
                                    borderRadius: '10px',
                                    boxShadow: ' 0 3px 10px 0 rgba(0, 0, 0, 0.16)',
                                }}
                                startIcon={<DownloadIcon />}
                                loading={exporting}
                                onClick={handleExportCSV}
                            >
                                {t('contacts_export_csv')}
                            </LoadingButton>
                        </Box>
                    )}
                </div>
                <Table
                    data={data}
                    pagination={pagination}
                    columns={columns}
                    handleChangePage={handleChangePage}
                    handleChangeRowsPerPage={handleChangeRowsPerPage}
                    searchbarInput={searchbarInput}
                    loading={loading}
                    handelSort={handelSort}
                    layout="fixed"
                />
            </div>
        </>
    );
};
export default ContactListTable;
