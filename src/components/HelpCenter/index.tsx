import { EllipsisText, Icon, Illustration, Search, Space, Spin, Typography } from '@imbrace/ui';
import { CircularProgress, Grow, Popper, styled } from '@mui/material';
import type { QueryFunction } from '@tanstack/react-query';
import { QueryClientProvider, useInfiniteQuery, useMutation } from '@tanstack/react-query';
import type { Virtualizer } from '@tanstack/react-virtual';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from '@uidotdev/usehooks';
import i18next from 'i18next';
import uniqueId from 'lodash/uniqueId';
import type { RefObject } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Trans } from 'react-i18next';
import { Provider } from 'react-redux';
import { replace } from 'redux-first-history';
import SimpleBar from 'simplebar-react';

import { queryClient } from '@/App';
import { fetchAccountThunk } from '@/redux/slices/account';
import store, { useAppDispatch, useAppSelector } from '@/redux/store';
import { putAccount } from '@/services/api/account';
import { getResources } from '@/services/api/resources';
import apiFetch from '@/services/axios/handler';
import { CHAT_WIDGET_URL } from '@/services/baseURL';

import styles from './index.module.scss';

export const Iframe = styled('iframe')(({ theme }) => ({
    border: 'none',
    overflow: 'hidden',
    width: '100%',
    height: '100%',
    // boxShadow: '0 1px 8px rgb(189 189 189 / 8%), 0 2px 16px rgb(224 224 224 / 20%)',
    transition: 'all 0.2s ease-in-out 0s',
    zIndex: '99999',
}));

const Container = styled('div')(() => ({
    position: 'relative',
    overflow: 'hidden',
    padding: '0',
    marginLeft: '12px',
    width: '460px',
    height: 'calc(100vh - 20px)',
    maxHeight: `${iframeSize.chatWindow.height}px`,
    boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
    borderRadius: '10px',
    background: '#fff',
}));
export const LoadingContainer = styled('div')(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const IMBRACE_CHAT_WIDGET = 'imbrace-chat-widget';

const iframeActionTypes = {
    CLOSE_WIDGET: 'CLOSE_WIDGET',
    OPEN_WIDGET: 'OPEN_WIDGET',
    GET_OPTIONS: 'GET_OPTIONS',
};

const iframeSize = {
    icon: {
        width: 70,
        height: 70,
    },
    chatWindow: {
        width: 470,
        height: 550,
    },
};

export let helpCenterPopper: { close?: () => void; key: string } | null = null;

interface WebWidgetProps {
    channelId: string;
    isDrawerOpen?: boolean;
    onClose: () => void;
    prefillMessage?: string;
}

const WebWidget = ({ channelId, isDrawerOpen, onClose, prefillMessage }: WebWidgetProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const iframeReducer = (event: MessageEvent) => {
            const { origin, action } = event.data;
            if (origin !== IMBRACE_CHAT_WIDGET) {
                return;
            }
            const iframe = iframeRef.current;
            if (iframe) {
                switch (action) {
                    case iframeActionTypes.CLOSE_WIDGET: {
                        onClose();
                        break;
                    }
                    case iframeActionTypes.GET_OPTIONS: {
                        event?.source?.postMessage(
                            {
                                action: iframeActionTypes.GET_OPTIONS,
                                defaultOpen: true,
                                closeable: false,
                                prefillMessage,
                                origin: IMBRACE_CHAT_WIDGET,
                                channelId,
                            },
                            {
                                targetOrigin: event?.origin,
                            },
                        );
                        break;
                    }

                    default:
                        break;
                }
            }
        };

        window.addEventListener('message', iframeReducer);
        return () => {
            window.removeEventListener('message', iframeReducer);
        };
    }, [channelId, onClose, prefillMessage]);

    return (
        <>
            <Iframe
                ref={iframeRef}
                id="imbraceChatWidget"
                name="Imbrace Chat Widget"
                src={`${CHAT_WIDGET_URL.replace(/(\/[^/]*\.js)/g, '')}?channel_id=${channelId}&parentUrl=${encodeURIComponent(
                    window.location.href,
                )}&defaultOpen=true`}
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-top-navigation"
                scrolling="no"
                frameBorder="0"
                allowFullScreen
                allowTransparency
                title="imbrace-chat-widget"
                onLoad={() => {
                    setLoading(false);
                }}
            ></Iframe>
            {loading && (
                <LoadingContainer>
                    <CircularProgress size={25} />
                </LoadingContainer>
            )}
        </>
    );
};

