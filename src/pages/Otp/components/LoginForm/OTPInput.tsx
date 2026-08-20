import type { ChangeEventHandler, FocusEventHandler, KeyboardEventHandler } from 'react';
import React, { useEffect, useRef } from 'react';

interface OTPInputProps {
    className: string;
    type: string;
    value: string;
    isFocus: boolean;
    key: number;
    onFocus?: FocusEventHandler<HTMLInputElement>;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
    index?: string;
    style?: React.CSSProperties;
    onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}
function OTPInput(props: OTPInputProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const { value, index, onChange, onFocus, onBlur, className, style, isFocus, onKeyDown } = props;

    useEffect(() => {
        if (inputRef.current) {
            if (isFocus) {
                inputRef.current.focus();
            } else {
                inputRef.current.blur();
            }
        }
    }, [isFocus]);

    return (
        <input
            ref={inputRef}
            className={className}
            style={style}
            type="text"
            maxLength={1}
            value={value}
            key={index}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
        />
    );
}

export default OTPInput;
