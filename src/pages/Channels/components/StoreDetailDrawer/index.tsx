import { Button } from '@imbrace/ui';
import { Typography } from '@mui/material';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';

// import StatusTag from '../../../../components/StatusTag';
// import SensitiveTag from '../SensitiveTag';
import styles from './index.module.scss';
import QRCode from './QRCode';

interface StoreDetailDrawerType {
    open: boolean;
    onClose: () => void;
    current?: API.Channel;
    onEdit: (current?: API.Channel) => void;
}

const StoreDetailDrawer: FC<StoreDetailDrawerType> = (props) => {
    const { open, onClose, current, onEdit } = props;

    const { t } = useTranslation();

    const onNext = () => {
        onEdit(current);
    };

    return (
        <Drawer title={t('channel_physical_store_detail')} open={open} onClose={onClose}>
            <div className={styles.storeDetail}>
                <div className={styles.detailContainer}>
                    <div>
                        <Typography sx={{ color: 'var(--color-light-5)' }}>{t('channel_store_name')}</Typography>
                        <div className={styles.nameContainer}>
                            <Typography sx={{ fontWeight: 'bold', color: 'var(--color-light-7)' }}>{current?.name}</Typography>
                            {/* <StatusTag isActive text={t('opening')} /> */}
                        </div>
                    </div>
                    <div>
                        <Typography sx={{ color: 'var(--color-light-5)' }}>{t('channel_devices_list')}</Typography>
                        {current?.floor_plans?.[0]?.scanners && current?.floor_plans?.[0]?.scanners.length > 0 && (
                            <div className={styles.devicesList}>
                                {current.floor_plans[0].scanners.map((scanner, index) => (
                                    <div key={`${scanner.name}${index}`} className={styles.device}>
                                        <div>
                                            <Typography sx={{ fontWeight: 'bold', color: 'var(--color-light-7)' }}>
                                                {scanner.name}
                                            </Typography>
                                        </div>
                                        <div className={styles.extraContainer}>
                                            {/* <SensitiveTag level={scanner.sensitive_level} />
                                        <StatusTag isActive={scanner.status === 'online'} text={t(scanner.status)} /> */}
                                            <QRCode src={scanner.qr_code_url} alt={`${scanner.name} qrcode`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <Button variant="contained" onClick={onNext} text={t('channel_physical_store_edit_store')} />
                </div>
            </div>
        </Drawer>
    );
};

export default StoreDetailDrawer;
