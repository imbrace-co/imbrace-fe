import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';
import type { AddMemberDrawerProp } from '@/pages/Members/IMember.types';

import styles from './index.module.scss';
import InviteTabs from './tabs';

const AddMemberDrawer: FC<AddMemberDrawerProp> = (props) => {
    const { open, onClose, onFinish } = props;
    const [step, setStep] = useState<number>(0);
    const { t } = useTranslation();

    useEffect(() => {
        if (!open) {
            setStep(0);
        }
    }, [open]);

    return (
        <Drawer
            title={t('member_add_member_heading')}
            open={open}
            className={styles.addMemberDrawer}
            showBackButton={step !== 0}
            onBackBtnClick={() => {
                setStep(0);
            }}
            onClose={onClose}
        >
            <InviteTabs step={step} setStep={setStep} onFinish={onFinish} />
        </Drawer>
    );
};

export default AddMemberDrawer;
