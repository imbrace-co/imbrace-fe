import { Button, Icon, Typography } from '@imbrace/ui';
import CheckIcon from '@mui/icons-material/Check';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import styles from './setupProgress.module.scss';
import type { LinkedSchema } from './type';

export interface SetupStep {
    value: string;
    label: string;
}

interface SetupProgressProps {
    agentName: string;
    steps: SetupStep[];
    currentValue: string;
    furthestIndex: number;
    onStepClick: (value: string, index: number) => void;
    linkedSchemas: LinkedSchema[];
    onRemoveSchema?: (index: number) => void;
    // ---- edit-mode extras ----
    isEditMode?: boolean;
    description?: string;
    onDelete?: () => void;
    deleteDisabled?: boolean;
}

const SetupProgress = ({
    agentName,
    steps,
    currentValue,
    furthestIndex,
    onStepClick,
    linkedSchemas,
    onRemoveSchema,
    isEditMode = false,
    description,
    onDelete,
    deleteDisabled,
}: SetupProgressProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const currentIndex = steps.findIndex((s) => s.value === currentValue);

    return (
        <div className={styles.sidebar}>
            <Typography className={styles.title}>{agentName || t('ai_document_ai_title')}</Typography>

            {isEditMode && (
                <Typography variant="Body" className={styles.description}>
                    {description || t('ai_document_ai_desc')}
                </Typography>
            )}

            <Typography className={styles.sectionLabel}>
                {isEditMode ? t('ai_document_ai_agent_details') : t('ai_document_ai_setup_progress')}
            </Typography>

            <ul className={styles.steps}>
                {steps.map((step, index) => {
                    const isActive = index === currentIndex;
                    const isCompleted = index < currentIndex;
                    const isReachable = index <= furthestIndex;
                    return (
                        <li
                            key={step.value}
                            className={[
                                styles.step,
                                isEditMode ? styles.stepEdit : '',
                                isActive ? styles.active : '',
                                isCompleted ? styles.completed : '',
                                isReachable ? styles.reachable : styles.disabled,
                            ].join(' ')}
                            onClick={() => isReachable && onStepClick(step.value, index)}
                        >
                            {!isEditMode && (
                                <span className={styles.bullet}>
                                    {isCompleted ? <CheckIcon sx={{ fontSize: 14 }} /> : index + 1}
                                </span>
                            )}
                            <Typography className={styles.stepLabel}>{step.label}</Typography>
                        </li>
                    );
                })}
            </ul>

            <div className={styles.divider} />

            <Typography className={styles.sectionLabel}>{t('ai_document_ai_linked_schemas')}</Typography>
            {linkedSchemas.length ? (
                <ul className={styles.schemaList}>
                    {linkedSchemas.map((schema, index) => (
                        <li key={schema.local_id} className={styles.schemaItem}>
                            <Typography
                                variant="Body"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    // Click the schema name to open its Document Model detail page.
                                    cursor: schema.schema_id ? 'pointer' : 'default',
                                }}
                                onClick={
                                    schema.schema_id
                                        ? () => navigate(`/document-models/${schema.schema_id}`)
                                        : undefined
                                }
                            >
                                {schema.model_name}
                            </Typography>
                            {onRemoveSchema && (
                                <Icon
                                    name="close"
                                    fontSize={16}
                                    style={{ cursor: 'pointer', color: '#828282' }}
                                    onClick={() => onRemoveSchema(index)}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <Typography className={styles.noSchema}>{t('ai_document_ai_no_schema_linked')}</Typography>
            )}

            {isEditMode && onDelete && (
                <div className={styles.deleteWrap}>
                    <Button
                        type="danger"
                        variant="contained"
                        text={t('delete')}
                        onClick={onDelete}
                        disabled={deleteDisabled}
                        sx={{ width: '150px', height: '40px' }}
                    />
                </div>
            )}
        </div>
    );
};

export default SetupProgress;
