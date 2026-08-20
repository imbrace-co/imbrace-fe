import { Icon, IconButton, Typography, useDialog } from '@imbrace/ui';
import { Box, Card, CardActionArea, Menu, MenuItem } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MutableRefObject, RefObject } from 'react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import type { DocumentSchema } from '@/pages/BoardSchema/types';
import { BoardSetting } from '@/pages/Databoards/components/BoardSetting';
import { deleteBoard as deleteBoardApi } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { boardsQueryKey } from '@/services/queries/board';

import BoardCardPreview from './BoardCardPreview';
import type { VirtualAnchor } from './BoardCardPreview';

// Delay before the hover preview opens — long enough that quickly sweeping the cursor
// across many cards does not open (and fetch) anything.
const PREVIEW_HOVER_DELAY = 450;

const BoardCardIcon = ({ size = 18 }: { size?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color: 'var(--color-light-5)', flexShrink: 0 }}
    >
        <path
            d="M2 18C1.45 18 0.979167 17.8042 0.5875 17.4125C0.195833 17.0209 0 16.55 0 16V2.00002C0 1.45002 0.195833 0.979191 0.5875 0.587525C0.979167 0.195858 1.45 2.4418e-05 2 2.4418e-05H6.2C8 0 11.8 2.4418e-05 11.8 2.4418e-05H16C16.55 2.4418e-05 17.0208 0.195858 17.4125 0.587525C17.8042 0.979191 18 1.45002 18 2.00002V16C18 16.55 17.8042 17.0209 17.4125 17.4125C17.0208 17.8042 16.55 18 16 18H2ZM4 14H11V12H4V14ZM4 10H14V8.00002H4V10ZM4 6.00002H14V4.00002H4V6.00002Z"
            fill="currentColor"
        />
    </svg>
);

interface BoardCardProps {
    board: API.Board;
    schemas?: DocumentSchema[];
    onRefresh: () => void;
}

