import type { IconProps } from '@imbrace/ui';
import { Button, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';

import styles from './productCard.module.scss';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import useNotification from '@/hooks/useNotification';

export const ProductCard = ({ product }: { product: API.JourneyLibrary }) => {
    const { t } = useTranslation();
    const { openHelpCenter } = useNavbar();
    const navigate = useNavigate();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const [{ dialog }, dialogHolder] = useDialog();
    const isAllowModifyJourney = getIsAllowModify();
    const { showViewOnlyToast } = useNotification();

    return (
        <Space direction="vertical" size={20} align="start" justify="between" className={`${styles.card}`}>
            {dialogHolder}
            <Space size={8} direction="vertical" align="start" justify="end" style={{ overflow: 'hidden', width: '100%' }}>
                <div style={{ maxHeight: '38px', display: 'flex', alignItems: 'flex-end' }}>
                    <EllipsisText
                        element={
                            <Typography
                                variant="SubHeading2"
                                style={{
                                    color: 'var(--color-light-7)',
                                }}
                            />
                        }
                        text={t(`journey_${product.product_code}_title`, product.title)}
                        whiteSpace="pre-wrap"
                    />
                </div>
                {product.brief && (
                    <div style={{ maxHeight: '60px' }}>
                        <EllipsisText
                            element={
                                <Typography
                                    variant="BodyTight"
                                    style={{
                                        color: 'var(--color-light-5)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        WebkitLineClamp: 3,
                                        display: '-webkit-box',
                                        WebkitBoxOrient: 'vertical',
                                    }}
                                />
                            }
                            text={t(`journey_${product.product_code}_brief`, product.brief)}
                            whiteSpace="pre-wrap"
                        />
                    </div>
                )}
                {product.why_use && (
                    <EllipsisText
                        element={
                            <Typography
                                variant="BodyTight"
                                style={{
                                    color: 'var(--color-light-5)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                }}
                            />
                        }
                        text={
                            <>
                                <strong>{t('why_use')}: </strong>
                                {t(`journey_${product.product_code}_why_use`, product.why_use)}
                            </>
                        }
                        whiteSpace="pre-wrap"
                    />
                )}
            </Space>
            <Space size={12} justify="between" style={{ width: '100%' }}>
                <div style={{ width: '32px', height: '32px' }}>
                    {product.channels_or_platforms.map((channel, cIndex) => {
                        const iconProps = {
                            namespace: 'channel',
                            name: channel,
                        } as IconProps;
                        return (
                            <Icon
                                {...iconProps}
                                key={`channel-icon-${product._id}-${cIndex}`}
                                style={{
                                    fontSize: 32,
                                    color: 'var(--color-secondary-4)',
                                }}
                            />
                        );
                    })}
                </div>
                <Space>
                    <Button
                        text={t('read_more')}
                        variant="link"
                        onClick={() => {
                            navigate(`/journeys/libraries/${product._id}`);
                        }}
                    />

                    <Button
                        className={isAllowModifyJourney ? '' : 'view-only'}
                        text={t('use_now')}
                        size="s"
                        variant="outlined"
                        {...(!product?.template.url && {
                            endIcon: <Icon name="premium" />,
                        })}
                        onClick={() => {
                            if (!isAllowModifyJourney) {
                                showViewOnlyToast();
                                return;
                            }

                            if (!product?.template.url) {
                                openUnlockFeature({
                                    channel: supportChannel,
                                    touchpoint: supportTouchpoint,
                                    openHelpCenter: (channelId: string) =>
                                        openHelpCenter?.({
                                            channelId,
                                            prefillMessage: t('unlock_feature_prefill_message'),
                                            defaultWebWidget: true,
                                        }),
                                });
                                return;
                            }
                            if (product.max_instances > 0 && product.installed_app_ids.length > 0) {
                                dialog({
                                    title: t('journey_installation_limit_modal_title', {
                                        name: t(`journey_${product.product_code}_title`),
                                    }),
                                    content: t('journey_installation_limit_modal_desc', {
                                        name: t(`journey_${product.product_code}_title`),
                                    }),
                                    confirmText: t('go_to_org_journey'),
                                    cancelText: t('review_settings'),
                                    onConfirm: () => {
                                        navigate('/journeys/org');
                                    },
                                    onClose: () => {
                                        navigate(`/journey/${product.installed_app_ids[0]}`, {
                                            state: {
                                                from: 'marketplace',
                                                step: 0,
                                            },
                                        });
                                    },
                                });
                            } else {
                                navigate(`/journeys/libraries/${product._id}/config`, {
                                    state: {
                                        from: 'marketplace',
                                    },
                                });
                            }
                        }}
                    />
                </Space>
            </Space>
        </Space>
    );
};
