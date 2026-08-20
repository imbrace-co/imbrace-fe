import { Icon, IconButton, Space, Typography } from '@imbrace/ui';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

import { openDetailModal } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';

interface DuplicatedRecordProps {
    item: API.MeilisearchItem;
    crm?: boolean;
}

const DuplicatedRecord: React.FC<DuplicatedRecordProps> = ({ item, crm }) => {
    const { t } = useTranslation();
    const formatDate = (dateString: string): string => {
        return dayjs(dateString).format('MM/DD/YYYY hh:mm A');
    };

    return (
        <Space
            style={{
                width: '100%',
            }}
            size={12}
            direction="horizontal"
            align="stretch"
            justify="between"
        >
            <Space size={4} direction="vertical" justify="center" align="start">
                <Typography variant="BodyTight">{item.contact_name}</Typography>
                <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                    {t('created_at', { at: formatDate(item.created_at) })}
                </Typography>
            </Space>

            <IconButton
                variant="text"
                type="secondary"
                size="s"
                fontSize={24}
                onClick={(e) => {
                    const type: API.BoardType = 'Contacts';
                    const rowInfo = {
                        boardId: item.board_id,
                        boardItemId: item._id,
                        boardType: type,
                        editMode: false,
                    };
                    openDetailModal({
                        crm,
                        currentBoardInfo: rowInfo,
                    });
                }}
            >
                <Icon color="var(--color-light-4)" name="record" />
            </IconButton>
        </Space>
    );
};

export default DuplicatedRecord;
