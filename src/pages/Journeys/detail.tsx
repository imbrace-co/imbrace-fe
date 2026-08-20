import type { IconProps } from '@imbrace/ui';
import { Button, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { type QueryFunction, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';

import PageLayout from '@/components/PageLayout';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { getProductById } from '@/services/api/marketplace';
import apiFetch from '@/services/axios/handler';

import styles from './detail.module.scss';
import mainStyles from './index.module.scss';
import { ProductCard } from './productCard';
import { getIsAllowModify } from '@/utils/CookiesHelper';
import useNotification from '@/hooks/useNotification';

const fetchProduct: QueryFunction<API.JourneyLibrary, [string, string | undefined]> = async ({ queryKey }) => {
    const [, productId] = queryKey;
    if (!productId) {
        throw new Error('Product Id is missing');
    }
    const { data } = await apiFetch<{ data: API.JourneyLibrary }>(getProductById.api(productId), getProductById.method);
    return data.data;
};

const Detail = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { productId, tab } = useParams();
    const { openHelpCenter } = useNavbar();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const support = useAppSelector((state) => state.Account.support);
    const isAllowModifyJourney = getIsAllowModify();
    const { showViewOnlyToast } = useNotification();

    const [{ dialog }, dialogHolder] = useDialog();
    const { data, isFetching } = useQuery({
        queryKey: ['marketplace', productId],
        queryFn: fetchProduct,
        enabled: !!productId,
    });

    return (
        <PageLayout
            onBack={() => {
                navigate(`/journeys/${tab ?? ''}`);
            }}
            backBtnText={t('menu_journeys')}
            title={t(`journey_${data?.product_code}_title`, data?.title ?? '')}
            loading={isFetching}
            rightSideComponent={
                <Button
                    className={isAllowModifyJourney ? '' : 'button-view-only'}
                    text={t('use_now')}
                    onClick={() => {
                        if (!isAllowModifyJourney) {
                            showViewOnlyToast();
                            return;
                        }
                        if (!data?.template.url) {
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
                        if (data.max_instances > 0 && data.installed_app_ids.length > 0) {
                            dialog({
                                title: t('journey_installation_limit_modal_title', {
                                    name: t(`journey_${data.product_code}_title`),
                                }),
                                content: t('journey_installation_limit_modal_desc', {
                                    name: t(`journey_${data.product_code}_title`),
                                }),
                                confirmText: t('go_to_org_journey'),
                                onConfirm: () => {
                                    navigate('/journeys/org');
                                },
                                onClose: () => {
                                    navigate(`/journey/${data.installed_app_ids[0]}`, {
                                        state: {
                                            from: 'detail',
                                        },
                                    });
                                },
                            });
                        } else if (productId) {
                            navigate('config', {
                                state: {
                                    from: 'detail',
                                },
                            });
                        }
                    }}
                    endIcon={!data?.template.url ? <Icon name="premium" /> : null}
                />
            }
        >
            {dialogHolder}
            <Space size={108} direction="vertical" style={{ width: '100%', paddingBottom: '32px' }}>
                <Space size={24} align="start" style={{ width: '100%' }}>
                    <Space size={24} align="start" direction="vertical">
                        <div className={`${styles.banner} ${!data?.banner_image ? styles.placeholder : ''}`}>
                            {data?.banner_image ? (
                                <img src={data?.banner_image} alt={`${data?.title} banner`} />
                            ) : (
                                <Icon name="photoOutlined" style={{ fontSize: 50, color: 'var(--color-light-4)' }} />
                            )}
                        </div>
                        <div className={styles.description}>
                            {<Typography>{t(`journey_${data?.product_code}_description`, data?.description || '')}</Typography>}
                        </div>
                    </Space>
                    <Space
                        size={24}
                        align="start"
                        direction="vertical"
                        style={{
                            width: '100%',
                            maxWidth: '430px',
                        }}
                    >
                        <Space size={8} align="start" direction="vertical">
                            <Typography style={{ color: 'var(--color-light-5)' }}>{t('journey_used_channel_and_platforms')}</Typography>
                            <Space size={8}>
                                {data?.channels_or_platforms.map((channel) => {
                                    const iconProps = {
                                        namespace: 'channel',
                                        name: channel,
                                    } as IconProps;
                                    return (
                                        <Icon
                                            key={`${data._id}-${channel}`}
                                            {...iconProps}
                                            style={{
                                                fontSize: 32,
                                                color: 'var(--color-secondary-4)',
                                            }}
                                        />
                                    );
                                })}
                            </Space>
                        </Space>
                        <Space size={8} align="start" direction="vertical">
                            <Typography style={{ color: 'var(--color-light-5)' }}>{t('categories')}</Typography>
                            <Space size={8} wrap>
                                {data?.categories.map((category, index) => {
                                    return (
                                        <div key={`${index}-${category}`} className={styles.category}>
                                            <Typography variant="Caption" style={{ color: 'var(--color-light-5)', lineHeight: '15.8px' }}>
                                                {t(`${category.toLowerCase().replaceAll(' ', '_')}`, category)}
                                            </Typography>
                                        </div>
                                    );
                                })}
                            </Space>
                        </Space>
                        <Divider flexItem />
                        <Space
                            size={8}
                            className={styles.notes}
                            onClick={() => {
                                if (support.customer?.channel) {
                                    openHelpCenter?.({
                                        channelId: support.customer?.channel?._id,
                                        prefillMessage: t('new_inquiry_prefill_message'),
                                        defaultWebWidget: true,
                                    });
                                }
                            }}
                        >
                            <Space size={0} align="start" direction="vertical">
                                <Typography variant="SubHeading2" style={{ color: 'var(--color-primary-6)' }}>
                                    {t('journey_note_title')}
                                </Typography>
                                <Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }}>
                                    {t('journey_note_desc')}
                                </Typography>
                            </Space>
                            <div style={{ height: '32px' }}>
                                <Icon name="chevronRight" style={{ fontSize: 32, color: 'var(--color-primary-6)' }} />
                            </div>
                        </Space>
                    </Space>
                </Space>
                <Space size={24} align="start" direction="vertical" style={{ width: '100%' }}>
                    <Typography variant="Heading2">{t('journeys_related_journeys')}</Typography>
                    <div className={mainStyles.container} style={{ width: '100%' }}>
                        {data?.related_products.slice(0, 2).map((product) => {
                            return <ProductCard key={`orgApp-${product._id}`} product={product} />;
                        })}
                    </div>
                </Space>
            </Space>
        </PageLayout>
    );
};

export default Detail;
