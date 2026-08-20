import { Icon, IconButton, Search } from '@imbrace/ui';
import { CircularProgress, Divider, Menu, MenuItem } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

import ArrowDownIcon from '@/assets/icons/general/arrow-down-icon.svg?react';
import { useNotify } from '@/contexts/SnackbarContext';
import useDebounce from '@/hooks/useDebounce';
import { useCreateSchema, useSchemaCategories, useSchemas } from '@/services/queries/schema';
import { getApiErrorMessage } from '@/utils/apiError';

import {
    CreateCategoryDialog,
    DeleteCategoryDialog,
    DeleteSchemaDialog,
    RenameCategoryDialog,
} from './components/CategoryDialogs';
import CategoryTabs, { ALL_TAB_ID } from './components/CategoryTabs';
import ModelProfileDialog from './components/ModelProfileDialog';
import SchemaCard from './components/SchemaCard';
import SubCategoryRow from './components/SubCategoryRow';
import styles from './index.module.scss';
import type { DocumentSchema, SchemaCategory } from './types';

const BoardSchema = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlCatBootstrapped = useRef(false);

    const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_TAB_ID);
    const [activeSubCategoryId, setActiveSubCategoryId] = useState<string | undefined>(undefined);
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 500);
    const [createMenuAnchor, setCreateMenuAnchor] = useState<HTMLElement | null>(null);
    const [categoryMenuSearch, setCategoryMenuSearch] = useState('');
    const tabBarRef = useRef<HTMLDivElement>(null);
    const addBtnRef = useRef<HTMLDivElement>(null);
    const moreBtnRef = useRef<HTMLDivElement>(null);
    const tabsInnerRef = useRef<HTMLDivElement>(null);
    const [maxTabsWidth, setMaxTabsWidth] = useState(0);
    const [useSearchableCategoryMenu, setUseSearchableCategoryMenu] = useState(false);

    const [renameTarget, setRenameTarget] = useState<SchemaCategory | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SchemaCategory | null>(null);
    const [deleteSchemaTarget, setDeleteSchemaTarget] = useState<DocumentSchema | null>(null);
    const [modelProfileTarget, setModelProfileTarget] = useState<DocumentSchema | null>(null);
    const [createTarget, setCreateTarget] = useState<{ open: boolean; parentId?: string; parentName?: string }>({
        open: false,
    });

    const { notify } = useNotify();
    const duplicateMut = useCreateSchema();
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

    const categoriesQuery = useSchemaCategories({ type: 'schema' });
    const categories = useMemo<SchemaCategory[]>(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

    const activeCategory = useMemo(
        () => categories.find((c) => c.id === activeCategoryId) ?? null,
        [categories, activeCategoryId],
    );

    // Always fetch by the exact selected id (parent or sub).
    // Client-side exact-match filter means a parent tab never shows sub-category schemas.
    const filterCategoryId =
        activeCategoryId === ALL_TAB_ID ? undefined : activeSubCategoryId ?? activeCategoryId;

    const schemasQuery = useSchemas({
        search: debouncedSearch || undefined,
        categoryId: filterCategoryId,
    });

    // Exact-match filter: only show schemas whose category_id is exactly the selected id.
    const schemas = useMemo(() => {
        const raw = schemasQuery.data ?? [];
        if (!filterCategoryId) return raw;
        return raw.filter(
            (s) => (s.category_id ?? s.category ?? '') === filterCategoryId,
        );
    }, [schemasQuery.data, filterCategoryId]);

    const allSchemasQuery = useSchemas({});
    const allSchemas = useMemo(() => allSchemasQuery.data ?? [], [allSchemasQuery.data]);

    // Bootstrap the active tab from URL `?categoryId=<id>` once the categories list is ready.
    useEffect(() => {
        if (urlCatBootstrapped.current) return;
        if (categories.length === 0) return;
        urlCatBootstrapped.current = true;
        const catFromUrl = searchParams.get('categoryId');
        if (!catFromUrl) return;
        if (categories.some((c) => c.id === catFromUrl)) {
            setActiveCategoryId(catFromUrl);
            setActiveSubCategoryId(undefined);
            return;
        }
        for (const top of categories) {
            const sub = (top.subCategories ?? []).find((s) => s.id === catFromUrl);
            if (sub) {
                setActiveCategoryId(top.id);
                setActiveSubCategoryId(sub.id);
                return;
            }
        }
    }, [categories, searchParams]);

    const syncTabToUrl = (nextCat: string | undefined) => {
        const next = new URLSearchParams(searchParams);
        if (nextCat) next.set('categoryId', nextCat);
        else next.delete('categoryId');
        setSearchParams(next, { replace: true });
    };

    // Self-heal active selection when the underlying categories change
    // (e.g. user deletes the currently active category / sub-category).
    useEffect(() => {
        if (activeCategoryId === ALL_TAB_ID) {
            if (activeSubCategoryId !== undefined) setActiveSubCategoryId(undefined);
            return;
        }
        const parent = categories.find((c) => c.id === activeCategoryId);
        if (!parent) {
            setActiveCategoryId(ALL_TAB_ID);
            setActiveSubCategoryId(undefined);
            return;
        }
        if (
            activeSubCategoryId &&
            !(parent.subCategories ?? []).some((s) => s.id === activeSubCategoryId)
        ) {
            setActiveSubCategoryId(undefined);
        }
    }, [activeCategoryId, activeSubCategoryId, categories]);

    const schemaCountsByCategoryId = useMemo(() => {
        const counts: Record<string, number> = {};
        const idToTopLevel = new Map<string, string>();
        const seed = (top: SchemaCategory, current: SchemaCategory) => {
            idToTopLevel.set(current.id, top.id);
            (current.subCategories ?? []).forEach((sub) => seed(top, sub));
        };
        categories.forEach((c) => seed(c, c));
        allSchemas.forEach((s) => {
            const catId = s.category_id ?? s.category ?? '';
            if (!catId) return;
            const topId = idToTopLevel.get(catId);
            if (topId) counts[topId] = (counts[topId] ?? 0) + 1;
        });
        return counts;
    }, [categories, allSchemas]);

    const handleSelectTab = (id: string) => {
        setActiveCategoryId(id);
        setActiveSubCategoryId(undefined);
        syncTabToUrl(id === ALL_TAB_ID ? undefined : id);
    };

    const closeCategoryMenu = () => {
        setCreateMenuAnchor(null);
        setCategoryMenuSearch('');
    };
    const filteredMenuCategories = useMemo(
        () =>
            categories.filter((c) =>
                c.name.toLowerCase().includes(categoryMenuSearch.trim().toLowerCase()),
            ),
        [categories, categoryMenuSearch],
    );

    useEffect(() => {
        const bar = tabBarRef.current;
        if (!bar) return;
        const SEARCH_MIN = 210;
        const GAP_TABS_MORE = 40; 
        const GAP_MORE_SEARCH = 12; 
        const GAP_SEARCH_ADD = 8; 
        const PADDING_LEFT = 6;
        const compute = () => {
            const total = bar.clientWidth;
            const addW = addBtnRef.current?.offsetWidth ?? 40;
            const moreW = moreBtnRef.current?.offsetWidth ?? 28;
            setMaxTabsWidth(
                Math.max(
                    0,
                    total - SEARCH_MIN - addW - moreW - GAP_TABS_MORE - GAP_MORE_SEARCH - GAP_SEARCH_ADD - PADDING_LEFT,
                ),
            );
        };
        compute();
        const ro = new ResizeObserver(compute);
        ro.observe(bar);
        return () => ro.disconnect();
    }, [useSearchableCategoryMenu]);

    const measureSearchableMenu = () => {
        const el = tabsInnerRef.current;
        if (!el) return;
        const scroller = el.querySelector('[class*="MuiTabs-scroller"]') as HTMLElement | null;
        if (scroller) {
            setUseSearchableCategoryMenu(scroller.scrollWidth > scroller.clientWidth + 1);
        }
    };

    useEffect(() => {
        const el = tabsInnerRef.current;
        if (!el) return;
        const raf = requestAnimationFrame(measureSearchableMenu);
        const ro = new ResizeObserver(measureSearchableMenu);
        ro.observe(el);
        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
        };
    }, [categories, maxTabsWidth]);

    const handleAddSubCategory = () => {
        if (!activeCategory) return;
        setCreateTarget({ open: true, parentId: activeCategory.id, parentName: activeCategory.name });
    };

    const handleCreateTopLevel = () => {
        setCreateMenuAnchor(null);
        setCreateTarget({ open: true });
    };

    const handleDuplicate = async (schema: DocumentSchema) => {
        setDuplicatingId(schema.id);
        try {
            // Map the read-shape (snake_case) into the write-shape body the create endpoint expects.
            await duplicateMut.mutateAsync({
                name: `${schema.name} COPY`,
                category: schema.category_id ?? schema.category ?? null,
                agents: (schema.agent_ids ?? []).map((aid) => ({ _id: aid })),
                databoards: (schema.databoard_ids ?? []).map((bid) => ({ _id: bid })),
                attributes: schema.attributes ?? [],
            });
            notify({ type: 'success', message: t('schema_duplicated', 'Schema duplicated successfully') });
        } catch (err) {
            notify({ type: 'error', message: getApiErrorMessage(err) ?? t('error_something_went_wrong') });
        } finally {
            setDuplicatingId(null);
        }
    };

    const handleModelProfile = (schema: DocumentSchema) => {
        setModelProfileTarget(schema);
    };

    // Search is in-flight either during the debounce window (input not yet committed)
    // or while the committed search term is being (re)fetched from the backend.
    const isSearching =
        searchInput.trim() !== debouncedSearch.trim() ||
        (!!debouncedSearch && schemasQuery.isFetching);

    const isLoading = categoriesQuery.isLoading || schemasQuery.isLoading || isSearching;

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1 className={styles.title}>{t('schema_page_title', 'Document Models')}</h1>

                <div className={styles.tabBar} ref={tabBarRef}>
                    <div className={styles.tabsArea}>
                        <div
                            className={styles.tabsInner}
                            ref={tabsInnerRef}
                            style={{ maxWidth: maxTabsWidth || undefined }}
                        >
                            <CategoryTabs
                                categories={categories}
                                activeId={activeCategoryId}
                                totalCount={allSchemas.length}
                                schemaCounts={schemaCountsByCategoryId}
                                onChange={handleSelectTab}
                                onRename={(c) => setRenameTarget(c)}
                                onDelete={(c) => setDeleteTarget(c)}
                            />
                        </div>
                        <div className={styles.moreBtnWrap} ref={moreBtnRef}>
                            {useSearchableCategoryMenu ? (
                                <button
                                    type="button"
                                    className={styles.allCategoriesBtn}
                                    onClick={(e) => {
                                        measureSearchableMenu();
                                        setCreateMenuAnchor(e.currentTarget);
                                    }}
                                >
                                    {t('schema_all_categories', 'All Categories')}
                                    <ArrowDownIcon width={24} height={24} />
                                </button>
                            ) : (
                                <IconButton
                                    size="xs"
                                    variant="text"
                                    type="secondary"
                                    onClick={(e) => {
                                        measureSearchableMenu();
                                        setCreateMenuAnchor(e.currentTarget);
                                    }}
                                >
                                    <Icon name="moreVert" width={20} height={20} />
                                </IconButton>
                            )}
                        </div>
                    </div>
                    <div className={styles.searchBox}>
                        <Search
                            value={searchInput}
                            placeholder={t('search')}
                            onSearch={(v) => setSearchInput(v)}
                            onReset={() => setSearchInput('')}
                        />
                    </div>
                    <div className={styles.addBtnWrap} ref={addBtnRef}>
                        <IconButton
                            size="default"
                            variant="contained"
                            type="primary"
                            onClick={() => {
                                const presetCat =
                                    activeCategoryId === ALL_TAB_ID
                                        ? undefined
                                        : (activeSubCategoryId ?? activeCategoryId);
                                navigate(
                                    presetCat
                                        ? `/document-models/new?categoryId=${encodeURIComponent(presetCat)}`
                                        : '/document-models/new',
                                );
                            }}
                        >
                            <Icon name="add" />
                        </IconButton>
                    </div>
                </div>

                {activeCategory && (
                    <SubCategoryRow
                        subCategories={activeCategory.subCategories ?? []}
                        selectedId={activeSubCategoryId}
                        parentName={activeCategory.name}
                        onSelect={(subId) => {
                            setActiveSubCategoryId(subId);
                            syncTabToUrl(subId ?? activeCategory.id);
                        }}
                        onSelectParent={() => {
                            setActiveSubCategoryId(undefined);
                            syncTabToUrl(activeCategory.id);
                        }}
                        onAddSubCategory={handleAddSubCategory}
                        onRename={(c) => setRenameTarget(c)}
                        onDelete={(c) => setDeleteTarget(c)}
                    />
                )}
            </div>

            <div className={styles.body}>
                {isLoading ? (
                    <div className={styles.loadingRow}>
                        <CircularProgress size={56} />
                        <span className={styles.loadingText}>{t('loading')}</span>
                    </div>
                ) : schemas.length === 0 ? (
                    <div className={styles.emptyState}>
                        <span>{t('schema_no_schemas', 'No schemas found')}</span>
                    </div>
                ) : (
                    <div className={styles.cardsGrid}>
                        {schemas.map((schema) => (
                            <SchemaCard
                                key={schema.id}
                                schema={schema}
                                categories={categories}
                                isDuplicating={duplicatingId === schema.id}
                                onModelProfile={handleModelProfile}
                                onDuplicate={handleDuplicate}
                                onDelete={(s) => setDeleteSchemaTarget(s)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Menu
                anchorEl={createMenuAnchor}
                open={!!createMenuAnchor}
                onClose={closeCategoryMenu}
                disableAutoFocusItem
                slotProps={{
                    paper: {
                        sx: {
                            width: useSearchableCategoryMenu ? 264 : undefined,
                            mt: 0.5,
                            boxShadow:
                                '0 2px 24px 0 color-mix(in srgb, var(--color-light-3) 20%, transparent), 0 4px 8px 0 color-mix(in srgb, var(--color-light-4) 8%, transparent)',
                        },
                    },
                }}
            >
                {useSearchableCategoryMenu
                    ? [
                          <div
                              key="search"
                              style={{ padding: '8px', borderBottom: '1px solid var(--color-light-3)' }}
                              onKeyDown={(e) => e.stopPropagation()}
                          >
                              <Search
                                  value={categoryMenuSearch}
                                  placeholder={t('schema_search_categories', 'Search Categories')}
                                  onSearch={(v) => setCategoryMenuSearch(v)}
                                  onReset={() => setCategoryMenuSearch('')}
                              />
                          </div>,
                          <div
                              key="category-list"
                              style={{ maxHeight: 'calc(8 * 41px)', overflowY: 'auto' }}
                          >
                              {filteredMenuCategories.map((c) => (
                                  <MenuItem
                                      key={c.id}
                                      onClick={() => {
                                          handleSelectTab(c.id);
                                          closeCategoryMenu();
                                      }}
                                      sx={{ fontSize: 14, fontWeight: 400, color: 'var(--color-light-7)', padding: '10px 12px' }}
                                  >
                                      {c.name} ({schemaCountsByCategoryId[c.id] ?? 0})
                                  </MenuItem>
                              ))}
                          </div>,
                          <Divider key="divider" sx={{ my: 0.5 }} />,
                          <MenuItem
                              key="create"
                              onClick={handleCreateTopLevel}
                              sx={{ fontSize: 14, fontWeight: 400, color: 'var(--color-primary-1)', gap: 1, padding: '8px 12px' }}
                          >
                              <Icon name="add" style={{ width: 24, height: 24 }} />
                              {t('schema_create_new_category', 'Create new category')}
                          </MenuItem>,
                      ]
                    : (
                        <MenuItem onClick={handleCreateTopLevel} sx={{ fontSize: '14px', color: 'var(--color-light-7)' }}>
                            {t('schema_create_new_category', 'Create new Category')}
                        </MenuItem>
                    )}
            </Menu>

            <RenameCategoryDialog
                open={!!renameTarget}
                category={renameTarget}
                isSubCategory={!!renameTarget && !categories.some((c) => c.id === renameTarget.id)}
                onClose={() => setRenameTarget(null)}
            />
            <DeleteCategoryDialog
                open={!!deleteTarget}
                category={deleteTarget}
                isSubCategory={!!deleteTarget && !categories.some((c) => c.id === deleteTarget.id)}
                parentId={
                    deleteTarget
                        ? categories.find((c) => (c.subCategories ?? []).some((s) => s.id === deleteTarget.id))?.id
                        : undefined
                }
                parentName={
                    deleteTarget
                        ? categories.find((c) => (c.subCategories ?? []).some((s) => s.id === deleteTarget.id))?.name
                        : undefined
                }
                onClose={() => setDeleteTarget(null)}
            />
            <CreateCategoryDialog
                open={createTarget.open}
                parentId={createTarget.parentId}
                parentName={createTarget.parentName}
                onClose={() => setCreateTarget({ open: false })}
                onCreated={(createdId) => {
                    // Only auto-switch when creating a top-level category. For sub-category creation
                    // we keep the user on the current parent tab.
                    if (!createTarget.parentId) {
                        setActiveCategoryId(createdId);
                        setActiveSubCategoryId(undefined);
                    }
                }}
            />
            <DeleteSchemaDialog
                open={!!deleteSchemaTarget}
                schema={deleteSchemaTarget}
                onClose={() => setDeleteSchemaTarget(null)}
            />
            <ModelProfileDialog
                open={!!modelProfileTarget}
                schema={modelProfileTarget}
                categories={categories}
                onClose={() => setModelProfileTarget(null)}
            />
        </div>
    );
};

export default BoardSchema;
