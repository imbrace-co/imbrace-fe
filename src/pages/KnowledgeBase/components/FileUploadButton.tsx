import type { ButtonProps } from '@imbrace/ui';
import { Button, Space } from '@imbrace/ui';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch } from '@/redux/store';

export type FileStatus = 'ok' | 'pending' | 'uploading' | 'deleted' | 'deleting' | 'validationError' | 'uploadError' | 'missingFile';

export interface Attachment {
    file: File;
    id: string;
    fileId?: string;
    url?: string;
    status?: FileStatus;
    isValid?: boolean;
    error?: string;
    name?: string;
    size?: number;
}

export interface UploadProps {
    tableRef: RefObject<FlexibleTableRef<API.KnowledgeBaseItem>>;
    /**
     * imbrace button props
     */
    uploadButtonProps?: ButtonProps;
    value?: Attachment[];
    onChange?: (files?: Attachment[]) => void;
    onUpload?: (file: File) => Promise<API.KnowledgeBaseFile[]>;
    onDelete?: (fileId: string) => Promise<unknown>;
    onGetInfo?: (fileId: string) => Promise<{ url: string; id: string; name: string }>;
    fileValidation?: (file: File) => Promise<boolean | string>;
    /**
     * children between files and upload button, usually for the helper text
     */
    children?: ReactNode;
    disabled?: boolean;
    accept?: string;
}

const FileUploadButton = (props: UploadProps) => {
    const {
        tableRef,
        value,
        onChange,
        onUpload,
        // onDelete,
        fileValidation,
        // children,
        uploadButtonProps,
        disabled,
        // onGetInfo,
        accept,
    } = props;

    const dispatch = useAppDispatch();
    // const [loading, setLoading] = useState(false);
    const [files, setFiles] = useState<Attachment[]>(
        value?.map((file) => ({
            ...file,
            ...(!('status' in file) && { status: file.url ? 'ok' : 'pending' }),
        })) || [],
    );
    const uploadRef = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        console.log('files: ', files);
    }, [files]);

    const onAttachFile = useCallback(
        async (event: FormEvent<HTMLInputElement>) => {
            const target = event.currentTarget;
            if (!target.files || target.files.length === 0) {
                return;
            }

            // Create a new array that represents the new state
            let newFiles = [...files];

            // Loop over all selected files
            for (let i = 0; i < target.files.length; i++) {
                const file = target.files[i];

                if (fileValidation) {
                    try {
                        const validationResult = await fileValidation(file);

                        const isValid = typeof validationResult === 'string' ? false : validationResult;
                        if (!isValid) {
                            const notificationPayload = {
                                message: validationResult as string,
                                messageType: 'noti_failed',
                            };
                            dispatch(
                                pushNotification({
                                    notification: notificationPayload,
                                }),
                            );
                        }

                        // If the file is valid, call the onUpload function
                        if (isValid && onUpload) {
                            await onUpload(file);
                            // Handle the upload result here
                            tableRef.current?.refresh();
                        }

                        // Add the new file to the newFiles array
                        newFiles = [
                            ...newFiles,
                            {
                                id: `${newFiles.length}`,
                                file,
                                name: file.name,
                                size: file.size,
                                isValid,
                                error: typeof validationResult === 'string' ? validationResult : undefined,
                                status: !isValid ? 'validationError' : 'pending',
                            },
                        ];
                    } catch (error) {
                        newFiles = [
                            ...newFiles,
                            {
                                id: `${newFiles.length}`,
                                file,
                                name: file.name,
                                size: file.size,
                                isValid: false,
                                error: (error as Error).message,
                                status: 'validationError',
                            },
                        ];
                    }
                } else {
                    console.log('fileValidation: ', fileValidation);
                    newFiles = [
                        ...newFiles,
                        {
                            id: `${newFiles.length}`,
                            file,
                            name: file.name,
                            size: file.size,
                            isValid: true,
                            status: 'pending',
                        },
                    ];
                }
            }

            // Update the state and call onChange with the new state
            setFiles(newFiles);
            onChange?.(newFiles);
        },
        [dispatch, fileValidation, files, onChange, onUpload, tableRef], // Add onUpload to the dependency array
    );

    return (
        <>
            <Space size={8} style={{ width: '100%' }} align="start" direction="vertical">
                <Button
                    type="primary"
                    text={t('knowledge_upload_file')}
                    sx={{
                        gap: '4px',
                    }}
                    {...uploadButtonProps}
                    disabled={disabled}
                    onClick={(e) => {
                        console.log('upload');
                        setFiles([]);
                        uploadRef.current?.click();
                        uploadButtonProps?.onClick?.(e);
                        uploadButtonProps?.onClick?.(e);
                        console.log('uploadButtonProps: ', uploadButtonProps);
                    }}
                />
            </Space>
            <input multiple ref={uploadRef} accept={accept} type="file" onChange={onAttachFile} style={{ display: 'none' }} />
        </>
    );
};

export default FileUploadButton;
