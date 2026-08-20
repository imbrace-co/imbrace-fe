import { Button, Icon, Typography } from '@imbrace/ui';
import { Box, Breadcrumbs, Divider, styled } from '@mui/material';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { useParams } from 'react-router-dom';

import ActionButton from '@/components/ActionButton';
import type { BoardAutomationFormValue } from '@/pages/Databoards/components/BoardAutomation';

interface BreadcrumbProps {
    currentBoard?: API.Board;
    formValues?: BoardAutomationFormValue;
    from?: string;
    content?: API.AutomationWorkflow | 'new' | undefined;
    workflowId?: string;
    backBtnText?: string;
    dirtyState?: boolean;
}

const StyedButton = styled(Button)(() => ({
    color: 'var(--color-light-4)',
    fontSize: '12px',
    fontWeight: 400,
    textTransform: 'capitalize',
    '& svg': {
        width: '12px',
    },
    '&.Mui-selected': {
        color: 'var(--color-light-7)',
    },
    '&:hover': {
        color: 'var(--color-light-7)',
    },
}));

const Breadcrumb = (prop: BreadcrumbProps) => {
    const { backBtnText, currentBoard, formValues, from, content, workflowId, dirtyState } = prop;
    const { pathname } = useLocation();
    const { tab } = useParams<{ tab?: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    let currentLink = '';
    const splitPaths = pathname.split('/').filter((item) => item !== '');
    const rootPath = splitPaths[0]; // e.g. 'databoards' | 'crm' | 'knowledge-hub-all'
    const isKnownRoot = rootPath === 'databoards' || rootPath === 'crm' || rootPath === 'knowledge-hub-all';
    const isKnowledgeHubDriveAutomation =
        splitPaths[0] === 'knowledge-hub-all' &&
        splitPaths[1] === 'drive' &&
        splitPaths.length === 4 &&
        splitPaths[3] === 'automations';
    const crumbs = useMemo(() => {
        if (isKnowledgeHubDriveAutomation) {
            const driveLabel = currentBoard?.name ? `Drive ${currentBoard.name}` : 'Drive';
            return [
                { name: 'drive', link: tab ? `/knowledge-hub-all/drive/${tab}` : '/knowledge-hub-all/drive', displayName: driveLabel },
                { name: 'automations', link: undefined as string | undefined },
            ];
        }
        if (!currentBoard) return [];

        return splitPaths
            .map((crumb, index) => {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                currentLink += `/${crumb}`;
                return {
                    name: currentBoard.id === crumb ? currentBoard.name : crumb,
                    link: index === splitPaths.length - 1 ? undefined : currentLink,
                };
            })
            .slice(1);
    }, [currentBoard, isKnowledgeHubDriveAutomation, tab]);

    const isDocumentAIRoute = rootPath === 'document-ai';
    const breadCrumbNaming = (name: string, index: number) => {
        if (index === 0) {
            return t(isDocumentAIRoute ? 'breadcrumb_model_name' : 'breadcrumb_board_name', { boardName: name });
        }
        if (name === 'automations') {
            return t('breadcrumb_automation_name');
        }
        if (name === 'workflow') {
            return t('breadcrumb_workflow_name');
        }
        return name;
    };

    return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ActionButton
                onClick={() => {
                    // to automation configuration page & persist form values
                    if (formValues && from) {
                        const payload = {
                            state: {
                                form: {
                                    ...formValues,
                                    workflow_id: workflowId ?? formValues.workflow_id,
                                },
                                from: pathname,
                                content,
                                dirtyState: workflowId !== formValues.workflow_id || dirtyState,
                            },
                        };
                        return navigate(from, payload);
                    }
                    // Default back behavior: return to the parent board/folder page depending on current module
                    if (isKnowledgeHubDriveAutomation) {
                        navigate('/knowledge-hub-all');
                        return;
                    }
                    if (tab && isKnownRoot) {
                        navigate(`/${rootPath}/${tab}`);
                        return;
                    }
                    if (isKnownRoot) {
                        navigate(`/${rootPath}`);
                        return;
                    }
                    // Fallback (legacy): databoards
                    navigate(tab ? `/databoards/${tab}` : `/databoards`);
                }}
                type="secondary"
                text={backBtnText || t('back')}
                icon={<Icon name="backIos" fontSize={19} />}
            />

            <Divider orientation="vertical" variant="middle" flexItem sx={{ height: '20px', marginLeft: '12px', marginRight: '12px' }} />
            <Breadcrumbs
                separator={<Icon name="forwardIos" fontSize={16} style={{ margin: '0px 4px', color: 'var(--color-secondary-1)' }} />}
                aria-label="breadcrumb"
                sx={{
                    '& .MuiBreadcrumbs-separator': {
                        marginLeft: 0,
                        marginRight: 0,
                    },
                    '& .MuiButtonBase-root': {
                        fontSize: '12px !important',
                    },
                }}
            >
                {crumbs.map((crumb, index) => {
                    const label = (crumb as { displayName?: string }).displayName ?? breadCrumbNaming(crumb.name, index);
                    if (!crumb.link) {
                        return (
                            <Typography
                                variant={'Caption'}
                                key={crumb.name}
                                style={{
                                    paddingLeft: '4px',
                                    color: 'var(--color-light-7)',
                                    textTransform: 'capitalize',
                                    lineHeight: '20px',
                                }}
                            >
                                {label}
                            </Typography>
                        );
                    }

                    return (
                        <StyedButton
                            key={crumb.name}
                            variant="link"
                            text={label}
                            size="xs"
                            onClick={() => {
                                if (crumb.name === 'automations' && formValues) {
                                    const payload = {
                                        state: {
                                            form: {
                                                ...formValues,
                                                workflow_id: workflowId ?? formValues.workflow_id,
                                            },
                                            from: pathname,
                                            content,
                                            dirtyState: workflowId !== formValues.workflow_id || dirtyState,
                                        },
                                    };
                                    return navigate(`${crumb.link}`, payload);
                                }
                                navigate(`${crumb.link}`);
                            }}
                        />
                    );
                })}
            </Breadcrumbs>
        </Box>
    );
};
export default Breadcrumb;
