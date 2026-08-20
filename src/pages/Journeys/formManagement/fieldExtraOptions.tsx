import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { getReorderDestinationIndex } from '@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { Button, FieldSelect, FieldSwitch, FieldText, Icon, IconButton, Space, Tooltip } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getCountry } from 'countries-and-timezones';
import type { CountryCode } from 'libphonenumber-js';
import { getCountryCallingCode } from 'libphonenumber-js';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Control, UseFieldArrayRemove, UseFormReturn } from 'react-hook-form';
import { Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import invariant from 'tiny-invariant';

import { FieldExtraSetting } from '@/pages/Databoards/utils';

import styles from './index.module.scss';
import type { FieldType } from './operationFieldForm';

const defaultFieldOptions: Record<string, Record<string, string[]>> = {
    'Email Outbound Records': {
        'Outbound Status': ['Success', 'Fail', 'Pending', 'Sent'],
        'Outbound Type': ['Single Outbound', 'Group Outbound', 'Newsletter'],
        'Campaign Tags': ['Sales', 'Marketing'],
        'Read Status': ['Opened'],
    },
    'Email Campaign': {
        Subscription: ['Subscribed', 'Unsubscribed'],
    },
};

interface Props {
    boardType?: API.BoardType;
    boardName?: string;
    containerRef: RefObject<HTMLDivElement>;
    methods: UseFormReturn<FieldType, any>;
    formField?: FormManagement.FormField;
    disabled?: boolean;
}
type State = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect?: DOMRect } | { type: 'dragging' };

const idleState: State = { type: 'idle' };
const draggingState: State = { type: 'dragging' };

interface DraggableOptionProps {
    index: number;
    control: Control<FieldType, any>;
    shouldDisabled?: boolean;
    closestEdge?: Edge | null;
    remove: (index: number) => void;
    formField?: FormManagement.FormField;
    state: State;
    label?: string;
}

const DraggableOption = ({ index, remove, shouldDisabled = false, control, closestEdge, state, label }: DraggableOptionProps) => {
    const { t } = useTranslation();

    return (
        <>
            <Controller
                name={`data.${index}.value`}
                control={control}
                render={({ field: fieldItem, fieldState: { error: fieldError } }) => {
                    const tooltipText =
                        fieldItem.value === 'Unidentified Lead'
                            ? t('fields_management_unidentified_lead_tooltip')
                            : fieldItem.value === 'Identified Lead'
                            ? t('fields_management_identified_lead_tooltip')
                            : null;
                    return (
                        <Box sx={{ width: '100%', display: 'flex' }}>
                            <Box sx={{ width: '100%' }} style={{ opacity: state.type === 'dragging' ? 0.3 : 1 }}>
                                <Tooltip
                                    disableHoverListener={!shouldDisabled}
                                    disableFocusListener
                                    disableTouchListener
                                    arrow
                                    title={tooltipText}
                                    placement="top"
                                >
                                    <div>
                                        <FieldText
                                            {...fieldItem}
                                            fullWidth
                                            {...(!shouldDisabled &&
                                                index > 0 && {
                                                    onReset: () => {
                                                        remove(index);
                                                    },
                                                })}
                                            error={!!fieldError}
                                            helperText={fieldError?.message}
                                            formControlSx={{
                                                width: '100%',
                                                '& .MuiFormControl-root': {
                                                    width: '100%',
                                                },
                                                backgroundColor: 'var(--color-light-1)',
                                            }}
                                            labelProps={{
                                                sx: {
                                                    color: 'var(--color-light-5)',
                                                    fontWeight: 400,
                                                    fontSize: '14px',
                                                    '&.Mui-focused': {
                                                        color: 'var(--color-light-5)',
                                                    },
                                                },
                                            }}
                                            label={label}
                                            disabled={shouldDisabled}
                                        />
                                    </div>
                                </Tooltip>
                            </Box>
                        </Box>
                    );
                }}
            />
            {closestEdge && <DropIndicator edge={closestEdge} gap="8px" />}
        </>
    );
};

