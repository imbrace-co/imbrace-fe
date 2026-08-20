import { Button } from '@imbrace/ui';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFolderUploadIcon from '@mui/icons-material/DriveFolderUpload';
import { Button as MuiButton, Divider, IconButton, Popover, Typography } from '@mui/material';
import type { AxiosError } from 'axios';
import type { FC, MouseEvent, ReactNode } from 'react';
import { forwardRef, useCallback, useMemo, useState } from 'react';
import type { FileWithPath } from 'react-dropzone';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

import type { BatchInviteProp, FilesType, InviteErrorMessage, InviteMember } from '@/pages/Members/IMember.types';
import { inviteMembers } from '@/services/api/member';
import apiFetch from '@/services/axios/handler';
import { csvToJSON } from '@/utils';
import { errorMessage } from '@/utils/notificationHelper';

import styles from './index.module.scss';

const convertFileSize = (fileSize: number) => {
    const bytes = fileSize;
    const kb = Math.round((fileSize / 1024) * 100) / 100;
    if (bytes < 1024) {
        return `${bytes} Bytes`;
    }
    if (kb > 1024) {
        return `${Math.round((kb / 1024) * 100) / 100} MB`;
    }
    return `${kb} KB`;
};
const CustomDownloadLink = forwardRef<HTMLAnchorElement, { children: ReactNode }>((props, ref) => (
    <a ref={ref} download="member_list_template.csv" {...props}>
        {props.children}
    </a>
));

const BatchInvite: FC<BatchInviteProp> = (props) => {
    const { onFinish } = props;
    const [files, setFiles] = useState<FilesType>([]);
    const { t } = useTranslation();
    const [inviting, setInviting] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [errorMembers, setErrorMembers] = useState<InviteErrorMessage[]>([]);

    const onDrop = useCallback((acceptedFiles: FilesType) => {
        setFiles([...acceptedFiles]);
        setErrorMembers([]);
    }, []);

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
        multiple: false,
        maxFiles: 1,
        onDrop,
        accept: {
            '.csv': [],
        },
    });

    const removeFile = (file: FileWithPath) => () => {
        setFiles([]);
    };

    const onView = (event: MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    const style = useMemo(
        () => [styles.dragndrop, isDragActive ? styles.active : '', isDragReject ? styles.rejected : ''].join(' '),
        [isDragActive, isDragReject],
    );

    const filesItem = files[0] ? (
        <>
            <div key={files[0].path} className={`${styles.previewFile} ${errorMembers.length > 0 ? styles.error : ''}`}>
                <div className={styles.fileDetail}>
                    <span className={styles.fileName}>{files[0].name}</span>
                    <span className={styles.fileSize}>{convertFileSize(files[0].size)}</span>
                </div>
                <div>
                    <IconButton onClick={removeFile(files[0])}>
                        <DeleteIcon />
                    </IconButton>
                </div>
            </div>
            {errorMembers.length > 0 && (
                <div className={styles.errorContainer}>
                    <span>{errorMembers[0].message}</span>
                    <Button variant="text" onClick={onView} text={'View emails'} />
                    <Popover
                        id={'errorEmails'}
                        open={open}
                        anchorEl={anchorEl}
                        onClose={handleClose}
                        anchorOrigin={{
                            vertical: 'center',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'center',
                            horizontal: 'center',
                        }}
                    >
                        <div className={styles.errorEmails}>
                            {errorMembers.map((errorMember) => (
                                <Typography key={errorMember.email}>{errorMember.email}</Typography>
                            ))}
                        </div>
                    </Popover>
                </div>
            )}
        </>
    ) : null;

    const onInvite = async (members: { [key: string]: string }[]) => {
        try {
            setInviting(true);
            await apiFetch(inviteMembers.api, inviteMembers.method, {
                invitations: members,
            });
            onFinish();
            setInviting(false);
        } catch (error) {
            const err = error as AxiosError;
            console.log(error);
            setInviting(false);
            const code = err?.response?.data?.code;
            if (code === 40000 || code === 400) {
                const { message } = err?.response?.data;

                if (message?.error === 'Emails already exist') {
                    const errorRefs = message.refs;
                    setErrorMembers(
                        errorRefs.map((errorMember: InviteMember) => ({
                            ...errorMember,
                            message: message?.error,
                        })),
                    );
                } else if (message?.error) {
                    errorMessage(message.error);
                } else if (typeof message === 'string') {
                    errorMessage(message);
                }
            }
        }
    };

    const onUpload = () => {
        if (files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader> | null) => {
                if (e && e.target) {
                    const members = csvToJSON(e.target.result as string);
                    console.log('members = ', members);
                    console.log(typeof e.target.result);
                    if (members && members.length > 0) {
                        onInvite(members);
                    }
                }
            };
            reader.onerror = (error) => {
                console.log(error);
            };
            reader.readAsText(files[0]);
        }
    };
    return (
        <div className={styles.batchInvite}>
            <div>
                <div className={styles.container}>
                    <div>
                        <span className={styles.heading}>{t('member_add_member_batch_invite_template')}</span>
                    </div>
                    <div>
                        <MuiButton
                            variant="outlined"
                            component={CustomDownloadLink}
                            href="/assets/member_list_template.csv"
                            fullWidth
                            sx={{
                                borderRadius: '10px',
                            }}
                        >
                            {t('member_add_member_batch_invite_template_download')}
                        </MuiButton>
                    </div>
                </div>
                <Divider />
                <div className={styles.container}>
                    <div>
                        <span className={styles.heading}>{t('member_add_member_batch_invite_upload_list')}</span>
                    </div>
                    <div>
                        <div {...getRootProps({ className: style })}>
                            <input {...getInputProps()} />
                            <DriveFolderUploadIcon sx={{ width: 50, height: 50, color: 'var(--color-primary-1)' }} />
                            <p>
                                {isDragActive
                                    ? t('member_add_member_batch_invite_drop_desc')
                                    : t('member_add_member_batch_invite_drag_desc')}
                            </p>
                            <span>{t('member_add_member_batch_invite_accept_file')}</span>
                        </div>
                        {filesItem}
                    </div>
                </div>
            </div>

            <div className={styles.footer}>
                <Button loading={inviting} onClick={onUpload} text={t('member_add_member_batch_invite_upload')} />
            </div>
        </div>
    );
};
export default BatchInvite;
