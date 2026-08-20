import 'simplebar-react/dist/simplebar.min.css';

import { FieldText, Typography } from '@imbrace/ui';
import { CircularProgress, ClickAwayListener } from '@mui/material';
import { format, isToday } from 'date-fns';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Linkify from 'react-linkify';
import SimpleBar from 'simplebar-react';

import { dialog } from '@/components/Dialog';
import ChipsLabel from '@/pages/Databoards/components/Conversations/ChipsLabel';
import ChipsSelectLabel from '@/pages/Databoards/components/Conversations/ChipsLabel/ChipsSelectLabel';
import CommentHeader from '@/pages/Databoards/components/Conversations/CommentCard/CommentHeader';
import styles from '@/pages/Databoards/components/Conversations/CommentCard/index.module.scss';
import clsx from '@/utils/clsx';

import { dummyComment } from '../../mock';

export type MessageCommentsSaveType = {
    id?: string;
    content: string;
    labels: string[];
};
interface CommentEditDetailType {
    handleClickSave: (formData?: MessageCommentsSaveType) => Promise<void>;
    onDeleteComment?: (id?: string) => Promise<void>;
    msgId?: string;
    contactId?: string;
    commentId?: string;
    teamId?: string;
    defaultEditing: boolean;
    readonly?: boolean;
}
export interface CommentEditDetailSave {
    onSave: () => void;
}

