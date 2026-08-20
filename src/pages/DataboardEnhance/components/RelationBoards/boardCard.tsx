import type { channelIconMapping } from '@imbrace/ui';
import {
    Accordion,
    Button,
    Checkbox,
    DropdownMenu,
    DropdownMenuItem,
    EllipsisText,
    Icon,
    IconButton,
    Space,
    Spin,
    Typography,
    useModal,
} from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import dayjs from 'dayjs';
import type { MouseEvent } from 'react';
import { forwardRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { putUnLinkRecords } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

import Overview from '../../overview';
import styles from './index.module.scss';

const useBoardCard = ({ record, board, withDetails }: { record: API.BoardItem; board: API.Board; withDetails?: boolean }) => {
    const { t } = useTranslation();
    const renderCompanyRecord = () => {
        const { fields } = board;
        const { fields: recordFields } = record;
        const tagsField = fields.find((field) => field.default_field_name === 'tags');
        const locationField = fields.find((field) => field.default_field_name === 'location');

        const tagsValue = tagsField ? (recordFields[tagsField._id] as string[]) || [] : [];
        const locationValue = locationField ? (recordFields[locationField._id] as string) || undefined : undefined;

        return (
            <Space size={16} style={{ width: '100%', overflow: 'hidden' }}>
                <Space size={4} direction="vertical" align="start" style={{ flex: 1 }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('location')}</Typography>
                    <div style={{ width: '100%' }}>
                        <EllipsisText
                            text={locationValue || '—'}
                            element={
                                <Typography
                                    {...(!locationValue && {
                                        style: {
                                            color: 'var(--color-light-5)',
                                        },
                                    })}
                                />
                            }
                        />
                    </div>
                </Space>
                <Space size={4} direction="vertical" align="start" style={{ flex: 1, overflow: 'hidden' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('tags')}</Typography>
                    <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
                        <EllipsisText
                            text={tagsValue[0] || '—'}
                            element={
                                <Typography
                                    variant={tagsValue[0] ? 'Caption' : 'Body'}
                                    {...(tagsValue[0]
                                        ? {
                                              style: {
                                                  background: 'var(--color-accent-yellow-5)',
                                                  padding: '4px 12px',
                                                  borderRadius: '30px',
                                              },
                                          }
                                        : {
                                              style: {
                                                  color: 'var(--color-light-5)',
                                              },
                                          })}
                                />
                            }
                        />
                    </div>
                </Space>
            </Space>
        );
    };

    const renderContactRecord = () => {
        const { fields } = board;
        const { fields: recordFields } = record;
        const stageField = fields.find((field) => field.default_field_name === 'stage');
        const originField = fields.find((field) => field.default_field_name === 'origin');
        const phoneField = fields.find((field) => field.default_field_name === 'phone');
        const emailField = fields.find((field) => field.default_field_name === 'email');

        const stageValue = stageField ? (recordFields[stageField._id] as string) || undefined : undefined;
        const phoneValue = phoneField ? (recordFields[phoneField._id] as API.PhoneValue) || undefined : undefined;
        const emailValue = emailField ? (recordFields[emailField._id] as string) || undefined : undefined;
        const originValue = originField ? (recordFields[originField._id] as API.OriginValue) || undefined : undefined;

        const renderOrigin = () => {
            if (!originValue) {
                return <Typography style={{ color: 'var(--color-light-5)' }}>—</Typography>;
            }
            const {
                type,
                data: { name, type: dataType },
            } = originValue;
            const iconType: Record<API.ProductType, keyof typeof channelIconMapping> = {
                business_contact_collector: 'crm',
                email_campaign: 'email',
                facebook_leads_management: 'facebook',
                facebook_social_media_management: 'facebook',
                'ai-assistant_management': 'imbraceai',
                form_management: 'formManagement',
                whatsapp_outbound: 'whatsapp',
            };
            if (type === 'customized') {
                return (
                    <EllipsisText
                        text={`${name ?? '—'}`}
                        element={
                            <Typography
                                style={{
                                    color: !name ? 'var(--color-light-4)' : 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'break-word',
                                }}
                            />
                        }
                    />
                );
            }
            return (
                <Space size={12} align="center" justify="start" style={{ width: '100%' }}>
                    <Space>
                        <Icon
                            namespace="channel"
                            name={
                                type === 'channel' ? (dataType as keyof typeof channelIconMapping) : iconType[dataType as API.ProductType]
                            }
                            style={{ fontSize: 24 }}
                        />
                    </Space>
                    <EllipsisText
                        text={`${name ?? '—'}`}
                        element={
                            <Typography
                                style={{
                                    color: !name ? 'var(--color-light-4)' : 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'break-word',
                                }}
                            />
                        }
                    />
                </Space>
            );
        };
        return (
            <Space size={[16, 16]} wrap style={{ width: '100%', overflow: 'hidden' }}>
                <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('stage')}</Typography>
                    <div style={{ width: '100%' }}>
                        <EllipsisText
                            text={stageValue || '—'}
                            element={
                                <Typography
                                    {...(!stageValue && {
                                        style: {
                                            color: 'var(--color-light-5)',
                                        },
                                    })}
                                />
                            }
                        />
                    </div>
                </Space>
                <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('field_origin')}</Typography>
                    {renderOrigin()}
                </Space>
                <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('phone')}</Typography>
                    <div style={{ width: '100%' }}>
                        <EllipsisText
                            text={phoneValue ? `${phoneValue.country_calling_code} ${phoneValue.phone}` || '—' : '—'}
                            element={
                                <Typography
                                    {...((!phoneValue || !phoneValue.phone) && {
                                        style: {
                                            color: 'var(--color-light-5)',
                                        },
                                    })}
                                />
                            }
                        />
                    </div>
                </Space>
                <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)', overflow: 'hidden' }}>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{t('email')}</Typography>
                    <div style={{ width: '100%' }}>
                        <EllipsisText
                            text={emailValue || '—'}
                            element={
                                <Typography
                                    {...(!emailValue && {
                                        style: {
                                            color: 'var(--color-light-5)',
                                        },
                                    })}
                                />
                            }
                        />
                    </div>
                </Space>
            </Space>
        );
    };

    const renderTaskRecord = () => {
        const { fields } = board;
        const { fields: recordFields } = record;
        const assigneeField = fields.find((field) => field.default_field_name === 'assignee');
        const statusField = fields.find((field) => field.default_field_name === 'status');
        const dueDateField = fields.find((field) => field.default_field_name === 'due_date');
        const priorityField = fields.find((field) => field.default_field_name === 'priority');
        const descriptionField = fields.find((field) => field.default_field_name === 'description');

        const assigneeValue = assigneeField ? (recordFields[assigneeField._id] as API.AssigneeValue) || undefined : undefined;
        const statusValue = statusField ? (recordFields[statusField._id] as string) || undefined : undefined;
        const dueDateValue = dueDateField ? (recordFields[dueDateField._id] as Date) || undefined : undefined;
        const priorityValue = priorityField ? (recordFields[priorityField._id] as string) || undefined : undefined;
        const descriptionValue = descriptionField ? (recordFields[descriptionField._id] as string) || undefined : undefined;

        const renderAssignee = () => {
            if (!assigneeValue) {
                return <Typography style={{ color: 'var(--color-light-5)' }}>—</Typography>;
            }
            const { display_name } = assigneeValue;

            return (
                <Space size={12} align="center" justify="start" style={{ width: '100%' }}>
                    <Space>
                        <Icon name="accountCircle" style={{ fontSize: 24, color: 'var(--color-light-5)' }} />
                    </Space>
                    <EllipsisText
                        text={`${display_name ?? '—'}`}
                        element={
                            <Typography
                                style={{
                                    color: !display_name ? 'var(--color-light-4)' : 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'break-word',
                                }}
                            />
                        }
                    />
                </Space>
            );
        };
        return (
            <Space size={8} direction="vertical" style={{ width: '100%' }}>
                <Space size={[8, 16]} wrap style={{ width: '100%', overflow: 'hidden' }}>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('assignee')}</Typography>
                        {renderAssignee()}
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('priority')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={priorityValue || '—'}
                                element={
                                    <Typography
                                        {...(!priorityValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('due_date')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={dueDateValue ? dayjs(dueDateValue).format('MM/DD/YYYY') : '—'}
                                element={
                                    <Typography
                                        {...(!dueDateValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)', overflow: 'hidden' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('status')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={statusValue || '—'}
                                element={
                                    <Typography
                                        {...(!statusValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                </Space>
                {withDetails && (
                    <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('description')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={descriptionValue || '—'}
                                whiteSpace="pre-wrap"
                                element={
                                    <Typography
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            WebkitLineClamp: 2,
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                        {...(!descriptionValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                )}
            </Space>
        );
    };

    const renderOpportunityRecord = () => {
        const { fields } = board;
        const { fields: recordFields } = record;
        const assigneeField = fields.find((field) => field.default_field_name === 'owner');
        const stageField = fields.find((field) => field.default_field_name === 'stage');
        const estValueField = fields.find((field) => field.default_field_name === 'estimated_value');
        const priorityField = fields.find((field) => field.default_field_name === 'priority');
        const remarksField = fields.find((field) => field.default_field_name === 'remarks');

        const assigneeValue = assigneeField ? (recordFields[assigneeField._id] as API.AssigneeValue) || undefined : undefined;
        const stageValue = stageField ? (recordFields[stageField._id] as string) || undefined : undefined;
        const estValue = estValueField ? (recordFields[estValueField._id] as API.CurrencyValue) || undefined : undefined;
        const priorityValue = priorityField ? (recordFields[priorityField._id] as string) || undefined : undefined;
        const remarksValue = remarksField ? (recordFields[remarksField._id] as string) || undefined : undefined;

        const renderOwner = () => {
            if (!assigneeValue) {
                return <Typography style={{ color: 'var(--color-light-5)' }}>—</Typography>;
            }
            const { display_name } = assigneeValue;

            return (
                <Space size={12} align="center" justify="start" style={{ width: '100%' }}>
                    <Space>
                        <Icon name="accountCircle" style={{ fontSize: 24, color: 'var(--color-light-5)' }} />
                    </Space>
                    <EllipsisText
                        text={`${display_name ?? '—'}`}
                        element={
                            <Typography
                                style={{
                                    color: !display_name ? 'var(--color-light-4)' : 'inherit',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    wordBreak: 'break-word',
                                }}
                            />
                        }
                    />
                </Space>
            );
        };
        return (
            <Space size={8} direction="vertical" style={{ width: '100%' }}>
                <Space size={[8, 16]} wrap style={{ width: '100%', overflow: 'hidden' }}>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('owner')}</Typography>
                        {renderOwner()}
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('priority')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={priorityValue || '—'}
                                element={
                                    <Typography
                                        {...(!priorityValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)', overflow: 'hidden' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('stage')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={stageValue || '—'}
                                element={
                                    <Typography
                                        {...(!stageValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ width: 'calc(50% - 8px)' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('estimated_value')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={estValue ? `${estValue.amounts} ${estValue.currency_code}` : '—'}
                                element={
                                    <Typography
                                        {...(!estValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                </Space>
                {withDetails && (
                    <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('remarks')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={remarksValue || '—'}
                                whiteSpace="pre-wrap"
                                element={
                                    <Typography
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            WebkitLineClamp: 2,
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                        {...(!remarksValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                )}
            </Space>
        );
    };

    const renderProductRecord = () => {
        const { fields } = board;
        const { fields: recordFields } = record;
        const tagsField = fields.find((field) => field.default_field_name === 'tags');
        const unitPriceField = fields.find((field) => field.default_field_name === 'unit_price');
        const descriptionField = fields.find((field) => field.default_field_name === 'description');

        const tagsValue = tagsField ? (recordFields[tagsField._id] as string[]) || [] : [];
        const unitPriceValue = unitPriceField ? (recordFields[unitPriceField._id] as API.CurrencyValue) || undefined : undefined;
        const descriptionValue = descriptionField ? (recordFields[descriptionField._id] as string) || undefined : undefined;

        return (
            <Space size={8} direction="vertical" style={{ width: '100%' }}>
                <Space size={8} style={{ width: '100%', overflow: 'hidden' }}>
                    <Space size={4} direction="vertical" align="start" style={{ flex: 1 }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('unit_price')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={unitPriceValue ? `${unitPriceValue.amounts} ${unitPriceValue.currency_code}` : '—'}
                                element={
                                    <Typography
                                        {...(!unitPriceValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                    <Space size={4} direction="vertical" align="start" style={{ flex: 1, overflow: 'hidden' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('tags')}</Typography>
                        <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
                            <EllipsisText
                                text={tagsValue[0] || '—'}
                                element={
                                    <Typography
                                        variant={tagsValue[0] ? 'Caption' : 'Body'}
                                        {...(tagsValue[0]
                                            ? {
                                                  style: {
                                                      background: 'var(--color-accent-yellow-5)',
                                                      padding: '4px 12px',
                                                      borderRadius: '30px',
                                                  },
                                              }
                                            : {
                                                  style: {
                                                      color: 'var(--color-light-5)',
                                                  },
                                              })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                </Space>
                {withDetails && (
                    <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                        <Typography style={{ color: 'var(--color-light-5)' }}>{t('description')}</Typography>
                        <div style={{ width: '100%' }}>
                            <EllipsisText
                                text={descriptionValue || '—'}
                                whiteSpace="pre-wrap"
                                element={
                                    <Typography
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            WebkitLineClamp: 2,
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                        }}
                                        {...(!descriptionValue && {
                                            style: {
                                                color: 'var(--color-light-5)',
                                            },
                                        })}
                                    />
                                }
                            />
                        </div>
                    </Space>
                )}
            </Space>
        );
    };

    const renderBody = () => {
        if (board.type === 'Companies') {
            return renderCompanyRecord();
        }
        if (board.type === 'Contacts') {
            return renderContactRecord();
        }
        if (board.type === 'Tasks') {
            return renderTaskRecord();
        }
        if (board.type === 'Opportunities') {
            return renderOpportunityRecord();
        }
        if (board.type === 'Products') {
            return renderProductRecord();
        }
        return null;
    };

    return {
        renderBody,
    };
};

export const SelectableBoardCard = forwardRef<
    HTMLDivElement,
    {
        record: API.BoardItem;
        board: API.Board;
        onClick: () => void;
        isSelected: boolean;
        onModalClose: () => void;
    }
>(({ record, board, onClick, isSelected, onModalClose }, ref) => {
    const { t } = useTranslation();
    const [{ modal }, modalHolder] = useModal();
    const navigate = useNavigate();

    const { renderBody } = useBoardCard({ record, board });

    const identifierField = useMemo(() => {
        return board.fields.find((field) => field.is_identifier);
    }, [board]);

    const recordName = useMemo(() => {
        if (identifierField) {
            return record?.fields?.[identifierField._id] as string;
        }
        return '';
    }, [identifierField, record]);

    const createdAt = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.created_at;
        }
        return record?.created_at;
    }, [board, record]);

    const updatedAt = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.updated_at;
        }
        return record?.updated_at;
    }, [board, record]);

    return (
        <Space
            size={8}
            direction="vertical"
            justify="between"
            align="stretch"
            className={clsx(styles.boardCard, isSelected && styles.selected)}
            onClick={onClick}
            ref={ref}
        >
            {modalHolder}
            <Space size={12} style={{ width: '100%' }} align="start">
                <Space size={4} direction="vertical" align="start" style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ width: '100%' }}>
                        <EllipsisText text={recordName} element={<Typography variant="SubHeading2Tight" />} />
                    </div>

                    <Typography style={{ color: 'var(--color-light-5)' }}>{`${t('last_updated')} ${dayjs(updatedAt ?? createdAt).format(
                        'MM/DD/YYYY h:mm A',
                    )}`}</Typography>
                </Space>

                <IconButton
                    type="secondary"
                    variant="text"
                    size="xs"
                    onClick={(e) => {
                        e.stopPropagation();
                        modal({
                            title: ({ onClose }) => (
                                <Space size={12}>
                                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                        {t('record_preview')}
                                    </Typography>
                                    <Button
                                        variant="link"
                                        size="xs"
                                        text={t('open_record')}
                                        endIcon={<Icon name="openNew" />}
                                        onClick={() => {
                                            onClose?.();
                                            onModalClose();
                                            navigate(`/crm/${board.id}/${record.id}`);
                                        }}
                                        sx={{
                                            fontWeight: 400,
                                            gap: '4px',
                                            lineHeight: '16px',
                                        }}
                                    />
                                </Space>
                            ),
                            content: () => <Overview boardId={board?.id} recordId={record?.id} inModal readOnly />,
                        });
                    }}
                >
                    <Icon name="recordPreview" />
                </IconButton>
            </Space>
            <Space size={4} align="end">
                {renderBody()}
                <Checkbox value={isSelected} checked={isSelected} />
            </Space>
        </Space>
    );
});

export const BoardCard = forwardRef<
    HTMLDivElement,
    {
        record: API.BoardItem;
        board: API.Board;
        currentRecord: API.BoardItem;
        currentBoard: API.Board;
        defaultExpanded?: boolean;
        refresh: () => void;
        open?: () => void;
    }
>(({ record, board, currentRecord, currentBoard, defaultExpanded, refresh, open }, ref) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(defaultExpanded || false);
    const [contextMenu, setContextMenu] = useState<{
        mouseX: number;
        mouseY: number;
    } | null>(null);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const unlinkRecord = useMutation({
        mutationFn: async (recordId: string) => {
            await apiFetch(putUnLinkRecords.api(currentBoard.id, currentRecord.id, board.id), putUnLinkRecords.method, {
                ids: [recordId],
            });
        },
        onSuccess: () => {
            refresh();
        },
        onError: () => {
            const notificationPayload = {
                message: t('error_something_went_wrong'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
    });

    const { renderBody } = useBoardCard({ record, board, withDetails: true });

    const identifierField = useMemo(() => {
        return board.fields.find((field) => field.is_identifier);
    }, [board]);

    const recordName = useMemo(() => {
        if (identifierField) {
            return record?.fields?.[identifierField._id] as string;
        }
        return '';
    }, [identifierField, record]);

    const createdAt = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.created_at;
        }
        return record?.created_at;
    }, [board, record]);

    const updatedAt = useMemo(() => {
        if (board?.type === 'Contacts') {
            return record?.contacts?.updated_at;
        }
        return record?.updated_at;
    }, [board, record]);

    const handleContextMenu = (event: MouseEvent) => {
        event.preventDefault();

        setContextMenu(
            contextMenu === null
                ? {
                      mouseX: event.clientX + 2,
                      mouseY: event.clientY - 6,
                  }
                : // repeated contextmenu when it is already open closes it with Chrome 84 on Ubuntu
                  // Other native context menus might behave different.
                  // With this behavior we prevent contextmenu from the backdrop to re-locale existing context menus.
                  null,
        );
    };

    const handleClose = () => {
        setContextMenu(null);
    };

    return (
        <div onContextMenu={handleContextMenu}>
            <Accordion
                ref={ref}
                title={
                    <Space size={12} style={{ width: '100%' }} align="start">
                        <Space size={4} direction="vertical" align="start" style={{ overflow: 'hidden' }}>
                            <div style={{ width: '100%' }}>
                                <EllipsisText text={recordName} element={<Typography variant="SubHeading2Tight" />} />
                            </div>

                            <Space size={12} style={{ width: '100%' }}>
                                <div style={{ overflow: 'hidden', flex: 1 }}>
                                    <EllipsisText
                                        text={`${t('last_updated')} ${dayjs(updatedAt ?? createdAt).format('MM/DD/YYYY h:mm A')}`}
                                        element={<Typography style={{ color: 'var(--color-light-5)' }} />}
                                    />
                                </div>

                                <Button
                                    variant="link"
                                    size="xs"
                                    text={t('open_record')}
                                    endIcon={<Icon name="openNew" />}
                                    onClick={() => {
                                        if (open) {
                                            open();
                                            return;
                                        }
                                        navigate(`/crm/${board.id}/${record.id}`, { state: { closeModal: true } });
                                    }}
                                    sx={{
                                        fontWeight: 400,
                                        gap: '4px',
                                        lineHeight: '16px',
                                    }}
                                />
                            </Space>
                        </Space>
                    </Space>
                }
                titleSx={{
                    background: 'none',
                    alignItems: 'start',
                    padding: '0px !important',
                    minHeight: 'auto',
                    '& > .MuiAccordionSummary-content': {
                        overflow: 'hidden',
                    },
                }}
                detailsSx={{
                    padding: '0px !important',
                }}
                sx={{
                    border: '1px solid var(--color-light-3)',
                    padding: '16px',
                    borderRadius: '4px',
                }}
                expandIconPosition="right"
                expandIcon={<Icon name="expandMore" fontSize={24} color="var(--color-light-4)" />}
                expanded={expanded}
                onChange={(e, isExpanded) => setExpanded(isExpanded)}
            >
                <Space size={4} align="end" style={{ paddingTop: '12px' }}>
                    {renderBody()}
                </Space>
            </Accordion>
            <DropdownMenu
                open={contextMenu !== null}
                onClose={handleClose}
                anchorReference="anchorPosition"
                anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
            >
                <DropdownMenuItem
                    onClick={() => {
                        unlinkRecord.mutate(record.id);
                    }}
                    sx={{
                        position: 'relative',
                        color: 'var(--color-danger-1)',
                    }}
                    disabled={unlinkRecord.isPending}
                >
                    <Spin isSpinning={unlinkRecord.isPending}>
                        <Typography>{t('remove_association')}</Typography>
                    </Spin>
                </DropdownMenuItem>
            </DropdownMenu>
        </div>
    );
});

export default SelectableBoardCard;
