import { Icon } from '@imbrace/ui';
import { Menu, MenuItem } from '@mui/material';

import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';

import SubCategoryIcon from '@/assets/icons/board_schema/sub_category_icon.svg?react';

import type { SchemaCategory } from '../types';

import styles from './SubCategoryRow.module.scss';

interface SubCategoryRowProps {
    subCategories: SchemaCategory[];
    selectedId?: string;
    parentName?: string;
    onSelect: (id: string | undefined) => void;
    onSelectParent: () => void;
    onAddSubCategory: () => void;
    onRename: (subCategory: SchemaCategory) => void;
    onDelete: (subCategory: SchemaCategory) => void;
}

const SubCategoryRow = ({
    subCategories,
    selectedId,
    parentName,
    onSelect,
    onSelectParent,
    onAddSubCategory,
    onRename,
    onDelete,
}: SubCategoryRowProps) => {
    const { t } = useTranslation();
    const count = subCategories.length;
    const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; sub: SchemaCategory } | null>(null);

    const openMenu = (e: MouseEvent<HTMLElement>, sub: SchemaCategory) => {
        e.stopPropagation();
        e.preventDefault();
        setMenuAnchor({ el: e.currentTarget, sub });
    };
    const closeMenu = () => setMenuAnchor(null);

    const handleRename = () => {
        if (menuAnchor) onRename(menuAnchor.sub);
        closeMenu();
    };
    const handleDelete = () => {
        if (menuAnchor) onDelete(menuAnchor.sub);
        closeMenu();
    };

    return (
        <div className={styles.wrap}>
            {selectedId ? (
                /* Sub-category selected: only show "Parent > Sub" breadcrumb, no chips */
                <span className={styles.summary}>
                    <span
                        role="button"
                        className={styles.breadcrumbParent}
                        onClick={onSelectParent}
                    >
                        {parentName}
                    </span>
                    {' > '}
                    <span className={styles.breadcrumbSub}>
                        {subCategories.find((s) => s.id === selectedId)?.name}
                    </span>
                </span>
            ) : (
                /* No sub-category selected: show count, add button, and chips */
                <>
                    <div className={styles.summaryRow}>
                        <span className={styles.summary}>
                            {count}{' '}
                            {count <= 1
                                ? t('schema_sub_category', 'Sub category')
                                : t('schema_sub_categories', 'Sub categories')}
                        </span>
                        <span role="button" className={styles.addLink} onClick={onAddSubCategory}>
                            {t('schema_add_sub_category', '+ Sub Category')}
                        </span>
                    </div>
                    <div className={styles.itemsRow}>
                        {subCategories.map((sub) => (
                            <span
                                key={sub.id}
                                role="button"
                                className={styles.item}
                                onClick={() => onSelect(sub.id)}
                            >
                                <SubCategoryIcon className={styles.itemIcon} />
                                {sub.name}
                                <span
                                    role="button"
                                    className={styles.menuIcon}
                                    onClick={(e) => openMenu(e as unknown as MouseEvent<HTMLElement>, sub)}
                                >
                                    <Icon name="moreVert" />
                                </span>
                            </span>
                        ))}
                    </div>
                </>
            )}

            <Menu anchorEl={menuAnchor?.el ?? null} open={!!menuAnchor} onClose={closeMenu}>
                <MenuItem onClick={handleRename} sx={{ fontSize: '14px', color: 'var(--color-light-7)' }}>
                    {t('rename')}
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ fontSize: '14px', color: 'var(--color-danger-1)' }}>
                    {t('delete')}
                </MenuItem>
            </Menu>
        </div>
    );
};

export default SubCategoryRow;
