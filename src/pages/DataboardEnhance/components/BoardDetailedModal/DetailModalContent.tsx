import type { Attachment, Option } from '@imbrace/ui';
import { Dropdown, Icon, IconButton, useDialog } from '@imbrace/ui';
import { Box } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Scrollbars from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import CompanyModalHeader from '@/pages/Databoards/components/BoardDetailedModal/CompanyModalHeader';
import ContactProfileHeader from '@/pages/Databoards/components/BoardDetailedModal/ContactProfileHeader';
import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import { openDetailModal } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import DetailModalFields, { SHARE_DOMAIN } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalFields';
import GeneralModalHeader from '@/pages/Databoards/components/BoardDetailedModal/GeneralModalHeader';
import ModalHeader from '@/pages/Databoards/components/BoardDetailedModal/ModalHeader';
import OpportunityTabs from '@/pages/Databoards/components/BoardDetailedModal/OpportunityTabs';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import { TabsContainer } from '@/pages/Members/components/BasicInformation/StyledComponents';
import Files from '@/pages/Members/components/MemberDetailV2/files';
import { getBoards, getLinkedBoardItems } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import Conversations from '../Conversations';
import type { ProfileTabType } from './ContactProfileTabs';
import ProfileTabs from './ContactProfileTabs';
import LinkedTabContent from './LinkedTabContent';
import OpportunitiesList from './OpportunitiesList';

interface Props {
    onSelectFile: (files?: Attachment[] | undefined) => void;
    selectedProfileAvatar?: Attachment[];
    selectedCompanyLogo?: Attachment[];
    isEditMode: boolean;
    boardRecord?: API.BoardItem;
    boardType?: API.BoardType;
    loading: boolean;
    selectedRowInfo: CurrentBoardInfo | undefined;

    fields: Field[];
    currentBoard?: API.Board;
    onClose?: () => void;
    onNewField: () => void;
    crm?: boolean;
    afterUpdated: (record: API.BoardItem) => Promise<void>;
}
export const queryClient = new QueryClient();

export interface LinkedTabContentRef {
    fetchTabData: () => Promise<void>;
}

