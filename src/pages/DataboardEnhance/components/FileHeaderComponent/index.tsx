import { Button, Dropdown, DropdownMenu, DropdownMenuItem, DropdownRef, FieldText, Icon, Search, Space, useDialog } from '@imbrace/ui';

import plusIcon from '@/assets/icons/ai_plus.svg';
import FolderIcon from '@/assets/icons/folder_icon.svg?react';
import FolderNewIcon from '@/assets/icons/folder_bold_icon.svg?react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './index.module.scss';
import { Box } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { Folder, SOURCE_TYPE } from '@/pages/KnowledgeHub';
import apiFetch from '@/services/axios/handler';
import { deleteKnowledgeHubFolder, postKnowledgeHubFolder, putKnowledgeHubFolderById } from '@/services/api/knowledgeHub';
import { AxiosError } from 'axios';
import { slugifySegment, unslugify } from '@/utils/commonHelper';
import { getCookie } from 'typescript-cookie';
import FolderSettingForm from './folderSetting';
import ThreeDotsIcon from '@/assets/icons/icon_three_dots.svg?react';
import { FolderSetting } from '@/pages/KnowledgeHub/components/FolderSetting';
import { useNotify } from '@/contexts/SnackbarContext';

interface FileHeaderComponentProps {
    globalSearch?: string;
    setGlobalSearch: (value: string) => void;
    currentFilter?: {
        visible: boolean;
        mode: 'filter';
    };
    subFolders: Array<Folder>;
    subFolderSelected?: number | null;
    /** slug-path → folderId map built from all folders fetched once at mount */
    folderSlugMap: Record<string, string>;
    isSyncedDriveFolder: boolean;
    onOpenImportArea?: () => void;
    addNewSubFolder?: (folderName: string) => void;
    removeSubFolderConfirmed?: (id: string) => void;
    updateSubFolderName?: (folder: Folder) => void;
    setFolderSelected?: (folderSelected: number | null) => void;
    currentFolder?: Folder;
    currentFolderId?: string;
}

