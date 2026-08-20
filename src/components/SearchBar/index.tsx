import { Search } from '@imbrace/ui';
import type { InputBaseComponentProps } from '@mui/material';
import { ClickAwayListener } from '@mui/material';
import { animated, useSpring } from '@react-spring/web';
import { useDebounce } from '@uidotdev/usehooks';
import type { CSSProperties, ElementType } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

export interface SearchBarRef {
    reset: () => void;
}

const SearchBar = forwardRef<SearchBarRef, { onSearch?: (value?: string) => void; placeholder?: string }>(
    ({ onSearch, placeholder }, ref) => {
        const [expand, setExpand] = useState(false);
        const [value, setValue] = useState<string>('');
        const inputRef = useRef<HTMLInputElement>(null);
        const debouncedSearch = useDebounce(value, 300);

        useImperativeHandle(ref, () => ({
            reset: () => {
                setValue('');
            },
        }));

        const { t } = useTranslation();
        const [spring, api] = useSpring(() => ({
            from: {
                width: 40,
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
            },
            to: {
                width: 40,
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
            },
            onRest: (result) => {
                if (result.value.width === 40) {
                    setExpand(false);
                }
                if (result.value.width === 248) {
                    setExpand(true);
                    inputRef.current?.focus();
                }
            },
        }));

        useEffect(() => {
            onSearch?.(debouncedSearch);
        }, [onSearch, debouncedSearch]);

        return (
            <ClickAwayListener
                onClickAway={() => {
                    if (expand && !value) {
                        api.start({
                            width: 40,
                            paddingTop: 0,
                            paddingBottom: 0,
                            paddingLeft: 0,
                            paddingRight: 0,
                        });
                    }
                }}
            >
                <div className={styles.searchBarContainer}>
                    <animated.div className={styles.searchBar} style={{ width: spring.width }}>
                        <Search
                            inputComponent={animated.input as ElementType<InputBaseComponentProps>}
                            inputProps={{
                                style: {
                                    paddingTop: spring.paddingTop,
                                    paddingBottom: spring.paddingBottom,
                                    paddingLeft: spring.paddingLeft,
                                    paddingRight: spring.paddingRight,
                                    width: !expand ? 0 : undefined,
                                } as unknown as CSSProperties,
                            }}
                            sx={{
                                minWidth: 'auto',
                                width: expand ? '100%' : 'calc(100% + 2px)',
                                borderWidth: expand ? '1px' : 0,
                            }}
                            inputRef={inputRef}
                            onReset={() => {
                                setValue('');
                            }}
                            value={value}
                            onSearch={(searchValue) => {
                                setValue(searchValue);
                            }}
                            search={{
                                containerStyle: {
                                    padding: 0,
                                },
                                iconButtonProps: {
                                    size: 'default',
                                },
                            }}
                            placeholder={placeholder ? placeholder : t('search')}
                            {...(!expand && {
                                onClick: () => {
                                    setExpand(true);
                                    api.start({
                                        width: 248,
                                        paddingTop: 8,
                                        paddingBottom: 8,
                                        paddingLeft: 12,
                                        paddingRight: 12,
                                    });
                                },
                            })}
                        />
                    </animated.div>
                </div>
            </ClickAwayListener>
        );
    },
);

export default SearchBar;
