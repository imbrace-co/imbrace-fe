import { FieldText, Icon, IconButton } from '@imbrace/ui';
import { MenuItem, Select, Typography as MuiTypography } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { renderSampleDataField } from '@/components/FieldSampleData';
import { FieldTypeIcon } from '@/pages/DataboardEnhance/utils';
import { FieldTypesOptions } from '@/pages/Databoards/utils';

/**
 * Inline TableInTable ("Nested Model") editor — the single source of truth shared by the
 * document-models schema editor (BoardSchema/AttributeModal) and the Databoards document-AI
 * field form (ManageFields/operationFieldForm). Columns live in `settings.columns`; sample
 * rows live as a JSON string (the field's `sampleData`). Keeping both forms on this component
 * guarantees they render identically.
 */
export type TITColumn = { name: string; type: string; data?: { value: string }[] };

const labelSx = { fontSize: 14, fontWeight: 800, mb: 0.5, color: 'var(--color-light-7)' };

const OPTION_BASED = new Set(['Priority', 'SingleSelection', 'MultipleSelection', 'Origin']);
const isOptionBased = (type: string) => OPTION_BASED.has(type);

const parseRows = (raw: string): Record<string, string>[] => {
    try {
        const p = JSON.parse(raw || '[]');
        return Array.isArray(p) ? p : [];
    } catch {
        return [];
    }
};

