import { useMutation } from '@tanstack/react-query';
import clsx from 'clsx';
import type { ReactNode } from 'react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';
import { Attachment, fileIconMapping, Icon, IconButton, ModalHOCProps, Space, Tooltip, Typography } from '@imbrace/ui';
import { FileStatus } from './types';
import CsvViewer from './csvViewer';
import { supportedFileExtensions, supportedFileMIME, supportedImageFileExtensions, supportedImageFileMIME, supportedVideoExtensions, supportedVideoMIME } from './utils';
export type PreviewItemProps = {
    attachment: Attachment;
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
            type?: string;
        },
        silent?: boolean,
    ) => void;
    removeAttachFile: (attachmentId: string) => void;
    index?: number;
    attachments?: Attachment[];
    openPreview: (modalProps: ModalHOCProps) => void;
    isLocalStorage?: boolean;
};

const PreviewItem = (props: PreviewItemProps) => {
    const { attachment, onStatusChange, removeAttachFile, onDelete, attachments, index, openPreview, isLocalStorage } = props;
    const previewSliderRef = useRef<PreviewSliderRef>(null);
    const deleteFile = useMutation({
        mutationKey: ['deleteFile', attachment?.id],
        mutationFn: async ({ id, fileId }: { id: string; fileId?: string }) => {
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

    const removeFile = async (targetAttachment: Attachment) => {
        try {
            if (targetAttachment) {
                if (deleteFile.isIdle && onDelete && targetAttachment.status === 'ok') {
                    await deleteFile.mutateAsync({
                        id: targetAttachment.id,
                        fileId: targetAttachment.fileId,
                    });
                } else {
                    removeAttachFile(targetAttachment.id);
                }
            }
        } catch (error) {
            console.log(error);
            if (targetAttachment) {
                removeAttachFile(targetAttachment.id);
            }
        }
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

    const renderPreview = () => {
        if (attachment.status === 'missingFile') {
            return <Icon name="attachmentBroken" fontSize={20} />;
        }
        if (
            attachment.type &&
            (supportedFileMIME.indexOf(attachment.type) !== -1 ||
                supportedFileExtensions.indexOf(attachment.type) !== -1 ||
                supportedVideoMIME.indexOf(attachment.type) !== -1 ||
                supportedVideoExtensions.indexOf(attachment.type) !== -1)
        ) {
            const icon: Record<string, keyof typeof fileIconMapping> = {
                'application/pdf': 'pdfFat',
                pdf: 'pdfFat',
                'text/csv': 'csvFat',
                csv: 'csvFat',
                'video/mp4': 'mp4Fat',
                mp4: 'mp4Fat',
                'application/msword': 'docFat',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docFat',
                doc: 'docFat',
                docx: 'docFat',
                'application/vnd.ms-excel': 'xlsxFat',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsxFat',
                xlsx: 'xlsxFat',
                'application/vnd.ms-powerpoint': 'pptxFat',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptxFat',
                pptx: 'pptxFat',
            };
            if (attachment.type && icon[attachment.type]) {
                return <Icon name={icon[attachment.type]} namespace="file" fontSize={20} />;
            }
        }
        if (
            attachment.type &&
            (supportedImageFileMIME.indexOf(attachment.type) !== -1 || supportedImageFileExtensions.indexOf(attachment.type) !== -1)
        ) {
            return <img src={imgUrl} />;
        }
        return <Icon name="generalFat" namespace="file" fontSize={20} />;
    };

    return (
        <Tooltip title={attachment.name} placement="top" arrow>
            <div
                className={clsx(styles.preview, attachment.status === 'missingFile' && styles.broken)}
                style={{
                    cursor: 'pointer',
                }}
                onClick={() => {
                    openPreview({
                        title: attachment.name,
                        content: ({ changeTitle, changeExtra, onClose }) => (
                            <PreviewSlider
                                ref={previewSliderRef}
                                attachments={attachments}
                                current={index}
                                changeTitle={changeTitle}
                                changeExtra={changeExtra}
                                removeFile={removeFile}
                                onClose={onClose}
                                isLocalStorage={isLocalStorage}
                            />
                        ),
                        paperSx: {
                            background: '#333333f2',
                        },
                        onKeyDownCapture: (e) => {
                            if (e.key === 'ArrowRight') {
                                previewSliderRef.current?.next();
                            }
                            if (e.key === 'ArrowLeft') {
                                previewSliderRef.current?.prev();
                            }
                        },
                    });
                }}
            >
                {renderPreview()}
            </div>
        </Tooltip>
    );
};

const DownloadAttachment = ({ attachment, isLocalStorage }: { attachment: Attachment; isLocalStorage?: boolean }) => {
    const [loading, setLoading] = useState(false);

    const url = useMemo(() => {
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

    const download = useCallback(async () => {
        if (url) {
            try {
                setLoading(true);
                const proxyUrl = isLocalStorage ? url : `/download-proxy/${encodeURIComponent(url)}`;
                const response = await fetch(proxyUrl);

                if (!response.ok) {
                    throw new Error('Download failed');
                }

                const blob = await response.blob();

                const link = document.createElement('a');

                const href = URL.createObjectURL(blob);
                link.setAttribute('target', '_blank');
                link.setAttribute('href', href);
                link.setAttribute('download', `${attachment.name}`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(href);
                setLoading(false);
            } catch (error) {
                console.log(error);

                setLoading(false);
            }
        }
    }, [attachment, url, isLocalStorage]);

    return (
        <IconButton
            size="xs"
            type="secondary"
            variant="text"
            loading={loading}
            onClick={() => {
                download();
            }}
        >
            <Icon name="download" />
        </IconButton>
    );
};

interface PreviewSliderProps {
    attachments?: Attachment[];
    current?: number;
    changeTitle: (title: ReactNode) => void;
    changeExtra: (extra: ReactNode) => void;
    removeFile: (attachment: Attachment) => Promise<void>;
    onClose: () => Promise<boolean | void>;
    isLocalStorage?: boolean;
}

interface PreviewSliderRef {
    next: () => void;
    prev: () => void;
}

const PreviewSlider = forwardRef<PreviewSliderRef, PreviewSliderProps>(
    ({ attachments = [], current = 0, changeTitle, changeExtra, removeFile, onClose, isLocalStorage }, ref) => {
        const [slides, setSlides] = useState(attachments);
        const [currentPage, setCurrentPage] = useState(current);
        const slidesRef = useRef(attachments);
        const { t } = useTranslation();

        const removeSlide = useCallback(
            async (target: Attachment, targetIndex: number) => {
                await removeFile(target);

                const newSlides = [...slidesRef.current];
                newSlides.splice(targetIndex, 1);
                slidesRef.current = newSlides;

                setSlides(newSlides);

                if (newSlides.length === 0) {
                    onClose();
                    return;
                }
                const nextPage = targetIndex > newSlides.length - 1 ? 0 : targetIndex;

                setCurrentPage(nextPage);
            },
            [onClose, removeFile],
        );

        const updateSlide = useCallback(
            (target: Attachment, targetIndex: number) => {
                changeTitle(target.name);
                changeExtra(
                    <Space size={12}>
                        <DownloadAttachment attachment={target} isLocalStorage={isLocalStorage} />
                        <IconButton
                            size="xs"
                            type="secondary"
                            variant="text"
                            onClick={async (e) => {
                                e.stopPropagation();
                                removeSlide(target, targetIndex);
                            }}
                        >
                            <Icon name="delete" />
                        </IconButton>
                    </Space>,
                );
            },
            [changeExtra, changeTitle, removeSlide, isLocalStorage],
        );

        useImperativeHandle(ref, () => ({
            next: () => {
                setCurrentPage((prev) => {
                    if (prev + 1 > slidesRef.current.length - 1) {
                        return 0;
                    }
                    return prev + 1;
                });
            },
            prev: () => {
                setCurrentPage((prev) => {
                    if (prev - 1 < 0) {
                        return slidesRef.current.length - 1;
                    }
                    return prev - 1;
                });
            },
        }));

        useEffect(() => {
            const attachment = slides[currentPage];
            if (attachment) {
                updateSlide(attachment, currentPage);
            }
        }, [currentPage, updateSlide, slides]);

        const renderSlide = () => {
            const attachment = slides[currentPage];

            if (attachment) {
                const imgUrl = () => {
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
                };
                const render = () => {
                    if (attachment.status === 'missingFile') {
                        return (
                            <div className={styles.brokenContainer}>
                                <Icon name="attachmentBroken" fontSize={20} />
                            </div>
                        );
                    }
                    if (attachment.type === 'text/csv' || attachment.type === 'csv') {
                        return <CsvViewer url={imgUrl()} />;
                    }
                    if (attachment.type === 'application/pdf' || attachment.type === 'pdf') {
                        return <embed src={imgUrl()} style={{ width: '100%', height: '100%' }} />;
                    }
                    if (
                        attachment.type &&
                        (supportedVideoMIME.indexOf(attachment.type) !== -1 || supportedVideoExtensions.indexOf(attachment.type) !== -1)
                    ) {
                        return <video src={imgUrl()} style={{ width: '100%', height: '100%' }} controls muted autoPlay />;
                    }
                    if (
                        attachment.type &&
                        (supportedImageFileMIME.indexOf(attachment.type) !== -1 ||
                            supportedImageFileExtensions.indexOf(attachment.type) !== -1)
                    ) {
                        return <img src={imgUrl()} />;
                    }
                    return (
                        <Typography variant="SubHeading2" style={{ color: 'var(--color-light-1)' }}>
                            {t('upload_no_preview')}
                        </Typography>
                    );
                };
                return (
                    <div key={attachment.id} className={`${styles.slide}`}>
                        {render()}
                    </div>
                );
            }
            return null;
        };

        return (
            <div className={styles.modalPreview} onClick={(e) => e.stopPropagation()} tabIndex={-1}>
                {renderSlide()}
                <IconButton
                    variant="text"
                    type="secondary"
                    className={clsx(styles.arrow, styles.right)}
                    size={'s'}
                    onClick={() => {
                        setCurrentPage((prev) => {
                            if (prev + 1 > slidesRef.current.length - 1) {
                                return 0;
                            }
                            return prev + 1;
                        });
                    }}
                    sx={{
                        '&:hover, &:focus, &:active': {
                            background: 'transparent',
                        },
                    }}
                >
                    <Icon name="chevronRight" fontSize={56} />
                </IconButton>
                <IconButton
                    variant="text"
                    type="secondary"
                    className={clsx(styles.arrow, styles.left)}
                    size={'s'}
                    onClick={() => {
                        setCurrentPage((prev) => {
                            if (prev - 1 < 0) {
                                return slidesRef.current.length - 1;
                            }
                            return prev - 1;
                        });
                    }}
                    sx={{
                        '&:hover, &:focus, &:active': {
                            background: 'transparent',
                        },
                    }}
                >
                    <Icon name="chevronLeft" fontSize={56} />
                </IconButton>
            </div>
        );
    },
);

export default PreviewItem;
