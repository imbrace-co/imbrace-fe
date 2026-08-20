import { Accordion, Button, Dropdown, Icon, Illustration, Space, Spin, Tooltip, Typography, useModal } from '@imbrace/ui';
import { CircularProgress, Divider, ListItemButton } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useIntersectionObserver } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import SimpleBar from 'simplebar-react';

import { getBoardRecords, postBoardRecord } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { useBoards, useRelatedRecordsInfinite } from '@/services/queries/board';
import { CONTACT_PANEL_DISPLAY } from '@/constants/app';

import AssociatedRecords from './associatedRecords';
import { BoardCard } from './boardCard';
import ExistingRecords from './existingRecords';
import SuggestedMessage from './SuggestedMessage';
import NextBestAction from './NextBestAction';
import DetectedKeywords from './DetectedKeywords';
import styles from './index.module.scss';

const relations: Record<string, API.BoardType[]> = {
    Contacts: ['Companies', 'Opportunities', 'Tasks'],
    Companies: [],
    Opportunities: ['Tasks', 'Contacts', 'Products', 'Companies'],
    Tasks: ['Contacts', 'Opportunities', 'Products'],
    Products: [],
};

// Default panel display settings
const defaultPanelSettings = {
    suggestedMessage: true,
    nextBestAction: true,
    detectedKeywords: true,
    companies: true,
    opportunities: true,
    tasks: true,
};

// Function to get filtered relations based on localStorage settings
const getFilteredRelations = (boardType: string): API.BoardType[] => {
    if (boardType !== 'Contacts') {
        return relations[boardType] || [];
    }

    // Get settings from localStorage
    const saved = localStorage.getItem(CONTACT_PANEL_DISPLAY);
    const panelSettings = saved ? JSON.parse(saved) : defaultPanelSettings;
    
    // Map localStorage keys to board types (only actual board relations)
    const boardTypeMapping: Record<string, API.BoardType> = {
        companies: 'Companies',
        opportunities: 'Opportunities',
        tasks: 'Tasks',
    };
    
    // Filter based on enabled settings
    const enabledBoards: API.BoardType[] = [];
    Object.entries(boardTypeMapping).forEach(([settingKey, boardType]) => {
        if (panelSettings[settingKey]) {
            enabledBoards.push(boardType);
        }
    });
    
    return enabledBoards;
};

// Function to get filtered panel items (non-board components)
const getFilteredPanelItems = (boardType: string): string[] => {
    if (boardType !== 'Contacts') {
        return [];
    }

    // Get settings from localStorage
    const saved = localStorage.getItem(CONTACT_PANEL_DISPLAY);
    const panelSettings = saved ? JSON.parse(saved) : defaultPanelSettings;
    
    // Filter based on enabled settings
    const enabledPanelItems: string[] = [];
    Object.entries(defaultPanelSettings).forEach(([settingKey, value]) => {
        if (panelSettings[settingKey]) {
            enabledPanelItems.push(settingKey as string);
        }
    });
    
    return enabledPanelItems;
};

// Custom components for panel items
const SuggestedMessageAccordion = ({ onMessageInsert }: { onMessageInsert?: (messageContent: string) => void }) => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    
    const handleMessageInsert = (messageContent: string) => {
        if (onMessageInsert) {
            // Call the parent callback to switch to conversation view
            onMessageInsert(messageContent);
        }
    };
    
    return (
        <Accordion
            title={<Typography variant="SubHeading2">Suggested Message</Typography>}
            expanded={expanded}
            onChange={(e, isExpanded) => setExpanded(isExpanded)}
            detailsSx={{
                padding: 0,
            }}
        >
            <SuggestedMessage onMessageInsert={handleMessageInsert} />
        </Accordion>
    );
};

const NextBestActionAccordion = () => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    
    return (
        <Accordion
            title={<Typography variant="SubHeading2">Next Best Action</Typography>}
            expanded={expanded}
            onChange={(e, isExpanded) => setExpanded(isExpanded)}
            detailsSx={{
                padding: 0,
            }}
        >
            <NextBestAction />
        </Accordion>
    );
};

