import { Button, Checkbox, FieldSelect, FieldText, Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { Divider, Typography as MuiTypography } from '@mui/material';
import { getCountryForTimezone } from 'countries-and-timezones';
import type { TFunction } from 'i18next';
import { getParamByISO } from 'iso-country-currency';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';
import { z } from 'zod';

import { renderSampleDataField } from '@/components/FieldSampleData';
import { TableInTableSample, TableInTableStructure, type TITColumn } from '@/components/TableInTableEditor';
import { useNotify } from '@/contexts/SnackbarContext';
import { FieldTypes, FieldTypesOptions } from '@/pages/Databoards/utils';

import FieldExtraOptions from './fieldExtraOptions';
import styles from './index.module.scss';
import apiFetch from '@/services/axios/handler';
import { getBoards } from '@/services/api/crm';

const aiLabelSx = { fontSize: 14, fontWeight: 800, mb: 0.5, color: 'var(--color-light-7)' };
const aiDividerStyle: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid var(--color-light-4)',
    margin: 0,
};

// Walk RHF errors to the first leaf with a message so we can focus it on a failed submit.
const findFirstErrorPath = (errors: Record<string, unknown>, prefix = ''): string | null => {
    for (const key of Object.keys(errors)) {
        const node = (errors as Record<string, unknown>)[key] as Record<string, unknown> | undefined;
        if (!node) continue;
        const path = prefix ? `${prefix}.${key}` : key;
        if ('message' in node && typeof node.message === 'string' && node.message) return path;
        if ('type' in node && typeof node.type === 'string') return path;
        if (typeof node === 'object') {
            const nested = findFirstErrorPath(node as Record<string, unknown>, path);
            if (nested) return nested;
        }
    }
    return null;
};

export const FieldSchema = ({
    t,
    existFields,
    checkDuplicate = true,
    inlineTableInTable = false,
}: {
    t: TFunction<'translation', undefined>;
    existFields?: API.BoardField[];
    checkDuplicate?: boolean;
    /** Document-AI layout: TableInTable columns live inline in settings.columns, so the
     *  legacy child-board fields / child_board_name are not required. */
    inlineTableInTable?: boolean;
}) =>
    z.object({
        description: z
            .string()
            .max(
                1000,
                t('validation_input_description_maxlength', {
                    max: 1000,
                }),
            )
            .optional(),
        type: z.enum(FieldTypes, {
            required_error: t('validation_field_required'),
        }),
        // Visibility — bound to the "Show on Data board" / "Show when creating record" checkboxes.
        hidden: z.boolean().optional(),
        hidden_on_record: z.boolean().optional(),
        board_child_mapped: z.string().optional(),
        name: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
            if (!val || val.length < 1 || val.trim().length <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                });

                return z.NEVER;
            }

            if (checkDuplicate) {
                const uniqueValues = new Map<string, number>();
                existFields?.forEach((field, idx) => {
                    uniqueValues.set(field.name.toLocaleLowerCase(), idx);
                });
                const firstAppearanceIndex = uniqueValues.get(val.toLocaleLowerCase());
                if (firstAppearanceIndex !== undefined) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: t('error_field_name_exists'),
                        fatal: true,
                    });
                    return z.NEVER;
                }
            }
        }),
        data: z
            .tuple([
                z.object({
                    value: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
                        if (!val || val.length < 1 || val.trim().length <= 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });

                            return z.NEVER;
                        }
                    }),
                }),
            ])
            .rest(
                z.object({
                    value: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
                        if (!val || val.length < 1 || val.trim().length <= 0) {
                            ctx.addIssue({
                                code: z.ZodIssueCode.custom,
                                message: t('validation_field_required'),
                                fatal: true,
                            });

                            return z.NEVER;
                        }
                    }),
                }),
            )
            .optional()
            .superRefine((items, ctx) => {
                const uniqueValues = new Map<string, number>();
                items?.forEach((item, idx) => {
                    const lowerCaseValue = item.value.toLowerCase().trim();
                    const firstAppearanceIndex = uniqueValues.get(lowerCaseValue);
                    if (firstAppearanceIndex !== undefined) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('fields_management_form_duplicate_option'),
                            path: [idx, 'value'],
                        });
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('fields_management_form_duplicate_option'),
                            path: [firstAppearanceIndex, 'value'],
                        });
                        return;
                    }
                    uniqueValues.set(lowerCaseValue, idx);
                });
            }),
        settings: z.record(z.string(), z.string().or(z.boolean()).or(z.number()).optional()).optional(),
        fields: z
            .array(
                z.object({
                    name: z.string(),
                    type: z.string(),
                    hidden: z.boolean().optional(),
                    settings: z.record(z.string(), z.any()).optional(),
                    is_default: z.boolean().optional(),
                    field_id: z.string().optional(),
                    _id: z.string().optional(),
                }).passthrough(),
            )
            .optional(),
        tit_mode: z.enum(['manual', 'link']).optional(),
        child_board_name: z.string().optional(),
    }).superRefine((data, ctx) => {
        // Nested fields only required when TableInTable is in Manual mode (legacy child-board flow).
        // The document-AI layout edits columns inline (settings.columns), so skip this entirely.
        if (!inlineTableInTable && data.type === 'TableInTable' && data.tit_mode !== 'link') {
            if (!data.fields || data.fields.length < 1) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    path: ['fields'],
                });
            }
            if (!data.child_board_name || data.child_board_name.trim().length === 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    path: ['child_board_name'],
                });
            }
        }
    });

