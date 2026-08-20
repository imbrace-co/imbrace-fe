import FilterListIcon from '@mui/icons-material/FilterListOutlined';
import { Checkbox, IconButton, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Popover } from '@mui/material';
import { useEffect, useState } from 'react';

const FilterPopover = (props) => {
    const { toOpen, toClose, anchorEl, title, filter, filterOptions, handleFilterChange, name } = props;
    const [checked, setChecked] = useState([]);

    const open = Boolean(anchorEl);

    useEffect(() => {
        let defaultChecked = [];
        Object.entries(filter).forEach(([key, filterObj]) => {
            if (filterObj.defaultChecked) {
                defaultChecked = [...defaultChecked, key];
            }
        });
        setChecked(defaultChecked);
    }, [filter]);

    const onClick = (currentKey) => {
        let tmpChecked = [...checked];

        if (checked.indexOf(currentKey) !== -1) {
            tmpChecked = tmpChecked.filter((check) => check !== currentKey);
        } else {
            tmpChecked = [...tmpChecked, currentKey];
        }

        setChecked(tmpChecked);
        handleFilterChange(name, tmpChecked);
    };

    return (
        <div>
            <IconButton id="popover-btn" onClick={toOpen} sx={{ width: 24, height: 24, padding: 0 }}>
                <FilterListIcon sx={{ width: 18, height: 18 }} />
            </IconButton>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={toClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
            >
                <List
                    dense
                    subheader={
                        <ListSubheader component="div" id="nested-list-subheader">
                            {title}
                        </ListSubheader>
                    }
                >
                    {Object.entries(filter).map(([key, filterObj]) => (
                        <ListItem key={`headCell-${key}`} disablePadding>
                            <ListItemButton
                                dense
                                onClick={() => onClick(key)}
                                disabled={filterOptions?.atLeastOne ? checked.length === 1 && checked.indexOf(key) !== -1 : undefined}
                            >
                                <ListItemIcon sx={{ minWidth: 'auto' }}>
                                    <Checkbox
                                        edge="start"
                                        disabled={
                                            filterOptions?.atLeastOne ? checked.length === 1 && checked.indexOf(key) !== -1 : undefined
                                        }
                                        checked={checked.indexOf(key) !== -1}
                                        tabIndex={-1}
                                        disableRipple
                                    />
                                </ListItemIcon>
                                <ListItemText primary={filterObj.label} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Popover>
        </div>
    );
};

export default FilterPopover;
