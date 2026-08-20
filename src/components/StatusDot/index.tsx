import { Typography } from '@mui/material';

import styles from './index.module.scss';

interface StatusDotProps {
    text?: string;
    statusType: API.StatusType;
    isFormBar?: boolean;
}
export const conversationStatusColor = {
    active: styles.active,
    closed: styles.closed,
    spam: styles.spam,
    'soon to be': styles.soon_to_be,
    overdue: styles.overdue,
    agent_needed: styles.rep_needed,
    'rep needed': styles.rep_needed,
    unassigned: styles.unassigned,
    pending: styles.pending,
    online: '',
};

const StatusDot = (props: StatusDotProps) => {
    const { text, statusType, isFormBar = false } = props;

    return (
        <div className={`${styles.status} ${conversationStatusColor[statusType]} ${isFormBar ? styles.sidebar : styles.bordered}`}>
            {isFormBar && <div className={`${styles.dot}`} />}
            <Typography
                sx={{
                    fontSize: '0.75rem',
                    lineHeight: '0.75rem',
                    ...(isFormBar && {
                        color: 'currentColor',
                        margin: '0 45px 0 2px',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                    }),
                }}
            >
                {text}
            </Typography>
        </div>
    );
};

export default StatusDot;
