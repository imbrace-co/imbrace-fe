import debounce from 'lodash/debounce';
import { useEffect, useState } from 'react';

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = debounce(() => setDebouncedValue(value), delay);
        handler();
        return () => {
            handler.cancel();
        };
    }, [value, delay]);

    return debouncedValue;
}

export default useDebounce;
