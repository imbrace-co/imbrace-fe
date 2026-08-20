import { Space, Typography } from '@imbrace/ui';
import { TFunction } from 'i18next';
import plusIcon from '@/assets/icons/ai_plus.svg';
import FileCloseIcon from '@/assets/icons/knowledge/file_close_icon.svg?react';
import KnowledgeFileImport from '@/pages/AIAssistantManagement/components/KnowledgeUploadFiles';
import assistantStyles from '@/pages/AIAssistantManagement/index.module.scss';
import { Trans } from 'react-i18next';

type FolderLike = { _id: string; name: string };
type BoardLike = { _id: string; name: string; type?: API.BoardType };
type FileLike = { _id: string; name: string };

const KNOWLEDGE_HUB_BOARD_TYPE: API.BoardType = 'KnowledgeHub';

type Props = {
    t: TFunction;
    isAIAgent: boolean;
    translateTextType: { normal: string; capitalize: string };

    folders?: FolderLike[];
    folderSelection?: string[];
    onOpenKnowledgePage: () => void;
    onOpenKnowledgeFolderSelection: () => void;
    onRemoveFolderItem: (folderId: string) => void;
    onOpenFolderListModal?: (folderId: string) => void;

    databoards?: BoardLike[];
    boardSelection?: string[];
    onOpenDataboardPage: () => void;
    onOpenCrmPage?: () => void;
    onOpenDataboardSelection: () => void;
    onRemoveBoardItem: (boardId: string) => void;
    onOpenBoardListModal?: (boardId: string) => void;

    folderDefaultId?: string;
    agentName: string;
    onNavigateToAgentFolder: () => void;

    fileListUpload?: FileLike[];
    onImportSuccess: (folderIdUpdate: string, isFirstUpload: boolean) => void;
    onRemoveFileOutOfFolder: (fileId: string) => void | Promise<boolean>;
};

const linkStyle = {
    color: 'var(--color-primary-1)',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '14px',
    lineHeight: '20px',
};

const assignResourcesRow = (onClick: () => void, label: string) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 8,
            marginBottom: 10,
        }}
        className={assistantStyles.addBoard}
        onClick={onClick}
    >
        <img src={plusIcon} alt="Plus Icon" />
        <span style={{ color: 'var(--color-primary-1)', marginLeft: '5px', fontSize: 12 }}>{label}</span>
    </div>
);

