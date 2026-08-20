import { Button, FieldSelect, Icon, Illustration, Space, Spin, Typography } from '@imbrace/ui';
import type { ColumnOrderState, ColumnSizingState, Row, TableState } from '@tanstack/react-table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import apiFetch from '@/services/axios/handler';
import styles from './index.module.scss';
import { fetchAllApWorkflows } from '@/services/api/apWorkflow';
import { getAllIPSWorkflow } from '@/services/api/workflow';
import SearchBar, { SearchBarRef } from '@/pages/Databoards/searchBar';
import { debounce } from 'lodash';
import EnhancedTableHead from './Table/TableHead';
import { Box, Link, Table } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import TableRow from './Table/TableRow';

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

const WorkflowFunctionsSelection = ({
    workflowFunctions,
    onSelect,
    onClose,
    isUseCaseVersion2,
    isInCreateFlow = false,
}: {
    workflowFunctions: { id: string | number; name: string; description: string }[];
    onSelect: (workflowFunctions: { id: string | number; name: string; description: string }[]) => void;
    onClose: () => void;
    isUseCaseVersion2: boolean;
    isInCreateFlow?: boolean;
}) => {
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof API.WorkflowListItem>('name');
    const [selectedWorkflowFunctions, setSelectedWorkflowFunctions] = useState<{ id: string | number; name: string; description: string }[]>(
        workflowFunctions || [],
    );
    const { t } = useTranslation();
    const searchBarRef = useRef<SearchBarRef>(null);

    const handleRequestSort = (event: React.MouseEvent<unknown>, property: keyof API.WorkflowListItem) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const fetchWorkflowFunctions = async () => {
        const sort = 'created_at';
        try {
            // V2 lists flows straight from ActivePieces, transformed to the expected structure
            if (isUseCaseVersion2 || isInCreateFlow) {
                const { data: flows } = await fetchAllApWorkflows({
                    haveAISettings: true,
                    tags: ['agent', 'capabilities'],
                    onlyEnabled: true,
                    sort,
                });
                return flows.map((item) => ({
                    id: item.id,
                    name: item.displayName,
                    description: item.metadata?.description || item.metadata?.settings?.ai?.function?.description || '',
                    active: item.active === 'ENABLED',
                    createdAt: item.created,
                    updatedAt: item.updated,
                    tags: item.metadata?.tags || [],
                    settings: item.metadata?.settings,
                }));
            }

            const searchParams = new URLSearchParams();
            searchParams.append('haveAISettings', 'true');
            searchParams.append('sort', `${sort}`);
            searchParams.append('limit', '-1');
            const { data } = await apiFetch<API.PaginatedResponse<any[]>>(
                getAllIPSWorkflow.api({}),
                getAllIPSWorkflow.method,
                searchParams,
            );

            return data.data;
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const { data: workflowFunctionsData, isLoading } = useQuery({
        queryKey: ['workflow_functions'],
        queryFn: fetchWorkflowFunctions,
    });

    const onSearchDebounce = debounce((searchText) => {
        setGlobalSearch(searchText);
    }, 300);

    const filteredData = useCallback(() => {
        if (workflowFunctionsData) {
            if (!globalSearch || globalSearch.length === 0) {
                return workflowFunctionsData;
            }
            return workflowFunctionsData?.filter((item: API.WorkflowListItem) => {
                const itemName = item.name.toLowerCase();
                return itemName.includes(globalSearch.toLowerCase() || '');
            });
        }
    }, [workflowFunctionsData, globalSearch]);

    const filteredWorkflowFunctionsData = filteredData();

    const renderTableRow = (item: API.WorkflowListItem, index: number) => {
        return (
            <TableRow
                key={item.name || `new-field-${index}`}
                item={item}
                onSelect={(val: { id: string | number; name: string; description: string }) => {
                    if (selectedWorkflowFunctions.some((item) => String(item.id) === String(val.id))) {
                        setSelectedWorkflowFunctions((prev) => prev.filter((item) => String(item.id) !== String(val.id)));
                    } else {
                        setSelectedWorkflowFunctions((prev) => [...prev, val]);
                    }
                }}
                index={index}
                isSelected={selectedWorkflowFunctions.some(
                    (val: { id: string | number; name: string; description: string }) => String(val.id) === String(item.id),
                )}
            />
        );
    };

    const renderListWorkflowFunction = () => {
        if (filteredWorkflowFunctionsData && filteredWorkflowFunctionsData?.length > 0) {
            return (
                <Box
                    sx={{
                        height: 'calc(100vh - 420px)',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid #135DD5',
                    }}
                >
                    <Table>
                        <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
                    </Table>
                    <Box
                        sx={{
                            overflow: 'auto',
                            flex: 1,
                            '& table': {
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                            },
                        }}
                    >
                        <Table>
                            {stableSort<API.WorkflowListItem>(filteredWorkflowFunctionsData, getComparator(order, orderBy)).map(
                                (item, index) => renderTableRow(item, index),
                            )}
                        </Table>
                    </Box>
                </Box>
            );
        }
        return (
            <Space direction="vertical" align="center" justify="center" style={{ width: '100%' }}>
                <Illustration
                    name={'fileSearch'}
                    description={
                        <Typography style={{ fontSize: '16px', fontWeight: 600, lineHeight: '24px' }}>
                            No matching result has been found.
                        </Typography>
                    }
                />
            </Space>
        );
    };

    return (
        <Spin isSpinning={isLoading}>
            <Space size={0} direction="vertical" align="start" className={styles.boardContainer}>
                <Space style={{ width: '100%', marginBottom: '16px' }} size={0} direction="vertical" align="end" justify="start">
                    <SearchBar
                        ref={searchBarRef}
                        onSearch={(searchText: string | undefined) => {
                            onSearchDebounce(searchText);
                        }}
                    />
                </Space>
                {renderListWorkflowFunction()}
            </Space>
            <Space align="center" justify="end">
                <Button
                    text={t('ai_assistant_management_behavior_setting_list_of_functions_apply_to_assistant')}
                    sx={{ width: '213px', padding: '0px', marginTop: '20px', marginBottom: '12px', marginRight: '32px' }}
                    variant="contained"
                    onClick={() => onSelect(selectedWorkflowFunctions)}
                />
            </Space>
        </Spin>
    );
};

export default WorkflowFunctionsSelection;
