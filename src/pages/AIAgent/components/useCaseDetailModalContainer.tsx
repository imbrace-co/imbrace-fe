import { Box, Dialog } from '@mui/material';
import React from 'react';

import type { UseCaseProps } from './UseCaseItem';
import UseCaseItemDetail from './UseCaseItemDetail';

import styles from './useCaseDetail.module.scss';
import { AI_TYPE } from '../index';
import DocumentAIItemDetail from './DocumentAI/DocumentAIItemDetail';
import { useNavBar } from '@/contexts/NavBarContext';

const DetailModalContainer: React.FC<{
    item?: UseCaseProps;
    isOpen: boolean;
    handleClose: () => void;
    setSelectedItem: (item: UseCaseProps) => void;
    refetchTemplateList: () => Promise<UseCaseProps[] | undefined>;
    refetchDocumentAIList: () => Promise<UseCaseProps[] | undefined>;
    selectedType: AI_TYPE;
}> = (props: {
    item?: UseCaseProps;
    isOpen: boolean;
    handleClose: () => void;
    setSelectedItem: (item: UseCaseProps) => void;
    refetchTemplateList: () => Promise<UseCaseProps[] | undefined>;
    refetchDocumentAIList: () => Promise<UseCaseProps[] | undefined>;
    selectedType: AI_TYPE;
}) => {
    const { item, isOpen, handleClose, setSelectedItem, refetchTemplateList, refetchDocumentAIList, selectedType } = props;
    const { isSmallNavBar } = useNavBar();

    return (
        <Dialog
            open={isOpen}
            onClose={handleClose}
            fullScreen
            PaperProps={{
                sx: {
                    maxHeight: '100% !important',
                    borderRadius: 0,
                    justifyContent: 'start',
                    width: `calc(100vw - ${isSmallNavBar ? 60 : 208}px)`,
                    left: `${isSmallNavBar ? 60 : 208}px`,
                },
            }}
            className={styles.dialogContainer}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ flex: 1, overflowY: 'auto' }}>
                    {selectedType === AI_TYPE.AGENT && (
                        <UseCaseItemDetail
                            onClose={handleClose}
                            item={item as UseCaseProps}
                            setSelectedItem={setSelectedItem}
                            refetchTemplateList={refetchTemplateList}
                            agentType={selectedType}
                        />
                    )}
                    {selectedType === AI_TYPE.DOCUMENT_AI && (
                        <DocumentAIItemDetail
                            onClose={handleClose}
                            item={item as UseCaseProps}
                            setSelectedItem={setSelectedItem as (item: any) => void}
                            refetchDocumentAIList={refetchDocumentAIList}
                        />
                    )}
                </Box>
            </Box>
        </Dialog>
    );
};

export default DetailModalContainer;
