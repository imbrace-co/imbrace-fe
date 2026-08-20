import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';

import FileItem from './fileItem';
import type { CommonProps, ListUploadProps } from './types';
import { Button, Icon, Space, Tooltip } from '@imbrace/ui';

// eslint-disable-next-line
export const ListUpload = forwardRef<HTMLInputElement, ListUploadProps & CommonProps>((props, ref) => {
    const {
        files,
        onUpload,
        onDelete,
        onStatusChange,
        onDownload,
        disabled,
        onGetInfo,
        accept,
        multiple = false,
        children,
        uploadButtonProps,
        showFileSize,
        direction = 'vertical',
        removeAttachFile,
        uploadRef,
        onAttachFile,
        max,
    } = props;

    const { t } = useTranslation();

    const isDisabled = disabled || (typeof max === 'number' && files.length >= max);

    return (
        <>
            <Space size={8} style={{ width: '100%' }} align="start" direction={direction}>
                {direction === 'vertical-reverse' && children}
                {files.map((file) => (
                    <FileItem
                        key={file.id}
                        onUpload={onUpload}
                        onDelete={onDelete}
                        onGetInfo={onGetInfo}
                        onDownload={onDownload}
                        attachment={file}
                        onStatusChange={onStatusChange}
                        removeAttachFile={removeAttachFile}
                        showFileSize={showFileSize}
                    />
                ))}
                {direction !== 'vertical-reverse' && children}
                <Tooltip
                    title={t('error_max_attach_files', {
                        max,
                    })}
                    disableHoverListener={!isDisabled || typeof max !== 'number'}
                    placement="top"
                    arrow
                >
                    <div>
                        <Button
                            variant="link"
                            size="xs"
                            text={t('upload_upload_file_button')}
                            startIcon={<Icon name="add" />}
                            sx={{
                                gap: '4px',
                            }}
                            {...uploadButtonProps}
                            disabled={isDisabled}
                            onClick={(e) => {
                                uploadRef.current?.click();
                                uploadButtonProps?.onClick?.(e);
                            }}
                        />
                    </div>
                </Tooltip>
            </Space>
            <input
                multiple={multiple}
                ref={uploadRef}
                accept={accept}
                type="file"
                onChange={onAttachFile}
                style={{ display: 'none' }}
                disabled={disabled}
            />
        </>
    );
});