const DetectedKeywordsAccordion = () => {
    const { t } = useTranslation();
    const [expanded, setExpanded] = useState(false);
    
    return (
        <Accordion
            title={<Typography variant="SubHeading2">Detected Keywords</Typography>}
            expanded={expanded}
            onChange={(e, isExpanded) => setExpanded(isExpanded)}
            detailsSx={{
                padding: 0,
            }}
        >
            <DetectedKeywords />
        </Accordion>
    );
};

// Component renderer for panel items
const renderPanelItem = (itemName: string, onMessageInsert?: (messageContent: string) => void) => {
    switch (itemName) {
        case 'Suggested Message':
            return <SuggestedMessageAccordion onMessageInsert={onMessageInsert} />;
        case 'Next Best Action':
            return <NextBestActionAccordion />;
        case 'Detected Keywords':
            return <DetectedKeywordsAccordion />;
        default:
            return null;
    }
};

export const handleCreateRecord = async (params: {
    boardId: string;
    fieldId?: string;
    boardName?: string;
    related_board_item_id?: string;
}) => {
    // Reason: matches the guard in Databoards/extra.tsx — abort when the
    // identifier field id is missing instead of POSTing without
    // board_field_id (Zod 400 on /data-board/boards/<id>/items).
    if (!params.fieldId) {
        console.warn('RelationBoards.handleCreateRecord: missing fieldId, abort', params);
        return;
    }
    try {
        const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
            getBoardRecords.api(params.boardId),
            getBoardRecords.method,
            {
                limit: 1,
                skip: 0,
            },
        );
        const value = `${params.boardName} ${data.count + 1}`;

        const { data: rawRecord } = await apiFetch<{ data: API.BoardItem } | API.BoardItem>(postBoardRecord.api(params.boardId), postBoardRecord.method, {
            fields: [{ board_field_id: params.fieldId, value }],
            related_board_item_id: params.related_board_item_id,
        });

        const record = (rawRecord as { data: API.BoardItem }).data ?? (rawRecord as API.BoardItem);
        return record;
    } catch (error) {
        console.log(error);
    }
};

