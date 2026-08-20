import { Typography } from '@mui/material';
import SimpleBar from 'simplebar-react';

import styles from './index.module.scss';
interface SideBarProps {
    title?: string;
    children?: React.ReactNode;
    withBorder?: boolean;
}
const SideBar = (props: SideBarProps) => {
    const { title, children, withBorder } = props;
    return (
        <SimpleBar className={`${styles.sideBarContainer} ${withBorder ?? styles.sideBarContainerBorder}`} autoHide>
            <div>
                {title && (
                    <Typography
                        variant="h6"
                        sx={{ color: 'var(--color-light-7)', fontSize: '1.125rem', fontWeight: 'bold', ml: '22px', mt: '56px', mb: '27px' }}
                    >
                        {title}
                    </Typography>
                )}

                {children}
            </div>
        </SimpleBar>
    );
};

export default SideBar;
