import { Icon, IconButton, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { SHARE_DOMAIN } from '@/pages/Databoards/components/BoardDetailedModal/DetailModalFields';

interface RecordIdProps {
    boardId?: string;
    boardItemId?: string;
    crm?: boolean;
}

const RecordId = ({ boardId, boardItemId, crm }: RecordIdProps) => {
    const { t } = useTranslation();
    const [isHover, setIsHover] = React.useState(false);
    const [isCopied, setIsCopied] = React.useState<{ state: boolean; name: string }>({ state: false, name: '' });

    const copyText = async (text: string, source: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied({ state: true, name: source });

            setTimeout(() => {
                setIsCopied({ state: false, name: '' });
            }, 1000);
        } catch (error) {
            console.log('Failed to copy text', error);
        }
    };
    return (
        <Box
            sx={{ height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', position: 'relative' }}
            onMouseOver={() => setIsHover(true)}
            onMouseLeave={() => {
                setIsHover(false);
            }}
        >
            <Typography variant="Caption" style={{ color: 'var(--color-light-4)' }}>
                {t('crm_record_id')}
                <br /> {boardItemId}
            </Typography>

            {isHover && (
                <Box
                    sx={{
                        height: '32px',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        backgroundColor: 'rgba(255,255,255,0.8)',
                    }}
                >
                    <IconButton
                        fontSize={16}
                        type={'primary'}
                        variant="text"
                        size="xs"
                        onClick={() => {
                            const domain = SHARE_DOMAIN;
                            // const link = `${window.location.href}/${boardItemId}`;
                            const link = `${domain}/${crm ? 'crm' : 'databoards'}/${boardId}/${boardItemId}`;
                            copyText(link, 'link');
                        }}
                        sx={{
                            padding: '4px 8px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        {isCopied.name === 'link' ? (
                            <Icon style={{ fontSize: 16 }} name="codeCopied" />
                        ) : (
                            <Icon style={{ fontSize: 18 }} name="link" />
                        )}
                        <Typography variant={'BodyTight'} style={{ textTransform: 'capitalize', lineHeight: '12px' }}>
                            {t('crm_share_link')}
                        </Typography>
                    </IconButton>
                    <IconButton
                        fontSize={16}
                        type={'primary'}
                        variant="text"
                        size="xs"
                        onClick={() => {
                            copyText(boardItemId as string, 'id');
                        }}
                        sx={{ padding: '4px 8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                    >
                        {isCopied.name === 'id' ? (
                            <Icon style={{ fontSize: 16 }} name="codeCopied" />
                        ) : (
                            <Icon style={{ fontSize: 16 }} name="copy" />
                        )}
                        <Typography variant={'BodyTight'} style={{ textTransform: 'capitalize', lineHeight: '12px' }}>
                            {t('crm_record_id')}
                        </Typography>
                    </IconButton>
                </Box>
            )}
        </Box>
    );
};

export default RecordId;
