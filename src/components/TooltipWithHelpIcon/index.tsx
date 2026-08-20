import { Icon } from '@imbrace/ui';
import type { TooltipProps } from '@mui/material/Tooltip';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';

const TooltipWithHelpIcon = ({
    title,
    placement = 'right',
    tooltipSx,
}: {
    title: string | ReactNode;
    placement: TooltipProps['placement'];
    tooltipSx?: Record<string, string>;
}) => {
    return (
        <Tooltip
            title={title}
            disableFocusListener
            placement={placement}
            arrow
            componentsProps={{
                arrow: {
                    sx: () => ({
                        color: '#D9D9D9',
                    }),
                },
                tooltip: {
                    sx: () => ({
                        backgroundColor: '#D9D9D9',
                        color: 'var(--color-light-7)',
                        fontSize: '12px',
                        fontWeight: 400,
                        padding: '4px 8px',
                        display: 'flex',
                        lineHeight: '18px',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...tooltipSx,
                        // [theme.breakpoints.down('md')]: {
                        //     padding: '7px 11px',
                        // },
                        // [theme.breakpoints.up('md')]: {
                        //     padding: '10px 18px',
                        // },
                        // [theme.breakpoints.up('lg')]: {
                        //     padding: '14px 18px',
                        // },
                    }),
                },
            }}
        >
            <span style={{ display: 'flex', alignItems: 'center' }}>
                <Icon
                    name="info"
                    style={{
                        fontSize: '16px',
                        color: 'var(--color-light-4)',
                    }}
                />
            </span>
        </Tooltip>
    );
};

export default TooltipWithHelpIcon;
