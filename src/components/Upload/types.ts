import { ButtonProps } from '@imbrace/ui';
import { Direction } from '@imbrace/ui/dist/components/Space';
import type { CSSProperties, FormEvent, ImgHTMLAttributes, ReactNode, RefObject } from 'react';


export type FileStatus = 'ok' | 'pending' | 'uploading' | 'deleted' | 'deleting' | 'validationError' | 'uploadError' | 'missingFile';
export interface Attachment {
    file?: File;
    id: string;
    fileId?: string;
    url?: string;
    status?: FileStatus;
    isValid?: boolean;
    error?: string;
    name?: string;
    size?: number;
    type?: string;
}
export interface UploadBaseProps {
    value?: Attachment[];
    onChange?: (files?: Attachment[]) => void;
    onUpload?: (file: File) => Promise<{ url: string; id: string; name: string }>;
    onDelete?: (fileId: string) => Promise<unknown>;
    onGetInfo?: (fileId: string) => Promise<{ url: string; id: string; name: string }>;
    fileValidation?: (file: File) => Promise<boolean | string>;
    disabled?: boolean;
    multiple?: boolean;
    accept?: string;
    type?: 'list' | 'avatar' | 'input';
}

export interface ListUploadProps {
    /**
     * imbrace button props
     */
    uploadButtonProps?: ButtonProps;
    /**
     * children between files and upload button, usually for the helper text
     */
    children?: ReactNode;

    showFileSize?: boolean;
    type?: 'list';
    direction?: Direction;
    max?: number;
}

export interface AvatarUploadProps {
    type: 'avatar';
    width?: number;
    height?: number;
    defaultIcon?: ReactNode;
    imgProps?: ImgHTMLAttributes<HTMLImageElement>;
    uploadButtonDisplay?: 'always' | 'hover';
    hideUploadButton?: boolean;
}

export interface InputUploadProps {
    type: 'input';
    max?: number;
    rows?: number;
    hint?: string | ReactNode;
    hideAddButton?: boolean;
    customAddButton?: ({ open }: { open: () => void }) => ReactNode;
    addButtonDisplay?: 'always' | 'hover';
    containerClassName?: string;
    containerStyle?: CSSProperties;
    isLocalStorage?: boolean;
}

export interface CommonProps extends Omit<UploadBaseProps, 'value' | 'onChange'> {
    onStatusChange: (payload: {
        id: string;
        fileId?: string;
        status: FileStatus;
        error?: string;
        url?: string;
        size?: number;
        name?: string;
        type?: string;
    }) => void;
    uploadRef: RefObject<HTMLInputElement>;
    files: Attachment[];
    removeAttachFile: (attachmentId: string) => void;
    onAttachFile: (event: FormEvent<HTMLInputElement>) => void;
    removeFile?: (file: Attachment) => Promise<void>;
    onDownload?: (url: string) => void;
}

export type UploadProps = UploadBaseProps & (ListUploadProps | AvatarUploadProps | InputUploadProps);