const searchResources: QueryFunction<
    {
        data: API.Resource[];
        next?: string;
        previous?: string;
    },
    ['resources', string | undefined],
    string | undefined
> = async ({ queryKey, pageParam }) => {
    if (!queryKey[1]) {
        throw new Error('missing query parameter');
    }

    const { data } = await apiFetch<{ items: API.Resource[]; next?: { page: string }; previous?: { page: string } }>(
        getResources.api,
        getResources.method,
        {
            query: queryKey[1],
            page: pageParam,
        },
    );

    return { data: data.items, next: data.next?.page, previous: data.previous?.page };
};

const ResourcesList = ({
    data,
    parentRef,
    hasNextPage,
    rowVirtualizer,
    toggleWidget,
}: {
    data: API.Resource[];
    parentRef: RefObject<HTMLDivElement>;
    hasNextPage: boolean;
    rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
    toggleWidget: () => void;
}) => {
    if (data.length === 0) {
        return (
            <div>
                <Illustration
                    name="searchEmpty"
                    size={32}
                    description={
                        <Space size={4} direction="vertical">
                            <Typography variant="SubHeading2" style={{ color: 'var(--color-light-5)' }}>
                                {i18next.t('search_empty')}
                            </Typography>
                            <Typography variant="Caption">
                                <Trans i18nKey="search_empty_desc">
                                    Please check the spelling or
                                    <button
                                        onClick={() => {
                                            toggleWidget();
                                        }}
                                    >
                                        contact our team
                                    </button>{' '}
                                    for help.
                                </Trans>
                            </Typography>
                        </Space>
                    }
                />
            </div>
        );
    }
    return (
        <SimpleBar className={styles.resourceList} scrollableNodeProps={{ ref: parentRef }} autoHide>
            <div
                className={styles.inner}
                style={{
                    height: rowVirtualizer.getTotalSize(),
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const isLoaderRow = virtualRow.index > data.length - 1;
                    if (isLoaderRow) {
                        return (
                            <div
                                key={virtualRow.index}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            >
                                {hasNextPage ? (
                                    <div className={styles.loading} style={{ marginTop: 20 }}>
                                        <CircularProgress size={25} />
                                    </div>
                                ) : null}
                            </div>
                        );
                    }
                    const { sections, title, path } = data[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className={styles.resource}
                            onClick={() => {
                                window.open(`https://imbrace.gitbook.io/imbrace-no-code-workflow/${path}`);
                            }}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                        >
                            <Space size={12} align="start">
                                <div style={{ height: '24px' }}>
                                    <Icon name="emailPreview" style={{ fontSize: '24px', color: 'var(--color-light-5)' }} />
                                </div>

                                <Space size={4} direction="vertical" align="start" style={{ overflow: 'hidden' }}>
                                    <EllipsisText element={<Typography variant="SubHeading2Tight" />} text={title} />
                                    {sections?.[0]?.body && (
                                        <Typography
                                            style={{
                                                color: 'var(--color-light-5)',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                WebkitLineClamp: 2,
                                                display: '-webkit-box',
                                                WebkitBoxOrient: 'vertical',
                                                whiteSpace: 'normal',
                                            }}
                                        >
                                            {sections?.[0]?.body}
                                        </Typography>
                                    )}
                                </Space>
                            </Space>
                        </div>
                    );
                })}
            </div>
        </SimpleBar>
    );
};

const handelUpdateAccount = async (params: { userId: string; formData: { on_boarded: boolean } }) => {
    await apiFetch(putAccount.api.replace('{{user_id}}', params.userId), putAccount.method, params.formData);
};

