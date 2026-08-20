import { Button, Checkbox, DropdownMenu, DropdownMenuItem, Icon, IconButton, Space, Typography, useDialog } from '@imbrace/ui';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getIsAllowModify } from '@/utils/CookiesHelper';
import { useNotify } from '@/contexts/SnackbarContext';
import { deleteUseCaseById, deleteUseCaseByIdV2 } from '@/services/api/ai';
import apiFetch from '@/services/axios/handler';

import styles from './useCase.module.scss';
import { useExportAIAgentDialog } from './useExportAIAgentDialog';
import { sanitizeFileBaseName } from './aiAgentExportUtils';


export type UseCaseType = 'default' | 'custom';


export interface UseCaseProps {
    _id: string;
    title: string;
    shortDescription?: string;
    description?: string;
    features?: string[];
    thumbnail_url?: string;
    tags?: string[];
    video_url?: string;
    demoImageUrl?: string;
    short_description?: string;
    demo_url?: string;
    how_it_works?: Array<{ title: string; details: string[] }>;
    suggestion_prompts?: string[];
    supported_channels?: Array<{ title: string; icon: string }>;
    integrations?: Array<{ title: string; icon: string }>;
    is_create_new?: boolean;
    assistant_id?: string;
    type: UseCaseType;
    public_id: string;
    is_orchestrator?: boolean;
    agent_type?: string;
    version?: number;
    created_at?: string;
    updated_at?: string;
    channel_id?: string;
}

export const ExportAIAgentDialogContent = ({
    agentName,
    onClose,
    onConfirmExport,
}: {
    agentName: string;
    onClose?: () => void;
    onConfirmExport: () => Promise<boolean>;
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<1 | 2>(1);
    const [isExporting, setIsExporting] = useState(false);

    const exportFileName = useMemo(() => {
        const safe = sanitizeFileBaseName(agentName);
        return `${safe}.zip`;
    }, [agentName]);

    if (step === 2) {
        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                }}
            >
                <Space direction="vertical" align="start" size={16} style={{ width: '100%' }}>
                <Typography variant="Body" style={{ color: '#828282' }}>
                    {t('ai_agent_export_finalize_desc')}
                </Typography>

                <Space direction="vertical" align="start" size={6} style={{ width: '100%', marginTop: 4 }}>
                    <Typography variant="BodyBold" style={{ color: '#4F4F4F' }}>
                        {t('ai_agent_export_file_name_label')}
                    </Typography>
                    <Typography variant="Body" style={{ color: '#4F4F4F' }}>
                        {exportFileName}
                    </Typography>
                </Space>

                <Space justify="end" align="center" size={12} style={{ width: '100%', marginTop: 8 }}>
                    <Button
                        variant="outlined"
                        text={t('ai_agent_export_btn_back')}
                        onClick={() => setStep(1)}
                        sx={{ minWidth: '140px' }}
                        disabled={isExporting}
                    />
                    <Button
                        variant="contained"
                        text={t('ai_agent_export_btn_confirm_and_export')}
                        loading={isExporting}
                        onClick={() => {
                            if (isExporting) return;
                            setIsExporting(true);
                            onConfirmExport()
                                .then((ok) => {
                                    if (ok) onClose?.();
                                })
                                .finally(() => setIsExporting(false));
                        }}
                        sx={{ minWidth: '220px' }}
                    />
                </Space>
                </Space>
            </div>
        );
    }

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
            }}
        >
            <Space direction="vertical" align="start" size={16} style={{ width: '100%' }}>
            <Typography variant="Body" style={{ color: '#828282' }}>
                {t('ai_agent_export_select_components_desc')}
            </Typography>

            <Space direction="vertical" align="start" size={14} style={{ width: '100%', marginTop: 4 }}>
                <Space align="start" size={12} style={{ width: '100%' }}>
                    <Checkbox checked disabled />
                    <Space direction="vertical" align="start" size={2} style={{ width: '100%' }}>
                        <Typography variant="BodyBold">{t('ai_agent_export_component_agent_settings_title')}</Typography>
                        <Typography variant="Body" style={{ color: '#828282', fontSize: 12 }}>
                            {t('ai_agent_export_component_agent_settings_desc')}
                        </Typography>
                    </Space>
                </Space>

                <Space align="start" size={12} style={{ width: '100%' }}>
                    <Checkbox checked disabled />
                    <Space direction="vertical" align="start" size={2} style={{ width: '100%' }}>
                        <Typography variant="BodyBold">{t('ai_agent_export_component_workflow_title')}</Typography>
                        <Typography variant="Body" style={{ color: '#828282', fontSize: 12 }}>
                            {t('ai_agent_export_component_workflow_desc')}
                        </Typography>
                    </Space>
                </Space>

                <Space align="start" size={12} style={{ width: '100%' }}>
                    <Checkbox checked disabled />
                    <Space direction="vertical" align="start" size={2} style={{ width: '100%' }}>
                        <Typography variant="BodyBold">{t('ai_agent_export_component_kb_title')}</Typography>
                        <Typography variant="Body" style={{ color: '#828282', fontSize: 12 }}>
                            {t('ai_agent_export_component_kb_desc')}
                        </Typography>
                    </Space>
                </Space>

                <Space align="start" size={12} style={{ width: '100%' }}>
                    <Checkbox checked disabled />
                    <Space direction="vertical" align="start" size={2} style={{ width: '100%' }}>
                        <Typography variant="BodyBold">{t('ai_agent_export_component_data_boards_title')}</Typography>
                        <Typography variant="Body" style={{ color: '#828282', fontSize: 12 }}>
                            {t('ai_agent_export_component_data_boards_desc')}
                        </Typography>
                    </Space>
                </Space>
            </Space>

            <Space justify="end" align="center" size={12} style={{ width: '100%', marginTop: 8 }}>
                <Button variant="outlined" text={t('ai_agent_export_btn_cancel')} onClick={onClose} sx={{ minWidth: '140px' }} />
                <Button variant="contained" text={t('ai_agent_export_btn_next')} onClick={() => setStep(2)} sx={{ minWidth: '200px' }} />
            </Space>
            </Space>
        </div>
    );
};

