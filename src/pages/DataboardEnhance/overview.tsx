import { Spin } from '@imbrace/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import useResizeObserver from 'use-resize-observer';

import { useNavbar } from '@/routes/PrivateLayout';
import { useBoardById, useRecordById } from '@/services/queries/board';

import ContactOverView from './components/ContactOverview';
import RecordDetail from './components/RecordDetail';
import type { RelationBoardsRef } from './components/RelationBoards';
import RelationBoards from './components/RelationBoards';
import styles from './overview.module.scss';
import RecordDetailEnhance from './components/RecordDetail/RecordDetailEnhance';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import useAccess from '@/hooks/useAccess';
import { fetchTeamConversationByIdThunk } from '@/redux/slices/teamConversation';
import { getContactConversationsById } from '@/services/api/contact';
import { postConversationMessage } from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';

// Add necessary imports for the new functionality
import { Button, IconButton, Dropdown, Icon, Space, Typography, Checkbox } from '@imbrace/ui';
import { useTranslation } from 'react-i18next';
import { env } from '@/env';
import ShareIcon from '@/assets/icons/icon_share.svg?react';
import { CONTACT_PANEL_DISPLAY } from '@/constants/app';

// Import MessageList component
import MessageList from '../Conversations/components/MessageList';

// Default panel display settings
const defaultPanelSettings = {
    suggestedMessage: true,
    nextBestAction: true,
    detectedKeywords: true,
    companies: true,
    opportunities: true,
    tasks: true,
};

