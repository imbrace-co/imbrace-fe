import { z } from 'zod';
import type { TFunction } from 'i18next';
import { AttachmentSchema } from '@/utils/schema';
export const supportedFileTypes = [
    'text/x-c',
    'text/x-c++',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/html',
    'text/x-java',
    'application/json',
    'text/markdown',
    'application/pdf',
    'text/x-php',
    'text/php',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/x-python',
    'text/x-script.python',
    'text/x-ruby',
    'text/x-tex',
    'text/plain',
    '.tex',
    '.md',
    'text/csv',
];

export const supportedFileExtensions = [
    'c',
    'cpp',
    'docx',
    'html',
    'java',
    'json',
    'md',
    'pdf',
    'php',
    'pptx',
    'py',
    'rb',
    'tex',
    'txt',
    'csv',
];

// Vibe Coding skill (tool) configuration
export type VibeCodingTool = {
    disabled?: boolean;
    description?: string;
};

export type VibeCodingConfig = {
    enabled?: boolean;
    skill_rules_override?: string;
    [key: string]: VibeCodingTool | boolean | string | undefined;
};

// Keys are dynamic (per available tool), so keep the zod schema permissive.
export const vibeCodingSchema = z.record(z.any());

// Keys inside `metadata.vibe_coding` that should NOT be shown as editable skills:
// - `enabled` / `skill_rules_override` are config, not tools
// - `list_databoard_skills` / `read_databoard_skill` are intentionally hidden from the UI
export const VIBE_CODING_NON_TOOL_KEYS = [
    'enabled',
    'skill_rules_override',
    'list_databoard_skills',
    'read_databoard_skill',
];

// Default `metadata.vibe_coding` used when the assistant has none.
export const DEFAULT_VIBE_CODING: VibeCodingConfig = {
    create_board: {
        disabled: false,
        description:
            'Create a new databoard with fields. Field names MUST be lowercase_with_underscores. Board name must be unique (retry with a different name on conflict).',
    },
    update_board_schema: {
        disabled: false,
        description:
            'Update board schema. Add new fields or update existing fields on a board (PUT /v1/board/:id/multiple_board_fields). Entries with no field_id are new fields; entries with field_id update the named field.',
    },
    get_board: {
        disabled: false,
        description:
            'List all boards with optional filters. Filters: hidden, is_default, types (General, System, KnowledgeHub). Use "get_board_details" to retrieve a single board\'s full schema including fields.',
    },
    get_board_details: {
        disabled: false,
        description:
            'Get a single board\'s full schema by ID, including all field definitions (name, type, data, settings, is_default, is_identifier, etc.). Use this to inspect the board schema before creating or updating records.',
    },
    delete_board: {
        disabled: false,
        description: 'Delete a board by ID. This action is irreversible.',
    },
    get_board_items: {
        disabled: false,
        description:
            "List rows (board_items) inside a board AND return their field values. THIS IS THE ONLY TOOL YOU NEED TO READ ALL ROWS OF A BOARD. The response already contains every row's full field values — DO NOT loop and call get_board_item per row afterwards. Use limit (max 100) + skip to paginate large boards. Supports filter (object keyed by board_field_id), sort (e.g. '-created_at'), and convenience filters (phone, email). Call get_board_details first only if you need field IDs for filtering.",
    },
    get_board_item: {
        disabled: false,
        description:
            'Get the RAW record for a SINGLE board_item by ID (includes full field metadata, not just values). ⛔ DO NOT call this in a loop to read many rows — use get_board_items instead, which already returns every row\'s values. Only use this tool when: (1) the user gave you a specific board_item_id and asks to inspect that one row, OR (2) you need raw field metadata (`field._id`, `field.contact_field`, etc.) that get_board_items strips out.',
    },
    create_board_item: {
        disabled: false,
        description:
            'Create a single row (board_item) in a board. Field values must reference existing field IDs from get_board_details — using field NAMES will fail. Returns the created item.',
    },
    create_board_items: {
        disabled: false,
        description:
            "Bulk create rows (board_items) in a board. Pass up to 1000 items in a single call. Each item's field values must reference field IDs from get_board_details. Use this when seeding data or importing many records — for one-off inserts use create_board_item.",
    },
    update_board_item: {
        disabled: false,
        description:
            'Update a single board_item (row) by ID. Only the fields included in `data` are changed; omitted fields are left as-is. ⚠️ Note the API quirk: this tool uses `data: [{key, value}]` (key = board_field_id), NOT the `fields: [{board_field_id, value}]` shape used by create_board_item.',
    },
    delete_board_item: {
        disabled: false,
        description:
            'Delete a single board_item (row) by ID. This is irreversible — confirm with the user before calling unless they have already explicitly asked to delete this specific row. For bulk deletion use a different tool (not yet exposed).',
    },
};

