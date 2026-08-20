import { Button, EllipsisText, Icon, Typography } from '@imbrace/ui';
import { Box, CardContent, CardMedia, Skeleton } from '@mui/material';
import Card from '@mui/material/Card';
import { useQuery } from '@tanstack/react-query';

import type { LinkPreviewData } from '@/components/FlexibleTable/linkPreview';
import { env } from '@/env';
import { SHARE_DOMAIN } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalFields';
import styles from '@/pages/Databoards/components/BoardDetailedModal/index.module.scss';
import { linkPreview } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

interface Prop {
    value: string;
    columnMode?: boolean;
}
const getMetaData = async ({ queryKey }: { queryKey: string[] }) => {
    const url = queryKey[1];
    if (!url) {
        throw new Error('No url');
    }
    const { data } = await apiFetch<{ data: LinkPreviewData }>(linkPreview.api, linkPreview.method, { url });

    if (!data.data) {
        throw new Error('No preview data');
    }
    return data.data;
};

const LinkPreview = (prop: Prop) => {
    const { value, columnMode } = prop;

    const domain = SHARE_DOMAIN;
    const isImbraceLink = env.VITE_APP_ENV !== 'local' && value ? (value as string).includes(domain) : false;

    const previewQuery = useQuery({
        queryFn: getMetaData,
        queryKey: ['linkPreview', value],
        staleTime: 1000 * 60 * 60,
    });

    const { data: cachedQueryData, isLoading } = previewQuery;

    const clickHandler = () => {
        if (isImbraceLink) {
            window.open(value, '_self', 'noreferrer');
            return;
        }
        window.open(value, '_blank', 'noreferrer');
    };

    if (isLoading) {
        return (
            <Card
                sx={{
                    display: 'flex',
                    boxShadow: 'none',
                    height: '120px',
                    maxWidth: '613px',
                    cursor: 'pointer',
                }}
            >
                <Skeleton variant="rectangular" width={'100%'} height={'100%'} sx={{ borderRadius: '4px' }} />
            </Card>
        );
    }

    const renderCard = () => {
        return (
            <Card
                sx={{
                    display: 'flex',
                    boxShadow: 'none',
                    height: '120px',
                    maxWidth: '613px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-light-3)',
                    cursor: 'pointer',
                    '&:hover': {
                        border: '1px solid var(--color-primary-1)',
                    },
                    ...(columnMode && {
                        flexDirection: 'column',
                        height: 'auto',
                        alignItems: 'center',
                    }),
                }}
                onClick={clickHandler}
            >
                {cachedQueryData?.imageUrl && (
                    <div
                        style={{
                            width: '200px',
                            aspectRatio: '5/3',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <CardMedia
                            component="img"
                            sx={{
                                display: 'block',
                                width: 'auto',
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                            image={cachedQueryData?.imageUrl}
                            alt={cachedQueryData?.title}
                        />
                    </div>
                )}
                <Box
                    sx={{
                        padding: '16px',
                        maxWidth: cachedQueryData?.imageUrl ? '413px' : '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        width: '100%',
                    }}
                >
                    <CardContent
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            height: '100%',
                            padding: 0,
                        }}
                    >
                        <div>
                            <EllipsisText
                                text={cachedQueryData?.title}
                                element={
                                    <Typography
                                        variant="BodyBold"
                                        style={{
                                            color: 'var(--color-light-7)',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            wordBreak: 'break-word',
                                            marginBottom: '8px',
                                        }}
                                    />
                                }
                            />
                            <EllipsisText
                                text={cachedQueryData?.description}
                                element={
                                    <Typography
                                        variant="Caption"
                                        style={{
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            WebkitLineClamp: 2,
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                            color: 'var(--color-light-5)',
                                        }}
                                    />
                                }
                                whiteSpace="pre-wrap"
                            />
                        </div>
                    </CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box
                            sx={{
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Icon name="linkSide" fontSize={16} style={{ color: 'var(--color-light-5)' }} />
                        </Box>
                        <EllipsisText
                            text={value}
                            element={
                                <Typography
                                    variant="Caption"
                                    style={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        wordBreak: 'break-word',
                                        WebkitLineClamp: 2,
                                        display: '-webkit-box',
                                        WebkitBoxOrient: 'vertical',
                                        color: 'var(--color-light-5)',
                                    }}
                                />
                            }
                            whiteSpace="pre-wrap"
                        />
                    </Box>
                </Box>
            </Card>
        );
    };

    return (
        <Box>
            {cachedQueryData?.title ? (
                renderCard()
            ) : (
                <Button
                    variant="link"
                    text={<EllipsisText text={value} className={styles.ellipsisLink} />}
                    onClick={clickHandler}
                    sx={{
                        padding: 0,
                        maxWidth: '250px',
                        fontWeight: 400,
                        fontSize: '14px',
                        lineHeight: '20px',
                        textDecoration: 'underline',
                        '& :hover': {
                            textDecoration: 'underline',
                        },
                    }}
                />
            )}
        </Box>
    );
};

export default LinkPreview;
