import { EllipsisText, FieldSelect, FieldText, Icon, IconButton, Tooltip } from '@imbrace/ui';
import { Divider, Typography } from '@mui/material';
import dayjs from 'dayjs';
import type { ChangeEvent, FC, ReactElement, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { FETCH_IN_PROGRESS, FETCH_SUCCEEDED } from '@/constants/app';
import { CONVERSATION_MODE } from '@/constants/conversation';
import { useInput } from '@/hooks/useInput';
import { fileUploadThunk, postMessageThunk, postVideoCallThunk } from '@/redux/slices/message';
import { onChangeWithMessageTemplate, resetMessageTemplate, setMessageCursorPosition } from '@/redux/slices/messageTemplates';
import { pushNotification } from '@/redux/slices/notification';
import { joinTeamConversationThunk } from '@/redux/slices/teamConversation';
import { resetSelectWhatsAppMessage } from '@/redux/slices/whatsAppTemplates';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import type { MessageListBodyRef } from '../MessageListBody';
import styles from './index.module.scss';
import { StyledIconButton } from './styles';
import Variable from './Variable';

interface MessageListInputProps {
    currentDrawer: string;
    setCurrentDrawer: (drawer: string) => void;
    messageListBodyRef: RefObject<MessageListBodyRef>;
    mode: string;
    insertedMessage?: { content: string; timestamp: number } | null;
    isInOverview?: boolean;
}

export type TemplateVariableType = Record<string, string | undefined>;

const MessageListInput: FC<MessageListInputProps> = (props) => {
    const { t } = useTranslation();
    const { currentDrawer, setCurrentDrawer, messageListBodyRef, mode, insertedMessage, isInOverview } = props;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dispatch = useAppDispatch();
    const teamConversation = useAppSelector((state) => state.TeamConversation.teamConversation);
    const channelState = teamConversation?.channel;
    const postMessageStatus = useAppSelector((state) => state.Message.postMessageStatus);
    const selectedMessageTemplate = useAppSelector((state) => state.MessageTemplates.selectedMessage);
    const selectedMessageTemplateDetail = useAppSelector((state) => state.MessageTemplates.templateDetail);
    const selectedWhatsAppMessageTemplate = useAppSelector((state) => state.WhatsAppMessageTemplates.selectedMessage);
    const selectedWhatsAppMessageTemplateDetail = useAppSelector((state) => state.WhatsAppMessageTemplates.selectedTemplateDetail);
    const [templateVariable, setTemplateVariable] = useState<TemplateVariableType>({});
    const [templateHasVariable, setTemplateHasVariable] = useState<boolean>(false);
    const [useManualKeyArray, setUseManualKeyArray] = useState<number[]>([]);
    const [messageMode, setMessageMode] = useState<string>(mode);
    const lastProcessedTimestampRef = useRef<number>(0);

    const [input, handleInputChange, resetInput, setInput] = useInput('');
    const inputRef = useRef<HTMLInputElement | null>(null);

    const isEmailMode = teamConversation?.channel_type === 'web' && teamConversation.contact.email && !teamConversation?.is_presence;

    const isOver24Hours = useMemo(() => {
        if (teamConversation?.channel_type !== 'whatsapp') {
            return false;
        }
        if (!teamConversation?.contacts_latest_message?.created_at) {
            return false;
        }

        return dayjs().diff(dayjs(teamConversation?.contacts_latest_message?.created_at), 'hour') > 24;
    }, [teamConversation]);

    useEffect(() => {
        setMessageMode(mode);
    }, [mode]);

    // Handle inserted message from iframe
    useEffect(() => {
        if (insertedMessage?.content && insertedMessage.timestamp !== lastProcessedTimestampRef.current) {
            setInput(insertedMessage.content);
            lastProcessedTimestampRef.current = insertedMessage.timestamp;
            // Focus on input after setting the message
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [insertedMessage, setInput, input]);

    useEffect(() => {
        if (postMessageStatus !== FETCH_IN_PROGRESS && inputRef.current) {
            inputRef.current.focus();
        }
        if (postMessageStatus === FETCH_SUCCEEDED) {
            messageListBodyRef.current?.scrollToBottom();
        }
    }, [postMessageStatus, messageListBodyRef]);

    const handleSubmitMessage = () => {
        if (teamConversation) {
            if (selectedWhatsAppMessageTemplate && selectedWhatsAppMessageTemplateDetail) {
                const variables: string[] = [];
                Object.keys(templateVariable).forEach((key) => {
                    variables[+key] = templateVariable[key] || '';
                });
                const templateData = {
                    id: selectedWhatsAppMessageTemplateDetail.id,
                    variables,
                };
                dispatch(
                    postMessageThunk({
                        teamConvId: teamConversation.id,
                        type: 'whatsapp.template',
                        text: templateData,
                    }),
                );
                dispatch(resetSelectWhatsAppMessage());
                setTemplateVariable({});
                return;
            }
            if (selectedMessageTemplate && selectedMessageTemplateDetail) {
                if (templateHasVariable) {
                    let postMessageString = '';
                    const inputTextArray: string[] = input.split(/{{\d+}}/);
                    inputTextArray.forEach((text, index) => {
                        postMessageString += text || '';
                        postMessageString += ' ';
                        postMessageString += templateVariable[index] || '';
                    });
                    dispatch(
                        postMessageThunk({
                            teamConvId: teamConversation.id,
                            type: 'message_template',
                            text: postMessageString,
                            templateId: selectedMessageTemplateDetail.id,
                        }),
                    );
                } else {
                    if (input.trim().length <= 0) {
                        return;
                    }
                    dispatch(
                        postMessageThunk({
                            teamConvId: teamConversation.id,
                            type: 'message_template',
                            text: input,
                            templateId: selectedMessageTemplateDetail.id,
                        }),
                    );
                }
                dispatch(resetMessageTemplate());
            } else {
                if (input.trim().length <= 0) {
                    return;
                }
                dispatch(postMessageThunk({ teamConvId: teamConversation.id, type: 'text', text: input }));
            }

            setTemplateVariable({});
            resetInput();
        }
    };

    const handleUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
        try {
            const file = event?.target?.files?.[0];
            if (file && teamConversation) {
                const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
                if (file.size / 1000 / 1000 >= 20) {
                    const notificationPayload = {
                        message: t('validation_file_size', { size: '20 MB' }),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));

                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                    return;
                }

                const formData = new FormData();
                formData.append('file', file);

                const { url } = await dispatch(fileUploadThunk(formData)).unwrap();
                const filename = file?.name?.replace(/\.[^/.]+$/, '') || '';
                if (url) {
                    dispatch(postMessageThunk({ teamConvId: teamConversation.id, type: fileType, text: url, filename }));
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            }
        } catch (error) {
            console.log(error);
        }
    };

    const initVDOCall = () => {
        teamConversation && dispatch(postVideoCallThunk(teamConversation.id));
    };

    const renderMessageTemplateIcon = () => {
        switch (teamConversation?.channel_type) {
            case 'whatsapp':
                return (
                    <div>
                        <IconButton
                            variant="text"
                            type={currentDrawer === 'whatsapp' ? 'primary' : 'secondary'}
                            onClick={() => setCurrentDrawer(currentDrawer === 'whatsapp' ? 'closed' : 'whatsapp')}
                            disabled={!channelState?.active || channelState?.is_deleted}
                        >
                            <Tooltip title={t('messagelist-input-whatsapp')} placement="top" arrow>
                                <div>
                                    <Icon name="whatsapp" />
                                </div>
                            </Tooltip>
                        </IconButton>
                    </div>
                );

            // case 'facebook':
            //     return (
            //         <StyledIconButton>
            //             <FacebookIcon />
            //         </StyledIconButton>
            //     );

            default:
                return <div></div>;
        }
    };

    // WhatsApp Template Variable and Message Template to Component
    const convertVariableToComponent = (textArray: string[], fromType: string) => {
        if (teamConversation) {
            const result: ReactElement[] = [];
            let variableNum = 0;
            textArray.forEach((text, index) => {
                if (index === textArray.length - 1) {
                    result.push(
                        <Typography
                            component={'span'}
                            key={`text-${index}`}
                            sx={{
                                color: 'var(--color-light-8)',
                                fontSize: '14px',
                                fontWeight: 400,
                                lineHeight: '20px',
                            }}
                        >
                            {text}
                        </Typography>,
                    );
                    return;
                }
                result.push(
                    <Typography
                        component={'span'}
                        key={`text-${index}`}
                        sx={{
                            color: 'var(--color-light-8)',
                            fontSize: '14px',
                            fontWeight: 400,
                            lineHeight: '20px',
                        }}
                    >
                        {text}
                    </Typography>,
                );
                result.push(
                    <Variable
                        key={
                            fromType === 'web'
                                ? `${selectedMessageTemplateDetail?.id}_text-${index}`
                                : `${selectedWhatsAppMessageTemplateDetail?.id}-variable-${index}`
                        }
                        variableNum={variableNum}
                        templateVariable={templateVariable}
                        onChange={setTemplateVariable}
                        contact={teamConversation.contact}
                        setUseManualKeyArray={setUseManualKeyArray}
                        useManualKeyArray={useManualKeyArray}
                    />,
                );
                variableNum += 1;
            });
            return result;
        }
        return null;
    };

    /**
     *   if no use whatapp message template
     *   and message template not has variable
     *   will use DefaultInputArea
     * */

    const renderDefaultInputArea = () => {
        return (
            <Tooltip
                title={
                    !channelState?.active || channelState?.is_deleted
                        ? t('error_response_invalid_channel')
                        : isOver24Hours
                        ? t('error_response_whatsapp_over_24hours')
                        : ''
                }
                sx={{ '& .MuiTooltip-tooltip': { maxWidth: 500 } }}
                placement="top"
                arrow
            >
                <div className={styles.conversationInputArea} style={{ fontSize: '30px' }}>
                    <FieldSelect
                        request={async () => [
                            {
                                text: <Trans i18nKey="conversation_mode_manual" t={t} />,
                                value: CONVERSATION_MODE.MANUAL,
                            },
                            {
                                text: <Trans i18nKey="conversation_mode_automation" t={t} />,
                                value: CONVERSATION_MODE.AUTOMATION,
                            },
                            {
                                text: <Trans i18nKey="conversation_mode_hybrid" t={t} />,
                                value: CONVERSATION_MODE.HYBRID,
                            },
                        ]}
                        fullWidth
                        value={messageMode}
                        onChange={async (value) => {
                            if (value === mode) return;
                            if (teamConversation) {
                                dispatch(joinTeamConversationThunk({ teamConvId: teamConversation?.id, mode: value || '' }));
                                setMessageMode(value || '');
                            }
                        }}
                    />
                    <FieldText
                        inputRef={inputRef}
                        fullWidth={true}
                        value={input}
                        notched={false}
                        onChange={(event) => {
                            handleInputChange(event);
                            dispatch(onChangeWithMessageTemplate(event.target.value));
                        }}
                        multiline={true}
                        rows={6}
                        autoFocus
                        onBlur={(event) => {
                            dispatch(setMessageCursorPosition(event.target.selectionStart));
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && event.shiftKey) {
                                event.preventDefault();
                                const message = input + '\r\n';
                                setInput(message);
                                return;
                            }
                            if (event.key === 'Enter') {
                                if (
                                    (teamConversation?.channel_type === 'web' && isEmailMode) ||
                                    teamConversation?.channel_type === 'email'
                                ) {
                                    return;
                                }
                                event.preventDefault();
                                handleSubmitMessage();
                                return;
                            }
                        }}
                        disabled={
                            postMessageStatus === 'FETCH_IN_PROGRESS' ||
                            !channelState?.active ||
                            channelState?.is_deleted ||
                            isOver24Hours ||
                            mode === CONVERSATION_MODE.AUTOMATION
                        }
                    />
                </div>
            </Tooltip>
        );
    };

    /**
     * when use template will need InputHeader to clear message
     * @param header -> header name
     * @param fromType -> web or whatapp
     * @returns InputHeader
     */
    const renderInputHeader = (header: string, fromType: string) => {
        return (
            <div className={styles.tag}>
                <Typography variant="body2" sx={{ lineHeight: '18px' }}>
                    {header}
                </Typography>

                <StyledIconButton
                    onClick={() => {
                        if (fromType === 'whatsapp') {
                            dispatch(resetSelectWhatsAppMessage());
                        } else {
                            dispatch(resetMessageTemplate());
                        }

                        resetInput();
                    }}
                    disableRipple
                    sx={{ padding: 0, color: 'white', fontSize: 18 }}
                >
                    <Icon name="close" />
                </StyledIconButton>
            </div>
        );
    };

    /**
     *
     * @returns default message or message template or whatapp message template
     */
    const renderInputArea = () => {
        if (selectedWhatsAppMessageTemplate && teamConversation?.channel_type === 'whatsapp') {
            return (
                <div className={styles.template}>
                    {renderInputHeader(t('conversation_whatsapp_templates_header'), teamConversation?.channel_type)}
                    <div className={styles.whatsAppTemplate} tabIndex={0}>
                        <div className={styles.container}>
                            <div className={styles.inner}>
                                {convertVariableToComponent(selectedWhatsAppMessageTemplate.split(/{{\d+}}/), 'whatapp')}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        if (selectedMessageTemplate && templateHasVariable) {
            return (
                <div className={styles.template}>
                    {renderInputHeader(t('conversation_message_templates_header'), 'web')}
                    <div className={styles.whatsAppTemplate} tabIndex={0}>
                        <div className={styles.container}>
                            <div className={styles.inner}>
                                {convertVariableToComponent(selectedMessageTemplate.split(/{{\d+}}/), 'web')}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return renderDefaultInputArea();
    };

    /* selected Template Initial setting setInput setTemplateVariable */
    useEffect(() => {
        const variables: TemplateVariableType = {};
        let variableNum = 0;
        if (selectedMessageTemplate) {
            const hasVariable: boolean = selectedMessageTemplate.match(/{{\d+}}/i) === null ? false : true;
            if (hasVariable) {
                const textArray: string[] = selectedMessageTemplate.split(/{{\d+}}/);
                textArray.forEach((text, index) => {
                    if (index !== textArray.length - 1 && selectedMessageTemplate.match(/{{\d+}}/i)) {
                        variables[variableNum] = '';
                        variableNum += 1;
                    }
                });
            }
            setInput(selectedMessageTemplate);
            setTemplateHasVariable(hasVariable);
            setTemplateVariable(variables);
            // dispatch(resetSelectMessage());
        } else if (!insertedMessage?.content) {
            resetInput();
        }

        if (selectedWhatsAppMessageTemplate) {
            setInput(selectedWhatsAppMessageTemplate);
            const textArray: string[] = selectedWhatsAppMessageTemplate.split(/{{\d+}}/);
            textArray.forEach((text, index) => {
                if (index !== textArray.length - 1) {
                    variables[variableNum] = '';
                    variableNum += 1;
                }
            });
            setTemplateVariable(variables);
            dispatch(resetMessageTemplate());
        }
    }, [dispatch, resetInput, selectedMessageTemplate, selectedWhatsAppMessageTemplate, setInput, insertedMessage]);

    /* WhatsAppMessageTemplate */
    useEffect(() => {
        if (selectedWhatsAppMessageTemplate && templateVariable && Object.keys(templateVariable).length !== 0) {
            let msg = selectedWhatsAppMessageTemplate;
            Object.keys(templateVariable).forEach((key) => {
                if (templateVariable[key]) {
                    msg = msg.replace(`{{${key}}}`, templateVariable[key] || '');
                }
            });
            setInput(msg);
        }
    }, [templateVariable, setInput, selectedWhatsAppMessageTemplate, t, selectedMessageTemplate, templateHasVariable, useManualKeyArray]);

    return (
        <div className={styles.messageListInputRoot}>
            {renderInputArea()}
            <div className={`${styles.messageListInputToolBarRoot} ${mode === CONVERSATION_MODE.AUTOMATION && styles.messageToolDisable}`}>
                <div className={styles.messageListInputToolbar}>
                    <input
                        ref={fileInputRef}
                        accept="image/*,application/pdf"
                        id="imbrace-chatroom-file-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleUploadFile}
                    />
                    <IconButton
                        type="secondary"
                        variant="text"
                        onClick={() => {
                            fileInputRef.current?.click();
                        }}
                        disabled={!channelState?.active || channelState?.is_deleted || isOver24Hours}
                    >
                        <Tooltip title={t('attach')} placement="top" arrow>
                            <div>
                                <Icon name="attachFile" />
                            </div>
                        </Tooltip>
                    </IconButton>
                    <Divider orientation="vertical" flexItem variant="middle" />
                    {!isInOverview && (
                        <div>
                            <IconButton
                                variant="text"
                                type={currentDrawer === 'message' ? 'primary' : 'secondary'}
                                onClick={() => setCurrentDrawer(currentDrawer === 'message' ? 'closed' : 'message')}
                                disabled={!channelState?.active || channelState?.is_deleted || isOver24Hours}
                            >
                                <Tooltip title={t('messagelist-input-message')} placement="top" arrow>
                                    <div>
                                        <Icon name="stickyNote2Outlined" />
                                    </div>
                                </Tooltip>
                            </IconButton>
                        </div>
                    )}

                    {renderMessageTemplateIcon()}
                    <div>
                        <IconButton
                            type="secondary"
                            variant="text"
                            onClick={initVDOCall}
                            disabled={!channelState?.active || channelState?.is_deleted || isOver24Hours}
                        >
                            <Tooltip title={t('messagelist-input-videocall')} placement="top" arrow>
                                <div>
                                    <Icon name="videoCall" />
                                </div>
                            </Tooltip>
                        </IconButton>
                    </div>
                </div>
                <div className={styles.sendContainer}>
                    {isEmailMode && (
                        <EllipsisText
                            style={{
                                color: 'var(--color-light-4)',
                                fontSize: 14,
                            }}
                            text={t('conversation_email_fallback')}
                        />
                    )}

                    <IconButton
                        disabled={
                            selectedWhatsAppMessageTemplate || selectedMessageTemplate
                                ? Object.entries(templateVariable).filter(([, value]) => !value).length !== 0 ||
                                  postMessageStatus === 'FETCH_IN_PROGRESS' ||
                                  !channelState?.active ||
                                  channelState?.is_deleted ||
                                  (isOver24Hours && !selectedWhatsAppMessageTemplate)
                                : postMessageStatus === 'FETCH_IN_PROGRESS' ||
                                  !channelState?.active ||
                                  channelState?.is_deleted ||
                                  isOver24Hours
                        }
                        variant="text"
                        onClick={() => handleSubmitMessage()}
                        loading={postMessageStatus === 'FETCH_IN_PROGRESS'}
                    >
                        <Tooltip title={t('messagelist-input-send')} placement="top" arrow>
                            <div>
                                <Icon name="send" />
                            </div>
                        </Tooltip>
                    </IconButton>
                </div>
            </div>
        </div>
    );
};

export default MessageListInput;
