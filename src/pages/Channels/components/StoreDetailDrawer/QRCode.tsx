import { Box, Popover } from '@mui/material';
import type { FC, MouseEvent } from 'react';
import { useState } from 'react';

import styles from './index.module.scss';
interface QRCodeType {
    src: string;
    alt: string;
}
const QRCode: FC<QRCodeType> = (props) => {
    const { src, alt } = props;
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);
    const id = open ? 'simple-popover' : undefined;
    return (
        <>
            <div onClick={handleClick} className={styles.qrCode}>
                <img src={src} alt={alt} />
            </div>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <Box sx={{ p: 1, borderRadius: 5 }}>
                    <img src={src} alt={alt} />
                </Box>
            </Popover>
        </>
    );
};

export default QRCode;
