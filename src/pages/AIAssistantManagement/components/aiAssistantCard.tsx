'use client';
import { Dropdown, DropdownProps, DropdownRef, EllipsisText, Icon, Space, Typography, useDialog } from '@imbrace/ui';
import { QueryObserverResult, RefetchOptions, useMutation } from '@tanstack/react-query';
import { type MouseEvent as ReactMouseEvent, useMemo, useRef } from 'react';
import styles from './index.module.scss';
import { OpenAIAssistant } from './type';
import { postMessage } from '@/utils/postMessage';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChannelIconTypes } from '@imbrace/ui/dist/components/Icon';
import { useTranslation } from 'react-i18next';
import apiFetch from '@/services/axios/handler';
import { deleteAiAssistant } from '@/services/api/ai-assistant';
import { useNotify } from '@/contexts/SnackbarContext';

const AssistantCard = ({
    assistant,
    onRoute,
    refetch,
}: {
    assistant: OpenAIAssistant;
    onRoute: (url: string) => void;
    refetch: (options?: RefetchOptions | undefined) => Promise<QueryObserverResult<OpenAIAssistant[], Error>>;
}) => {
    const dropdownRef = useRef<DropdownRef>(null);
    const searchParams = useSearchParams();
    const router = useNavigate();
    const [{ dialog, dialogForm }, dialogHolder] = useDialog();
    const { t } = useTranslation();
    const { notify } = useNotify();
    const isDialogOpen = useRef(false);

    const onDelete = async () => {
        isDialogOpen.current = true;
        dialog({
            title: `${t('ai_assistant_management_delete')} ${assistant.name}?`,
            content: "If you choose to proceed, you won't be able to undo this action.",
            onConfirm: async () => {
                try {
                    const { data } = await apiFetch<{ deleted: boolean }>(deleteAiAssistant.api(assistant.id), deleteAiAssistant.method);
                    if (data.deleted) {
                        notify({
                            type: 'success',
                            message: `Assistant ${assistant.name} is deleted successfully`,
                        });
                        refetch();
                    }
                    return true;
                } catch (error) {
                    console.log(error);
                    notify({
                        type: 'error',
                        message: `Failed to delete assistant ${assistant.name}`,
                    });
                    return false;
                } finally {
                    isDialogOpen.current = false;
                }
            },
            onClose: () => {
                isDialogOpen.current = false;
            },
            confirmButtonProps: {
                type: 'danger',
                sx: {
                    width: '105px',
                    height: '32px',
                    padding: '0px',
                },
            },
            cancelButtonProps: {
                sx: {
                    width: '105px',
                    height: '32px',
                    padding: '0px',
                },
            },
        });
    };

    const onSelect = async (e: ReactMouseEvent<HTMLLIElement, MouseEvent>, selectedIndex: string) => {
        e.stopPropagation();
        switch (selectedIndex) {
            case 'edit':
                goToEditPage();
                dropdownRef.current?.close();
                break;
            case 'duplicate':
                goToDuplicatePage();
                dropdownRef.current?.close();
                break;
            case 'delete':
                onDelete();
                dropdownRef.current?.close();
                break;
        }
        // dropdownRef.current?.close();
    };

    const assistantMenu = useMemo(() => {
        return [
            {
                text: t('ai_assistant_management_edit_assistant_option'),
                index: 'edit',
            },
            {
                text: t('ai_assistant_management_duplicate_assistant_option'),
                index: 'duplicate',
            },
            { type: 'divider' },
            {
                text: t('ai_assistant_management_delete_assistant_option'),
                index: 'delete',
                textColor: 'var(--color-danger-1)',
            },
        ] as DropdownProps<string>['options'];
    }, [assistant]);

    const goToEditPage = () => {
        if (isDialogOpen.current) return;
        router(`/journey/ai-assistant-management/edit?id=${assistant.id}`);
    };

    const goToDuplicatePage = () => {
        router(`/journey/ai-assistant-management/duplicate?id=${assistant.id}`);
    };

    return (
        <Space onClick={goToEditPage} size={8} direction="vertical" justify="between" className={styles.formCard}>
            {dialogHolder}
            <Space size={12} justify="between" align="start" style={{ width: '100%' }}>
                <Space size={4} direction="vertical" align="start" justify="start" style={{ color: 'var(--color-light-7)' }}>
                    <EllipsisText
                        element={
                            <Typography
                                variant="SubHeading2Tight"
                                style={{
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                }}
                            />
                        }
                        text={assistant.name}
                        whiteSpace="pre-wrap"
                    />
                    <EllipsisText
                        element={
                            <Typography
                                variant="BodyTight"
                                style={{
                                    color: '#828282',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    WebkitLineClamp: 2,
                                    display: '-webkit-box',
                                    WebkitBoxOrient: 'vertical',
                                }}
                            />
                        }
                        text={assistant.description}
                        whiteSpace="pre-wrap"
                    />
                </Space>
                <Dropdown
                    buttonSx={{
                        marginTop: '-4px',
                    }}
                    ref={dropdownRef}
                    icon={<Icon style={{ color: '#156DF2', transform: 'rotate(90deg)' }} name="more" />}
                    variant="text"
                    hideArrow
                    options={assistantMenu}
                    onSelect={onSelect}
                />
            </Space>
            {assistant.channel && (
                <Space
                    justify="start"
                    align="center"
                    style={{
                        width: '100%',
                        position: 'absolute',
                        bottom: 80,
                        right: -22,
                    }}
                >
                    <Icon
                        style={{ width: '24px', height: '24px' }}
                        name={`${assistant.channel}` as ChannelIconTypes['name']}
                        fontSize={24}
                        namespace="channel"
                    />
                    <Typography style={{ color: '#828282' }} variant="BodyTight">
                        {t(`channel_${assistant.channel}`)} Integration Selected
                    </Typography>
                </Space>
            )}
            <Space wrap style={{ width: '100%' }}>
                {assistant.category &&assistant.category.map((category) => (
                    <span
                        style={{
                            color: '#333333',
                            fontSize: '12px',
                            padding: '4px 12px',
                            borderRadius: '30px',
                            backgroundColor: '#FEE5C5',
                        }}
                        key={category}
                    >
                        {category}
                    </span>
                ))}
            </Space>
        </Space>
    );
};

export default AssistantCard;
