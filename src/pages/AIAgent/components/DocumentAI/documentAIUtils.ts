import type { LinkedSchema, SchemaAttribute } from './type';

// Auto-generate sample data based on field type
export const getSampleDataForType = (type: string): string => {
    switch (type) {
        case 'ShortText':
            return 'Sample Text';
        case 'LongText':
            return 'This is a longer sample description...';
        case 'Number':
            return '1000';
        case 'Currency':
            return '$1,500.00';
        case 'Date':
            return '2026-01-15';
        case 'Time':
            return '14:30';
        case 'Datetime':
            return '2026-01-15 14:30';
        case 'Email':
            return 'user@example.com';
        case 'Phone':
            return '+1 555 123 4567';
        case 'Link':
            return 'https://example.com';
        case 'SingleSelection':
            return 'Option A';
        case 'MultipleSelection':
            return 'Tag1, Tag2';
        case 'Checkbox':
            return 'true';
        case 'Country':
            return 'US';
        case 'Priority':
            return 'High';
        case 'Assignee':
            return 'John Doe';
        case 'MultipleAssignee':
            return 'John, Jane';
        case 'Attachment':
            return 'document.pdf';
        case 'Notes':
            return 'Sample note';
        case 'Origin':
            return 'Facebook';
        case 'RichText':
            return 'Formatted text content';
        default:
            return '';
    }
};

let localIdCounter = 0;
export const createLocalId = (prefix = 'ls'): string => {
    localIdCounter += 1;
    return `${prefix}_${Date.now()}_${localIdCounter}`;
};

// Default data board name follows "[model name] Records"
export const defaultDataBoardName = (modelName: string): string => `${modelName?.trim() || 'Document'} Records`;

// True when `name` collides with an existing Data Board (excluding the model's own
// board, by id) or with another linked model in the same agent (by index). Trimmed +
// case-insensitive. Shared by the Linkage UI (warning + Save block) and the agent
// submit guard so both apply the exact same rule.
export const isBoardNameTaken = (
    name: string,
    params: {
        existingBoards?: Array<{ id?: string; _id?: string; name?: string }>;
        linkedSchemas?: Array<{ data_board_name?: string }>;
        excludeBoardId?: string;
        excludeIndex?: number;
    },
): boolean => {
    const target = (name || '').trim().toLowerCase();
    if (!target) return false;
    const { existingBoards = [], linkedSchemas = [], excludeBoardId, excludeIndex } = params;
    const hitExisting = existingBoards.some(
        (b) => (b.id || b._id) !== excludeBoardId && (b.name || '').trim().toLowerCase() === target,
    );
    if (hitExisting) return true;
    return linkedSchemas.some(
        (s, i) => i !== excludeIndex && (s.data_board_name || '').trim().toLowerCase() === target,
    );
};

export const emptyAttribute = (): SchemaAttribute => ({
    field_id: '',
    field_name: '',
    type: '',
    description: '',
    sample_data: '',
    sub_fields: [],
});

export const createEmptyLinkedSchema = (overrides?: Partial<LinkedSchema>): LinkedSchema => {
    const modelName = overrides?.model_name ?? '';
    return {
        local_id: createLocalId(),
        model_name: modelName,
        board_id: '',
        data_board_name: overrides?.data_board_name ?? defaultDataBoardName(modelName),
        category: overrides?.category ?? '',
        deployment_access: overrides?.deployment_access ?? 'all_teams',
        board_category_id: overrides?.board_category_id ?? '',
        source: overrides?.source ?? 'manual',
        is_existing: overrides?.is_existing ?? false,
        fields: overrides?.fields ?? [emptyAttribute()],
        ...overrides,
    };
};

// Map a raw board (from API) into board fields -> schema attributes
export const boardFieldsToAttributes = (boardFields: any[] = []): SchemaAttribute[] =>
    boardFields.map((bf: any) => {
        const subFields =
            bf.type === 'TableInTable' && (bf.child_board_fields?.length || bf.fields?.length)
                ? (bf.child_board_fields || bf.fields).map((sf: any) => ({
                      field_id: sf._id || '',
                      field_name: sf.name || '',
                      type: sf.type || '',
                  }))
                : [];
        const sampleData =
            bf.type === 'TableInTable' && subFields.length ? '3 Items' : getSampleDataForType(bf.type || '');
        return {
            field_id: bf._id || '',
            field_name: bf.name || '',
            type: bf.type || '',
            description: bf.description || '',
            sample_data: sampleData,
            sub_fields: subFields,
        };
    });

