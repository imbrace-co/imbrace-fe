import { Icon, IconButton, Search, useDialog } from '@imbrace/ui';
import { Box, Menu, MenuItem } from '@mui/material';
import type { MutableRefObject, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import PageLayout from '@/components/PageLayout';
import { BoardSetting } from '@/pages/Databoards/components/BoardSetting';
import { usePaginatedBoards } from '@/services/queries/board';
import { useDataboardCategories } from '@/services/queries/databoardCategory';
import { useSchemas } from '@/services/queries/schema';

import BoardGrid from './components/BoardGrid';
import CategoryTabs, { ALL_TAB_ID } from './components/CategoryTabs';
import SubFolderRow from './components/SubFolderRow';
import { useCategoryDialogs } from './hooks/useCategoryDialogs';

const DataboardsIndex = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const navigateRef: MutableRefObject<ReturnType<typeof useNavigate>> = useRef(navigate);
    const tableRef: RefObject<FlexibleTableRef<API.BoardItem>> = useRef(null);
    const [{ dialog }, dialogHolder] = useDialog();

    const { data: allSchemas = [] } = useSchemas({});

    // Categories live in the same `/data-board/categories` store /schemas uses (type='databoard'),
    // with nested `subCategories`. Each board carries `category_id` — the category never lists boards.
    const { data: categories = [] } = useDataboardCategories();

    const [activeCategoryId, setActiveCategoryId] = useState<string>(ALL_TAB_ID);
    const [activeSubFolderId, setActiveSubFolderId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [createMenuAnchor, setCreateMenuAnchor] = useState<null | HTMLElement>(null);

    // Debounce the search box → hit the API once the user pauses, not per keystroke.
    useEffect(() => {
        const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(id);
    }, [search]);

    // Server-side pagination: the API filters by category/search and returns `total`, so we
    // fetch one page at a time (no fetch-all). category_id is the sub-folder if one is picked,
    // else the active category; the "All" tab sends no category filter.
    const categoryId = activeCategoryId === ALL_TAB_ID ? undefined : (activeSubFolderId ?? activeCategoryId);
    const { data: boardsPage, isLoading, refetch: refetchBoards } = usePaginatedBoards({
        types: 'General',
        limit: pageSize,
        skip: (page - 1) * pageSize,
        search: debouncedSearch || undefined,
        categoryId,
    });
    const pageBoards = boardsPage?.boards ?? [];
    // `total` reflects the active filter, so it doubles as the active tab's badge count.
    const total = boardsPage?.total ?? 0;
    const pageCount = Math.ceil(total / pageSize);

    // Stable identity so memoized BoardCards don't re-render on every search keystroke.
    const refetch = useCallback(() => { refetchBoards(); }, [refetchBoards]);

    const activeCategory = useMemo(
        () => categories.find((c) => c.id === activeCategoryId) ?? null,
        [categories, activeCategoryId],
    );

    const categoryDialogs = useCategoryDialogs();

    // Self-heal the active selection if the underlying categories change (e.g. the active
    // category / sub-folder was just deleted).
    useEffect(() => {
        if (activeCategoryId === ALL_TAB_ID) {
            if (activeSubFolderId !== null) setActiveSubFolderId(null);
            return;
        }
        const parent = categories.find((c) => c.id === activeCategoryId);
        if (!parent) {
            setActiveCategoryId(ALL_TAB_ID);
            setActiveSubFolderId(null);
            return;
        }
        if (activeSubFolderId && !(parent.subCategories ?? []).some((s) => s.id === activeSubFolderId)) {
            setActiveSubFolderId(null);
        }
    }, [activeCategoryId, activeSubFolderId, categories]);

    const subFolders = useMemo(() => activeCategory?.subCategories ?? [], [activeCategory]);

    // Back to page 1 whenever the active filter changes (`total`, and so the page count,
    // changes with the filter — see boards-list-api.md).
    useEffect(() => {
        setPage(1);
    }, [activeCategoryId, activeSubFolderId, debouncedSearch]);

    // Clamp if the page count shrinks (e.g. a board on the last page was deleted).
    useEffect(() => {
        if (pageCount > 0 && page > pageCount) setPage(pageCount);
    }, [pageCount, page]);

    const handleNewBoard = useCallback(() => {
        dialog({
            title: t('board_create_new_header'),
            paperSx: { width: '90vw', maxWidth: '900px' },
            content: ({ onClose }) => (
                <BoardSetting
                    board={undefined}
                    fillLayout
                    onClose={onClose}
                    navigateRef={navigateRef}
                    setCurrentTab={(tab) => navigate(`/databoards/${tab}`, { replace: true })}
                    tableRef={tableRef}
                />
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
        });
    }, [dialog, t, navigate]);

    const selectCategory = useCallback((id: string) => {
        setActiveCategoryId(id);
        setActiveSubFolderId(null);
    }, []);

    const handlePageSizeChange = useCallback((size: number) => {
        setPageSize(size);
        setPage(1);
    }, []);

    const handleCategoryDelete = useCallback((cat: Parameters<typeof categoryDialogs.deleteCategory>[0]) => {
        categoryDialogs.deleteCategory(cat, () => {
            setActiveCategoryId(ALL_TAB_ID);
            setActiveSubFolderId(null);
        });
    }, [categoryDialogs]);

    const handleSubFolderToggle = useCallback((id: string) => {
        setActiveSubFolderId((prev) => (prev === id ? null : id));
    }, []);

    const handleSubFolderCreate = useCallback(() => {
        if (activeCategory) categoryDialogs.createSubFolder(activeCategory.id);
    }, [activeCategory, categoryDialogs]);

    const handleSubFolderDelete = useCallback((folder: Parameters<typeof categoryDialogs.deleteSubFolder>[0]) => {
        if (!activeCategory) return;
        categoryDialogs.deleteSubFolder(folder, activeCategory.id, () => {
            setActiveSubFolderId((prev) => (prev === folder.id ? null : prev));
        });
    }, [activeCategory, categoryDialogs]);

    return (
        <PageLayout
            bannerTitle="Data Boards"
            containerStyle={{ marginBottom: 0 }}
            extra={
                <Box
                    display="flex"
                    alignItems="center"
                    sx={{ mt: '-24px', borderBottom: '1px solid', borderColor: 'divider' }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: '0 1 auto', overflow: 'hidden' }}>
                        <CategoryTabs
                            categories={categories}
                            activeId={activeCategoryId}
                            activeCount={total}
                            onChange={selectCategory}
                            onRename={categoryDialogs.renameCategory}
                            onDelete={handleCategoryDelete}
                        />
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    <Box display="flex" alignItems="center" gap={1} mb={0.5} ml={2}>
                        <IconButton
                            size="s"
                            variant="text"
                            type="secondary"
                            sx={{ flexShrink: 0 }}
                            onClick={(e: React.MouseEvent<HTMLElement>) => setCreateMenuAnchor(e.currentTarget)}
                        >
                            <Icon name="moreVert" />
                        </IconButton>
                        <Menu
                            anchorEl={createMenuAnchor}
                            open={Boolean(createMenuAnchor)}
                            onClose={() => setCreateMenuAnchor(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        >
                            <MenuItem
                                onClick={() => { setCreateMenuAnchor(null); categoryDialogs.createCategory(); }}
                                sx={{ fontSize: '14px', color: 'var(--color-light-7)', fontFamily: 'inherit' }}
                            >
                                {t('databoard_create_category', 'Create new Category')}
                            </MenuItem>
                        </Menu>
                        <Box sx={{ width: { xs: '160px', sm: '280px', md: '442px' } }}>
                            <Search
                                value={search}
                                onSearch={(val) => setSearch(val)}
                                onReset={() => setSearch('')}
                                placeholder={t('search')}
                                search={{
                                    containerStyle: { padding: 0, height: '40px' },
                                    iconButtonProps: { size: 'default' },
                                }}
                            />
                        </Box>
                        <Box sx={{ width: 40, height: 40, flexShrink: 0 }}>
                            <IconButton size="default" variant="contained" type="primary" onClick={handleNewBoard}>
                                <Icon name="add" />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            }
        >
            {activeCategory && (
                <SubFolderRow
                    subFolders={subFolders}
                    activeSubFolderId={activeSubFolderId}
                    onToggle={handleSubFolderToggle}
                    onCreate={handleSubFolderCreate}
                    onRename={categoryDialogs.renameSubFolder}
                    onDelete={handleSubFolderDelete}
                />
            )}

            <BoardGrid
                isLoading={isLoading}
                boards={pageBoards}
                schemas={allSchemas}
                search={search}
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                onRefresh={refetch}
                onCreateBoard={handleNewBoard}
            />

            {dialogHolder}
            {categoryDialogs.categoryDialogHolder}
        </PageLayout>
    );
};

export default DataboardsIndex;
