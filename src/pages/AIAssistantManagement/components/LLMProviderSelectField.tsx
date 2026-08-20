import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, Box, ClickAwayListener } from '@mui/material';
import type { AutocompleteCloseReason } from '@mui/material/Autocomplete';
import Popper, { type PopperProps } from '@mui/material/Popper';
import { FieldText, Typography } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';

type ProviderOption = {
    label: string;
    value: string;
    group: string;
    type?: string;
};

interface LLMProviderSelectFieldProps {
    value?: string;
    onChange: (value: string) => void;
    options: ProviderOption[];
    loading?: boolean;
    disabled?: boolean;
    error?: boolean;
    helperText?: string;
    containerClassName?: string;
}

const LLMProviderSelectField: React.FC<LLMProviderSelectFieldProps> = ({
    value,
    onChange,
    options,
    loading,
    disabled,
    error,
    helperText,
    containerClassName,
}) => {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState<string>('');
    const searchRef = useRef<HTMLInputElement | null>(null);
    const popperRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current && containerRef.current.contains(target)) {
                return;
            }
            if (popperRef.current && popperRef.current.contains(target)) {
                return;
            }
            setOpen(false);
            setSearch('');
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    // If the current value doesn't exist in options, keep it unselected (don't fallback to system).
    const selectedOption = options.find((opt) => opt.value === value) || null;
    const displayValue = selectedOption?.label ?? '';

    const filteredOptions = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return options;
        const filtered = options.filter((opt) => opt.label.toLowerCase().includes(keyword));
        const current = options.find((opt) => opt.value === value);
        if (current && !filtered.some((o) => o.value === current.value)) {
            return [current, ...filtered];
        }
        return filtered;
    }, [options, search, value]);

    // Ensure options are sorted by group + label so MUI Autocomplete
    // does not split the same group into multiple sections (same logic as ManageCurrentProvider)
    const groupedOptions = useMemo(
        () =>
            [...filteredOptions].sort((a, b) => {
                if (a.group === b.group) {
                    return a.label.localeCompare(b.label);
                }
                return a.group.localeCompare(b.group);
            }),
        [filteredOptions],
    );

    const handleSelectChange = (_: any, newValue: ProviderOption | null) => {
        const newValueId = newValue?.value ?? '';
        onChange(newValueId);
        setSearch('');
        setOpen(false);
    };

    const handleClose = (_: any, reason: AutocompleteCloseReason) => {
        if (reason === 'blur') {
            setTimeout(() => {
                const active = document.activeElement;
                if (popperRef.current && active && popperRef.current.contains(active)) {
                    return;
                }
                if (searchRef.current && active && searchRef.current.contains(active)) {
                    return;
                }
                setOpen(false);
                setSearch('');
            }, 0);
            return;
        }
        setOpen(false);
        setSearch('');
    };

    const ProviderPopper: React.FC<PopperProps> = (popperProps) => {
        const { children, style, ...rest } = popperProps as any;
        const anchorEl = (popperProps as any).anchorEl as HTMLElement | null;
        const width = anchorEl?.clientWidth;
        return (
            <Popper
                {...rest}
                style={style as React.CSSProperties}
                open={popperProps.open}
                placement={popperProps.placement || 'bottom-start'}
            >
                <Box
                    ref={popperRef}
                    sx={{
                        boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                        borderRadius: '4px',
                        bgcolor: '#fff',
                        width,
                        opacity: popperProps.open ? 1 : 0,
                        transform: popperProps.open ? 'scale(1)' : 'scale(0.98)',
                        transition: 'opacity 120ms ease-out, transform 120ms ease-out',
                        transformOrigin: 'top left',
                    }}
                >
                    <Box
                        sx={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #E0E0E0',
                        }}
                    >
                        <FieldText
                            placeholder="Search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            fullWidth
                            autoFocus
                            inputRef={searchRef}
                        />
                    </Box>
                    {children}
                </Box>
            </Popper>
        );
    };

    return (
        <div className={containerClassName} ref={containerRef}>
            <Autocomplete
                disableClearable
                openOnFocus
                open={open}
                disabled={disabled}
                onOpen={() => !disabled && setOpen(true)}
                onClose={handleClose}
                options={groupedOptions}
                getOptionLabel={(option) => option.label}
                // We handle filtering via the custom search field in the popper,
                // so disable MUI's default input-based filtering.
                filterOptions={(opts) => opts}
                groupBy={(option) => option.group}
                value={selectedOption ?? undefined}
                // Keep the textbox in sync with selected option (prevents stale label when option is removed).
                inputValue={displayValue}
                onInputChange={() => {
                    // no-op (input is readOnly; selection happens via dropdown)
                }}
                loading={loading}
                onChange={handleSelectChange}
                isOptionEqualToValue={(option, v) => option.value === (v as any)?.value}
                sx={{
                    width: '100%',
                    '& .MuiAutocomplete-popupIndicator': {
                        right: '9px',
                        '& :focus, :hover': {
                            background: 'transparent',
                        },
                    },
                }}
                slotProps={{
                    popupIndicator: {
                        disableRipple: true,
                    },
                    paper: {
                        sx: {
                            '.MuiAutocomplete-noOptions': {
                                fontSize: '14px',
                                fontWeight: 400,
                                lineHeight: '20px',
                                color: 'var(--color-light-5)',
                            },
                            // Increase spacing between providers in the dropdown
                            '.MuiAutocomplete-option': {
                                paddingTop: '10px',
                                paddingBottom: '10px',
                                '& + .MuiAutocomplete-option': {
                                    marginTop: '4px',
                                },
                            },
                        },
                    },
                }}
                PopperComponent={ProviderPopper}
                renderGroup={(params) => (
                    <li key={params.key}>
                        <Typography
                            variant="Caption"
                            style={{
                                padding: '4px 12px',
                                color: 'var(--color-light-5)',
                            }}
                            children={String(params.group ?? '') as string}
                        />
                        <ul style={{ padding: 0, margin: 0, fontSize: '14px' }}><Typography variant="Body">{params.children}</Typography></ul>
                    </li>
                )}
                renderInput={(params) => (
                    <FieldText
                        {...params}
                        label={t('ai_agent_connected_provider_type')}
                        placeholder="Search or select provider type"
                        error={!!error}
                        helperText={helperText}
                        fullWidth
                        inputProps={{
                            ...params.inputProps,
                            readOnly: true,
                        }}
                    />
                )}
            />
        </div>
    );
};

export default LLMProviderSelectField;


