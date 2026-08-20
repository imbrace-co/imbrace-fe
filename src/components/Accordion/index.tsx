import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import type { SyntheticEvent } from 'react';

const MuiAccordion = (props: {
    expanded: boolean;
    onChange: ((event: SyntheticEvent<Element, Event>, expanded: boolean) => void) | undefined;
    title: string;
    children: React.ReactNode;
}) => {
    const { expanded, onChange, title, children } = props;

    return (
        <Accordion
            disableGutters
            square
            expanded={expanded}
            onChange={onChange}
            sx={{
                boxShadow: 0,
                borderBottom: '1px solid var(--color-light-3)',
                overflowX: 'hidden',
                '&:before': { display: 'none' },
            }}
        >
            <AccordionSummary
                expandIcon={<ArrowDropDownIcon />}
                sx={{
                    minHeight: '70px',
                    p: 0,
                    color: expanded ? 'var(--color-primary-1)' : 'var(--color-light-7)',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                }}
            >
                {title}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>{children}</AccordionDetails>
        </Accordion>
    );
};

export default MuiAccordion;
