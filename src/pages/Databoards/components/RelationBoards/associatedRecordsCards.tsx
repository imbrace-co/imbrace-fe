import { Button, Dropdown, Icon, Illustration, Space, Spin, Typography, useModal } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useIntersectionObserver } from '@uidotdev/usehooks';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import SimpleBar from 'simplebar-react';

import { useRelatedRecordsInfinite } from '@/services/queries/board';

import Overview from '../../overview';
import { SingularBoardName } from '../../utils';
import { handleCreateRecord } from '.';
import { BoardCard } from './boardCard';
import ExistingRecords from './existingRecords';

const AssociatedRecordsCards = ({
    board,
    currentRecord,
    currentBoard,
}: {
    board: API.Board;
    currentRecord: API.BoardItem;
    currentBoard: API.Board;
}) => {
    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const [{ modal }, modalsHolder] = useModal();
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

    const createRecord = useMutation({
        mutationFn: handleCreateRecord,
        onSuccess: (record, { boardId }) => {
            if (record) {
                refetch();
                modal({
                    title: (
                        <Space size={12} onClick={(event) => event.stopPropagation()}>
                            <Typography style={{ fontWeight: 700, color: 'var(--color-light-5)' }}>{`New ${
                                SingularBoardName[board.type]
                            } Record`}</Typography>

                            <Button
                                variant="link"
                                text={t('open_in_fullscreen')}
                                size="xs"
                                endIcon={<Icon name="openInFull" />}
                                onClick={() => {
                                    navigate(`/crm/${boardId}/${record._id}`);
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
                    content: () => {
                        return <Overview boardId={boardId} recordId={record._id} inModal disableRelation />;
                    },
                });
            }
        },
    });

    useEffect(() => {
        if (entry?.isIntersecting && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [entry?.isIntersecting, fetchNextPage, isFetchingNextPage]);

    if (!board) {
        return null;
    }

    return (
        <div style={{ overflow: 'hidden', flex: 1, position: 'relative' }}>
            {modalsHolder}
            <SimpleBar
                style={{ height: '100%', paddingTop: '16px' }}
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
                                    open={() => {
                                        modal({
                                            title: (
                                                <Space size={12} onClick={(event) => event.stopPropagation()}>
                                                    <Typography
                                                        style={{ fontWeight: 700, color: 'var(--color-light-5)' }}
                                                    >{`${board.type} Record`}</Typography>

                                                    <Button
                                                        variant="link"
                                                        text={t('open_in_fullscreen')}
                                                        size="xs"
                                                        endIcon={<Icon name="openInFull" />}
                                                        onClick={() => {
                                                            navigate(`/crm/${board.id}/${record._id}`);
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
                                            content: () => {
                                                return <Overview boardId={board.id} recordId={record._id} inModal disableRelation />;
                                            },
                                        });
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
            <Dropdown
                options={[
                    {
                        index: 'existing',
                        icon: <Icon name="linkedRecord" />,
                        text: t('link_existing_record'),
                        sx: {
                            padding: '8px 24px',
                        },
                    },
                    {
                        index: 'new',
                        icon: <Icon name="newRecord" />,
                        text: t('create_new_record'),
                        sx: {
                            padding: '8px 24px',
                        },
                        loading: createRecord.isPending,
                    },
                ]}
                buttonSx={{
                    position: 'absolute',
                    right: '16px',
                    bottom: '16px',
                    borderRadius: '4px',
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    padding: 0,
                }}
                icon={(open) => (
                    <Icon
                        name="add"
                        style={{
                            transform: open ? 'rotate(45deg)' : 'rotate(0)',
                            transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                    />
                )}
                hideOnSelect
                hideArrow
                variant="contained"
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
                anchorOrigin={{
                    vertical: -8,
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
            />
        </div>
    );
};

export default AssociatedRecordsCards;