const CommentDetail = forwardRef<CommentEditDetailSave, CommentEditDetailType>((props, ref) => {
    const { handleClickSave, onDeleteComment, msgId, defaultEditing, readonly } = props;
    const { t } = useTranslation();
    const comment = dummyComment;
    const teamLabels = dummyComment.labels;
    const formRef = useRef<HTMLFormElement>(null);
    const [enableEdit, setEnableEdit] = useState<boolean>(defaultEditing);
    const [isShownAddLabel, setIsShownAddLabel] = useState<boolean>(false);
    const [isEditing, setIsEditing] = useState(false);

    useImperativeHandle(ref, () => ({
        onSave() {
            onSave();
        },
    }));

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors, isDirty },
        setValue,
        getValues,
        trigger,
    } = useForm<API.ConversationMessageComments>({
        mode: 'all',
        defaultValues: {
            content: comment.content || '',
            labels: comment.labels || [],
        },
    });
    const selectedLabels = watch('labels');

    /* Submit comment data and save */
    const onSubmit = async (formData: API.ConversationMessageComments) => {
        if (isDirty) {
            setIsEditing(true);
            if ((formData.content && formData.content.length > 0) || (formData.labels && formData.labels.length > 0)) {
                const labelsIds = [...Array.from(new Set(formData.labels.map(({ _id }) => _id)))];
                const tempFormData = {
                    id: comment?._id,
                    content: formData.content,
                    labels: labelsIds,
                };
                await handleClickSave(tempFormData);
            }

            setIsEditing(false);
        } else {
            await handleClickSave();
        }

        setIsShownAddLabel(false);
        setEnableEdit(false);
    };

    const onFinishEdit = () => {
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };

    const onSave = async () => {
        const isValidate = await trigger();
        if (isValidate) {
            formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    };

    /* delete, filter and add label */
    const onDeleteLabel = (key: string) => {
        const labels = getValues('labels');
        labels.splice(
            labels.findIndex((label: API.TeamConversationLabel) => label._id === key),
            1,
        );

        setValue('labels', labels, { shouldDirty: true });
    };

    const onAddLabel = (data: API.TeamConversationLabel) => {
        const labels = getValues('labels');
        const newLabels = [...Array.from(new Set([...labels, data]))];
        setValue('labels', newLabels, { shouldDirty: true });
    };

    /* delete confirm and do delete */
    const onDeleteDialogShow = async () => {
        const onDelete = async (dontAskAgain?: boolean) => {
            if (dontAskAgain) {
                window.localStorage.setItem('dont_asked_delete_comment_again', 'true');
            }
            await onDeleteComment?.(comment?._id);
            return true;
        };
        setIsEditing(true);
        const dontAskedAgain = window.localStorage.getItem('dont_asked_delete_comment_again');
        if (dontAskedAgain !== 'true') {
            await new Promise((resolve) => {
                dialog({
                    title: t('conversation_comment_delete_title'),
                    content: t('conversation_comment_delete_content'),
                    showDontAskedAgain: true,
                    confirmButtonProps: {
                        type: 'danger',
                    },
                    onConfirm: async (dontAskAgain) => {
                        await onDelete(dontAskAgain);
                        resolve(true);
                        return true;
                    },
                    onClose: () => {
                        resolve(false);
                    },
                });
            });
        } else {
            await onDelete();
        }
        setIsEditing(false);
    };

    /* comment content */
    const renderCommentContent = () => {
        const commentElement = (
            <Controller
                name={'content'}
                control={control}
                render={({ field }) => (
                    <FieldText
                        placeholder={t('conversation_comment_placeholder_edit')}
                        error={!!errors?.content}
                        helperText={errors?.content?.message}
                        multiline
                        rows={4}
                        fullWidth
                        formControlSx={{
                            height: '70%',
                        }}
                        bordered={false}
                        compact
                        autoFocus
                        {...field}
                    />
                )}
            />
        );

        if (enableEdit) {
            return commentElement;
        }
        return (
            <SimpleBar autoHide style={{ maxHeight: 60 }}>
                <div className={styles.conversationCommentsComment}>
                    <Linkify
                        componentDecorator={(decoratedHref, decoratedText, key) => (
                            <a target="_blank" rel="noreferrer" href={decoratedHref} key={key}>
                                {decoratedText}
                            </a>
                        )}
                    >
                        <Typography className={watch('content') ? styles.commentText : styles.commentNoText}>
                            {watch('content') ? watch('content') : t('conversation_comment_placeholder')}
                        </Typography>
                    </Linkify>
                </div>
            </SimpleBar>
        );
    };

    /* Label content */
    const renderLabelContent = () => {
        return (
            <ChipsLabel
                setIsShownAddLabel={setIsShownAddLabel}
                data={watch('labels') ?? comment.labels}
                editCommentMode
                onSave={onSave}
                onDeleteLabel={onDeleteLabel}
                onDeleteComment={onDeleteDialogShow}
                showDeleteIcon={comment && (comment.content.length > 0 || comment.labels.length > 0)}
                isFromConversation
                msgId={msgId}
                isShownAddLabel={isShownAddLabel}
                viewModalMode={readonly}
            />
        );
    };

    const renderTimestamp = useCallback(() => {
        if (comment.updated_at) {
            const time = comment.updated_at;
            if (isToday(new Date(time))) {
                return format(new Date(time), 'HH:mm');
            }

            return format(new Date(time), 'dd/MM/yyyy HH:mm');
        }
        if (comment.created_at) {
            const time = comment.created_at;
            if (isToday(new Date(time))) {
                return format(new Date(time), 'HH:mm');
            }

            return format(new Date(time), 'dd/MM/yyyy HH:mm');
        }
        return '';
    }, [comment]);

    const renderEditCommentContent = () => {
        return (
            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                <div
                    className={clsx(styles.card, styles.conversationCommentsCardEdit, styles.conversationCommentsCardShadow)}
                    style={{ border: '1px solid #e0e0e0', padding: '16px' }}
                >
                    {/* header */}
                    {!enableEdit && (
                        <CommentHeader
                            editCommentMode
                            isFromConversation
                            title={comment ? comment.from.display_name : ''}
                            time={renderTimestamp()}
                        />
                    )}
                    {/* comment */}
                    <div
                        className={clsx(styles.conversationCommentsComment, styles.noScrollbars)}
                        style={{ overflow: 'hidden scroll', padding: 0 }}
                    >
                        {renderCommentContent()}
                    </div>
                    {/* label */}
                    <div className={styles.conversationCommentsLabel}>{renderLabelContent()}</div>
                </div>
                {isShownAddLabel && (
                    <div className={clsx(styles.chipsAddLabelContainer, styles.chipsAddLabelConversationContainer)}>
                        <ChipsSelectLabel
                            data={teamLabels.filter((label) => selectedLabels.findIndex((sLabel) => sLabel._id === label._id) === -1)}
                            onAddLabel={onAddLabel}
                        />
                    </div>
                )}
            </form>
        );
    };

    const handleClickAway = () => {
        !isEditing && onFinishEdit();
    };

    const isLoading = false;

    return (
        <>
            {isLoading && (
                <div className={styles.loadingContainer}>
                    <CircularProgress size={'25px'} />
                </div>
            )}
            {enableEdit ? (
                <ClickAwayListener onClickAway={handleClickAway}>
                    <div className={isLoading ? styles.blur : ''} style={{ width: '414px' }}>
                        {renderEditCommentContent()}
                    </div>
                </ClickAwayListener>
            ) : (
                <div
                    className={isLoading ? styles.blur : ''}
                    style={{ width: '414px' }}
                    onClick={() => {
                        if (!readonly) {
                            setEnableEdit(true);
                        }
                    }}
                >
                    {renderEditCommentContent()}
                </div>
            )}
        </>
    );
});
export default CommentDetail;
