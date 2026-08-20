import SettingsIcon from '@mui/icons-material/Settings';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import {
    Box,
    Checkbox,
    FormControlLabel,
    List,
    ListItem,
    ListSubheader,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import FilterPopover from './FilterPopover';
import styles from './index.module.scss';
import OptionPopover from './OptionPopover';

function EnhancedTableHead(props) {
    const {
        data,
        columns,
        order,
        orderBy,
        onRequestSort,
        displayedInfo,
        onDisplaySelect,
        handleFilterChange,
        selectable,
        checked,
        onSelectAll,
        disabled,
    } = props;

    const { t } = useTranslation();

    const createSortHandler = (property) => (event) => {
        onRequestSort(event, property);
    };
    const [anchorEl, setAnchorEl] = useState(null);

    const handlePopoverClick = useCallback((event) => {
        event.stopPropagation();
        if (event.currentTarget.id === 'popover-btn') {
            setAnchorEl(event.currentTarget);
        }
    }, []);

    const handlePopoverClose = useCallback((event) => {
        event.stopPropagation();
        setAnchorEl(null);
    }, []);

    const renderPopoverContent = () => (
        <List
            subheader={
                <ListSubheader component="div" id="nested-list-subheader">
                    {t('member_display_information')}
                </ListSubheader>
            }
        >
            {Object.entries(displayedInfo).length > 0 &&
                Object.entries(displayedInfo).map(([key, obj]) => (
                    <Box key={`headCell-${key}`}>
                        {obj.label && (
                            <ListItem sx={{ display: 'flex' }}>
                                <FormControlLabel
                                    control={
                                        <Checkbox checked={obj.checked} onChange={(e) => onDisplaySelect(e.target.name)} name={obj.id} />
                                    }
                                    label={t(obj.label)}
                                />
                            </ListItem>
                        )}
                    </Box>
                ))}
        </List>
    );

    const renderRow = () => {
        return columns.map(
            (headCell, i) =>
                displayedInfo[headCell.id] &&
                displayedInfo[headCell.id].checked && (
                    <TableCell
                        key={i}
                        // key={headCell.id}
                        style={headCell.style}
                        sx={{ whiteSpace: 'nowrap' }}
                        align={headCell.numeric ? 'right' : 'left'}
                        padding={headCell.disablePadding ? 'none' : 'normal'}
                        sortDirection={orderBy === headCell.id ? order : false}
                    >
                        {!headCell.disableSorter && !headCell.filter ? (
                            <TableSortLabel
                                active={orderBy === headCell.id}
                                // direction={orderBy === headCell.id ? order : 'asc'}
                                // active
                                direction={'desc'}
                                sx={{ fontWeight: 500 }}
                                hideSortIcon={headCell.disableSorter}
                                IconComponent={SortByAlphaIcon}
                                onClick={!headCell.disableSorter && createSortHandler(headCell.id)}
                            >
                                {headCell.hasExtraTool && (
                                    <OptionPopover
                                        zIndex={2000}
                                        toOpen={handlePopoverClick}
                                        toClose={handlePopoverClose}
                                        anchorEl={anchorEl}
                                        triggerBtnComponent={() => <SettingsIcon />}
                                    >
                                        {renderPopoverContent()}
                                    </OptionPopover>
                                )}
                                {t(headCell.label)}
                                {headCell.icon}
                                {orderBy === headCell.id ? (
                                    <Box component="span" sx={visuallyHidden}>
                                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                    </Box>
                                ) : null}
                            </TableSortLabel>
                        ) : (
                            <div className={styles.tableHeadCell}>
                                {headCell.hasExtraTool && (
                                    <OptionPopover
                                        zIndex={2000}
                                        toOpen={handlePopoverClick}
                                        toClose={handlePopoverClose}
                                        anchorEl={anchorEl}
                                        triggerBtnComponent={() => <SettingsIcon />}
                                    >
                                        {renderPopoverContent()}
                                    </OptionPopover>
                                )}
                                {t(headCell.label)}
                                {headCell.icon}
                                {headCell.filter && (
                                    <FilterPopover
                                        toOpen={handlePopoverClick}
                                        toClose={handlePopoverClose}
                                        anchorEl={anchorEl}
                                        name={headCell.id}
                                        title={t(headCell.label)}
                                        filter={headCell.filter}
                                        filterOptions={headCell.filterOptions}
                                        handleFilterChange={handleFilterChange}
                                    />
                                )}
                            </div>
                        )}
                    </TableCell>
                ),
        );
    };

    return (
        <TableHead>
            <TableRow>
                {data && (
                    <>
                        {selectable && (
                            <TableCell padding={'checkbox'} sx={{ [`& .${styles.tableHeadCell}`]: { justifyContent: 'center' } }}>
                                <div className={styles.tableHeadCell}>
                                    {!disabled && <Checkbox color="primary" checked={checked} onChange={() => onSelectAll()} />}
                                </div>
                            </TableCell>
                        )}
                        {renderRow()}
                    </>
                )}
            </TableRow>
        </TableHead>
    );
}

export default EnhancedTableHead;
