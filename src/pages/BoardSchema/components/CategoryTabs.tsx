import { Icon } from '@imbrace/ui';
import { Menu, MenuItem, Tab, Tabs } from '@mui/material';
import type { MouseEvent, SyntheticEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import ArrowLeftIcon from '@/assets/icons/general/arrow-left-icon.svg?react';
import ArrowRightIcon from '@/assets/icons/general/arrow-right-icon.svg?react';

import type { SchemaCategory } from '../types';
import styles from './CategoryTabs.module.scss';

export const ALL_TAB_ID = '__all__';

interface CategoryTabsProps {
    categories: SchemaCategory[];
    activeId: string;
    totalCount: number;
    schemaCounts: Record<string, number>;
    onChange: (id: string) => void;
    onRename: (category: SchemaCategory) => void;
    onDelete: (category: SchemaCategory) => void;
}

const CategoryTabs = ({
    categories,
    activeId,
    totalCount,
    schemaCounts,
    onChange,
    onRename,
    onDelete,
}: CategoryTabsProps) => {
    const { t } = useTranslation();
    const tabsRef = useRef<HTMLDivElement>(null);
    const [itemAnchor, setItemAnchor] = useState<{ el: HTMLElement; category: SchemaCategory } | null>(null);

    // Let vertical wheel scroll the horizontal tab strip.
    useEffect(() => {
        const scroller = tabsRef.current?.querySelector<HTMLElement>('.MuiTabs-scroller');
        if (!scroller) return;
        const onWheel = (e: WheelEvent) => {
            if (e.deltaY === 0) return;
            e.preventDefault();
            scroller.scrollLeft += e.deltaY;
        };
        scroller.addEventListener('wheel', onWheel, { passive: false });
        return () => scroller.removeEventListener('wheel', onWheel);
    }, []);

    const handleTabChange = (_: SyntheticEvent, value: string) => {
        onChange(value);
    };

    const openItemMenu = (event: MouseEvent<HTMLElement>, category: SchemaCategory) => {
        event.stopPropagation();
        event.preventDefault();
        setItemAnchor({ el: event.currentTarget, category });
    };

    const closeItemMenu = () => setItemAnchor(null);

    const handleRename = () => {
        if (itemAnchor) onRename(itemAnchor.category);
        closeItemMenu();
    };

    const handleDelete = () => {
        if (itemAnchor) onDelete(itemAnchor.category);
        closeItemMenu();
    };

    return (
        <>
            <Tabs
                ref={tabsRef}
                value={activeId}
                onChange={handleTabChange}
                className={styles.tabsRoot}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                slots={{ StartScrollButtonIcon: ArrowLeftIcon, EndScrollButtonIcon: ArrowRightIcon }}
                TabIndicatorProps={{ style: { height: 2 } }}
            >
                <Tab
                    value={ALL_TAB_ID}
                    label={
                        <span className={styles.tabLabel}>
                            {t('all')}
                            <span className={styles.tabCount}> ({totalCount})</span>
                        </span>
                    }
                />
                {categories.map((category) => {
                    const count = schemaCounts[category.id] ?? 0;
                    return (
                        <Tab
                            key={category.id}
                            value={category.id}
                            label={
                                <span className={styles.tabLabel}>
                                    <span className={styles.tabName} title={category.name}>
                                        {category.name}
                                    </span>
                                    <span className={styles.tabCount}> ({count})</span>
                                    <span
                                        role="button"
                                        className={styles.menuButton}
                                        onClick={(e) => openItemMenu(e as unknown as MouseEvent<HTMLElement>, category)}
                                    >
                                        <Icon name="moreVert" width={20} height={20} />
                                    </span>
                                </span>
                            }
                        />
                    );
                })}
            </Tabs>

            <Menu anchorEl={itemAnchor?.el ?? null} open={!!itemAnchor} onClose={closeItemMenu}>
                <MenuItem onClick={handleRename} sx={{ fontSize: '14px', color: 'var(--color-light-7)' }}>
                    {t('rename')}
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ fontSize: '14px', color: 'var(--color-danger-1)' }}>
                    {t('delete')}
                </MenuItem>
            </Menu>
        </>
    );
};

export default CategoryTabs;
