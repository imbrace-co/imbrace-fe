import { Dropdown } from '@imbrace/ui';
import LanguageIcon from '@mui/icons-material/Language';
import { Box } from '@mui/material';
import type { MouseEvent as ReactMouseEvent } from 'react';
import React from 'react';

import i18next, { supportedLangs } from '@/i18n';

const languageOptions = () => {
    return Object.keys(supportedLangs).map((key) => ({
        index: key,
        text: supportedLangs[key],
    }));
};

const LanguageSelector = () => {
    const onSelect = async (event: ReactMouseEvent<HTMLLIElement, MouseEvent>, selectedIndex: string) => {
        await i18next.changeLanguage(selectedIndex);
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', '& .MuiSvgIcon-root': { color: 'var(--color-secondary-3)' } }}>
            <Dropdown
                variant="text"
                icon={<LanguageIcon />}
                buttonSx={{ color: 'var(--color-light-5)' }}
                options={languageOptions()}
                selectedIndex={i18next.language}
                hideOnSelect
                onSelect={onSelect}
            />
        </Box>
    );
};

export default LanguageSelector;