const OptionContainer = ({
    instanceId,
    formField,
    control,
    shouldDisabled,
    remove,
    index,
    label,
}: {
    instanceId: symbol;
    formField?: FormManagement.FormField;
    control: Control<FieldType, any>;
    shouldDisabled?: boolean;
    remove: UseFieldArrayRemove;
    index: number;
    label: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const [state, setState] = useState<State>(idleState);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

    useEffect(() => {
        const dragElement = dragHandleRef.current;
        const dropTargetElement = containerRef.current;
        invariant(dragElement);
        invariant(dropTargetElement);
        return combine(
            draggable({
                element: dragElement,
                getInitialData: () => ({ itemId: index, instanceId }),
                onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
                    const rect = containerRef.current?.getBoundingClientRect();

                    setCustomNativeDragPreview({
                        nativeSetDragImage,
                        getOffset: preserveOffsetOnSource({
                            element: dragElement,
                            input: location.current.input,
                        }),
                        render({ container }) {
                            setState({ type: 'preview', container, rect });
                            return () => setState(draggingState);
                        },
                    });
                },

                onDragStart: () => setState(draggingState),
                onDrop: () => setState(idleState),
            }),
            dropTargetForElements({
                element: dropTargetElement,
                canDrop: ({ source }) => {
                    return source.data.instanceId === instanceId;
                },
                getIsSticky: () => true,
                getData: ({ input, element }) => {
                    const data = { itemId: index };

                    return attachClosestEdge(data, {
                        input,
                        element,
                        allowedEdges: ['top', 'bottom'],
                    });
                },
                onDragEnter: (args) => {
                    if (args.source.data.itemId !== index) {
                        setClosestEdge(extractClosestEdge(args.self.data));
                    }
                },
                onDrag: ({ self, source }) => {
                    if (source.data.itemId !== index) {
                        setClosestEdge(extractClosestEdge(self.data));
                    }
                },
                onDragLeave: () => {
                    setClosestEdge(null);
                },
                onDrop: () => {
                    setClosestEdge(null);
                },
            }),
        );
    }, [instanceId, index]);

    return (
        <>
            <div ref={containerRef} className={styles.fieldContainer}>
                <div className={styles.dragContainer}>
                    <IconButton
                        variant="text"
                        ref={dragHandleRef}
                        type="secondary"
                        size="xs"
                        disabled={shouldDisabled}
                        sx={{
                            cursor: state.type === 'dragging' ? 'grabbing' : 'grab',
                        }}
                    >
                        <Icon name="dragAndDropHandle" fontSize={20} />
                    </IconButton>
                </div>

                <DraggableOption
                    control={control}
                    formField={formField}
                    closestEdge={closestEdge}
                    remove={remove}
                    index={index}
                    state={state}
                    label={label}
                    shouldDisabled={shouldDisabled}
                />
            </div>

            {state.type === 'preview' &&
                createPortal(
                    <div
                        style={{
                            boxSizing: 'border-box',
                            width: state.rect?.width,
                            height: state.rect?.height,
                        }}
                    >
                        <div className={styles.fieldContainer}>
                            <DraggableOption control={control} formField={formField} remove={remove} index={index} state={state} />
                        </div>
                    </div>,
                    state.container,
                )}
        </>
    );
};