const Overview = ({
    boardId,
    recordId,
    inModal,
    readOnly,
    disableRelation,
    defaultView,
}: {
    boardId?: string;
    recordId?: string;
    inModal?: boolean;
    readOnly?: boolean;
    disableRelation?: boolean;
    defaultView?: string;
}) => {
    const { tab, recId } = useParams<{ tab?: string; recId?: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const relationBoardsRef = useRef<RelationBoardsRef>(null);
    const user = useAppSelector((state) => state.Account);
    const { isAdmin } = useAccess();
    const { toggleNavbar } = useNavbar();
    const { t } = useTranslation();

    // State for settings panel
    const [showSettingsPanel, setShowSettingsPanel] = useState(false);
    const [panelSettings, setPanelSettings] = useState(() => {
        const saved = localStorage.getItem(CONTACT_PANEL_DISPLAY);
        return saved ? JSON.parse(saved) : defaultPanelSettings;
    });

    // State for share functionality
    const [shareSelected, setShareSelected] = useState<string>();
    const [shareToggle, setShareToggle] = useState<boolean>(false);

    // State for conversation view and message insertion
    const [showConversationView, setShowConversationView] = useState<boolean>(false);
    const [insertedMessage, setInsertedMessage] = useState<{ content: string; timestamp: number } | null>(null);
    const [currentDrawer, setCurrentDrawer] = useState<string>('closed');
    const [isLoadingConversation, setIsLoadingConversation] = useState<boolean>(false);
    const [hasLoadedConversation, setHasLoadedConversation] = useState<boolean>(false);

    // Get conversation from redux
    const teamConversation = useAppSelector((state) => state.TeamConversation.teamConversation);
    const teamConversationStatus = useAppSelector((state) => state.TeamConversation.getTeamConversationByIdStatus);

    const { ref: containerRef } = useResizeObserver<HTMLDivElement>({
        onResize: ({ width, height }) => {
            if (width && width < 1150) {
                relationBoardsRef.current?.setExpanded(false);
            }
        },
    });

    const { data: board, isFetching } = useBoardById(boardId || tab);

    useEffect(() => {
        if (!inModal) {
            toggleNavbar(false);
        }
    }, [inModal, toggleNavbar]);

    const {
        data: record,
        isFetching: isFetchingRecord,
        refetch,
        isFetchedAfterMount,
    } = useRecordById({
        boardId: board?._id,
        recordId: recordId || recId,
    });

    useEffect(() => {
        // prevent board that is not belong to CRM from being accessed
        if (board && (board.type === 'General' || board.type === 'System')) {
            navigate(`/databoards/${board._id}/${recordId || recId}`, { replace: true });
        }
    }, [board, navigate, recordId, recId]);

    const boardType = board?.type;

    const stages = useMemo(() => {
        const stagesField = board?.fields?.find((field) => field.default_field_name === 'stage');
        if (stagesField) {
            return record?.fields[stagesField._id] as string;
        }
        return undefined;
    }, [board, record]);

    const origin = useMemo(() => {
        const originField = board?.fields?.find((field) => field.default_field_name === 'origin');
        if (originField) {
            return record?.fields[originField._id] as API.OriginValue;
        }
        return undefined;
    }, [board, record]);

    // Handle share functionality
    const handleShareSelect = async (selectedIndex: string) => {
        try {
            if (selectedIndex === 'copy_share_link' || selectedIndex === 'copy_record_id') {
                if (shareSelected === selectedIndex && shareToggle) {
                    return;
                }

                setShareSelected(selectedIndex);
                setShareToggle(true);

                const shareLink = `${env.VITE_APP_HOST}/crm/${board?._id}/${record?._id}`;

                if (selectedIndex === 'copy_share_link') {
                    await navigator.clipboard.writeText(shareLink);
                }
                if (selectedIndex === 'copy_record_id') {
                    await navigator.clipboard.writeText(record?._id || '');
                }

                // Reset after 2 seconds
                setTimeout(() => {
                    setShareToggle(false);
                }, 2000);
            } else if (selectedIndex === 'delete') {
                // TODO: Implement delete functionality
                console.log('Delete record:', record?._id);
            }
        } catch (error) {
            console.log(error);
        }
    };

    // Handle panel settings change
    const handlePanelSettingChange = (key: string, checked: boolean) => {
        const newSettings = { ...panelSettings, [key]: checked };
        setPanelSettings(newSettings);
        localStorage.setItem(CONTACT_PANEL_DISPLAY, JSON.stringify(newSettings));

        // Dispatch custom event to notify other components of localStorage change
        window.dispatchEvent(
            new CustomEvent('localStorageChange', {
                detail: { key: CONTACT_PANEL_DISPLAY, value: newSettings },
            }),
        );
    };

    const renderDetail = useCallback(() => {
        if (isFetchedAfterMount) {
            if (board?.type === 'Tasks' || board?.type === 'Products' || board?.type === 'Opportunities') {
                let isAllowEdit = true;
                if (board?.type === 'Tasks' && record?.fields && !isAdmin()) {
                    const assigneeFieldId = board.fields.find((field) => field.default_field_name === 'multiple_assignees')?._id;
                    if (assigneeFieldId) {
                        const assigneeValue = record.fields[assigneeFieldId];
                        const taskOwner = record.created_by;
                        // Check task edit permissions:
                        // - If current user is not in the assignees list
                        // - And current user is not the task creator
                        // =>  disable editing
                        if (
                            user?.displayName &&
                            Array.isArray(assigneeValue) &&
                            !assigneeValue.some(
                                (assignee) =>
                                    (typeof assignee === 'string' && assignee === user?.displayName) ||
                                    (typeof assignee === 'object' &&
                                        assignee &&
                                        'display_name' in assignee &&
                                        (assignee as any).display_name === user?.displayName),
                            ) &&
                            taskOwner !== user?.displayName
                        ) {
                            isAllowEdit = false;
                        }
                    }
                }
                return (
                    <RecordDetailEnhance
                        inModal={inModal}
                        board={board}
                        record={record}
                        refresh={async () => {
                            await refetch({ throwOnError: false, cancelRefetch: false });
                        }}
                        readOnly={!isAllowEdit}
                    />
                );
            }
            return (
                <RecordDetail
                    inModal={inModal}
                    board={board}
                    record={record}
                    refresh={async () => {
                        await refetch();
                    }}
                    readOnly={readOnly}
                />
            );
        }
        return null;
    }, [isFetchedAfterMount, board, record, refetch, inModal, readOnly]);

    // Handle message insertion from iframe
    const handleMessageInsert = useCallback((messageContent: string) => {
        console.log('[Overview] Message content to insert:', messageContent);

        // Reset states and switch to conversation view
        setInsertedMessage({ content: messageContent, timestamp: Date.now() });
        console.log('[Overview] Set insertedMessage with timestamp:', Date.now());
        setHasLoadedConversation(false); // Allow loading conversation again
        setIsLoadingConversation(false);
        setShowConversationView(true);
    }, []);

    // Auto-load conversation when conversation view is shown
    useEffect(() => {
        const loadConversation = async () => {
            if (showConversationView && record?.contacts?._id && !isLoadingConversation && !hasLoadedConversation) {
                setIsLoadingConversation(true);
                setHasLoadedConversation(true);

                try {
                    // Fetch conversations for this contact
                    const { data } = await apiFetch<{ data: API.ContactConversation[] }>(
                        getContactConversationsById.api(
                            record.contacts._id,
                            'whatsapp&channel_types=web&channel_types=instagram&channel_types=facebook&channel_types=line',
                        ),
                        getContactConversationsById.method,
                    );

                    if (data.data && data.data.length > 0) {
                        // Get the first (most recent) conversation
                        const firstConversation = data.data[0];
                        if (firstConversation) {
                            if (firstConversation?.available_team_conversations[0]._id) {
                                // Dispatch to load conversation details
                                await dispatch(
                                    fetchTeamConversationByIdThunk(firstConversation.available_team_conversations[0]._id),
                                ).unwrap();
                                console.log('Conversation loaded successfully');
                            }
                        }
                    } else {
                        console.log('No conversations found for this contact - will create when user sends first message');
                        // Don't create conversation here - let user start the conversation
                    }
                } catch (error) {
                    console.error('Failed to load conversations:', error);
                } finally {
                    setIsLoadingConversation(false);
                }
            }
        };

        loadConversation();
    }, [showConversationView, record?.contacts?._id, dispatch, hasLoadedConversation]);

    // Reset loading state when switching back to contact overview or changing contact
    useEffect(() => {
        if (!showConversationView) {
            setIsLoadingConversation(false);
            setHasLoadedConversation(false);
        }
    }, [showConversationView]);

    // Reset conversation state when contact changes
    useEffect(() => {
        setHasLoadedConversation(false);
        setIsLoadingConversation(false);
    }, [record?.contacts?._id]);

    const renderContactOverviewSettingBar = () => {
        return (
            <div
                style={{
                    width: '100%',
                    height: '58px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 16px',
                    borderBottom: '1px solid #E0E0E0',
                }}
            >
                <Space size={12} align="center">
                    {/* Share Button */}
                    <Dropdown
                        variant="text"
                        icon={<ShareIcon />}
                        hideArrow
                        onSelect={(e, selectedIndex) => {
                            handleShareSelect(selectedIndex);
                        }}
                        selectedIndex={shareSelected}
                        options={[
                            {
                                text: shareSelected === 'copy_share_link' && shareToggle ? t('copied') : 'Copy Share Link',
                                index: 'copy_share_link',
                            },
                            {
                                text: shareSelected === 'copy_record_id' && shareToggle ? t('copied') : 'Copy Record ID',
                                index: 'copy_record_id',
                            },
                            {
                                type: 'divider',
                            },
                            {
                                text: 'Delete',
                                index: 'delete',
                                textColor: 'var(--color-danger-1)',
                            },
                        ]}
                    />

                    {/* Settings Button */}
                    <IconButton
                        variant="text"
                        onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                        sx={{
                            color: showSettingsPanel ? 'var(--color-primary-1)' : 'var(--color-light-5)',
                        }}
                    >
                        <Icon name="settings" />
                    </IconButton>
                </Space>

                {/* Settings Panel */}
                {showSettingsPanel && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            right: 0,
                            width: '350px',
                            height: '100vh',
                            backgroundColor: 'white',
                            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)',
                            zIndex: 1000,
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '24px',
                            }}
                        >
                            <Space size={8} align="center">
                                <Icon name="settings" />
                                <Typography variant="BodyBold" style={{ fontSize: '16px' }}>
                                    Settings
                                </Typography>
                            </Space>
                            <IconButton variant="text" size="s" onClick={() => setShowSettingsPanel(false)}>
                                <Icon name="close" />
                            </IconButton>
                        </div>

                        <Space size={16} direction="vertical" align="start">
                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Checkbox
                                    checked={panelSettings.suggestedMessage}
                                    onChange={(checked) => handlePanelSettingChange('suggestedMessage', checked)}
                                />
                                <Typography variant="Body">Suggested Message</Typography>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Checkbox
                                    checked={panelSettings.nextBestAction}
                                    onChange={(checked) => handlePanelSettingChange('nextBestAction', checked)}
                                />
                                <Typography variant="Body">Next Best Action</Typography>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Checkbox
                                    checked={panelSettings.detectedKeywords}
                                    onChange={(checked) => handlePanelSettingChange('detectedKeywords', checked)}
                                />
                                <Typography variant="Body">Detected Keywords</Typography>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Checkbox
                                    checked={panelSettings.companies}
                                    onChange={(checked) => handlePanelSettingChange('companies', checked)}
                                />
                                <Typography variant="Body">Companies</Typography>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Checkbox
                                    checked={panelSettings.opportunities}
                                    onChange={(checked) => handlePanelSettingChange('opportunities', checked)}
                                />
                                <Typography variant="Body">Opportunities</Typography>
                            </label>

                            <label
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    width: '100%',
                                }}
                            >
                                <Checkbox
                                    checked={panelSettings.tasks}
                                    onChange={(checked) => handlePanelSettingChange('tasks', checked)}
                                />
                                <Typography variant="Body">Tasks</Typography>
                            </label>
                        </Space>
                    </div>
                )}

                {/* Backdrop to close panel when clicking outside */}
                {showSettingsPanel && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            zIndex: 999,
                        }}
                        onClick={() => setShowSettingsPanel(false)}
                    />
                )}
            </div>
        );
    };

    return (
        <Spin isSpinning={isFetching || (!isFetchedAfterMount && isFetchingRecord)}>
            <div
                ref={containerRef}
                className={`${styles.container} ${boardType === 'Contacts' ? styles.isContacts : ''}`}
            >
                <div className={styles.recordDetail}>{renderDetail()}</div>
                {boardType === 'Contacts' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', flex: 1, minWidth: 0 }}>
                        {renderContactOverviewSettingBar()}
                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                            <div style={{ 
                                flex: 1,
                                height: '100%', 
                                overflow: showConversationView ? 'hidden' : 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0
                            }}>
                                {record?.contacts?._id &&
                                    (showConversationView ? (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                            {/* MessageList component */}
                                            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
                                                {isLoadingConversation ? (
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            height: '100%',
                                                        }}
                                                    >
                                                        <div style={{ textAlign: 'center' }}>
                                                            <Spin />
                                                            <Typography variant="Body" style={{ marginTop: '16px' }}>
                                                                Loading conversation...
                                                            </Typography>
                                                        </div>
                                                    </div>
                                                ) : teamConversation ? (
                                                    <>   {/* Back button and header */}
                                                        <div style={{
                                                            padding: '16px',
                                                            borderBottom: '1px solid #E0E0E0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            backgroundColor: '#FFFFFF'
                                                        }}>
                                                            <IconButton
                                                                variant="text"
                                                                size="s"
                                                                onClick={() => setShowConversationView(false)}
                                                            >
                                                                <Icon name="chevronLeft" />
                                                            </IconButton>
                                                            <Typography variant="SubHeading1">
                                                                Contact Overview
                                                            </Typography>
                                                        </div>
                                                        <MessageList
                                                            drawersOpen={currentDrawer !== 'closed'}
                                                            currentDrawer={currentDrawer}
                                                            setCurrentDrawer={setCurrentDrawer}
                                                            insertedMessage={insertedMessage}
                                                            isInOverview={true}
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                     {/* Back button and header */}
                                                        <div style={{
                                                            padding: '16px',
                                                            borderBottom: '1px solid #E0E0E0',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            backgroundColor: '#FFFFFF'
                                                        }}>
                                                            <IconButton
                                                                variant="text"
                                                                size="s"
                                                                onClick={() => setShowConversationView(false)}
                                                            >
                                                                <Icon name="chevronLeft" />
                                                            </IconButton>
                                                            <Typography variant="SubHeading1">
                                                                Contact Overview
                                                            </Typography>
                                                        </div>
                                                        <div style={{ textAlign: 'center' }}>
                                                            <Spin />
                                                            <Typography variant="Body" style={{ marginTop: '16px' }}>
                                                                This contact has no conversation
                                                            </Typography>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <ContactOverView
                                            inModal={inModal}
                                            userId={record?.contacts?._id}
                                            stages={stages}
                                            origin={origin}
                                            defaultView={defaultView}
                                        />
                                    ))}
                            </div>
                            <div className={styles.relationBoards}>
                                {boardType && record && (
                                    <RelationBoards
                                        ref={relationBoardsRef}
                                        boardType={boardType}
                                        showExpand={boardType === 'Contacts'}
                                        readOnly={readOnly}
                                        currentRecord={record}
                                        currentBoard={board}
                                        disable={disableRelation}
                                        onMessageInsert={handleMessageInsert}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                )}
                {boardType !== 'Contacts' && (
                    <div className={styles.relationBoards}>
                        {boardType && record && (
                            <RelationBoards
                                ref={relationBoardsRef}
                                boardType={boardType}
                                showExpand={boardType === 'Contacts'}
                                readOnly={readOnly}
                                currentRecord={record}
                                currentBoard={board}
                                disable={disableRelation}
                                onMessageInsert={handleMessageInsert}
                            />
                        )}
                    </div>
                )}
            </div>
        </Spin>
    );
};

export default Overview;
