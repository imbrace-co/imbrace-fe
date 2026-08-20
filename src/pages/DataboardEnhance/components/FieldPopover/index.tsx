import { Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { Popover } from '@mui/material';
import { uniqueId } from 'lodash';
import type { ReactElement } from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Fields from '@/components/FlexibleTable/fields';
import type { ColumnValue, FieldType } from '@/components/FlexibleTable/types';

import { FieldTypeIcon } from '../../utils';
import styles from './index.module.scss';

const FieldPopover = ({
    anchorEl,
    handleClose,
    title,
    type = 'ShortText',
    initialValue,
    valueEnum,
    updateData,
    boardType,
    extraProps,
}: {
    anchorEl?: HTMLElement;
    handleClose: () => void;
    title: string;
    type: FieldType;
    initialValue?: ColumnValue;
    valueEnum?: Record<string | number, string>;
    updateData: (value: ColumnValue) => Promise<void>;
    boardType: API.BoardType,
    extraProps?: Record<string, unknown>;
}) => {
    const [value, setValue] = useState<ColumnValue>(initialValue ?? '');
    const [loading, setLoading] = useState(false);
    const open = Boolean(anchorEl);

    const onClose = async () => {
        try {
            if (!loading) {
                if (typeof value === 'string' || (typeof value === 'object' && value)) {
                    if (value !== initialValue) {
                        setLoading(true);
                        await updateData(value);
                        setLoading(false);
                    }
                }
            }
            handleClose();
        } catch (error) {
            setLoading(false);
        }
    };

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            slotProps={{
                paper: {
                    sx: {
                        paddingRight: '23px',
                        boxShadow: 'none',
                        overflow: 'visible',
                        background: 'transparent',
                        maxHeight: '600px',
                    },
                },
            }}
        >
            <div className={styles.container}>
                <Space size={24} direction="vertical">
                    <div className={styles.header}>
                        <Space size={12} style={{ flex: 1 }}>
                            {FieldTypeIcon(type)}
                            <Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }}>
                                {title}
                            </Typography>
                        </Space>

                        <IconButton onClick={onClose} variant="text" type="secondary" size="xs">
                            <Icon name="close" />
                        </IconButton>
                    </div>
                    <Fields
                        type={type}
                        value={(type === 'MultipleSelection' || type === 'Attachment') && !Array.isArray(value) ? [] : value}
                        enum={valueEnum}
                        onChange={(v) => {
                            setValue(v);
                        }}
                        fieldProps={{
                            inputProps: {
                                autoFocus: true,
                            },
                            ...(type === 'Attachment' && {
                                rows: 2,
                            }),
                            ...(type === 'Notes' && {
                                type: 'list',
                                innerStyle: {
                                    margin: '0 -32px',
                                    padding: '0 32px',
                                },
                                editing: false,
                            }),
                            ...(extraProps as Record<string, unknown>),
                        }}
                        boardType={boardType}
                    />
                </Space>
            </div>
        </Popover>
    );
};

interface FieldPopoverHOCProps {
    anchorEl: HTMLElement;
    title: string;
    type: FieldType;
    initialValue?: ColumnValue;
    valueEnum?: Record<string | number, string>;
    updateData: (value: ColumnValue) => Promise<void>;
    onClose?: () => void;
    extraProps?: Record<string, unknown>;
    boardType?: API.BoardType
}
const FieldPopoverHOC = ({ onClose, anchorEl, ...restProps }: FieldPopoverHOCProps) => {
    const [open, setOpen] = useState<HTMLElement | undefined>(anchorEl);
    return (
        <FieldPopover
            {...restProps}
            anchorEl={open}
            handleClose={() => {
                setOpen(undefined);
                onClose?.();
            }}
        />
    );
};

interface FieldPopoversProps {
    container?: HTMLElement;
}
interface FieldPopoversRef {
    openFieldPopover: (props: FieldPopoverHOCProps) => void;
}
type FieldPopoversItems = FieldPopoverHOCProps & {
    key: string;
};

type FieldPopoverAPI = {
    openFieldPopover: (props: FieldPopoverHOCProps) => void;
};

type UseFieldPopoverType = (props?: FieldPopoversProps) => [FieldPopoverAPI, ReactElement];

export const FieldPopovers = forwardRef<FieldPopoversRef, FieldPopoversProps>((props, ref) => {
    const [items, setItems] = useState<FieldPopoversItems[]>([]);

    const onClose = (key: string) => {
        setItems((prev) => prev.filter((item) => item.key !== key));
    };

    useImperativeHandle(ref, () => ({
        openFieldPopover: (popoverProps: FieldPopoverHOCProps) => {
            const key = uniqueId('databoard-fieldPopover');
            setItems((prev) => {
                const clone = [...prev];
                clone.push({
                    key,
                    ...popoverProps,
                });
                return clone;
            });
        },
    }));

    return createPortal(
        <>
            {items.map((item) => {
                const { key, ...restProps } = item;
                return (
                    <FieldPopoverHOC
                        key={`databoard-fieldPopover-${key}`}
                        {...restProps}
                        onClose={() => {
                            restProps.onClose?.();
                            onClose(key);
                        }}
                    />
                );
            })}
        </>,
        props.container || document.body,
    );
});

export const useFieldPopover: UseFieldPopoverType = (props) => {
    const fieldPopoversRef = useRef<FieldPopoversRef>(null);

    const contextHolder = useMemo(() => <FieldPopovers ref={fieldPopoversRef} {...props} />, [props]);

    const api = useMemo<FieldPopoverAPI>(
        () => ({
            openFieldPopover: (fieldPopoverProps: FieldPopoverHOCProps) => {
                fieldPopoversRef.current?.openFieldPopover(fieldPopoverProps);
            },
        }),
        [],
    );

    return [api, contextHolder];
};