export const AIAssistantSchema = (params: { t: TFunction }) => {
    const { t } = params;

    const childNodeSchema = z.object({
        id: z.string().optional(),
        assistant_id: z.string(),
        name: z.string(),
        instructions: z.string(),
        is_new: z.boolean().optional(),
    });

    const multiAgentTeamLeadSchema = z.object({
        assistant_id: z.string().optional(),
        name: z.string(),
    });

    return z
        .object({
            name: z
                .string({ required_error: t('validation_field_required') })
                .min(1, t('validation_field_required'))
                .superRefine((val, ctx) => {
                    if (val.trim().length === 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('validation_field_required'),
                            fatal: true,
                        });
                        return z.NEVER;
                    }
                }),
            description: z
                .string()
                .max(512, t('error_field_maxlength', { length: 512 }))
                .optional()
                .superRefine((val, ctx) => {
                    if (val && val.trim().length === 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('validation_field_required'),
                            fatal: true,
                        });
                        return z.NEVER;
                    }
                }),
            mode: z.enum(['standard', 'advanced'], { required_error: t('validation_field_required') }),
            model: z.string().optional(),
            model_id: z.string().optional(),
            provider_id: z.string().optional(),
            show_thinking_process: z.boolean().optional(),
            streaming: z.boolean(),
            instructions: z
                .string({
                    required_error: t('validation_field_required'),
                })
                .optional(),
            channel: z.string().optional(),
            channel_id: z.string().optional(),
            teams: z.union([z.string(), z.array(z.string())]).optional(),
            categories: z.array(z.number()).optional(),
            personality_and_role: z.string().optional(),
            core_task: z.string().optional(),
            agent_type: z.string(),
            sub_agents: z.array(childNodeSchema).optional(),
            team_leads: z.array(multiAgentTeamLeadSchema).optional(),
            is_orchestrator: z.boolean(),
            preload_information: z.string().optional(),
            tone_and_style: z.string().optional(),
            response_length: z.string().optional(),
            list_of_banned_words: z.string().optional(),
            other_requirements: z
                .array(
                    z.object({
                        author_avatar: z.string(),
                        author_name: z.string(),
                        message: z.string(),
                        updated_at: z.string(),
                    }),
                )
                .optional(),
            files: AttachmentSchema.optional(),
            selected_board_id: z.string().optional(),
            folder_ids: z.array(z.string()).optional(),
            default_folder_id: z.string().optional(),
            board_ids: z.array(z.string()).optional(),
            knowledge_hubs: z.array(z.string()).optional(),
            workflow_functions: z
                .array(
                    z.object({
                        name: z.string(),
                        description: z.string(),
                        id: z.union([z.string(), z.number()]),
                    }),
                )
                .optional(),
            temperature: z.number().min(0.1).max(2).optional(),
            use_memory: z.boolean().optional(),
            tool_server: z.union([
                z.object({
                    url: z.string(),
                    path: z.string(),
                    auth_type: z.enum(['bearer', 'session']),
                    type: z.enum(['openapi', 'mcp']).optional(),
                    key: z.string().default(''),
                    enabled: z.boolean().default(true),
                    // Tool whitelist (operationIds) picked in the MCP-config tool picker.
                    // null/absent = legacy: the executor loads every safe tool; ops flagged
                    // x-destructive stay off unless explicitly whitelisted. Declared here so
                    // zod parsing doesn't strip the field on submit.
                    enabled_tools: z.array(z.string()).nullable().optional(),
                }).optional(),
                z.null(),
            ]).optional(),
            // Multiple tool servers (new). `tool_server` above is kept as the
            // legacy single-server shape; the form normalizes both into this array.
            tool_servers: z
                .array(
                    z.object({
                        url: z.string(),
                        path: z.string().optional(),
                        auth_type: z.enum(['bearer', 'session']).optional(),
                        type: z.enum(['openapi', 'mcp']).optional(),
                        key: z.string().default(''),
                        enabled: z.boolean().default(true),
                        enabled_tools: z.array(z.string()).nullable().optional(),
                    }),
                )
                .optional(),
            enable_echart: z.boolean().optional(),
            vibe_coding: vibeCodingSchema.optional(),
            top_k_relevant_results: z.number().min(1).max(20).optional(),
            top_k: z.number().min(1).max(100).optional(),
            max_steps: z.number().min(1).max(50).optional(),
            vibe_code: z.boolean().optional(),
        })
        .refine((data) => data.model === 'rag' || (data.instructions && data.instructions.trim().length > 0), {
            path: ['instructions'],
            message: t('validation_field_required'),
        });
};

// Type definitions
export type AIAssistantType = z.infer<ReturnType<typeof AIAssistantSchema>>;

export interface OpenAIAssistant {
    id: string;
    name: string;
    created_at: number;
    description: string | null;
    model: string;
    model_id?: string;
    show_thinking_process?: boolean;
    streaming?: boolean;
    instructions: string;
    file_ids: string[];
    metadata: Record<string, any>;
    channel: string;
    category: string[];
    personality_role: string;
    core_task: string;
    preload_information?: string;
    tone_and_style: string;
    response_length: string;
    banned_words: string;
    other_requirements: { author_avatar: string; author_name: string; message: string; updated_at: string }[];
    knowledge_hubs: string[];
    mode: string;
    workflow_name?: string;
}

export interface OpenAIFile {
    id: string;
    filename: string;
    bytes: number;
    created_at: number;
    object: string;
    purpose: string;
    status?: string;
    status_details?: object | null;
}

export interface RAGFile {
    _id: string;
    id: string;
    organization_id: string;
    assistant_id: string;
    file_name: string;
    file_size: number;
    file_type: string;
    board_id: string;
    boarditem_id: string;
    url: string;
    file_id: string;
    updated_at: string;
    created_at: string;
    deleted_at: string | null;
    // Legacy properties for backward compatibility
    source?: string;
    blobType?: string;
    org_id?: string;
    bytes?: number;
    filename?: string;
}

export interface ChannelCountType {
    all: number;
    whatsapp: number;
    web: number;
    instagram: number;
    facebook: number;
    store: number;
    wechat: number;
    email: number;
}
