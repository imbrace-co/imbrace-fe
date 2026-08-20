'use client';
import { Button, Space, Spin, Tabs, Typography } from '@imbrace/ui';
import { useAIAssistantForm, AIAssistantManagementTab } from '../useAIAssistantFormHook';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTransition } from 'react';
import styles from './index.module.scss';
import { getIsAllowModify } from '@/utils/CookiesHelper';

export const AIAssistantForm = ({ isDuplicate, id }: { id?: string; isDuplicate?: boolean }) => {
    const backToListAIAssistant = () => {
        router(`/journey/ai-assistant-management`);
    };
    const isAllowModify = getIsAllowModify();

    const {
        formMethods,
        renderBasicTab,
        renderBehaviorTab,
        renderKnowledgeHubTab,
        renderAdvancedTab,
        onSubmit,
        setTab,
        isPending,
        loading,
        tab,
        dialogHolder,
        isEditMode,
        isDirty,
        isValid,
        handleSubmit,
        exitForm,
    } = useAIAssistantForm({ id, isDuplicate, onBack: backToListAIAssistant });

    const { t } = useTranslation();
    const router = useNavigate();

    const renderActionButtons = () => {
        const buttonContainerStyle = {
            position: 'fixed' as const,
            bottom: 0,
            right: 0,
            left: 0,
            padding: '16px 32px',
            borderTop: '1px solid #E0E0E0',
            zIndex: 10,
            backgroundColor: '#FFFFFF',
        };

        if (tab === AIAssistantManagementTab.Basics) {
            return (
                <Space justify="end" style={buttonContainerStyle}>
                    <Button
                        onClick={async () => {
                            if (isDirty) {
                                exitForm();
                            } else {
                                backToListAIAssistant();
                            }
                        }}
                        sx={{ width: '160px', padding: 0 }}
                        variant="outlined"
                        text={t('ai_assistant_management_back_to_menu')}
                    />
                    <Button
                        onClick={() => {
                            if (isEditMode) {
                                return handleSubmit((data) => onSubmit())();
                            }
                            setTab(AIAssistantManagementTab.Behavior);
                        }}
                        disabled={isEditMode ? !isValid || loading || !isDirty : false}
                        sx={{ width: '160px' }}
                        variant="contained"
                        text={isEditMode ? t('save') : t('next')}
                    />
                </Space>
            );
        }
        if (tab === AIAssistantManagementTab.Behavior) {
            return (
                <Space justify="end" style={buttonContainerStyle}>
                    <Button
                        onClick={() => {
                            setTab(AIAssistantManagementTab.Basics);
                        }}
                        sx={{ width: '160px' }}
                        variant="outlined"
                        text={t('back')}
                    />
                    <Button
                        onClick={() => {
                            if (isEditMode) {
                                return handleSubmit((data) => onSubmit())();
                            }
                            setTab(AIAssistantManagementTab.Knowledge);
                        }}
                        disabled={isEditMode ? !isValid || loading || !isDirty : false}
                        sx={{ width: '160px' }}
                        variant="contained"
                        text={isEditMode ? t('save') : t('next')}
                    />
                </Space>
            );
        }
        if (tab === AIAssistantManagementTab.Knowledge) {
            return (
                <Space justify="end" style={buttonContainerStyle}>
                    <Button
                        onClick={() => {
                            setTab(AIAssistantManagementTab.Behavior);
                        }}
                        sx={{ width: '160px' }}
                        variant="outlined"
                        text={t('back')}
                    />
                    <Button
                        onClick={() => {
                            if (isEditMode) {
                                return handleSubmit((data) => onSubmit())();
                            }
                            setTab(AIAssistantManagementTab.Advanced);
                        }}
                        disabled={isEditMode ? !isValid || loading || !isDirty : false}
                        sx={{ width: '160px' }}
                        variant="contained"
                        text={isEditMode ? t('save') : t('next')}
                    />
                </Space>
            );
        }
        if (tab === AIAssistantManagementTab.Advanced) {
            return (
                <Space justify="end" style={buttonContainerStyle}>
                    <Button
                        onClick={() => {
                            setTab(AIAssistantManagementTab.Knowledge);
                        }}
                        sx={{ width: '160px' }}
                        variant="outlined"
                        text={t('back')}
                    />
                    <Button
                        loading={loading}
                        disabled={!isValid || loading || !isDirty}
                        onClick={() => {
                            handleSubmit((data) => onSubmit())();
                        }}
                        sx={{ width: '160px' }}
                        variant="contained"
                        text={isDuplicate || !isEditMode ? t('create') : t('save')}
                    />
                </Space>
            );
        }
    };

    return (
        <Spin isSpinning={isPending || loading}>
            {dialogHolder}
            <Space size={0} direction="vertical" align="stretch" style={{ height: '100vh' }}>
                {/* Fixed header section */}
                <Space
                    size={0}
                    direction="vertical"
                    align="stretch"
                    style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        backgroundColor: '#FFFFFF',
                    }}
                >
                    <Space
                        justify="between"
                        align="end"
                        style={{
                            marginBottom: '16px',
                            marginTop: '32px',
                            marginLeft: '32px',
                            marginRight: '32px',
                            backgroundColor: '#FFFFFF',
                        }}
                    >
                        <Controller
                            name="name"
                            control={formMethods.control}
                            render={({ field: { value } }) => <Typography variant="Heading2">{value}</Typography>}
                        />
                    </Space>
                    <Tabs
                        tabs={[
                            {
                                label: (
                                    <Typography style={{ fontWeight: 500, fontSize: '16px' }}>{`1. ${t(
                                        'ai_assistant_management_basic_info',
                                    )}`}</Typography>
                                ),
                                value: AIAssistantManagementTab.Basics,
                            },
                            {
                                label: (
                                    <Typography style={{ fontWeight: 500, fontSize: '16px' }}>{`2. ${t(
                                        'ai_assistant_management_behavior_setting',
                                    )}`}</Typography>
                                ),
                                value: AIAssistantManagementTab.Behavior,
                            },
                            {
                                label: (
                                    <Typography style={{ fontWeight: 500, fontSize: '16px' }}>{`3. ${t('ai_assistant_management_knowledge_support')}`}</Typography>
                                ),
                                value: AIAssistantManagementTab.Knowledge,
                            },
                            {
                                label: (
                                    <Typography style={{ fontWeight: 500, fontSize: '16px' }}>{`4. Advanced Settings`}</Typography>
                                ),
                                value: AIAssistantManagementTab.Advanced,
                            },
                        ]}
                        value={tab}
                        onChange={(_event, value) => setTab(value as AIAssistantManagementTab)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            borderBottom: '1px solid #E0E0E0',
                            paddingLeft: '32px',
                            marginRight: '32px',
                        }}
                    />
                </Space>

                {/* Scrollable content section */}
                <Space
                    size={0}
                    direction="vertical"
                    align="stretch"
                    style={{
                        marginTop: '12px',
                        paddingBottom: '80px',
                        height: 'calc(100vh - 120px)',
                        overflowY: 'auto',
                        backgroundColor: '#FFFFFF',
                    }}
                    className={isAllowModify ? '' : styles.viewOnly}
                >
                    {tab === AIAssistantManagementTab.Basics && renderBasicTab()}
                    {tab === AIAssistantManagementTab.Behavior && renderBehaviorTab()}
                    {tab === AIAssistantManagementTab.Knowledge && renderKnowledgeHubTab()}
                    {tab === AIAssistantManagementTab.Advanced && renderAdvancedTab()}
                </Space>
                {renderActionButtons()}
            </Space>
        </Spin>
    );
};
