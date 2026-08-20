import { Button, Search } from '@imbrace/ui';
import { Box } from '@mui/material';
import { type FC } from 'react';
import { useTranslation } from 'react-i18next';

import Table from '@/components/Table';
import type { handleChangePageType, tableColumns } from '@/components/Table/ITable';
import useAccess from '@/hooks/useAccess';
import type { MessageData } from '@/pages/MessageTemplate';

import styles from './index.module.scss';

interface MessageTemplateListProps {
    data: API.MessageTemplate[];
    columns: tableColumns<MessageData, undefined, undefined>[];
    searchbarInput: string;
    setSearchbarInput: (search: string) => void;
    setSearchRange: (range: string) => void;
    handleChangePage: handleChangePageType;
    pagination: API.pagination;
    handleChangeRowsPerPage?: () => void;
    handleFilterChange?: () => void;
    handelSort?: () => void;
    loading: boolean;
    openAddDrawer: () => void;
}

const MessageTemplateList: FC<MessageTemplateListProps> = (props) => {
    const {
        data,
        columns,
        searchbarInput,
        setSearchbarInput,
        setSearchRange,
        handleChangePage,
        handleChangeRowsPerPage,
        handleFilterChange,
        handelSort,
        pagination,
        loading,
        openAddDrawer,
    } = props;
    const { isAdmin } = useAccess();
    const { i18n } = useTranslation();
    const { t } = useTranslation();

    const resetSearchInput = () => {
        setSearchbarInput('');
    };

    return (
        <>
            <div className={styles.container}>
                <div className={styles.heading}>
                    <Box sx={{ width: '500px' }}>
                        <Search
                            queryKey={['search-range', i18n.language]}
                            requestFn={async () => {
                                return [
                                    { text: t('message_templates_search_title'), value: 'title' },
                                    { text: t('message_templates_search_content'), value: 'content' },
                                    { text: t('message_templates_search_title_and_content'), value: 'all' },
                                ];
                            }}
                            defaultSelectValue="title"
                            value={searchbarInput}
                            onSearch={(inputValue, selectedValue) => {
                                setSearchbarInput(inputValue);
                                selectedValue && setSearchRange(selectedValue);
                            }}
                            onReset={resetSearchInput}
                            fullWidth
                            placeholder={t('search')}
                        />
                    </Box>

                    <Box sx={{ ml: 2, display: 'flex', gap: 2 }}>
                        {isAdmin() && (
                            <Button
                                onClick={() => {
                                    openAddDrawer();
                                }}
                                sx={{
                                    height: '40px',
                                    minWidth: '240px',
                                    '& .MuiTypography-root': {
                                        fontSize: 14,
                                        fontWeight: 800,
                                    },
                                }}
                                text={t('message_templates_add_new_template')}
                            />
                        )}
                    </Box>
                </div>
                <Table
                    data={data}
                    pagination={pagination}
                    columns={columns}
                    handleChangePage={handleChangePage}
                    handleChangeRowsPerPage={handleChangeRowsPerPage}
                    loading={loading}
                    handleFilterChange={handleFilterChange}
                    handelSort={handelSort}
                />
            </div>
        </>
    );
};

export default MessageTemplateList;
