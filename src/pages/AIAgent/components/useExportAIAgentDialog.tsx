import { useCallback } from 'react';

import { useTranslation } from 'react-i18next';

import { useNotify } from '@/contexts/SnackbarContext';
import { postMarketPlaceUseCaseTemplate } from '@/services/api/marketplace';
import apiFetch from '@/services/axios/handler';

import { createSingleFileZipBlob, downloadBlob, sanitizeFileBaseName } from './aiAgentExportUtils';
import { ExportAIAgentDialogContent } from './UseCaseItem';

type DialogFn = (props: any) => void;

export const useExportAIAgentDialog = (params: { dialog: DialogFn; id?: string; name?: string }) => {
    const { dialog, id, name } = params;
    const { t } = useTranslation();
    const { notify } = useNotify();

    const canExport = Boolean(id);

    const onConfirmExport = useCallback(async () => {
        if (!id) return false;
        try {
            const payload = {
                name,
                id,
                type: 'use_case',
            };

            const res = await apiFetch<any>(postMarketPlaceUseCaseTemplate.api(), postMarketPlaceUseCaseTemplate.method, payload);

            const resources: any[] = res?.data?.data?.graph?.resources ?? [];
            const useCaseResources = resources.filter((r) => r?.type === 'use_case');
            const useCaseMetadata = useCaseResources.find((r) => r?.data?.agent_type === 'team_lead') ?? useCaseResources[0];

            if (!useCaseMetadata) {
                dialog({
                    title: t('ai_agent_export_missing_metadata_title', 'Use case metadata missing'),
                    content: t(
                        'ai_agent_export_missing_metadata_desc',
                        'No use case metadata was found in this agent. Please check the agent configuration and try again.',
                    ),
                    hideCancelButton: true,
                    confirmText: t('common_ok', 'OK'),
                });
                return false;
            }

            const baseName = sanitizeFileBaseName(name);
            const txtFileName = `${baseName}.txt`;
            const zipFileName = `${baseName}.zip`;
            const txtContent = JSON.stringify(res.data, null, 2);
            const zipBlob = createSingleFileZipBlob({
                filename: txtFileName,
                content: txtContent,
                comment: JSON.stringify(useCaseMetadata),
            });
            downloadBlob(zipBlob, zipFileName);

            notify({ type: 'success', message: t('ai_agent_export_success_toast') });
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            notify({ type: 'error', message: t('ai_agent_export_failed_toast') });
            return false;
        }
    }, [dialog, id, name, notify, t]);

    const openExportDialog = useCallback(() => {
        if (!id) return;
        dialog({
            title: t('ai_agent_export_dialog_title'),
            content: ({ onClose }: { onClose?: () => void }) => (
                <ExportAIAgentDialogContent
                    agentName={name || t('ai_agent_default_name')}
                    onClose={onClose}
                    onConfirmExport={onConfirmExport}
                />
            ),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: true,
            paperSx: {
                width: 560,
                maxWidth: 560,
            },
        });
    }, [dialog, id, name, onConfirmExport, t]);

    return { canExport, openExportDialog };
};

