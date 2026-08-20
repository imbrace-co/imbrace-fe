import MuiAvatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import { useMutation } from '@tanstack/react-query';
import type { ImgHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import invariant from 'tiny-invariant';

import { prettySize } from '../../utils';
import type { Attachment, FileStatus } from './types';
import { EllipsisText, Icon, IconButton, Space, Tooltip, Typography } from '@imbrace/ui';

interface FileItemBaseProps {
    onUpload?: (file: File) => Promise<{ url: string; id: string; name: string; size?: number }>;
    onDelete?: (fileId: string) => Promise<unknown>;
    onStatusChange: (
        payload: {
            id: string;
            fileId?: string;
            status: FileStatus;
            error?: string;
            url?: string;
            size?: number;
            name?: string;
        },
        silent?: boolean,
    ) => void;
    onGetInfo?: (fileId: string) => Promise<{ url: string; id: string; name: string }>;
    onDownload?: (fileUrl: string) => void;
    removeAttachFile: (attachmentId: string) => void;
    type?: 'list' | 'avatar';
    onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}
interface ListProps {
    attachment: Attachment;
    showFileSize?: boolean;
    type?: 'list';
}
interface AvatarProps {
    attachment?: Attachment;
    type: 'avatar';
    width?: number;
    height?: number;
    defaultIcon?: ReactNode;
    imgProps?: ImgHTMLAttributes<HTMLImageElement>;
    disabled?: boolean;
}

export type FileItemProps = FileItemBaseProps & (ListProps | AvatarProps);

const FileItem = (props: FileItemProps) => {
    const { attachment, onStatusChange, removeAttachFile, onUpload, onDelete, onGetInfo, onDownload, type = 'list' } = props;

    const getFile = useMutation({
        mutationKey: ['getFile', attachment?.id],
        mutationFn: async () => {
            if (onGetInfo && attachment?.status === 'ok' && !attachment?.name) {
                const data = await onGetInfo(attachment?.id);
                return data;
            }

            return undefined;
        },
        onSuccess: (data) => {
            if (data && attachment?.id) {
                onStatusChange({ id: attachment?.id, fileId: data?.id, status: 'ok', url: data?.url, name: data?.name }, true);
            }
        },
        onError: (error) => {
            if (attachment?.id) {
                onStatusChange({ id: attachment?.id, status: 'missingFile', error: error.message });
            }
        },
    });

    const uploadFile = useMutation({
        mutationKey: ['uploadFile', attachment?.id],
        mutationFn: async (file: File) => {
            if (onUpload) {
                const data = await onUpload(file);
                return data;
            }

            return undefined;
        },
        onMutate: () => {
            if (attachment?.id) {
                onStatusChange({ id: attachment.id, status: onUpload ? 'uploading' : 'ok' });
            }
        },
        onSuccess: (data) => {
            if (attachment?.id) {
                onStatusChange({ id: attachment.id, fileId: data?.id, status: 'ok', url: data?.url, size: data?.size });
            }
        },
        onError: (error) => {
            if (attachment?.id) {
                onStatusChange({ id: attachment.id, status: 'uploadError', error: error.message });
            }
        },
    });

    const deleteFile = useMutation({
        mutationKey: ['deleteFile', attachment?.id],
        mutationFn: async ({ fileId, id }: { fileId?: string; id: string }) => {
            if (onDelete) {
                await onDelete(fileId || id);
                removeAttachFile(id);
                return true;
            }
            return true;
        },
        onMutate: () => {
            if (attachment?.id) {
                onStatusChange({ id: attachment.id, status: 'deleting' });
            }
        },
        onSuccess: () => {
            if (attachment?.id) {
                onStatusChange({ id: attachment.id, status: 'deleted' });
            }
        },
        onError: (error) => {
            if (attachment?.id) {
                onStatusChange({ id: attachment.id, status: 'deleted', error: error.message });
            }
        },
    });

    const removeFile = async () => {
        try {
            if (attachment) {
                if (deleteFile.isIdle && onDelete && attachment.status === 'ok') {
                    await deleteFile.mutateAsync({
                        id: attachment.id,
                        fileId: attachment.fileId,
                    });
                } else {
                    removeAttachFile(attachment.id);
                }
            }
        } catch (error) {
            console.log(error);
            if (attachment) {
                removeAttachFile(attachment.id);
            }
        }
    };

    useEffect(() => {
        if (attachment && attachment.status === 'pending' && uploadFile.isIdle && attachment.file) {
            uploadFile.mutate(attachment.file);
        }
    }, [uploadFile, attachment]);

    useEffect(() => {
        if (
            onGetInfo &&
            attachment &&
            attachment.status === 'ok' &&
            getFile.isIdle &&
            (!attachment.url || !attachment.name || !attachment.size)
        ) {
            getFile.mutate();
        }
    }, [onGetInfo, attachment, getFile]);

    const getFileSize = (size?: number) => {
        if (!size) {
            return null;
        }

        return <Typography variant="BodyTight" style={{ whiteSpace: 'nowrap' }}>{`(${prettySize(size)})`}</Typography>;
    };

    const imgUrl = useMemo(() => {
        if (attachment?.url) {
            return attachment?.url;
        }
        if (attachment?.file instanceof Blob) {
            const objectUrl = URL.createObjectURL(attachment.file);
            if (objectUrl !== undefined) {
                return objectUrl;
            }
        }
        return undefined;
    }, [attachment]);

    if (type === 'list') {
        invariant(props.type === 'list' || typeof props.type === 'undefined', 'type is not list');
        const { showFileSize } = props;
        return (
            <Tooltip arrow placement="top" title={attachment?.error} disableHoverListener={!attachment?.error}>
                <div style={{ width: '100%' }}>
                    <Space justify="between" align="center" className={`${styles.file} ${attachment?.error ? styles.error : ''}`}>
                        <Space 
                            size={8} 
                            style={{ overflow: 'hidden', cursor: attachment?.url ? 'pointer' : 'default' }} 
                            onClick={() => {
                                if (attachment?.url) {
                                    onDownload?.(attachment?.url);
                                }
                            }}
                        >
                            <Space>
                                <Icon
                                    name={attachment?.error ? 'info' : 'file'}
                                    style={{ color: attachment?.error ? 'var(--color-danger-1)' : 'var(--color-light-5)' }}
                                />
                            </Space>
                            <Space size={4} style={{ overflow: 'hidden' }}>
                                {getFile.isPending ? (
                                    <Skeleton variant="text" width={150} />
                                ) : (
                                    <EllipsisText element={<Typography variant="BodyTight" />} text={attachment?.name || ''} />
                                )}
                                {showFileSize && getFileSize(attachment?.size || attachment?.file?.size)}
                            </Space>
                        </Space>
                        {uploadFile.isPending || deleteFile.isPending ? (
                            <CircularProgress size={12} sx={{ color: 'var(--color-secondary-1)' }} />
                        ) : (
                            <IconButton
                                disabled={getFile.isPending}
                                size={'xs'}
                                variant="text"
                                type="secondary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile();
                                }}
                            >
                                <Icon name="close" style={{ fontSize: '12px' }} />
                            </IconButton>
                        )}
                    </Space>
                </div>
            </Tooltip>
        );
    }
    invariant(props.type === 'avatar', 'type is not avatar');
    const { width, height, defaultIcon, imgProps, onClick, disabled } = props;

    return (
        <Tooltip arrow placement="top" title={attachment?.error} disableHoverListener={!attachment?.error}>
            <MuiAvatar
                sx={{
                    backgroundColor: 'var(--color-light-3)',
                    width,
                    height,
                    color: 'white',
                    '& svg': {
                        color: 'white !important',
                    },
                    ...(attachment?.error && {
                        border: '1px solid var(--color-danger-1)',
                    }),
                    cursor: 'pointer',
                    ...(disabled && {
                        pointerEvents: 'none',
                    }),
                }}
                src={imgUrl}
                children={defaultIcon}
                slotProps={{
                    img: imgProps,
                }}
                component="div"
                onClick={onClick}
            />
        </Tooltip>
    );
};

export default FileItem;
