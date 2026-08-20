import { Button, FieldText, Icon, Space, Switch, Tooltip, Typography, useDialog, useModal } from '@imbrace/ui';
import { Box } from '@mui/material';
import { Trans, useTranslation } from 'react-i18next';
import styles from './index.module.scss';
import { format } from 'date-fns';
import ClockIcon from '@/assets/icons/general/clock.svg?react';
import apiFetch from '@/services/axios/handler';
import { downloadFile } from '@/services/api/knowledgeHub';
import { ImbraceClient } from '@/services/axios';

export interface FilePreviewProps {
    onClose: () => void;
    file: API.DataBoardFile;
    openFileInside: (file: API.DataBoardFile) => void;
}

export const FilePreview = ({ onClose, file, openFileInside }: FilePreviewProps) => {
    const { t } = useTranslation();

    const updateTime = file?.updated_at;
    const isValidDate = updateTime && !isNaN(new Date(updateTime).getTime());
    const syncTime = isValidDate ? format(new Date(updateTime), 'MM/dd/yyyy') : '';

    const downloadFileItem = async () => {
        const response = await apiFetch<Blob>(downloadFile.api(file._id), downloadFile.method, {}, ImbraceClient, {
            responseType: 'blob',
        });

        const url = URL.createObjectURL(response.data);

        const a = document.createElement('a');
        a.href = url;
        a.download = file.name || 'downloaded_file';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    return (
        <Box className={styles.switchFile} sx={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <Space className={styles.fileInfo} direction="vertical" justify="start" align="start">
                <div> {file?.name} </div>
                <div
                    style={{
                        display: 'flex',
                        textAlign: 'center',
                        alignItems: 'center',
                        marginTop: 7,
                    }}
                >
                    {' '}
                    <ClockIcon />{' '}
                    <span
                        style={{
                            marginLeft: 13,
                        }}
                    >
                        Update on {syncTime}{' '}
                        <Trans
                            i18nKey="knowledge_by"
                            values={{ who: file?.last_updated_by?.display_name }}
                            components={[
                                <span
                                    style={{
                                        color: 'var(--color-primary-1)',
                                        textDecoration: 'underline',
                                        marginLeft: 5,
                                    }}
                                />,
                            ]}
                        />
                    </span>
                </div>
            </Space>

            {file?.file_type?.includes('image') ? (
                <Space className={styles.fileImage} justify="center">
                    <img src={file.presigned_url} />
                </Space>
            ) : (
                <Space className={styles.fileNotImage} justify="center">
                    <Button
                        sx={{
                            width: '180px',
                            border: '1px solid var(--color-primary-1)',
                            color: 'var(--color-primary-1)',
                            borderRadius: '4px',
                        }}
                        variant="outlined"
                        text={t('knowledge_view_file')}
                        onClick={() => {
                            onClose?.();
                            openFileInside(file);
                        }}
                    />
                    <Button
                        sx={{
                            width: '180px',
                            borderRadius: '4px',
                        }}
                        variant="contained"
                        text={t('download')}
                        onClick={() => downloadFileItem()}
                    />
                </Space>
            )}
            {file?.file_type?.includes('image') && (
                <Space justify="end">
                    <Button
                        size={'s'}
                        variant="contained"
                        type="primary"
                        sx={{
                            padding: '4px 24px!important',
                            fontSize: 14,
                            borderRadius: '4px',
                            height: 44,
                            width: 178,
                        }}
                        onClick={() => downloadFileItem()}
                        text={t('download')}
                    />
                </Space>
            )}
        </Box>
    );
};
