import { APWF_API } from '@/services/baseURL';

import type { ApiTestConfig } from './types';

const LIST_TEAMS = '/api/platform/v2/teams?type=business_unit_id';
const LIST_CHANNELS_WEB = '/api/channel-service/v1/channels?type=web';
const LIST_CHANNELS_WA = '/api/channel-service/v1/channels?type=whatsapp';
const LIST_CHANNELS_FB = '/api/channel-service/v1/channels?type=facebook';
const LIST_CONTACTS = '/api/channel-service/v1/contacts?limit=10&skip=0';
const LIST_CAMPAIGNS = '/api/channel-service/v1/campaign';
const LIST_TOUCHPOINTS = '/api/channel-service/v1/touchpoints?sort=-created_at';
const LIST_CONVS = '/api/channel-service/v2/team_conversations?type=business_unit_id&q=&view=all&skip=0&limit=1&channel_types=web';
const LIST_FOLDERS = '/api/data-board/folders?limit=1&skip=0';
const LIST_BOARDS = '/api/data-board/boards?limit=1&skip=0';
const LIST_BOARD_AUTOMATION = '/api/ips/v1/workflowlist';
const LIST_EMAIL_TEMPLATES = '/api/v2/marketplaces/email-templates/search';
const LIST_AI_ASSISTANTS = '/api/ai/v3/accounts/assistants';
const LIST_AI_PROVIDERS = '/api/ai/v3/providers';

