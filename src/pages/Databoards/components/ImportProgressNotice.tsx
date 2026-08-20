import { Space, Typography } from '@imbrace/ui';
import { LinearProgress } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type ImportProgressNotFound = {
    status: 'not_found';
    message?: string;
};

export type ImportProgressProcessing = {
    board_id: string;
    status: string;
    total: number;
    processed: number;
    success: number;
    failed: number;
    percentage?: string | number;
};

export type ImportProgressResponse = ImportProgressNotFound | ImportProgressProcessing;

const numberFmt = new Intl.NumberFormat();

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

export default function ImportProgressNotice({ progress }: { progress: ImportProgressProcessing }) {
    const { t } = useTranslation();

    const percent = useMemo(() => {
        const raw = progress.percentage;
        const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number.parseFloat(raw) : NaN;
        if (Number.isFinite(parsed)) return clamp(parsed, 0, 100);
        if (progress.total > 0) return clamp((progress.processed / progress.total) * 100, 0, 100);
        return 0;
    }, [progress.percentage, progress.processed, progress.total]);

    return (
        <Space direction="vertical" size={8} style={{ minWidth: 320 }}>
            <Typography variant="BodyBold">
                {t('crm_import_progress_title', { defaultValue: 'Importing data…' })}
            </Typography>
            <Typography variant="Body" style={{ color: 'var(--color-light-6)' }}>
                {t('crm_import_progress_stats', {
                    defaultValue: '{{processed}} / {{total}} processed • {{success}} success • {{failed}} failed',
                    processed: numberFmt.format(progress.processed ?? 0),
                    total: numberFmt.format(progress.total ?? 0),
                    success: numberFmt.format(progress.success ?? 0),
                    failed: numberFmt.format(progress.failed ?? 0),
                })}
            </Typography>
            <Space direction="horizontal" size={12} align="center">
                <div style={{ flex: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: 'var(--color-light-2)',
                            '& .MuiLinearProgress-bar': {
                                borderRadius: 999,
                            },
                        }}
                    />
                </div>
                <Typography variant="BodyBold" style={{ minWidth: 56, textAlign: 'right' }}>
                    {percent.toFixed(2)}%
                </Typography>
            </Space>
        </Space>
    );
}



