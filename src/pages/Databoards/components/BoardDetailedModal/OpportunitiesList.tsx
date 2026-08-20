import type { Option } from '@imbrace/ui';
import { DropdownMenuItem, FieldText, Typography } from '@imbrace/ui';
import { Autocomplete, Box } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';

interface CustomListboxComponentProps {
    children: React.ReactNode;
}

const CustomListboxComponent = React.forwardRef<HTMLUListElement, CustomListboxComponentProps>((props, ref) => {
    const { children, ...other } = props;
    return (
        <ul ref={ref} {...other}>
            <Scrollbars style={{ height: 200 }}>{children}</Scrollbars>
        </ul>
    );
});

export type OpportunityOption =
    | []
    | {
          name: string;
          displayName: string;
          boardId: string;
          boardItemId: string;
      }[];

interface OpportunitiesListProps {
    opportunitiesOptions: Option[];
    selectedRef: React.MutableRefObject<Option | null>;
}

const OpportunitiesList = (props: OpportunitiesListProps) => {
    const { opportunitiesOptions, selectedRef } = props;
    const { t } = useTranslation();
    const autocompleteRef = useRef<HTMLInputElement>(null);

    const [openMenu, setOpenMenu] = useState<boolean>(false);

    useEffect(() => {
        if (autocompleteRef.current) {
            autocompleteRef.current.focus();
        }
    }, []);

    return (
        <Box>
            <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                {t('board_select_opportunity_subheading')}
            </Typography>
            <Autocomplete
                disableClearable
                openOnFocus
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
                            boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                            '.MuiAutocomplete-noOptions': {
                                fontSize: '14px',
                                fontWeight: 400,
                                lineHeight: '20px',
                                color: 'var(--color-light-5)',
                            },
                        },
                    },
                }}
                renderInput={(params) => {
                    return <FieldText ref={autocompleteRef} placeholder={t('board_select_opportunity_placeholder')} {...params} />;
                }}
                options={opportunitiesOptions}
                renderOption={(optionProps, option) => {
                    return (
                        <DropdownMenuItem
                            sx={{
                                padding: '8px 12px',
                                display: 'flex',
                                gap: '12px',
                            }}
                            {...optionProps}
                        >
                            <Box
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                {option.icon}
                            </Box>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ width: '100%', textAlign: 'left' }}>
                                    <Typography>{option.text}</Typography>
                                </div>
                                {option.description && (
                                    <div style={{ width: '100%', textAlign: 'left' }}>
                                        <Typography variant="Caption" style={{ whiteSpace: 'normal', color: 'var(--color-light-5)' }}>
                                            {option.description}
                                        </Typography>
                                    </div>
                                )}
                            </Box>
                        </DropdownMenuItem>
                    );
                }}
                getOptionLabel={(option: Option) => {
                    return option.text as string;
                }}
                open={openMenu}
                onOpen={() => {
                    setOpenMenu(true);
                }}
                onClose={() => {
                    setOpenMenu(false);
                }}
                onChange={(e, selectedOption, reason) => {
                    selectedRef.current = selectedOption;

                    setOpenMenu(false);
                }}
                noOptionsText={t('no_options')}
                ListboxComponent={CustomListboxComponent as React.ComponentType<React.HTMLAttributes<HTMLElement>>}
            />
        </Box>
    );
};

export default OpportunitiesList;
