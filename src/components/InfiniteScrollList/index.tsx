import { CircularProgress } from '@mui/material';
import type { DetailedHTMLProps, HTMLAttributes, PropsWithChildren, ReactElement } from 'react';
import useInfiniteScroll from 'react-infinite-scroll-hook';

import styles from './index.module.scss';
interface InfiniteScrollListProps<T> {
    dataSource: T[];
    listItem: (data: T) => ReactElement;
    onLoadMore: () => void;
    hasMore: boolean;
    disabled?: boolean;
    loading: boolean;
    containerProps?: DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
}

const InfiniteScrollList = <T extends object>(props: PropsWithChildren<InfiniteScrollListProps<T>>) => {
    const { dataSource = [], onLoadMore, hasMore, disabled, listItem, loading, containerProps } = props;
    const [containerRef] = useInfiniteScroll({
        loading,
        hasNextPage: hasMore,
        onLoadMore,
        disabled,
        rootMargin: '0px 0px 400px 0px',
    });

    return (
        <div {...containerProps}>
            {dataSource.map(listItem)}
            {(loading || hasMore) && (
                <div className={styles.loadingContainer} ref={containerRef}>
                    <CircularProgress color="primary" size={30} />
                </div>
            )}
        </div>
    );
};

export default InfiniteScrollList;