const FileHeaderComponent = (props: FileHeaderComponentProps) => {
    const {
        onOpenImportArea,
        globalSearch,
        setGlobalSearch,
        updateSubFolderName,
        addNewSubFolder,
        removeSubFolderConfirmed,
        subFolders,
        subFolderSelected,
        folderSlugMap,
        setFolderSelected,
        isSyncedDriveFolder,
        currentFolder,
    } = props;
    const location = useLocation();
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const { t } = useTranslation();
    const menuRef = useRef<DropdownRef>(null);
    const [{ dialogForm, dialog }, dialogsHolder] = useDialog();
    const navigate = useNavigate();
    const { notify } = useNotify();
    const [isCopied, setIsCopied] = useState(false);

    const {
        control,
        getValues,
        reset,
        formState: { isDirty, isValid },
        handleSubmit,
        setValue,
    } = useForm<Folder>({
        defaultValues: {
            name: t('knowledge_folder_name'),
            description: 'sub folder',
            organization_id: getCookie('org_id'),
            parent_folder_id: '',
            source_type: SOURCE_TYPE.UPLOAD,
            tags: [],
            auto_tagging: false,
        },
    });

    const basePrefix = '/knowledge-hub-all/drive';
    const mainDirectoryPath = '/knowledge-hub-all';

    const folderSegments = segments.slice(2);
    const breadcrumbItems = [
        { path: mainDirectoryPath, label: t('knowledge_folder_main_directory'), folderId: '' },
        ...folderSegments.map((seg, idx) => {
            const slugPath = folderSegments
                .slice(0, idx + 1)
                .map(slugifySegment)
                .join('/');
            const realId = folderSlugMap[slugPath] || '';
            const pathOnly = `${basePrefix}/${folderSegments.slice(0, idx + 1).join('/')}`;
            return {
                path: realId ? `${pathOnly}?fId=${realId}` : pathOnly,
                pathOnly,
                label: unslugify(seg),
                folderId: realId,
            };
        }),
    ];

    const folderMenuOptions = useCallback(() => {
        return [
            {
                text: t('settings'),
                index: 'setting',
                textColor: '#333',
            },
            {
                text: t('Automation'),
                index: 'automation',
                textColor: '#333',
            },
            {
                text: t('crm_share_link'),
                index: 'share_link',
                textColor: '#333',
            },
            {
                text: t('delete'),
                index: 'remove',
                textColor: 'var(--color-danger-1)',
            },
        ];
    }, [t]);

    const openSubFolderForm = useCallback(
        (isEditMode: boolean, folder: Folder | null) => {
            dialog({
                title: '',
                content: ({ onClose }) => {
                    return (
                        <FolderSettingForm
                            control={control}
                            getValues={getValues}
                            folder={folder}
                            isEditMode={isEditMode}
                            onClose={() => onClose?.()}
                            addNewSubFolder={addNewSubFolder}
                            updateSubFolderName={updateSubFolderName}
                            t={t}
                        />
                    );
                },
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                paperSx: {
                    maxWidth: 735,
                    width: 735,
                    '>div:first-child': {
                        padding: '12px 12px 0!important',
                    },
                },
                paperOnClick: (e) => {
                    e.stopPropagation();
                },
            });
        },
        [t, dialog],
    );

    const openFolderSettingModify = useCallback(
        (folderId: string) => {
            dialog({
                title: t(''),
                paperSx: {
                    width: '80%',
                    maxWidth: '800px',
                    '>div': {
                        padding: '0 2.5vw 2.5vw 2.5vw!important',
                    },
                    '>div:first-child': {
                        padding: '15px 15px 0!important',
                    },
                },
                content: ({ onClose }) => {
                    return (
                        <FolderSetting onClose={() => onClose?.()} isEditMode={true} folderId={folderId} refetchKnowledgeList={() => {}} />
                    );
                },
                hideCancelButton: true,
                hideConfirmButton: true,
                showCloseButton: true,
                actionsAlign: 'flex-start',
            });
        },
        [dialog, t],
    );

    const onMenuSelect = useCallback(
        async (selectedIndex: string, folder: Folder) => {
            const onConfirmRemoveFolder = (folderToRemove: string, isCurrent?: boolean) => {
                dialog({
                    title: t('knowledge_are_you_sure_you_want_to_delete_this_folder'),
                    content: t('noti_warning_delete_item'),
                    confirmButtonProps: {
                        type: 'danger',
                    },
                    actionsAlign: 'flex-end',
                    onConfirm: async () => {
                        if (isCurrent) {
                            try {
                                await apiFetch(deleteKnowledgeHubFolder.api(), deleteKnowledgeHubFolder.method, { ids: [folderToRemove] });
                                const parentIndex = breadcrumbItems.length - 2;
                                const parentItem = parentIndex >= 0 ? breadcrumbItems[parentIndex] : null;
                                const parentPath = parentItem?.path || '/knowledge-hub-all';
                                navigate(parentPath, { state: { folderId: parentItem?.folderId } });
                            } catch (error) {
                                console.error('Delete Folder Error: ', error);
                            }
                        } else {
                            removeSubFolderConfirmed?.(folderToRemove);
                        }
                    },
                    onClose: () => {},
                });
            };

            const isCurrent = folder._id === currentFolder?._id;

            switch (selectedIndex) {
                case 'setting':
                    try {
                        const isSubFolder = folder.parent_folder_id && folder.parent_folder_id !== 'root';
                        if (isSubFolder) {
                            reset({ name: folder.name });
                            openSubFolderForm(true, folder);
                        } else {
                            openFolderSettingModify(folder._id || '');
                        }
                    } catch (error) {
                        console.log(error);
                    }
                    menuRef.current?.close();
                    break;
                case 'share_link':
                    try {
                        const domain = window.location.origin;
                        // Build pretty URL (slug path) + ?fId so the link is readable AND self-sufficient
                        const folderPath = folder?.path?.split('/').map(slugifySegment).join('/');
                        const shareUrl = `${domain}/knowledge-hub-all/drive${folderPath}?fId=${folder._id}`;

                        await setIsCopied(true);
                        navigator.clipboard.writeText(shareUrl);
                        notify({
                            type: 'success',
                            message: t('copied_to_clipboard'),
                        });
                        setTimeout(() => {
                            setIsCopied(false);
                        }, 1000);
                    } catch (error) {
                        console.log(error);
                    }
                    menuRef.current?.close();
                    break;
                case 'remove':
                    try {
                        onConfirmRemoveFolder(folder._id || '', isCurrent);
                    } catch (error) {
                        console.log(error);
                    }
                    menuRef.current?.close();
                    break;
                case 'automation':
                    navigate(`/knowledge-hub-all/drive/${folder._id}/automations`, {
                        state: {
                            board: {
                                _id: folder._id,
                                id: folder._id,
                                name: folder.name,
                                type: 'KnowledgeHub',
                                fields: [],
                            },
                        },
                    });
                    menuRef.current?.close();
                    break;
                default:
                    break;
            }
        },
        [
            dialog,
            currentFolder,
            openFolderSettingModify,
            reset,
            openSubFolderForm,
            t,
            navigate,
            removeSubFolderConfirmed,
            notify,
            breadcrumbItems,
        ],
    );

    return (
        <Space size={12} direction="vertical" style={{ width: '100%' }}>
            {dialogsHolder}
            <Space size={12} direction="horizontal" style={{ width: '100%' }}>
                {breadcrumbItems.map((item, index) => {
                    // Check if this item starts a "Drives > [id] > Root" sequence
                    const isDriveSequence =
                        index <= breadcrumbItems.length - 3 &&
                        breadcrumbItems[index].label === 'Drives' &&
                        breadcrumbItems[index + 2]?.label === 'Root';

                    // Skip rendering if this item is part of a drive sequence (but not the first item)
                    if (index > 0 && breadcrumbItems[index - 1]?.label === 'Drives' && breadcrumbItems[index + 1]?.label === 'Root') {
                        return null; // Skip the ID item
                    }
                    if (index > 1 && breadcrumbItems[index - 2]?.label === 'Drives' && breadcrumbItems[index]?.label === 'Root') {
                        return null; // Skip the Root item
                    }

                    const fullPath = item.path;
                    const displayName = item.label;

                    // If this is a "Drives" item that starts a sequence, combine the three items
                    if (isDriveSequence) {
                        const driveId = breadcrumbItems[index + 1].label;
                        const combinedLabel = `${displayName} > ${driveId} > Root`;
                        const rootItem = breadcrumbItems[index + 2];
                        const rootPath = rootItem.path;
                        const isLastItem = index + 2 === breadcrumbItems.length - 1;

                        return (
                            <span key={index} style={{ fontSize: 14, marginBottom: '2vh', marginLeft: index === 0 ? 0 : -7 }}>
                                {isLastItem ? (
                                    <span style={{ fontWeight: 800, color: 'var(--color-light-8)' }}>{combinedLabel}</span>
                                ) : (
                                    <>
                                        <Link
                                            to={rootPath}
                                            state={{ folderId: rootItem?.folderId }}
                                            style={{ color: 'var(--color-primary-1)' }}
                                        >
                                            {combinedLabel}
                                        </Link>
                                        {' >'}
                                    </>
                                )}
                            </span>
                        );
                    }

                    return (
                        <span key={index} style={{ fontSize: 14, marginBottom: '2vh', marginLeft: index === 0 ? 0 : -7 }}>
                            {index < breadcrumbItems.length - 1 ? (
                                <Link to={fullPath} state={{ folderId: item.folderId }} style={{ color: 'var(--color-primary-1)' }}>
                                    {displayName}
                                </Link>
                            ) : (
                                <span key={index} style={{ fontWeight: 800, color: 'var(--color-light-8)' }}>
                                    {displayName}
                                </span>
                            )}

                            {index < breadcrumbItems.length - 1 && ' >'}
                        </span>
                    );
                })}
            </Space>
            <Space size={12} style={{ width: '100%', display: 'flex', fontSize: 14, justifyContent: 'space-between', marginBottom: '1vh' }}>
                <label style={{ color: 'var(--color-secondary-3)' }}>
                    {subFolders?.length > 0
                        ? subFolders?.length === 1
                            ? `1 ${t('knowledge_sub_folder')}`
                            : t('knowledge_count_sub_folder', { count: subFolders.length })
                        : `0 ${t('knowledge_sub_folder')}`}
                </label>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        ...(isSyncedDriveFolder && {
                            opacity: 0.7,
                            color: 'grey',
                        }),
                    }}
                    className={!isSyncedDriveFolder ? styles.addSubFolder : ''}
                    onClick={() => {
                        if (isSyncedDriveFolder) return;
                        setValue('name', '');
                        openSubFolderForm(false, null);
                    }}
                >
                    <img src={plusIcon} alt="Plus Icon" />

                    <span style={{ color: 'var(--color-primary-1)', marginLeft: '5px', fontWeight: 800 }}>{t('knowledge_sub_folder')}</span>
                </div>
            </Space>
            <Space size={12} style={{ width: '100%', display: 'flex', fontSize: 14, marginBottom: '2vh', flexWrap: 'wrap' }}>
                {subFolders?.map((item, index) => {
                    return (
                        <div
                            key={item._id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginRight: 80,
                            }}
                            onClick={() => {
                                const folderPath = item?.path?.split('/').map(slugifySegment).join('/');
                                const fIdParam = item._id ? `?fId=${item._id}` : '';
                                navigate(`${basePrefix}${folderPath}${fIdParam}`, {
                                    replace: true,
                                    state: { folderId: item._id, folderName: item.name },
                                });
                            }}
                            onMouseEnter={() => setFolderSelected?.(index)}
                            onMouseLeave={() => setFolderSelected?.(null)}
                            className={styles.subFolder}
                        >
                            {subFolderSelected === index ? <FolderNewIcon /> : <FolderIcon />}
                            <span style={{ color: 'var(--color-light-7)', marginLeft: '15px' }}>{item.name}</span>
                            {!isSyncedDriveFolder && (
                                <Dropdown
                                    className={`${styles.cardDropdown} ${
                                        subFolderSelected === index ? styles.showFolderSetting : styles.hideFolderSetting
                                    }`}
                                    icon={<Icon style={{ color: 'var(--color-light-5)' }} name="more" />}
                                    variant="text"
                                    hideArrow
                                    options={folderMenuOptions()}
                                    onSelect={(e, selectedIndex) => {
                                        e.stopPropagation();
                                        onMenuSelect(selectedIndex as string, item);
                                    }}
                                    ref={menuRef}
                                />
                            )}
                        </div>
                    );
                })}
            </Space>

            <Space size={12} style={{ display: 'flex', width: '100%' }}>
                <Search
                    value={globalSearch}
                    placeholder={t('knowledge_search_files')}
                    onSearch={(val) => setGlobalSearch(val.toLowerCase())}
                    onReset={() => setGlobalSearch('')}
                    sx={{ flex: 1 }}
                />
                <Button
                    sx={{
                        width: '200px',
                    }}
                    text={t('knowledge_import_files')}
                    onClick={onOpenImportArea}
                    disabled={isSyncedDriveFolder}
                />
                {currentFolder && <MoreMenu options={folderMenuOptions()} onSelect={(index) => onMenuSelect(index, currentFolder)} />}
            </Space>
        </Space>
    );
};

const MoreMenu = ({ options, onSelect }: { options: any[]; onSelect: (index: string) => void }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const anchorRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <Button
                ref={anchorRef}
                size="xxs"
                sx={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-primary-1)',
                    backgroundColor: '#fff',
                    '& svg path': {
                        fill: 'var(--color-primary-1) !important',
                    },
                    '&:hover': {
                        backgroundColor: 'var(--color-primary-7)',
                        borderColor: 'var(--color-primary-1)',
                    },
                }}
                startIcon={<ThreeDotsIcon />}
                onClick={() => setMenuOpen(true)}
            />
            <DropdownMenu
                open={menuOpen}
                onClose={() => setMenuOpen(false)}
                anchorEl={anchorRef.current}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
            >
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.index}
                        onClick={() => {
                            onSelect(option.index);
                            setMenuOpen(false);
                        }}
                        sx={{
                            color: option.textColor,
                            '&:hover': {
                                backgroundColor: 'var(--color-grey-3)',
                            },
                        }}
                    >
                        {option.text}
                    </DropdownMenuItem>
                ))}
            </DropdownMenu>
        </>
    );
};

export default FileHeaderComponent;
