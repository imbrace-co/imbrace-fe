import { Button, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Box } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { push } from 'redux-first-history';

import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import IdentifierField from '@/pages/Databoards/components/BoardDetailedModal/IdentifierField';
import RecordID from '@/pages/Databoards/components/BoardDetailedModal/RecordID';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import store from '@/redux/store';
import { getTeamConversationUserByConversationID } from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';
import { ChannelInfo } from './ModalHeader';
import { ModalHeading, ProfileContainer } from './StyledComponents';

interface Props {
    currentBoard?: API.Board;
    selectedRowInfo?: CurrentBoardInfo;
    isEditMode: boolean;
    conversationIds?: string[];
    onClose?: () => void;
    crm?: boolean;
}

const GeneralModalHeader = (props: Props) => {
    const { currentBoard, selectedRowInfo, isEditMode, conversationIds, onClose, crm } = props;
    const { t } = useTranslation();
    const mode = isEditMode ? 'editMode' : 'viewMode';
    const [{ dialog }, dialogHolder] = useDialog();

    const { getValues } = useFormContext();

    const identifierField: API.BoardField | undefined = useMemo(() => {
        return currentBoard?.fields.find((field) => field.is_identifier);
    }, [currentBoard]);

    const handleNoPermissionNotify = (conversation: API.ConversationWithTeams) => {
        dialog({
            title: t('conversation_no_permission_to_access'),
            content: (
                <Space direction="vertical" size={24}>
                    <span>{t('conversation_no_permission_to_access_desc')}</span>
                    <div className={styles.conversations}>
                        <Space className={styles.container}>
                            <div className={styles.conversation}>
                                <div>{ChannelInfo[conversation.channel_type].icon}</div>

                                <EllipsisText text={conversation.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                            </div>
                            <div className={styles.team}>
                                <EllipsisText
                                    text={conversation.teams?.[0]?.name}
                                    style={{ fontSize: 12, color: 'var(--color-light-5)' }}
                                />
                            </div>
                        </Space>
                    </div>
                </Space>
            ),
            onConfirm: async () => {},
            onClose: () => {
                store.dispatch(push('/teams'));
                onClose?.();
            },
            actionsAlign: 'flex-end',
            confirmText: t('done'),
            cancelText: t('my_teams'),
        });
    };

    const goToChatroom = async () => {
        try {
            if (conversationIds && conversationIds.length > 0) {
                const { data } = await apiFetch<{
                    data: API.TeamConversationUserItem[];
                    conversation: API.ConversationWithTeams;
                }>(getTeamConversationUserByConversationID.api(conversationIds[0]), getTeamConversationUserByConversationID.method);
                if (data.data.length > 0) {
                    store.dispatch(push(`/chatroom?conv_id=${data.data[0].conversation_id}`));
                    onClose?.();
                } else {
                    handleNoPermissionNotify(data.conversation);
                }
            }
        } catch (error) {}
    };

    const renderUpdatedTime = () => {
        const dateString = getValues('record_updated_at') || getValues('record_created_at');
        if (!dateString) return format(new Date(), 'MM/dd/yyyy h:mm a');

        const date = parseISO(dateString);
        return format(date, 'MM/dd/yyyy h:mm a');
    };

    const renderIdentifierField = () => {
        if (!selectedRowInfo) return;
        // if (!identifierField) return currentBoard?.fields[0];
        return <IdentifierField mode={mode} identifierField={identifierField as Field} selectedRowInfo={selectedRowInfo} />;
    };

    return (
        <ProfileContainer>
            {dialogHolder}
            <ModalHeading>
                <>{renderIdentifierField()}</>
                <Space size={4}>
                    <Typography variant="BodyTight" style={{ color: 'var(--color-light-4)' }}>
                        {t('crm_last_updated')} {renderUpdatedTime()}
                    </Typography>
                    {conversationIds && conversationIds.length > 0 && (
                        <>
                            <Typography style={{ color: 'var(--color-light-4)' }}>|</Typography>
                            <Button
                                variant="link"
                                onClick={goToChatroom}
                                sx={{ fontWeight: 400 }}
                                text={
                                    <Space size={4}>
                                        <span>{t('conversation_chatroom')}</span>
                                        <Icon name="openNew" fontSize={16} />
                                    </Space>
                                }
                            />
                        </>
                    )}
                </Space>
            </ModalHeading>
            {selectedRowInfo?.boardItemId !== 'new' && (
                <Box sx={{ paddingRight: '16px', flex: 1, alignSelf: 'flex-end', textAlign: 'right' }}>
                    <RecordID boardId={selectedRowInfo?.boardId} boardItemId={selectedRowInfo?.boardItemId} crm={crm} />
                </Box>
            )}
        </ProfileContainer>
    );
};

export default GeneralModalHeader;
