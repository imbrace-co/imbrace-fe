import type { StepType } from '@reactour/tour';
import { getRect, getWindow, inView, smoothScroll } from '@reactour/utils';
import { useCallback, useEffect, useState } from 'react';

const initialState = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    windowWidth: 0,
    windowHeight: 0,
    x: 0,
    y: 0,
};

type ScrollLogicalPosition = 'center' | 'end' | 'nearest' | 'start';
type ScrollBehavior = 'auto' | 'smooth';

type ScrollIntoViewOptions = {
    behavior?: ScrollBehavior;
    block?: ScrollLogicalPosition;
    inline?: ScrollLogicalPosition;
};

export function useSizes(
    step: StepType,
    scrollOptions: ScrollIntoViewOptions & {
        inViewThreshold?: number | { x?: number; y?: number };
    } = {
        block: 'center',
        behavior: 'smooth',
        inViewThreshold: 0,
    },
    root?: Element | null,
) {
    const [transition, setTransition] = useState(false);
    const [observing, setObserving] = useState(false);
    const [isHighlightingObserved, setIsHighlightingObserved] = useState(false);
    const [refresher, setRefresher] = useState(null as any);
    const [dimensions, setDimensions] = useState(initialState);
    const target = step?.selector instanceof Element ? step?.selector : document.querySelector(step?.selector);

    const handleResize = useCallback(() => {
        const { hasHighlightedElems, ...newDimensions }: any = getHighlightedRect(
            target,
            step?.highlightedSelectors,
            step?.bypassElem,
            root,
        );
        if (Object.entries(dimensions).some(([key, value]) => newDimensions[key] !== value)) {
            setDimensions(newDimensions);
        }
    }, [target, step?.highlightedSelectors, dimensions, root, step?.bypassElem]);

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [target, step?.highlightedSelectors, refresher, handleResize]);

    useEffect(() => {
        const isInView = inView({
            ...dimensions,
            threshold: scrollOptions.inViewThreshold,
        });
        // TODO: - Solve cases when no target but highlightedSelectors
        if (!isInView && target) {
            setTransition(true);
            smoothScroll(target, scrollOptions)
                .then(() => {
                    if (!observing) setRefresher(Date.now());
                })
                .finally(() => {
                    setTransition(false);
                });
        }
    }, [dimensions, observing, scrollOptions, target]);

    const observableRefresher = useCallback(() => {
        setObserving(true);
        const { hasHighlightedElems, ...dimesions } = getHighlightedRect(target, step?.highlightedSelectors, step?.bypassElem, root);
        setIsHighlightingObserved(hasHighlightedElems);
        setDimensions(dimesions);
        setObserving(false);
    }, [target, step?.highlightedSelectors, root, step?.bypassElem]);

    return {
        sizes: dimensions,
        transition,
        target,
        observableRefresher,
        isHighlightingObserved,
    };
}

function getHighlightedRect(node: Element | null, highlightedSelectors: string[] = [], bypassElem = true, root?: Element | null) {
    let hasHighlightedElems = false;
    let windowWidth, windowHeight;
    if (root) {
        const { width, height } = root.getBoundingClientRect();
        windowWidth = width;
        windowHeight = height;
    } else {
        const { w, h } = getWindow();
        windowWidth = w;
        windowHeight = h;
    }
    if (!highlightedSelectors) {
        return {
            ...getRect(node),
            windowWidth,
            windowHeight,
            hasHighlightedElems: false,
        };
    }

    const attrs = getRect(node);
    const altAttrs = {
        bottom: 0,
        height: 0,
        left: windowWidth,
        right: 0,
        top: windowHeight,
        width: 0,
    };

    for (const selector of highlightedSelectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (!element || element.style.display === 'none' || element.style.visibility === 'hidden') {
            continue;
        }

        const rect = getRect(element);
        hasHighlightedElems = true;
        if (bypassElem || !node) {
            if (rect.top < altAttrs.top) {
                altAttrs.top = rect.top;
            }

            if (rect.right > altAttrs.right) {
                altAttrs.right = rect.right;
            }

            if (rect.bottom > altAttrs.bottom) {
                altAttrs.bottom = rect.bottom;
            }

            if (rect.left < altAttrs.left) {
                altAttrs.left = rect.left;
            }

            altAttrs.width = altAttrs.right - altAttrs.left;
            altAttrs.height = altAttrs.bottom - altAttrs.top;
        } else {
            if (rect.top < attrs.top) {
                attrs.top = rect.top;
            }

            if (rect.right > attrs.right) {
                attrs.right = rect.right;
            }

            if (rect.bottom > attrs.bottom) {
                attrs.bottom = rect.bottom;
            }

            if (rect.left < attrs.left) {
                attrs.left = rect.left;
            }

            attrs.width = attrs.right - attrs.left;
            attrs.height = attrs.bottom - attrs.top;
        }
    }

    const bypassable = bypassElem || !node ? altAttrs.width > 0 && altAttrs.height > 0 : false;

    return {
        left: (bypassable ? altAttrs : attrs).left,
        top: (bypassable ? altAttrs : attrs).top,
        right: (bypassable ? altAttrs : attrs).right,
        bottom: (bypassable ? altAttrs : attrs).bottom,
        width: (bypassable ? altAttrs : attrs).width,
        height: (bypassable ? altAttrs : attrs).height,
        windowWidth,
        windowHeight,
        hasHighlightedElems,
        x: attrs.x,
        y: attrs.y,
    };
}
