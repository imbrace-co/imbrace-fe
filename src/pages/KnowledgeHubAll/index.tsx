import { Button, DropdownMenuItem, FieldText, Icon, Search } from '@imbrace/ui';
import { Autocomplete, Tab, Tabs } from '@mui/material';
import type { MutableRefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import PageLayout from '@/components/PageLayout';
import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { useDialog } from '@imbrace/ui';
import Databoards from '@/pages/Databoards';
import { BoardSetting } from '@/pages/Databoards/components/BoardSetting';
import KnowledgeHub, { type KnowledgeHubDriveRef } from '@/pages/KnowledgeHub';
import DataboardEnhance from '@/pages/DataboardEnhance';
import { useBoards } from '@/services/queries/board';

import styles from './index.module.scss';

type KnowledgeHubAllTab = 'drive' | 'board';

const KnowledgeHubAll = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const navigateRef: MutableRefObject<ReturnType<typeof useNavigate>> = useRef(navigate);
    const { tab } = useParams<{ tab?: string }>();
    const [{ dialog }, dialogHolder] = useDialog();

    const isDriveDetailRoute = location.pathname.startsWith('/knowledge-hub-all/drive');
    const preferTab = (location.state as any)?.preferTab as KnowledgeHubAllTab | undefined;
    const [activeTab, setActiveTab] = useState<KnowledgeHubAllTab>(
        isDriveDetailRoute ? 'drive' : tab ? 'board' : preferTab === 'board' ? 'board' : 'drive',
    );
    const [driveSearch, setDriveSearch] = useState<string>('');

    const driveRef = useRef<KnowledgeHubDriveRef>(null);
    const tableRef = useRef<FlexibleTableRef<API.BoardItem>>(null);
    const { data: knowledgeBoards = [], isLoading: isLoadingBoards } = useBoards({ isDefault: undefined, types: 'KnowledgeHub' });

    useEffect(() => {
        navigateRef.current = navigate;
    }, [navigate]);

    useEffect(() => {
        if (isDriveDetailRoute) {
            setActiveTab('drive');
            return;
        }
        if (tab) setActiveTab('board');
        else if (preferTab === 'board') setActiveTab('board');
        else setActiveTab('drive');
    }, [tab, isDriveDetailRoute, preferTab]);

    const tabsValue = useMemo(() => (activeTab === 'drive' ? 0 : 1), [activeTab]);

    const openCreateBoard = () => {
        dialog({
            title: t('board_create_new_header'),
            paperSx: {
                width: '90vw',
                maxWidth: '1200px',
            },
            content: ({ onClose }) => {
                return (
                    <BoardSetting
                        board={undefined}
                        onClose={onClose}
                        navigateRef={navigateRef}
                        setCurrentTab={(nextTab) => {
                            navigate(`/knowledge-hub-all/${nextTab}`, { replace: true });
                        }}
                        tableRef={tableRef}
                        knowledgeHub
                    />
                );
            },
            confirmText: t('save'),
            hideCancelButton: true,
            hideConfirmButton: true,
            showCloseButton: false,
            actionsAlign: 'flex-start',
        });
    };

    return (
        <PageLayout
            bannerTitle={t('menu_knowledgeHub')}
            extra={
                <div className={styles.headerRow}>
                    <div className={styles.tabs}>
                        <Tabs
                            value={tabsValue}
                            onChange={(_, nextValue) => {
                                const nextTab: KnowledgeHubAllTab = nextValue === 0 ? 'drive' : 'board';
                                setActiveTab(nextTab);
                                if (nextTab === 'drive') {
                                    navigate('/knowledge-hub-all', { replace: true });
                                } else if (!tab) {
                                    // allow Databoards to auto-redirect to the first board
                                    navigate('/knowledge-hub-all', { replace: true });
                                }
                            }}
                            sx={{
                                minHeight: 40,
                                borderBottom: '1px solid #E0E0E0',
                                '& .MuiTabs-indicator': {
                                    backgroundColor: 'var(--color-primary-1)',
                                    height: '3px',
                                },
                            }}
                        >
                            <Tab
                                label={t('knowledge_drive')} 
                                sx={{
                                    textTransform: 'none',
                                    minHeight: 40,
                                    fontWeight: 600,
                                    '&.Mui-selected': {
                                        color: 'var(--color-primary-1)',
                                    },
                                    fontSize: '16px',
                                }}
                            />
                            <Tab
                                label={t('knowledge_board')}
                                sx={{
                                    textTransform: 'none',
                                    minHeight: 40,
                                    fontWeight: 600,
                                    '&.Mui-selected': {
                                        color: 'var(--color-primary-1)',
                                    },
                                    fontSize: '16px',
                                }}
                            />
                        </Tabs>
                    </div>

                    <div className={styles.actions}>
                        {activeTab === 'drive' ? (
                            <>
                                {isDriveDetailRoute ? null : (
                                    <>
                                <div className={styles.driveSearch}>
                                    <Search
                                        value={driveSearch}
                                        placeholder={t('knowledge_search_folder')}
                                        onSearch={(val) => {
                                            const next = (val || '').toLowerCase();
                                            setDriveSearch(next);
                                            driveRef.current?.setSearch(next);
                                        }}
                                        onReset={() => {
                                            setDriveSearch('');
                                            driveRef.current?.setSearch('');
                                        }}
                                        sx={{ width: '100%' }}
                                    />
                                </div>
                                <Button
                                    className={styles.plusButton}
                                    size="default"
                                    startIcon={<Icon name="add" />}
                                    variant="contained"
                                    onClick={() => driveRef.current?.openAddFolder()}
                                    sx={{ minWidth: 40, width: 40, height: 40, padding: 0, borderRadius: '8px' }}
                                />
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Autocomplete<API.Board, false, true, false>
                                    openOnFocus
                                    disableClearable
                                    loading={isLoadingBoards}
                                    options={knowledgeBoards}
                                    value={knowledgeBoards.find((b) => b._id === tab) ?? undefined}
                                    getOptionLabel={(option) => option?.name ?? ''}
                                    isOptionEqualToValue={(option, value) => option._id === value._id}
                                    onChange={(_, value) => {
                                        if (!value?._id) return;
                                        navigate(`/knowledge-hub-all/${value._id}`, { replace: true });
                                        setActiveTab('board');
                                    }}
                                    sx={{
                                        width: 492,
                                        '& .MuiInputBase-input': {
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        },
                                        // Make sure long board names don't overlap the popup (dropdown) icon.
                                        '& .MuiInputBase-root': {
                                            paddingRight: '44px !important',
                                        },
                                        '& .MuiAutocomplete-popupIndicator': {
                                            right: '9px',
                                            '& :focus, :hover': {
                                                background: 'transparent',
                                            },
                                        },
                                    }}
                                    slotProps={{
                                        popupIndicator: {
                                            disableRipple: true,
                                        },
                                        paper: {
                                            sx: {
                                                boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                                                '.MuiAutocomplete-noOptions': {
                                                    fontSize: '14px',
                                                    fontWeight: 400,
                                                    lineHeight: '20px',
                                                    color: 'var(--color-light-5)',
                                                },
                                            },
                                        },
                                    }}
                                    renderInput={(params) => {
                                        return (
                                            <FieldText
                                                placeholder={t('find_a_board', { defaultValue: 'Find a board' })}
                                                {...params}
                                            />
                                        );
                                    }}
                                    renderOption={(optionProps, option) => {
                                        return (
                                            <DropdownMenuItem
                                                {...optionProps}
                                                sx={{
                                                    padding: '8px 12px',
                                                    '&:hover': {
                                                        backgroundColor: 'var(--color-grey-3)',
                                                    },
                                                }}
                                            >
                                                {option.name}
                                            </DropdownMenuItem>
                                        );
                                    }}
                                />
                                <Button
                                    className={styles.plusButton}
                                    size="default"
                                    startIcon={<Icon name="add" />}
                                    variant="contained"
                                    onClick={openCreateBoard}
                                    sx={{ minWidth: 40, width: 40, height: 40, padding: 0, borderRadius: '8px' }}
                                />
                            </>
                        )}
                    </div>
                </div>
            }
        >
            {dialogHolder}
            {activeTab === 'drive' ? (
                <div className={styles.driveContent}>
                    {isDriveDetailRoute ? <DataboardEnhance knowledgeHub /> : <KnowledgeHub ref={driveRef} />}
                </div>
            ) : (
                <Databoards knowledgeHub />
            )}
        </PageLayout>
    );
};

export default KnowledgeHubAll;


