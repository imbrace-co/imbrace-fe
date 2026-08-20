import {
    FieldCheckbox,
    FieldCountry,
    FieldCurrency,
    FieldDatePicker,
    FieldDatetimePicker,
    FieldNumber,
    FieldPhone,
    FieldText,
    FieldTextEditor,
    FieldTimePicker,
    FieldUpload,
} from '@imbrace/ui';
import type { CountryCode } from 'libphonenumber-js';
import React from 'react';

export interface SampleFieldRenderArgs {
    /** Field type string (SchemaFieldType / API.FieldType — kept loose so both forms can reuse this). */
    type: string;
    value: string;
    disabled: boolean;
    label: string;
    onChange: (next: string) => void;
}

// Parse stored JSON into the AttachmentValue shape FieldUpload expects.
// Stored files only have { name, url } — no extra.file — so createObjectURL is never called.
const parseStoredAttachments = (raw: string): any[] => {
    try {
        const parsed = JSON.parse(raw || '[]');
        if (Array.isArray(parsed)) {
            return parsed.map((f: any) => ({
                id: f.id || f.name || 'attachment',
                data: { name: f.name ?? '', url: f.url ?? '' },
                status: 'ok' as const,
            }));
        }
    } catch { /* ignore */ }
    return [];
};

// Keeps File objects in local state so FieldUpload never receives parsed JSON objects
// (which would crash URL.createObjectURL). Initialized from `value` on mount only —
// no useEffect sync so fresh uploads are never overwritten by the serialized value.
const AttachmentSampleInput = ({ value, disabled, label, onChange }: SampleFieldRenderArgs) => {
    const [localFiles, setLocalFiles] = React.useState<any[]>(() => parseStoredAttachments(value));

    return (
        <FieldUpload
            fullWidth
            multiple
            label={label}
            disabled={disabled}
            type="input"
            value={localFiles}
            onChange={(files) => {
                const next = files ?? [];
                setLocalFiles(next);
                const info = next.map((f: any) => ({ name: f.data?.name || f.name, url: f.data?.url ?? '' }));
                onChange(info.length > 0 ? JSON.stringify(info) : '');
            }}
        />
    );
};

/**
 * Renders a type-appropriate "sample data" input for a board field / schema attribute.
 * Shared by the document-models schema editor (BoardSchema/AttributeModal) and the
 * Databoards document-AI field form (ManageFields/operationFieldForm).
 */
export const renderSampleDataField = ({ type, value, disabled, label, onChange }: SampleFieldRenderArgs) => {
    switch (type) {
        case 'Number':
            return (
                <FieldNumber
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={value}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                />
            );
        case 'Date':
            return (
                <FieldDatePicker
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={value || null}
                    onChange={(d) => onChange(d ? d.toISOString().slice(0, 10) : '')}
                />
            );
        case 'Datetime':
            return (
                <FieldDatetimePicker
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={value || null}
                    onChange={(d) => onChange(d ? d.toISOString() : '')}
                />
            );
        case 'Time':
            return (
                <FieldTimePicker
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={value || null}
                    onChange={(d) => onChange(d ? d.toISOString() : '')}
                />
            );
        case 'RichText':
            return (
                <FieldTextEditor
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={{ content: value }}
                    onChange={(v) =>
                        onChange(
                            v && typeof v === 'object' && 'content' in v ? String((v as { content?: string }).content ?? '') : '',
                        )
                    }
                />
            );
        case 'Rating': {
            const num = value === '' ? '' : Number(value);
            return (
                <FieldNumber
                    fullWidth
                    label={label}
                    disabled={disabled}
                    inputProps={{ min: 0, max: 5, step: 0.5 }}
                    value={Number.isFinite(num as number) ? value : ''}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                />
            );
        }
        case 'Attachment':
            return <AttachmentSampleInput type={type} value={value} disabled={disabled} label={label} onChange={onChange} />;
        case 'Assignee':
        case 'MultipleAssignee':
            // Assignee picker requires a user list / org scope — not available in the
            // modal context. Sample data stores the user id(s) as a free-form string.
            return (
                <FieldText
                    fullWidth
                    label={label}
                    disabled={disabled}
                    placeholder={
                        type === 'MultipleAssignee'
                            ? 'user-id-1, user-id-2'
                            : 'user-id'
                    }
                    value={value}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                />
            );
        case 'TableInTable':
        case 'MapToBoard':
        case 'Formula':
            // Table / mapping / formula need richer dedicated editors (table builder,
            // board picker, expression input). Until those land, keep a JSON / text input.
            return (
                <FieldText
                    fullWidth
                    multiline
                    minRows={3}
                    label={label}
                    disabled={disabled}
                    placeholder={
                        type === 'TableInTable'
                            ? '[{"Qty":1,"Item":"Dinner Set","Price":110}]'
                            : type === 'MapToBoard'
                              ? 'board-id'
                              : 'expression'
                    }
                    value={value}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                />
            );
        case 'Country':
            return (
                <FieldCountry
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={value}
                    onChange={(v) => onChange(v ?? '')}
                />
            );
        case 'Checkbox':
            return (
                <FieldCheckbox
                    disabled={disabled}
                    checked={value === 'true'}
                    onChange={(checked) => onChange(checked ? 'true' : 'false')}
                />
            );
        case 'Phone': {
            let phoneVal: { country_code: CountryCode; phone: string } | undefined;
            try {
                const p = value ? JSON.parse(value) : undefined;
                if (p && typeof p === 'object' && 'country_code' in p && p.country_code) {
                    phoneVal = { country_code: p.country_code, phone: p.phone ?? '' };
                }
            } catch {
                phoneVal = undefined;
            }
            return (
                <FieldPhone
                    fullWidth
                    disabled={disabled}
                    value={phoneVal}
                    defaultCountryCode={'US' as CountryCode}
                    onChange={(v) => onChange(v ? JSON.stringify(v) : '')}
                    sx={{ minWidth: 'auto' }}
                    formControlSx={{ width: '100%', minWidth: 'auto' }}
                />
            );
        }
        case 'Currency': {
            let parsed: { currency_code?: string; amounts?: number } | undefined;
            try {
                parsed = value ? JSON.parse(value) : undefined;
            } catch {
                parsed = undefined;
            }
            return (
                <FieldCurrency
                    fullWidth
                    label={label}
                    disabled={disabled}
                    value={parsed ?? undefined}
                    onChange={(v) => onChange(v ? JSON.stringify(v) : '')}
                />
            );
        }
        case 'Email':
        case 'Link':
        case 'ShortText':
        case 'LongText':
        case 'Notes':
        default:
            return (
                <FieldText
                    fullWidth
                    label={label || undefined}
                    disabled={disabled}
                    multiline={type === 'LongText' || type === 'Notes'}
                    minRows={type === 'LongText' || type === 'Notes' ? 2 : undefined}
                    value={value}
                    onChange={(e) => onChange((e.target as HTMLInputElement).value)}
                />
            );
    }
};
