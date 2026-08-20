import { EllipsisText, Icon, IconButton, Space, Tooltip, Typography, useModal } from '@imbrace/ui';
import dayjs from 'dayjs';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { env } from '@/env';

import { IframeContainer } from '../iframeModal';
import styles from './index.module.scss';

const FormCard = ({
    form,
    onRoute,
    onClick,
    isSelected,
}: {
    form: FormManagement.Form;
    onRoute: (url: string) => void;
    onClick: () => void;
    isSelected: boolean;
}) => {
    const { t } = useTranslation();
    const [{ modal }, modalHolder] = useModal();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const openIframeModal = useCallback(
        (props: {
            url: string;
            title: string;
            id: string;
            onAfterClose?: () => void;
            appType: 'marketplace' | 'customization';
            handleOpenHelpCenter?: (prefillMessage?: string) => void;
        }) => {
            modal({
                title: props.title,
                content: ({ onClose }) => (
                    <IframeContainer
                        onClose={() => {
                            onClose();
                            if (props.onAfterClose) {
                                return props.onAfterClose;
                            }
                        }}
                        iframeRef={iframeRef}
                        {...props}
                    />
                ),
            });
        },
        [modal],
    );

    return (
        <Space
            size={8}
            direction="vertical"
            justify="between"
            className={`${styles.formCard} ${isSelected ? styles.selected : ''}`}
            onClick={onClick}
        >
            {modalHolder}
            <Space size={12} justify="between" align="start" style={{ width: '100%' }}>
                <Space
                    size={4}
                    direction="vertical"
                    align="start"
                    justify="start"
                    style={{ color: form.is_active ? 'var(--color-light-7)' : 'var(--color-light-4)' }}
                >
                    <EllipsisText
                        element={
                            <Typography
                                variant="SubHeading2Tight"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                }}
                            />
                        }
                        text={form.name}
                        whiteSpace="pre-wrap"
                    />
                    <EllipsisText
                        element={
                            <Typography
                                variant="Caption"
                                style={{
                                    color: form.is_active ? 'var(--color-light-5)' : 'currentcolor',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                }}
                            />
                        }
                        text={form.description}
                        whiteSpace="pre-wrap"
                    />
                </Space>
                <IconButton
                    variant="text"
                    type="secondary"
                    size="xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        openIframeModal({
                            id: form._id,
                            title: form.name,
                            appType: 'marketplace',
                            url:
                                env.VITE_APP_ENV === 'local'
                                    ? `http://localhost:8080/form-management/form/preview/${form._id}`
                                    : `${env.VITE_APP_WCS_HOST}/form-management/form/preview/${form._id}`,
                        });
                    }}
                >
                    <Icon name="formPreview" />
                </IconButton>
            </Space>

            <Space style={{ width: '100%' }}>
                <Space size={12} direction="vertical" align="start" style={{ width: '100%' }}>
                    <Space
                        size={8}
                        align="start"
                        wrap
                        style={{ flex: 1, width: '100%', color: form.is_active ? 'var(--color-light-7)' : 'var(--color-light-4)' }}
                    >
                        <Space size={8} style={{ width: 'calc(50% - 4px)' }}>
                            <Tooltip title={t('form_access')} arrow placement="top">
                                <div>
                                    <Icon name="allTeams" style={{ fontSize: '20px', color: 'var(--color-light-4)' }} />
                                </div>
                            </Tooltip>
                            <EllipsisText
                                element={<Typography variant="Caption" />}
                                text={
                                    form.teams && form.teams.length > 0
                                        ? form.teams.map((team) => team.team_name).join(', ')
                                        : t('all_teams')
                                }
                            />
                        </Space>
                        <Space size={8} style={{ width: 'calc(50% - 4px)' }}>
                            <Tooltip title={t('form_owner')} arrow placement="top">
                                <div>
                                    <Icon name="personSharp" style={{ fontSize: '20px', color: 'var(--color-light-4)' }} />
                                </div>
                            </Tooltip>

                            <EllipsisText
                                element={
                                    <Typography
                                        variant="Caption"
                                        style={{ color: form.owner && form.owner.user_name ? 'currentColor' : 'var(--color-light-4)' }}
                                    />
                                }
                                text={form.owner && form.owner.user_name ? form.owner.user_name : t('na')}
                            />
                        </Space>
                        <Space size={8} style={{ width: 'calc(50% - 4px)' }}>
                            <Tooltip title={t('updated_by')} arrow placement="top">
                                <div>
                                    <Icon name="formUpdate" style={{ fontSize: '20px', color: 'var(--color-light-4)' }} />
                                </div>
                            </Tooltip>

                            <Typography variant="Caption">{dayjs(form.updated_at).format('MM/DD/YYYY')}</Typography>
                        </Space>
                    </Space>
                    <Space size={8} justify="start">
                        <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                            {t('results_saved_to')}
                        </Typography>
                        <Typography variant="BodyTight">{form.board_name}</Typography>
                    </Space>
                </Space>
            </Space>
        </Space>
    );
};

export default FormCard;