// Map SchemaAttribute -> Doc Schema API attribute (POST/PUT /api/schemas).
// `description` in the UI is the AI extraction prompt; the BE field is `extractionPrompt`.
// TableInTable sub_fields are passed via `settings.sub_fields` since the BE attribute
// shape doesn't include a top-level `sub_fields` array.
export const attributesToDocSchemaPayload = (attributes: SchemaAttribute[] = []) =>
    attributes
        .filter((f) => f.field_name.trim() !== '')
        .map((field) => {
            const base: any = {
                name: field.field_name.trim(),
                type: field.type,
                extractionPrompt: field.description || '',
                sampleData: field.sample_data || '',
            };
            if (field.type === 'TableInTable' && field.sub_fields?.length) {
                base.settings = {
                    sub_fields: field.sub_fields
                        .filter((sf) => sf.field_name.trim() !== '')
                        .map((sf) => ({ name: sf.field_name.trim(), type: sf.type })),
                };
            }
            return base;
        });

// Walk the categories tree returned by GET /api/schema/categories and produce
// flat {text, value} options. `text` shows the full path ("Finance / Invoices")
// so users can disambiguate same-named categories under different parents.
export const flattenCategoryTree = (
    nodes: any[] = [],
    parentPath = '',
): { text: string; value: string }[] => {
    const out: { text: string; value: string }[] = [];
    for (const node of nodes) {
        const id = node?.id || node?._id;
        const name = node?.name || '';
        if (!id || !name) continue;
        const path = parentPath ? `${parentPath} / ${name}` : name;
        out.push({ text: path, value: id });
        if (Array.isArray(node?.subCategories) && node.subCategories.length) {
            out.push(...flattenCategoryTree(node.subCategories, path));
        }
    }
    return out;
};

// Collect every descendant id (inclusive) under a category node — used to filter
// schemas that belong to a top-level tab's subtree.
export const collectCategoryDescendantIds = (node: any): string[] => {
    if (!node) return [];
    const id = node?.id || node?._id;
    const ids = id ? [id] : [];
    if (Array.isArray(node?.subCategories)) {
        for (const child of node.subCategories) {
            ids.push(...collectCategoryDescendantIds(child));
        }
    }
    return ids;
};

// Inverse of attributesToDocSchemaPayload — map Doc Schema API attributes back
// into the SchemaAttribute shape consumed by the form UI.
export const docSchemaAttributesToFields = (attributes: any[] = []): SchemaAttribute[] =>
    (attributes || []).map((attr: any) => {
        const type = attr?.type || '';
        const settingsSub = Array.isArray(attr?.settings?.sub_fields) ? attr.settings.sub_fields : null;
        const sub_fields =
            type === 'TableInTable' && settingsSub
                ? settingsSub.map((sf: any) => ({
                      field_id: sf?.id || sf?._id || '',
                      field_name: sf?.name || sf?.field_name || '',
                      type: sf?.type || '',
                  }))
                : [];
        const sample_data =
            attr?.sampleData ??
            attr?.sample_data ??
            (type === 'TableInTable' && sub_fields.length ? `${sub_fields.length} Items` : getSampleDataForType(type));
        return {
            field_id: attr?.id || attr?._id || '',
            field_name: attr?.name || '',
            type,
            description: attr?.extractionPrompt || attr?.description || '',
            sample_data,
            sub_fields,
        };
    });

// Transform schema attributes into board fields payload
export const attributesToBoardFields = (attributes: SchemaAttribute[] = []) =>
    attributes
        .filter((f) => f.field_name.trim() !== '')
        .map((field, index) => {
            const boardField: any = {
                name: field.field_name,
                type: field.type,
                description: field.description || '',
                is_unique_identifier: false,
                is_default: false,
                hidden: false,
                hidden_on_record: false,
                is_identifier: index === 0,
                data: [],
                _id: '',
                board_child_mapped: '',
            };
            if (field.type === 'TableInTable' && field.sub_fields?.length) {
                boardField.fields = field.sub_fields
                    .filter((sf) => sf.field_name.trim() !== '')
                    .map((sf) => ({
                        name: sf.field_name,
                        type: sf.type,
                        is_default: false,
                        hidden: false,
                        settings: {},
                        field_id: '',
                    }));
            }
            return boardField;
        });
