import { CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';
import { useSchemaVersions } from '@/services/queries/schema';

import styles from '../BoardSchemaDetail.module.scss';

const titleSx = {
    fontSize: 16,
    fontWeight: 800,
    color: 'var(--color-light-7)',
    textTransform: 'uppercase',
};
const drawerHeaderSx = {
    padding: '22px 30px 24px 35px !important',
    alignItems: 'flex-start !important',
};
const drawerContentSx = { padding: '0 !important', gap: '0 !important' };

const formatDate = (iso: string) => {
    try {
        return new Date(iso).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch {
        return iso;
    }
};

interface VersionsPanelProps {
    open: boolean;
    schemaId?: string;
    onClose: () => void;
}

const VersionsPanel = ({ open, schemaId, onClose }: VersionsPanelProps) => {
    const { t } = useTranslation();
    const versionsQuery = useSchemaVersions(open ? schemaId : undefined);
    const versions = versionsQuery.data?.data ?? [];

    return (
        <Drawer
            open={open}
            onClose={onClose}
            onBackdropClick={onClose}
            width="380px"
            className={styles.schemaSidePanel}
            headerSx={drawerHeaderSx}
            contentSx={drawerContentSx}
            title={
                <Typography component="span" sx={titleSx}>
                    {t('schema_version_history', 'Version History')}
                </Typography>
            }
        >
            <div className={styles.panelSection} style={{ padding: '0 30px 16px 35px', gap: 24, overflowY: 'auto', flex: 1 }}>
                {versionsQuery.isLoading ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                        <CircularProgress size={56} />
                        <span style={{ color: 'var(--color-secondary-3)', fontSize: 14 }}>{t('loading')}</span>
                    </div>
                ) : versions.length === 0 ? (
                    <span style={{ color: 'var(--color-light-5)', fontSize: 14 }}>
                        {t('schema_no_versions', 'No version history yet.')}
                    </span>
                ) : (
                    versions.map((v) => (
                        <div key={v.version} className={styles.versionItem}>
                            <div className={styles.versionLabel}>
                                {t('schema_version_label', 'Version {{n}}', { n: v.version })}
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div className={styles.versionTime}>{formatDate(v.created_at)}</div>
                                <div className={styles.versionBy}>
                                    {t('schema_version_by', 'By')}{' '}
                                    <span className={styles.versionAuthor}>{v.created_by_name || v.created_by || ''}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Drawer>
    );
};

export default VersionsPanel;
