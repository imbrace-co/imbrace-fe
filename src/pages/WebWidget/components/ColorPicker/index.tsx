import { FieldText } from '@imbrace/ui';
import { IconButton, InputAdornment, Popover } from '@mui/material';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useCallback, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import type { Control, FieldError, FieldValues, Path } from 'react-hook-form';
import { Controller } from 'react-hook-form';

import styles from './index.module.scss';

interface ColorPickerProps<T extends FieldValues = never> {
    name: Path<T>;
    control: Control<T, object>;
    rules?: Record<string, unknown>;
    error?: FieldError;
    placeholder?: string;
    label?: string;
}

const ColorPicker = <T extends FieldValues = never>(props: ColorPickerProps<T>) => {
    const { label, name, control, rules, error, placeholder } = props;
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;

    const handleOpenColorPicker = useCallback((event: ReactMouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    }, []);

    return (
        <Controller
            name={name}
            control={control}
            rules={rules}
            render={({ field, fieldState: { error: fieldError } }) => {
                return (
                    <FieldText
                        fullWidth
                        label={label}
                        error={!!error || !!fieldError}
                        helperText={error?.message || fieldError?.message}
                        {...field}
                        placeholder={placeholder}
                        sx={{
                            maxWidth: 250,
                            '& .MuiOutlinedInput-root': {
                                pr: '14px',
                                '.MuiOutlinedInput-input': {
                                    padding: '8.5px 14px 8.5px 0px',
                                },
                            },
                            gridTemplateColumns: 'min-content 1fr min-content',
                        }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment sx={{ mr: '0px', pl: '14px' }} position="start">
                                    #
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={handleOpenColorPicker}
                                        edge="end"
                                        sx={{ width: 20, height: 20, padding: 0, mr: '14px' }}
                                    >
                                        <div className={styles.colorDot} style={{ background: `#${field.value}` }} />
                                    </IconButton>
                                    <Popover
                                        id={id}
                                        open={open}
                                        anchorEl={anchorEl}
                                        onClose={() => setAnchorEl(null)}
                                        anchorOrigin={{
                                            vertical: -10,
                                            horizontal: 40,
                                        }}
                                        slotProps={{
                                            paper: {
                                                sx: {
                                                    overflow: 'visible',
                                                    borderRadius: '8px',
                                                },
                                            },
                                        }}
                                    >
                                        <HexColorPicker
                                            color={`#${field.value}`}
                                            onChange={(color) => {
                                                field.onChange(color.replace('#', ''));
                                            }}
                                        />
                                    </Popover>
                                </InputAdornment>
                            ),
                        }}
                    />
                );
            }}
        />
    );
};

export default ColorPicker;
