import { Button } from '@imbrace/ui';
import { Typography } from '@mui/material';
import moment from 'moment';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';
import useAccess from '@/hooks/useAccess';

import styles from './index.module.scss';

interface MessageTeamplateDetailDrawerProps {
    template?: {
        title: string;
        created_at: string;
        text: string;
    };
    onDelete: () => void;
    onEdit: () => void;
    deleting: boolean;
    title: string;
    onClose: () => void;
}
const MessageTeamplateDetailDrawer: FC<MessageTeamplateDetailDrawerProps> = (props) => {
    const { template, onDelete, onEdit, title, onClose, deleting, ...restProps } = props;
    const { isAdmin } = useAccess();
    const { t } = useTranslation();

    return (
        <Drawer title={title} onClose={onClose} {...restProps}>
            {template && (
                <div className={styles.templateDetail}>
                    <div className={styles.fieldsContainer}>
                        <div>
                            <Typography sx={{ color: '#828282' }}>{t('message_templates_table_header_title')}</Typography>
                            <Typography sx={{ fontWeight: 500 }}>{template.title}</Typography>
                        </div>
                        <div>
                            <Typography sx={{ color: '#828282' }}>{t('message_templates_table_header_createdat')}</Typography>
                            <Typography sx={{ fontWeight: 500 }}>{moment(template.created_at).format('DD/MM/yyyy')}</Typography>
                        </div>
                        <div className={styles.content}>
                            <Typography sx={{ color: '#828282' }}>{t('message_templates_table_header_content')}</Typography>
                            <div>
                                <Typography sx={{ fontWeight: 500, whiteSpace: 'pre-wrap' }}>{template.text}</Typography>
                            </div>
                        </div>
                    </div>

                    {isAdmin() && (
                        <div className={styles.footer}>
                            <Button variant="contained" text={t('message_templates_edit_template')} onClick={onEdit} />
                            <Button type="danger" text={t('message_templates_delete_template')} onClick={onDelete} />
                        </div>
                    )}
                </div>
            )}
        </Drawer>
    );
};
export default MessageTeamplateDetailDrawer;
