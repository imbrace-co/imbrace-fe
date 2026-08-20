import { Dropdown, Icon, Space } from '@imbrace/ui';
import { usePagination } from '@mui/lab';
import { Box, Button, styled } from '@mui/material';
import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_OPTIONS = [
    { index: 100, text: '100' },
    { index: 50, text: '50' },
    { index: 30, text: '30' },
    { index: 20, text: '20' },
    { index: 10, text: '10' },
];

const List = styled('ul')({
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    gap: '5px',
    justifyContent: 'center',
});

const PageItem = styled(Button, { shouldForwardProp: (prop) => prop !== 'selected' })(
    ({ selected }: { selected?: boolean }) => ({
        gap: '8px',
        width: 32,
        height: 32,
        padding: 0,
        minWidth: 'auto',
        fontSize: 12,
        color: !selected ? 'var(--color-secondary-3)' : 'var(--color-primary-1)',
        '&:hover, &:focus, &:active': {
            boxShadow: 'none',
            background: 'var(--color-secondary-2)',
        },
        '&.Mui-disabled': {
            color: 'var(--color-light-4)',
        },
        '& svg': {
            fontSize: 24,
        },
    }),
);

interface GridPaginationProps {
    /** 1-based current page. */
    page: number;
    /** Total number of pages. */
    pageCount: number;
    onChange: (page: number) => void;
    /** Number of records per page (slice size). */
    pageSize: number;
    onPageSizeChange: (size: number) => void;
}

const GridPagination = ({ page, pageCount, onChange, pageSize, onPageSizeChange }: GridPaginationProps) => {
    const { t } = useTranslation();
    const { items } = usePagination({
        count: pageCount,
        page,
        onChange: (_event: ChangeEvent<unknown>, value: number) => onChange(value),
    });

    const renderIcon = (type: string) => {
        switch (type) {
            case 'next':
                return <Icon name="chevronRight" />;
            case 'previous':
                return <Icon name="chevronLeft" />;
            default:
                return type;
        }
    };

    return (
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
            <Space size={4}>
                <span style={{ color: 'var(--color-light-5)', fontSize: 12 }}>{t('display_per_page')}</span>
                <Dropdown
                    selectedIndex={pageSize}
                    text={`${pageSize}`}
                    options={PAGE_SIZE_OPTIONS}
                    variant="text"
                    hideOnSelect
                    onSelect={(_e, selected) => onPageSizeChange(selected)}
                    buttonSx={{
                        color: 'var(--color-light-5)',
                        '& svg': {
                            fontSize: 12,
                        },
                    }}
                    typographyProps={{
                        variant: 'Caption',
                        style: {
                            lineHeight: '100%',
                        },
                    }}
                    anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                />
            </Space>

            {pageCount > 1 ? (
                <nav>
                    <List>
                        {items.map(({ page: pageNum, type, selected, ...item }, index) => {
                            let children = null;

                            if (type === 'start-ellipsis' || type === 'end-ellipsis') {
                                children = <span style={{ lineHeight: '32px' }}>…</span>;
                            } else if (type === 'page') {
                                children = (
                                    <PageItem selected={selected} {...item}>
                                        {pageNum}
                                    </PageItem>
                                );
                            } else {
                                children = <PageItem {...item}>{renderIcon(type)}</PageItem>;
                            }

                            return <li key={index}>{children}</li>;
                        })}
                    </List>
                </nav>
            ) : (
                <span />
            )}

            <span />
        </Box>
    );
};

export default GridPagination;
