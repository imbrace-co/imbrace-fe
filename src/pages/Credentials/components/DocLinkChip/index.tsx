import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { StyledChip } from '@/pages/Credentials/components/StyledComponents';

interface Prop {
    url: string;
}

const DocLinkChip = ({ url }: Prop) => {
    const { t } = useTranslation();
    if (!url) return undefined;
    return (
        <StyledChip
            icon={
                <HelpOutlineIcon
                    sx={{
                        fontSize: '17px',
                        fill: 'var(--color-primary-6)',
                    }}
                />
            }
            label={<Trans i18nKey="credentials_step_by_step_guide" t={t} />}
            sx={{
                display: 'flex',
                alignItems: 'center',
            }}
            onClick={() => {
                const params = 'scrollbars=no,resizable=yes,status=no,titlebar=noe,location=no,toolbar=no,menubar=no,width=500,height=700';
                window.open(url, 'Setup Step by Step Guide', params);
            }}
        />
    );
};

export default DocLinkChip;