const AccordionBoard = ({
    title,
    board,
    readOnly,
    currentRecord,
    currentBoard,
    disable,
}: {
    title: string;
    board: API.Board;
    readOnly?: boolean;
    currentRecord: API.BoardItem;
    currentBoard: API.Board;
    disable?: boolean;
}) => {
    const [expanded, setExpanded] = useState(true);
    const { t } = useTranslation();
    const [{ modal }, modalsHolder] = useModal();
    const navigate = useNavigate();
    const parentRef = useRef<HTMLDivElement>(null);
    const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isFetching, isFetchedAfterMount, refetch } = useRelatedRecordsInfinite({
        boardId: currentBoard._id,
        recordId: currentRecord._id,
        relatedBoardId: board._id,
        params: { skip: 0, limit: 5, link: true },
    });
    const [ref, entry] = useIntersectionObserver({
        threshold: 0,
        root: null,
        rootMargin: '0px',
    });
    const allRows = data ? data.pages.flatMap((d) => d.data) : [];
    const totalCount = data ? data.pages[0].count : 0;
    const showViewAll = data && !disable ? data.pages[0].has_more : false;

    const createRecord = useMutation({
        mutationFn: handleCreateRecord,
        onSuccess: (record, { boardId }) => {
            if (record) {
                navigate(`/crm/${boardId}/${record._id}`);
            }
        },
    });

    useEffect(() => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [entry?.isIntersecting, fetchNextPage, isFetchingNextPage]);

    const refresh = useCallback(() => {
        refetch();
    }, [refetch]);

    if (!board) {
        return null;
    }

    const getMenuOptionText = () => {
        let existingText = '';
        let createNewText = '';
        switch (board.type) {
            case 'Contacts':
                existingText = 'Existing Contact';
                createNewText = 'New Contact';
                break;
            case 'Companies':
                existingText = 'Existing Company';
                createNewText = 'New Company';
                break;
            case 'Opportunities':
                existingText = 'Existing Opportunity';
                createNewText = 'New Opportunity';
                break;
            case 'Tasks':
                existingText = 'Existing Task';
                createNewText = 'New Task';
                break;
            case 'Products':
                existingText = 'Existing Product';
                createNewText = 'New Product';
                break;
            default:
                existingText = 'Existing Record';
                createNewText = 'New Record';
                break;
        }
        return { existingText, createNewText };
    };

    return (
        <Accordion
            title={
                <Space justify="between" align="center" style={{ width: '100%' }}>
                    <Typography variant="SubHeading2">{`${title} ${totalCount ? `(${totalCount})` : ''}`}</Typography>
                    {!readOnly && (
                        <Tooltip title={disable ? t('add_new_related_records_tips') : ''} arrow placement="top">
                            <div>
                                <Dropdown
                                    options={[
                                        {
                                            index: 'existing',
                                            icon: <Icon name="linkedRecord" />,
                                            text: getMenuOptionText().existingText,
                                            sx: {
                                                padding: '8px 24px',
                                            },
                                        },
                                        {
                                            index: 'new',
                                            icon: <Icon name="newRecord" />,
                                            text: getMenuOptionText().createNewText,
                                            sx: {
                                                padding: '8px 24px',
                                            },
                                            loading: createRecord.isPending,
                                        },
                                    ]}
                                    text={
                                        <Space size={4}>
                                            <Icon name="newRecord" style={{ fontSize: 20 }} />
                                            <Typography variant="Inherit">{t('add')}</Typography>
                                        </Space>
                                    }
                                    disabled={disable}
                                    hideOnSelect
                                    hideArrow
                                    variant="link"
                                    type="primary"
                                    menuPaperProps={{
                                        sx: {
                                            minWidth: 223,
                                            padding: '4px 0 !important',
                                        },
                                    }}
                                    onSelect={(e, selectedIndex) => {
                                        if (selectedIndex === 'existing' && board) {
                                            modal({
                                                hideHeader: true,
                                                content: ({ onClose: onModalClose }) => (
                                                    <ExistingRecords
                                                        onClose={onModalClose}
                                                        board={board}
                                                        currentRecord={currentRecord}
                                                        currentBoard={currentBoard}
                                                        refresh={() => {
                                                            refetch();
                                                        }}
                                                    />
                                                ),
                                                paperSx: {
                                                    margin: '112px 100px',
                                                    maxWidth: '1080px',
                                                    height: 'calc(100vh - 224px)',
                                                },
                                            });
                                        }
                                        if (selectedIndex === 'new' && board) {
                                            const identifierFieldId = board.fields.find((field) => field.is_identifier)?._id;
                                            if (identifierFieldId) {
                                                createRecord.mutate({
                                                    boardId: board.id,
                                                    fieldId: identifierFieldId,
                                                    boardName: board.name,
                                                    related_board_item_id: currentRecord._id,
                                                });
                                            }
                                        }
                                    }}
                                />
                            </div>
                        </Tooltip>
                    )}
                </Space>
            }
            expanded={expanded}
            onChange={(e, isExpanded) => setExpanded(isExpanded)}
            {...(showViewAll && {
                detailsSx: {
                    paddingBottom: '40px',
                },
            })}
        >
            {modalsHolder}

            <SimpleBar
                style={{ height: '100%', maxHeight: '542px', margin: '0 -24px' }}
                scrollableNodeProps={{
                    ref: parentRef,
                }}
            >
                <Spin isSpinning={isFetching && !isFetchedAfterMount && !isFetchingNextPage}>
                    <Space size={8} direction="vertical" justify="stretch" align="stretch" style={{ padding: '0 24px' }}>
                        {allRows.map((record, index) => {
                            return (
                                <BoardCard
                                    key={record._id}
                                    record={record}
                                    board={board}
                                    currentBoard={currentBoard}
                                    currentRecord={currentRecord}
                                    defaultExpanded={index === 0}
                                    refresh={() => {
                                        refetch();
                                    }}
                                />
                            );
                        })}
                        {allRows.length === 0 && (
                            <Illustration
                                size={8}
                                name="recordMissing2"
                                description={t('no_associated_records_found')}
                                style={{ width: '180px', height: 'auto' }}
                            />
                        )}
                    </Space>
                </Spin>

                {hasNextPage && (
                    <Space justify="center" align="center" style={{ marginTop: 20, width: '100%' }} ref={ref}>
                        <CircularProgress size={25} />
                    </Space>
                )}
            </SimpleBar>
            {showViewAll && (
                <Space className={styles.showAllContainer} justify="end">
                    <Button
                        text={t('view_all')}
                        endIcon={<Icon name="chevronRight" style={{ fontSize: 20 }} />}
                        size="xs"
                        variant="link"
                        sx={{ gap: '4px' }}
                        onClick={() => {
                            modal({
                                title: `${t('associated_records')} - ${title} ${totalCount ? `(${totalCount})` : ''}`,
                                content: ({ onClose: onModalClose, changeTitle }) => (
                                    <AssociatedRecords
                                        currentBoard={currentBoard}
                                        currentRecord={currentRecord}
                                        relatedBoard={board}
                                        onClose={onModalClose}
                                        changeTitle={changeTitle}
                                        title={`${t('associated_records')} - ${title} ${totalCount ? `(${totalCount})` : ''}`}
                                        refresh={refresh}
                                    />
                                ),

                                // paperSx: {
                                //     margin: '112px 100px',
                                //     maxWidth: '1080px',
                                //     height: 'calc(100vh - 224px)',
                                // },
                            });
                        }}
                    />
                </Space>
            )}
        </Accordion>
    );
};

