import { Button, Search, Space } from '@imbrace/ui';
import { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
interface RightSideComponentProps {
    globalSearch?: string;
    setGlobalSearch: (value: string) => void;
    currentFilter?: {
        visible: boolean;
        mode: 'filter';
    };
    onAddNew?: () =>void;
    onFilterChange?: (mode: 'filter') => void;
    filterCount?: number;
    tableRef?: RefObject<FlexibleTableRef<API.KnowledgeBaseItem>>;
}

const RightSideComponent = (props: RightSideComponentProps) => {
    const { onAddNew, globalSearch, setGlobalSearch } = props;
    const { t } = useTranslation();

    return (
        <Space size={12}>
             <Search
                value={globalSearch}
                placeholder={t('knowledge_search_folder')}
                onSearch={(val) => setGlobalSearch(val.toLowerCase())}
                onReset={() => setGlobalSearch('')}
                sx={{ width: '48vw' }}
            />
            <Button
                sx={{
                    width: '100%',
                }}
                text={t('knowledge_new_folder')}
                onClick={onAddNew}
            />
        </Space>
    );
};

export default RightSideComponent;
