import { Icon, IconButton, Typography } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';

import { dialog } from '@/components/Dialog';
import RoleTag from '@/components/RoleTag';
import type { UserWithIndex } from '@/pages/Teams/components/TeamMembers/index';
import { useAppSelector } from '@/redux/store';
import { deleteTeamUsers } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

const TableRow = ({
    teamId,
    item,
    refresh,
}: // openDialog,
// handleDeleteField,
{
    teamId: string;
    item: UserWithIndex;
    refresh: () => void;
    openDialog: () => void;
    handleDeleteField: () => void;
}) => {
    const { t } = useTranslation();
    const currentUserId = useAppSelector((state) => state.Account.id);

    // const [toggleState, setToggleState] = useState<boolean>(false);

    // const showOnBoardHandler = async (fieldId: string, hiddenState: boolean, disableRefresh?: boolean) => {
    //     try {
    //         // await onUpdateFieldById(fieldId, hiddenState, disableRefresh);
    //     } catch (error) {
    //         console.error(error);
    //     }
    // };

    const onRemoveUser = async (userIDs: string[]) => {
        if (localStorage.getItem('dont_asked_remove_team_member_again') === 'true') {
            // handleDelete();
            return;
        }
        dialog({
            title: t('team_member_remove_member_title'),
            content: t('team_member_remove_member_content'),
            confirmText: t('team_member_remove_dialog_confirm'),
            showDontAskedAgain: true,
            confirmButtonProps: {
                type: 'danger',
            },
            actionsAlign: 'flex-end',
            onConfirm: async (dontAskedAgain) => {
                if (dontAskedAgain) {
                    localStorage.setItem('dont_asked_remove_team_member_again', 'true');
                }
                // await onRemoveUser([item.id]);
                try {
                    await apiFetch(deleteTeamUsers.api, deleteTeamUsers.method, {
                        team_id: teamId,
                        user_ids: userIDs,
                    });
                    // reload();
                    // setSelectedUsers([]);
                    refresh();
                } catch (error) {
                    console.error(error);
                }
            },
            onClose: () => {},
        });
    };

    return (
        <div key={item.id} onClick={() => {}} className={styles.tableRow}>
            <div>
                {item.id === currentUserId ? (
                    <Typography variant="Body" style={{ color: 'var(--color-primary-1)' }}>
                        {t('team_member_you_indicator')}
                    </Typography>
                ) : (
                    item.index
                )}
            </div>
            <div>
                <Typography variant="Body" style={{ color: 'var(--color-light-7' }}>
                    {item.first_name}
                </Typography>
            </div>
            <div>
                <Typography variant="Body" style={{ color: 'var(--color-light-7' }}>
                    {item.last_name}
                </Typography>
            </div>
            {/* Add Tag with dropdown */}
            <div>
                <RoleTag role={item.role} isTeamRole />
            </div>
            <div>
                <Typography variant="Body" style={{ color: 'var(--color-light-7' }}>
                    {item.email}
                </Typography>
            </div>
            <div>
                <IconButton
                    fontSize={16}
                    type="secondary"
                    variant="text"
                    size="xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemoveUser([item.id]);
                    }}
                >
                    <Icon name="personRemoveAltOutlined" fontSize={24} style={{ color: 'var(--color-light-4)' }} />
                </IconButton>
            </div>
        </div>
    );
};

export default TableRow;
