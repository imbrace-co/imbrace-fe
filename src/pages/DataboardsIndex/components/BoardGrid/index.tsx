import { Button, Icon, Typography } from '@imbrace/ui';
import { Box, Skeleton } from '@mui/material';
import { useTranslation } from 'react-i18next';

import GridPagination from '@/components/GridPagination';
import type { DocumentSchema } from '@/pages/BoardSchema/types';

import BoardCard from '../BoardCard';

interface BoardGridProps {
    isLoading: boolean;
    boards: API.Board[];
    schemas: DocumentSchema[];
    search: string;
    /** 1-based current page. */
    page: number;
    /** Total number of pages across the active list. */
    pageCount: number;
    onPageChange: (page: number) => void;
    /** Number of records per page. */
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    onRefresh: () => void;
    onCreateBoard: () => void;
}

const CARD_MIN_HEIGHT = 228;

const BoardGrid = ({
    isLoading,
    boards,
    schemas,
    search,
    page,
    pageCount,
    onPageChange,
    pageSize,
    onPageSizeChange,
    onRefresh,
    onCreateBoard,
}: BoardGridProps) => {
    const { t } = useTranslation();

    // `calc(100% + 34px)` adds back the 34px bottom inset that PageLayout's .contentContainer
    // subtracts from its height (see components/PageLayout/index.module.scss). Without it the
    // sticky pagination only reached the true viewport bottom when the page content overflowed —
    // which happened to hinge on whether the 54px message bar was shown. Adding it lets `mt: auto`
    // pin the pagination flush at the bottom in every case, independent of the message bar.
    return (
        <Box pt={3} sx={{ minHeight: 'calc(100% + 34px)', display: 'flex', flexDirection: 'column' }}>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '13px',
                }}
            >
                {boards.length > 0
                    ? boards.map((board) => (
                          <BoardCard key={board.id} board={board} schemas={schemas} onRefresh={onRefresh} />
                      ))
                    : isLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} variant="rounded" height={CARD_MIN_HEIGHT} sx={{ borderRadius: '12px' }} />
                        ))
                      : null}
            </Box>

            {pageCount > 0 && (
                <Box
                    display="flex"
                    sx={{
                        mt: 'auto',
                        position: 'sticky',
                        bottom: 0,
                        zIndex: 1,
                        backgroundColor: '#fff',
                        py: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                    }}
                >
                    <GridPagination
                        page={page}
                        pageCount={pageCount}
                        onChange={onPageChange}
                        pageSize={pageSize}
                        onPageSizeChange={onPageSizeChange}
                    />
                </Box>
            )}

            {!isLoading && boards.length === 0 && (
                <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="center"
                    py={10}
                    gap={2}
                >
                    <Icon name="dataBoard" />
                    <Typography variant="Body" style={{ color: '#999' }}>
                        {search ? t('no_results_found') : 'No boards yet'}
                    </Typography>
                    {!search && (
                        <Button variant="contained" onClick={onCreateBoard} text={t('board_create_new_header')} />
                    )}
                </Box>
            )}
        </Box>
    );
};

export default BoardGrid;
