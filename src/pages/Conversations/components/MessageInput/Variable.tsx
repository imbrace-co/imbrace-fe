import { FieldText, Icon, IconButton, Typography } from '@imbrace/ui';
import type { SelectChangeEvent } from '@mui/material';
import { FormControl, MenuItem, Select } from '@mui/material';
import type { ChangeEvent, FC } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TemplateVariableType } from '.';
import styles from './index.module.scss';
interface VariableProps {
    contact: API.Contact;
    variableNum: number;
    templateVariable: TemplateVariableType;
    onChange: (value: TemplateVariableType) => void;
    fromWeb?: boolean;
    setUseManualKeyArray: (value: number[]) => void;
    useManualKeyArray: number[];
}

const Variable: FC<VariableProps> = ({
    contact,
    variableNum,
    templateVariable,
    fromWeb,
    onChange,
    useManualKeyArray,
    setUseManualKeyArray,
}) => {
    const { t } = useTranslation();
    const [editable, setEditable] = useState(true);
    const [inputMode, setInputMode] = useState(false);
    const [text, setText] = useState<string>();
    const [open, setOpen] = useState(false);
    const [selectedOption, setSelectedOption] = useState<string>();

    const onVariableChange = (value?: string) => {
        const tmpVariable = { ...templateVariable };
        tmpVariable[variableNum] = value;
        onChange(tmpVariable);
    };

    const onSelectChange = (event: SelectChangeEvent<string>) => {
        setText(undefined);
        setSelectedOption(undefined);
        switch (event.target.value) {
            case 'name':
                setSelectedOption('name');
                setText(contact.display_name);
                setEditable(false);
                onVariableChange(contact.display_name);
                break;
            case 'email':
                setSelectedOption('email');
                setText(contact.email || '');
                setEditable(false);
                onVariableChange(contact.email || '');
                break;
            case 'phonenumber':
                setSelectedOption('phonenumber');
                setText(contact.phone_number);
                setEditable(false);
                onVariableChange(contact.phone_number);
                break;
            case 'manual':
                setSelectedOption('manual');
                setEditable(false);
                setInputMode(true);
                selectManualChange();
                break;
            default:
                break;
        }
    };

    const selectManualChange = () => {
        const tempUseManualKeyArray = [...useManualKeyArray];
        tempUseManualKeyArray.push(variableNum);
        setUseManualKeyArray([...Array.from(new Set(tempUseManualKeyArray))]);
    };

    const onManualChange = (event: ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
        onVariableChange(event.target.value);
    };

    const onManualClose = () => {
        onEdit();
        setInputMode(false);
        setSelectedOption(undefined);
        const filteredManualKey = useManualKeyArray.filter((value, index, arr) => {
            return value !== variableNum;
        });
        setUseManualKeyArray(filteredManualKey);
    };
    const onEdit = () => {
        setText(undefined);
        setEditable(true);
        onVariableChange();
    };

    useEffect(() => {
        if (templateVariable && Object.keys(templateVariable).length === 0) {
            setEditable(true);
            setText('');
            setInputMode(false);
        }
    }, [templateVariable]);

    const webStyle = fromWeb ? { mt: 2 } : {};

    if (editable) {
        return (
            <>
                <FormControl
                    sx={{
                        ...webStyle,
                    }}
                    size="small"
                >
                    <Select
                        value={selectedOption}
                        displayEmpty
                        placeholder={`{{${(variableNum + 1).toString()}}}`}
                        onChange={onSelectChange}
                        open={open}
                        onClick={() => {
                            setOpen((prev) => !prev);
                        }}
                        renderValue={(selected) => {
                            if (selected?.length === 0 || (!selected && !text)) {
                                return `{{${(variableNum + 1).toString()}}}`;
                            }

                            return selected ?? text;
                        }}
                        onClose={(e) => {
                            if (!text) return;
                            setEditable(false);
                        }}
                        sx={{
                            height: '24px',
                            '.MuiOutlinedInput-notchedOutline': {
                                border: 0,
                            },
                            '.MuiSelect-select': {
                                padding: '2px 0 2px 8px',
                                color: 'var(--color-light-4)',
                                borderRadius: '4px',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                            },
                            '.MuiSelect-select:hover, .MuiSelect-select:active': {
                                backgroundColor: 'var(--color-light-2)',
                            },
                            '.MuiSvgIcon-root': {
                                fill: 'var(--color-light-4)',
                                margin: 0,
                                padding: 0,
                                transition: 'fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
                                fontSize: '1.5rem',
                                position: 'absolute',
                                right: '0px',
                                top: 'calc(50% - .5em)',
                            },
                        }}
                    >
                        <MenuItem value={'name'} disabled={contact.display_name === '' || contact.display_name?.trim().length === 0}>
                            {t('name')}
                        </MenuItem>
                        <MenuItem value={'phonenumber'} disabled={contact.phone_number === '' || contact.phone_number?.trim().length === 0}>
                            {t('phone')}
                        </MenuItem>
                        <MenuItem value={'email'} disabled={contact.email === '' || contact.email?.trim().length === 0}>
                            Email
                        </MenuItem>
                        <MenuItem key={'manual'} value={'manual'}>
                            {t('manual')}
                        </MenuItem>
                    </Select>
                </FormControl>
            </>
        );
    }
    if (inputMode) {
        return (
            <div className={styles.variableManualText}>
                <FieldText
                    fullWidth
                    multiline
                    bordered={false}
                    formControlSx={{
                        width: '100%',
                        '& .MuiInputBase-root': {
                            minHeight: '23px',
                        },
                        '& .MuiInputBase-root > .MuiInputBase-input': {
                            padding: 0,
                            color: 'var(--color-light-5)',
                        },
                        '&:hover': {
                            backgroundColor: 'var(--color-light-2)',
                        },
                    }}
                    value={text}
                    onChange={onManualChange}
                    placeholder="enter the variable content here..."
                />
                <IconButton
                    aria-label="close"
                    size="xs"
                    variant="text"
                    onClick={onManualClose}
                    sx={{
                        alignSelf: 'flex-start',
                        '&:hover': {
                            backgroundColor: 'var(--color-light-2)',
                        },
                    }}
                >
                    <Icon name="close" fontSize={20} color="var(--color-light-4)" />
                </IconButton>
            </div>
        );
    }
    return (
        <div className={`${styles.variableText} ${styles.clickable} ${fromWeb ? styles.webStyle : ''}`}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Typography
                    onClick={() => {
                        setOpen(true);
                        setEditable(true);
                    }}
                    style={{ display: 'inline-block', whiteSpace: 'pre-wrap', color: 'var(--color-secondary-3)', cursor: 'pointer' }}
                >
                    {text}
                </Typography>
                <IconButton
                    aria-label="close"
                    size="xs"
                    variant="text"
                    onClick={() => {
                        setSelectedOption(undefined);
                        setText(undefined);
                        setOpen(false);
                        setEditable(true);
                    }}
                    sx={{
                        '&:hover': {
                            backgroundColor: 'var(--color-light-2)',
                        },
                    }}
                >
                    <Icon name="close" fontSize={20} color="var(--color-light-4)" />
                </IconButton>
            </div>
        </div>
    );
};

export default Variable;
