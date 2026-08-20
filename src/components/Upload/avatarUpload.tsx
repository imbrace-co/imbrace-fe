import clsx from 'clsx';
import type { MouseEvent } from 'react';
import { forwardRef, useMemo } from 'react';

import FileItem from './fileItem';
import styles from './index.module.scss';
import type { AvatarUploadProps, CommonProps } from './types';
import { Icon, IconButton } from '@imbrace/ui';

// eslint-disable-next-line
export const AvatarUpload = forwardRef<HTMLInputElement, AvatarUploadProps & CommonProps>((props, ref) => {
    const {
        onStatusChange,
        uploadRef,
        files,
        removeAttachFile,
        onAttachFile,
        accept,
        disabled,
        onDelete,
        onGetInfo,
        onUpload,
        width = 60,
        height = 60,
        defaultIcon,
        imgProps,
        hideUploadButton,
        removeFile,
        uploadButtonDisplay = 'always',
    } = props;

    const imgUrl = useMemo(() => {
        if (files?.[0]?.url) {
            return files[0].url;
        }
        if (files?.[0]?.file instanceof Blob) {
            const objectUrl = URL.createObjectURL(files[0].file);
            if (objectUrl !== undefined) {
                return objectUrl;
            }
        }
        return undefined;
    }, [files]);

    const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();

        if (imgUrl) {
            if (files?.[0] && removeFile) {
                await removeFile(files[0]);
            }
            if (uploadRef && uploadRef.current) {
                uploadRef.current.value = '';
                const event = new Event('input', {
                    bubbles: true,
                    cancelable: true,
                });

                uploadRef.current.dispatchEvent(event);
            }

            return;
        }
        uploadRef?.current?.click();
    };

    return (
        <div
            className={clsx(styles.avatarContainer, uploadButtonDisplay === 'hover' && styles.hover)}
            style={{ width: `${width}px`, height: `${height}px` }}
        >
            <FileItem
                onUpload={onUpload}
                onDelete={onDelete}
                onGetInfo={onGetInfo}
                attachment={files?.[0]}
                onStatusChange={onStatusChange}
                removeAttachFile={removeAttachFile}
                type="avatar"
                defaultIcon={defaultIcon}
                width={width}
                height={height}
                imgProps={imgProps}
                onClick={(e) => {
                    e.stopPropagation();
                    if (uploadRef && uploadRef.current) {
                        uploadRef.current.click();
                    }
                }}
                disabled={disabled}
            />
            <div className={styles.uploadButtonContainer}>
                {!hideUploadButton && (
                    <IconButton
                        variant="contained"
                        size="s"
                        sx={{
                            borderRadius: '100%',
                            '& .MuiCircularProgress-root': {
                                width: '16px',
                                height: '16px',
                            },
                        }}
                        disabled={disabled}
                        loading={files?.[0]?.status === 'uploading' || files?.[0]?.status === 'deleting'}
                        onClick={handleClick}
                    >
                        {imgUrl ? <Icon name="close" fontSize={16} /> : <Icon name="upload" fontSize={16} />}
                    </IconButton>
                )}
            </div>
            <input
                ref={uploadRef}
                accept={accept ?? 'image/png, image/jpeg, .svg'}
                type="file"
                style={{ display: 'none' }}
                onChange={onAttachFile}
                disabled={disabled}
            />
        </div>
    );
});
