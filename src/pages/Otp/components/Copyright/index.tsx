import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

interface CopyrightProps {
    className?: string;
    style?: CSSProperties;
}
function Copyright(props: CopyrightProps) {
    const { t } = useTranslation();
    const { style, className } = props;

    return (
        <div className={className} style={style}>
            <Typography
                variant="body2"
                align="center"
                sx={{
                    fontWeight: 400,
                    fontSize: '12px',
                    lineHeight: '16px',
                    color: 'var(--color-light-5)',
                }}
            >
                {t('copyright')}
                <Link
                    href="https://www.imbrace.co/"
                    sx={{ fontWeight: 400, fontSize: '12px', lineHeight: '12px', color: 'var(--color-primary-1)' }}
                >
                    {t('copyright-imbrace-company-name')}
                </Link>
                {` ${new Date().getFullYear()}.`}
            </Typography>
        </div>
    );
}

export default Copyright;
