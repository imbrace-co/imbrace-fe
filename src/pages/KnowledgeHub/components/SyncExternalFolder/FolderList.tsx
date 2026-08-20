import { Button } from '@imbrace/ui';
import React, { useState, useMemo } from 'react';

export type FolderSync = {
    id: string;
    name: string;
};

const FolderList = ({ folders, syncFolders }: { folders: FolderSync[], syncFolders: (folders: Array<FolderSync>) => void }) => {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const onSelectFolders = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredFolders = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return folders.filter((folder) => folder.name.toLowerCase().includes(lowerTerm));
    }, [searchTerm, folders]);

    return (
        <div>
            <div style={{ marginBottom: '16px' }}>
                <strong>Selected Folders:</strong>
                {folders
                    .filter(item => selectedIds.includes(item.id))
                    .map(item =>
                        <div key={item.id}>{item.name}</div>
                    )}
                <Button
                    sx={{
                        width: '49%',
                        background: 'var(--color-light-1)!important',
                        borderRadius: '4px',
                    }}
                    type='primary'
                    variant="outlined"
                    text={'Sync Folders'}
                    onClick={() => syncFolders(
                        folders
                            .filter(item => selectedIds.includes(item.id))

                    )}
                />
            </div>
            <input
                type="text"
                placeholder="Search folder"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    marginBottom: '16px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                }}
            />

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {filteredFolders.map((item) => (
                    <label key={item.id} style={{ display: 'block', marginBottom: '8px' }}>
                        <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => onSelectFolders(item.id)}
                        />
                        {item.name}
                    </label>
                ))}
                {filteredFolders.length === 0 && <div>No folder found</div>}
            </div>
        </div>
    );
};

export default FolderList;
