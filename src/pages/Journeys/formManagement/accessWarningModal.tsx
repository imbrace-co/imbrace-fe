import { Icon, List, Space, Typography } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';

const AccessWarningModal = ({ forms }: { forms: { name: string; _id: string }[] }) => {
    const { t } = useTranslation();
    return (
        <Space size={24} align="start" direction="vertical">
            <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                {t('journey_form_management_form_change_access_warning_desc')}
            </Typography>
            <div style={{ width: '100%', maxHeight: '203px' }}>
                <List
                    items={forms.map((form) => ({
                        text: form.name,
                        icon: <Icon name="form" style={{ fontSize: 24, color: 'var(--color-light-5)' }} />,
                    }))}
                />
            </div>
        </Space>
    );
};

export default AccessWarningModal;
