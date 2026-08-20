import { DropdownMenu, DropdownMenuItem, Icon, IconButton, Tooltip, Typography, useDialog } from '@imbrace/ui';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '@/contexts/SnackbarContext';
import { deleteUseCaseById, deleteUseCaseByIdV2 } from '@/services/api/ai';
import apiFetch from '@/services/axios/handler';
import { getIsAllowModify } from '@/utils/CookiesHelper';

import styles from './agentCard.module.scss';
import { useExportAIAgentDialog } from './useExportAIAgentDialog';

const AVATAR_PALETTE = [
    '#3F8EF7',
    '#7E57F0',
    '#C58A2B',
    '#3FA8A0',
    '#5BA63C',
    '#C2417B',
    '#1F8AC0',
    '#7BA02E',
    '#E07A2B',
    '#3D7DB4',
];

const hashString = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = (hash << 5) - hash + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

export const pickAvatarColor = (seed: string) => AVATAR_PALETTE[hashString(seed) % AVATAR_PALETTE.length];

export const getAvatarInitial = (title?: string) => {
    if (!title) return '?';
    const trimmed = title.trim();
    if (!trimmed) return '?';
    return trimmed.charAt(0).toUpperCase();
};

export interface AgentCardItem {
    id: string;
    title: string;
    description?: string;
    badgeLabel: string;
    avatarSeed?: string;
    thumbnailUrl?: string;
}

interface AgentCardProps {
    item: AgentCardItem;
    actionLabel: string;
    onSelect: () => void;
    onRemove?: () => void;
    onExport?: () => void;
    canDelete?: boolean;
    canExport?: boolean;
    showMenu?: boolean;
}

const AgentCard: React.FC<AgentCardProps> = ({
    item,
    actionLabel,
    onSelect,
    onRemove,
    onExport,
    canDelete = false,
    canExport = false,
    showMenu = false,
}) => {
    const { t } = useTranslation();
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(menuAnchorEl);

    const avatarColor = useMemo(() => pickAvatarColor(item.avatarSeed || item.id || item.title), [item.avatarSeed, item.id, item.title]);
    const initial = useMemo(() => getAvatarInitial(item.title), [item.title]);
    const [thumbnailErrored, setThumbnailErrored] = useState(false);
    const showThumbnail = !!item.thumbnailUrl && /^https?:\/\//.test(item.thumbnailUrl) && !thumbnailErrored;

    const closeMenu = useCallback(() => setMenuAnchorEl(null), []);
    // Anchor on the wrapper span — IconButton's own onClick handler from
    // @imbrace/ui sometimes intercepts/transforms the event, causing the
    // anchor to never get set.
    const openMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        e.preventDefault();
        setMenuAnchorEl(e.currentTarget);
    }, []);

    return (
        <>
            {showMenu && (
                <DropdownMenu
                    anchorEl={menuAnchorEl || undefined}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                    open={isMenuOpen}
                    onClose={closeMenu}
                    PaperProps={{ sx: { width: '120px' } }}
                >
                    {canExport && onExport && (
                        <DropdownMenuItem
                            onClick={(e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
                                e.stopPropagation();
                                closeMenu();
                                onExport();
                            }}
                        >
                            {t('ai_agent_use_case_menu_export')}
                        </DropdownMenuItem>
                    )}
                    {canDelete && onRemove && (
                        <DropdownMenuItem
                            color="var(--color-danger-1)"
                            onClick={(e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
                                e.stopPropagation();
                                closeMenu();
                                onRemove();
                            }}
                        >
                            {t('ai_agent_use_case_menu_remove')}
                        </DropdownMenuItem>
                    )}
                </DropdownMenu>
            )}

            <div className={styles.card} onClick={onSelect}>
                <div
                    className={styles.avatar}
                    style={{
                        background: showThumbnail ? '#F4F4F5' : avatarColor,
                        overflow: 'hidden',
                    }}
                >
                    {showThumbnail ? (
                        <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={() => setThumbnailErrored(true)}
                        />
                    ) : (
                        <Typography variant="Heading2" className={styles.avatarText}>
                            {initial}
                        </Typography>
                    )}
                </div>
                <div className={styles.body}>
                    <div className={styles.titleRow}>
                        <Typography variant="BodyBold" className={styles.title}>
                            {item.title}
                        </Typography>
                        {showMenu && ((canDelete && onRemove) || (canExport && onExport)) && (
                            <span
                                className={styles.menuButton}
                                onClick={openMenu}
                                role="button"
                                tabIndex={0}
                            >
                                <IconButton size="s" type="secondary" variant="text">
                                    <Icon style={{ color: '#828282' }} name="more" />
                                </IconButton>
                            </span>
                        )}
                    </div>
                    <Tooltip
                        title={item.description || ''}
                        placement="top"
                        arrow
                        disableHoverListener={!item.description}
                    >
                        <Typography variant="Body" className={styles.description}>
                            {item.description}
                        </Typography>
                    </Tooltip>
                    <div className={styles.footer}>
                        <Typography
                            variant="Body"
                            className={styles.action}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect();
                            }}
                        >
                            {actionLabel}
                        </Typography>
                        <Typography variant="Caption" className={styles.badge}>
                            {item.badgeLabel}
                        </Typography>
                    </div>
                </div>
            </div>
        </>
    );
};

