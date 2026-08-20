import { Button, DropdownMenu, DropdownMenuItem, Search, Tabs, Typography } from '@imbrace/ui';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AiAgentPlusIcon from '@/assets/icons/ai_agent_plus_icon.svg?react';

import { UseCaseAgentCard } from '../AgentCard';
import type { UseCaseProps } from '../UseCaseItem';
import styles from './myAi.module.scss';

type FilterId = 'ALL' | 'AGENT' | 'BUILTIN' | 'DOCUMENT_AI';

interface MyAITabProps {
    searchInput: string;
    onSearchInputChange: (value: string) => void;
    templates: UseCaseProps[];
    onSelectTemplate: (id: string) => void;
    onRemovedTemplate: () => void;
    onImport: () => void;
    onCreateNew: () => void;
    isAllowCreateNew: boolean;
}

const FILTER_OPTIONS: { id: FilterId; labelKey: string; fallback: string }[] = [
    { id: 'ALL', labelKey: 'all', fallback: 'All' },
    { id: 'AGENT', labelKey: 'ai_agent_filter_general_agent', fallback: 'General Agent' },
    { id: 'BUILTIN', labelKey: 'ai_agent_filter_built_in_agent', fallback: 'Built-in Agent' },
    { id: 'DOCUMENT_AI', labelKey: 'ai_agent_filter_doc_agent', fallback: 'Doc Agent' },
];

const toCreatedAtTime = (value?: string) => {
    if (!value) return 0;
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : 0;
};

const isBuiltin = (tpl: UseCaseProps) => tpl.assistant_id?.startsWith('builtin-') ?? false;

const MyAITab: React.FC<MyAITabProps> = ({
    searchInput,
    onSearchInputChange,
    templates,
    onSelectTemplate,
    onRemovedTemplate,
    onImport,
    onCreateNew,
    isAllowCreateNew,
}) => {
    const { t } = useTranslation();
    const [filter, setFilter] = useState<FilterId>('ALL');
    const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLElement | null>(null);

    const openFilter = useCallback((e: React.MouseEvent<HTMLElement>) => {
        setFilterAnchorEl(e.currentTarget);
    }, []);
    const closeFilter = useCallback(() => setFilterAnchorEl(null), []);

    const { agents, builtins, documentAIItems } = useMemo(() => {
        const sorted = (list: UseCaseProps[]) =>
            list.slice().sort((a, b) => toCreatedAtTime(b.created_at) - toCreatedAtTime(a.created_at));

        return {
            builtins: sorted(templates.filter(isBuiltin)),
            documentAIItems: sorted(
                templates.filter((tpl) => tpl.agent_type === 'document_ai' && !isBuiltin(tpl)),
            ),
            agents: sorted(
                templates.filter(
                    (tpl) =>
                        !isBuiltin(tpl) &&
                        tpl.agent_type !== 'document_ai',
                ),
            ),
        };
    }, [templates]);

    const visibleTemplates = useMemo(() => {
        switch (filter) {
            case 'AGENT':
                return agents;
            case 'BUILTIN':
                return builtins;
            case 'DOCUMENT_AI':
                return documentAIItems;
            case 'ALL':
            default:
                return [...agents, ...builtins, ...documentAIItems];
        }
    }, [agents, builtins, documentAIItems, filter]);

    const activeCount = visibleTemplates.length;

    const filterLabel = useMemo(() => {
        const opt = FILTER_OPTIONS.find((o) => o.id === filter);
        return opt ? t(opt.labelKey, opt.fallback) : t('all');
    }, [filter, t]);

    return (
        <div className={styles.container}>
            <div className={styles.toolbar}>
                <Button
                    variant="outlined"
                    type="primary"
                    text={t('ai_agent_import_button')}
                    disabled={!isAllowCreateNew}
                    onClick={onImport}
                />
                <Search
                    value={searchInput}
                    placeholder={t('ai_agent_search_by_agent_role_name')}
                    onSearch={(value) => onSearchInputChange(value)}
                    onReset={() => onSearchInputChange('')}
                />
                <Typography variant="BodyBold" className={styles.filterDropdown} onClick={openFilter}>
                    {filterLabel.toUpperCase()} ▾
                </Typography>
                <DropdownMenu
                    anchorEl={filterAnchorEl || undefined}
                    open={Boolean(filterAnchorEl)}
                    onClose={closeFilter}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    PaperProps={{ sx: { minWidth: '180px' } }}
                >
                    {FILTER_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                            key={opt.id}
                            onClick={() => {
                                setFilter(opt.id);
                                closeFilter();
                            }}
                        >
                            {t(opt.labelKey, opt.fallback)}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenu>
                <Button
                    type="warning"
                    text={<AiAgentPlusIcon />}
                    sx={{
                        minWidth: '40px',
                        width: '40px',
                        height: '40px',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '& span': {
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        },
                    }}
                    disabled={!isAllowCreateNew}
                    onClick={onCreateNew}
                />
            </div>

            <div className={styles.sectionHeader}>
                <Tabs
                    currentTab="active"
                    tabs={[
                        {
                            value: 'active',
                            label: `${t('ai_agent_my_ai_active_tab', 'Active AI')} (${activeCount})`,
                        },
                    ]}
                />
            </div>

            {activeCount === 0 ? (
                <div className={styles.emptyState}>
                    <Typography variant="Body" style={{ color: '#828282' }}>
                        {t('ai_agent_my_ai_empty', 'No AI Agent found.')}
                    </Typography>
                </div>
            ) : (
                <div className={styles.grid}>
                    {visibleTemplates.map((item) => (
                        <UseCaseAgentCard
                            key={item._id}
                            item={item}
                            onSelect={() => onSelectTemplate(item._id)}
                            onRemoved={onRemovedTemplate}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MyAITab;
