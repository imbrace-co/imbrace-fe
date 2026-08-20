import { Copy } from '@imbrace/ui';
import { Box, FormControl, FormLabel, InputLabel, MenuItem, Switch } from '@mui/material';
import React from 'react';
import type { FieldError } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { StyledDescription, StyledInput, StyledSelect } from '../StyledComponents';
import styles from './index.module.scss';

interface Props extends API.PropertyType {
    defaultValue?: string | number | boolean;
    displayName?: string;
    value?: string | number | boolean;
    required?: boolean;
    onChange: (value?: unknown) => void;
    style?: Record<string, Record<string, string | number | boolean>>;
    error?: FieldError | undefined;
    watchShowParams?: Record<string, string | boolean>;
    displayOptions?: Record<string, Record<string, string[]>>;
    credentialType: string;
}

const FieldItem: React.FC<Props> = React.forwardRef((props, ref) => {
    const {
        name: nameProp,
        displayName,
        type,
        value: valueProp,
        style,
        description,
        watchShowParams,
        displayOptions,
        credentialType,
        placeholder,
        required,
    } = props;
    const { t } = useTranslation();
    const displayOptKey = displayOptions && Object.entries(displayOptions.show)[0][0];
    const displayOptValue = displayOptions && Object.entries(displayOptions.show)[0][1][0];
    const isShown = !!watchShowParams && displayOptKey && watchShowParams[displayOptKey] === displayOptValue;
    const credentialPrefix = `imbrace_credentials.${credentialType}`;

    const requiredSymbol = () => {
        if (required) {
            return '*';
        }
        return '';
    };

    const namePropMapping = () => {
        switch (nameProp) {
            case 'oAuthRedirectUrl':
                return t('oAuthRedirectUrl');
            case 'credentialName':
                return t('credentialName') + requiredSymbol();
            default:
                return displayName && t(`${credentialPrefix}.${nameProp}.displayName`) + requiredSymbol();
        }
    };

    if (displayOptions && !isShown) return null;

    switch (type) {
        case 'string': {
            if (nameProp === 'oAuthRedirectUrl' || nameProp === 'webhookUrl' || nameProp === 'verificationToken') {
                return (
                    <>
                        <FormLabel
                            component="legend"
                            sx={
                                style
                                    ? style.label
                                    : {
                                          fontSize: 14,
                                          lineHeight: '24px',
                                          fontWeight: 600,
                                          color: 'var(--color-light-7)',
                                          paddingBottom: description ? 0 : 1,
                                      }
                            }
                        >
                            {namePropMapping()}
                        </FormLabel>
                        <StyledDescription variant="caption">
                            {description && t(`${credentialPrefix}.${nameProp}.description`)}
                        </StyledDescription>
                        <Box
                            sx={{
                                marginBottom: '24px',
                            }}
                        >
                            <Copy
                                containerClassName={styles.copyField}
                                copyText={nameProp === 'verificationToken' ? t('credential_copy_token') : t('credential_copy_url')}
                                displayText={(valueProp || props.default) as string}
                                copyValue={(valueProp || props.default) as string}
                                typographyProps={{
                                    style: {
                                        color: 'var(--color-light-4)',
                                        fontSize: '16px',
                                        fontWeight: '400',
                                        lineHeight: '16px',
                                    },
                                }}
                                spaceProps={{ justify: 'between' }}
                            />
                        </Box>
                    </>
                );
            }
            const inputType = nameProp === 'password' ? 'password' : 'text';

            return (
                <>
                    <FormLabel
                        component="legend"
                        sx={
                            style
                                ? style.label
                                : {
                                      fontSize: 14,
                                      lineHeight: '24px',
                                      fontWeight: 600,
                                      color: 'var(--color-light-7)',
                                      paddingBottom: 1,
                                  }
                        }
                    >
                        {namePropMapping()}
                    </FormLabel>
                    <StyledDescription variant="caption">
                        {description && <span dangerouslySetInnerHTML={{ __html: t(`${credentialPrefix}.${nameProp}.description`) }} />}
                    </StyledDescription>
                    <StyledInput
                        variant="outlined"
                        name={nameProp}
                        value={valueProp}
                        onChange={props.onChange}
                        error={!!props.error}
                        helperText={props.error?.message}
                        placeholder={placeholder && t(`${credentialPrefix}.${nameProp}.placeholder`)}
                        {...{ type: inputType }}
                    />
                </>
            );
        }
        case 'number': {
            return (
                <>
                    <FormLabel
                        component="legend"
                        sx={
                            style
                                ? style.label
                                : {
                                      fontSize: 14,
                                      lineHeight: '24px',
                                      fontWeight: 600,
                                      color: 'var(--color-light-7)',
                                      paddingBottom: 1,
                                      paddingTop: 1,
                                  }
                        }
                    >
                        {displayName && t(`${credentialPrefix}.${nameProp}.displayName`) + requiredSymbol()}
                    </FormLabel>
                    <StyledDescription variant="caption">
                        {description && <span dangerouslySetInnerHTML={{ __html: t(`${credentialPrefix}.${nameProp}.description`) }} />}
                    </StyledDescription>
                    <StyledInput
                        value={valueProp}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                        placeholder={placeholder && t(`${credentialPrefix}.${nameProp}.placeholder`)}
                        // type="number"
                        variant="outlined"
                        name={nameProp}
                        onChange={props.onChange}
                        error={!!props.error}
                        helperText={props.error?.message}
                    />
                </>
            );
        }
        case 'hidden': {
            return (
                <StyledInput
                    inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                    variant="outlined"
                    // {...props}
                    sx={{ display: 'none' }}
                />
            );
        }
        case 'boolean': {
            return (
                <>
                    <FormLabel
                        component="legend"
                        sx={
                            style
                                ? style.label
                                : {
                                      fontSize: 14,
                                      lineHeight: '24px',
                                      fontWeight: 600,
                                      color: 'var(--color-light-7)',
                                  }
                        }
                    >
                        {displayName && t(`${credentialPrefix}.${nameProp}.displayName`) + requiredSymbol()}
                    </FormLabel>
                    <StyledDescription variant="caption">
                        {description && <span dangerouslySetInnerHTML={{ __html: t(`${credentialPrefix}.${nameProp}.description`) }} />}
                    </StyledDescription>
                    <Switch
                        checked={!!valueProp}
                        value={valueProp}
                        onChange={(event, value) => {
                            return props.onChange(value);
                        }}
                    />
                </>
            );
        }
        case 'options': {
            return (
                <>
                    <FormControl
                        variant="outlined"
                        fullWidth
                        margin="dense"
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            '& .MuiFormLabel-root': { left: '-13px', top: '8px', marginBottom: '20px' },
                        }}
                    >
                        <InputLabel
                            shrink
                            id={`${displayName?.trim()}`}
                            sx={
                                style
                                    ? style.label
                                    : {
                                          lineHeight: '24px',
                                          color: 'var(--color-light-7)',
                                          fontWeight: 600,
                                          fontSize: 18,
                                      }
                            }
                        >
                            {displayName && t(`${credentialPrefix}.${nameProp}.displayName`) + requiredSymbol()}
                        </InputLabel>
                        <StyledDescription variant="caption" sx={{ paddingTop: '25px' }}>
                            {description && <span dangerouslySetInnerHTML={{ __html: t(`${credentialPrefix}.${nameProp}.description`) }} />}
                        </StyledDescription>

                        <StyledSelect
                            inputProps={{
                                name: `${displayName?.trim()}`,
                                id: `${displayName?.trim()}`,
                            }}
                            value={valueProp}
                            onChange={(event) => props.onChange(event.target.value)}
                        >
                            {props.options &&
                                props.options.map((option: Record<string, string>) => (
                                    <MenuItem key={option.name} value={option.value}>
                                        {option.name}
                                    </MenuItem>
                                ))}
                        </StyledSelect>
                    </FormControl>
                </>
            );
        }
        default: {
            return <StyledInput type="text" />;
        }
    }
});

export default FieldItem;
