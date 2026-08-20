import clsx from 'clsx';
import type { MutableRefObject } from 'react';
import { forwardRef, useCallback, useImperativeHandle } from 'react';
import { Scrollbars } from 'react-custom-scrollbars';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';
import PreviewItem from './previewItem';
import type { Attachment, CommonProps, FileStatus, InputUploadProps } from './types';
import type { UploadFormType } from './uploadForm';
import UploadForm from './uploadForm';
import { Icon, IconButton, ModalHOCProps, Space, Tooltip, useDialog, useModal } from '@imbrace/ui';

interface ExtraProps {
    filesRef: MutableRefObject<Attachment[]>;
    setFiles: (files: Attachment[]) => void;
    onChange?: (files: Attachment[]) => void;
}

export interface InputUploadRef {
    open: () => void;
}

export const InputUpload = forwardRef<InputUploadRef, InputUploadProps & CommonProps & ExtraProps>((props, ref) => {
    const {
        rows = 1,
        hint,
        disabled,
        max,
        files,
        onStatusChange,
        accept,
        multiple,
        removeAttachFile,
        fileValidation,
        filesRef,
        setFiles,
        onChange,
        hideAddButton,
        customAddButton,
        addButtonDisplay = 'always',
        containerClassName,
        containerStyle,
        isLocalStorage,
    } = props;
    const [{ dialogForm }, dialogsHolder] = useDialog();
    const [{ modal }, modalsHolder] = useModal();
    const { t } = useTranslation();

    const onClick = () => {
        if (disabled || (typeof max === 'number' && max - files.length <= 0)) {
            return;
        }
        dialogForm<UploadFormType>({
            title: `${t('upload_attach_files_modal_title')}${typeof max === 'number' ? ` (${files.length}/${max})` : ''}`,
            content: (methods) => (
                <UploadForm
                    methods={methods}
                    max={typeof max === 'number' ? max : undefined}
                    leftAmounts={typeof max === 'number' ? max - files.length : undefined}
                    uploadProps={{
                        fileValidation,
                        accept,
                        multiple,
                    }}
                    hint={hint || t('upload_attach_files_modal_description', { max })}
                />
            ),
            defaultValues: {
                url: '',
                files: [],
            },
            onConfirm: async (data) => {
                filesRef.current = [
                    ...filesRef.current,
                    ...(data.files ? data.files.map((file) => ({ ...file, type: file.file?.type })) : []),
                    ...(data.url
                        ? [
                              {
                                  id: `${filesRef.current.length}`,
                                  name: data.url,
                                  url: data.url,
                                  isValid: true,
                                  status: 'ok' as FileStatus,
                              },
                          ]
                        : []),
                ];
                setFiles(filesRef.current);

                onChange?.(filesRef.current);
                return true;
            },
            onClose: () => {},
            actionsAlign: 'flex-start',
            hideCancelButton: true,
            confirmText: t('upload_attach_files_button'),
            confirmButtonProps: {
                size: 'default',
            },
            showCloseButton: true,
        });
    };

    useImperativeHandle(ref, () => ({
        open: () => {
            onClick();
        },
    }));

    const isDisabled = disabled || (typeof max === 'number' && files.length >= max);

    const openPreview = useCallback(
        (modalProps: ModalHOCProps) => {
            modal(modalProps);
        },
        [modal],
    );

    const renderActions = () => {
        if (hideAddButton) {
            return null;
        }
        if (customAddButton) {
            return <div className={styles.actionContainer}>{customAddButton({ open: onClick })}</div>;
        }
        return (
            <div className={styles.actionContainer}>
                <Tooltip
                    title={t('error_max_attach_files', {
                        max,
                    })}
                    disableHoverListener={!isDisabled || typeof max !== 'number'}
                    placement="top-start"
                    arrow
                >
                    <Space style={{ height: '32px' }} align="center">
                        <IconButton
                            disabled={isDisabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                onClick();
                            }}
                            size={'xs'}
                            variant="text"
                            type="secondary"
                        >
                            <Icon name="add" />
                        </IconButton>
                    </Space>
                </Tooltip>
            </div>
        );
    };

    return (
        <Space
            size={12}
            justify="between"
            align="start"
            className={clsx(
                styles.inputContainer,
                isDisabled && styles.disabled,
                addButtonDisplay === 'hover' && styles.hoverActions,
                containerClassName,
            )}
            style={containerStyle}
            {...(rows > 1 && {
                style: {
                    height: '100%',
                    minHeight: '40px',
                    maxHeight: `${rows * 40 + (rows - 1) * 12}px`,
                },
            })}
        >
            {modalsHolder}
            {dialogsHolder}
            <Scrollbars autoHide autoHeightMax={rows * 30 + (rows - 1) * 3} autoHeight>
                <Space size={[3, 12]} wrap>
                    {files.map((file, index) => (
                        <PreviewItem
                            key={file.id}
                            attachment={file}
                            onStatusChange={onStatusChange}
                            removeAttachFile={removeAttachFile}
                            attachments={files}
                            index={index}
                            openPreview={openPreview}
                            isLocalStorage={isLocalStorage}
                        />
                    ))}
                </Space>
            </Scrollbars>
            {renderActions()}
        </Space>
    );
});
