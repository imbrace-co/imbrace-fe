import { TinyColor } from '@ctrl/tinycolor';
import { Button as ImbraceButton } from '@imbrace/ui';
import AttachmentIcon from '@mui/icons-material/Attachment';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import EmojiIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import clsx from '@/utils/clsx';

import styles from './index.module.scss';
import { StyledAvatar } from './StyleComponents';

interface ChatBoxProps {
    title: string;
    botName: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    welcomeMessage: string;
    windowLogo?: File | string;
    chatbotAvatar?: File | string;
    style?: React.CSSProperties;
    fontSize: string;
    headerColor: string;
}

const ChatBox: FC<ChatBoxProps> = (props) => {
    const {
        title,
        botName,
        primaryColor = '#fff',
        headerColor = '#fff',
        secondaryColor = '#f2f2f2',
        backgroundColor = '#ffffff',
        fontSize = '16',
        welcomeMessage,
        chatbotAvatar,
        windowLogo,
        style,
    } = props;
    const { t } = useTranslation();
    const [preview, setPreview] = useState<string>();
    const [avatarPreview, setAvatarPreview] = useState<string>();

    const textColor = (color: string) => (new TinyColor(color).isLight() ? '#333' : '#fff');
    const timestampColor = (color: string) => (new TinyColor(color).isLight() ? 'var(--color-light-4)' : 'var(--color-light-4)');

    useEffect(() => {
        if (typeof windowLogo === 'string') {
            setPreview(windowLogo);
            return;
        }
        let objectUrl: string;
        if (windowLogo instanceof File) {
            objectUrl = URL.createObjectURL(windowLogo);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }

        return () => URL.revokeObjectURL(objectUrl);
    }, [windowLogo]);

    useEffect(() => {
        if (typeof chatbotAvatar === 'string') {
            setAvatarPreview(chatbotAvatar);
            return;
        }

        let objectUrl: string;
        if (chatbotAvatar instanceof File) {
            objectUrl = URL.createObjectURL(chatbotAvatar);
            setAvatarPreview(objectUrl);
            return () => URL.createObjectURL(chatbotAvatar);
        }

        return () => URL.revokeObjectURL(objectUrl);
    }, [chatbotAvatar]);

    const buttonProps = {
        sx: {
            textTransform: 'none',
            justifyContent: 'flex-start',
            '&:hover': { background: primaryColor, '& .MuiTypography-root': { color: textColor(primaryColor) } },
            '& .MuiTypography-root': {
                textAlign: 'left',
                whiteSpace: 'normal',
                transition: 'color 250ms cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },
        borderRadius: '8px',
        boxShadow: false,
        fontSize: `${fontSize}px`,
    };

    return (
        <div className={styles.container} style={{ ...style }}>
            <div className={styles.header} style={{ background: headerColor }}>
                <div className={styles.iconContainer}>
                    <StyledAvatar
                        sx={{
                            width: 40,
                            height: 40,
                            '& svg': { fill: 'var(--color-light-1)' },
                        }}
                        src={preview}
                    />

                    <span style={{ color: textColor(headerColor) }}>
                        {title !== '' && title ? title : t('web_widget_title_placeholder')}
                    </span>
                </div>
                <div>
                    <CloseIcon sx={{ fill: textColor(headerColor) }} />
                </div>
            </div>
            <div className={styles.body} style={{ backgroundColor: backgroundColor }}>
                <div className={styles.messagesContainer}>
                    <div className={styles.receive}>
                        <div className={styles.chatUser}>
                            <StyledAvatar
                                sx={{
                                    width: 30,
                                    height: 30,
                                    backgroundColor: 'var(--color-light-2)',
                                    '& svg': { fill: 'var(--color-light-3)' },
                                }}
                                src={avatarPreview}
                            />

                            <span
                                style={{
                                    color: textColor('#ffffff'), //styleName: 1440/Body2;
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    lineHeight: '18px',
                                }}
                            >
                                {botName !== '' && botName ? botName : t('web_widget_bot_name_placeholder')}
                            </span>
                        </div>
                        <div className={clsx(styles.chatMessage, styles.agentMessage)}>
                            <div className={styles.textContainer} style={{ background: secondaryColor }}>
                                <span style={{ color: textColor(secondaryColor), fontSize: `${fontSize}px` }}>
                                    {welcomeMessage !== '' && welcomeMessage ? welcomeMessage : t('web_widget_welcome_message_placeholder')}
                                </span>
                                <span className={styles.time} style={{ color: timestampColor(secondaryColor), fontSize: `${fontSize}px` }}>
                                    09:41
                                </span>
                            </div>
                            <div className={styles.multipleChoices} style={{ '--font-size': `${fontSize}px` } as React.CSSProperties}>
                                <ImbraceButton
                                    {...buttonProps}
                                    sx={{
                                        ...buttonProps.sx,
                                        background: primaryColor,
                                        borderColor: primaryColor,
                                        height: '36px',
                                        padding: 'auto 0',
                                        textAlign: 'left',
                                    }}
                                    variant={'contained'}
                                    text={t('web_widget_question_one')}
                                />
                                <ImbraceButton
                                    {...buttonProps}
                                    sx={{
                                        height: '36px',
                                        padding: 'auto 0',
                                        textAlign: 'left',
                                        ...buttonProps.sx,
                                        opacity: 0.25,
                                        '&:disabled': {
                                            borderColor: primaryColor,
                                            color: primaryColor,
                                        },
                                    }}
                                    disabled
                                    variant={'outlined'}
                                    text={t('web_widget_question_two')}
                                />
                                <ImbraceButton
                                    {...buttonProps}
                                    sx={{
                                        height: 'auto',
                                        padding: 'auto 0',
                                        textAlign: 'left',
                                        ...buttonProps.sx,
                                        opacity: 0.25,
                                        '&:disabled': {
                                            borderColor: primaryColor,
                                            color: primaryColor,
                                        },
                                    }}
                                    disabled
                                    variant={'outlined'}
                                    text={t('web_widget_question_three')}
                                />
                                <ImbraceButton
                                    {...buttonProps}
                                    sx={{
                                        height: 'auto',
                                        padding: 'auto 0',
                                        textAlign: 'left',
                                        ...buttonProps.sx,
                                        opacity: 0.25,
                                        '&:disabled': {
                                            borderColor: primaryColor,
                                            color: primaryColor,
                                        },
                                    }}
                                    disabled
                                    variant={'outlined'}
                                    text={t('web_widget_question_four')}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={styles.send}>
                        <div className={clsx(styles.chatMessage, styles.clientMessage)}>
                            <div className={styles.textContainer} style={{ background: primaryColor }}>
                                <span style={{ color: textColor(primaryColor), fontSize: `${fontSize}px` }}>
                                    {' '}
                                    {t('web_widget_question_one')}
                                </span>
                                <span className={styles.time} style={{ color: timestampColor(primaryColor), fontSize: `${fontSize}px` }}>
                                    09:41
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={styles.footer} style={{ backgroundColor: backgroundColor }}>
                <div className={styles.inputContainer}>
                    <span className={styles.input}>{t('web_widget_default_input')}</span>
                    <span>
                        <EmojiIcon sx={{ color: 'var(--color-light-5)' }} />
                        <AttachmentIcon sx={{ color: 'var(--color-light-5)' }} />
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ChatBox;