const HelpCenter = ({ onClose, toggleWidget, readOnly }: { onClose: () => void; toggleWidget: () => void; readOnly?: boolean }) => {
    const [search, setSearch] = useState<string>();
    const parentRef = useRef<HTMLDivElement>(null);
    const debouncedSearch = useDebounce(search, 300);
    const userId = useAppSelector((state) => state.Account.id);
    const dispatch = useAppDispatch();

    const updateAccount = useMutation({
        mutationFn: handelUpdateAccount,
        onSuccess: async () => {
            await dispatch(fetchAccountThunk({ silent: true })).unwrap();
            dispatch(replace('/start'));
            onClose();
        },
        onError: () => {},
    });

    const { data, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
        queryKey: ['resources', debouncedSearch],
        queryFn: searchResources,
        initialPageParam: undefined,
        getNextPageParam: (lastPage, groups) => lastPage?.next,
        getPreviousPageParam: (firstPage, groups) => firstPage?.previous || undefined,
        enabled: !!search,
    });

    const allRows = data ? data.pages.flatMap((d) => d.data) : [];

    const rowVirtualizer = useVirtualizer({
        count: hasNextPage ? allRows.length + 1 : allRows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 88,
        overscan: 5,
    });
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    const lastRow = useMemo(() => lastItem, [lastItem]);

    useEffect(() => {
        if (!lastRow) {
            return;
        }

        if (lastRow.index >= allRows.length - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, fetchNextPage, allRows.length, isFetchingNextPage, lastRow]);

    return (
        <>
            <div className={`${styles.helpCenter} ${readOnly ? styles.readOnly : ''}`}>
                <Icon
                    name="close"
                    onClick={() => {
                        onClose();
                    }}
                    style={{ color: 'white', position: 'absolute', top: '32px', right: '32px', fontSize: '24px', cursor: 'pointer' }}
                />

                <Space size={24} direction="vertical" align="start" style={{ width: '100%', height: '100%' }}>
                    <Space size={4} direction="vertical" align="start" style={{ padding: '0 32px', paddingTop: '32px' }}>
                        <Typography variant="Heading2" style={{ color: 'white' }}>
                            {i18next.t('help_center')}
                        </Typography>
                        <Typography style={{ color: 'white' }}>{i18next.t('help_center_desc')}</Typography>
                    </Space>
                    <div style={{ width: '100%', padding: '0 32px' }}>
                        <Search
                            value={search}
                            onSearch={(value) => {
                                setSearch(value);
                            }}
                            fullWidth
                            style={{ background: 'white' }}
                            placeholder={i18next.t('help_center_search_resource_placeholder')}
                            onReset={() => setSearch('')}
                        />
                    </div>
                    {search ? (
                        <Spin isSpinning={isFetching && !isFetchingNextPage}>
                            <ResourcesList
                                toggleWidget={toggleWidget}
                                rowVirtualizer={rowVirtualizer}
                                hasNextPage={hasNextPage}
                                parentRef={parentRef}
                                data={allRows}
                            />
                        </Spin>
                    ) : (
                        <>
                            <Space size={12} direction="vertical" align="start" style={{ padding: '0 32px' }}>
                                <Typography variant="SubHeading2">{i18next.t('resources')}</Typography>
                                <div className={styles.blocks}>
                                    <Space
                                        size={16}
                                        direction="vertical"
                                        align="start"
                                        justify="between"
                                        className={styles.block}
                                        onClick={() => {
                                            window.open('https://imbrace.gitbook.io/imbrace-no-code-workflow/');
                                        }}
                                    >
                                        <Icon name="guideBook" />
                                        <Typography variant="BodyTight">{i18next.t('help_center_guide')}</Typography>
                                    </Space>
                                    <Spin isSpinning={updateAccount.isPending}>
                                        <Space
                                            size={16}
                                            direction="vertical"
                                            align="start"
                                            justify="between"
                                            className={`${styles.block} ${updateAccount.isPending ? styles.loading : ''}`}
                                            onClick={() => {
                                                if (!updateAccount.isPending) {
                                                    updateAccount.mutate({
                                                        userId,
                                                        formData: {
                                                            on_boarded: false,
                                                        },
                                                    });
                                                }
                                            }}
                                        >
                                            <Icon name="onboardingFlow" />
                                            <Typography variant="BodyTight">{i18next.t('help_center_on_boarding')}</Typography>
                                        </Space>
                                    </Spin>
                                    {/* <Space size={16} direction="vertical" align="start" justify="between" className={styles.block}>
                                        <Icon name="demoPlay" />
                                        <Typography variant="BodyTight">{i18next.t('help_center_demo')}</Typography>
                                    </Space> */}
                                </div>
                            </Space>
                        </>
                    )}
                </Space>
            </div>
            <div className={styles.headerBackground}></div>
        </>
    );
};