export default function KnowledgeHubV2Section({
    t,
    isAIAgent,
    translateTextType,

    folders,
    folderSelection,
    onOpenKnowledgePage,
    onOpenKnowledgeFolderSelection,
    onRemoveFolderItem,
    onOpenFolderListModal,

    databoards,
    boardSelection,
    onOpenDataboardPage,
    onOpenCrmPage,
    onOpenDataboardSelection,
    onRemoveBoardItem,
    onOpenBoardListModal,

    folderDefaultId,
    agentName,
    onNavigateToAgentFolder,

    fileListUpload,
    onImportSuccess,
    onRemoveFileOutOfFolder,
}: Props) {
    const selectedFolders = (folders || []).filter((folder) => folderSelection?.includes(folder._id));
    const selectedBoardsAll = (databoards || []).filter((board) => boardSelection?.includes(board._id));
    const selectedKnowledgeBoards = selectedBoardsAll.filter((b) => b.type === KNOWLEDGE_HUB_BOARD_TYPE);
    const selectedOtherBoards = selectedBoardsAll.filter((b) => b.type !== KNOWLEDGE_HUB_BOARD_TYPE);
    const assignResourcesLabel = t('ai_assistant_management_knowledge_support_assign_resources');

    const renderResourceRow = (
        item: { _id: string; name: string },
        onRemove: (id: string) => void,
        onOpenModal?: (id: string) => void,
    ) => (
        <Space
            key={item._id}
            direction="horizontal"
            align="start"
            justify="between"
            style={{
                width: '100%',
                padding: '8px 12px',
                background: '#F2F2F2',
                fontSize: 14,
            }}
        >
            <span
                onClick={() => onOpenModal?.(item._id)}
                style={{ cursor: onOpenModal ? 'pointer' : 'default', flex: 1 }}
            >
                {item.name}
            </span>
            <span className={assistantStyles.removeIcon}>
                <FileCloseIcon onClick={() => onRemove(item._id)} />
            </span>
        </Space>
    );

    return (
        <Space direction="vertical" align="start" justify="start" style={{ ...(isAIAgent ? { width: '100%' } : { flex: 2 }) }}>
            {/* Connect Knowledge Hub */}
            <Space align="start" justify="center" style={{ width: '100%' }}>
                <Space direction="vertical" align="start" justify="start" style={{ flex: 1, gap: 'initial!important' }}>
                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                        <Trans
                            i18nKey="ai_assistant_management_knowledge_support_connect_knowledge_hub"
                            components={[<span onClick={onOpenKnowledgePage} style={linkStyle} />]}
                        />
                    </Typography>
                    {assignResourcesRow(onOpenKnowledgeFolderSelection, assignResourcesLabel)}
                    <Space direction="vertical" size={4} align="start" justify="start" style={{ width: '60%', marginTop: 10, maxWidth: '600px' }}>
                        {selectedFolders.map((folder) =>
                            renderResourceRow(folder, onRemoveFolderItem, onOpenFolderListModal),
                        )}
                        {selectedKnowledgeBoards.map((board) =>
                            renderResourceRow(board, onRemoveBoardItem, onOpenBoardListModal),
                        )}
                    </Space>
                </Space>
            </Space>

            {/* Connect Document Models */}
            <Space align="start" justify="center" style={{ width: '100%', marginTop: '7vh' }}>
                <Space direction="vertical" align="start" justify="start" style={{ flex: 1, gap: 'initial!important' }}>
                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                        <Trans
                            i18nKey="ai_assistant_management_knowledge_support_connect_document_models_crm"
                            components={[<span onClick={onOpenDataboardPage} style={linkStyle} />]}
                        />
                    </Typography>
                    {assignResourcesRow(onOpenDataboardSelection, assignResourcesLabel)}
                    <Space direction="vertical" size={4} align="start" justify="start" style={{ width: '60%', marginTop: 10, maxWidth: '600px' }}>
                        {selectedOtherBoards.map((board) =>
                            renderResourceRow(board, onRemoveBoardItem, onOpenBoardListModal),
                        )}
                    </Space>
                </Space>
            </Space>

            {/* Upload file - create Knowledge Folder auto */}
            <Space align="start" justify="center" style={{ width: '100%', marginTop: '7vh' }}>
                <Space direction="vertical" align="start" justify="start" style={{ flex: 1, gap: 'initial!important' }}>
                    <Typography variant="BodyBold" style={{ color: 'var(--color-light-7)' }}>
                        {t('ai_assistant_management_knowledge_support_upload_additional_files')}
                    </Typography>

                    <Typography variant="Body" style={{ color: '#828282', marginTop: 4 }}>
                        They will be saved to your Knowledge Hub under{' '}
                        {folderDefaultId ? (
                            <a
                                onClick={() => onNavigateToAgentFolder()}
                                style={{
                                    color: '#156DF2',
                                    textDecoration: 'underline',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                }}
                            >
                                {agentName} Uploaded Files
                            </a>
                        ) : (
                            <span style={{ fontWeight: 'bold' }}>[{agentName || 'Agent Name'}] Uploaded Files</span>
                        )}
                        .
                    </Typography>

                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginTop: 8,
                            marginBottom: 10,
                        }}
                        className={assistantStyles.addBoard}
                    >
                        <KnowledgeFileImport
                            folderId={folderDefaultId || ''}
                            agentName={agentName}
                            onImportSuccess={(folderIdUpdate, isFirstUpload) => onImportSuccess(folderIdUpdate, isFirstUpload)}
                        />
                    </div>
                    <Space
                        direction="vertical"
                        size={4}
                        align="start"
                        justify="start"
                        style={{ width: '50%', marginTop: 10 }}
                        className={assistantStyles.fileUpload}
                    >
                        {(fileListUpload || []).map((file) => (
                            <Space
                                key={file._id}
                                direction="horizontal"
                                align="start"
                                justify="between"
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    background: '#F2F2F2',
                                    fontSize: 14,
                                }}
                            >
                                <span style={{ flex: 1 }}>{file.name}</span>
                                <span className={assistantStyles.removeIcon}>
                                    <FileCloseIcon
                                        onClick={() => {
                                            onRemoveFileOutOfFolder(file._id);
                                        }}
                                    />
                                </span>
                            </Space>
                        ))}
                    </Space>
                </Space>
            </Space>
        </Space>
    );
}
