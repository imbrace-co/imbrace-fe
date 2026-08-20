import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined';
import { IconButton } from '@mui/material';
import type { FC } from 'react';
import { useCallback, useContext, useState } from 'react';

import { CommentContext } from '@/pages/Conversations/components/CommentContext';
import styles from '@/pages/Conversations/components/Message/index.module.scss';
import type { MessageCommentsSaveType } from '@/pages/Databoards/components/Conversations/CommentCard/EditCommentDetail';
import {
    deleteConversationMessageComment,
    postConversationMessageComment,
    putConversationMessageComment,
} from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';

import CommentDetail from './commentDetail';

interface CommentMessageProps {
    comments?: API.ConversationMessageComments[];
    conversationId: string;
    msgId: string;
    viewMode: boolean;
    contactId?: string;
    teamId?: string;
}
const CommentMessage: FC<CommentMessageProps> = (props) => {
    const { comments, conversationId, msgId, viewMode, contactId, teamId } = props;
    const { onFinish } = useContext(CommentContext);
    const [editingComment, setEditingComment] = useState(false);

    const handleClickSave = async (formdata?: MessageCommentsSaveType) => {
        try {
            if (formdata?.id && comments && comments.length > 0) {
                const api = putConversationMessageComment.api(conversationId, formdata.id);
                await apiFetch(api, putConversationMessageComment.method, formdata);
                await onFinish?.();
            } else if (formdata) {
                const api = postConversationMessageComment.api(conversationId, msgId);
                await apiFetch(api, postConversationMessageComment.method, formdata);
                await onFinish?.();
            }
            setEditingComment(false);
        } catch (error) {
            console.log(error);
        }
    };

    const onDeleteComment = async (commentId?: string) => {
        try {
            if (commentId) {
                const res = await deleteComment(conversationId, commentId);
                if (res === undefined) {
                    return;
                }
                if (res.status === 201) {
                    await onFinish?.();
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const deleteComment = useCallback(async (convId: string, commentId: string) => {
        try {
            return await apiFetch(deleteConversationMessageComment.api(convId, commentId), deleteConversationMessageComment.method);
        } catch (error) {
            console.log('deleteComment error: ', error);
        }
    }, []);

    return (
        <>
            <div
                className={styles.commentMessageContent}
                style={{ width: editingComment || (comments && comments.length > 0) ? '414px' : '100%' }}
            >
                {(editingComment || (contactId && comments && comments.length > 0)) && (
                    <div style={{ marginTop: 8 }}>
                        <CommentDetail
                            handleClickSave={handleClickSave}
                            onDeleteComment={onDeleteComment}
                            msgId={msgId}
                            defaultEditing={editingComment}
                            commentId={comments?.[0]?._id}
                            contactId={contactId}
                            teamId={teamId}
                            readonly={viewMode}
                        />
                    </div>
                )}
                {((comments && comments.length <= 0) || !comments) && !editingComment && !viewMode && (
                    <div className={styles.commentIcon}>
                        <IconButton
                            sx={{ padding: '0 12px 4px 0', justifyContent: 'flex-start', marginTop: '5px' }}
                            disableRipple
                            onClick={() => {
                                setEditingComment(true);
                            }}
                            disabled={viewMode}
                        >
                            <MessageOutlinedIcon className={styles.commentIcon} sx={{ width: '32px' }} />
                        </IconButton>
                    </div>
                )}
            </div>
        </>
    );
};

export default CommentMessage;
