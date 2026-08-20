import { Checkbox, TableRow } from '@mui/material';
import { styled } from '@mui/material/styles';
import MuiTableCell from '@mui/material/TableCell';

const TableCell = styled(MuiTableCell)(() => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
}));

function ListRow(props) {
    const { row, displayedInfo, columns, checked, selectable, onSelect, rowSelection, onRowClick } = props;

    const rowSelectionKey = rowSelection?.key;
    const disabled = rowSelection?.checkboxProps && rowSelection?.checkboxProps?.disabled(row);
    const customCheckboxRender = rowSelection?.customRender;

    const checkBox = (
        <Checkbox
            color="primary"
            checked={checked}
            disabled={disabled}
            onChange={(event) => onSelect(rowSelectionKey ? row[rowSelectionKey] : row?.id, event.target.checked)}
        />
    );
    const renderCheckBox = () => {
        return customCheckboxRender ? (
            <TableCell padding="checkbox" sx={{ textAlign: 'center' }}>
                {customCheckboxRender(row, checkBox)}
            </TableCell>
        ) : (
            <TableCell padding="checkbox" sx={{ textAlign: 'center' }}>
                {checkBox}
            </TableCell>
        );
    };

    const renderData = (rowItems, key) => {
        if (rowItems && rowItems?.customize && typeof rowItems?.customize === 'function') {
            return rowItems?.customize?.(key, row);
        }
        return row[key] || '-';
    };

    const renderItemPerColumn = () =>
        Object.entries(displayedInfo).map(([key, obj]) => {
            if (!obj.checked) {
                return null;
            }
            let rowItems = columns.find((column) => column.id === key);

            return (
                <TableCell
                    padding={obj.disablePadding ? 'none' : 'normal'}
                    key={`listRow-${row.id}-${obj.id}`}
                    align={rowItems?.align || 'left'}
                    sx={{
                        textOverflow: 'initial',
                    }}
                >
                    {renderData(rowItems, key)}
                </TableCell>
            );
        });

    const renderExtraItem = () =>
        columns
            .filter((obj) => obj.extra)
            .map((obj) => {
                return (
                    <TableCell sx={{ color: row.is_active ? '' : '#fff' }} align="left">
                        {obj?.customize(null, row)}
                    </TableCell>
                );
            });

    return (
        <TableRow
            hover
            key={row.id}
            tabIndex={-1}
            sx={{
                backgroundColor: row.is_active ? '' : 'special_code.primary',
                color: row.is_active ? '' : '#fff',
                ...(onRowClick && { cursor: 'pointer' }),
            }}
            checked={checked}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
        >
            {selectable && renderCheckBox()}
            {/* RENDER EACH COLUMN ITEM */}
            {renderItemPerColumn()}
            {renderExtraItem()}
        </TableRow>
    );
}

export default ListRow;