interface RelationBoardsProps {
    boardType: API.BoardType;
    showExpand: boolean;
    readOnly?: boolean;
    currentRecord: API.BoardItem;
    currentBoard: API.Board;
    disable?: boolean;
    onMessageInsert?: (messageContent: string) => void;
}
export interface RelationBoardsRef {
    setExpanded: (expanded: boolean) => void;
}

const RelationBoards = forwardRef<RelationBoardsRef, RelationBoardsProps>(
    ({ boardType, showExpand, readOnly, currentRecord, currentBoard, disable, onMessageInsert }, ref) => {
        const [expanded, setExpanded] = useState(true);
        const [, setUpdateTrigger] = useState(0); // Force re-render when localStorage changes
        const { data: boards } = useBoards({ isDefault: true });

        useImperativeHandle(ref, () => ({
            setExpanded: (isExpanded: boolean) => setExpanded(isExpanded),
        }));

        // Listen for localStorage changes to update the displayed boards
        useEffect(() => {
            const handleStorageChange = () => {
                setUpdateTrigger(prev => prev + 1);
            };

            // Listen for storage events (from other tabs/windows)
            window.addEventListener('storage', handleStorageChange);
            
            // Listen for custom storage events (from same tab)
            window.addEventListener('localStorageChange', handleStorageChange);

            return () => {
                window.removeEventListener('storage', handleStorageChange);
                window.removeEventListener('localStorageChange', handleStorageChange);
            };
        }, []);

        // Get filtered relations based on boardType and localStorage settings
        const filteredRelations = getFilteredRelations(boardType);
        const filteredPanelItems = getFilteredPanelItems(boardType);

        if (filteredRelations.length === 0 && filteredPanelItems.length === 0) {
            return null;
        }

        return (
            <div className={clsx(styles.container, boardType === 'Contacts' && styles.small, expanded && styles.expand)} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Space size={0} direction="vertical" align="stretch" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
                        <SimpleBar style={{ height: '100%' }}>
                            {/* Render panel items first */}
                            {filteredPanelItems?.map((itemName) => {
                                return (
                                    <div key={itemName}>
                                        {renderPanelItem(itemName, onMessageInsert)}
                                    </div>
                                );
                            })}
                            
                            {/* Then render board relations */}
                            {filteredRelations?.map((type) => {
                                const targetBoard = boards.filter((board) => board.type === type)[0];
                                if (!targetBoard) {
                                    return null;
                                }
                                return (
                                    <AccordionBoard
                                        key={type}
                                        title={type}
                                        board={targetBoard}
                                        readOnly={readOnly}
                                        currentRecord={currentRecord}
                                        currentBoard={currentBoard}
                                        disable={disable}
                                    />
                                );
                            })}
                        </SimpleBar>
                    </div>
                    {showExpand && (
                        <>
                            <Divider />
                            <div className={styles.footer}>
                                <ListItemButton
                                    sx={{ padding: '12px 24px' }}
                                    onClick={() => {
                                        setExpanded((prev) => !prev);
                                    }}
                                >
                                    <Icon
                                        name={expanded ? 'navExpand' : 'navCollapse'}
                                        style={{ fontSize: 24, color: 'var(--color-light-5)' }}
                                    />
                                </ListItemButton>
                            </div>
                        </>
                    )}
                </Space>
            </div>
        );
    },
);

export default RelationBoards;
