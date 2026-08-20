import { Button, EllipsisText, Icon, Illustration, Space, Typography } from '@imbrace/ui';
import { Box, CircularProgress, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
    opportunitiesCardDefaultFields,
    tasksCardDefaultFields,
} from '@/pages/Databoards/components/BoardDetailedModal/boardDefaultFields';
import type { LinkedTabContentRef } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalContent';
import { SHARE_DOMAIN } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalFields';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import { getLinkedBoardItems } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

interface LinkedTabContentProps {
    boardType: 'Opportunities' | 'Tasks';
    selectedRowInfo?: CurrentBoardInfo;
    linkedBoards?: Record<string, API.Board>;
}

const Card = styled(Box)(() => ({
    height: '216px',
    width: '100%',
    borderRadius: '4px',
    border: '1px solid var(--color-light-3)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    position: 'relative',
}));

const CardContent = styled(Box)(() => ({
    width: '100%',
    display: 'flex',
    gap: '16px',
}));
const openRecord = (url: string) => {
    window.open(url, '_blank');
};

const LinkedTabContent = forwardRef<LinkedTabContentRef, LinkedTabContentProps>((props, ref) => {
    const { boardType, selectedRowInfo, linkedBoards } = props;
    const { t } = useTranslation();
    const [defaultFields, setDefaultFields] = useState<Record<string, API.BoardField>>();

    const fetchData = useCallback(async () => {
        if (!selectedRowInfo) return;
        try {
            const { data } = await apiFetch<{ data: Record<string, string | [] | null>[] }>(
                getLinkedBoardItems.api(selectedRowInfo.boardId, selectedRowInfo.boardItemId, boardType),
                getLinkedBoardItems.method,
            );
            return data.data;
        } catch (error) {
            console.error('error::', error);
        }
    }, [selectedRowInfo, boardType]);

    const {
        data: linkedData,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ['getLinkedBoardItems', selectedRowInfo?.boardId, selectedRowInfo?.boardItemId, boardType],
        queryFn: () => fetchData(),
    });

    useImperativeHandle(ref, () => ({
        fetchTabData: async () => {
            await refetch();
        },
    }));

    useEffect(() => {
        if (!linkedBoards) return;
        const displayDefaultFields = linkedBoards[boardType].fields.filter((field) => field.is_default || field.is_identifier);

        const groupedFields = displayDefaultFields?.reduce((acc: Record<string, API.BoardField>, field) => {
            const { default_field_name } = field;
            if (!default_field_name) return acc;

            acc[default_field_name] = field;
            return acc;
        }, {});
        // filtered out header fields, output as object
        setDefaultFields(groupedFields);
    }, [linkedData, linkedBoards, boardType]);

    const renderFieldValue = (
        cardItem: Record<
            string,
            string | null | number | boolean | Date | (string | number)[] | Record<string, string> | API.AssigneeValue
        >,
        defaultFieldName: string,
    ): string => {
        if (!defaultFields) return '';
        const id = defaultFields[defaultFieldName]._id;

        if (typeof cardItem[id] === 'object') {
            if (defaultFields[defaultFieldName].type === 'Assignee') {
                return cardItem[id] ? (cardItem[id] as API.AssigneeValue).display_name : '';
            }
        }
        if (defaultFields[defaultFieldName].type === 'Date') {
            return cardItem[id] ? format(new Date(cardItem[id] as string), 'MM/dd/yyyy') : '';
        }

        return cardItem[id] as string;
    };

    const renderContentField = (
        fieldItem: { key: string; size: number },
        cardItem: Record<
            string,
            string | null | number | boolean | Date | (string | number)[] | Record<string, string> | API.AssigneeValue
        >,
    ) => {
        if (!defaultFields) return;
        const isEmpty = !renderFieldValue(cardItem, fieldItem.key);

        if (fieldItem.key === 'owner' || fieldItem.key === 'assignee') {
            return (
                <div>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{defaultFields[fieldItem.key].name}</Typography>
                    <Space size={12} style={{ gap: '12px' }}>
                        {isEmpty ? (
                            <>
                                <Typography style={{ color: 'var(--color-light-5)' }}>—</Typography>
                            </>
                        ) : (
                            <>
                                <Icon name="accountCircle" fontSize={20} color="var(--color-light-5)" />
                                <Typography style={{ color: 'var(--color-light-7)' }}>
                                    {renderFieldValue(cardItem, fieldItem.key)}
                                </Typography>
                            </>
                        )}
                    </Space>
                </div>
            );
        }
        if (fieldItem.key === 'remarks' || fieldItem.key === 'description') {
            return (
                <div>
                    <Typography style={{ color: 'var(--color-light-5)' }}>{defaultFields[fieldItem.key].name}</Typography>
                    <EllipsisText
                        text={isEmpty ? '—' : renderFieldValue(cardItem, fieldItem.key)}
                        element={
                            <Typography
                                style={{
                                    minHeight: '20px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                    color: isEmpty ? 'var(--color-light-5)' : 'var(--color-light-7)',
                                }}
                            />
                        }
                        whiteSpace="pre-wrap"
                    />
                </div>
            );
        }

        return (
            <div>
                <Typography style={{ color: 'var(--color-light-5)' }}>{defaultFields[fieldItem.key].name}</Typography>
                <Typography
                    style={{
                        color: isEmpty ? 'var(--color-light-5)' : 'var(--color-light-7)',
                    }}
                >
                    {renderFieldValue(cardItem, fieldItem.key) || '—'}
                </Typography>
            </div>
        );
    };
    const renderUpdatedTime = (timeString: string) => {
        const date = parseISO(timeString);
        return format(date, 'MM/dd/yyyy h:mm a');
    };

    const renderCards = () => {
        if (boardType === 'Opportunities') {
            return (
                <>
                    {linkedData?.map((cardItem) => {
                        return (
                            <Card>
                                <div>
                                    <Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }}>
                                        {renderFieldValue(cardItem, 'name')}
                                    </Typography>
                                    <Typography style={{ color: 'var(--color-light-5)' }}>
                                        {t('crm_last_updated')} {renderUpdatedTime((cardItem.updated_at ?? cardItem.created_at) as string)}
                                    </Typography>
                                </div>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        {opportunitiesCardDefaultFields.map((fieldItem) => {
                                            return (
                                                <Grid item xs={12} sm={fieldItem.size} key={fieldItem.key}>
                                                    {renderContentField(fieldItem, cardItem)}
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                </CardContent>

                                <Button
                                    variant="link"
                                    text={t('open_record')}
                                    size="xs"
                                    onClick={() => {
                                        const domain = SHARE_DOMAIN;
                                        openRecord(`${domain}/crm/${cardItem.board_id}/${cardItem.board_item_id}`);
                                    }}
                                    endIcon={<Icon name="openNew" fontSize={16} />}
                                    sx={{
                                        fontSize: '12px',
                                        fontWeight: 400,
                                        lineHeight: '130%',
                                        '& svg': {
                                            width: '12px',
                                        },
                                        position: 'absolute',
                                        right: '18px',
                                        top: '18px',
                                    }}
                                />
                            </Card>
                        );
                    })}
                </>
            );
        }

        if (boardType === 'Tasks') {
            return (
                <>
                    {linkedData?.map((cardItem) => {
                        return (
                            <Card>
                                <div>
                                    <Typography variant="SubHeading2" style={{ color: 'var(--color-light-7)' }}>
                                        {renderFieldValue(cardItem, 'name')}
                                    </Typography>
                                    <Typography style={{ color: 'var(--color-light-5)' }}>
                                        {t('crm_last_updated')} {renderUpdatedTime((cardItem.updated_at ?? cardItem.created_at) as string)}
                                    </Typography>
                                </div>
                                <CardContent>
                                    <Grid container spacing={2}>
                                        {tasksCardDefaultFields.map((fieldItem) => {
                                            return (
                                                <Grid item xs={12} sm={fieldItem.size} key={fieldItem.key}>
                                                    {renderContentField(fieldItem, cardItem)}
                                                </Grid>
                                            );
                                        })}
                                    </Grid>
                                </CardContent>

                                <Button
                                    variant="link"
                                    text={t('open_record')}
                                    size="xs"
                                    onClick={() => {
                                        const domain = SHARE_DOMAIN;
                                        openRecord(`${domain}/crm/${cardItem.board_id}/${cardItem.board_item_id}`);
                                    }}
                                    endIcon={<Icon name="openNew" fontSize={16} />}
                                    sx={{
                                        fontSize: '12px',
                                        fontWeight: 400,
                                        lineHeight: '130%',
                                        '& svg': {
                                            width: '12px',
                                        },
                                        position: 'absolute',
                                        right: '18px',
                                        top: '18px',
                                    }}
                                />
                            </Card>
                        );
                    })}
                </>
            );
        }
    };

    if (isLoading) {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingTop: '77px',
                }}
            >
                <CircularProgress />
                <Typography variant="SubHeading2" style={{ color: 'var(--color-light-5)' }}>
                    {t('board_link_content_loading')}
                </Typography>
                <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                    {t('board_link_content_loading_caption')}
                </Typography>
            </Box>
        );
    }

    if (!linkedData || linkedData.length === 0) {
        return (
            <Box sx={{ marginTop: '72px' }}>
                <Illustration
                    name="recordMissing2"
                    description={
                        <div style={{ width: '404px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <Typography variant="SubHeading2">
                                {t('board_link_empty_header')}
                            </Typography>
                            <Typography variant="Caption">
                                {t('board_link_empty_content')}
                            </Typography>
                        </div>
                    }
                />
            </Box>
        );
    }

    return (
        <div>
            <Space
                size={12}
                direction="vertical"
                style={{
                    height: '100%',
                    width: '100%',
                    padding: '16px 32px 10.6px 32px',
                    gap: '16px',
                    position: 'relative',
                }}
            >
                {renderCards()}
            </Space>
        </div>
    );
});

export default LinkedTabContent;
