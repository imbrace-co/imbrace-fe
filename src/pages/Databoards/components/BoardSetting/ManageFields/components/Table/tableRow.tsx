import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import type { Edge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { FieldSelect, FieldText, Icon, IconButton, Space } from '@imbrace/ui';
import { Menu, MenuItem } from '@mui/material';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import invariant from 'tiny-invariant';

import PromptExpandIcon from '@/assets/icons/ai_schema_promt_expand.svg?react';
import useAccess from '@/hooks/useAccess';
import { FieldTypeIcon, FieldTypesOptions, FieldTypeText, FieldTypeTextDataboard } from '@/pages/Databoards/utils';

import type { BoardSettingFormValue } from '../../..';
import styles from './index.module.scss';

type State = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect?: DOMRect } | { type: 'dragging' };

const idleState: State = { type: 'idle' };
const draggingState: State = { type: 'dragging' };

const TableRow = ({
    boardId,
    instanceId,
    item,
    onUpdateField,
    hasNewCreatedField,
    refresh,
    openDialog,
    handleDeleteField,
    isSystemDefault,
    isNested,
    formControl,
    disableActions,
    knowledgeHub,
    isDocumentAIRoute,
}: {
    formControl?: Control<BoardSettingFormValue>;
    boardId?: string;
    isSystemDefault?: boolean;
    isNested?: boolean;
    disableActions?: boolean;
    knowledgeHub?: boolean;
    isDocumentAIRoute?: boolean;
    instanceId: symbol;
    item: API.BoardField;
    onUpdateField: ({ fieldId, data }: { fieldId: string; data: Partial<API.BoardField> }) => Promise<void>;
    hasNewCreatedField: boolean;
    refresh: () => void;
    openDialog: (boardField?: API.BoardField) => void;
    handleDeleteField: (fieldId: string) => void;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const dragHandleRef = useRef<HTMLButtonElement>(null);
    const { t } = useTranslation();

    const { isAdmin } = useAccess();
    const canEditBoard = isAdmin();

    const [state, setState] = useState<State>(idleState);
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

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

    // Inline-editable cells for the "AI" layout: Field Name | AI Logic | Extraction Prompt | kebab.
    // Writes patches straight into the RHF `fields` array (via onUpdateField); the parent
    // BoardSetting persists on its Save button — same path the popup edit uses.
    const renderAiCells = () => {
        const readOnly = !canEditBoard || disableActions;
        const aiTypeOptions = FieldTypesOptions(t, isDocumentAIRoute);
        const typeText = t((isDocumentAIRoute ? FieldTypeTextDataboard : FieldTypeText)[item.type as keyof typeof FieldTypeText]);
        return (
            <>
                <Space className={styles.cell} align="center">
                    <FieldText
                        fullWidth
                        value={item.name ?? ''}
                        placeholder={t('databoard_attribute_name')}
                        disabled={readOnly || item.is_default || isSystemDefault}
                        onChange={(e) =>
                            onUpdateField({ fieldId: item._id, data: { name: (e.target as HTMLInputElement).value } })
                        }
                    />
                </Space>
                <Space className={styles.cell} align="center">
                    <FieldSelect
                        fullWidth
                        value={item.type ?? ''}
                        // Type of an existing field can't be changed (matches the popup) — only
                        // brand-new (unsaved) rows may pick their AI Logic inline.
                        disabled={readOnly || !!item._id || item.is_default || isSystemDefault}
                        request={() => aiTypeOptions}
                        renderValue={() => (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                {FieldTypeIcon(item.type, { fontSize: 24, style: { color: 'var(--color-light-5)' } })}
                                <span>{typeText}</span>
                            </span>
                        )}
                        onChange={(value) =>
                            onUpdateField({ fieldId: item._id, data: { type: value as API.FieldType } })
                        }
                    />
                </Space>
                <Space className={clsx(styles.cell, styles.promptCell)} align="center">
                    <FieldText
                        fullWidth
                        multiline
                        minRows={1}
                        maxRows={4}
                        value={item.description ?? ''}
                        placeholder={t('databoard_extraction_prompt')}
                        disabled={readOnly || isSystemDefault}
                        onChange={(e) =>
                            onUpdateField({ fieldId: item._id, data: { description: (e.target as HTMLInputElement).value } })
                        }
                        sx={{ '& .MuiInputBase-input': { paddingRight: '34px' } }}
                    />
                    <PromptExpandIcon
                        className={styles.promptExpand}
                        style={{ width: 18, height: 18 }}
                        onClick={() => openDialog(item)}
                    />
                </Space>
                <Space className={clsx(styles.cell, styles.kebabCell)} align="center">
                    {canEditBoard && (
                        <>
                            <IconButton
                                size="xs"
                                variant="text"
                                type="secondary"
                                disabled={disableActions}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuAnchor(e.currentTarget);
                                }}
                            >
                                <Icon name="moreVert" />
                            </IconButton>
                            <Menu open={!!menuAnchor} anchorEl={menuAnchor} onClose={() => setMenuAnchor(null)}>
                                <MenuItem
                                    sx={{ fontSize: 14, color: 'var(--color-light-7)' }}
                                    onClick={() => {
                                        setMenuAnchor(null);
                                        openDialog(item);
                                    }}
                                >
                                    {t('edit')}
                                </MenuItem>
                                {!(item.is_default || item.is_identifier) && (
                                    <MenuItem
                                        sx={{ fontSize: 14, color: 'var(--color-danger-1)' }}
                                        onClick={() => {
                                            setMenuAnchor(null);
                                            handleDeleteField(item._id);
                                        }}
                                    >
                                        {t('delete')}
                                    </MenuItem>
                                )}
                            </Menu>
                        </>
                    )}
                </Space>
            </>
        );
    };

    if (!item) {
        return <></>;
    }
    return (
        <>
            <div className={clsx(styles.tableRow, styles.aiLayout)} ref={containerRef}>
                {renderAiCells()}
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
                        {...((item.is_identifier || !boardId || hasNewCreatedField) && {
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
                        <div className={clsx(styles.tableRow, styles.aiLayout)}>
                            {renderAiCells()}
                        </div>
                    </div>,
                    state.container,
                )}
        </>
    );
};

export default TableRow;
