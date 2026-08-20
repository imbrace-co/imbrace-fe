import type { Attachment } from '@imbrace/ui';
import type { FC } from 'react';
import { useEffect, useMemo, useState } from 'react';

import useAccess from '@/hooks/useAccess';
import type { MemberDetailProps } from '@/pages/Members/IMember.types';
import {
    fetchAllConversationContactCommentThunk,
    fetchContactByIdThunk,
    fetchConversationContactCommentThunk,
} from '@/redux/slices/contact';
import type { ReduxUser } from '@/redux/slices/member.types';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { postContactAvatar, putContactByIdV2 } from '@/services/api/contact';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import DetailDrawer from './detailDrawer';
import DetailModal from './detailModal';

const MemberDetail: FC<MemberDetailProps> = (props) => {
    const { user, isPresence, onFinish, isEditable, type = 'member', onClose, ...restProps } = props;
    const id = useAppSelector((state) => state.Account.id);
    const teamConversation = useAppSelector((state) => state.TeamConversation.teamConversation);
    const dispatch = useAppDispatch();
    const { isUnderRole } = useAccess();
    const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
    const [selectedProfileAvatar, setSelectedProfileAvatar] = useState<Attachment[]>();
    const commentChannelFilter = useAppSelector((state) => state.Contact.commentChannelFilter);

    const editable = useMemo(
        () => isEditable ?? (id === user?.id || (user && 'role' in user && isUnderRole(user?.role))),
        [isEditable, user, id, isUnderRole],
    );

    useEffect(() => {
        if (user?.id) {
            const promise = dispatch(fetchContactByIdThunk(user.id));
            return () => {
                promise.abort();
            };
        }
    }, [dispatch, user?.id, teamConversation?.id]);

    useEffect(() => {
        if (user?.id) {
            const promise = dispatch(
                fetchConversationContactCommentThunk({
                    channelTypes: commentChannelFilter,
                    contactId: user.id,
                }),
            );
            dispatch(
                fetchAllConversationContactCommentThunk({
                    contactId: user.id,
                }),
            );

            return () => {
                promise.abort();
            };
        }
    }, [dispatch, commentChannelFilter, user?.id]);

    const onEdit = async (formData: Partial<API.BaseContact>) => {
        try {
            let respData: ReduxUser | undefined = undefined;
            let updatedAvatarUrl;
            const updateAvatarUrl = selectedProfileAvatar?.filter((attachment) => attachment.status === 'ok');
            if (selectedProfileAvatar && updateAvatarUrl && updateAvatarUrl.length > 0 && updateAvatarUrl[0].file) {
                const avatarFormData = new FormData();
                avatarFormData.append('file', updateAvatarUrl[0].file);
                const { data } = await apiFetch<{ url: string }>(
                    postContactAvatar.api,
                    postContactAvatar.method,
                    avatarFormData,
                    ImbraceFileUpload,
                );
                updatedAvatarUrl = data.url;
            }
            if (type === 'user' && user) {
                const putContactByIdV2Api = putContactByIdV2.api(user.id);
                const { data } = await apiFetch<ReduxUser>(putContactByIdV2Api, putContactByIdV2.method, {
                    ...formData,
                    avatar_url: updatedAvatarUrl,
                });
                respData = data;
            }
            if (respData) {
                dispatch(fetchContactByIdThunk(respData.id));
                onFinish?.(respData);
            }
            setSelectedProfileAvatar(undefined);
            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    };

    const onSelectFile = async (files?: Attachment[]) => {
        setSelectedProfileAvatar(files);
    };

    return (
        <>
            <DetailDrawer
                editable={editable}
                onSelectFile={onSelectFile}
                setShowProfileModal={setShowProfileModal}
                selectedProfileAvatar={selectedProfileAvatar}
                setSelectedProfileAvatar={setSelectedProfileAvatar}
                onEdit={onEdit}
                onClose={onClose}
                user={user}
                isPresence={isPresence}
                {...restProps}
            />
            {/* for popup profile modal */}
            <DetailModal
                showProfileModal={showProfileModal}
                editable={editable}
                onSelectFile={onSelectFile}
                setShowProfileModal={setShowProfileModal}
                selectedProfileAvatar={selectedProfileAvatar}
                setSelectedProfileAvatar={setSelectedProfileAvatar}
                user={user}
                isPresence={isPresence}
                onEdit={onEdit}
            />
        </>
    );
};

export default MemberDetail;
