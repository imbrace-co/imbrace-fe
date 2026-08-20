import { Button, Icon, IconButton, Illustration, Search, Space, Tooltip, Typography } from '@imbrace/ui';
import { Badge, Box } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import React, { useCallback, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import PageLayout from '@/components/PageLayout';
import type { FilterValueObj } from '@/pages/Credentials/components/filterFields';
import TableFilter from '@/pages/Credentials/components/tableFilter';
import { useAppSelector } from '@/redux/store';
import { getCredentials } from '@/services/api/workflow';
import apiFetch from '@/services/axios/handler';

import EnhancedTableHead from './components/tableHead';
import TableRow from './components/tableRow';
import styles from './index.module.scss';

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

type Order = 'asc' | 'desc';

function getComparator<K>(order: Order, orderBy: keyof K): (a: K, b: K) => number {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
}

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
function stableSort<T>(array: readonly T[], comparator: (a: T, b: T) => number) {
    const stabilizedThis = array.map((el, index) => [el, index] as [T, number]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}

const Credentials = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof API.Credential>('updatedAt');
    const [filterTypesArr, setFilterTypesArr] = useState<string[]>([]);
    const [openFilter, setOpenFilter] = useState(false);
    const [filterValues, setFilterValues] = useState<FilterValueObj[]>([]);
    const [searchInput, setSearchInput] = useState('');

    const fetchCredentials = useCallback(async () => {
        try {
            const {
                data: { data },
            } = await apiFetch<{ data: API.Credential[] }>(getCredentials.api(), getCredentials.method, {
                excludeTypes: [
                    'web',
                    'web-widget-channel',
                    'WebWidget',
                    'Facebook',
                    'Instagram',
                    'WeChat',
                    'Line',
                    'WhatsApp',
                    'Whatsapp',
                    'whatsapp',
                ].join(','),
            });

            if (data) {
                // grouping credential types into an array
                const types = data.reduce((acc: string[], item) => {
                    if (!acc.includes(item.type)) {
                        acc.push(item.type);
                    }
                    return acc;
                }, []);
                setFilterTypesArr(types);
                return data;
            }
        } catch (error) {
            console.error('error: ', error);
            return [];
        }
    }, []);

    const {
        data: credentialData,
        isFetching,
        isFetched,
        refetch,
    } = useQuery({
        queryFn: fetchCredentials,
        queryKey: ['credentials', { orgId: organizationId }],
        initialData: [],
    });

    const filteredTypesData = useCallback(
        (typeFilter?: FilterValueObj) => {
            if (!typeFilter) return credentialData;
            switch (typeFilter.operator) {
                case 'contains': {
                    return credentialData?.filter(
                        (credential) => Array.isArray(typeFilter.value) && (typeFilter.value as string[]).includes(credential.type),
                    );
                }
                case 'not_contains': {
                    return credentialData?.filter(
                        (credential) => Array.isArray(typeFilter.value) && !(typeFilter.value as string[]).includes(credential.type),
                    );
                }
                case 'is_empty': {
                    return credentialData?.filter((credential) => credential.type === '');
                }
                case 'is_not_empty': {
                    return credentialData?.filter((credential) => credential.type !== '');
                }
                default: {
                    return credentialData;
                }
            }
        },
        [credentialData],
    );

    const filteredUpdatedData = useCallback((updatedFilter?: FilterValueObj, data?: API.Credential[]) => {
        if (!updatedFilter) return data;

        switch (updatedFilter.operator) {
            case 'is': {
                if (!updatedFilter || !(updatedFilter.value instanceof Date)) return data;
                const valueDate = dayjs(new Date(updatedFilter.value));
                return data?.filter((obj) => dayjs(obj.updatedAt).isSame(valueDate, 'date'));
            }
            case 'is_not': {
                if (!updatedFilter || !(updatedFilter.value instanceof Date)) return data;
                const valueDate = dayjs(new Date(updatedFilter.value));
                return data?.filter((obj) => !dayjs(obj.updatedAt).isSame(valueDate, 'date'));
            }
            case 'is_before': {
                if (!updatedFilter || !(updatedFilter.value instanceof Date)) return data;
                const valueDate = dayjs(new Date(updatedFilter.value));
                return data?.filter((obj) => dayjs(obj.updatedAt).isBefore(valueDate, 'date'));
            }
            case 'is_after': {
                if (!updatedFilter || !(updatedFilter.value instanceof Date)) return data;
                const valueDate = dayjs(new Date(updatedFilter.value));
                return data?.filter((obj) => dayjs(obj.updatedAt).isAfter(valueDate, 'date'));
            }
            case 'is_before_and_on': {
                if (!updatedFilter || !(updatedFilter.value instanceof Date)) return data;
                const valueDate = dayjs(new Date(updatedFilter.value));
                return data?.filter(
                    (obj) => dayjs(obj.updatedAt).isSame(valueDate, 'date') || dayjs(obj.updatedAt).isBefore(valueDate, 'date'),
                );
            }
            case 'is_after_and_on': {
                if (!updatedFilter || !(updatedFilter.value instanceof Date)) return data;
                const valueDate = dayjs(new Date(updatedFilter.value));
                return data?.filter(
                    (obj) => dayjs(obj.updatedAt).isSame(valueDate, 'date') || dayjs(obj.updatedAt).isAfter(valueDate, 'date'),
                );
            }
            case 'is_between': {
                if (!updatedFilter || !(updatedFilter.value instanceof Array)) return data;
                const [startDate, endDate] = updatedFilter.value as [Date, Date];
                const startValueDate = dayjs(startDate);
                const endValueDate = dayjs(endDate);
                return data?.filter(
                    (obj) => dayjs(obj.updatedAt).isAfter(startValueDate, 'date') && dayjs(obj.updatedAt).isBefore(endValueDate, 'date'),
                );
            }
            default: {
                return data;
            }
        }
    }, []);

    const filteredData = useCallback(() => {
        if (credentialData) {
            if (!filterValues || filterValues.length === 0) {
                return credentialData?.filter((item: API.Credential) => {
                    const itemName = item.name.toLowerCase();
                    return itemName.includes(searchInput);
                });
            }

            const typeFilter = filterValues.find((item) => item.type === 'Type');
            const updatedFilter = filterValues.find((item) => item.type === 'Updated');
            const typeData = filteredTypesData(typeFilter);
            const updatedData = filteredUpdatedData(updatedFilter, typeData);
            return updatedData?.filter((item: API.Credential) => {
                const itemName = item.name.toLowerCase();
                return itemName.includes(searchInput);
            });
        }
    }, [credentialData, filterValues, filteredTypesData, filteredUpdatedData, searchInput]);

    const filteredCredentialData = filteredData();

    const handleAddNewCredential = () => {
        navigate('/credentials/new');
    };

    const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof API.Credential) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const renderFilterAndAddNewButton = () => (
        <Space size={12}>
            {credentialData && credentialData.length > 0 && (
                <Badge
                    badgeContent={filterValues.length}
                    sx={{
                        '& .MuiBadge-badge': {
                            background: 'var(--color-primary-3)',
                            color: 'var(--color-primary-1)',
                            width: '16px',
                            height: '16px',
                            minWidth: '16px',
                            fontSize: '12px',
                            borderRadius: '8px',
                            padding: 0,
                            top: '4px',
                            right: '4px',
                        },
                    }}
                >
                    <Tooltip arrow title={t('filter')} placement="top">
                        <IconButton
                            sx={{
                                background: openFilter || filterValues.length > 0 ? 'var(--color-secondary-2)' : undefined,
                            }}
                            onClick={() => setOpenFilter((prev) => !prev)}
                            type="secondary"
                            variant="text"
                        >
                            <Icon name="filter" />
                        </IconButton>
                    </Tooltip>
                </Badge>
            )}

            <Search
                value={searchInput}
                placeholder={t('search')}
                onSearch={(inputValue) => setSearchInput(inputValue)}
                onReset={() => setSearchInput('')}
                sx={{ width: '248px' }}
            />

            <Button text={t('credentials_add_new_button')} onClick={handleAddNewCredential} />
        </Space>
    );

    if (isFetched && filteredCredentialData && credentialData && credentialData.length === 0) {
        return <Navigate to="/credentials/new" replace />;
    }

    return (
        <PageLayout
            title={t('credentials_heading')}
            rightSideComponent={renderFilterAndAddNewButton()}
            loading={isFetching}
            containerClassName={styles.headerContainer}
            contentContainerClassName={styles.contentContainer}
        >
            <>
                <TableFilter
                    open={openFilter}
                    filterTypesArr={filterTypesArr}
                    setFilterValues={setFilterValues}
                    filterValues={filterValues}
                />
                <div className={styles.table}>
                    <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
                    {filteredCredentialData &&
                        credentialData &&
                        credentialData.length > 0 &&
                        stableSort<API.Credential>(filteredCredentialData, getComparator(order, orderBy)).map((item) => (
                            <TableRow
                                key={item.id}
                                item={item}
                                refresh={async () => {
                                    await refetch();
                                }}
                            />
                        ))}

                    {filteredCredentialData?.length === 0 && (
                        <Box>
                            <Illustration
                                name={'fileSearch'}
                                description={
                                    <Typography style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px' }}>
                                        <Trans i18nKey="integrations_empty_search">
                                            No matching result has been found. \nCheck the spelling or
                                            <Link to={'/credentials/new'}>add a new integration</Link>
                                            now.
                                        </Trans>
                                    </Typography>
                                }
                                style={{
                                    marginTop: '129px',
                                }}
                            />
                        </Box>
                    )}
                </div>
            </>
        </PageLayout>
    );
};

export default Credentials;
