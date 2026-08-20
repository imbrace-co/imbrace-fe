import { Button, Illustration, Space, Typography } from '@imbrace/ui';
import { Box, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { AxiosError, AxiosResponse } from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import AutomationContent from '@/pages/Databoards/components/BoardAutomation/components/BrdAutomationContent';
import AutomationList from '@/pages/Databoards/components/BoardAutomation/components/BrdAutomationList';
import BrdContentHeader from '@/pages/Databoards/components/BoardAutomation/components/BrdContentHeader';
import { pushNotification } from '@/redux/slices/notification';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';
import { boardAutomation, postBoardAutomation, updateBoardAutomation } from '@/services/api/boardAutomation';
import { getBoardById } from '@/services/api/crm';
import { ImbraceClient } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import { addLeadingZero } from '@/utils/NumberHelper';

export interface BoardAutomationFormValue {
    name: string;
    description?: string;
    type: 'create' | 'delete' | 'update' | 'scheduled';
    field_id: string;
    workflow_id: string;
    board_id?: string;
    is_paused?: boolean;
    updateNeeded?: boolean;
    organization_id?: string;
    _id?: string;
    trigger_frequency_value: number;
    trigger_frequency_unit: string;
    trigger_day_of_week: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    trigger_day_of_month: string;
    trigger_month_and_day: string;
    trigger_time: string;
    start_datetime: string;
    is_knowledge_base?: boolean;
    folder_ids?: string[];
}

const BoardAutomation = ({
    crm,
    knowledgeHub,
    commsiq,
    documentAi,
    isModal,
    databoardId,
    automationId,
    onRefreshAfterUpdate,
    isDrive,
}: {
    crm?: boolean;
    knowledgeHub?: boolean;
    commsiq?: boolean;
    documentAi?: boolean;
    isModal?: boolean;
    databoardId?: string;
    automationId?: string;
    onRefreshAfterUpdate?: () => void;
    isDrive?: boolean;
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);
    const navigate = useNavigate();
    const { tab: tabParam } = useParams<{ tab: string }>();
    const tab = tabParam ?? databoardId;
    const isDocumentAIRoute = !!documentAi;

    const location = useLocation();
    const { state } = location;
    const { features } = useAccess();
    const { openHelpCenter } = useNavbar();
    const [currentBoard, setCurrentBoard] = useState<API.Board>();
    const [currentContent, setCurrentContent] = useState<API.AutomationWorkflow | 'new' | undefined | 'delete'>();
    const [isLoaded, setIsLoaded] = useState<boolean>(false);
    const [menuType, setMenuType] = useState<'condition' | 'default'>('default');
    const isKnowledgeHub = !!knowledgeHub || currentBoard?.type === 'KnowledgeHub';

    const updateCurrentContent = useCallback(
        (content: API.AutomationWorkflow | 'new' | undefined | 'delete') => {
            setCurrentContent(content);
            if (content && typeof content === 'object' && ['create', 'delete', 'update'].includes(content.type)) {
                setMenuType('condition');
            } else {
                setMenuType('default');
            }
        },
        [],
    );

    const methods = useForm<BoardAutomationFormValue>({
        mode: 'all',
        defaultValues: {},
    });

    const { reset, handleSubmit, setError, setValue, clearErrors } = methods;

    const onFetchBoardById = useCallback(async (boardId: string) => {
        try {
            const { data } = await apiFetch<{ data: API.Board }>(getBoardById.api(boardId), getBoardById.method);
            if (data?.data) {
                setCurrentBoard(data.data);
                setIsLoaded(true);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const onFetchBoardAutomation = useCallback(async () => {
        const boardId = currentBoard?._id || (currentBoard as any)?.id;
        if (!boardId) return;
        try {
            const { data } = await apiFetch<API.AutomationWorkflow[]>(boardAutomation.api(boardId), boardAutomation.method, {}, ImbraceClient);
            if (data?.length > 0) {
                return data
                    .sort((a, b) => (a.is_paused === b.is_paused ? 0 : a.is_paused ? 1 : -1))
                    .sort((a, b) => (a.updateNeeded === b.updateNeeded ? 0 : a.updateNeeded ? 1 : -1));
            }
            if (data.length === 0) {
                return [];
            }
            return [];
        } catch (error) {
            console.error('fetch board automations error: ', error);
            updateCurrentContent(undefined);
            return [];
        }
    }, [currentBoard, updateCurrentContent]);

    const {
        data: automationWorkflows,
        refetch,
        isFetched,
        isSuccess,
        isFetching,
    } = useQuery({
        queryFn: () => onFetchBoardAutomation(),
        queryKey: ['automation', currentBoard?._id || (currentBoard as any)?.id || ''],
        enabled: !!currentBoard,
    });

    const refresh = useCallback(() => {
        refetch();
    }, [refetch]);

    const columnOptions = useMemo(() => {
        if (!currentBoard || !currentBoard.fields) return [];
        return currentBoard.fields.map((field) => {
            const isColumnExisted = automationWorkflows && automationWorkflows.findIndex((item) => item.field_id === field._id) > -1;
            return {
                text: field.name,
                value: field._id,
                disabled: isColumnExisted,
                tooltipText: isColumnExisted ? t('automation_field_column_disabled') : undefined,
            };
        });
    }, [t, automationWorkflows, currentBoard]);

    const currentAutomationId = typeof currentContent === 'object' ? currentContent?._id : undefined;
    const isCreateTypeExisted =
        automationWorkflows && automationWorkflows.filter((item) => !item.is_paused && item._id !== currentAutomationId).findIndex((item) => item.type === 'create') > -1;
    const isDeleteTypeExisted =
        automationWorkflows && automationWorkflows.filter((item) => !item.is_paused && item._id !== currentAutomationId).findIndex((item) => item.type === 'delete') > -1;

    const onPostBoardAutomation = useCallback(
        async (data: BoardAutomationFormValue) => {
            try {
                return (await apiFetch<API.AutomationWorkflow>(
                    postBoardAutomation.api,
                    postBoardAutomation.method,
                    data,
                    ImbraceClient,
                )) as AxiosResponse;
            } catch (error) {
                const err = error as AxiosError;
                console.error('post board automation error: ', err.response);
                if (err.response?.status === 400 && err.response?.data.message.includes('crmboard condition trigger existed')) {
                    setError('type', { message: t('automation_field_duplicated_condition') });
                }
                if (err.response?.status === 400 && err.response?.data.code === 'INVALID_START_DATETIME') {
                    setError('start_datetime', { message: t('error_starting_datetime') });
                }
                return err.response;
            }
        },
        [t, setError],
    );

    const onUpdateBoardAutomation = useCallback(
        async (data: BoardAutomationFormValue, id: string) => {
            const updatedData =
                data.type !== 'update'
                    ? {
                          ...data,
                          field_id: '',
                          _id: id,
                      }
                    : { ...data, _id: id };
            try {
                const res = await apiFetch<API.AutomationWorkflow>(
                    updateBoardAutomation.api(id),
                    updateBoardAutomation.method,
                    updatedData,
                    ImbraceClient,
                );
                onRefreshAfterUpdate?.();
                return res;
            } catch (error) {
                const err = error as AxiosError;
                console.error('update board automation error: ', err.response);
                if (err.response?.status === 400 && err.response?.data.message.includes('data duplicated')) {
                    err.response?.data.fields.forEach((field: Record<'name', 'board_id' | 'field_id' | 'type'>) => {
                        setError(field.name, { message: err.response?.data.message });
                    });
                }
                if (err.response?.status === 400 && err.response?.data.code === 'INVALID_START_DATETIME') {
                    setError('start_datetime', { message: t('error_starting_datetime') });
                }
                if (err.response?.status === 404) {
                    reset(data, { keepDirty: false });
                    const notificationPayload = {
                        message: t('automation_not_found'),
                        messageType: 'noti_failed',
                        variant: 'error',
                    };
                    dispatch(pushNotification({ notification: notificationPayload }));
                    navigate(
                        `/${knowledgeHub ? 'knowledge-hub-all' : commsiq ? 'commsiq' : crm ? 'crm' : documentAi ? 'document-ai' : 'databoards'}`,
                    );
                }
            }
        },
        [setError, dispatch, navigate, t, reset, crm, knowledgeHub, commsiq, documentAi, onRefreshAfterUpdate],
    );

    const resetFormValues = useCallback(
        (formValues: BoardAutomationFormValue) => {
            Object.keys(formValues).forEach((key) => {
                setValue(key as keyof BoardAutomationFormValue, formValues[key as keyof BoardAutomationFormValue], {
                    shouldDirty: state.dirtyState,
                });
            });
        },
        [setValue, state],
    );

    useEffect(() => {
        if (isModal && automationId) {
            const automation = automationWorkflows?.find((item) => item._id === automationId || (item as any).id === automationId);
            if (automation) {
                updateCurrentContent(automation);
                reset(automation);
            }
            return;
        }
        // checks if the state is from the automation workflow page
        if (isSuccess && automationWorkflows && automationWorkflows.length > 0) {
            if (state?.form && state?.from && state?.from.includes('/automations/workflow')) {
                updateCurrentContent(state?.content === 'new' ? 'new' : state.form);
                resetFormValues(state.form);
                // clear the state after setting the form values
                navigate('.', { replace: true, state: {} });
            } else if (currentContent === undefined) {
                updateCurrentContent(automationWorkflows[0]);
                reset(automationWorkflows[0]);
            } else if (currentContent === 'delete') {
                // when user delete an automation
                if (automationWorkflows.length <= 1) {
                    updateCurrentContent(undefined);
                } else {
                    updateCurrentContent(automationWorkflows[1]);
                    reset(automationWorkflows[1]);
                }
            }
        }
        if (state?.form && state?.from && state?.from.includes('/automations/workflow')) {
            updateCurrentContent(state?.content === 'new' ? 'new' : state.form);

            resetFormValues(state.form);
            // clear the state after setting the form values
            navigate('.', { replace: true, state: {} });
        }
    }, [
        resetFormValues,
        isSuccess,
        isFetched,
        reset,
        automationWorkflows,
        currentContent,
        state,
        setValue,
        navigate,
        automationId,
        isModal,
        updateCurrentContent,
    ]);

    useEffect(() => {
        if (state?.board) {
            setCurrentBoard(state.board);
            return;
        }
        if (tab) {
            onFetchBoardById(tab);
            return;
        }
        // navigate(`/${crm ? 'crm' : 'databoards'}`);
    }, [state, tab, onFetchBoardById, navigate, crm]);

    useEffect(() => {
        onFetchBoardAutomation();
    }, [onFetchBoardAutomation]);

    useEffect(() => {
        if (isFetched && currentContent && typeof currentContent === 'object' && currentContent.updateNeeded) {
            if (currentContent.type === 'update') {
                const isMissingField = columnOptions.findIndex((item) => item.value === currentContent.field_id) === -1;
                if (isMissingField) {
                    setError('field_id', {
                        message: t('validation_automation_field_missing'),
                    });
                }
            }
            if (currentContent.workflow_id === '') {
                setError('workflow_id', {
                    message: t('validation_automation_workflow_missing'),
                });
            } else {
                clearErrors('workflow_id');
            }
        }
    }, [isFetched, t, currentContent, columnOptions, setError, clearErrors, isKnowledgeHub]);

    const onSubmit = async (formData: BoardAutomationFormValue) => {
        if (features.workflows({ dataBoardsAutomationOperation: currentContent === 'new' ? 'create' : 'update' })) {
            openUnlockFeature({
                channel: supportChannel,
                touchpoint: supportTouchpoint,
                openHelpCenter: (channelId: string) =>
                    openHelpCenter?.({
                        channelId,
                        prefillMessage: t('unlock_feature_prefill_message'),
                        defaultWebWidget: true,
                    }),
            });
            return;
        }
        if (currentContent && typeof currentContent === 'object') {
            const res = await onUpdateBoardAutomation(
                {
                    ...formData,
                    board_id: currentBoard?._id,
                    ...(isDrive ? { is_knowledge_base: true, folder_ids: formData.folder_ids } : {}),
                },
                currentContent?._id,
            );
            if (res) {
                reset(res.data, { keepErrors: false, keepDirty: false });
                updateCurrentContent(res.data);
            }
            await onFetchBoardAutomation();

            return;
        }
        const postRes = await onPostBoardAutomation({
            ...formData,
            board_id: currentBoard?._id,
            ...(isDrive ? { is_knowledge_base: true, folder_ids: formData.folder_ids } : {}),
        });

        if ((postRes as AxiosResponse).status === 200) {
            await onFetchBoardAutomation();
            reset({}, { keepValues: true, keepDirty: false });
            updateCurrentContent((postRes as AxiosResponse).data);
        }
    };

    const onSaveForm = async () => {
        await handleSubmit(onSubmit)();
        refetch();
    };

    const renderEmpty = useCallback(() => {
        const textTrans = (
            <Trans
                i18nKey="automation_field_empty_result_text"
                components={[
                    <Button
                        variant="link"
                        text={t(isDocumentAIRoute ? 'databoard_create_model_automation' : 'automation_field_empty_result_button_text')}
                        onClick={() => {
                            updateCurrentContent('new');

                            const length = automationWorkflows ? addLeadingZero(automationWorkflows.length + 1) : 1;
                            const name = `${t(isDocumentAIRoute ? 'databoard_model_automation_header' : 'board_automation_header', { name: currentBoard?.name })} ${length}`;
                            reset(
                                {
                                    name,
                                    description: '',
                                    field_id: '',
                                    workflow_id: '',
                                    folder_ids: [],
                                },
                                { keepIsValid: false, keepErrors: false },
                            );
                        }}
                        sx={{
                            display: 'inline-block',
                            padding: '0 0 3px 0',
                            textDecoration: 'underline',
                            ':hover': { textDecoration: 'underline' },
                        }}
                    />,
                ]}
            ></Trans>
        );
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    fontWeight: 600,
                    fontSize: '16px',
                    lineHeight: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Illustration name={'recordMissing'} description={textTrans} />
            </Box>
        );
    }, [t, automationWorkflows, currentBoard, reset, isKnowledgeHub]);

    const renderBoardNotFound = useCallback(() => {
        const content = (
            <Box sx={{ width: '544px', justifyContent: 'center' }}>
                <Box sx={{ marginBottom: '48px' }}>
                    <Typography variant="Heading1" style={{ color: '#010E3C' }}>
                        {t(isDocumentAIRoute ? 'databoard_automation_model_not_found_heading' : 'automation_board_not_found_heading')}
                    </Typography>
                    <Typography variant="SubHeading2Light" style={{ color: '#70778F' }}>
                        {t(isDocumentAIRoute ? 'databoard_automation_model_not_found_body' : 'automation_board_not_found_body')}
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    text={t(isDocumentAIRoute ? 'databoard_automation_back_to_models' : 'automation_back_to_board')}
                    onClick={() =>
                        navigate(
                            `/${isKnowledgeHub ? 'knowledge-hub-all' : commsiq ? 'commsiq' : crm ? 'crm' : documentAi ? 'document-ai' : 'databoards'}`,
                        )
                    }
                    sx={{ margin: '0 auto' }}
                />
            </Box>
        );
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    fontWeight: 600,
                    fontSize: '16px',
                    lineHeight: '24px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Illustration name={'disconnect'} description={content} />
            </Box>
        );
    }, [t, navigate, crm, commsiq, documentAi, isKnowledgeHub, knowledgeHub]);

    const renderLoadingContent = () => {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <CircularProgress size={'25px'} />
            </Box>
        );
    };

    if (isLoaded && currentBoard === undefined) {
        return <>{renderBoardNotFound()}</>;
    }

    return (
        <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%', height: '100%' }}>
                <Space size={0} style={{ width: '100%', height: '100%' }}>
                    {!isModal && (
                        <AutomationList
                            boardName={currentBoard?.name}
                            knowledgeHub={isKnowledgeHub}
                            isDocumentAIRoute={isDocumentAIRoute}
                            isAutomationsLoaded={isFetched}
                            automationWorkflows={automationWorkflows}
                            currentContent={currentContent}
                            setCurrentContent={setCurrentContent}
                            onSaveForm={onSaveForm}
                            refresh={refresh}
                            isDrive={isDrive}
                        />
                    )}

                    {/* Right Panel */}
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            padding: '32px 0 0 0',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <BrdContentHeader currentBoard={currentBoard} currentContent={currentContent} onSave={onSaveForm} />
                        <Box
                            sx={{
                                flex: 1,
                                overflow: 'hidden',
                            }}
                        >
                            {!isFetched && isFetching && renderLoadingContent()}
                            {isSuccess &&
                                automationWorkflows &&
                                automationWorkflows.length === 0 &&
                                currentContent === undefined &&
                                renderEmpty()}
                            {currentContent !== undefined && (
                                <AutomationContent
                                    crm={crm}
                                    knowledgeHub={isKnowledgeHub}
                                    isDocumentAIRoute={isDocumentAIRoute}
                                    currentBoard={currentBoard}
                                    currentContent={currentContent}
                                    columnOptions={columnOptions}
                                    onSaveForm={onSaveForm}
                                    menuType={menuType}
                                    setMenuType={setMenuType}
                                    isCreateTypeExisted={isCreateTypeExisted}
                                    isDeleteTypeExisted={isDeleteTypeExisted}
                                    isDrive={isDrive}
                                />
                            )}
                        </Box>
                    </Box>
                </Space>
            </form>
        </FormProvider>
    );
};
export default BoardAutomation;
