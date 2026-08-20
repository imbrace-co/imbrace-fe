import { Button, Search, Space, Tabs, useDialog } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import debounce from 'lodash/debounce';
import type { RefObject, SyntheticEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import type { FlexibleTableRef } from '@/components/FlexibleTable/types';
import PageLayout from '@/components/PageLayout';
import EmailTemplateFormV2 from '@/pages/Templates/emailTemplateForm';
import type { EmailTemplatePayload } from '@/pages/Templates/emailTemplates';
import { handleCreateEmailTemplate } from '@/pages/Templates/emailTemplates';
import MessageTemplateForm, { handleCreateMessageTemplate } from '@/pages/Templates/messageTemplateForm';
import { useAppSelector } from '@/redux/store';

// Toggle to re-show the Email Template tab in the future (hidden, not deleted).
const SHOW_EMAIL_TEMPLATE_TAB = false;

export interface PageLayoutChildrenProps {
    headerWidth?: number;
    headerHeight?: number;
    scrollableNodeRef?: RefObject<HTMLDivElement>;
    globalSearch?: string;
    field: 'title' | 'content' | 'all';
    tableRef: RefObject<FlexibleTableRef<API.MessageTemplate | API.EmailTemplate>>;
}
export interface MessageTemplatePayload {
    title: string;
    text: string;
    template_language: string;
    category: string;
}

const Container = (props: PageLayoutChildrenProps) => {
    return <Outlet context={props} />;
};

const Templates = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { pathname } = useLocation();

    const tableRef = useRef<FlexibleTableRef<API.MessageTemplate | API.EmailTemplate>>(null);
    const [currentTab, setCurrentTab] = useState<'message' | 'email'>(pathname.indexOf('email') === -1 ? 'message' : 'email');
    const [globalSearch, setGlobalSearch] = useState<string>();
    const [searchInput, setSearchInput] = useState<string>();
    const [field, setField] = useState<'title' | 'content' | 'all'>('title');
    const [{ dialogForm }, dialogHolder] = useDialog();
    const businessId = useAppSelector((state) => state.BusinessUnit.businessUnitList)[0]?.id;

    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const action = queryParams.get('action');
    let prevIsOpenTemplate = false;

    useEffect(() => {
        setCurrentTab(pathname.indexOf('email') === -1 ? 'message' : 'email');
    }, [pathname]);

    const onSearchDebounce = debounce((searchText) => {
        setGlobalSearch(searchText);
    }, 300);

    const onResetSearchInput = useCallback(() => {
        onSearchDebounce('');
        setSearchInput('');
    }, [onSearchDebounce]);

    const createMessageTemplate = useMutation({
        mutationFn: handleCreateMessageTemplate,
    });

    const openCreateNewMsgTemplates = useCallback(() => {
        dialogForm<MessageTemplatePayload>({
            title: t('add_dialog_new_sample_message'),
            content: (methods) => <MessageTemplateForm methods={methods} />,
            onConfirm: async (formData) => {
                await createMessageTemplate.mutateAsync({ formData, businessId: businessId });
                tableRef.current?.refresh();

                return true;
            },
            onClose: () => {},
            defaultValues: {
                title: '',
                category: '',
                template_language: i18n.language,
                text: '',
            },
            hideCancelButton: true,
            confirmText: t('create'),
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            paperSx: {
                width: 500,
                maxWidth: 500,
            },
            showCloseButton: true,
        });
    }, [dialogForm, i18n, t, createMessageTemplate, businessId]);

    useEffect(() => {
        if (action === 'openMessageAddNew' && !prevIsOpenTemplate) {
            prevIsOpenTemplate = true;
            openCreateNewMsgTemplates();
        }
    }, [prevIsOpenTemplate]);

    const createEmailTemplate = useMutation({
        mutationFn: handleCreateEmailTemplate,
    });

    const openCreateNewEmailTemplates = useCallback(() => {
        dialogForm<EmailTemplatePayload>({
            title: t('journey_new_email_template'),
            content: (methods) => <EmailTemplateFormV2 methods={methods} />,
            onConfirm: async (formData) => {
                // Clean up the content
                if (formData.content && formData.content.content) {
                    // Remove multiple trailing <p><br></p> tags
                    formData.content.content = formData.content.content.replace(/(<p><br><\/p>)+$/, '');
                }
                await createEmailTemplate.mutateAsync({ formData });
                tableRef.current?.refresh();

                return true;
            },
            onClose: () => {},

            hideCancelButton: true,
            confirmText: t('create'),
            actionsAlign: 'flex-start',
            confirmButtonProps: {
                size: 'default',
            },
            paperSx: {
                width: 832,
                maxWidth: 832,
            },
            showCloseButton: true,
        });
    }, [createEmailTemplate, dialogForm, t]);

    const renderMessageTemplatesExtra = useCallback(() => {
        return (
            <Space size={12}>
                <Search
                    queryKey={['search-range', i18n.language]}
                    requestFn={async () => {
                        return [
                            { text: t('message_templates_search_title'), value: 'title' },
                            { text: t('message_templates_search_content'), value: 'content' },
                            { text: t('message_templates_search_title_and_content'), value: 'all' },
                        ];
                    }}
                    defaultSelectValue="title"
                    value={searchInput}
                    onSearch={(inputValue, selectedValue) => {
                        setField(selectedValue as 'title' | 'content' | 'all');
                        setSearchInput(inputValue);
                        onSearchDebounce(inputValue);
                    }}
                    onReset={onResetSearchInput}
                    fullWidth
                    placeholder={t('search')}
                    sx={{
                        width: '440px',
                    }}
                />
                <Button
                    text={t('create_new')}
                    onClick={() => {
                        openCreateNewMsgTemplates();
                    }}
                    sx={{
                        padding: '10px 32px',
                    }}
                />
            </Space>
        );
    }, [i18n, t, onSearchDebounce, onResetSearchInput, searchInput, openCreateNewMsgTemplates]);

    const renderEmailTemplatesExtra = useCallback(() => {
        return (
            <Space size={12}>
                <Search
                    queryKey={['search-range', i18n.language]}
                    requestFn={async () => {
                        return [
                            { text: t('message_templates_search_title'), value: 'title' },
                            { text: t('message_templates_search_content'), value: 'content' },
                            { text: t('message_templates_search_title_and_content'), value: 'all' },
                        ];
                    }}
                    defaultSelectValue="title"
                    value={searchInput}
                    onSearch={(inputValue, selectedValue) => {
                        setField(selectedValue as 'title' | 'content' | 'all');
                        setSearchInput(inputValue);
                        onSearchDebounce(inputValue);
                    }}
                    onReset={onResetSearchInput}
                    fullWidth
                    placeholder={t('search')}
                    sx={{
                        width: '440px',
                    }}
                />
                <Button
                    text={t('create_new')}
                    onClick={() => {
                        openCreateNewEmailTemplates();
                    }}
                    sx={{
                        padding: '10px 32px',
                    }}
                />
            </Space>
        );
    }, [i18n, t, onSearchDebounce, onResetSearchInput, searchInput, openCreateNewEmailTemplates]);

    const renderExtra = useCallback(() => {
        return (
            <Space size={12}>
                <Box
                    sx={{
                        flex: 1,
                        borderBottom: '1px solid var(--color-light-3)',
                    }}
                >
                    <Tabs
                        tabs={[
                            {
                                value: 'message',
                                label: t('message_templates'),
                            },
                            ...(SHOW_EMAIL_TEMPLATE_TAB
                                ? [
                                      {
                                          value: 'email',
                                          label: t('email_templates'),
                                      },
                                  ]
                                : []),
                        ]}
                        currentTab={currentTab}
                        onChange={(e: SyntheticEvent, tabValue: any) => {
                            e.stopPropagation();
                            if (tabValue === 'message') {
                                navigate('/templates');
                            }
                            if (tabValue === 'email') {
                                navigate(`/templates/${tabValue}`);
                            }
                        }}
                    />
                </Box>
                {currentTab === 'message' ? renderMessageTemplatesExtra() : renderEmailTemplatesExtra()}
            </Space>
        );
    }, [currentTab, navigate, renderEmailTemplatesExtra, renderMessageTemplatesExtra]);

    return (
        <PageLayout title={t('menu_templates')} extra={renderExtra()}>
            {dialogHolder}
            <Container tableRef={tableRef} globalSearch={globalSearch} field={field} />
        </PageLayout>
    );
};

export default Templates;