/** Left-column block: "Table Structure" heading + per-column (name + AI Logic type) editor. */
export const TableInTableStructure = ({
    columns,
    onColumnsChange,
    readOnly,
    lockExistingColumnTypes,
}: {
    columns: TITColumn[];
    onColumnsChange: (cols: TITColumn[]) => void;
    readOnly?: boolean;
    /** Lock the AI Logic (type) select for columns that already exist (have an id). Changing the
     *  type of a persisted column doesn't propagate to the child board and would orphan its data,
     *  so the Databoards form forbids it — only brand-new columns can still pick a type. */
    lockExistingColumnTypes?: boolean;
}) => {
    const isExistingColumn = (c: TITColumn) =>
        !!((c as any)._id || (c as any).id || (c as any).field_id);
    const { t } = useTranslation();
    const typeOptions = useMemo(
        () => FieldTypesOptions(t, true).filter((o) => o.value !== 'Priority' && o.value !== 'TableInTable'),
        [t],
    );

    const addColumn = () => onColumnsChange([...columns, { name: '', type: 'ShortText' }]);
    const updateName = (idx: number, name: string) =>
        onColumnsChange(columns.map((c, i) => (i === idx ? { ...c, name } : c)));
    const updateType = (idx: number, type: string) =>
        onColumnsChange(columns.map((c, i) => (i === idx ? { ...c, type } : c)));
    const removeColumn = (idx: number) => onColumnsChange(columns.filter((_, i) => i !== idx));

    const headerCellSx: React.CSSProperties = {
        background: 'var(--color-primary-3)',
        textAlign: 'left',
        padding: '8px',
        fontWeight: 800,
        fontSize: 14,
        color: 'var(--color-light-7)',
        borderTop: '1px solid var(--color-light-3)',
        borderBottom: '1px solid var(--color-light-3)',
    };

    return (
        <div>
            <MuiTypography component="label" sx={labelSx}>
                {t('schema_attr_table_structure', 'Table Structure')}
            </MuiTypography>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                <thead>
                    <tr>
                        <th style={headerCellSx}>{t('schema_col_name', 'Attribute Name')}</th>
                        <th style={headerCellSx}>{t('schema_col_ai_logic', 'AI Logic')}</th>
                        {!readOnly && <th style={{ width: 32, ...headerCellSx }} />}
                    </tr>
                </thead>
                <tbody>
                    {columns.map((col, idx) => (
                        <tr key={idx}>
                            <td style={{ padding: '4px 8px 4px 0' }}>
                                <FieldText
                                    fullWidth
                                    value={col.name}
                                    disabled={readOnly}
                                    onChange={(e) => updateName(idx, (e.target as HTMLInputElement).value)}
                                />
                            </td>
                            <td style={{ padding: '4px 8px' }}>
                                <Select
                                    size="small"
                                    fullWidth
                                    value={col.type || 'ShortText'}
                                    disabled={readOnly || (lockExistingColumnTypes && isExistingColumn(col))}
                                    onChange={(e) => updateType(idx, e.target.value as string)}
                                    renderValue={(v) => {
                                        const o = typeOptions.find((x) => x.value === v);
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {o?.icon ?? FieldTypeIcon(v as API.FieldType, { style: { color: 'var(--color-light-5)' } })}
                                                <span>{o?.text ?? v}</span>
                                            </div>
                                        );
                                    }}
                                >
                                    {typeOptions.map((o) => (
                                        <MenuItem key={o.value} value={o.value}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {o.icon}
                                                <span>{o.text}</span>
                                            </div>
                                        </MenuItem>
                                    ))}
                                </Select>
                            </td>
                            {!readOnly && (
                                <td style={{ padding: '4px', textAlign: 'center' }}>
                                    <IconButton size="xs" variant="text" type="secondary" onClick={() => removeColumn(idx)}>
                                        <Icon name="close" style={{ fontSize: 14 }} />
                                    </IconButton>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {!readOnly && (
                <button
                    type="button"
                    onClick={addColumn}
                    style={{ background: 'none', border: 'none', color: 'var(--color-primary-1)', fontSize: 12, fontWeight: 400, cursor: 'pointer', padding: '8px 0 0' }}
                >
                    + {t('schema_attr_add_column', 'Add Column')}
                </button>
            )}
        </div>
    );
};

/** Right-column block (content only — caller renders the "Sample Data" heading): the sample
 *  rows table + per-option-column option editors. */
export const TableInTableSample = ({
    columns,
    sampleData,
    onColumnsChange,
    onSampleDataChange,
    readOnly,
}: {
    columns: TITColumn[];
    sampleData: string;
    onColumnsChange: (cols: TITColumn[]) => void;
    onSampleDataChange: (next: string) => void;
    readOnly?: boolean;
}) => {
    const { t } = useTranslation();
    const rows = parseRows(sampleData);

    const addRow = () => {
        const newRow: Record<string, string> = {};
        columns.forEach((col) => {
            newRow[col.name] = '';
        });
        onSampleDataChange(JSON.stringify([...rows, newRow]));
    };
    const updateCell = (rowIdx: number, colName: string, value: string) =>
        onSampleDataChange(JSON.stringify(rows.map((row, i) => (i === rowIdx ? { ...row, [colName]: value } : row))));
    const removeRow = (rowIdx: number) =>
        onSampleDataChange(JSON.stringify(rows.filter((_, i) => i !== rowIdx)));

    const addColOption = (colIdx: number) =>
        onColumnsChange(columns.map((c, i) => (i === colIdx ? { ...c, data: [...(c.data ?? []), { value: '' }] } : c)));
    const updateColOption = (colIdx: number, optIdx: number, value: string) =>
        onColumnsChange(
            columns.map((c, i) => {
                if (i !== colIdx) return c;
                return { ...c, data: (c.data ?? []).map((d, di) => (di === optIdx ? { ...d, value } : d)) };
            }),
        );
    const removeColOption = (colIdx: number, optIdx: number) =>
        onColumnsChange(
            columns.map((c, i) => {
                if (i !== colIdx) return c;
                return { ...c, data: (c.data ?? []).filter((_, di) => di !== optIdx) };
            }),
        );

    return (
        <div style={{ marginTop: 15 }}>
            {/* Rows table — ALL columns including option-based */}
            {columns.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                {columns.map((col, ci) => (
                                    <th key={ci} style={{ textAlign: 'left', padding: ci === 0 ? '6px 8px 6px 0' : '6px 8px', fontWeight: 800, fontSize: 13, color: 'var(--color-light-7)', whiteSpace: 'nowrap' }}>
                                        {col.name || `Col ${ci + 1}`}
                                    </th>
                                ))}
                                {!readOnly && <th style={{ width: 32 }} />}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, ri) => (
                                <tr key={ri}>
                                    {columns.map((col, ci) => (
                                        <td key={ci} style={{ padding: ci === 0 ? '4px 4px 4px 0' : '4px', minWidth: 120 }}>
                                            {!isOptionBased(col.type) && renderSampleDataField({
                                                type: col.type,
                                                value: String(row[col.name] ?? ''),
                                                disabled: !!readOnly,
                                                label: '',
                                                onChange: (v) => updateCell(ri, col.name, v),
                                            })}
                                        </td>
                                    ))}
                                    {!readOnly && (
                                        <td style={{ padding: '4px', textAlign: 'center' }}>
                                            <IconButton size="xs" variant="text" type="secondary" onClick={() => removeRow(ri)}>
                                                <Icon name="close" style={{ fontSize: 14 }} />
                                            </IconButton>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!readOnly && (
                        <button
                            type="button"
                            onClick={addRow}
                            style={{ background: 'none', border: 'none', color: 'var(--color-primary-1)', fontSize: 12, fontWeight: 400, cursor: 'pointer', padding: '8px 0 0' }}
                        >
                            + {t('schema_attr_add_record', 'Record')}
                        </button>
                    )}
                </div>
            )}

            {/* Options editors for option-based columns — below the rows table */}
            {columns.some((c) => isOptionBased(c.type)) && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {columns.map((col, ci) =>
                        isOptionBased(col.type) ? (
                            <div key={ci}>
                                <MuiTypography sx={{ fontSize: 13, fontWeight: 600, color: 'var(--color-light-7)', mb: 0.5 }}>
                                    {col.name || `Col ${ci + 1}`}
                                </MuiTypography>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(col.data ?? []).map((opt, oi) => (
                                        <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ width: 18, color: 'var(--color-light-5)', fontSize: 13 }}>{oi + 1}</span>
                                            <FieldText
                                                fullWidth
                                                value={opt.value}
                                                disabled={readOnly}
                                                onChange={(e) => updateColOption(ci, oi, (e.target as HTMLInputElement).value)}
                                            />
                                            {!readOnly && (col.data?.length ?? 0) > 1 && (
                                                <IconButton size="xs" variant="text" type="secondary" onClick={() => removeColOption(ci, oi)}>
                                                    <Icon name="close" style={{ fontSize: 14 }} />
                                                </IconButton>
                                            )}
                                        </div>
                                    ))}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => addColOption(ci)}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary-1)', fontSize: 12, fontWeight: 400, cursor: 'pointer', textAlign: 'left', padding: '4px 0 0' }}
                                        >
                                            + {t('schema_attr_add_option', 'Add Options')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : null,
                    )}
                </div>
            )}
        </div>
    );
};
