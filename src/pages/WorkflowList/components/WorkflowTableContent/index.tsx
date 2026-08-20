import { Icon, Illustration, Space, Tooltip } from '@imbrace/ui';
import { TableSortLabel } from '@mui/material';
import type { QueryObserverResult } from '@tanstack/react-query';
import type { MouseEvent, ReactElement, SyntheticEvent } from 'react';
import { forwardRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import HelpIcon from '@/assets/icons/icon_help.svg?react';

import ChannelTabs from './channelTabs';
import styles from './index.module.scss';
import TableRow from './tableRow';
import { getIsAllowModify } from '@/utils/CookiesHelper';

interface HeadCell {
    id: keyof API.WorkflowListItem;
    label: string | ReactElement;
}

function descendingComparator<T>(a: T, b: T, orderBy: keyof T) {
    if (typeof b[orderBy] === 'object') {
        const prev = a[orderBy] as unknown as API.WorkflowListItem['channel'];
        const current = b[orderBy] as unknown as API.WorkflowListItem['channel'];
        if (!prev) {
            return -1;
        }
        if (!current) {
            return 1;
        }
        if ((prev?.name ?? '').toLowerCase() < (current?.name ?? '').toLowerCase()) {
            return -1;
        }
        if ((prev?.name ?? '').toLowerCase() > (current?.name ?? '').toLowerCase()) {
            return 1;
        }
        return 0;
    }
    if (typeof b[orderBy] === 'string') {
        if ((b[orderBy] as string).toLowerCase() < (a[orderBy] as string).toLowerCase()) {
            return -1;
        }
        if ((b[orderBy] as string).toLowerCase() > (a[orderBy] as string).toLowerCase()) {
            return 1;
        }
        return 0;
    }
    if (!a[orderBy]) {
        return -1;
    }
    if (!b[orderBy]) {
        return 1;
    }
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

interface EnhancedTableProps {
    onRequestSort: (event: MouseEvent<unknown>, property: keyof API.WorkflowListItem) => void;
    order: Order;
    orderBy: string;
    tabIndex: string;
}
const EnhancedTableHead = (props: EnhancedTableProps) => {
    const { t } = useTranslation();
    const { order, orderBy, onRequestSort, tabIndex } = props;
    const createSortHandler = (property: keyof API.WorkflowListItem) => (event: MouseEvent<unknown>) => {
        onRequestSort(event, property);
    };

    const headCells: HeadCell[] = [
        {
            id: 'name',
            label: t('workflow_table_header_name'),
        },
    ];
    if (tabIndex === 'channels') {
        headCells.push({
            id: 'channel',
            label: (
                <Space size={4}>
                    <span>{t('workflow_table_header_channel')}</span>
                    <Tooltip arrow placement="top" title={t('workflow_table_header_channel_description')}>
                        <HelpIcon />
                    </Tooltip>
                </Space>
            ),
        });
    }

    headCells.push({
        id: 'updatedAt',
        label: t('workflow_table_header_updated_at'),
    });

    return (
        <div className={`${styles.tableRow} ${styles.tableHeader}`}>
            {headCells.map((headCell) => (
                <div key={headCell.id}>
                    <TableSortLabel
                        IconComponent={() => (
                            <Icon
                                name="sort"
                                namespace="twoTone"
                                primaryColor={orderBy === headCell.id && order === 'desc' ? 'var(--color-primary-1)' : 'currentColor'}
                                secondaryColor={orderBy === headCell.id && order === 'asc' ? 'var(--color-primary-1)' : 'currentColor'}
                            />
                        )}
                        hideSortIcon={false}
                        active={orderBy === headCell.id}
                        direction={orderBy === headCell.id ? order : 'asc'}
                        onClick={createSortHandler(headCell.id)}
                        sx={{
                            flexDirection: 'row',
                            '& > svg': { opacity: 1, marginLeft: '4px', fontSize: 24, color: 'var(--color-light-5)' },
                            '&.Mui-active': { color: 'var(--color-light-7)' },
                        }}
                    >
                        {headCell.label}
                    </TableSortLabel>
                </div>
            ))}
            <div></div>
        </div>
    );
};
interface WorkflowTableContentProps {
    tabIndex: string;
    searchBarInput?: string;
    channels: API.ChannelType[];
    currentChannel?: API.ChannelType;
    handleChannelChange: (event: SyntheticEvent<Element, Event>, newValue: API.ChannelType) => void;
    dataSource: API.WorkflowListItem[];
    refetch: () => Promise<QueryObserverResult<API.WorkflowListItem[], Error>>;
    isV2?: boolean;
}
export interface WorkflowTableContentRef {
    currentDataSource: API.WorkflowListItem[];
}

const WorkflowTableContent = forwardRef<WorkflowTableContentRef, WorkflowTableContentProps>((props, ref) => {
    const { tabIndex, searchBarInput, channels, currentChannel, handleChannelChange, dataSource, refetch, isV2 } = props;
    const { t } = useTranslation();
    const isAllowModifyWorkflow = getIsAllowModify();

    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<keyof API.WorkflowListItem>('updatedAt');

    const handleRequestSort = (event: MouseEvent<unknown>, property: keyof API.WorkflowListItem) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const renderEmptyText = () => {
        if (searchBarInput) {
            let url = `/workflow/${tabIndex}/new`;
            if (tabIndex === 'channels') {
                url = '/credentials/new';
            }
            return (
                <Trans i18nKey="workflows_tab_empty_search">
                    No matching result has been found.\nCheck the spelling or create this
                    <Link to={url} state={{ currentChannel }}>
                        new workflow
                    </Link>
                    now.
                </Trans>
            );
        }
        if (tabIndex === 'channels') {
            return t('workflows_tab_empty_channels');
        } else if (tabIndex === 'presets') {
            return (
                <Trans i18nKey="workflows_tab_empty_presets">
                    Connect more channels or integrations to{' '}
                    <Link to="/credentials/new" state={{ currentChannel }}>
                        unlock
                    </Link>
                    our presets libraries\nfor you! Or create your own preset workflow now.
                </Trans>
            );
        } else {
            return t('workflows_tab_empty_automation');
        }
    };

    return (
        <>
            {tabIndex === 'channels' && (
                <ChannelTabs channels={channels} currentChannel={currentChannel} handleChange={handleChannelChange} />
            )}
            <div className={`${styles.table} ${styles[tabIndex]}`}>
                <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} tabIndex={tabIndex} />
                {dataSource.length > 0 ? (
                    <div>
                        {stableSort<API.WorkflowListItem>(dataSource, getComparator(order, orderBy)).map((item) => (
                            <TableRow
                                isAllowModifyWorkflow={isAllowModifyWorkflow}
                                workflow={item}
                                key={item.id}
                                tabIndex={tabIndex}
                                currentChannel={currentChannel}
                                refetch={refetch}
                                isV2={isV2}
                            />
                        ))}
                    </div>
                ) : (
                    <div className={styles.empty}>
                        <Illustration
                            name={searchBarInput ? 'fileSearch' : 'data'}
                            description={renderEmptyText()}
                            style={{
                                marginTop: '129px',
                            }}
                        />
                    </div>
                )}
            </div>
        </>
    );
});
export default WorkflowTableContent;
