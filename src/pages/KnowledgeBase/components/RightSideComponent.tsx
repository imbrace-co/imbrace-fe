import { Icon, IconButton, Search, Space, Tooltip } from '@imbrace/ui';
import { Badge } from '@mui/material';
import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import { postKnowledgeBaseFile } from '@/services/api/knowledgeBase';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';

import FileUploadButton from './FileUploadButton';

interface RightSideComponentProps {
    globalSearch?: string;
    setGlobalSearch: (value: string) => void;
    currentFilter?: {
        visible: boolean;
        mode: 'filter';
    };
    onFilterChange: (mode: 'filter') => void;
    filterCount?: number;
    tableRef: RefObject<FlexibleTableRef<API.KnowledgeBaseItem>>;
}

const RightSideComponent = (props: RightSideComponentProps) => {
    const { tableRef, globalSearch, setGlobalSearch, onFilterChange, currentFilter, filterCount } = props;
    const { t } = useTranslation();

    const fileValidation = async (file: File) => {
        const acceptedFileTypes = [
            'text/plain', // .txt
            'application/postscript', // .ai
            'image/vnd.adobe.photoshop', // .psd
            'image/gif', // .gif
            'image/jpeg', // .jpeg, .jpg
            'image/tiff', // .tiff, .tif
            'image/svg+xml', // .svg
            'text/csv', // .csv
            'application/msword', // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/pdf', // .pdf
            'image/png', // .png
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        ];

        if (!acceptedFileTypes.includes(file.type)) {
            return t('knowledge_file_type_not_accepted');
        }

        const fileSizeInMB = file.size / (1024 * 1024);
        console.log('fileSizeInMB: ', fileSizeInMB);

        // if (fileSizeInMB > 5) {
        if (fileSizeInMB > 1) {
            console.log('file size exceeds limit');
            return t('knowledge_file_exceeds_limit');
        }

        return true;
    };

    const onUpload = async (file: File) => {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        const { data } = await apiFetch<API.KnowledgeBaseFile[]>(
            postKnowledgeBaseFile.api(),
            postKnowledgeBaseFile.method,
            uploadFormData,
            ImbraceFileUpload,
        );
        // return {
        //     url: `${env.VITE_APP_WCS_HOST}/api/imbrace${downloadMarketPlaceFile.api(data.data.short_path)}`,
        //     id: data.data.id,
        //     name: data.data.name,
        //     size: data.data.size,
        // };
        return data;
    };

    return (
        <Space size={12}>
            <Badge
                badgeContent={filterCount}
                sx={{
                    '& .MuiBadge-badge': {
                        background: 'var(--color-primary-3)',
                        color: 'var(--color-primary-1)',
                        width: '16px',
                        height: '16px',
                        minWidth: '16px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        padding: 0,
                        top: '4px',
                        right: '4px',
                    },
                }}
            >
                <Tooltip arrow title={t('filter')} placement="top">
                    <IconButton
                        sx={{
                            // background: openFilter ? 'var(--color-secondary-2)' : undefined,
                            background: currentFilter?.mode === 'filter' && currentFilter?.visible ? 'var(--color-secondary-2)' : undefined,
                        }}
                        onClick={(e) => {
                            onFilterChange('filter');
                            e.currentTarget.blur();
                        }}
                        type="secondary"
                        variant="text"
                    >
                        <Icon name="filter" />
                    </IconButton>
                </Tooltip>
            </Badge>
            <Search
                value={globalSearch}
                placeholder={t('search')}
                // onSearch={(e) => setGlobalSearch(e.target.value.toLowerCase())}
                onSearch={(val) => setGlobalSearch(val.toLowerCase())}
                onReset={() => setGlobalSearch('')}
                sx={{ width: '248px' }}
            />
            <FileUploadButton
                tableRef={tableRef}
                fileValidation={fileValidation}
                onUpload={onUpload}
                accept=".txt, .ai, .psd, .gif, .jpeg, .tiff, .tif, .svg, .csv, .doc, .docx, .jpg, .jpeg, .pdf, .png, .ppt, .pptx, .xls, .xlsx"
            />
        </Space>
    );
};

export default RightSideComponent;