const FieldExtraOptions = ({ boardType, boardName, containerRef, methods, formField, disabled }: Props) => {
    const { t } = useTranslation();
    const { control } = methods;
    const fieldType = useWatch({ control, name: 'type' });
    const fieldName = useWatch({ control, name: 'name' });
    const [instanceId] = useState(() => Symbol('instance-id'));
    const {
        fields = [],
        append,
        remove,
        swap,
    } = useFieldArray({
        control,
        name: 'data',
    });

    const rowVirtualizer = useVirtualizer({
        count: fields.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 68,
        overscan: 10,
        gap: 8,
    });

    useEffect(() => {
        rowVirtualizer.measure();
    }, [rowVirtualizer]);

    const reorderOption = useCallback(
        ({ startIndex, finishIndex }: { startIndex: number; finishIndex: number }) => {
            swap(startIndex, finishIndex);
        },
        [swap],
    );

    useEffect(() => {
        return combine(
            monitorForElements({
                canMonitor({ source }) {
                    return source.data.instanceId === instanceId;
                },
                onDrop(args) {
                    const { location, source } = args;
                    // didn't drop on anything
                    if (!location.current.dropTargets.length) {
                        return;
                    }

                    const itemId = source.data.itemId;
                    invariant(typeof itemId === 'number');
                    const itemIndex = fields.findIndex((item, index) => index === itemId);

                    if (location.current.dropTargets.length === 1) {
                        const [destinationItem] = location.current.dropTargets;
                        const indexOfTarget = fields.findIndex((item, index) => index === destinationItem.data.itemId);
                        const closestEdgeOfTarget: Edge | null = extractClosestEdge(destinationItem.data);
                        const destinationIndex = getReorderDestinationIndex({
                            startIndex: itemIndex,
                            indexOfTarget: indexOfTarget,
                            closestEdgeOfTarget: closestEdgeOfTarget,
                            axis: 'vertical',
                        });
                        reorderOption({
                            startIndex: itemIndex,
                            finishIndex: destinationIndex,
                        });

                        return;
                    }
                },
            }),
        );
    }, [fields, instanceId, reorderOption]);

    const onAddField = () => {
        append({
            value: '',
        });
    };

    const renderExtraOptions = () => {
        if (fieldType === 'MultipleSelection' || fieldType === 'SingleSelection' || fieldType === 'Priority') {
            const optionShouldDisable = (option: string, index: number) => {
                if (boardType === 'System') {
                    switch (boardName) {
                        case 'Email Outbound Records':
                            if (formField?.is_default) {
                                return defaultFieldOptions['Email Outbound Records'][fieldName]?.indexOf(option) !== -1;
                            }
                            break;
                        default:
                            break;
                    }
                }
                if (boardType === 'Contacts' && fieldName === 'Stage') {
                    return option === 'Unidentified Lead' || option === 'Identified Lead';
                }
                if (index + 1 > (formField?.data?.length ?? 0)) {
                    return false;
                }
                if (disabled) {
                    return true;
                }

                return false;
            };
            return (
                <Space direction="vertical" size={8} align="start">
                    {rowVirtualizer.getVirtualItems().length && (
                        <div
                            style={{
                                height: `${rowVirtualizer.getTotalSize()}px`,
                                width: '100%',
                                position: 'relative',
                            }}
                        >
                            <Space
                                direction="vertical"
                                size={8}
                                align="start"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start || 0}px)`,
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                    const fieldItem = fields[virtualRow.index];
                                    return (
                                        <Space
                                            direction="vertical"
                                            size={8}
                                            align="start"
                                            style={{ width: '100%' }}
                                            key={fieldItem.id}
                                            data-index={virtualRow.index}
                                            containerRef={rowVirtualizer.measureElement}
                                        >
                                            <OptionContainer
                                                control={control}
                                                instanceId={instanceId}
                                                formField={formField}
                                                index={virtualRow.index}
                                                remove={remove}
                                                shouldDisabled={optionShouldDisable(fieldItem.value, virtualRow.index)}
                                                label={`${t('fields_management_row_option')} ${virtualRow.index + 1}${
                                                    virtualRow.index === 0 ? '*' : ''
                                                }`}
                                            />
                                        </Space>
                                    );
                                })}
                            </Space>
                        </div>
                    )}
                    <Box>
                        <Button
                            sx={{ fontSize: '12px', fontWeight: 400, textTransform: 'capitalize' }}
                            text={t('fields_management_row_add_option')}
                            onClick={() => onAddField()}
                            size="xs"
                            variant="link"
                            startIcon={<Icon name="add" />}
                        />
                    </Box>
                </Space>
            );
        }

        if (fieldType === 'Phone' && FieldExtraSetting[fieldType]) {
            return FieldExtraSetting[fieldType]?.map((extraSettingField) => (
                <Controller
                    key={`settings.${extraSettingField.name}`}
                    name={`settings.${extraSettingField.name}`}
                    control={control}
                    defaultValue={extraSettingField.defaultValue}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                        switch (extraSettingField.type) {
                            case 'switch':
                                return (
                                    <FieldSwitch
                                        label={`${t(extraSettingField.label)}${extraSettingField.required ? '*' : ''}`}
                                        fullWidth
                                        onChange={async (checked) => {
                                            onChange(checked);
                                        }}
                                        value={!!value}
                                        error={!!error}
                                        helperText={error?.message}
                                        disabled={!!formField || disabled}
                                    />
                                );
                            case 'select':
                            default:
                                return (
                                    <FieldSelect
                                        label={`${t(extraSettingField.label)}${extraSettingField.required ? '*' : ''}`}
                                        fullWidth
                                        onChange={onChange}
                                        value={value}
                                        error={!!error}
                                        helperText={error?.message}
                                        request={async () => extraSettingField.options}
                                        // disabled={!!formField || disabled}
                                        searchable
                                        searchFn={({ option, search }) => {
                                            if (!search) {
                                                return true;
                                            }
                                            if (getCountryCallingCode(option.value as CountryCode).indexOf(search) !== -1) {
                                                return true;
                                            }
                                            const country = getCountry(option.value as CountryCode);
                                            if (country && country.name.toLowerCase().indexOf(search.toLowerCase()) !== -1) {
                                                return true;
                                            }

                                            return `${option.value}`.toLowerCase().indexOf(search.toLowerCase()) !== -1;
                                        }}
                                    />
                                );
                        }
                    }}
                />
            ));
        }
        return null;
    };

    return renderExtraOptions();
};

export default FieldExtraOptions;
