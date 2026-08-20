import { Search } from '@imbrace/ui';
import type { InputBaseComponentProps } from '@mui/material';
import { useDebounce } from '@uidotdev/usehooks';
import type { ElementType } from 'react';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

export interface SearchBarRef {
    reset: () => void;
}

const SearchBar = forwardRef<SearchBarRef, { onSearch?: (value?: string) => void; placeholder?: string }>(
    ({ onSearch, placeholder }, ref) => {
        const [value, setValue] = useState<string>('');
        const inputRef = useRef<HTMLInputElement>(null);
        const debouncedSearch = useDebounce(value, 300);

        useImperativeHandle(ref, () => ({
            reset: () => {
                setValue('');
            },
        }));

        const { t } = useTranslation();
        useEffect(() => {
            onSearch?.(debouncedSearch);
        }, [onSearch, debouncedSearch]);

        return (
            <div className={styles.searchBarContainer}>
                <div className={styles.searchBar} style={{ width: '100%' }}>
                    <Search
                        sx={{
                            minWidth: 'auto',
                            width: '100%',
                            borderRadius: '0px',
                            borderWidth: '1px',
                            '& .MuiInputBase-root': {
                                borderRadius: 'none',
                            },
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
                    />
                </div>
            </div>
        );
    },
);

export default SearchBar;
