import type { channelIconMapping } from '@imbrace/ui';
import { EllipsisText, Icon, Space, Typography } from '@imbrace/ui';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

const Overview = ({ stages, origin }: { stages?: string; origin?: API.OriginValue }) => {
    const { t } = useTranslation();

    const originField = useMemo(() => {
        if (origin) {
            const {
                type,
                data: { name, type: iconType },
            } = origin;
            return (
                <Space size={12} align="center" justify="center">
                    {type !== 'customized' && (
                        <div>
                            <Icon namespace="channel" name={iconType as keyof typeof channelIconMapping} fontSize={24} />
                        </div>
                    )}
                    <EllipsisText
                        text={`${name ?? '-'}`}
                        element={
                            <Typography
                                style={{
                                    color: !name ? 'var(--color-light-4)' : 'var(--color-light-7)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'break-word',
                                }}
                                variant="SubHeading2"
                            />
                        }
                    />
                </Space>
            );
        }
        return (
            <Typography variant="SubHeading2" style={{ color: 'var(--color-light-4)' }}>
                —
            </Typography>
        );
    }, [origin]);

    return (
        <div className={styles.overview}>
            <Space direction="vertical" align="stretch" size={8} className={styles.inner}>
                <Typography variant="SubHeading2">{t('hightlights')}</Typography>
                <Space size={16} direction="vertical" align="stretch">
                    <Space size={4} direction="vertical">
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('stages')}</Typography>
                        <Typography variant="SubHeading2" style={{ color: stages ? 'var(--color-light-7)' : 'var(--color-light-4)' }}>
                            {stages || '—'}
                        </Typography>
                    </Space>
                    <Space size={4} direction="vertical">
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('field_origin')}</Typography>
                        {originField}
                    </Space>
                </Space>
            </Space>
        </div>
    );
};

export default Overview;
