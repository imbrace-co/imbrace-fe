export interface SchemaSubField {
    field_id?: string;
    field_name: string;
    type: string;
}

// A single attribute in a Document Model schema.
// field_name = Attribute Name, type = AI Logic, description = Extraction Prompt
export interface SchemaAttribute {
    field_id?: string;
    field_name: string;
    type: string;
    description?: string;
    sample_data?: string;
    sub_fields?: SchemaSubField[];
    // UI-only marker: true for attributes that already existed when an existing
    // Document Model is opened for inline edit. Their AI Logic (type) is locked
    // because changing it would break the synced Data Board columns. Newly-added
    // attributes have no marker, so their type stays editable. Stripped on save.
    lock_type?: boolean;
}

// Backwards-compatible alias
export type SchemaField = SchemaAttribute;

export type LinkedSchemaSource = 'auto' | 'list' | 'manual';

// The sub-views inside the Linkage step. Lifted here so the wizard footer (in
// DocumentAIItemDetail) can drive "back" navigation between them.
export type LinkageView = 'overview' | 'choose' | 'auto-upload' | 'detected' | 'select-list' | 'editing';

// A Document Model schema linked to a Document AI agent.
// Each linked schema is backed by its own Data Board.
export interface LinkedSchema {
    local_id: string;
    // Persisted Document Schema id (returned by POST /api/schemas) — present for
    // manually-built schemas that have been saved to the backend.
    schema_id?: string;
    model_name: string;
    board_id?: string;
    data_board_name: string;
    category?: string;
    deployment_access: string;
    // ---- Data Board settings (distinct from the Document Model above) ----
    // The board's own category (a `type:'databoard'` category leaf id). Empty = let the
    // backend fall back to the auto-created "Doc Agent" board category.
    board_category_id?: string;
    source: LinkedSchemaSource;
    // true when an existing model was linked as-is (board already exists, don't recreate)
    is_existing: boolean;
    fields: SchemaAttribute[];
}

export interface SampleFile {
    file_id: string;
    file_name: string;
    file_size?: number;
    file_type?: string;
    url?: string;
}

// A document model returned by AI auto-detection that matches an existing model
export interface DetectedModelMatch {
    board_id: string;
    model_name: string;
    match_percentage: number;
    fields: SchemaAttribute[];
}

interface DocumentAIItem {
    document_ai_config_id: string;
    name: string;
    vlm_model: string;
    vlm_provider_id?: string;
    llm_model: string;
    llm_provider_id?: string;
    description?: string;
    role_and_core_task?: string;
    source_languages: string[];
    handwriting_support: boolean;
    linked_schemas?: LinkedSchema[];
    sample_files?: SampleFile[];
    org_id: string;
    created_at: string;
    updated_at: string;
}

export default DocumentAIItem;
