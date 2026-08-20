import type { MaskStylesObj } from '@reactour/mask';
import { useTour } from '@reactour/tour';
import { getPadding, safe } from '@reactour/utils';
import { useWindowSize } from '@uidotdev/usehooks';
import { debounce } from 'lodash';
import { type MouseEventHandler, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';

import { useSizes } from './hooks';
import indexStyles from './index.module.scss';

type ComponentPadding = number | number[];
export type Padding =
    | number
    | {
          mask?: ComponentPadding;
          popover?: ComponentPadding;
          wrapper?: ComponentPadding;
      };
export type MaskProps = {
    children?: React.ReactNode;
    // sizes: RectResult;
    styles?: MaskStylesObj;
    className?: string;
    highlightedAreaClassName?: string;
    padding?: number | number[];
    wrapperPadding?: number | number[];
    onClick?: MouseEventHandler<HTMLDivElement>;
    onClickHighlighted?: MouseEventHandler<SVGRectElement>;
    maskId?: string;
    clipId?: string;
    root?: Element | null;
};

export type StyleFn = (props: { [key: string]: any }, state?: { [key: string]: any }) => React.CSSProperties & { rx?: number };

export type Styles = {
    maskWrapper: StyleFn;
    svgWrapper: StyleFn;
    maskArea: StyleFn;
    maskRect: StyleFn;
    clickArea: StyleFn;
    highlightedArea: StyleFn;
};

export type StyleKey = keyof Styles;
export const defaultStyles: Styles = {
    maskWrapper: () => ({
        opacity: 0.7,
        left: 0,
        top: 0,
        position: 'fixed',
        zIndex: 99999,
        pointerEvents: 'none',
        color: '#000',
    }),
    svgWrapper: ({ windowWidth, windowHeight, wpt, wpl }) => ({
        width: windowWidth,
        height: windowHeight,
        left: Number(wpl),
        top: Number(wpt),
        position: 'fixed',
    }),
    maskArea: ({ x, y, width, height }) => ({
        x,
        y,
        width,
        height,
        fill: 'black',
        rx: 0,
    }),
    maskRect: ({ windowWidth, windowHeight, maskID }) => ({
        x: 0,
        y: 0,
        width: windowWidth,
        height: windowHeight,
        fill: 'currentColor',
        mask: `url(#${maskID})`,
    }),
    clickArea: ({ windowWidth, windowHeight, clipID }) => ({
        x: 0,
        y: 0,
        width: windowWidth,
        height: windowHeight,
        fill: 'currentcolor',
        pointerEvents: 'auto',
        clipPath: `url(#${clipID})`,
    }),
    highlightedArea: ({ x, y, width, height }) => ({
        x,
        y,
        width,
        height,
        pointerEvents: 'auto',
        fill: 'transparent',
        display: 'none',
    }),
};

function uniqueId(prefix: string) {
    return prefix + Math.random().toString(36).substring(2, 16);
}
export function stylesMatcher(styles: MaskStylesObj) {
    return (key: StyleKey, state: Record<string, unknown>): React.CSSProperties & { rx?: number } => {
        const base = defaultStyles[key](state);
        const custom = styles[key];
        return custom ? custom(base, state) : base;
    };
}

const NavbarMask = ({
    padding = 0,
    wrapperPadding = 0,
    onClick,
    onClickHighlighted,
    styles = {
        maskWrapper: (base) => ({
            ...base,
            color: 'transparent',
        }),
    },
    className,
    highlightedAreaClassName,
    maskId,
    clipId,
    root,
}: MaskProps) => {
    const location = useLocation();
    const { steps, currentStep, isOpen } = useTour();
    const step = steps[currentStep];
    const { sizes } = useSizes(step, {
        block: 'center',
        behavior: 'auto',
    });
    const { width: w = 0, height: h = 0 } = useWindowSize();
    const [dimensions, setDimensions] = useState<DOMRect>();
    const target = step?.selector instanceof Element ? step?.selector : document.querySelector(step?.selector);
    const maskID = maskId || uniqueId('mask__');
    const clipID = clipId || uniqueId('clip__');
    const getStyles = stylesMatcher(styles);
    const [pt, pr, pb, pl] = getPadding(padding);
    const [wpt, wpr, wpb, wpl] = getPadding(wrapperPadding);
    const rootW = useMemo(() => {
        if (root) {
            return root.getBoundingClientRect().width - 1;
        }
        return w || 0;
    }, [root, w]);
    const rootH = useMemo(() => {
        if (root) {
            return root.getBoundingClientRect().height - 1;
        }
        return h || 0;
    }, [root, h]);

    const elementObserver = useMemo(() => {
        return new ResizeObserver(() => {
            debounce(() => {
                if (!target) return;
                setDimensions(target.getBoundingClientRect());
            }, 200)();
        });
    }, [target]);

    useEffect(() => {
        if (!target) return;
        const element = target;

        elementObserver.observe(element);
        return () => {
            elementObserver.unobserve(element);
        };
    }, [target, elementObserver]);

    const width = safe(sizes?.width + pl + pr);
    const height = safe(sizes?.height + pt + pb);
    const top = safe(sizes?.top - pt - wpt);
    const left = safe(sizes?.left - pl - wpl);
    const windowWidth = rootW - wpl - wpr;
    const windowHeight = rootH - wpt - wpb;

    const maskAreaStyles = getStyles('maskArea', {
        x: left,
        y: top,
        width,
        height,
    });

    const highlightedAreaStyles = getStyles('highlightedArea', {
        x: left,
        y: top,
        width,
        height,
    });

    const blurMaskTop = {
        top: 0,
        bottom: dimensions ? dimensions.top : rootH,
        height: dimensions ? dimensions.top - 2 : 0,
    };

    const blurMaskBottom = {
        top: dimensions ? dimensions.bottom : 0,
        bottom: rootH,
        height: dimensions ? rootH - dimensions.bottom - 3 : 0,
    };

    if (location.pathname.indexOf('start') === -1 && !isOpen) {
        return null;
    }

    if (!isOpen) {
        return (
            <>
                <div style={getStyles('maskWrapper', { color: 'white' })} onClick={onClick} className={className}>
                    <svg
                        width={windowWidth}
                        height={windowHeight}
                        xmlns="http://www.w3.org/2000/svg"
                        style={getStyles('svgWrapper', {
                            windowWidth,
                            windowHeight,
                            wpt,
                            wpl,
                        })}
                    >
                        <defs>
                            <mask id={maskID}>
                                <rect x={0} y={0} width={windowWidth} height={windowHeight} fill="white" />
                                <rect
                                    style={maskAreaStyles}
                                    // Needs for Safari, as we pass any value, css rx will apply.
                                    rx={maskAreaStyles.rx ? 1 : undefined}
                                />
                            </mask>
                            <clipPath id={clipID}>
                                <polygon
                                    points={`0 0, 0 ${windowHeight}, ${left} ${windowHeight}, ${left} ${top}, ${left + width} ${top}, ${
                                        left + width
                                    } ${top + height}, ${left} ${
                                        top + height
                                    }, ${left} ${windowHeight}, ${windowWidth} ${windowHeight}, ${windowWidth} 0`}
                                />
                            </clipPath>
                        </defs>

                        {/* The actual Mask */}
                        <rect
                            style={getStyles('maskRect', {
                                windowWidth,
                                windowHeight,
                                maskID,
                            })}
                        />
                        {/* The clickable area */}
                        <rect
                            style={getStyles('clickArea', {
                                windowWidth,
                                windowHeight,
                                top,
                                left,
                                width,
                                height,
                                clipID,
                            })}
                        />
                        <rect
                            style={highlightedAreaStyles}
                            className={highlightedAreaClassName}
                            onClick={onClickHighlighted}
                            rx={highlightedAreaStyles.rx ? 1 : undefined}
                        />
                    </svg>
                </div>
                <div className={indexStyles.blurMask} style={{ width: windowWidth, top: 0, bottom: rootH, height: rootH }} />
            </>
        );
    }

    return (
        <>
            <div className={indexStyles.blurMask} style={{ width: windowWidth, ...blurMaskTop }} />
            <div style={getStyles('maskWrapper', { color: 'white' })} onClick={onClick} className={className}>
                <svg
                    width={windowWidth}
                    height={windowHeight}
                    xmlns="http://www.w3.org/2000/svg"
                    style={getStyles('svgWrapper', {
                        windowWidth,
                        windowHeight,
                        wpt,
                        wpl,
                    })}
                >
                    <defs>
                        <mask id={maskID}>
                            <rect x={0} y={0} width={windowWidth} height={windowHeight} fill="white" />
                            <rect
                                style={maskAreaStyles}
                                // Needs for Safari, as we pass any value, css rx will apply.
                                rx={maskAreaStyles.rx ? 1 : undefined}
                            />
                        </mask>
                        <clipPath id={clipID}>
                            <polygon
                                points={`0 0, 0 ${windowHeight}, ${left} ${windowHeight}, ${left} ${top}, ${left + width} ${top}, ${
                                    left + width
                                } ${top + height}, ${left} ${
                                    top + height
                                }, ${left} ${windowHeight}, ${windowWidth} ${windowHeight}, ${windowWidth} 0`}
                            />
                        </clipPath>
                    </defs>

                    {/* The actual Mask */}
                    <rect
                        style={getStyles('maskRect', {
                            windowWidth,
                            windowHeight,
                            maskID,
                        })}
                    />
                    {/* The clickable area */}
                    <rect
                        style={getStyles('clickArea', {
                            windowWidth,
                            windowHeight,
                            top,
                            left,
                            width,
                            height,
                            clipID,
                        })}
                    />
                    <rect
                        style={highlightedAreaStyles}
                        className={highlightedAreaClassName}
                        onClick={onClickHighlighted}
                        rx={highlightedAreaStyles.rx ? 1 : undefined}
                    />
                </svg>
            </div>
            <div className={indexStyles.blurMask} style={{ width: windowWidth, ...blurMaskBottom }} />
        </>
    );
};

export const Mask = ({
    padding = 0,
    wrapperPadding = 0,
    onClick,
    onClickHighlighted,
    styles = {
        maskWrapper: (base) => ({
            ...base,
            color: 'transparent',
        }),
    },
    className,
    highlightedAreaClassName,
    maskId,
    clipId,
    root,
}: MaskProps) => {
    const location = useLocation();
    const { steps, currentStep, isOpen } = useTour();
    const step = steps[currentStep];
    const { sizes } = useSizes(step, {
        block: 'center',
        behavior: 'auto',
    });
    const { width: w = 0, height: h = 0 } = useWindowSize();

    const maskID = maskId || uniqueId('mask__');
    const clipID = clipId || uniqueId('clip__');
    const getStyles = stylesMatcher(styles);
    const [pt, pr, pb, pl] = getPadding(padding);
    const [wpt, wpr, wpb, wpl] = getPadding(wrapperPadding);
    const rootW = useMemo(() => {
        if (root) {
            return root.getBoundingClientRect().width - 1;
        }
        return w || 0;
    }, [root, w]);
    const rootH = useMemo(() => {
        if (root) {
            return root.getBoundingClientRect().height - 1;
        }
        return h || 0;
    }, [root, h]);

    const width = safe(sizes?.width + pl + pr);
    const height = safe(sizes?.height + pt + pb);
    const top = safe(sizes?.top - pt - wpt);
    const left = safe(sizes?.left - pl - wpl);
    const windowWidth = rootW - wpl - wpr;
    const windowHeight = rootH - wpt - wpb;

    const maskAreaStyles = getStyles('maskArea', {
        x: left,
        y: top,
        width,
        height,
    });

    const highlightedAreaStyles = getStyles('highlightedArea', {
        x: left,
        y: top,
        width,
        height,
    });

    if (location.pathname.indexOf('start') === -1 && !isOpen) {
        return null;
    }

    return (
        <>
            <div style={getStyles('maskWrapper', { color: 'white' })} onClick={onClick} className={className}>
                <svg
                    width={windowWidth}
                    height={windowHeight}
                    xmlns="http://www.w3.org/2000/svg"
                    style={getStyles('svgWrapper', {
                        windowWidth,
                        windowHeight,
                        wpt,
                        wpl,
                    })}
                >
                    <defs>
                        <mask id={maskID}>
                            <rect x={0} y={0} width={windowWidth} height={windowHeight} fill="white" />
                            <rect
                                style={maskAreaStyles}
                                // Needs for Safari, as we pass any value, css rx will apply.
                                rx={maskAreaStyles.rx ? 1 : undefined}
                            />
                        </mask>
                        <clipPath id={clipID}>
                            <polygon
                                points={`0 0, 0 ${windowHeight}, ${left} ${windowHeight}, ${left} ${top}, ${left + width} ${top}, ${
                                    left + width
                                } ${top + height}, ${left} ${
                                    top + height
                                }, ${left} ${windowHeight}, ${windowWidth} ${windowHeight}, ${windowWidth} 0`}
                            />
                        </clipPath>
                    </defs>

                    {/* The actual Mask */}
                    <rect
                        style={getStyles('maskRect', {
                            windowWidth,
                            windowHeight,
                            maskID,
                        })}
                    />
                    {/* The clickable area */}
                    <rect
                        style={getStyles('clickArea', {
                            windowWidth,
                            windowHeight,
                            top,
                            left,
                            width,
                            height,
                            clipID,
                        })}
                    />
                    <rect
                        style={highlightedAreaStyles}
                        className={highlightedAreaClassName}
                        onClick={onClickHighlighted}
                        rx={highlightedAreaStyles.rx ? 1 : undefined}
                    />
                </svg>
            </div>
            <div
                className={indexStyles.blurMask}
                style={{
                    width: rootW,
                    top: 0,
                    bottom: rootH,
                    right: 0,
                    height: rootH,
                    display: (getStyles('maskWrapper', {}) as Record<string, string>).displayBlur as string,
                }}
            />
        </>
    );
};

export default NavbarMask;