const DetailModalContent = (props: Props) => {
    const {
        loading,
        onSelectFile,
        selectedCompanyLogo,
        selectedProfileAvatar,
        isEditMode,
        boardRecord,
        boardType,
        selectedRowInfo,
        fields,
        currentBoard,
        onClose,
        onNewField,
        crm,
        afterUpdated,
    } = props;

    const { t } = useTranslation();
    const [currentTab, setCurrentTab] = useState<ProfileTabType>('basics');
    const [linkedBoards, setLinkedBoards] = useState<Record<string, API.Board>>();
    const [isTabLoading, setIsTabLoading] = useState(false);
    const selectedRef = useRef<Option | null>(null);
    const linkedTabContentRef = useRef<LinkedTabContentRef>(null);
    const [{ dialog }, dialogHolder] = useDialog();
    const onFetchLinkedBoards = useCallback(async (boardsArray: string[]) => {
        try {
            setIsTabLoading(true);
            const boardsParams = {
                limit: 0,
                skip: 0,
                sort: '-created_at',
            };
            const { data } = await apiFetch<{
                data: API.Board[];
            }>(getBoards.api(boardsParams), getBoards.method, {}, ImbraceClient, {});
            const result = data.data.filter((item) => boardsArray.includes(item.type));

            const boardData = result.reduce((acc, cur) => {
                acc[cur.type] = cur;
                return acc;
            }, {} as Record<string, API.Board>);

            setLinkedBoards(boardData);
            setIsTabLoading(false);
        } catch (error) {
            console.error('error: ', error);
            setIsTabLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedRowInfo?.boardType === 'Contacts') {
            onFetchLinkedBoards(['Opportunities', 'Tasks']);
        }
        if (selectedRowInfo?.boardType === 'Opportunities') {
            onFetchLinkedBoards(['Tasks']);
        }
    }, [selectedRowInfo, onFetchLinkedBoards]);

    const identifierField = useMemo(() => {
        return fields.filter((field) => field.is_identifier)?.[0];
    }, [fields]);

    const renderModalHeader = () => {
        switch (boardType) {
            case 'Companies':
                return (
                    <CompanyModalHeader
                        onSelectFile={onSelectFile}
                        selectedLogoFile={selectedCompanyLogo}
                        boardType={boardType}
                        selectedRowInfo={selectedRowInfo}
                        isEditMode={isEditMode}
                        fields={fields}
                        conversationIds={boardRecord?.conversation_ids}
                        onClose={onClose}
                    />
                );
            case 'Contacts':
                return (
                    <>
                        <ContactProfileHeader
                            onSelectFile={onSelectFile}
                            selectedAvatarFile={selectedProfileAvatar}
                            isEditMode={isEditMode}
                            loading={loading && !boardRecord}
                            selectedRowInfo={selectedRowInfo}
                            createdType={boardRecord ? boardRecord.created_type : 'manual'}
                            fields={fields}
                            channelType={boardRecord?.contacts?.channel_type}
                        />
                        <TabsContainer>
                            <ProfileTabs
                                currentTab={currentTab}
                                setCurrentTab={setCurrentTab}
                                linkedBoards={linkedBoards}
                                isTabLoading={isTabLoading}
                            />
                        </TabsContainer>
                    </>
                );

            case 'Opportunities':
                return (
                    <>
                        <ModalHeader
                            crm={crm}
                            boardType={boardType}
                            isEditMode={isEditMode}
                            updatedAt={boardRecord?.updated_at}
                            selectedRowInfo={selectedRowInfo}
                            conversationIds={boardRecord?.conversation_ids}
                            onClose={onClose}
                            identifierField={identifierField}
                        />
                        <TabsContainer>
                            <OpportunityTabs
                                currentTab={currentTab}
                                setCurrentTab={setCurrentTab}
                                linkedBoards={linkedBoards}
                                isTabLoading={isTabLoading}
                            />
                        </TabsContainer>
                    </>
                );
            case 'General':
                return (
                    <GeneralModalHeader
                        crm={crm}
                        currentBoard={currentBoard}
                        selectedRowInfo={selectedRowInfo}
                        isEditMode={isEditMode}
                        conversationIds={boardRecord?.conversation_ids}
                        onClose={onClose}
                    />
                );
            default:
                return (
                    <ModalHeader
                        crm={crm}
                        boardType={boardType}
                        isEditMode={isEditMode}
                        updatedAt={boardRecord?.updated_at}
                        selectedRowInfo={selectedRowInfo}
                        conversationIds={boardRecord?.conversation_ids}
                        onClose={onClose}
                        identifierField={identifierField}
                    />
                );
        }
    };

    const fetchOpportunitiesData = useMemo(
        () => async (): Promise<Option[]> => {
            if (!selectedRowInfo || !linkedBoards) return [];
            try {
                const { data } = await apiFetch<{
                    data: Record<string, string | [] | null | API.AssigneeValue>[];
                }>(
                    getLinkedBoardItems.api(selectedRowInfo.boardId, selectedRowInfo.boardItemId, 'Opportunities'),
                    getLinkedBoardItems.method,
                );

                const displayDefaultFields = linkedBoards.Opportunities.fields.filter((field) => field.is_default || field.is_identifier);

                const groupedFields = displayDefaultFields?.reduce((acc: Record<string, API.BoardField>, field) => {
                    const { default_field_name } = field;
                    if (!default_field_name) return acc;

                    acc[default_field_name] = field;
                    return acc;
                }, {});

                const nameKey = groupedFields?.name?._id;
                const ownerKey = groupedFields?.owner?._id;

                return data.data.map((item) => {
                    return {
                        value: `${item.board_id}/${item.board_item_id}`,
                        text: item[nameKey] as string,
                        description: item[ownerKey] ? (item[ownerKey] as API.AssigneeValue).display_name : '',
                        icon: <Icon name="record" fontSize={24} style={{ color: 'var(--color-light-5)' }} />,
                    };
                });
            } catch (error) {
                console.error('error::', error);
                return [];
            }
        },
        [selectedRowInfo, linkedBoards],
    );

    const openModal = async (type: API.BoardType, refresh?: () => Promise<void>, linkTaskToOpportunity?: boolean) => {
        const domain = SHARE_DOMAIN;
        const selectedRecordLink = `${domain}/${crm ? 'crm' : 'databoards'}/${selectedRowInfo?.boardId}/${selectedRowInfo?.boardItemId}`;

        // create Task Record linking to Opportunities
        if (linkTaskToOpportunity) {
            const opportunitiesOptions = await fetchOpportunitiesData();

            dialog({
                title: t('board_select_opportunity'),
                content: <OpportunitiesList opportunitiesOptions={opportunitiesOptions} selectedRef={selectedRef} />,
                onConfirm: async () => {
                    const opportunityLink = selectedRef.current
                        ? `${domain}/${crm ? 'crm' : 'databoards'}/${selectedRef.current.value}`
                        : '';

                    openDetailModal({
                        crm,
                        titleValue: '',
                        currentBoardInfo: {
                            boardId: linkedBoards?.[type]?._id as string,
                            boardItemId: 'new',
                            boardType: type,
                        },
                        currentBoard: linkedBoards?.[type],
                        tableRef: {} as RefObject<FlexibleTableRef<API.BoardItem>>,
                        onClose: () => {},

                        closeAfterSave: true,
                        contactRecordLink: selectedRecordLink,
                        opportunityRecordLink: opportunityLink,

                        refreshLinkedContent: refresh,
                    });
                },
                onClose: () => {},
                confirmText: t('next'),
                confirmButtonProps: {
                    sx: {
                        height: '40px',
                        width: '160px',
                    },
                },
                hideCancelButton: true,
                showCloseButton: true,
                actionsAlign: 'flex-start',
            });

            return;
        }
        openDetailModal({
            crm,
            titleValue: '',
            currentBoardInfo: {
                boardId: linkedBoards?.[type]?._id as string,
                boardItemId: 'new',
                boardType: type,
            },
            currentBoard: linkedBoards?.[type],
            tableRef: {} as RefObject<FlexibleTableRef<API.BoardItem>>,
            onClose: () => {},

            closeAfterSave: true,
            // prefill record link field depends on the board type
            ...(selectedRowInfo?.boardType === 'Contacts' ? { contactRecordLink: selectedRecordLink } : {}),
            ...(selectedRowInfo?.boardType === 'Opportunities' ? { opportunityRecordLink: selectedRecordLink } : {}),
            refreshLinkedContent: refresh,
            slots: { backdrop: () => null },
        });
    };

    const renderCreateTaskButton = (modalBoardType: API.BoardType) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: '36px',
                    right: '36px',
                    zIndex: 1000,
                }}
            >
                <Dropdown
                    disabled={selectedRowInfo?.boardItemId === 'new'}
                    arrowDownIcon={<Icon name="add" fontSize={24} />}
                    arrowUpIcon={<Icon name="close" fontSize={24} />}
                    variant="contained"
                    buttonSx={{
                        minWidth: '40px',
                        width: '40px',
                        height: '40px',
                        padding: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: '4px',
                        backgroundColor: 'var(--color-primary-1)',
                        '& .textContainer': {
                            width: 0,
                            display: 'none',
                        },

                        '& svg': {
                            verticalAlign: 'middle',
                        },
                        '&:hover': {
                            backgroundColor: 'var(--color-primary-4)',
                        },
                        '&:disabled': {
                            backgroundColor: 'var(--color-primary-5)',
                            color: 'var(--color-light-1)',
                        },
                    }}
                    options={[
                        {
                            text: t('board_task_link_with_opportunity'),
                            icon: <Icon name="linkedRecord" />,
                            index: 'link-opportunity',
                        },
                        {
                            text: t('board_task_link_with_contact'),
                            icon: <Icon name="newRecord" />,
                            index: 'link-contact',
                        },
                    ]}
                    hideOnSelect
                    onSelect={(event, selectedIndex) => {
                        if (selectedIndex === 'link-opportunity') {
                            if (!linkedTabContentRef.current) return;
                            openModal(modalBoardType, linkedTabContentRef?.current.fetchTabData, true);
                        }
                        if (selectedIndex === 'link-contact') {
                            if (!linkedTabContentRef.current) return;
                            openModal(modalBoardType, linkedTabContentRef?.current.fetchTabData);
                        }
                    }}
                    anchorOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                    }}
                    transformOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                    }}
                    menuPaperProps={{
                        sx: {
                            marginTop: '-4px !important',
                        },
                    }}
                />
            </div>
        );
    };

    const renderCreateButton = (modalBoardType: API.BoardType) => {
        return (
            <div
                style={{
                    position: 'absolute',
                    bottom: '36px',
                    right: '36px',
                    zIndex: 1000,
                }}
            >
                <IconButton
                    fontSize={16}
                    type="primary"
                    onClick={async () => {
                        if (!linkedTabContentRef.current) return;
                        openModal(modalBoardType, linkedTabContentRef?.current.fetchTabData);
                    }}
                    sx={{ borderRadius: '4px' }}
                    disabled={selectedRowInfo?.boardItemId === 'new'}
                >
                    <Icon name="add" fontSize={24} />
                </IconButton>
            </div>
        );
    };

    return (
        <QueryClientProvider client={queryClient}>
            {dialogHolder}
            {renderModalHeader()}
            <Box
                sx={{
                    height: '100%',
                    position: 'relative',
                }}
            >
                <Scrollbars autoHide>
                    {currentTab === 'basics' && (
                        <DetailModalFields
                            loading={loading && !boardRecord}
                            isEditMode={isEditMode}
                            boardRecord={boardRecord}
                            columns="two"
                            selectedRowInfo={selectedRowInfo}
                            fields={fields}
                            onNewField={onNewField}
                            afterUpdated={afterUpdated}
                        />
                    )}
                    {currentTab === 'conversations' && <Conversations userId={boardRecord?.contacts?._id} onClose={onClose} isModal />}
                    {currentTab === 'files' && <Files userId={boardRecord?.contacts?._id} />}
                    {currentTab === 'opportunities' && (
                        <LinkedTabContent
                            ref={linkedTabContentRef}
                            key="opportunities"
                            boardType="Opportunities"
                            selectedRowInfo={selectedRowInfo}
                            linkedBoards={linkedBoards}
                        />
                    )}
                    {currentTab === 'tasks' && (
                        <LinkedTabContent
                            ref={linkedTabContentRef}
                            key="tasks"
                            boardType="Tasks"
                            selectedRowInfo={selectedRowInfo}
                            linkedBoards={linkedBoards}
                        />
                    )}
                </Scrollbars>
                {isEditMode && (
                    <>
                        {selectedRowInfo?.boardType === 'Contacts' && currentTab === 'opportunities' && renderCreateButton('Opportunities')}
                        {selectedRowInfo?.boardType === 'Contacts' && currentTab === 'tasks' && renderCreateTaskButton('Tasks')}
                        {selectedRowInfo?.boardType === 'Opportunities' && currentTab === 'tasks' && renderCreateButton('Tasks')}
                    </>
                )}
            </Box>
        </QueryClientProvider>
    );
};

export default DetailModalContent;
