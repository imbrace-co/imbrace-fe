import { useCallback, useState } from 'react';

export const useInput = (initialValue) => {
    const [input, setInput] = useState(initialValue);

    const handleInputChange = useCallback((event) => {
        setInput(event.target.value);
    }, []);

    const resetInput = useCallback(() => {
        setInput('');
    }, []);

    return [input, handleInputChange, resetInput, setInput];
};
