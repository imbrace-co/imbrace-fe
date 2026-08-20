import { useMutation } from '@tanstack/react-query';
import { uniqueId } from 'lodash';
import type { FormEvent, RefObject } from 'react';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import invariant from 'tiny-invariant';

import { AvatarUpload } from './avatarUpload';
import type { InputUploadRef } from './inputUpload';
import { InputUpload } from './inputUpload';
import { ListUpload } from './listUpload';
import type { Attachment, FileStatus, UploadProps } from './types';

export const Upload = forwardRef<HTMLInputElement | InputUploadRef, UploadProps>((props, ref) => {
    const { value, onChange, onUpload, onDelete, fileValidation, type = 'list', disabled, onGetInfo, accept, multiple = false } = props;
    const max = 'max' in props ? props.max : undefined;

    const [files, setFiles] = useState<Attachment[]>(
        value?.map((file) => ({
            ...file,
            ...(!('status' in file) && { status: file.url ? 'ok' : 'pending' }),
        })) || [],
    );
    const filesRef = useRef<Attachment[]>(
        value?.map((file) => ({
            ...file,
            ...(!('status' in file) && { status: file.url ? 'ok' : 'pending' }),
        })) || [],
    );
    const uploadRef = useRef<HTMLInputElement>(null);

    const removeAttachFile = useCallback(
        (attachmentId: string) => {
            const fileIndex = filesRef.current.findIndex((file) => file.id === attachmentId);
            if (fileIndex !== -1) {
                const newFiles = [...filesRef.current];
                newFiles.splice(fileIndex, 1);
                filesRef.current = newFiles;
                setFiles(newFiles);
                onChange?.(newFiles);
            }
        },
        [onChange],
    );

    const deleteFile = useMutation({
        mutationKey: ['deleteFile'],
        mutationFn: async (fileId: string) => {
            if (onDelete) {
                await onDelete(fileId);
                return true;
            }
            return true;
        },
        onMutate: (fileId: string) => {
            if (fileId) {
                onStatusChange({ id: fileId, status: 'deleting' });
            }
        },
        onSuccess: (data, fileId: string) => {
            if (fileId) {
                onStatusChange({ id: fileId, status: 'deleted' });
            }
        },
        onError: (error, fileId) => {
            if (fileId) {
                onStatusChange({ id: fileId, status: 'deleted', error: error.message });
            }
        },
    });

    const removeFile = useCallback(
        async (file: Attachment) => {
            try {
                if (deleteFile.isIdle && file.status === 'ok') {
                    await deleteFile.mutateAsync(file.fileId || file.id);
                }
                removeAttachFile(file.id);
            } catch (error) {
                console.log(error);

                removeAttachFile(file.id);
            }
        },
        [deleteFile, removeAttachFile],
    );

    const onAttachFile = useCallback(
        async (event: FormEvent<HTMLInputElement>) => {
            const target = event.currentTarget;
            if (!target.files || target.files.length === 0) {
                return;
            }

            if (type === 'avatar') {
                // avatar only allow one file at a time
                if (files?.[0]) {
                    await removeFile(files[0]);
                }
            }

            // convert FileList to Array
            let filesList = Array.from(target.files);

            // const file = target.files[0];
            if (uploadRef && uploadRef.current) {
                uploadRef.current.value = '';
                const inputEvent = new Event('input', {
                    bubbles: true,
                    cancelable: true,
                });

                uploadRef.current.dispatchEvent(inputEvent);
            }

            if (typeof max === 'number') {
                if (files.length >= max) {
                    return;
                }
                if (files.length + filesList.length > max) {
                    const leftAmounts = max - files.length;
                    filesList = filesList.slice(0, leftAmounts);
                }
            }
            // if fileValidation
            if (fileValidation) {
                const validationResults = await Promise.all(
                    filesList.map((file) => {
                        try {
                            return fileValidation(file);
                        } catch (error) {
                            return (error as Error).message;
                        }
                    }),
                );
                // Validate find and catch error

                filesList.forEach((file, index) => {
                    const validationResult = validationResults[index];

                    const isValid = typeof validationResult === 'boolean' ? validationResult : false;

                    filesRef.current = [
                        ...filesRef.current,
                        {
                            id: `${uniqueId('imbrace-upload')} - ${filesRef.current.length}`,
                            file,
                            name: file.name,
                            size: file.size,
                            isValid,
                            error: typeof validationResult === 'string' ? validationResult : undefined,
                            status: !isValid ? 'validationError' : 'pending',
                        },
                    ];
                });

                setFiles(filesRef.current);

                onChange?.(filesRef.current);

                return;
            }

            // if not fileValidation
            filesList.forEach((file) => {
                filesRef.current = [
                    ...filesRef.current,
                    {
                        id: `${uniqueId('imbrace-upload')} - ${filesRef.current.length}`,
                        file,
                        name: file.name,
                        size: file.size,
                        isValid: true,
                        status: 'pending',
                    },
                ];
            });
            setFiles(filesRef.current);

            onChange?.(filesRef.current);
        },
        [fileValidation, files, onChange, type, removeFile, max],
    );

    const onStatusChange = useCallback(
        (
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
            silent = false,
        ) => {
            const { id, status, error, fileId, url, size, name, type: fileType } = payload;
            const fileIndex = filesRef.current.findIndex((file) => file.id === id);

            if (fileIndex !== -1) {
                const newFiles = [...filesRef.current];
                newFiles[fileIndex] = {
                    ...newFiles[fileIndex],
                    status,
                    error,
                    fileId,
                    url,
                    size,
                    type: fileType,
                    name: name || newFiles[fileIndex].name,
                };
                filesRef.current = newFiles;
                setFiles(newFiles);
                if (!silent) {
                    onChange?.(newFiles);
                }
            }
        },
        [onChange],
    );

    useEffect(() => {
        if (value) {
            setFiles(
                value?.map((file) => ({
                    ...file,
                    ...(!('status' in file) && { status: file.url ? 'ok' : 'pending' }),
                })),
            );
            filesRef.current = value?.map((file) => ({
                ...file,
                ...(!('status' in file) && { status: file.url ? 'ok' : 'pending' }),
            }));
        }
    }, [value]);

    if (type === 'list') {
        invariant(props.type === 'list' || typeof props.type === 'undefined', 'type is not list');

        return (
            <ListUpload
                files={files}
                onStatusChange={onStatusChange}
                uploadRef={uploadRef}
                onAttachFile={onAttachFile}
                accept={accept}
                multiple={multiple}
                disabled={disabled}
                onUpload={onUpload}
                onDelete={onDelete}
                onGetInfo={onGetInfo}
                removeAttachFile={removeAttachFile}
                max={max}
                {...props}
            />
        );
    }

    if (type === 'avatar') {
        invariant(props.type === 'avatar', 'type is not avatar');

        return (
            <AvatarUpload
                onStatusChange={onStatusChange}
                uploadRef={uploadRef}
                files={files}
                removeAttachFile={removeAttachFile}
                onAttachFile={onAttachFile}
                accept={accept}
                disabled={disabled}
                removeFile={removeFile}
                {...props}
                type="avatar"
            />
        );
    }

    if (type === 'input') {
        invariant(props.type === 'input', 'type is not input');

        return (
            <InputUpload
                ref={ref as RefObject<InputUploadRef>}
                disabled={disabled}
                max={max}
                files={files}
                onStatusChange={onStatusChange}
                accept={accept}
                multiple={multiple}
                removeAttachFile={removeAttachFile}
                fileValidation={fileValidation}
                filesRef={filesRef}
                setFiles={setFiles}
                onChange={onChange}
                uploadRef={uploadRef}
                onAttachFile={onAttachFile}
                {...props}
                type="input"
            />
        );
    }
    return null;
});
