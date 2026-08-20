import { Icon } from '@imbrace/ui';
import { Menu, MenuItem, Tab, Tabs } from '@mui/material';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SchemaCategory } from '../../types';
import styles from './index.module.scss';

export const ALL_TAB_ID = '__all__';

interface CategoryTabsProps {
    categories: SchemaCategory[];
    activeId: string;
    /** Board count of the active tab/filter (from the page's `total`). Only the active tab shows a count. */
    activeCount: number;
    onChange: (id: string) => void;
    onRename: (cat: SchemaCategory) => void;
    onDelete: (cat: SchemaCategory) => void;
}

const CategoryTabs = ({
    categories,
    activeId,
    activeCount,
    onChange,
    onRename,
    onDelete,
}: CategoryTabsProps) => {
    const { t } = useTranslation();
    const tabsRef = useRef<HTMLDivElement>(null);
    const [itemMenu, setItemMenu] = useState<{ anchor: HTMLElement; category: SchemaCategory } | null>(null);

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

    return (
        <>
            <Tabs
                ref={tabsRef}
                value={activeId}
                onChange={(_, val) => onChange(val)}
                variant="scrollable"
                scrollButtons={false}
                className={styles.tabsRoot}
                TabIndicatorProps={{ style: { height: 2 } }}
                sx={{
                    minWidth: 0,
                    '& .MuiTabs-scroller': {
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        '&::-webkit-scrollbar': { display: 'none' },
                    },
                }}
            >
                <Tab
                    value={ALL_TAB_ID}
                    label={
                        <span className={styles.tabLabel}>
                            {t('all')}
                            {activeId === ALL_TAB_ID && <span className={styles.tabCount}> ({activeCount})</span>}
                        </span>
                    }
                />
                {categories.map((cat) => (
                    <Tab
                        key={cat.id}
                        value={cat.id}
                        label={
                            <span className={styles.tabLabel}>
                                <span className={styles.tabName} title={cat.name}>
                                    {cat.name}
                                </span>
                                {activeId === cat.id && <span className={styles.tabCount}> ({activeCount})</span>}
                                <span
                                    role="button"
                                    className={styles.menuButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setItemMenu({ anchor: e.currentTarget as HTMLElement, category: cat });
                                    }}
                                >
                                    <Icon name="moreVert" width={20} height={20} />
                                </span>
                            </span>
                        }
                    />
                ))}
            </Tabs>

            <Menu
                anchorEl={itemMenu?.anchor ?? null}
                open={Boolean(itemMenu)}
                onClose={() => setItemMenu(null)}
            >
                <MenuItem
                    onClick={() => {
                        if (itemMenu) onRename(itemMenu.category);
                        setItemMenu(null);
                    }}
                    sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-light-7)', fontFamily: 'inherit' }}
                >
                    {t('rename')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (itemMenu) onDelete(itemMenu.category);
                        setItemMenu(null);
                    }}
                    sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-danger-1)', fontFamily: 'inherit' }}
                >
                    {t('delete')}
                </MenuItem>
            </Menu>
        </>
    );
};

export default memo(CategoryTabs);