const registry: ApiTestConfig[] = [

    // ── ACCOUNT ──────────────────────────────────────────────────
    { id: 'get-account', name: 'Get Account', domain: 'Account', method: 'GET', getUrl: () => '/api/platform/v1/account', safe: true, expectedShape: { id: 'string', email: 'string', role: 'string' } },
    {
        id: 'put-account', name: 'Update Account', domain: 'Account', method: 'PUT', getUrl: () => '/api/platform/v1/account', safe: false,
        sourceGetUrl: '/api/platform/v1/account',
        samplePayload: { display_name: 'Test User', phone_number: '', language: 'en' },
    },
    { id: 'get-login-provider', name: 'Get Login Provider', domain: 'Account', method: 'GET', getUrl: () => '/api/backend/v1/login/providers', safe: true },

    // ── ORGANIZATION ─────────────────────────────────────────────
    {
        id: 'post-org', name: 'Create Organization', domain: 'Organization', method: 'POST', getUrl: () => '/api/platform/v1/organizations', safe: false,
        samplePayload: { name: 'Test Organization' },
    },

    // ── BUSINESS UNIT ─────────────────────────────────────────────
    { id: 'get-business-units', name: 'Get Business Units', domain: 'Business Unit', method: 'GET', getUrl: () => '/api/platform/v1/business_units?limit=10&skip=0', safe: true, expectedShape: { data: 'array', count: 'number' } },

    // ── CHANNELS ──────────────────────────────────────────────────
    { id: 'get-channels-web', name: 'Get Channels (web)', domain: 'Channel', method: 'GET', getUrl: () => LIST_CHANNELS_WEB, safe: true, expectedShape: { data: 'array' } },
    { id: 'get-channels-whatsapp', name: 'Get Channels (whatsapp)', domain: 'Channel', method: 'GET', getUrl: () => LIST_CHANNELS_WA, safe: true },
    { id: 'get-channels-facebook', name: 'Get Channels (facebook)', domain: 'Channel', method: 'GET', getUrl: () => LIST_CHANNELS_FB, safe: true },
    { id: 'get-channels-email', name: 'Get Channels (email)', domain: 'Channel', method: 'GET', getUrl: () => '/api/channel-service/v1/channels?type=email', safe: true },
    { id: 'get-channel-count', name: 'Channel Count', domain: 'Channel', method: 'GET', getUrl: () => '/api/channel-service/v1/channels/_count', safe: true },
    { id: 'get-conv-count', name: 'Conversation Count per Channel', domain: 'Channel', method: 'GET', getUrl: () => '/api/channel-service/v1/channels/_conv_count', safe: true },
    { id: 'get-categories', name: 'Get Template Categories', domain: 'Channel', method: 'GET', getUrl: () => '/api/v1/platform/categories', safe: true },
    {
        id: 'put-channel', name: 'Update Channel', domain: 'Channel', method: 'PUT', getUrl: () => '/api/channel-service/v1/channels/:id', safe: false,
        idSourceUrl: LIST_CHANNELS_WEB, sourceGetUrl: LIST_CHANNELS_WEB,
        samplePayload: { name: 'Updated Channel Name', active: true },
    },
    {
        id: 'post-channel-web', name: 'Create Web Widget Channel', domain: 'Channel', method: 'POST', getUrl: () => '/api/channel-service/v3/channels/_web', safe: false,
        sourceGetUrl: LIST_CHANNELS_WEB,
        samplePayload: { name: 'New Web Widget', description: '', workflow_id: null },
    },
    {
        id: 'post-channel-whatsapp', name: 'Create WhatsApp Channel', domain: 'Channel', method: 'POST', getUrl: () => '/api/channel-service/v3/channels/_whatsapp', safe: false,
        samplePayload: { name: 'New WhatsApp Channel', phone_number: '', provider_token: '' },
    },
    {
        id: 'post-channel-email', name: 'Create Email Channel', domain: 'Channel', method: 'POST', getUrl: () => '/api/channel-service/v1/channels/_email', safe: false,
        samplePayload: { name: 'New Email Channel', email: 'support@example.com' },
    },

    // ── TEAMS ─────────────────────────────────────────────────────
    { id: 'get-teams-v2', name: 'Get Teams', domain: 'Team', method: 'GET', getUrl: () => LIST_TEAMS, safe: true, expectedShape: { data: 'array' } },
    { id: 'get-my-teams', name: 'Get My Teams', domain: 'Team', method: 'GET', getUrl: () => '/api/platform/v2/teams/my', safe: true },
    { id: 'get-team-members-v2', name: 'Get Team Members', domain: 'Team', method: 'GET', getUrl: () => '/api/platform/v2/team_users?type=team_id', safe: true },
    { id: 'get-assignable-teams', name: 'Get Assignable Teams', domain: 'Team', method: 'GET', getUrl: () => '/api/platform/v1/assign/teams/all', safe: true },
    {
        id: 'post-team', name: 'Create Team', domain: 'Team', method: 'POST', getUrl: () => '/api/platform/v1/teams', safe: false,
        sourceGetUrl: LIST_TEAMS,
        samplePayload: { name: 'New Team', mode: 'public', description: 'Team description' },
    },
    {
        id: 'put-team', name: 'Update Team', domain: 'Team', method: 'PUT', getUrl: () => '/api/platform/v2/teams/:id', safe: false,
        // /teams/my returns a flat array of the current user's joined teams (no BU filter needed),
        // so resolveId() will reliably substitute :id with a real team id like t_85b24d6a-…
        idSourceUrl: '/api/platform/v2/teams/my', sourceGetUrl: '/api/platform/v2/teams/my',
        samplePayload: { name: 'Team Tony1', mode: 'grab', icon_url: '' },
    },
    {
        id: 'post-team-users', name: 'Add Team Users', domain: 'Team', method: 'POST', getUrl: () => '/api/platform/v2/teams/_add_users', safe: false,
        samplePayload: { team_id: '', user_ids: [] },
    },
    {
        id: 'post-remove-team-users', name: 'Remove Team Users', domain: 'Team', method: 'POST', getUrl: () => '/api/platform/v2/teams/_remove_users', safe: false,
        samplePayload: { team_id: '', user_ids: [] },
    },
    {
        id: 'post-join-team', name: 'Join Team', domain: 'Team', method: 'POST', getUrl: () => '/api/platform/v2/teams/_join_team', safe: false,
        samplePayload: { team_id: '' },
    },
    {
        id: 'post-leave-team', name: 'Leave Team', domain: 'Team', method: 'POST', getUrl: () => '/api/platform/v2/teams/_leave', safe: false,
        samplePayload: { team_id: '' },
    },

    // ── MEMBERS ───────────────────────────────────────────────────
    { id: 'get-members', name: 'Get Members', domain: 'Member', method: 'GET', getUrl: () => '/api/platform/v1/users?skip=0&limit=10', safe: true, expectedShape: { data: 'array', count: 'number' } },
    { id: 'get-members-active', name: 'Get Active Members', domain: 'Member', method: 'GET', getUrl: () => '/api/platform/v1/users?status=active&limit=10&sort=-created_at', safe: true },
    { id: 'get-member-roles-count', name: 'Get Member Roles Count', domain: 'Member', method: 'GET', getUrl: () => '/api/platform/v1/users/_roles_count', safe: true },
    {
        id: 'post-invite-members', name: 'Bulk Invite Members', domain: 'Member', method: 'POST', getUrl: () => '/api/platform/v1/users/_bulk_invite', safe: false,
        samplePayload: { emails: ['user@example.com'], role: 'agent' },
    },

    // ── CONVERSATIONS ─────────────────────────────────────────────
    { id: 'get-convs-all', name: 'Get Conversations (all)', domain: 'Conversation', method: 'GET', getUrl: () => LIST_CONVS.replace('limit=1', 'limit=20'), safe: true, expectedShape: { data: 'array', has_more: 'boolean' } },
    { id: 'get-convs-pending', name: 'Get Conversations (pending)', domain: 'Conversation', method: 'GET', getUrl: () => '/api/channel-service/v2/team_conversations?type=business_unit_id&q=&view=pending&skip=0&limit=20&channel_types=web', safe: true },
    { id: 'get-convs-closed', name: 'Get Conversations (closed)', domain: 'Conversation', method: 'GET', getUrl: () => '/api/channel-service/v2/team_conversations?type=business_unit_id&q=&view=closed&skip=0&limit=20&channel_types=web', safe: true },
    { id: 'get-views-count', name: 'Get Views Count', domain: 'Conversation', method: 'GET', getUrl: () => '/api/channel-service/v2/team_conversations/_views_count?type=business_unit_id&q=', safe: true, expectedShape: { all: 'number', yours: 'number' } },
    { id: 'get-assignable-team-members', name: 'Get Assignable Team Members', domain: 'Conversation', method: 'GET', getUrl: () => '/api/platform/v1/assign/teams/all', safe: true },
    {
        id: 'post-join-conv', name: 'Join Conversation', domain: 'Conversation', method: 'POST', getUrl: () => '/api/channel-service/v1/team_conversations/_join', safe: false,
        idSourceUrl: LIST_CONVS,
        samplePayload: { team_conversation_id: '', mode: 'manual' },
    },
    {
        id: 'post-leave-conv', name: 'Leave Conversation', domain: 'Conversation', method: 'POST', getUrl: () => '/api/channel-service/v1/team_conversations/_leave', safe: false,
        samplePayload: { team_conversation_id: '' },
    },
    {
        id: 'post-update-conv-status', name: 'Update Conversation Status', domain: 'Conversation', method: 'POST', getUrl: () => '/api/channel-service/v1/team_conversations/_update_status', safe: false,
        samplePayload: { id: '', status: 'closed' },
    },
    {
        id: 'post-assign-team-member', name: 'Assign Team & Member', domain: 'Conversation', method: 'POST', getUrl: () => '/api/channel-service/v1/team_conversations/assign_team_member', safe: false,
        samplePayload: { team_conversation_id: '', team_id: '', user_id: '' },
    },
    {
        id: 'post-remove-from-conv', name: 'Remove Member from Conversation', domain: 'Conversation', method: 'POST', getUrl: () => '/api/channel-service/v1/team_conversations/remove_team_member', safe: false,
        samplePayload: { team_conversation_id: '', user_id: '' },
    },
    {
        id: 'post-conv-join-request', name: 'Join Request (grab mode)', domain: 'Conversation', method: 'POST', getUrl: () => '/api/channel-service/v1/team_conversations/_join_request', safe: false,
        samplePayload: { id: '' },
    },

    // ── CONTACTS ──────────────────────────────────────────────────
    { id: 'get-contacts', name: 'Get Contacts', domain: 'Contact', method: 'GET', getUrl: () => '/api/channel-service/v1/contacts?limit=10&skip=0', safe: true, expectedShape: { data: 'array'} },
    {
        id: 'post-contacts-search', name: 'Search Contacts', domain: 'Contact', method: 'POST', getUrl: () => '/api/channel-service/v1/contacts/_search', safe: false,
        samplePayload: { q: 'search text', limit: 10, skip: 0 },
    },
    {
        id: 'put-contact', name: 'Update Contact', domain: 'Contact', method: 'PUT', getUrl: () => '/api/channel-service/v1/contacts/:id', safe: false,
        idSourceUrl: LIST_CONTACTS, sourceGetUrl: LIST_CONTACTS,
        samplePayload: { display_name: 'Updated Name', email: '', phone_number: '', remark: '' },
    },
    // ── NOTIFICATIONS ─────────────────────────────────────────────
    { id: 'get-notifications', name: 'Get Notifications', domain: 'Notification', method: 'GET', getUrl: () => '/api/channel-service/v1/notifications?skip=0&limit=20', safe: true, expectedShape: { data: 'array' } },
    { id: 'post-dismiss-all', name: 'Dismiss All Notifications', domain: 'Notification', method: 'POST', getUrl: () => '/api/channel-service/v1/notifications/dismiss', safe: false, samplePayload: { ids: [] } },

    // ── CAMPAIGNS ─────────────────────────────────────────────────
    { id: 'get-campaigns', name: 'Get Campaigns', domain: 'Campaign', method: 'GET', getUrl: () => LIST_CAMPAIGNS, safe: true, expectedShape: { data: 'array' } },
    {
        id: 'post-campaign', name: 'Create Campaign', domain: 'Campaign', method: 'POST', getUrl: () => LIST_CAMPAIGNS, safe: false,
        sourceGetUrl: LIST_CAMPAIGNS,
        samplePayload: { name: 'New Campaign', description: '' },
    },
    { id: 'get-touchpoints', name: 'Get Touchpoints', domain: 'Campaign', method: 'GET', getUrl: () => LIST_TOUCHPOINTS, safe: true, expectedShape: { data: 'array' } },
    {
        id: 'post-touchpoint', name: 'Create Touchpoint', domain: 'Campaign', method: 'POST', getUrl: () => '/api/channel-service/v1/touchpoints', safe: false,
        sourceGetUrl: LIST_TOUCHPOINTS,
        samplePayload: { name: 'New Touchpoint', campaign_id: '', channel_id: '', workflow_id: null },
    },
    {
        id: 'put-touchpoint', name: 'Update Touchpoint', domain: 'Campaign', method: 'PUT', getUrl: () => '/api/channel-service/v1/touchpoints/:id', safe: false,
        idSourceUrl: LIST_TOUCHPOINTS, sourceGetUrl: LIST_TOUCHPOINTS,
        samplePayload: { name: 'Updated Touchpoint', workflow_id: null },
    },

    // ── KNOWLEDGE HUB ─────────────────────────────────────────────
    { id: 'get-kh-folders', name: 'Get KH Folders', domain: 'Knowledge Hub', method: 'GET', getUrl: () => '/api/data-board/folders?limit=20&skip=0', safe: true, expectedShape: { data: 'array' } },
    { id: 'get-kh-files-search', name: 'Search KH Files', domain: 'Knowledge Hub', method: 'GET', getUrl: () => '/api/data-board/files/search?folder_id=', safe: true },
    {
        id: 'post-kh-folder', name: 'Create KH Folder', domain: 'Knowledge Hub', method: 'POST', getUrl: () => '/api/data-board/folders', safe: false,
        sourceGetUrl: LIST_FOLDERS,
        samplePayload: {
            name: 'test15',
            description: 'test5',
            organization_id: 'org_imbrace',
            parent_folder_id: 'root',
            source_type: 'upload',
            tags: [],
            auto_tagging: true,
        },
    },
    {
        id: 'put-kh-folder', name: 'Update KH Folder', domain: 'Knowledge Hub', method: 'PUT', getUrl: () => '/api/data-board/folders/:id', safe: false,
        idSourceUrl: LIST_FOLDERS, sourceGetUrl: LIST_FOLDERS,
        samplePayload: { name: 'Updated Folder', description: '', tags: [], auto_tagging: true },
    },
    {
        id: 'post-kh-folder-delete', name: 'Delete KH Folder(s)', domain: 'Knowledge Hub', method: 'POST', getUrl: () => '/api/data-board/folders/delete', safe: false,
        samplePayload: { folder_ids: [] },
    },
    { id: 'get-onedrive-session', name: 'OneDrive Session Status', domain: 'Knowledge Hub', method: 'GET', getUrl: () => '/api/data-board/auth/onedrive/files/session/status', safe: true },

    // ── DATABOARDS ────────────────────────────────────────────────
    { id: 'get-boards', name: 'Get Boards', domain: 'Databoard', method: 'GET', getUrl: () => '/api/data-board/boards?limit=10&skip=0', safe: true, expectedShape: { data: 'array', count: 'number' } },
    { id: 'get-boards-default', name: 'Get Default Boards', domain: 'Databoard', method: 'GET', getUrl: () => '/api/data-board/boards?limit=10&skip=0&is_default=true', safe: true },
    {
        id: 'post-board', name: 'Create Board', domain: 'Databoard', method: 'POST', getUrl: () => '/api/data-board/boards', safe: false,
        sourceGetUrl: LIST_BOARDS,
        samplePayload: { name: 'New Board', description: 'Board description', type: 'General' },
    },
    {
        id: 'put-board', name: 'Update Board', domain: 'Databoard', method: 'PUT', getUrl: () => '/api/data-board/boards/:id', safe: false,
        idSourceUrl: LIST_BOARDS, sourceGetUrl: LIST_BOARDS,
        samplePayload: { name: 'Updated Board Name', description: 'Updated description' },
    },
    {
        id: 'post-board-field', name: 'Create Board Field', domain: 'Databoard', method: 'POST', getUrl: () => '/api/data-board/boards/:id/fields', safe: false,
        idSourceUrl: LIST_BOARDS,
        samplePayload: { name: 'New Field', type: 'ShortText', hidden: false },
    },
    {
        // Bulk update of all fields on a board — single endpoint, not per-field by id.
        id: 'put-board-field', name: 'Update Board Fields (bulk)', domain: 'Databoard', method: 'PUT', getUrl: () => '/api/data-board/boards/:id/fields/bulk', safe: false,
        idSourceUrl: LIST_BOARDS,
        samplePayload: {
            fields: [
                {
                    id: '94da512e-dabc-44e8-872b-965b00c5c119',
                    name: 'soluong',
                    type: 'Number',
                    hidden: false,
                    settings: {},
                    isDefault: false,
                    isDeprecated: false,
                    isIdentifier: false,
                    hiddenOnRecord: false,
                    isUniqueIdentifier: false,
                    field_id: '94da512e-dabc-44e8-872b-965b00c5c119',
                },
                {
                    name: 'new',
                    type: 'ShortText',
                    hidden: false,
                    settings: {},
                    is_default: false,
                    field_id: '',
                },
            ],
        },
    },
    { id: 'get-link-preview', name: 'Link Preview', domain: 'Databoard', method: 'POST', getUrl: () => '/api/data-board/link_preview/getWebsiteInfo', safe: false, samplePayload: { url: 'https://example.com' } },

    // ── BOARD AUTOMATION ──────────────────────────────────────────
    // workflowlist stays on IPS (/api/ips/*); crmboard moved to the data-board service (/api/data-board/*).
    { id: 'get-board-automation', name: 'Get Board Automations (list)', domain: 'Board Automation', method: 'GET', getUrl: () => '/api/ips/v1/workflowlist', safe: true },
    {
        id: 'post-board-automation', name: 'Create Board Automation', domain: 'Board Automation', method: 'POST', getUrl: () => '/api/data-board/v1/crmboard', safe: false,
        sourceGetUrl: LIST_BOARD_AUTOMATION,
        samplePayload: {
            board_id: '',
            type: 'create',
            workflow_id: '',
            description: '',
            name: 'New Automation',
            organization_id: 'org_imbrace',
            field_id: '',
            trigger_frequency_unit: null,
            trigger_frequency_value: null,
            trigger_time: null,
            trigger_day_of_week: null,
            trigger_day_of_month: null,
            triger_month_and_day: null,
            start_date: null,
            start_time: null,
            start_datetime: null,
            is_paused: false,
            is_knowledge_base: false,
            folder_ids: null,
        },
    },
    {
        id: 'put-board-automation', name: 'Update Board Automation', domain: 'Board Automation', method: 'PUT', getUrl: () => '/api/data-board/v1/crmboard/board/:id', safe: false,
        markAsFE: true,
        idSourceUrl: LIST_BOARD_AUTOMATION, sourceGetUrl: LIST_BOARD_AUTOMATION,
        samplePayload: {
            _id: ':id',
            board_id: '',
            type: 'delete',
            workflow_id: '',
            description: 'test',
            name: 'Board Automation - Updated',
            organization_id: 'org_imbrace',
            field_id: '',
            trigger_frequency_unit: null,
            trigger_frequency_value: null,
            trigger_time: null,
            trigger_day_of_week: null,
            trigger_day_of_month: null,
            triger_month_and_day: null,
            start_date: null,
            start_time: null,
            start_datetime: null,
            is_paused: false,
            is_knowledge_base: false,
            folder_ids: null,
            updateNeeded: false,
        },
    },

    // ── MESSAGE TEMPLATES ─────────────────────────────────────────
    { id: 'get-msg-templates', name: 'Get Message Templates', domain: 'Templates', method: 'GET', getUrl: () => '/api/channel-service/v1/message_templates?type=business_unit_id', safe: true, expectedShape: { data: 'array' } },
    { id: 'get-wa-templates', name: 'Get WhatsApp Templates', domain: 'Templates', method: 'GET', getUrl: () => '/api/channel-service/v1/whatsapp_templates?type=business_unit_id&q=&limit=10&skip=0', safe: true },
    { id: 'get-email-templates', name: 'Get Email Templates', domain: 'Templates', method: 'GET', getUrl: () => LIST_EMAIL_TEMPLATES, safe: true },
    { id: 'get-email-template-cats', name: 'Get Email Template Categories', domain: 'Templates', method: 'GET', getUrl: () => '/api/v1/platform/categories', safe: true },
    {
        id: 'post-email-template', name: 'Create Email Template', domain: 'Templates', method: 'POST', getUrl: () => '/api/v2/marketplaces/email-templates', safe: false,
        sourceGetUrl: LIST_EMAIL_TEMPLATES,
        samplePayload: { name: 'New Email Template', subject: 'Hello', content: '<p>Email content</p>', category_id: '', tags: [] },
    },
    {
        id: 'put-email-template', name: 'Update Email Template', domain: 'Templates', method: 'PUT', getUrl: () => '/api/v2/marketplaces/email-templates/:id', safe: false,
        idSourceUrl: LIST_EMAIL_TEMPLATES, sourceGetUrl: LIST_EMAIL_TEMPLATES,
        samplePayload: { name: 'Updated Template', subject: 'Updated Subject', content: '<p>Updated content</p>' },
    },

    // ── WORKFLOWS ─────────────────────────────────────────────────
    { id: 'get-ips-workflows', name: 'Get AP Workflows (all)', domain: 'Workflow', method: 'GET', getUrl: () => `${APWF_API}/api/v1/flows?limit=10`, safe: true },
    { id: 'get-ips-workflows-automation', name: 'Get AP Workflows (automation+board)', domain: 'Workflow', method: 'GET', getUrl: () => `${APWF_API}/api/v1/flows?limit=10&tags=automation&tags=board`, safe: true },
    { id: 'get-workflow-automation-web', name: 'Get Workflow Automation (web)', domain: 'Workflow', method: 'GET', getUrl: () => '/api/channel-service/v1/workflows/channel_automation?channelType=web', safe: true },
    { id: 'get-external-sync', name: 'Get External Data Sync', domain: 'Workflow', method: 'GET', getUrl: () => '/api/ips/v1/external-data-sync', safe: true },

    // ── AI ASSISTANT ──────────────────────────────────────────────
    { id: 'get-ai-assistants', name: 'Get AI Assistants', domain: 'AI', method: 'GET', getUrl: () => LIST_AI_ASSISTANTS, safe: true },
    { id: 'get-ai-agents', name: 'Get AI Agents', domain: 'AI', method: 'GET', getUrl: () => '/api/ai/v3/assistants/agents', safe: true },
    { id: 'get-ai-llm-models', name: 'Get LLM Models', domain: 'AI', method: 'GET', getUrl: () => '/api/ai/v3/workflow-agent/models', safe: true },
    { id: 'get-custom-providers', name: 'Get Custom AI Providers', domain: 'AI', method: 'GET', getUrl: () => LIST_AI_PROVIDERS, safe: true },
    {
        id: 'post-ai-assistant', name: 'Create AI Assistant', domain: 'AI', method: 'POST', getUrl: () => '/api/ai/v3/assistant_apps', safe: false,
        sourceGetUrl: LIST_AI_ASSISTANTS,
        samplePayload: { name: 'New AI Assistant', description: '', instructions: '', model: 'gpt-4', tools: [] },
    },
    {
        id: 'put-ai-assistant', name: 'Update AI Assistant', domain: 'AI', method: 'PUT', getUrl: () => '/api/ai/v3/assistant_apps/:id', safe: false,
        idSourceUrl: LIST_AI_ASSISTANTS, sourceGetUrl: LIST_AI_ASSISTANTS,
        samplePayload: { name: 'Updated Assistant', description: '', instructions: '' },
    },
    {
        id: 'patch-ai-instructions', name: 'Update AI Instructions', domain: 'AI', method: 'PATCH', getUrl: () => '/api/ai/v3/assistants/:id/instructions', safe: false,
        idSourceUrl: LIST_AI_ASSISTANTS,
        samplePayload: { instructions: 'You are a helpful assistant.' },
    },
    {
        id: 'post-custom-provider', name: 'Create Custom AI Provider', domain: 'AI', method: 'POST', getUrl: () => '/api/ai/v3/providers', safe: false,
        sourceGetUrl: LIST_AI_PROVIDERS,
        samplePayload: { name: 'New Provider', type: 'openai', api_key: '', base_url: '' },
    },
    {
        id: 'put-custom-provider', name: 'Update Custom AI Provider', domain: 'AI', method: 'PUT', getUrl: () => '/api/ai/v3/providers/:id', safe: false,
        idSourceUrl: LIST_AI_PROVIDERS, sourceGetUrl: LIST_AI_PROVIDERS,
        samplePayload: { name: 'Updated Provider', api_key: '' },
    },

    // ── MARKETPLACE ───────────────────────────────────────────────
    { id: 'get-ai-use-cases', name: 'Get AI Use Case Templates', domain: 'Marketplace', method: 'GET', getUrl: () => '/api/v3/marketplaces/use-cases', safe: true },

    // ── CREDENTIALS (channel-service) ────────────────────────────────
    { id: 'get-credentials', name: 'Get Credentials', domain: 'Credentials', method: 'GET', getUrl: () => '/api/channel-service/v1/credentials', safe: true },
    { id: 'get-processed-credential-types', name: 'Get Processed Credential Types', domain: 'Credentials', method: 'GET', getUrl: () => '/api/channel-service/v1/workflow/processed-credential-types?withIcons=true', safe: true },
    { id: 'get-credential-params', name: 'Get Credential Params', domain: 'Credentials', method: 'GET', getUrl: () => '/api/channel-service/v1/workflow/_credentialParam?type=facebook', safe: true },

];

export default registry;
