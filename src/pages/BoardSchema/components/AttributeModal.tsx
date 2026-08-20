import {
    Button,
    Checkbox,
    FieldText,
    Icon,
    IconButton,
} from '@imbrace/ui';
import {
    Dialog,
    DialogContent,
    FormControl,
    MenuItem,
    Select,
    Typography as MuiTypography,
} from '@mui/material';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { renderSampleDataField } from '@/components/FieldSampleData';
import { TableInTableSample, TableInTableStructure, type TITColumn } from '@/components/TableInTableEditor';
import { FieldTypeIcon } from '@/pages/DataboardEnhance/utils';
import { FieldTypesOptions } from '@/pages/Databoards/utils';

import styles from '../BoardSchemaDetail.module.scss';
import type { SchemaAttribute, SchemaFieldType } from '../types';

export type AttributeFormValue = Omit<SchemaAttribute, 'id'>;

interface AttributeModalProps {
    open: boolean;
    mode: 'create' | 'edit';
    initial?: SchemaAttribute;
    /** When true, all fields are disabled and Save/Delete are hidden (view-only). */
    readOnly?: boolean;
    /** When true, only the AI Logic (type) field is locked — other fields stay editable.
     *  Used when editing an already-saved attribute, whose type must not change. */
    disableTypeChange?: boolean;
    onClose: () => void;
    onSave: (value: AttributeFormValue) => Promise<void> | void;
    onDelete?: () => Promise<void> | void;
    /** Show the Delete button but disabled (e.g. last remaining attribute). */
    deleteDisabled?: boolean;
}


const labelSx = { fontSize: 14, fontWeight: 800, mb: 0.5, color: 'var(--color-light-7)' };

const OPTION_BASED_TYPES = new Set<SchemaFieldType>([
    'Priority',
    'SingleSelection',
    'MultipleSelection',
    'Origin',
]);
const isOptionBased = (type: SchemaFieldType) => OPTION_BASED_TYPES.has(type);

const PRIORITY_DEFAULTS = ['Low', 'Medium', 'High', 'Urgent'];

type AttrOption = { id?: string; value: string; color?: string; order?: number };

const ensureOptionsForType = (type: SchemaFieldType, data?: AttrOption[]): AttrOption[] => {
    if (!isOptionBased(type)) return [];
    if (data && data.length > 0) return data;
    if (type === 'Priority') {
        return PRIORITY_DEFAULTS.map((value, i) => ({ value, order: i }));
    }
    return [{ value: '', order: 0 }];
};

