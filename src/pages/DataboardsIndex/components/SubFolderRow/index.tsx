import { Button, Icon, IconButton, Typography } from '@imbrace/ui';
import { Box, Menu, MenuItem } from '@mui/material';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { SchemaCategory } from '../../types';

interface SubFolderRowProps {
    subFolders: SchemaCategory[];
    activeSubFolderId: string | null;
    onToggle: (id: string) => void;
    onCreate: () => void;
    onRename: (folder: SchemaCategory) => void;
    onDelete: (folder: SchemaCategory) => void;
}

const SubFolderRow = ({
    subFolders,
    activeSubFolderId,
    onToggle,
    onCreate,
    onRename,
    onDelete,
}: SubFolderRowProps) => {
    const { t } = useTranslation();
    const [menu, setMenu] = useState<{ anchor: HTMLElement; folder: SchemaCategory } | null>(null);

    return (
        <Box
            display="flex"
            flexDirection="column"
            gap={1.5}
            py={1.5}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
            {subFolders.length > 0 && (
                <Typography
                    variant="Caption"
                    style={{ color: 'var(--color-light-6)', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                    {subFolders.length} Sub folders
                </Typography>
            )}
            <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                <Box display="flex" alignItems="center" gap={1} sx={{ flexWrap: 'wrap', minWidth: 0 }}>
                    {subFolders.map((folder) => {
                        const active = activeSubFolderId === folder.id;
                        return (
                            <Box
                                key={folder.id}
                                onClick={() => onToggle(folder.id)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    cursor: 'pointer',
                                    pl: 1,
                                    pr: 0.25,
                                    py: 0.5,
                                    borderRadius: 1,
                                    '&:hover': { bgcolor: 'var(--color-light-2)' },
                                }}
                            >
                                <Icon
                                    name="folder"
                                    style={{
                                        fontSize: 22,
                                        color: active ? 'var(--color-primary-1)' : 'var(--color-primary-5)',
                                        flexShrink: 0,
                                    }}
                                />
                                <Typography
                                    variant="Body"
                                    title={folder.name}
                                    style={{
                                        color: 'var(--color-light-7)',
                                        fontWeight: active ? 700 : 500,
                                        whiteSpace: 'nowrap',
                                        maxWidth: 220,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {folder.name}
                                </Typography>
                                <IconButton
                                    size="xs"
                                    variant="text"
                                    type="secondary"
                                    sx={{ flexShrink: 0 }}
                                    onClick={(e: React.MouseEvent<HTMLElement>) => {
                                        e.stopPropagation();
                                        setMenu({ anchor: e.currentTarget, folder });
                                    }}
                                >
                                    <Icon name="moreVert" />
                                </IconButton>
                            </Box>
                        );
                    })}
                </Box>
                <Button
                    variant="text"
                    size="s"
                    startIcon={<Icon name="add" />}
                    text="Sub Folder"
                    onClick={onCreate}
                    sx={{ whiteSpace: 'nowrap', color: 'var(--color-primary-1)', flexShrink: 0 }}
                />
            </Box>

            <Menu
                anchorEl={menu?.anchor ?? null}
                open={Boolean(menu)}
                onClose={() => setMenu(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
            >
                <MenuItem
                    onClick={() => {
                        if (menu) onRename(menu.folder);
                        setMenu(null);
                    }}
                    sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-light-7)', fontFamily: 'inherit' }}
                >
                    {t('rename')}
                </MenuItem>
                <MenuItem
                    onClick={() => {
                        if (menu) onDelete(menu.folder);
                        setMenu(null);
                    }}
                    sx={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-danger-1)', fontFamily: 'inherit' }}
                >
                    {t('delete')}
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default memo(SubFolderRow);
