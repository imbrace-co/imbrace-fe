import StoreIcon from '@mui/icons-material/Store';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useInfiniteScroll from 'react-infinite-scroll-hook';

import { useAppSelector } from '@/redux/store';
import { getStores } from '@/services/api/physicalStore';
import apiFetch from '@/services/axios/handler';

import OperationStoreDrawer from '../OperationStoreDrawer';
import StoreDetailDrawer from '../StoreDetailDrawer';
import type { ChannelCollapseType } from '.';
import ChannelCollapse from '.';
import type { ChannelPropsType } from './channelHOC';
import styles from './index.module.scss';

const PhysicalStoreIcon = ({ inactive }: { inactive?: boolean }) => (
    <div className={`${styles.physicalStoreIcon}${inactive ? ` ${styles.inactive}` : ''}`}>
        <StoreIcon />
    </div>
);
export type DrawerType = {
    open: boolean;
    current?: API.Channel;
};

const physicalStoreChannels = (
    Component: FC<ChannelCollapseType>,
    { type, title, icon, inactiveIcon }: { type: string; title: string; icon: ReactNode; inactiveIcon: ReactNode },
) => {
    return (props: ChannelPropsType) => {
        const { t } = useTranslation();
        const { refresh } = props;
        const [loading, setLoading] = useState<boolean>(false);
        const [hasMore, setHasMore] = useState<boolean>(true);
        const [dataSkip, setDataSkip] = useState<number>(0);
        const [channels, setChannels] = useState<API.Channel[]>([]);
        const [operationStoreDrawer, setOperationStoreDrawer] = useState<DrawerType>({
            open: false,
            current: undefined,
        });
        const [storeDetailDrawer, setStoreDetailDrawer] = useState<DrawerType>({
            open: false,
            current: undefined,
        });

        const businessUnit = useAppSelector((state) => state.BusinessUnit.businessUnitList);
        const [containerRef] = useInfiniteScroll({
            loading,
            hasNextPage: hasMore,
            onLoadMore: () => {
                fetchChannel(10, dataSkip);
            },
            disabled: !hasMore,
            rootMargin: '0px 0px 400px 0px',
        });

        const fetchChannel = useCallback(
            async (limit = 10, skip = 0) => {
                try {
                    setLoading(true);
                    const api = getStores.api(businessUnit[0]?.id, skip, limit);
                    const { data } = await apiFetch<API.PaginatedResponse<API.Channel[]>>(api, getStores.method);
                    if (skip === 0) {
                        setChannels(data.data);
                    }
                    // set channels in dependency array will cause infinite calling api
                    // else {
                    //     setChannels([...channels, ...data.data]);
                    // }

                    setHasMore(data.has_more);
                    setDataSkip(skip + limit);
                    setLoading(false);
                } catch (error) {
                    console.log(error);
                    setLoading(false);
                }
            },
            [businessUnit],
        );

        const onRefresh = () => {
            refresh();
            fetchChannel();
        };

        useEffect(() => {
            fetchChannel();
        }, [fetchChannel]);

        const onOperationStoreDrawerClose = () => {
            setOperationStoreDrawer({
                ...operationStoreDrawer,
                open: false,
            });
        };

        const onStoreDetailDrawerClose = () => {
            setStoreDetailDrawer({
                ...storeDetailDrawer,
                open: false,
            });
        };

        const onOperationStoreStoreFinish = () => {
            setOperationStoreDrawer({
                ...operationStoreDrawer,
                open: false,
            });
            onRefresh();
        };

        const onAdd = () => {
            setOperationStoreDrawer({
                open: true,
            });
        };
        const onEdit = (channel?: API.Channel) => {
            if (storeDetailDrawer.open) {
                setStoreDetailDrawer({
                    ...storeDetailDrawer,
                    open: false,
                });
            }
            setOperationStoreDrawer({
                open: true,
                current: channel,
            });
        };

        const onDetail = (channel: API.Channel) => {
            setStoreDetailDrawer({
                open: true,
                current: channel,
            });
        };

        return (
            <>
                <Component
                    title={t(title)}
                    type={type}
                    icon={icon}
                    inactiveIcon={inactiveIcon}
                    channels={channels}
                    hasPagination
                    containerRef={containerRef}
                    hasMore={hasMore}
                    onRefresh={onRefresh}
                    onAdd={onAdd}
                    onDetail={onDetail}
                    onEdit={onEdit}
                    loading={loading}
                />
                <OperationStoreDrawer
                    open={operationStoreDrawer.open}
                    onClose={onOperationStoreDrawerClose}
                    onFinish={onOperationStoreStoreFinish}
                    current={operationStoreDrawer.current}
                />
                <StoreDetailDrawer
                    open={storeDetailDrawer.open}
                    onClose={onStoreDetailDrawerClose}
                    current={storeDetailDrawer.current}
                    onEdit={onEdit}
                />
            </>
        );
    };
};

export default physicalStoreChannels(ChannelCollapse, {
    title: 'channel_physical_store',
    type: 'physicalstore',
    icon: <PhysicalStoreIcon />,
    inactiveIcon: <PhysicalStoreIcon inactive />,
});
