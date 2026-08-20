import { Typography } from '@imbrace/ui';
import type { CSSProperties, ReactNode } from 'react';

import styles from './index.module.scss';

interface EmptyStateProps {
    /** Illustration rendered below the text — usually an imported `.svg?react` component or <img>. */
    illustration: ReactNode;
    title: ReactNode;
    description?: ReactNode;
    /** Optional call-to-action (e.g. a button) shown under the illustration. */
    action?: ReactNode;
    /** Constrains the illustration width; defaults to 380px. */
    illustrationWidth?: number;
    className?: string;
    style?: CSSProperties;
}

/**
 * Centered empty-state placeholder: a title + optional description above an
 * illustration. Shared across AI Agents, Data Boards and the Knowledge Hub.
 */
const EmptyState = ({
    illustration,
    title,
    description,
    action,
    illustrationWidth = 380,
    className,
    style,
}: EmptyStateProps) => (
    <div className={`${styles.emptyState}${className ? ` ${className}` : ''}`} style={style}>
        <Typography variant="SubHeading2" className={styles.title}>
            {title}
        </Typography>
        {description && (
            <Typography variant="Body" className={styles.description}>
                {description}
            </Typography>
        )}
        <div className={styles.illustration} style={{ maxWidth: illustrationWidth }}>
            {illustration}
        </div>
        {action && <div className={styles.action}>{action}</div>}
    </div>
);

export default EmptyState;