interface HOCProps {
    target: HTMLElement;
    channelId: string;
    prefillMessage?: string;
    defaultWebWidget?: boolean;
    readOnly?: boolean;
    onClose?: () => void;
}

interface HOCRef {
    close: () => void;
    isOpen: boolean;
}

const HOC = forwardRef<HOCRef, HOCProps>(({ target, channelId, prefillMessage, defaultWebWidget, readOnly, onClose }, ref) => {
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(target);
    const [showWidget, setShowWidget] = useState(defaultWebWidget);
    const open = Boolean(anchorEl);

    useImperativeHandle(ref, () => ({
        close: () => {
            setAnchorEl(null);
            helpCenterPopper = null;
            onClose?.();
        },
        isOpen: open,
    }));

    const handleOnClose = useCallback(() => {
        setAnchorEl(null);
        helpCenterPopper = null;
        onClose?.();
    }, [onClose]);

    return (
        <Popper
            open={open}
            anchorEl={anchorEl}
            placement="right"
            role="dialog"
            sx={{
                zIndex: 100001,
                paddingBottom: '15px',
            }}
            transition
            className={showWidget ? styles.chatForm : ''}
        >
            {({ TransitionProps }) => (
                <Grow {...TransitionProps} style={{ transformOrigin: '0 70%' }}>
                    <Container>
                        {showWidget ? (
                            <WebWidget channelId={channelId} onClose={handleOnClose} prefillMessage={prefillMessage} />
                        ) : (
                            <HelpCenter
                                onClose={handleOnClose}
                                toggleWidget={() => {
                                    setShowWidget(true);
                                }}
                                readOnly={readOnly}
                            />
                        )}
                    </Container>
                </Grow>
            )}
        </Popper>
    );
});

export const openHelpCenter = ({
    target,
    channelId,
    prefillMessage,
    defaultWebWidget,
    readOnly,
    onClose,
}: {
    target: HTMLElement;
    channelId: string;
    prefillMessage?: string;
    defaultWebWidget?: boolean;
    readOnly?: boolean;
    onClose?: () => void;
}) => {
    const fragment = document.createDocumentFragment();
    const key = uniqueId('webWidget');
    const root = createRoot(fragment);
    if (helpCenterPopper?.close && helpCenterPopper.key !== key) {
        helpCenterPopper.close();
        helpCenterPopper = null;
        return null;
    }

    return root.render(
        createPortal(
            <Provider store={store}>
                <QueryClientProvider client={queryClient}>
                    <HOC
                        ref={(ele) => {
                            const { close, isOpen } = ele || {};
                            Promise.resolve().then(() => {
                                if ((!helpCenterPopper || (!helpCenterPopper?.close && close && helpCenterPopper?.key === key)) && isOpen) {
                                    helpCenterPopper = { close, key };
                                }
                            });
                        }}
                        channelId={channelId}
                        target={target}
                        prefillMessage={prefillMessage}
                        defaultWebWidget={defaultWebWidget}
                        readOnly={readOnly}
                        onClose={onClose}
                    />
                </QueryClientProvider>
            </Provider>,
            document.body,
        ),
    );
};

export default WebWidget;
