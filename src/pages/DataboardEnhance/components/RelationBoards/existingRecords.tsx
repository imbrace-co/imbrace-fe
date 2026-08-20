import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Search, Space, Spin, Typography } from '@imbrace/ui';
import { CircularProgress } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDebounce } from '@uidotdev/usehooks';
import clsx from 'clsx';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import SimpleBar from 'simplebar-react';
import { z } from 'zod';

import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';
import { putLinkRecords } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';
import { useRelatedRecordsInfinite } from '@/services/queries/board';

import { SelectableBoardCard } from './boardCard';
import styles from './index.module.scss';

const formSchema = z.object({
    recordIds: z.array(z.string()),
});

type FormType = z.infer<typeof formSchema>;

const boardTypeMap: Record<API.BoardType, string> = {
    Contacts: 'Contact',
    Companies: '',
    Opportunities: 'Opportunity',
    Tasks: 'Task',
    Products: 'Product',
    OptOut: 'OptOut',
    General: 'General',
    System: 'System',
    KnowledgeHub: 'KnowledgeHub',
    DocumentAI: 'DocumentAI',
};

const ExistingRecords = ({
    onClose,
    board,
    currentRecord,
    currentBoard,
    refresh,
}: {
    onClose: () => void;
    board: API.Board;
    currentRecord: API.BoardItem;
    currentBoard: API.Board;
    refresh: () => void;
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const parentRef = useRef<HTMLDivElement>(null);
    const dispatch = useAppDispatch();
    const debouncedSearch = useDebounce(search, 300);
    const {
        setValue,
        watch,
        formState: { isValid, isDirty },
        handleSubmit,
        reset,
    } = useForm<FormType>({
        mode: 'all',
        defaultValues: {
            recordIds: [],
        },
        resolver: zodResolver(
            formSchema,
            {
                async: true,
            },
            { mode: 'async' },
        ),
    });
    const selectedIds = watch('recordIds');

    const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isFetching, isRefetching, isFetchedAfterMount } =
        useRelatedRecordsInfinite({
            boardId: currentBoard._id,
            recordId: currentRecord._id,
            relatedBoardId: board._id,
            params: { skip: 0, limit: 20, link: false, name: debouncedSearch },
        });

    const linkRecord = useMutation({
        mutationFn: async (linkIds: string[]) => {
            await apiFetch(putLinkRecords.api(currentBoard._id, currentRecord._id, board._id), putLinkRecords.method, {
                ids: linkIds,
            });
        },
        onSuccess: () => {
            onClose();
            refresh();
        },
        onError: () => {
            const notificationPayload = {
                message: t('error_something_went_wrong'),
                messageType: 'noti_failed',
                variant: 'error',
            };
            dispatch(pushNotification({ notification: notificationPayload }));
        },
    });

    const allRows = data ? data.pages.flatMap((d) => d.data) : [];

    const boardType = board.type;

    const rowVirtualizer = useVirtualizer({
        count: Math.ceil(allRows.length / 3),
        getScrollElement: () => parentRef.current,
        estimateSize: () => 196,
        overscan: 0,
        gap: 16,
    });
    const columnVirtualizer = useVirtualizer({
        horizontal: true,
        count: 3,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 325,
        overscan: 0,
        gap: 16,
    });

    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();
    const lastRow = useMemo(() => lastItem, [lastItem]);

    useEffect(() => {
        parentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [debouncedSearch]);

    useEffect(() => {
        if (!lastRow) {
            return;
        }

        if (lastRow.index >= Math.ceil(allRows.length / 3) - 1 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [hasNextPage, fetchNextPage, allRows.length, isFetchingNextPage, lastRow]);

    const onSubmit = (formData: FormType) => {
        linkRecord.mutate(formData.recordIds);
    };

    return (
        <Space
            size={24}
            direction="vertical"
            align="stretch"
            style={{ height: '100%', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
        >
            <Space size={24} direction="vertical" align="stretch" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>
                <Space justify="between" align="center" style={{ width: '100%', padding: '32px', paddingBottom: 0 }}>
                    <Typography variant="Heading2">{t('link_existing_record_title', { type: boardTypeMap[boardType] })}</Typography>
                    <div>
                        <Search
                            placeholder={t('search_by_record_name_or_id')}
                            sx={{ width: '500px' }}
                            value={search}
                            onSearch={(searchValue) => {
                                setSearch(searchValue);
                                reset({ recordIds: [] });
                            }}
                            onReset={() => {
                                setSearch('');
                            }}
                        />
                    </div>
                </Space>
                <div style={{ height: '100%', overflow: 'hidden' }}>
                    <SimpleBar
                        autoHide
                        scrollableNodeProps={{
                            ref: parentRef,
                        }}
                        style={{ padding: '0 32px', paddingTop: 0, paddingBottom: 0, height: '100%' }}
                    >
                        <Spin isSpinning={isFetching && !isFetchedAfterMount && !isFetchingNextPage && !isRefetching}>
                            <div
                                className={clsx(isFetching && !isFetchingNextPage && !isRefetching && styles.blur)}
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                                    <Fragment key={virtualRow.key}>
                                        {columnVirtualizer.getVirtualItems().map((virtualColumn) => {
                                            const recordIndex = virtualRow.index * 3 + virtualColumn.index;

                                            const record = allRows[recordIndex];

                                            return (
                                                <div
                                                    key={virtualColumn.index}
                                                    style={{
                                                        position: 'absolute',
                                                        top: 0,
                                                        left: 0,
                                                        width: `${virtualColumn.size}px`,
                                                        height: `${virtualRow.size}px`,
                                                        transform: `translateX(${virtualColumn.start}px) translateY(${virtualRow.start}px)`,
                                                    }}
                                                >
                                                    {!record ? null : (
                                                        <SelectableBoardCard
                                                            isSelected={selectedIds.indexOf(record.id) !== -1}
                                                            key={record.id}
                                                            record={record}
                                                            board={board}
                                                            onClick={() => {
                                                                const newSelectedIds = new Set([...selectedIds]);
                                                                if (newSelectedIds.has(record.id)) {
                                                                    newSelectedIds.delete(record.id);
                                                                } else {
                                                                    newSelectedIds.add(record.id);
                                                                }
                                                                setValue('recordIds', [...newSelectedIds], {
                                                                    shouldValidate: true,
                                                                    shouldDirty: true,
                                                                });
                                                            }}
                                                            onModalClose={onClose}
                                                            ref={columnVirtualizer.measureElement}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </Fragment>
                                ))}
                            </div>
                            {/* {allRows.length > 0 && (
                                <div className={styles.boardsContainer}>
                                    {allRows.map((record) => {
                                        return (
                                            <SelectableBoardCard
                                                isSelected={selectedIds.indexOf(record.id) !== -1}
                                                key={record.id}
                                                record={record}
                                                board={board}
                                                onClick={() => {
                                                    const newSelectedIds = new Set([...selectedIds]);
                                                    if (newSelectedIds.has(record.id)) {
                                                        newSelectedIds.delete(record.id);
                                                    } else {
                                                        newSelectedIds.add(record.id);
                                                    }
                                                    setValue('recordIds', [...newSelectedIds], {
                                                        shouldValidate: true,
                                                        shouldDirty: true,
                                                    });
                                                }}
                                                onModalClose={onClose}
                                            />
                                        );
                                    })}
                                </div>
                            )} */}
                            {/* {allRows.length === 0 && (
                                <Illustration
                                    name={search ? 'fileSearch' : 'formMissing'}
                                    description={
                                        <Typography variant="SubHeading2">
                                            {search ? (
                                                <Trans i18nKey="journey_form_management_form_search_empty">
                                                    No matching result has been found. \n Check the spelling or create{' '}
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            // onOpenStarter();
                                                        }}
                                                    >
                                                        a new form
                                                    </button>{' '}
                                                    for it now.
                                                </Trans>
                                            ) : (
                                                <Trans i18nKey="journey_form_management_form_empty">
                                                    Create your first
                                                    <button
                                                        onClick={() => {
                                                            onClose();
                                                            // onOpenStarter();
                                                        }}
                                                    >
                                                        collecting form
                                                    </button>{' '}
                                                    now \n and start to engage with your customers!
                                                </Trans>
                                            )}
                                        </Typography>
                                    }
                                />
                            )} */}
                        </Spin>
                        {hasNextPage && (
                            <Space justify="center" align="center" style={{ marginTop: 20, width: '100%' }}>
                                <CircularProgress size={25} />
                            </Space>
                        )}
                    </SimpleBar>
                </div>
            </Space>
            <Space size={8} style={{ padding: '32px', paddingTop: 0 }}>
                <Button
                    text={t('back')}
                    variant="outlined"
                    onClick={() => {
                        onClose();
                    }}
                />
                <Button
                    text={t('apply')}
                    disabled={!isValid || !isDirty}
                    loading={linkRecord.isPending}
                    onClick={() => {
                        handleSubmit(onSubmit)();
                    }}
                />
            </Space>
        </Space>
    );
};

export default ExistingRecords;
