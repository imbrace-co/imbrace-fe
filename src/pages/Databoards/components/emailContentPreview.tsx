import { EllipsisText, Icon, IconButton, Space, Typography, useModal } from '@imbrace/ui';
import { Divider } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import Scrollbars from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';

import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import styles from '../index.module.scss';

export const FileItem = ({ file }: { file: { id: string; name: string; url: string } }) => {
    const downloadFile = useMutation({
        mutationFn: async ({ fileName }: { fileName: string }) => {
            const res = await apiFetch<Blob>(file.url, 'GET', {}, ImbraceClient, {
                responseType: 'blob',
            });
            return res.data;
        },
        onSuccess: (blob, { fileName }) => {
            const link = document.createElement('a');
            const href = URL.createObjectURL(blob);
            link.setAttribute('target', '_blank');
            link.setAttribute('href', href);
            link.setAttribute('download', fileName);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(href);
        },
    });
    return (
        <div>
            <Space justify="between" align="center" className={`${styles.file}`}>
                <Space size={8} style={{ overflow: 'hidden' }}>
                    <Space>
                        <Icon name="file" style={{ color: 'var(--color-light-5)' }} />
                    </Space>
                    <Space size={4} style={{ overflow: 'hidden' }}>
                        <EllipsisText element={<Typography variant="BodyTight" />} text={file.name} />
                    </Space>
                </Space>
                <IconButton
                    size={'xs'}
                    variant="text"
                    type="secondary"
                    loading={downloadFile.isPending}
                    onClick={() => {
                        downloadFile.mutate({ fileName: file.name });
                    }}
                    fontSize={12}
                >
                    <Icon name="download" style={{ fontSize: '12px' }} />
                </IconButton>
            </Space>
        </div>
    );
};

const EmailContentPreview = ({
    content,
    subject,
    email,
}: {
    subject: string;
    content: { content: string; files: { id: string; name: string; url: string }[] };
    email: string;
}) => {
    const { t } = useTranslation();
    const [{ modal }, modalHolder] = useModal();

    if (!content) {
        return (
            <Typography
                style={{
                    color: 'var(--color-light-4)',
                }}
            >
                —
            </Typography>
        );
    }
    return (
        <>
            {modalHolder}

            <IconButton
                variant="outlined"
                type="secondary"
                size={'xs'}
                sx={{
                    '&:hover': {
                        borderColor: 'var(--color-primary-1)',
                    },
                }}
                onClick={() => {
                    modal({
                        title: t('sent_email_content'),
                        paperSx: {
                            background: '#333333F2',
                        },
                        content: () => {
                            return (
                                <div className={styles.previewContainer}>
                                    <Space size={0} align="start" direction="vertical" style={{ height: '100%' }}>
                                        <Space size={12} direction="vertical" align="start" style={{ padding: '32px 48px' }}>
                                            <Space size={12} justify="start">
                                                <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                                    {t('journey_email_subject_title')}
                                                </Typography>
                                                <EllipsisText text={subject} element={<Typography />} />
                                            </Space>
                                            <Space size={12} justify="start">
                                                <Typography variant="BodyBold" style={{ color: 'var(--color-light-5)' }}>
                                                    {t('senders_email')}
                                                </Typography>
                                                <EllipsisText text={email} element={<Typography />} />
                                            </Space>
                                        </Space>
                                        <Divider flexItem />
                                        <div style={{ flex: 1, width: '100%' }}>
                                            <Scrollbars>
                                                <Space size={0} direction="vertical" align="stretch" style={{ width: '100%' }}>
                                                    <div
                                                        className={clsx('ql-preview', styles.content)}
                                                        dangerouslySetInnerHTML={{ __html: content.content || '' }}
                                                    ></div>
                                                    {content.files && content.files.length > 0 && (
                                                        <div style={{ padding: '0 48px' }}>
                                                            <Divider flexItem style={{ marginBottom: '24px' }} />
                                                            <Space
                                                                size={8}
                                                                direction="vertical"
                                                                align="stretch"
                                                                style={{ width: '100%', marginBottom: '24px' }}
                                                            >
                                                                {content.files.map((file) => (
                                                                    <FileItem key={file.id} file={file} />
                                                                ))}
                                                            </Space>
                                                        </div>
                                                    )}
                                                </Space>
                                            </Scrollbars>
                                        </div>
                                    </Space>
                                </div>
                            );
                        },
                    });
                }}
            >
                <Icon name="emailPreview" />
            </IconButton>
        </>
    );
};

export default EmailContentPreview;
