import { EllipsisText, fileIconMapping, Icon, Illustration, Space, Spin, Typography } from '@imbrace/ui';
import { Box, Typography as MuiTypography } from '@mui/material';
import clsx from 'clsx';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getContactFile } from '@/services/api/contact';
import apiFetch from '@/services/axios/handler';

import DownloadFile from './downloadFile';
import styles from './files.module.scss';

interface Props {
    userId?: string;
    frameLess?: boolean;
}

const getFileName = ({ caption, extension }: API.ContactFile['content']) => {
    if (caption.indexOf(extension) !== -1) {
        return caption;
    }
    if (extension && extension !== 'unknown') {
        return `${caption}.${extension}`;
    }
    return caption;
};

const validateExtension = (extension: string) => {
    if (extension === 'jpeg') {
        // jpg, jpeg
        return true;
    }
    return !!fileIconMapping[extension as keyof typeof fileIconMapping];
};

const Files = ({ userId, frameLess }: Props) => {
    const { t } = useTranslation();
    const [files, setFiles] = useState<API.ContactFile[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchFiles = useCallback(async () => {
        try {
            setLoading(true);
            if (userId) {
                const { data } = await apiFetch<API.ContactFile[]>(getContactFile.api(userId), getContactFile.method);
                setFiles(data);
            }
            setLoading(false);
        } catch (error) {
            console.log(error);
            setFiles([]);
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    const renderIcon = ({ extension, url }: API.ContactFile['content']) => {
        if (!extension) {
            const extensionFromUrl = url.split('.').pop();
            if (extensionFromUrl && validateExtension(extensionFromUrl)) {
                return <Icon className={styles.fileIcon} namespace="file" name={extensionFromUrl as keyof typeof fileIconMapping} />;
            }
        }
        if (extension === 'unknown') {
            return <Icon className={styles.fileIcon} namespace="file" name="general" />;
        }
        if (extension && validateExtension(extension)) {
            if (extension === 'jpeg') {
                return <Icon className={styles.fileIcon} namespace="file" name={'jpg'} />;
            }
            return <Icon className={styles.fileIcon} namespace="file" name={extension as keyof typeof fileIconMapping} />;
        }

        return <Icon className={styles.fileIcon} namespace="file" name="general" />;
    };

    return (
        <div className={styles.container}>
            <Space size={16} direction="vertical" align="stretch" className={clsx(styles.inner, frameLess && styles.frameLess)}>
                {!frameLess && <Typography variant="SubHeading2">{t('files_in_conversation')}</Typography>}
                <Spin isSpinning={loading}>
                    {files.length > 0 ? (
                        <div className={styles.files}>
                            {files.map((file) => {
                                return (
                                    <div key={file._id} className={styles.fileCard}>
                                        <EllipsisText
                                            text={getFileName(file.content) ?? ''}
                                            element={
                                                <MuiTypography
                                                    variant="inherit"
                                                    sx={{
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        WebkitLineClamp: 2,
                                                        display: '-webkit-box',
                                                        WebkitBoxOrient: 'vertical',
                                                    }}
                                                />
                                            }
                                            whiteSpace="pre-wrap"
                                        />
                                        <div className={styles.footer}>
                                            {renderIcon(file.content)}
                                            <div className={styles.download}>
                                                <DownloadFile fileName={getFileName(file.content)} url={file.content.url} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={styles.empty}>
                            <Illustration
                                size={8}
                                name="filesMissing"
                                style={{ width: '240px', height: '200px' }}
                                description={
                                    <Box sx={{ width: '328px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <Typography variant="SubHeading2">{t('contacts_files_empty')}</Typography>
                                        <Typography variant="Caption">{t('contacts_files_empty_sub')}</Typography>
                                    </Box>
                                }
                            />
                        </div>
                    )}
                </Spin>
            </Space>
        </div>
    );
};

export default Files;
