import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { FieldSwitch, Icon, IconButton, Space, Tooltip, Typography } from '@imbrace/ui';
import { useMutation } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import invariant from 'tiny-invariant';

import useAccess from '@/hooks/useAccess';
import { FieldTypeIcon, FieldTypeText } from '@/pages/Databoards/utils';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { putBoardField } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

type State = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect?: DOMRect } | { type: 'dragging' };

const idleState: State = { type: 'idle' };
const draggingState: State = { type: 'dragging' };

const TableRow = ({
    instanceId,
    boardId,
    item,
    refresh,
    openDialog,
    handleDeleteField,
}: {
    instanceId: symbol;
    boardId: string;
    item: API.BoardField;
    refresh: () => void;
    openDialog: (boardField?: API.BoardField) => void;
    handleDeleteField: (fieldId: string) => void;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const { isAdmin } = useAccess();

    const updateField = useMutation({
        mutationFn: async (params: { fieldId: string; hidden: boolean; hiddenOnRecord: boolean }) => {
            const { data } = await apiFetch<API.Board>(putBoardField.api(boardId, params.fieldId), putBoardField.method, {
                name: item.name,
                description: item.description,
                type: item.type,
                hidden: params.hidden,
                hidden_on_record: params.hiddenOnRecord,
            });
            return data;
        },
        onSuccess: (data, { fieldId }) => {
            refresh();
        },
        onError: (err) => {
            console.log(err);
            const error = err as AxiosError<API.ErrorResponse>;
            if (error.response?.data.message === 'field not found') {
                const notificationPayload = {
                    message: t('fields_management_field_not_found'),
                    messageType: 'noti_failed',
                    variant: 'error',
                };
                dispatch(pushNotification({ notification: notificationPayload }));
                refresh();
            }
        },
    });
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
                canDrag: () => !item.is_identifier,
                getInitialData: () => ({ itemId: item._id, instanceId, isIdentifier: item.is_identifier }),
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

                onDragStart: () => {
                    setState(draggingState);
                },
                onDrop: () => {
                    setState(idleState);
                },
            }),
            dropTargetForElements({
                element: dropTargetElement,
                canDrop: ({ source }) => {
                    return source.data.instanceId === instanceId && !source.data.isIdentifier;
                },
                getIsSticky: () => true,
                getData: ({ input, element }) => {
                    const data = { itemId: item._id, isIdentifier: item.is_identifier };

                    return attachClosestEdge(data, {
                        input,
                        element,
                        allowedEdges: item.is_identifier ? [] : ['top', 'bottom'],
                    });
                },
                onDragEnter: (args) => {
                    if (args.source.data.itemId !== item._id) {
                        setClosestEdge(extractClosestEdge(args.self.data));
                    }
                },
                onDrag: ({ self, source }) => {
                    if (source.data.itemId !== item._id) {
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
    }, [instanceId, item._id, item.is_identifier]);

    const render = () => {
        return (
            <>
                <Space className={styles.cell} size={4} align="center" style={{ paddingLeft: '12px' }}>
                    {item.name}
                    {item.description && (
                        <Tooltip title={item.description} arrow>
                            <Space size={0}>
                                <Icon name="info" fontSize={16} color="var(--color-light-4)" />
                            </Space>
                        </Tooltip>
                    )}
                </Space>
                <Space className={styles.cell} size={12} align="center">
                    {FieldTypeIcon(item.type, {
                        style: {
                            color: 'var(--color-light-5)',
                            fontSize: '24px',
                        },
                    })}

                    {t(FieldTypeText[item.type as keyof typeof FieldTypeText])}
                </Space>
                <Space className={clsx(styles.cell, styles.operation)} size={12} align="center">
                    <FieldSwitch
                        onChange={async (checked) => {
                            try {
                                await updateField.mutateAsync({
                                    fieldId: item._id,
                                    hidden: !checked,
                                    hiddenOnRecord: !!item.hidden_on_record,
                                });
                            } catch (error) {
                                console.log(error);
                            }
                        }}
                        disabled={item.is_identifier}
                        // tooltip={item.is_identifier && t('fields_management_switch_tooltip')}
                        value={!item.hidden}
                        switchLabel={() => (
                            <Space size={4} align="center">
                                <Typography
                                    variant="BodyTight"
                                    className={item.is_identifier ? styles.switchLabelDisabled : styles.switchLabel}
                                >
                                    {`${t('show_on')}: ${t('board')}`}
                                </Typography>
                                <Tooltip title={t('fields_management_show_on_board_tooltip')} arrow>
                                    <Space size={0}>
                                        <Icon name="info" fontSize={16} color="var(--color-light-4)" />
                                    </Space>
                                </Tooltip>
                            </Space>
                        )}
                    />

                    <FieldSwitch
                        onChange={async (checked) => {
                            try {
                                await updateField.mutateAsync({
                                    fieldId: item._id,
                                    hidden: !!item.hidden,
                                    hiddenOnRecord: !checked,
                                });
                            } catch (error) {
                                console.log(error);
                            }
                        }}
                        disabled={item.is_identifier}
                        // tooltip={item.is_identifier && t('fields_management_switch_tooltip')}
                        value={!item.hidden_on_record}
                        switchLabel={() => (
                            <Space size={4} align="center">
                                <Typography
                                    variant="BodyTight"
                                    className={item.is_identifier ? styles.switchLabelDisabled : styles.switchLabel}
                                >
                                    {`${t('record')}`}
                                </Typography>
                                <Tooltip title={t('fields_management_show_on_record_tooltip')} arrow>
                                    <Space size={0}>
                                        <Icon name="info" fontSize={16} color="var(--color-light-4)" />
                                    </Space>
                                </Tooltip>
                            </Space>
                        )}
                    />
                    {isAdmin() && (
                        <>
                            <IconButton
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openDialog(item);
                                }}
                                variant="text"
                                size="s"
                                type="secondary"
                            >
                                <Icon name="edit" />
                            </IconButton>
                            {item.is_default || item.is_identifier ? (
                                <Tooltip
                                    arrow
                                    title={t('fields_management_delete_tooltip')}
                                    placement="top"
                                    componentsProps={{
                                        tooltip: {
                                            sx: {
                                                backgroundColor: '#D9D9D9',
                                                color: 'var(--color-light-7)',
                                                margin: '30px',
                                            },
                                        },
                                        arrow: {
                                            sx: {
                                                color: '#D9D9D9',
                                            },
                                        },
                                    }}
                                >
                                    <span>
                                        <IconButton
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteField(item._id);
                                            }}
                                            variant="text"
                                            size="s"
                                            type="secondary"
                                            disabled={item.is_default || item.is_identifier}
                                        >
                                            <Icon name="delete" />
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            ) : (
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteField(item._id);
                                    }}
                                    variant="text"
                                    size="s"
                                    type="secondary"
                                    disabled={item.is_default || item.is_identifier}
                                >
                                    <Icon name="delete" />
                                </IconButton>
                            )}
                        </>
                    )}
                </Space>
            </>
        );
    };
    return (
        <>
            <div className={styles.tableRow} ref={containerRef}>
                {render()}
                <Space className={clsx(styles.cell, styles.dragHandler)}>
                    <IconButton
                        ref={dragHandleRef}
                        type="secondary"
                        variant="text"
                        size="xs"
                        sx={{
                            cursor: 'grab',
                            '&:active': {
                                cursor: 'grabbing',
                            },
                        }}
                        {...(item.is_identifier && {
                            sx: {
                                visibility: 'hidden',
                            },
                        })}
                    >
                        <Icon name="dragAndDropHandle" fontSize={20} />
                    </IconButton>
                </Space>

                {closestEdge && <DropIndicator edge={closestEdge} />}
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
                        <div className={styles.tableRow}>{render()}</div>
                    </div>,
                    state.container,
                )}
        </>
    );
};

export default TableRow;
