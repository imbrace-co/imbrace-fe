import { DropdownMenu, DropdownMenuItem, EllipsisText } from '@imbrace/ui';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import i18next, { supportedLangs } from '@/i18n/index';

interface SelectLanguageProps {
    anchorEl?: HTMLElement;
    onClose: () => void;
}
const SelectLanguage: FC<SelectLanguageProps> = (props) => {
    const { i18n } = useTranslation();
    const { anchorEl, onClose } = props;
    const open = Boolean(anchorEl);
    const handleChangeLang = async (lang: string) => {
        await i18next.changeLanguage(lang);
    };

    return (
        <DropdownMenu
            anchorEl={anchorEl}
            transformOrigin={{
                horizontal: 'left',
                vertical: 'top',
            }}
            anchorOrigin={{
                horizontal: 'right',
                vertical: 'top',
            }}
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: '156px',
                },
            }}
        >
            {Object.entries(supportedLangs).map(([key, lang]) => (
                <DropdownMenuItem
                    key={key}
                    selected={key === i18n.language}
                    onClick={() => {
                        handleChangeLang(key);
                    }}
                >
                    <EllipsisText text={lang} />
                </DropdownMenuItem>
            ))}
        </DropdownMenu>
    );
};

export default SelectLanguage;
