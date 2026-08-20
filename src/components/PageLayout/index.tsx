import 'simplebar-react/dist/simplebar.min.css';

import { Typography } from '@imbrace/ui';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { CircularProgress } from '@mui/material';
import type { CSSProperties, MutableRefObject, ReactNode, RefObject } from 'react';
import { useRef, useState } from 'react';
import type SimpleBarCore from 'simplebar-core';
import SimpleBar from 'simplebar-react';
import useResizeObserver from 'use-resize-observer';

import ActionButton from '../ActionButton';
import styles from './index.module.scss';

interface Props {
    bannerTitle?: string;
    title?: string | JSX.Element;
    smallTitle?: string;
    titleValue?: number;
    children?:
        | ((data: {
              headerRef: MutableRefObject<HTMLDivElement | undefined>;
              headerWidth?: number;
              headerHeight?: number;
              scrollableNodeRef: RefObject<HTMLDivElement>;
          }) => JSX.Element | JSX.Element[])
        | JSX.Element
        | JSX.Element[]
        | ReactNode;
    containerClassName?: string;
    contentContainerClassName?: string;
    sideBar?: JSX.Element;
    rightSideComponent?: JSX.Element;
    onBack?: () => Promise<void> | void;
    backBtnText?: string;
    loading?: boolean;
    extra?: ReactNode;
    containerStyle?: CSSProperties;
    simpleBarClassnames?: {
        contentWrapper?: string;
    };
    simpleBarRef?: RefObject<SimpleBarCore>;
    isModalPageLayout?: boolean;
    contentHightAuto?: boolean;
}

const PageLayout = (props: Props) => {
    const {
        bannerTitle,
        title,
        smallTitle,
        titleValue,
        children,
        containerClassName,
        contentContainerClassName,
        sideBar,
        rightSideComponent,
        onBack,
        backBtnText = 'Back',
        extra,
        loading,
        containerStyle,
        simpleBarRef,
        isModalPageLayout,
        contentHightAuto,
    } = props;
    const { ref, width = 0 } = useResizeObserver<HTMLDivElement>();
    const headerRef = useRef<HTMLDivElement>();
    const [headerHeight, setHeaderHeight] = useState(0);
    const scrollableNodeRef = useRef<HTMLDivElement>(null);

    return (
        <div className={styles.pageLayout} ref={ref}>
            {sideBar && sideBar}
            <SimpleBar
                ref={simpleBarRef}
                className={styles.simpleBarContainer}
                classNames={{
                    contentEl: styles.simpleBarContent,
                }}
                scrollableNodeProps={{ ref: scrollableNodeRef }}
                autoHide
            >
                <div className={`${styles.container} ${containerClassName || ''}`}>
                    {isModalPageLayout ? (
                        <div style={{ marginTop: '32px', marginBottom: '24px' }}>
                            <div className={styles.headingContainer} style={containerStyle}>
                                {!onBack ? (
                                    <Typography variant="Heading1" style={{ minHeight: '33.59px', color: 'var(--color-light-7)' }}>
                                        {title}
                                    </Typography>
                                ) : (
                                    <Typography
                                        variant="Heading2"
                                        style={{
                                            minHeight: '24px',
                                            color: 'var(--color-light-7)',
                                        }}
                                    >
                                        {title}
                                    </Typography>
                                )}
                                {rightSideComponent && rightSideComponent}
                            </div>
                            {extra}
                        </div>
                    ) : (
                        <div
                            className={styles.stickyHeader}
                            style={{
                                width: width ? `${width}px` : `${window.innerWidth - 208}px`,
                                paddingBottom: '12px',
                                paddingTop: bannerTitle ? 0 : 76,
                                ...(onBack && { paddingTop: '32px' }),
                            }}
                            ref={(ele: HTMLDivElement | null) => {
                                if (ele) {
                                    if (ele.getBoundingClientRect().height !== headerHeight) {
                                        setHeaderHeight(ele.getBoundingClientRect().height);
                                    }
                                    headerRef.current = ele;
                                }
                            }}
                        >
                            {onBack && (
                                <div className={styles.backButton}>
                                    <ActionButton
                                        sx={{ paddingLeft: '3px' }}
                                        onClick={onBack}
                                        type="secondary"
                                        text={backBtnText}
                                        icon={<ArrowBackIosNewIcon sx={{ height: 19 }} />}
                                    />
                                </div>
                            )}
                            {bannerTitle && <div className={styles.bannerHeader}>
                                <span className={styles.headerTitle}>{bannerTitle}</span>
                            </div> }
                            <div className={styles.headingContainer} style={containerStyle}>
                                {title && (
                                    <Typography variant="Heading1" className={styles.title}>
                                        {title}
                                    </Typography>
                                )}
                                {smallTitle && (
                                    <Typography variant="Heading1" className={styles.smallTitle}>
                                        {smallTitle} <span>{titleValue}</span>
                                    </Typography>
                                )}

                                {rightSideComponent && rightSideComponent}
                            </div>
                            {extra}
                        </div>
                    )}
                    <div
                        className={`${isModalPageLayout ? '' : styles.contentContainer} ${contentContainerClassName || ''} ${contentHightAuto ? styles.contentHeighAuto : ''}`}
                        style={{
                            paddingTop: isModalPageLayout ? 'auto' : `${headerHeight}px`,

                        }}
                    >
                        <div className={loading ? styles.blur : ''}>
                            {typeof children === 'function'
                                ? children({
                                      headerRef,
                                      headerHeight: headerHeight,
                                      headerWidth: width - 68,
                                      scrollableNodeRef,
                                  })
                                : children}
                        </div>

                        {loading && (
                            <div
                                className={styles.loadingContainer}
                                style={{
                                    paddingTop: `${headerHeight}px`,
                                }}
                            >
                                <CircularProgress size={'25px'} />
                            </div>
                        )}
                    </div>
                </div>
            </SimpleBar>
        </div>
    );
};

export default PageLayout;
