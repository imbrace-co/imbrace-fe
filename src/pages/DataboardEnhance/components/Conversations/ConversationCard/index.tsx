import { Button, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Popover } from '@mui/material';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';
import { push } from 'redux-first-history';

import store from '@/redux/store';

import styles from './index.module.scss';

const getSafeContentText = (text: unknown): string => {
    return typeof text === 'string' ? text : 'Wrong type of text';
};

const TeamTag = ({
    index,
    team,
    setTagWidths,
}: {
    index: number;
    team: API.Team;
    setTagWidths: (callback: (prevTagWidths: number[]) => number[]) => void;
}) => {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const target = ref.current;
        if (target) {
            setTagWidths((prev: number[]) => {
                const newWidths = [...prev];
                newWidths[index] = target.getBoundingClientRect().width;
                return newWidths;
            });
        }
    }, [index, setTagWidths]);

    return (
        <div ref={ref} className={styles.team}>
            <EllipsisText text={team.name} style={{ maxWidth: '250px', fontSize: 12, color: 'var(--color-light-5)' }} />
        </div>
    );
};

export const TeamTags = ({ teams }: { teams?: API.Team[] }) => {
    const [tagContainerWidth, setTagContainerWidth] = useState(0);
    const [tagWidths, setTagWidths] = useState<number[]>([]);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const visiblePart = useMemo(() => {
        if (teams) {
            let index = 0;
            let width = 0;
            while (width <= 250 && index < teams.length) {
                if (tagWidths[index]) {
                    if (index === teams?.length - 1) {
                        width += tagWidths[index];
                    } else {
                        width += tagWidths[index] + 4;
                    }
                }

                if (width <= 250) {
                    index += 1;
                }
            }
            return index;
        }
        return undefined;
    }, [tagWidths, teams]);

    const more = useMemo(() => {
        if (teams && teams.length > 0 && visiblePart) {
            return teams.length - visiblePart;
        }
        return undefined;
    }, [visiblePart, teams]);

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        if (more) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    return (
        <Space
            onMouseEnter={handlePopoverOpen}
            size={4}
            containerRef={(ref) => {
                if (ref) {
                    if (ref.getBoundingClientRect().width !== tagContainerWidth) {
                        setTagContainerWidth(ref.getBoundingClientRect().width);
                    }
                }
            }}
        >
            <div className={styles.teams}>
                {teams?.slice(0, visiblePart)?.map((team, index) => (
                    <TeamTag key={team._id} team={team} index={index} setTagWidths={setTagWidths} />
                ))}
            </div>
            {more && (
                <div>
                    <Typography variant="Caption">{`+${more}`}</Typography>
                </div>
            )}
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handlePopoverClose}
                anchorOrigin={{
                    vertical: 'center',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 8,
                }}
                slotProps={{
                    paper: {
                        sx: {
                            width: tagContainerWidth + 16 || '220px',
                            overflow: 'hidden',
                            padding: '8px',
                            marginTop: '4px',
                            boxShadow: '0px 16px 24px 0px rgba(224, 224, 224, 0.20), 0px 0px 4px 0px rgba(224, 224, 224, 0.88)',
                        },
                    },
                }}
            >
                <Scrollbars autoHeight autoHide autoHeightMax={68}>
                    <Space
                        size={4}
                        wrap
                        align="start"
                        style={{
                            width: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        {teams?.map((team) => (
                            <div key={team._id} className={styles.teamTag}>
                                <EllipsisText
                                    element={<Typography variant="Caption" style={{ color: 'var(--color-light-5)' }} />}
                                    text={team.name}
                                />
                            </div>
                        ))}
                    </Space>
                </Scrollbars>
            </Popover>
        </Space>
    );
};

const ConversationCard = ({ contactConversation, onClose }: { contactConversation: API.ContactConversation; onClose?: () => void }) => {
    const { t } = useTranslation();
    const [tagContainerWidth, setTagContainerWidth] = useState(0);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);
    const [{ dialog }, dialogHolder] = useDialog();

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {
        if (contactConversation.teams.length > 1) {
            setAnchorEl(event.currentTarget);
        }
    };

    const handleNoPermissionNotify = () => {
        dialog({
            title: t('conversation_no_permission_to_access'),
            content: (
                <Space direction="vertical" size={24}>
                    <span>{t('conversation_no_permission_to_access_desc')}</span>
                    <div className={styles.conversations}>
                        <Space className={styles.container}>
                            <div className={styles.conversation}>
                                <div>
                                    {contactConversation.conversation && (
                                        <Icon
                                            namespace="channel"
                                            name={contactConversation.conversation.channel_type}
                                            style={{ fontSize: 24 }}
                                        />
                                    )}
                                </div>

                                <EllipsisText
                                    text={contactConversation.conversation?.name}
                                    style={{ fontSize: 14, color: 'var(--color-light-7)' }}
                                />
                            </div>

                            <TeamTags teams={contactConversation.teams} />
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

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const latestMessage = useMemo(() => {
        if (contactConversation.latest_message) {
            switch (contactConversation.latest_message.type) {
                case 'response':
                case 'text':
                case 'jaas.conference':
                    return getSafeContentText(contactConversation.latest_message.content.text as unknown);
                case 'quick_reply':
                    return contactConversation.latest_message.content.title;
                case 'image':
                case 'whatsapp.sticker':
                    return t('send_image');
                case 'video':
                case 'audio':
                case 'pdf':
                    return t(`send_${contactConversation.latest_message.type}`);
                case 'whatsapp.template':
                    if (typeof (contactConversation.latest_message.content.text as unknown) !== 'string') {
                        return getSafeContentText(contactConversation.latest_message.content.text as unknown);
                    }
                    let message = contactConversation.latest_message.content.text as string;
                    contactConversation.latest_message.content.variables.forEach((variable, index) => {
                        message = message.replace(`{{${index + 1}}}`, variable);
                    });
                    return message;
                default:
                    return '';
            }
        }
        return '';
    }, [contactConversation, t]);

    return (
        <div className={styles.card}>
            {dialogHolder}
            <Space size={20} direction="vertical">
                <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Space size={4} align="center" style={{ width: '100%' }}>
                        {contactConversation.conversation && (
                            <Icon namespace="channel" name={contactConversation.conversation?.channel_type} style={{ fontSize: 16 }} />
                        )}
                        <EllipsisText
                            element={<Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }} />}
                            text={contactConversation.conversation?.name}
                        />
                    </Space>
                    <div style={{ height: '32px' }}>
                        <EllipsisText
                            element={
                                <Typography
                                    variant="Caption"
                                    style={{
                                        color: 'var(--color-light-5)',
                                        textOverflow: 'ellipsis',
                                        WebkitLineClamp: 2,
                                        display: '-webkit-box',
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                />
                            }
                            whiteSpace="pre-wrap"
                            text={latestMessage}
                        />
                    </div>
                </Space>
                <Space
                    justify="between"
                    style={{ width: '100%', overflow: 'hidden' }}
                    containerRef={(ref) => {
                        if (ref) {
                            setTagContainerWidth(ref.getBoundingClientRect().width);
                        }
                    }}
                >
                    <Space size={4} onMouseEnter={handlePopoverOpen} style={{ overflow: 'hidden' }}>
                        <div className={styles.teamTag}>
                            <EllipsisText
                                element={<Typography variant="Caption" style={{ color: 'var(--color-light-5)' }} />}
                                text={contactConversation.teams[0].name}
                            />
                        </div>
                        {contactConversation.teams.length > 1 && (
                            <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                                {`+${contactConversation.teams.length - 1}`}
                            </Typography>
                        )}
                    </Space>
                    <Popover
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handlePopoverClose}
                        anchorOrigin={{
                            vertical: 'center',
                            horizontal: 'left',
                        }}
                        transformOrigin={{
                            vertical: 'center',
                            horizontal: 8,
                        }}
                        slotProps={{
                            paper: {
                                sx: {
                                    width: tagContainerWidth + 16 || '220px',
                                    overflow: 'hidden',
                                    padding: '8px',
                                    marginTop: '4px',
                                    boxShadow: '0px 16px 24px 0px rgba(224, 224, 224, 0.20), 0px 0px 4px 0px rgba(224, 224, 224, 0.88)',
                                },
                                onMouseLeave: () => {
                                    setAnchorEl(null);
                                },
                            },
                        }}
                    >
                        <Scrollbars autoHeight autoHide autoHeightMax={68}>
                            <Space
                                size={4}
                                wrap
                                align="start"
                                style={{
                                    width: '100%',
                                    overflow: 'hidden',
                                }}
                            >
                                {contactConversation.teams.map((team) => (
                                    <div key={team._id} className={styles.teamTag}>
                                        <EllipsisText
                                            element={<Typography variant="Caption" style={{ color: 'var(--color-light-5)' }} />}
                                            text={team.name}
                                        />
                                    </div>
                                ))}
                            </Space>
                        </Scrollbars>
                    </Popover>
                    <Button
                        text={t('chatroom')}
                        sx={{ gap: '4px', fontSize: 12, fontWeight: 400, padding: 0 }}
                        size={'xxs'}
                        variant="link"
                        endIcon={<Icon name="openNew" />}
                        onClick={() => {
                            if (
                                contactConversation.available_team_conversations &&
                                contactConversation.available_team_conversations.length > 0
                            ) {
                                store.dispatch(push(`/chatroom?conv_id=${contactConversation.available_team_conversations[0]._id}`));
                                onClose?.();
                            } else {
                                handleNoPermissionNotify();
                            }
                        }}
                    />
                </Space>
            </Space>
        </div>
    );
};

export default ConversationCard;
