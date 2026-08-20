import React, { useEffect } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { Button, FieldText, Space, Typography } from '@imbrace/ui';
import { AIAssistantType } from './type'; // or the corresponding path
import styles from './index.module.scss'; // keep the CSS module file

interface MultiAgentFormDetailProps {
    index: number;
    agentChildData: { data: any; index: number } | null;
    currentAssistantAddNew: string | null;
    isUpdateMissionLoading: boolean;
    isAddNewProgressing: boolean;
    onUpdateInstructions: (assistant_id: string, index: number) => void;
    onAcceptAddNewAgent: (index: number, assistant_id: string | null) => void;
    removeAgent: (index: number) => void;
    setIsOpenAgentForm: (value: boolean) => void;
    t: (key: string) => string;
}

const MultiAgentFormDetail: React.FC<MultiAgentFormDetailProps> = ({
    index,
    agentChildData,
    currentAssistantAddNew,
    isUpdateMissionLoading,
    isAddNewProgressing,
    onUpdateInstructions,
    onAcceptAddNewAgent,
    removeAgent,
    setIsOpenAgentForm,
    t,
}) => {
    const { control, watch, setValue } = useFormContext<AIAssistantType>();
    const isAddNew = watch(`sub_agents.${agentChildData?.index}.is_new`);

    useEffect(() => {
        if (agentChildData?.data?.instructions !== undefined && !isAddNewProgressing) {
            setValue(`sub_agents.${index}.instructions`, agentChildData.data.instructions);
        }
    }, [index, isAddNewProgressing]);

    return (
        <div style={{ padding: '10px 0 20px 0' }} className={styles.childBottomUnset}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                }}
            >
                <Controller
                    name={`sub_agents.${index}.instructions`}
                    control={control}
                    render={({ field }) => (
                        <FieldText
                            fullWidth
                            multiline
                            minRows={6}
                            maxRows={6}
                            sx={{
                                borderRadius: '4px!important',
                                border: '1px solid #156DF2!important',
                                overflow: 'auto!important',
                            }}
                            description={
                                <Typography variant="Body" style={{ color: '#828282', whiteSpace: 'pre-line' }}>
                                    {t('ai_agent_mission_promt')}
                                </Typography>
                            }
                            {...field}
                        />
                    )}
                />
            </div>

            <Space size={8} style={{ width: '100%', justifyContent: 'space-between', marginTop: '15px' }}>
                <Space size={8} style={{ width: '47%', justifyContent: 'space-between' }}>
                    {!isAddNew && (
                        <Button
                            sx={{ width: '48%', height: '40px' }}
                            size="xs"
                            text={t('delete')}
                            type="danger"
                            onClick={() => {
                                removeAgent(index);
                            }}
                        />
                    )}
                    <Button
                        sx={{ width: '48%', height: '40px' }}
                        variant="outlined"
                        size="xs"
                        text={t('cancel')}
                        onClick={() => {
                            if (isAddNew) {
                                removeAgent(index);
                            }
                            setIsOpenAgentForm(false);
                        }}
                    />
                </Space>
                {!watch(`sub_agents.${index}.is_new`) && (
                    <Button
                        sx={{ width: '35%', height: '40px' }}
                        size="xs"
                        text={t('update')}
                        loading={isUpdateMissionLoading}
                        onClick={() => onUpdateInstructions(agentChildData?.data?.assistant_id, index)}
                    />
                )}
                {watch(`sub_agents.${index}.is_new`) && (
                    <Button
                        disabled={!currentAssistantAddNew}
                        sx={{ width: '35%', height: '40px', textTransform: 'uppercase' }}
                        size="xs"
                        text={t('assign')}
                        onClick={() => {
                            onAcceptAddNewAgent(index, currentAssistantAddNew);
                        }}
                    />
                )}
            </Space>
        </div>
    );
};

export default MultiAgentFormDetail;
