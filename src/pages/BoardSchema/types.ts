/** Category namespace — mirrors the backend `type` column (schema | databoard). */
export type SchemaCategoryType = 'schema' | 'databoard';

export interface SchemaCategory {
    _id?: string;
    id: string;
    name: string;
    type?: SchemaCategoryType;
    subCategories: SchemaCategory[];
}

export interface SchemaAgent {
    id: string;
    name: string;
}

export interface SchemaDataboard {
    id: string;
    name: string;
}

export type SchemaFieldType =
    | 'TableInTable'
    | 'ShortText'
    | 'LongText'
    | 'SingleSelection'
    | 'MultipleSelection'
    | 'Number'
    | 'Date'
    | 'Time'
    | 'Email'
    | 'Phone'
    | 'Link'
    | 'Priority'
    | 'Assignee'
    | 'MultipleAssignee'
    | 'RichText'
    | 'Country'
    | 'Datetime'
    | 'Origin'
    | 'Attachment'
    | 'Notes'
    | 'Currency'
    | 'Checkbox'
    | 'MapToBoard'
    | 'Formula'
    | 'Rating';

export interface SchemaAttribute {
    id: string;
    name: string;
    type: SchemaFieldType;
    description?: string;
    isUniqueIdentifier?: boolean;
    isDefault?: boolean;
    isIdentifier?: boolean;
    hidden?: boolean;
    hiddenOnRecord?: boolean;
    defaultFieldName?: string;
    contactField?: string;
    data?: { id?: string; value: string; color?: string; order?: number }[];
    settings?: Record<string, unknown>;
    extractionPrompt?: string;
    sampleData?: string;
    order?: number;
}

export interface SchemaVersion {
    _id: string;
    id: string;
    version: number;
    schema_id: string;
    change_note: string | null;
    diff_summary: string | null;
    created_at: string;
    created_by: string | null;
    created_by_name: string | null;
}

export interface SchemaVersionsResponse {
    data: SchemaVersion[];
    count: number;
    current_version: number;
    limit: number | null;
    skip: number;
}

export interface DocumentSchema {
    _id?: string;
    id: string;
    organization_id?: string;
    name: string;
    /** Read shape (response). */
    category_id?: string | null;
    agent_ids?: string[];
    databoard_ids?: string[];

    /** Write shape (request body — camelCase per spec). */
    category?: string | null;
    agents?: ({ _id?: string; id?: string; name?: string } | string)[];
    databoards?: ({ _id?: string; id?: string; name?: string } | string)[];
    attributes?: SchemaAttribute[];
    created_at?: string;
    updated_at?: string;
}