interface UseCaseAgentCardProps {
    item: import('./UseCaseItem').UseCaseProps;
    onSelect: () => void;
    onRemoved?: () => unknown | Promise<unknown>;
}

export const UseCaseAgentCard: React.FC<UseCaseAgentCardProps> = ({ item, onSelect, onRemoved }) => {
    const { t } = useTranslation();
    const {
        _id,
        title,
        short_description,
        type,
        version,
        is_orchestrator,
        agent_type,
        assistant_id,
        thumbnail_url,
    } = item;
    const [{ dialog }, dialogHolder] = useDialog();
    const [{ dialog: exportDialog }, exportDialogHolder] = useDialog();
    const { notify } = useNotify();
    const isAllowModify = getIsAllowModify();
    const canDelete = isAllowModify && type === 'custom';
    const { canExport, openExportDialog } = useExportAIAgentDialog({ dialog: exportDialog, id: _id, name: title });

    const badgeLabel = useMemo(() => {
        if (is_orchestrator || agent_type === 'team_lead') return t('ai_agent_role_orchestrator');
        if (agent_type === 'document_ai') return t('ai_agent_filter_doc_agent', 'Doc Agent');
        if (assistant_id?.startsWith('builtin-')) return t('ai_agent_filter_built_in_agent', 'Built-in Agent');
        return t('ai_agent_filter_general_agent', 'General Agent');
    }, [agent_type, assistant_id, is_orchestrator, t]);

    const handleRemove = useCallback(() => {
        dialog({
            title: t('ai_agent_remove_dialog_title', { name: title || t('ai_agent_default_name') }),
            content: t('ai_agent_remove_dialog_desc'),
            confirmText: t('ai_agent_remove_confirm_text'),
            cancelText: t('ai_agent_remove_cancel_text'),
            confirmButtonProps: { type: 'danger' },
            onConfirm: async () => {
                try {
                    const isV2 = version === 2;
                    await apiFetch<{ message: string }>(
                        isV2 ? deleteUseCaseByIdV2.api(_id) : deleteUseCaseById.api(_id),
                        isV2 ? deleteUseCaseByIdV2.method : deleteUseCaseById.method,
                    );
                    notify({ type: 'success', message: t('ai_agent_delete_success') });
                    await onRemoved?.();
                } catch (error) {
                    console.error('Error:', error);
                    notify({ type: 'error', message: t('ai_agent_delete_fail') });
                }
                return true;
            },
        });
    }, [_id, dialog, notify, onRemoved, t, title, version]);

    return (
        <>
            {dialogHolder}
            {exportDialogHolder}
            <AgentCard
                item={{
                    id: _id,
                    title,
                    description: short_description,
                    badgeLabel,
                    avatarSeed: _id,
                    thumbnailUrl: thumbnail_url,
                }}
                actionLabel={t('ai_agent_use_case_menu_settings')}
                onSelect={onSelect}
                onRemove={handleRemove}
                onExport={openExportDialog}
                canDelete={canDelete}
                canExport={canExport}
                showMenu
            />
        </>
    );
};

export default AgentCard;
