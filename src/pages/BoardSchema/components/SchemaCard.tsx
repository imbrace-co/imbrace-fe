import { Icon, IconButton } from '@imbrace/ui';
import { CircularProgress, Menu, MenuItem } from '@mui/material';
import type { MouseEvent } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import AiSchemaIcon from '@/assets/icons/ai_schema.svg?react';
import SchemaIcon from '@/assets/icons/board_schema/schema_icon.svg?react';

import type { DocumentSchema, SchemaCategory } from '../types';
import styles from './SchemaCard.module.scss';

interface SchemaCardProps {
    schema: DocumentSchema;
    categories: SchemaCategory[];
    isDuplicating?: boolean;
    onModelProfile?: (schema: DocumentSchema) => void;
    onDuplicate?: (schema: DocumentSchema) => void;
    onDelete?: (schema: DocumentSchema) => void;
}

const getSchemaCategoryId = (schema: DocumentSchema): string =>
    schema.category_id ?? schema.category ?? '';

const getCategoryBreadcrumb = (schema: DocumentSchema, categories: SchemaCategory[]): string => {
    const catId = getSchemaCategoryId(schema);
    if (!catId) return '';
    for (const top of categories) {
        if (top.id === catId) return top.name;
        const sub = (top.subCategories ?? []).find((s) => s.id === catId);
        if (sub) return top.name;
    }
    return '';
};

const SchemaCard = ({ schema, categories, isDuplicating, onModelProfile, onDuplicate, onDelete }: SchemaCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const categoryName = getCategoryBreadcrumb(schema, categories);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const handleEdit = () => {
        navigate(`/document-models/${schema.id}`);
    };

    const openMenu = (e: MouseEvent<HTMLElement>) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); };
    const closeMenu = () => setMenuAnchor(null);

    const handleModelProfile = () => {
        closeMenu();
        onModelProfile?.(schema);
    };
    const handleDuplicate = () => {
        closeMenu();
        onDuplicate?.(schema);
    };
    const handleDelete = () => {
        closeMenu();
        onDelete?.(schema);
    };

    return (
        <div
            className={styles.card}
            onClick={isDuplicating ? undefined : handleEdit}
            style={{
                position: 'relative',
                ...(isDuplicating ? { cursor: 'default' } : {}),
            }}
        >
            {isDuplicating && (
                <div className={styles.loadingOverlay}>
                    <CircularProgress size={56} />
                </div>
            )}
            <div className={styles.headerRow}>
                <SchemaIcon className={styles.titleIcon} />
                <span className={styles.title}>{schema.name}</span>
            </div>
            <div className={styles.statsRow}>
                <div className={styles.stat}>
                    <div className={styles.statValue}>{schema.attributes?.length ?? 0}</div>
                    <div className={styles.statLabel}>{t('schema_attributes', 'Attributes')}</div>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statValue}>{schema.agent_ids?.length ?? schema.agents?.length ?? 0}</div>
                    <div className={styles.statLabel}>{t('schema_agents_in_use', 'Agents In Use')}</div>
                </div>
            </div>
            <div className={styles.categoryName}>{categoryName || ' '}</div>
            <div className={styles.footer}>
                <button
                    type="button"
                    className={styles.editLink}
                    onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                    aria-label={t('schema_edit_schema', 'Edit Schema')}
                    title={t('schema_edit_schema', 'Edit Schema')}
                >
                    <AiSchemaIcon className={styles.editIcon} />
                </button>
                <IconButton
                    size="xs"
                    variant="text"
                    type="secondary"
                    onClick={openMenu}
                    sx={{ width: 22, height: 22, padding: 0, marginLeft: 'auto' }}
                >
                    <Icon name="moreVert" />
                </IconButton>
            </div>

            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu} onClick={(e) => e.stopPropagation()}>
                <MenuItem
                    onClick={handleModelProfile}
                    sx={{ fontSize: '14px', color: 'var(--color-light-7)' }}
                >
                    {t('schema_model_profile', 'Model Profile')}
                </MenuItem>
                <MenuItem
                    onClick={handleDuplicate}
                    sx={{ fontSize: '14px', color: 'var(--color-light-7)' }}
                >
                    {t('schema_duplicate', 'Duplicate')}
                </MenuItem>
                <MenuItem
                    onClick={handleDelete}
                    sx={{ fontSize: '14px', color: 'var(--color-danger-1)' }}
                >
                    {t('delete')}
                </MenuItem>
            </Menu>
        </div>
    );
};

export default SchemaCard;
