import { Button, Icon, IconButton, Illustration, Space, Spin, Tabs, Typography, useDialog, useModal } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import Drawer from '@/components/DrawerV2';
import { env } from '@/env';
import Files from '@/pages/Members/components/MemberDetailV2/files';
import { useBoardById, useBoards, useContactRecord, useRelatedRecordsInfinite } from '@/services/queries/board';

import Overview from '../../overview';
import Conversations from '../Conversations';
import AssociatedRecordsCards from '../RelationBoards/associatedRecordsCards';
import { DetailFields, DetailHeader, OperationDropdown } from '.';
import useRecordDetail from './hooks';
import styles from './index.module.scss';
import PinnedAndNotes from './PinnedAndNotes';
import Activities from './Activities';

const ContactDetailDrawer = ({
    open,
    onClose,
    contact,
    openDetail,
}: {
    open: boolean;
    onClose: () => void;
    contact?: API.Contact;
    openDetail: () => void;
}) => {
    const [currentTab, setCurrentTab] = useState('overview');
    const [{ dialog }, dialogsHolder] = useDialog();
    const [{ modal }, modalHolder] = useModal();
    const navigate = useNavigate();

    const { t } = useTranslation();

    const {
        data: record,
        refetch,
        isFetching: isFetchingRecord,
        isFetchedAfterMount,
    } = useContactRecord(contact?.id, {
        select: (data) => {
            return { ...data, contacts: contact };
        },
    });

    useEffect(() => {
        setCurrentTab('overview');
    }, [contact?.id]);

    const { data: board, isFetching } = useBoardById(record?.board_id);
    const { data: boards } = useBoards({ isDefault: true });

    const { onSelectFile, onDataUpdate } = useRecordDetail({
        board,
        record,
        refresh: async () => {
            await refetch();
        },
        dialog,
    });

    const companyBoard = useMemo(() => {
        return boards?.find((b) => b.type === 'Companies');
    }, [boards]);

    const opportunitiesBoard = useMemo(() => {
        return boards?.find((b) => b.type === 'Opportunities');
    }, [boards]);

    const tasksBoard = useMemo(() => {
        return boards?.find((b) => b.type === 'Tasks');
    }, [boards]);

    const { data: companiesRelations } = useRelatedRecordsInfinite({
        boardId: record?.board_id || '',
        recordId: record?._id || '',
        relatedBoardId: companyBoard?._id,
        params: { skip: 0, limit: 5, link: true },
    });
    const { data: opportunitiesRelations } = useRelatedRecordsInfinite({
        boardId: record?.board_id || '',
        recordId: record?._id || '',
        relatedBoardId: opportunitiesBoard?._id,
        params: { skip: 0, limit: 5, link: true },
    });
    const { data: tasksRelations } = useRelatedRecordsInfinite({
        boardId: record?.board_id || '',
        recordId: record?._id || '',
        relatedBoardId: tasksBoard?._id,
        params: { skip: 0, limit: 5, link: true },
    });

    const onBackdropClick = () => {
        onClose();
    };

    const openDetailModal = () => {
        if (record) {
            modal({
                title: (
                    <Space size={12} onClick={(event) => event.stopPropagation()}>
                        <Typography style={{ fontWeight: 700, color: 'var(--color-light-5)' }}>{t('contacts_record')}</Typography>

                        <Button
                            variant="link"
                            text={t('open_in_fullscreen')}
                            size="xs"
                            endIcon={<Icon name="openInFull" />}
                            onClick={() => {
                                navigate(`/crm/${board?.id}/${record._id}`);
                            }}
                            sx={{
                                padding: 0,
                                fontWeight: 400,
                                fontSize: 12,
                                lineHeight: '16px',
                                gap: '4px',
                            }}
                        />
                    </Space>
                ),
                content: () => (
                    <Overview
                        boardId={board?.id}
                        recordId={record?.id}
                        inModal
                        defaultView={
                            currentTab === 'overview' || currentTab === 'conversations' || currentTab === 'files' ? currentTab : undefined
                        }
                        disableRelation
                    />
                ),
                extra: ({ onClose: onModalClose }) => (
                    <>
                        <OperationDropdown
                            id={record._id}
                            link={`${env.VITE_APP_HOST}/crm/${board?._id}/${record._id}`}
                            disabledDelete={record?.created_type !== 'manual'}
                        />
                        <IconButton
                            size="s"
                            type="secondary"
                            variant="text"
                            onClick={() => {
                                onModalClose?.();
                                openDetail();
                            }}
                        >
                            <Icon name="fullScreenExit" fontSize={24} />
                        </IconButton>
                    </>
                ),
            });
        }
    };

    const renderTab = () => {
        if (currentTab === 'overview' && board && record) {
            return <DetailFields board={board} record={record} onDataUpdate={onDataUpdate} />;
        }

        if (currentTab === 'activities' && board && record) {
            return <Activities userId={contact?.id} frameLess />;
        }

        if (currentTab === 'conversations' && contact?.id) {
            return <Conversations userId={contact?.id} onClose={() => {}} frameLess />;
        }

        if (currentTab === 'pinnedAndNotes' && board && record) {
            return <PinnedAndNotes userId={contact?.id} onClose={() => {
                onClose();
            }}  frameLess />;
        }

        if (currentTab === 'files' && contact?.id) {
            return <Files userId={contact?.id} frameLess />;
        }

        if (currentTab === 'companies' && record && board && companyBoard) {
            return <AssociatedRecordsCards board={companyBoard} currentRecord={record} currentBoard={board} />;
        }

        if (currentTab === 'opportunities' && record && board && opportunitiesBoard) {
            return <AssociatedRecordsCards board={opportunitiesBoard} currentRecord={record} currentBoard={board} />;
        }

        if (currentTab === 'tasks' && record && board && tasksBoard) {
            return <AssociatedRecordsCards board={tasksBoard} currentRecord={record} currentBoard={board} />;
        }

        return null;
    };

    return (
        <>
            {modalHolder}
            {dialogsHolder}
            <Drawer
                open={open}
                onClose={(e, reason) => {
                    if (reason === 'backdropClick') {
                        onBackdropClick();
                        return;
                    }
                    onClose();
                }}
                width={'639px'}
            >
                <Spin isSpinning={isFetching || (!isFetchedAfterMount && isFetchingRecord)}>
                    {isFetchedAfterMount && board && record ? (
                        <Space size={0} direction="vertical" className={styles.container} align="stretch">
                            <DetailHeader
                                board={board}
                                record={record}
                                onSelectFile={onSelectFile}
                                onDataUpdate={onDataUpdate}
                                extraOperation={
                                    <>
                                        <IconButton
                                            size="s"
                                            type="secondary"
                                            variant="text"
                                            onClick={() => {
                                                onClose();
                                                openDetailModal();
                                            }}
                                        >
                                            <Icon name="fullScreen" fontSize={24} />
                                        </IconButton>
                                        <Divider
                                            sx={{
                                                margin: '4px 0',
                                            }}
                                            orientation="vertical"
                                            variant="middle"
                                            flexItem
                                        />
                                        <IconButton size="s" type="secondary" variant="text" onClick={() => onClose()}>
                                            <Icon name="close" fontSize={24} />
                                        </IconButton>
                                    </>
                                }
                            />
                            <Tabs
                                tabs={[
                                    {
                                        id: 'overview',
                                        value: 'overview',
                                        label: t('overview'),
                                    },
                                    {
                                        id: 'activities',
                                        value: 'activities',
                                        label: (
                                            <Space size={4}>
                                                {t('activities')}
                                                {/* <Icon
                                                    name="settings"
                                                    onClick={() => {
                                                        console.log('settings');
                                                    }}
                                                    fontSize={16}
                                                    style={{
                                                        color: 'var(--color-light-3)',
                                                    }}
                                                /> */}
                                            </Space>
                                        ),
                                    },
                                    {
                                        id: 'conversations',
                                        value: 'conversations',
                                        label: t('conversations'),
                                    },
                                    {
                                        id: 'pinnedAndNotes',
                                        value: 'pinnedAndNotes',
                                        label: 'Pinned & Notes',
                                    },
                                    {
                                        id: 'files',
                                        value: 'files',
                                        label: t('files'),
                                    },
                                    {
                                        id: 'companies',
                                        value: 'companies',
                                        label: `${t('companies')}${
                                            companiesRelations?.pages[0]?.count ? ` (${companiesRelations?.pages[0]?.count})` : ''
                                        }`,
                                    },
                                    {
                                        id: 'opportunities',
                                        value: 'opportunities',
                                        label: `${t('opportunities')}${
                                            opportunitiesRelations?.pages[0]?.count ? ` (${opportunitiesRelations?.pages[0]?.count})` : ''
                                        }`,
                                    },
                                    {
                                        id: 'tasks',
                                        value: 'tasks',
                                        label: `${t('tasks')}${
                                            tasksRelations?.pages[0]?.count ? ` (${tasksRelations?.pages[0]?.count})` : ''
                                        }`,
                                    },
                                ]}
                                currentTab={currentTab}
                                onChange={(tab, newValue) => {
                                    setCurrentTab(newValue);
                                }}
                                sx={{
                                    padding: '0 16px',
                                }}
                            />
                            <Divider flexItem />
                            {renderTab()}
                        </Space>
                    ) : (
                        <Illustration name="recordMissing2" description={t('no_associated_records_found')} />
                    )}
                </Spin>
            </Drawer>
        </>
    );
};

export default ContactDetailDrawer;