export type FieldType = z.infer<ReturnType<typeof FieldSchema>>;

const OperationFieldForm = ({
    methods,
    boardField,
    boardType,
    boardName,
    ManageFieldsComponent,
    isNested,
    isDocumentAIRoute,
    onTableInTableSelected,
    onDelete,
}: {
    methods: UseFormReturn<FieldType, any>;
    boardField?: API.BoardField;
    boardType?: API.BoardType;
    boardName?: string;
    ManageFieldsComponent?: React.ComponentType<any>;
    isNested?: boolean;
    isDocumentAIRoute?: boolean;
    onTableInTableSelected?: (payload: { name: string; description?: string }) => void;
    /** Edit-mode only: triggers the field delete flow from the in-body footer. */
    onDelete?: () => void;
}) => {
    const { control, setValue, getValues } = methods;
    const { notify } = useNotify();

    // SAVE for the AI (document-models style) layout: validate, then click the dialog's
    // hidden confirm button (same trick FieldFormFooter uses) so the existing onConfirm runs.
    const handleAiSave = (e: React.MouseEvent) => {
        methods.handleSubmit(
            () => {
                const selector = isNested ? '.hidden-confirm-btn-child' : '.hidden-confirm-btn-parent';
                const all = Array.from(document.querySelectorAll<HTMLButtonElement>(selector));
                const enabled = all.filter((b) => !b.disabled);
                const btn = enabled[enabled.length - 1] ?? all[all.length - 1] ?? null;
                btn?.click();
            },
            (errors) => {
                const firstPath = findFirstErrorPath(errors as Record<string, unknown>);
                if (firstPath) {
                    try {
                        methods.setFocus(firstPath as never);
                    } catch {
                        // setFocus throws for some nested paths — ignore.
                    }
                }
                notify({ type: 'error', message: t('fields_management_form_validation_failed') });
            },
        )(e);
    };
    const fieldType = useWatch({ control, name: 'type' });
    const boardChildMapped = useWatch({ control, name: 'board_child_mapped' });
    const titMode = useWatch({ control, name: 'tit_mode' as any });
    const fieldName = useWatch({ control, name: 'name' });
    const childBoardName = useWatch({ control, name: 'child_board_name' as any });
    const childBoardNameTouchedRef = useRef(false);
    const prevFieldTypeRef = useRef<string | undefined>(boardField?.type);


    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const [showDescription, setShowDescription] = useState(false);
    const fieldDescLimit = 1000;
    const [fieldDescLength, setFieldDescLength] = useState(boardField?.description?.length || 0);

    const typeOptions = useMemo(() => {
        let options = FieldTypesOptions(t, isDocumentAIRoute);

        if (boardField?.type === 'RichText') {
            options = [
                ...options,
                {
                    value: 'RichText',
                    text: t('field_rich_text'),
                    icon: <Icon name="richText" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                },
            ];
        }

        // Filter out TableInTable when in nested context
        if (isNested) {
            options = options.filter(option => option.value !== 'TableInTable');
        }

        return options;
    }, [t, boardField, isNested, isDocumentAIRoute]);

    useEffect(() => {
        const defaultDataOptions = () => {
            if (fieldType === 'Priority') {
                setValue('data', [{ value: 'Low' }, { value: 'Medium' }, { value: 'High' }, { value: 'Very High' }], {
                    shouldDirty: true,
                    shouldValidate: true,
                });
                return;
            }
            if (fieldType === 'SingleSelection' || fieldType === 'MultipleSelection' || fieldType === 'Origin') {
                setValue('data', [{ value: '' }], {
                    shouldDirty: true,
                    shouldValidate: true,
                });
                return;
            }

            setValue('data', undefined, {
                shouldDirty: true,
                shouldValidate: true,
            });
        };
        if (!boardField) {
            defaultDataOptions();
        } else if (!boardField.data || boardField.data?.length === 0) {
            defaultDataOptions();
        }
    }, [fieldType, setValue, boardField]);

    // Auto-suggest child board name as "{parentBoard} - {fieldName}" while in manual TIT mode,
    // until the user edits the input themselves. (Legacy child-board flow — skipped in the
    // document-AI layout, which uses the inline columns editor instead.)
    useEffect(() => {
        if (isDocumentAIRoute) return;
        if (boardField) return;
        if (fieldType !== 'TableInTable') return;
        if (titMode === 'link') return;
        if (childBoardNameTouchedRef.current) return;
        const suggested = `${boardName ?? ''}${boardName && fieldName ? ' - ' : ''}${fieldName ?? ''}`.trim();
        setValue('child_board_name' as any, suggested, { shouldDirty: false, shouldValidate: true });
    }, [isDocumentAIRoute, boardField, fieldType, titMode, boardName, fieldName, setValue]);

    // Flow 1: when user switches type to TableInTable in create mode, trigger the
    // 2-step chooser (Manual vs Link). Callback owns the dialog transition.
    // Skipped in the document-AI layout, which edits TIT columns inline (no child board).
    useEffect(() => {
        const prev = prevFieldTypeRef.current;
        prevFieldTypeRef.current = fieldType as string | undefined;
        if (isDocumentAIRoute) return;
        if (boardField) return; // edit mode — don't trigger
        if (prev === fieldType) return;
        if (fieldType !== 'TableInTable') return;
        if (titMode) return; // mode already decided (user came back via Manual)
        if (!onTableInTableSelected) return;
        const snapshot = getValues();
        onTableInTableSelected({ name: snapshot.name || '', description: snapshot.description });
    }, [isDocumentAIRoute, fieldType, titMode, boardField, onTableInTableSelected, getValues]);

    // Document-AI TIT (Nested Model): columns are the child board's fields — same handling as
    // the existing TIT flow (form `fields`, hydrated from `child_board_fields` on edit). Seed a
    // single empty column the first time the user picks the type, mirroring /document-models.
    useEffect(() => {
        if (!isDocumentAIRoute) return;
        if (fieldType !== 'TableInTable') return;
        const cols = getValues('fields' as any);
        if (!Array.isArray(cols) || cols.length === 0) {
            setValue('fields' as any, [{ name: '', type: 'ShortText' }], { shouldDirty: false });
        }
    }, [isDocumentAIRoute, fieldType, getValues, setValue]);

    const fetchBoardForMapping = async () => {
        const { data } = await apiFetch<API.PaginatedResponse<API.Board[]>>(
            getBoards.api({
                limit: 0,
                skip: 0,
                sort: '-created_at',
            }),
            getBoards.method,
        );
        return data.data.map((board) => {
            return {
                value: board._id,
                text: board.name,
            };
        });
    };

    useEffect(() => {
        const countryCode = getCountryForTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)?.id ?? 'US';
        if (boardField) {
            if (boardField.description) setShowDescription(true);
            if (fieldType === 'Phone' && !boardField.settings?.default_country_code) {
                setValue('settings.default_country_code', countryCode, {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
            if (fieldType === 'Currency' && !boardField.settings?.default_currency_code) {
                setValue('settings.default_currency_code', getParamByISO(countryCode, 'currency'), {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
        } else if (fieldType === 'Phone') {
            setValue('settings.default_country_code', countryCode, {
                shouldDirty: true,
                shouldValidate: true,
            });
        } else if (fieldType === 'Currency') {
            setValue('settings.default_currency_code', getParamByISO(countryCode, 'currency'), {
                shouldDirty: true,
                shouldValidate: true,
            });
        } else {
            setValue('settings.default_country_code', undefined, {
                shouldDirty: true,
                shouldValidate: true,
            });
        }
    }, [boardField, setValue, fieldType]);

    // Document-models style two-column layout (databoard / DocumentAI fields). CRM /
    // KnowledgeHub keep the original single-column form below.
    const isOptionType =
        fieldType === 'Priority' ||
        fieldType === 'SingleSelection' ||
        fieldType === 'MultipleSelection' ||
        fieldType === 'Origin';
    // Sample Data input (mirrors the /document-models schema editor). Shown once a type is
    // chosen, for every type except option-based (which shows its Options list instead) and
    // TableInTable (which has its dedicated table-structure editor). Persisted as a free-form
    // value under `settings.sampleData`.
    const showSampleData = !!fieldType && !isOptionType && fieldType !== 'TableInTable';
    // Synthetic Record ID row (injected by ManageFields): everything is read-only except the
    // "Show on Data board" checkbox, which maps to the board-level show_id.
    const isSystemRecordId = !!(boardField as any)?.isSystemRecordId;
    if (isDocumentAIRoute) {
        return (
            <SimpleBar
                style={{ width: 'calc(100% + 64px)', margin: '0 -32px', padding: '0 32px', maxHeight: 560, overflow: 'auto' }}
                autoHide
                className={styles.container}
                scrollableNodeProps={{ ref: parentRef }}
            >
                <div style={{ display: 'flex', gap: 34, minHeight: 380 }}>
                    {/* Left column: Attribute Name / AI Logic / Extraction Prompt */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <Controller
                            control={control}
                            name="name"
                            render={({ field, fieldState: { error } }) =>
                                boardField ? (
                                    <Tooltip
                                        title={t('fields_management_form_name_disabled_tooltip')}
                                        disableHoverListener={!boardField?.is_default}
                                        disableFocusListener
                                        placement="top"
                                        arrow
                                    >
                                        <div style={{ width: '100%' }}>
                                            <FieldText
                                                fullWidth
                                                label={t('databoard_attribute_name')}
                                                error={!!error}
                                                helperText={error?.message}
                                                {...field}
                                                disabled={boardField?.is_default}
                                            />
                                        </div>
                                    </Tooltip>
                                ) : (
                                    <FieldText
                                        fullWidth
                                        label={t('databoard_attribute_name')}
                                        error={!!error}
                                        helperText={error?.message}
                                        {...field}
                                    />
                                )
                            }
                        />
                        <Controller
                            name="type"
                            control={control}
                            render={({ field, fieldState: { error } }) => (
                                <FieldSelect
                                    {...field}
                                    label={t('databoard_ai_logic')}
                                    fullWidth
                                    error={!!error}
                                    helperText={error?.message}
                                    placeholder={t('click_to_select')}
                                    queryKey={['newFieldType', isNested]}
                                    request={async () => typeOptions}
                                    disabled={!!boardField}
                                />
                            )}
                        />
                        <Controller
                            control={control}
                            name="description"
                            render={({ field, fieldState: { error } }) => (
                                <FieldText
                                    {...field}
                                    fullWidth
                                    multiline
                                    minRows={8}
                                    label={t('databoard_extraction_prompt')}
                                    placeholder={t('databoard_extraction_prompt')}
                                    error={!!error}
                                    helperText={error?.message}
                                    disabled={isSystemRecordId}
                                    onChange={(e) => {
                                        const c = (e.target as HTMLInputElement).value;
                                        field.onChange(c.length > fieldDescLimit ? c.slice(0, fieldDescLimit) : c);
                                    }}
                                />
                            )}
                        />
                        {/* Nested Model (TableInTable): document-models-style columns editor, but
                            bound to the existing TIT channel — the child board's fields (form `fields`,
                            hydrated from `child_board_fields` on edit). Extra per-field props (id /
                            field_id) ride through untouched so the backend can map existing columns. */}
                        {fieldType === 'TableInTable' && (
                            <Controller
                                control={control}
                                name={'fields' as any}
                                render={({ field }) => (
                                    <TableInTableStructure
                                        columns={(field.value as TITColumn[]) ?? []}
                                        onColumnsChange={(cols) => field.onChange(cols)}
                                        lockExistingColumnTypes
                                    />
                                )}
                            />
                        )}
                    </div>

                    {/* Right column: Sample Data / Role Access / visibility / footer */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        {/* Sample Data / Options — "Options" heading for option types, "Sample Data"
                            for value types once a type is chosen; the empty (no type) state shows
                            just the top rule (matches the design). */}
                        {(isOptionType || showSampleData || fieldType === 'TableInTable') && (
                            <MuiTypography component="label" sx={aiLabelSx}>
                                {isOptionType
                                    ? t('databoard_options', 'Options')
                                    : t('schema_attr_sample_data', 'Sample Data')}
                            </MuiTypography>
                        )}
                        <hr style={{ ...aiDividerStyle, marginTop: isOptionType || showSampleData || fieldType === 'TableInTable' ? 10 : 0 }} />
                        <div style={{ marginTop: 15 }}>
                            {/* Only option types keep a dedicated editor here (their Options list).
                                Every other type mirrors /document-models: just the type-appropriate
                                Sample Data input. Phone/Currency use their rich inputs (which carry an
                                inline country/currency picker), so no separate selector — the required
                                default_country_code / default_currency_code is derived from the sample. */}
                            {isOptionType && (
                                <FieldExtraOptions
                                    boardType={boardType}
                                    boardName={boardName}
                                    containerRef={parentRef}
                                    boardField={boardField}
                                    methods={methods}
                                    numbered
                                />
                            )}
                            {showSampleData && (
                                <Controller
                                    control={control}
                                    name={'settings.sampleData' as any}
                                    render={({ field }) => (
                                        renderSampleDataField({
                                            type: fieldType as string,
                                            value: (field.value as string) ?? '',
                                            disabled: isSystemRecordId,
                                            label: '',
                                            onChange: (next) => {
                                                field.onChange(next);
                                                // Keep the required default in sync with the country/currency
                                                // picked inside the sample input (no separate selector here).
                                                if (!next) return;
                                                try {
                                                    const parsed = JSON.parse(next);
                                                    if (fieldType === 'Currency' && parsed?.currency_code) {
                                                        setValue('settings.default_currency_code' as any, parsed.currency_code, {
                                                            shouldDirty: true,
                                                            shouldValidate: true,
                                                        });
                                                    } else if (fieldType === 'Phone' && parsed?.country_code) {
                                                        setValue('settings.default_country_code' as any, parsed.country_code, {
                                                            shouldDirty: true,
                                                            shouldValidate: true,
                                                        });
                                                    }
                                                } catch { /* sample not JSON yet — ignore */ }
                                            },
                                        })
                                    )}
                                />
                            )}
                            {fieldType === 'TableInTable' && (
                                <Controller
                                    control={control}
                                    name={'settings.sampleData' as any}
                                    render={({ field: sampleField }) => (
                                        <Controller
                                            control={control}
                                            name={'fields' as any}
                                            render={({ field: colsField }) => (
                                                <TableInTableSample
                                                    columns={(colsField.value as TITColumn[]) ?? []}
                                                    sampleData={(sampleField.value as string) ?? ''}
                                                    onColumnsChange={(cols) => colsField.onChange(cols)}
                                                    onSampleDataChange={(next) => sampleField.onChange(next)}
                                                />
                                            )}
                                        />
                                    )}
                                />
                            )}
                        </div>

                        {/* Expanding gap pushes visibility / footer to the bottom. */}
                        <div style={{ flex: 1, minHeight: 24 }} />

                        <hr style={{ ...aiDividerStyle, marginBottom: 24 }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Controller
                                control={control}
                                name={'hidden' as any}
                                render={({ field }) => (
                                    <Checkbox
                                        checked={!field.value}
                                        onChange={(checked) => field.onChange(!checked)}
                                        label={t('databoard_show_on_databoard', 'Show on Data board')}
                                    />
                                )}
                            />
                            {/* Record ID has no per-record create form presence — only the
                                board-level "Show on Data board" (show_id) applies. */}
                            {!isSystemRecordId && (
                                <Controller
                                    control={control}
                                    name={'hidden_on_record' as any}
                                    render={({ field }) => (
                                        <Checkbox
                                            checked={!field.value}
                                            onChange={(checked) => field.onChange(!checked)}
                                            label={t('databoard_show_on_record', 'Show when creating record')}
                                        />
                                    )}
                                />
                            )}
                        </div>

                        <div style={{ height: 24 }} />

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 97 }}>
                            {boardField && onDelete ? (
                                <Button
                                    variant="link"
                                    text={t('delete')}
                                    sx={{
                                        color: '#E53C3C',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        textDecoration: 'underline',
                                        '&:hover': { color: '#E53C3C', textDecoration: 'underline' },
                                    }}
                                    onClick={onDelete}
                                />
                            ) : (
                                <span />
                            )}
                            <Button variant="contained" text={t('save')} onClick={handleAiSave} sx={{ minWidth: 160, height: 40 }} />
                        </div>
                    </div>
                </div>
            </SimpleBar>
        );
    }

    return (
        <SimpleBar
            style={{ width: 'calc(100% + 64px)', margin: '0 -32px', padding: '0 32px', maxHeight: 500, overflow: 'auto' }}
            autoHide
            className={styles.container}
            scrollableNodeProps={{ ref: parentRef }}
        >
            <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
                <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Controller
                        control={control}
                        name="name"
                        render={({ field, fieldState: { error } }) => {
                            return (
                                <>
                                    {!!boardField ? (
                                        <Tooltip
                                            title={t('fields_management_form_name_disabled_tooltip')}
                                            disableHoverListener={!boardField?.is_default}
                                            disableFocusListener
                                            placement="top"
                                            arrow
                                        >
                                            <div style={{ width: '100%' }}>
                                                <FieldText
                                                    fullWidth
                                                    label={`${t(isDocumentAIRoute ? 'databoard_attribute_name' : 'fields_management_form_name')}*`}
                                                    error={!!error}
                                                    helperText={error?.message}
                                                    {...field}
                                                    disabled={boardField?.is_default}
                                                />
                                            </div>
                                        </Tooltip>
                                    ) : (
                                        <FieldText
                                            fullWidth
                                            label={`${t(isDocumentAIRoute ? 'databoard_attribute_name' : 'fields_management_form_name')}*`}
                                            error={!!error}
                                            helperText={error?.message}
                                            {...field}
                                        />
                                    )}
                                </>
                            );
                        }}
                    />
                    {(showDescription || isDocumentAIRoute) && (
                        <Controller
                            control={control}
                            name="description"
                            render={({ field, fieldState: { error } }) => {
                                return (
                                    <div className={styles.fieldDesc}>
                                        <FieldText
                                            {...field}
                                            fullWidth
                                            label={`${t(isDocumentAIRoute ? 'databoard_extraction_prompt' : 'description')}`}
                                            placeholder={t(isDocumentAIRoute ? 'databoard_extraction_prompt' : 'description')}
                                            error={!!error}
                                            helperText={error?.message}
                                            multiline
                                            rows={4}
                                            {...(!isDocumentAIRoute && field.value && {
                                                onReset: () => {
                                                    setValue('description', '', { shouldValidate: true, shouldDirty: true });
                                                    setShowDescription(false);
                                                    setFieldDescLength(0);
                                                },
                                            })}
                                            onChange={(e) => {
                                                const fieldContent = e.target.value;
                                                field.onChange(
                                                    fieldContent.length > fieldDescLimit
                                                        ? fieldContent.slice(0, fieldDescLimit)
                                                        : fieldContent,
                                                );
                                                setFieldDescLength(
                                                    fieldContent.length > fieldDescLimit ? fieldDescLimit : fieldContent?.length,
                                                );
                                            }}
                                        />
                                        <label
                                            className={`${styles.fieldLimit} ${fieldDescLength <= fieldDescLimit ? styles.fieldDescIsLimit : styles.fieldDescOverLimit
                                                }`}
                                        >
                                            {fieldDescLength} / {fieldDescLimit}
                                        </label>
                                    </div>
                                );
                            }}
                        />
                    )}
                    {!showDescription && !isDocumentAIRoute && (
                        <Button
                            variant="link"
                            startIcon={<Icon name="add" fontSize={16} />}
                            size="xxs"
                            sx={{ gap: '4px', fontWeight: 400, fontSize: 12, lineHeight: '15px' }}
                            text={t('field_add_description')}
                            onClick={() => {
                                setShowDescription(true);
                            }}
                        />
                    )}
                </Space>
                <Divider />
                <Controller
                    name="type"
                    control={control}
                    render={({ field, fieldState: { error } }) => (
                        <FieldSelect
                            {...field}
                            label={`${t(isDocumentAIRoute ? 'databoard_ai_logic' : 'fields_management_form_type')}*`}
                            fullWidth
                            error={!!error}
                            helperText={error?.message}
                            placeholder={t('click_to_select')}
                            queryKey={['newFieldType', isNested]}
                            request={async () => {
                                return typeOptions;
                            }}
                            disabled={!!boardField}
                        />
                    )}
                />
                {fieldType === 'TableInTable' && <Typography style={{ color: 'var(--color-secondary-3)', fontSize: '14px' }} >
                    {t('databoard_table_in_table_description')}
                </Typography>}
                <FieldExtraOptions
                    boardType={boardType}
                    boardName={boardName}
                    containerRef={parentRef}
                    boardField={boardField}
                    methods={methods}
                />
                {!boardField && fieldType === 'TableInTable' && titMode !== 'link' && (
                    <Controller
                        name={'child_board_name' as any}
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <FieldText
                                {...field}
                                value={(field.value as string | undefined) ?? ''}
                                onChange={(e) => {
                                    childBoardNameTouchedRef.current = true;
                                    field.onChange(e);
                                }}
                                fullWidth
                                label={`${t('databoard_child_board_name_label')}*`}
                                placeholder={t('databoard_child_board_name_placeholder')}
                                helperText={error?.message || t('databoard_child_board_name_helper')}
                                error={!!error}
                            />
                        )}
                    />
                )}
                {ManageFieldsComponent && fieldType === 'TableInTable' && titMode !== 'link' && (
                    <ManageFieldsComponent
                        formControl={control}
                        reset={() => { }}
                        isEditMode={!!boardField}
                        isNestedContext={true}
                    />
                )}
            </Space>
        </SimpleBar>
    );
};

export default OperationFieldForm;
