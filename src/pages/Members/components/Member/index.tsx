import { Button, Search } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import Table from '@/components/Table';
import useAccess from '@/hooks/useAccess';
import type { MemberListProps } from '@/pages/Members/IMember.types';

import AddMemberDrawer from '../AddMemberDrawer';
import styles from './index.module.scss';

function MemberList(props: MemberListProps) {
    const {
        data,
        columns,
        searchbarInput,
        setSearchbarInput,
        handleChangePage,
        handleChangeRowsPerPage,
        handleFilterChange,
        handelSort,
        pagination,
        loading,
        reload,
        onRowClick,
    } = props;
    const { state } = useLocation();
    const { openInviterMember } = (state as { openInviterMember?: boolean }) || {};
    const [drawerIsOpen, setDrawerIsOpen] = useState(false);
    const { isAdmin } = useAccess();

    const { t } = useTranslation();

    const resetSearchInput = () => {
        setSearchbarInput('');
    };

    const onFinish = () => {
        setDrawerIsOpen(false);
        reload();
    };

    useEffect(() => {
        if (openInviterMember) {
            setDrawerIsOpen(true);
        }
    }, [openInviterMember]);

    return (
        <>
            <div className={styles.container}>
                <div className={styles.heading}>
                    <Search
                        value={searchbarInput}
                        placeholder={t('member_search')}
                        onSearch={(value) => setSearchbarInput(value)}
                        onReset={resetSearchInput}
                    />

                    {isAdmin() && (
                        <Box sx={{ ml: 2, display: 'flex', gap: 2 }}>
                            <Button
                                text={t('member_add_member')}
                                onClick={() => {
                                    setDrawerIsOpen(true);
                                }}
                            />
                        </Box>
                    )}
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
                    onRowClick={onRowClick}
                    layout="fixed"
                />
            </div>
            <AddMemberDrawer
                open={drawerIsOpen}
                onClose={() => {
                    setDrawerIsOpen(false);
                }}
                onFinish={onFinish}
            />
        </>
    );
}

export default MemberList;
