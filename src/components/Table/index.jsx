import { Table, TableBody, TableContainer } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ImbraceLogo from '../../assets/icons/imbrace_logo_small.svg?react';
import Loading from '../Loading';
import styles from './index.module.scss';
import ListPagination from './ListPagination';
import ListRow from './ListRow';
import ListTableHeader from './ListTableHeader';

function descendingComparator(a, b, orderBy) {
    if (b[orderBy] < a[orderBy]) {
        return -1;
    }
    if (b[orderBy] > a[orderBy]) {
        return 1;
    }
    return 0;
}

function getComparator(order, orderBy) {
    return order === 'desc' ? (a, b) => descendingComparator(a, b, orderBy) : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
    const stabilizedThis = array.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order !== 0) {
            return order;
        }
        return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
}
const muiStyles = {
    table: {
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        border: 'solid 1px #e0e0e0',
        // maxHeight: 741,
        minHeight: 300,
        '&::-webkit-scrollbar': {
            width: '7.5px',
            height: 5,
            backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
            boxShadow: '0 0 2px rgba(0, 0, 0, 0.3)',
            borderRadius: 10,
            backgroundColor: 'rgba(130,130,130,0.7)',
            minHeight: '30%',
        },
        '&::-webkit-scrollbar-thumb:focus': {
            backgroundColor: 'rgba(130,130,130,1)',
        },
        '&::-webkit-scrollbar-thumb:active': {
            backgroundColor: 'rgba(130,130,130,1)',
        },
        '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'rgba(130,130,130,1)',
        },
        '&::-webkit-scrollbar-corner': {
            backgroundColor: 'transparent',
        },
    },
};
/**
 * rowSelection = {
  onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
    console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
  },
  getCheckboxProps: (record: DataType) => ({
    disabled: record.name === 'Disabled User', // Column configuration not to be checked
    name: record.name,
  }),
}
 * @param {*} props 
 * @returns 
 */
