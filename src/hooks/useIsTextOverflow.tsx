import debounce from 'lodash/debounce';
import type { RefObject } from 'react';
import { useLayoutEffect, useState } from 'react';

const useIsTextOverflow = (
    ref: RefObject<HTMLSpanElement>,
    callback: boolean | ((isOverFlow?: boolean) => void),
    customDependencies: unknown,
) => {
    const [isOverflow, setIsOverflow] = useState<boolean>();

    useLayoutEffect(() => {
        const { current } = ref;

        const trigger = () => {
            if (current) {
                const hasOverflow = current.offsetHeight < current.scrollHeight || current.offsetWidth < current.scrollWidth;
                setIsOverflow(hasOverflow);

                if (callback && typeof callback === 'function') callback(hasOverflow);
            }
        };

        if (current) {
            trigger();
        }

        const resizeObserver = new ResizeObserver(
            debounce(() => {
                trigger();
            }, 500),
        );

        if (current) {
            resizeObserver.observe(current);
        }
        return () => {
            if (current) {
                resizeObserver.unobserve(current);
            }
        };
    }, [callback, ref, customDependencies]);

    return isOverflow;
};

export default useIsTextOverflow;