const UseCaseItem: React.FC<{ item: UseCaseProps; onSelect: () => void; onRemoved?: () => unknown | Promise<unknown> }> = (props: {
    item: UseCaseProps;
    onSelect: () => void;
    onRemoved?: () => unknown | Promise<unknown>;
}) => {
    const { onSelect, onRemoved } = props;
    const { title, short_description, _id, type, version } = props.item;
    const [{ dialog }, dialogHolder] = useDialog();
    const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
    const isMenuOpen = Boolean(menuAnchorEl);
    const { t } = useTranslation();
    const { notify } = useNotify();
    const { openExportDialog } = useExportAIAgentDialog({ dialog, id: _id, name: title });
    const isAllowModify = getIsAllowModify();
    const canDelete = isAllowModify && type === 'custom';

    const onRemove = useCallback(() => {
        dialog({
            title: t('ai_agent_remove_dialog_title', { name: title || t('ai_agent_default_name') }),
            content: t('ai_agent_remove_dialog_desc'),
            confirmText: t('ai_agent_remove_confirm_text'),
            cancelText: t('ai_agent_remove_cancel_text'),
            confirmButtonProps: {
                type: 'danger',
            },
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
    }, [_id, dialog, isAllowModify, notify, onRemoved, t, title, type, version]);

    const closeMenu = useCallback(() => {
        setMenuAnchorEl(null);
    }, []);

    const onOpenMenu = useCallback((e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setMenuAnchorEl(e.currentTarget);
    }, []);

    return (
        <>
            {dialogHolder}
            <DropdownMenu
                anchorEl={menuAnchorEl || undefined}
                transformOrigin={{
                    horizontal: 'right',
                    vertical: 'top',
                }}
                anchorOrigin={{
                    horizontal: 'right',
                    vertical: 'bottom',
                }}
                open={isMenuOpen}
                onClose={closeMenu}
                PaperProps={{
                    sx: {
                        width: '116px',
                    },
                }}
            >
                <DropdownMenuItem
                    onClick={(e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
                        e.stopPropagation();
                        closeMenu();
                        onSelect();
                    }}
                >
                    {t('ai_agent_use_case_menu_settings')}
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
                        e.stopPropagation();
                        closeMenu();
                        openExportDialog();
                    }}
                >
                    {t('ai_agent_use_case_menu_export')}
                </DropdownMenuItem>
                {canDelete && (
                    <>
                        <div style={{ height: 1, background: 'var(--color-light-3)', margin: '4px 0' }} />
                        <DropdownMenuItem
                            color={'var(--color-danger-1)'}
                            onClick={(e: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
                                e.stopPropagation();
                                closeMenu();
                                onRemove();
                            }}
                        >
                            {t('ai_agent_use_case_menu_remove')}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenu>

            <div onClick={() => onSelect()}>
                <div className={styles.card}>
                    <div className={styles.editIcon} onClick={(e) => e.stopPropagation()}>
                        <IconButton
                            size="s"
                            type="secondary"
                            variant="text"
                            sx={{ fontSize: '24px' }}
                            onClick={onOpenMenu}
                        >
                            <Icon style={{ color: '#828282' }} name="more" />
                        </IconButton>
                    </div>
                    <div className={styles.titleContainer}>{title}</div>
                    <div className={styles.descriptionContainer}>
                        <div>{short_description}</div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default UseCaseItem;