function EnhancedTable(props) {
    const {
        data = [],
        pagination,
        handleChangePage,
        handelSort,
        loading,
        handleFilterChange,
        rowSelection,
        columns,
        layout = 'auto',
        onRowClick,
    } = props;
    const { t } = useTranslation();
    const [order, setOrder] = useState('desc');
    const [orderBy, setOrderBy] = useState('created_at');
    const [displayedInfo, setDisplayedInfo] = useState({});
    const [selectedRows, setSelectedRows] = useState([]);

    const tableRef = useRef();

    const selectable = rowSelection && rowSelection.onChange;

    const handleRequestSort = (event, property) => {
        const isAsc = orderBy === property && order === 'asc';
        if (handelSort) {
            if (order === 'desc' && orderBy === property && property !== 'created_at') {
                setOrderBy('');
                handelSort();
            } else {
                setOrderBy(property);
                handelSort(property, isAsc ? 'desc' : 'asc');
            }
            setOrder(isAsc ? 'desc' : 'asc');
        } else {
            setOrder(isAsc ? 'desc' : 'asc');
            setOrderBy(property);
        }
    };

    const onDisplaySelect = (selected) => {
        const prevCheckStatus = displayedInfo[selected].checked;
        setDisplayedInfo((prev) => ({
            ...prev,
            [selected]: { ...prev[selected], checked: !prevCheckStatus },
        }));
    };

    const getTotalCheckboxCount = useMemo(() => {
        if (rowSelection?.checkboxProps && rowSelection?.checkboxProps?.disabled) {
            return data.filter((row) => !rowSelection?.checkboxProps?.disabled(row)).length;
        }
        return data.length;
    }, [data, rowSelection?.checkboxProps]);

    const onSelect = (selected, checked) => {
        let tmpSelectedRows = [];
        if (checked) {
            tmpSelectedRows = [...selectedRows, selected];
        } else {
            tmpSelectedRows = selectedRows.filter((row) => row !== selected);
        }
        setSelectedRows(tmpSelectedRows);
        rowSelection.onChange(tmpSelectedRows);
    };

    const onSelectAll = () => {
        let tmpSelectedRows = [];
        if (selectedRows.length !== getTotalCheckboxCount) {
            if (rowSelection?.checkboxProps && rowSelection?.checkboxProps?.disabled) {
                tmpSelectedRows = data
                    .filter((row) => !rowSelection?.checkboxProps?.disabled(row))
                    .map((row) => (rowSelection.key ? row[rowSelection.key] : row.id));
            } else {
                tmpSelectedRows = data.map((row) => (rowSelection.key ? row[rowSelection.key] : row.id));
            }
        }
        setSelectedRows(tmpSelectedRows);
        rowSelection.onChange(tmpSelectedRows);
    };

    useEffect(() => {
        if (rowSelection?.selectedIds) {
            setSelectedRows(rowSelection?.selectedIds);
        }
    }, [rowSelection?.selectedIds]);

    useEffect(() => {
        const allDisplayedInfo = columns.reduce((acc, cur) => {
            const newItem = {
                id: cur.id,
                label: cur.label,
                checked: true,
                ...cur,
            };
            acc[cur.id] = newItem;
            return acc;
        }, {});
        setDisplayedInfo(allDisplayedInfo);
    }, [columns, data]);

    const renderColGroup = () => {
        return (
            <colgroup>
                {rowSelection && <col style={{ width: 55 }} />}
                {columns.map((column) => {
                    if (column.width) {
                        return <col key={column.id} style={{ width: column.width, minWidth: column.minWidth }} />;
                    }

                    return <col key={column.id} />;
                })}
            </colgroup>
        );
    };

    return (
        <div className={styles.tableContainer}>
            <TableContainer sx={muiStyles.table}>
                <Table
                    size={'medium'}
                    stickyHeader
                    sx={{
                        minWidth: 900,
                        tableLayout: layout,
                    }}
                    ref={tableRef}
                >
                    {renderColGroup()}
                    {data && (
                        <ListTableHeader
                            order={order}
                            orderBy={orderBy}
                            onRequestSort={handleRequestSort}
                            rowCount={data.length}
                            data={data}
                            columns={columns}
                            displayedInfo={displayedInfo}
                            onDisplaySelect={onDisplaySelect}
                            handleFilterChange={handleFilterChange}
                            selectable={selectable}
                            onSelectAll={onSelectAll}
                            checked={data.length !== 0 && selectedRows.length === getTotalCheckboxCount}
                            disabled={data.length === 0 || getTotalCheckboxCount === 0}
                            rowSelection={rowSelection}
                        />
                    )}
                    <TableBody>
                        {handelSort
                            ? data.map((row, index) => (
                                  <ListRow
                                      key={row.id}
                                      row={row}
                                      index={index}
                                      displayedInfo={displayedInfo}
                                      columns={columns}
                                      selectable={selectable}
                                      checked={selectedRows.indexOf(rowSelection?.key ? row[rowSelection?.key] : row.id) !== -1}
                                      onSelect={onSelect}
                                      rowSelection={rowSelection}
                                      onRowClick={onRowClick}
                                  />
                              ))
                            : stableSort(data, getComparator(order, orderBy)).map((row, index) => (
                                  <ListRow
                                      key={row.id}
                                      row={row}
                                      index={index}
                                      displayedInfo={displayedInfo}
                                      columns={columns}
                                      selectable={selectable}
                                      checked={selectedRows.indexOf(rowSelection?.key ? row[rowSelection?.key] : row.id) !== -1}
                                      onSelect={onSelect}
                                      rowSelection={rowSelection}
                                      onRowClick={onRowClick}
                                  />
                              ))}
                    </TableBody>
                </Table>

                {!loading && data.length === 0 && (
                    <div className={styles.emptyContainer}>
                        <ImbraceLogo width={100} height={100} />
                        <h4>{t('member_table_no_result')}...</h4>
                    </div>
                )}
            </TableContainer>
            {pagination && <ListPagination pagination={pagination} onPageChange={handleChangePage} />}
            {loading && (
                <div className={styles.loadingContainer}>
                    <Loading style={{ width: 100, height: 100 }} />
                    <div className={styles.backdrop}></div>
                </div>
            )}
        </div>
    );
}

export default EnhancedTable;