const AttributeModal = ({ open, mode, initial, readOnly, disableTypeChange, onClose, onSave, onDelete, deleteDisabled }: AttributeModalProps) => {
    const { t } = useTranslation();

    const blank = useMemo<AttributeFormValue>(
        () => ({
            name: '',
            type: 'ShortText',
            extractionPrompt: '',
            sampleData: '',
            hiddenOnRecord: false,
            hidden: false,
            data: [],
            settings: {},
        }),
        [],
    );

    const [form, setForm] = useState<AttributeFormValue>(blank);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        if (mode === 'edit' && initial) {
            setForm({
                name: initial.name,
                type: initial.type,
                extractionPrompt: initial.extractionPrompt ?? '',
                sampleData: initial.sampleData ?? '',
                hiddenOnRecord: !!initial.hiddenOnRecord,
                hidden: !!initial.hidden,
                data: ensureOptionsForType(initial.type, initial.data),
                settings: initial.settings ?? {},
            });
        } else {
            setForm(blank);
        }
    }, [open, mode, initial, blank]);

    // When the user switches to an option-based type, seed defaults if no options yet.
    const handleTypeChange = (nextType: SchemaFieldType) => {
        setForm((f) => {
            const existingCols = (f.settings?.columns as TITColumn[] | undefined) ?? [];
            return {
                ...f,
                type: nextType,
                sampleData: nextType === 'TableInTable' ? '[]' : f.sampleData,
                data: isOptionBased(nextType) ? ensureOptionsForType(nextType, f.data) : [],
                settings: nextType === 'TableInTable'
                    ? { ...(f.settings ?? {}), columns: existingCols.length ? existingCols : [{ name: '', type: 'ShortText' }] }
                    : f.settings,
            };
        });
    };

    const updateOption = (idx: number, value: string) => {
        setForm((f) => {
            const next = [...(f.data ?? [])];
            next[idx] = { ...next[idx], value };
            return { ...f, data: next };
        });
    };

    const addOption = () => {
        setForm((f) => ({
            ...f,
            data: [...(f.data ?? []), { value: '', order: (f.data ?? []).length }],
        }));
    };

    const removeOption = (idx: number) => {
        setForm((f) => ({
            ...f,
            data: (f.data ?? []).filter((_, i) => i !== idx),
        }));
    };

    // TableInTable columns live in settings.columns; the shared inline editor
    // (TableInTableStructure / TableInTableSample) owns all add/update/remove logic.
    const getTITCols = (f: AttributeFormValue): TITColumn[] =>
        (f.settings?.columns as TITColumn[] | undefined) ?? [];

    const setTITCols = (cols: TITColumn[]) =>
        setForm((f) => ({ ...f, settings: { ...(f.settings ?? {}), columns: cols } }));

    const fieldTypeOptions = useMemo(
        () => FieldTypesOptions(t, true).filter((o) => o.value !== 'Priority'),
        [t],
    );
    const titColumns: TITColumn[] = form.type === 'TableInTable' ? getTITCols(form) : [];

    const isValid = form.name.trim().length > 0;

    const handleSave = async () => {
        if (!isValid) return;
        try {
            setSaving(true);
            await onSave({ ...form, name: form.name.trim() });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const dividerStyle: React.CSSProperties = {
        border: 'none',
        borderTop: '1px solid var(--color-light-4)',
        margin: 0,
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
            <DialogContent sx={{ padding: '56px 38px 40px 32px !important', position: 'relative' }}>
                <IconButton
                    size="xs"
                    variant="text"
                    type="secondary"
                    onClick={onClose}
                    sx={{ position: 'absolute', top: 16, right: 16 }}
                >
                    <Icon name="close" />
                </IconButton>

                <div style={{ display: 'flex', gap: 34, minHeight: 380 }}>
                    {/* Left column */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <FieldText
                            fullWidth
                            label={t('schema_attr_name', 'Attribute Name')}
                            value={form.name}
                            disabled={readOnly}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, name: (e.target as HTMLInputElement).value }))
                            }
                        />
                        <FormControl fullWidth>
                            <MuiTypography component="label" sx={labelSx}>
                                {t('schema_attr_ai_logic', 'AI Logic')}
                            </MuiTypography>
                            <Select
                                size="small"
                                value={form.type}
                                disabled={readOnly || disableTypeChange}
                                sx={(readOnly || disableTypeChange) ? {
                                    backgroundColor: 'var(--color-light-2)',
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'var(--color-light-3)',
                                    },
                                    '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'var(--color-light-3)',
                                    },
                                    '& .MuiSelect-select.Mui-disabled': {
                                        backgroundColor: 'var(--color-light-2)',
                                        WebkitTextFillColor: 'var(--color-light-7)',
                                    },
                                } : undefined}
                                onChange={(e) => handleTypeChange(e.target.value as SchemaFieldType)}
                                renderValue={(v) => {
                                    const opt = fieldTypeOptions.find((o) => o.value === v);
                                    return (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {opt?.icon ?? FieldTypeIcon(v as API.FieldType, { style: { color: 'var(--color-light-5)' } })}
                                            <span style={{ fontSize: 14, fontWeight: 400 }}>{opt?.text ?? v}</span>
                                        </div>
                                    );
                                }}
                            >
                                {fieldTypeOptions.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {opt.icon}
                                            <span style={{ fontSize: 14, fontWeight: 400 }}>{opt.text}</span>
                                        </div>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <div style={{ flex: form.type === 'TableInTable' ? undefined : 1 }}>
                            <FieldText
                                fullWidth
                                multiline
                                minRows={8}
                                label={t('schema_attr_extraction_prompt', 'Extraction Prompt')}
                                value={form.extractionPrompt}
                                disabled={readOnly}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        extractionPrompt: (e.target as HTMLInputElement).value,
                                    }))
                                }
                            />
                        </div>

                        {/* Table Structure — only for TableInTable */}
                        {form.type === 'TableInTable' && (
                            <TableInTableStructure
                                columns={titColumns}
                                onColumnsChange={setTITCols}
                                readOnly={readOnly}
                            />
                        )}
                    </div>

                    {/* Right column */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* Sample Data section */}
                        <div style={{ marginBottom: 18 }}>
                            <MuiTypography component="label" sx={labelSx}>
                                {t('schema_attr_sample_data', 'Sample Data')}
                            </MuiTypography>
                            <hr style={{ ...dividerStyle, marginTop: 10 }} />
                            {form.type === 'TableInTable' ? (
                                <TableInTableSample
                                    columns={titColumns}
                                    sampleData={form.sampleData ?? ''}
                                    onColumnsChange={setTITCols}
                                    onSampleDataChange={(next) => setForm((f) => ({ ...f, sampleData: next }))}
                                    readOnly={readOnly}
                                />
                            ) : isOptionBased(form.type) ? (
                                <div style={{ marginTop: 15, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {(form.data ?? []).map((opt, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ width: 18, color: 'var(--color-light-5)', fontSize: 13 }}>
                                                {idx + 1}
                                            </span>
                                            <FieldText
                                                fullWidth
                                                value={opt.value}
                                                disabled={readOnly}
                                                onChange={(e) => updateOption(idx, (e.target as HTMLInputElement).value)}
                                            />
                                            {!readOnly && (form.data?.length ?? 0) > 1 && (
                                                <IconButton size="xs" variant="text" type="secondary" onClick={() => removeOption(idx)}>
                                                    <Icon name="close" style={{ fontSize: 14 }} />
                                                </IconButton>
                                            )}
                                        </div>
                                    ))}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={addOption}
                                            style={{ background: 'none', border: 'none', color: 'var(--color-primary-1)', fontSize: 12, fontWeight: 400, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 15 }}
                                        >
                                            + {t('schema_attr_add_option', 'Add Options')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div style={{ marginTop: 15 }}>
                                    {renderSampleDataField({
                                        type: form.type,
                                        value: form.sampleData ?? '',
                                        disabled: !!readOnly,
                                        label: '',
                                        onChange: (next) => setForm((f) => ({ ...f, sampleData: next })),
                                    })}
                                </div>
                            )}
                            <hr style={{ ...dividerStyle, marginTop: 31 }} />
                        </div>

                        {/* Checkboxes — space-between, 31px top */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 31 }}>
                            <Checkbox
                                checked={!form.hidden}
                                disabled={readOnly}
                                onChange={(checked) => setForm((f) => ({ ...f, hidden: !checked }))}
                                label={t('schema_attr_show_on_databoard', 'Show on Data board')}
                            />
                            <Checkbox
                                checked={!form.hiddenOnRecord}
                                disabled={readOnly}
                                onChange={(checked) => setForm((f) => ({ ...f, hiddenOnRecord: !checked }))}
                                label={t('schema_attr_show_on_record', 'Show when creating record')}
                            />
                        </div>

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />

                        {/* Buttons — DELETE + SAVE, 97px gap, right-aligned */}
                        {!readOnly && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 97 }}>
                                {mode === 'edit' && onDelete ? (
                                    <button
                                        type="button"
                                        className={styles.deleteLink}
                                        disabled={deleteDisabled}
                                        style={deleteDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                                        onClick={() => { if (!deleteDisabled) onDelete(); }}
                                    >
                                        {t('delete')}
                                    </button>
                                ) : (
                                    <span />
                                )}
                                <Button
                                    variant="contained"
                                    text={t('save')}
                                    onClick={handleSave}
                                    disabled={!isValid || saving}
                                    loading={saving}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AttributeModal;