const BoardCard = ({ board, schemas = [], onRefresh }: BoardCardProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const navigateRef: MutableRefObject<ReturnType<typeof useNavigate>> = useRef(navigate);
    const tableRef: RefObject<FlexibleTableRef<API.BoardItem>> = useRef(null);
    const queryClient = useQueryClient();
    const [{ dialog }, dialogHolder] = useDialog();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const menuOpen = Boolean(anchorEl);

    // Hover preview state — anchored to the cursor position, opened after a short delay.
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [previewOpen, setPreviewOpen] = useState(false);
    // Virtual point-anchor at the cursor, frozen at open time so the popup stays put
    // (lets the user move the cursor into it). MUI Popper reads getBoundingClientRect.
    const [previewAnchor, setPreviewAnchor] = useState<VirtualAnchor | null>(null);

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    // Clear any pending timers on unmount so a delayed open/close never fires
    // after the card is gone (e.g. paging/searching).
    useEffect(() => () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    }, []);

    const handleMouseEnter = (e: React.MouseEvent) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            const { x, y } = mousePosRef.current;
            setPreviewAnchor({ getBoundingClientRect: () => new DOMRect(x, y, 0, 0) });
            setPreviewOpen(true);
        }, PREVIEW_HOVER_DELAY);
    };

    // Track the cursor until the popup opens, so it appears right where the pointer is.
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!previewOpen) mousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    // Delay the close so moving the cursor across the gap into the popup keeps it open.
    const scheduleClose = () => {
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        closeTimerRef.current = setTimeout(() => setPreviewOpen(false), 160);
    };

    const cancelClose = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };

    // Record count comes straight from the boards list payload (items_count) — no per-card fetch.
    const recordCount = board.items_count ?? 0;

    // Linked schema (yellow box) is driven by the board's from_schema_id matched against the schema list.
    const linkedSchema = board.from_schema_id
        ? schemas.find((s) => s.id === board.from_schema_id || s._id === board.from_schema_id)
        : undefined;

    const deleteMutation = useMutation({
        mutationFn: async () => {
            await apiFetch(deleteBoardApi.api(board.id), deleteBoardApi.method);
        },
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: boardsQueryKey({ types: 'General' }) });
            onRefresh();
        },
    });

    const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setPreviewOpen(false);
        setAnchorEl(e.currentTarget);
    };

    const handleMenuClose = () => setAnchorEl(null);

    const handleSettings = () => {
        handleMenuClose();
        dialog({
            title: '',
            paperSx: { width: '80%', maxWidth: '80%' },
            content: ({ onClose }) => (
                <BoardSetting
                    board={board}
                    fillLayout
                    onClose={onClose}
                    navigateRef={navigateRef}
                    setCurrentTab={(tab) => navigate(`/databoards/${tab}`, { replace: true })}
                    tableRef={tableRef}
                    onDeleteBoard={() => {
                        onClose?.();
                        onRefresh();
                    }}
                />
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
        });
    };

    const handleDelete = () => {
        handleMenuClose();
        dialog({
            title: t('board_delete_header'),
            content: t('board_delete_header_desc'),
            confirmText: t('delete'),
            confirmButtonProps: { type: 'danger' },
            cancelText: t('cancel'),
            onConfirm: async () => {
                try {
                    await deleteMutation.mutateAsync();
                    return true;
                } catch {
                    return false;
                }
            },
        });
    };

    return (
        <>
            <Card
                onMouseEnter={handleMouseEnter}
                onMouseMove={handleMouseMove}
                onMouseLeave={scheduleClose}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '12px',
                    minHeight: 228,
                    boxShadow:
                        '0 2px 16px 0 color-mix(in srgb, var(--color-light-3) 20%, transparent), 0 1px 8px 0 color-mix(in srgb, var(--color-light-4) 8%, transparent)',
                    transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        borderColor: '#C5D9FB',
                        boxShadow: '0 4px 14px rgba(21, 109, 242, 0.14)',
                    },
                }}
            >
                <CardActionArea
                    onClick={() => navigate(`/databoards/${board.id}`)}
                    sx={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        minHeight: 90,
                        p: 2,
                        pb: 1.5,
                        gap: 1,
                        // Disable the default gray hover/focus overlay; the Card's own hover (lift + border) is enough.
                        '& .MuiCardActionArea-focusHighlight': { display: 'none' },
                    }}
                >
                    {/* Header: icon + board name */}
                    <Box display="flex" alignItems="center" gap={1}>
                        <BoardCardIcon size={18} />
                        <Typography
                            variant="SubHeading2"
                            title={board.name}
                            style={{
                                color: 'var(--color-light-7)',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {board.name}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }} />

                    {/* Linked Schema section */}
                    {linkedSchema && (
                        <Box
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/document-models/${linkedSchema.id}`);
                            }}
                            sx={{
                                width: '100%',
                                bgcolor: '#fff8f0',
                                borderRadius: 1,
                                p: 2.5,
                                mt: 0.5,
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#ffeedd' },
                                transition: 'background-color 0.15s',
                            }}
                        >
                            <Typography
                                variant="Caption"
                                style={{
                                    color: 'var(--color-light-7)',
                                    fontWeight: 400,
                                    fontSize: 12,
                                    lineHeight: '130%',
                                    letterSpacing: 0,
                                    textTransform: 'capitalize',
                                }}
                            >
                                Linked Schema
                            </Typography>
                            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                                <Icon name="list" style={{ fontSize: 24, color: 'var(--color-light-8)', flexShrink: 0 }} />
                                <Typography
                                    variant="Body"
                                    style={{
                                        color: 'var(--color-primary-1)',
                                        fontWeight: 600,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 1,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {linkedSchema.name}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </CardActionArea>

                {/* Footer: record count + more options */}
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    px={2}
                    py={1}
                >
                    <Typography variant="Caption" style={{ color: 'var(--color-light-5)', fontWeight: 800, fontSize: 14, lineHeight: '145%', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        {`${recordCount} Records`}
                    </Typography>
                    <IconButton size="s" variant="text" type="secondary" onClick={handleMenuOpen}>
                        <Icon name="moreVert" />
                    </IconButton>
                </Box>
            </Card>

            <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <MenuItem onClick={handleSettings}>{t('crm_edit_board')}</MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                    {t('delete')}
                </MenuItem>
            </Menu>

            <BoardCardPreview
                board={board}
                anchorEl={previewAnchor}
                open={previewOpen && !menuOpen}
                onMouseEnter={cancelClose}
                onMouseLeave={scheduleClose}
            />

            {dialogHolder}
        </>
    );
};

// Memoized: the index re-renders on every search keystroke, but a card only needs to
// re-render when its own board/schemas/onRefresh change — keeps typing smooth with many cards.
export default memo(BoardCard);
