import { boardsQueryKey } from '@/services/queries/board';
import { boardsQueryFn } from '@/services/queries/board';
import { Space, Typography, Button, FieldSelect } from '@imbrace/ui';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IconBoardLinking from '@/assets/icons/icon_board_linking.svg?react';

interface SelectBoardProps {
    onNext: (selectedBoardId: string, selectedBoardType: string, isCurrentBoardTypeChanged: boolean) => void;
    knowledgeHub?: boolean;
    crm?: boolean;
    currentBoard: API.Board;
}

export const SelectBoard = ({ onNext, knowledgeHub, crm, currentBoard }: SelectBoardProps) => {
    const refInitialBoardType = useRef<string>(knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards');
    const { t } = useTranslation();
    const [boardType, setBoardType] = useState<string>(knowledgeHub ? 'knowledge-hub' : crm ? 'crm' : 'databoards');
    const [boardId, setBoardId] = useState<string>(currentBoard._id);


    return (
        <Space direction="vertical" align="start" justify="start" style={{ width: '100%' }}>
            <Typography>Which board would you like to import the new data into?</Typography>
            <Space align="start" direction="vertical" justify="start" style={{ width: '100%', marginTop: '6px' }}>
                <Typography variant="BodyBold" color="text.secondary">
                    Existing board
                </Typography>
                <FieldSelect
                    fullWidth
                    value={boardType}
                    queryKey={['boardType']}
                    request={() => [
                        {
                            text: 'CRM',
                            value: 'crm',
                        },
                        {
                            text: 'Data Board',
                            value: 'databoards',
                        },
                        {
                            text: 'Knowledge Hub',
                            value: 'knowledge-hub',
                        },
                    ]}
                    onChange={(value) => {
                        if (value) {
                            setBoardType(value);
                        }
                    }}
                    popoverProps={{
                        disablePortal: false,
                    }}
                />
                <Space justify="start" style={{ width: '100%', alignItems: 'baseline', marginBottom: '12px' }}>
                    <IconBoardLinking />
                    <FieldSelect
                        value={boardId}
                        fullWidth
                        queryKey={boardsQueryKey({
                            isDefault: boardType === 'knowledge-hub' ? undefined : boardType === 'crm',
                            types: boardType === 'knowledge-hub' ? 'KnowledgeHub' : undefined,
                        })}
                        request={boardsQueryFn({
                            isDefault: boardType === 'knowledge-hub' ? undefined : boardType === 'crm',
                            types: boardType === 'knowledge-hub' ? 'KnowledgeHub' : undefined,
                        })}
                        querySelect={(boards: API.Board[]) => {
                            return boards.map((option) => ({
                                value: option._id,
                                text: option.name,
                            }));
                        }}
                        onChange={(value) => {
                            if (value) {
                                setBoardId(value);
                            }
                        }}
                    />
                </Space>
                <Button text={t('next')} onClick={() => onNext(boardId, boardType, boardType !== refInitialBoardType.current)} />
            </Space>
        </Space>
    );
};
