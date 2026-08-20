import { CircularProgress } from '@mui/material';
import { wrapUseRoutes } from '@sentry/react';
import type { ReactElement } from 'react';
import { lazy, Suspense, useCallback, useMemo } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useRoutes } from 'react-router-dom';

import { env } from '@/env';
import useAccess from '@/hooks/useAccess';

// import KnowledgeBase from '@/pages/KnowledgeBase';
import { useAppSelector } from '@/redux/store';

import styles from './index.module.scss';

const PrivateLayout = lazy(() => import('./PrivateLayout'));

const Analytics = lazy(() => import('@/pages/Analytics'));
const Campaign = lazy(() => import('@/pages/Campaign'));
const TouchpointOperation = lazy(() => import('@/pages/Campaign/components/TouchpointOperation'));
const Channels = lazy(() => import('@/pages/Channels'));
const ChannelMindMap = lazy(() => import('@/pages/Channels/components/MindMap'));
// const Contact = lazy(() => import('@/pages/Contact'));
const Credentials = lazy(() => import('@/pages/Credentials'));
const AddNewCredentials = lazy(() => import('@/pages/Credentials/AddNewCredentials'));
const Databoards = lazy(() => import('@/pages/Databoards'));
const DataboardsIndex = lazy(() => import('@/pages/DataboardsIndex'));
const Overview = lazy(() => import('@/pages/Databoards/overview'));
const OnBoardingDataboards = lazy(() => import('@/pages/OnBoarding/Databoards'));
const BoardAutomation = lazy(() => import('@/pages/Databoards/components/BoardAutomation'));
const AutomationWorkflow = lazy(() => import('@/pages/Databoards/components/BoardAutomation/components/BrdAutomationWorkflow'));
const KnowledgeHubAll = lazy(() => import('@/pages/KnowledgeHubAll'));
const Dashboard = lazy(() => import('@/pages/Conversations'));
const AIAgent = lazy(() => import('@/pages/AIAgent'));
const InternalAIChat = lazy(() => import('@/pages/InternalAIChat'));
const AITracing = lazy(() => import('@/pages/AITracing'));
const WorkflowV2 = lazy(() => import('@/pages/WorkflowV2'));
const ApiMonitor = lazy(() => import('@/pages/ApiMonitor'));

const OnBoardingConversations = lazy(() => import('@/pages/OnBoarding/Conversations'));
const OutsideRedirectConversation = lazy(() => import('@/pages/OnBoarding/OutsideRedirectConversation'));
const Members = lazy(() => import('@/pages/Members'));
const LLMProvider = lazy(() => import('@/pages/LLMProvider'));
const External = lazy(() => import('@/pages/External'));
const MessageTemplateList = lazy(() => import('@/pages/MessageTemplate'));
const WorkflowFrame = lazy(() => import('@/pages/N8n'));
const Executions = lazy(() => import('@/pages/N8n/executions'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const Otp = lazy(() => import('@/pages/Otp'));
const Verification = lazy(() => import('@/pages/Otp/Verification'));
const SignIn = lazy(() => import('@/pages/SignIn'));
const ForgotPassword = lazy(() => import('@/pages/SignIn/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/SignIn/ResetPassword'));
const SignUp = lazy(() => import('@/pages/SignUp'));
const EmailVerified = lazy(() => import('@/pages/SignUp/components/EmailVerified'));
const EmailVerifiedWithError = lazy(() => import('@/pages/SignUp/components/EmailVerifiedWithError'));
const Unauthorized404 = lazy(() => import('@/pages/SignUp/components/Unauthorized'));
const Templates = lazy(() => import('@/pages/Templates'));

const WebWidget = lazy(() => import('@/pages/WebWidget'));
// const Workflow = lazy(() => import('@/pages/Workflow'));
const WorkflowList = lazy(() => import('@/pages/WorkflowList'));
const Start = lazy(() => import('@/pages/Start'));
const EmailTemplateList = lazy(() => import('@/pages/Templates/emailTemplates'));
const GeneralMessageTemplateList = lazy(() => import('@/pages/Templates/messageTemplates'));
const DeveloperPortal = lazy(() => import('@/pages/DeveloperPortal'));
const BoardSchema = lazy(() => import('@/pages/BoardSchema'));
const BoardSchemaCreate = lazy(() => import('@/pages/BoardSchema/BoardSchemaCreate'));
const BoardSchemaDetail = lazy(() => import('@/pages/BoardSchema/BoardSchemaDetail'));
const Teams = lazy(() => import('@/pages/Teams'));
const TeamsLayout = lazy(() => import('@/pages/Teams/TeamsLayout'));
const MyTeams = lazy(() => import('@/pages/Teams/components/MyTeams'));
const TeamMember = lazy(() => import('@/pages/Teams/components/TeamMembers'));
const InvalidInvitation = lazy(() => import('@/pages/Teams/components/InvalidInvitation'));

const Loading = () => {
    return (
        <div className={styles.loadingContainer}>
            <CircularProgress size={20} />
        </div>
    );
};

const templates = [
    {
        path: 'email-verified',
        element: (
            <Suspense fallback={<Loading />}>
                <EmailVerified />
            </Suspense>
        ),
    },
    {
        path: 'email-verification-error',
        element: (
            <Suspense fallback={<Loading />}>
                <EmailVerifiedWithError />
            </Suspense>
        ),
    },
    {
        path: 'unauthorized',
        element: (
            <Suspense fallback={<Loading />}>
                <Unauthorized404 />
            </Suspense>
        ),
    },
    {
        path: 'invalid-invitation',
        element: (
            <Suspense fallback={<Loading />}>
                <InvalidInvitation />
            </Suspense>
        ),
    },
];

const loginRoutes: RouteObject[] = [
    {
        path: '/',
        children: [
            {
                index: true,
                element: (
                    <Suspense fallback={<Loading />}>
                        <SignIn />
                    </Suspense>
                ),
            },
            {
                path: 'otp',
                element: (
                    <Suspense fallback={<Loading />}>
                        <Otp />
                    </Suspense>
                ),
            },
            {
                path: 'forgot-password',
                element: (
                    <Suspense fallback={<Loading />}>
                        <ForgotPassword />
                    </Suspense>
                ),
            },
            {
                path: 'reset-password',
                element: (
                    <Suspense fallback={<Loading />}>
                        <ResetPassword />
                    </Suspense>
                ),
            },
            {
                path: 'signup',
                element: (
                    <Suspense fallback={<Loading />}>
                        <SignUp />
                    </Suspense>
                ),
            },
            {
                path: 'verification',
                element: (
                    <Suspense fallback={<Loading />}>
                        <Verification />
                    </Suspense>
                ),
            },
            ...templates,
            {
                path: '*',
                element: <Navigate to="/" replace />,
            },
        ],
    },
];

type AccessType = keyof Omit<ReturnType<typeof useAccess>, 'isTeamAdmin' | 'isUnderRole' | 'isUnderAndEqualRole' | 'getTeamPermission'>;

interface RouteType {
    index?: true;
    path?: string;
    element?: ReactElement;
    isHide?: boolean;
    access?: AccessType | AccessType[];
    children?: RouteType[] | RouteObject[];
}

const onBoardingRoutes: RouteType[] = [
    {
        path: '/',
        element: (
            <Suspense fallback={<Loading />}>
                <PrivateLayout />
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/start" />,
            },
            {
                path: 'start',
                element: (
                    <Suspense fallback={<Loading />}>
                        <Start />
                    </Suspense>
                ),
            },
            {
                path: 'chatroom',
                access: 'conversation',
                element: (
                    <Suspense fallback={<Loading />}>
                        <OnBoardingConversations />
                    </Suspense>
                ),
            },
            {
                path: 'databoards',
                access: 'databoards',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <OnBoardingDataboards />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <OnBoardingDataboards />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'automations',
                                children: [
                                    {
                                        index: true,
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <BoardAutomation />
                                            </Suspense>
                                        ),
                                    },
                                    {
                                        path: 'workflow',
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <AutomationWorkflow />
                                            </Suspense>
                                        ),
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                path: 'knowledge-hub-all',
                access: 'knowledge_hub',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <KnowledgeHubAll />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'drive/*',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <KnowledgeHubAll />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'drive/:tab/automations',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <BoardAutomation knowledgeHub isDrive />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'workflow',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <AutomationWorkflow knowledgeHub />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <KnowledgeHubAll />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'automations',
                                children: [
                                    {
                                        index: true,
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <BoardAutomation knowledgeHub />
                                            </Suspense>
                                        ),
                                    },
                                    {
                                        path: 'workflow',
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <AutomationWorkflow knowledgeHub />
                                            </Suspense>
                                        ),
                                    },
                                ],
                            },
                            {
                                path: ':recId',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <KnowledgeHubAll />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'workflow_v2',
                access: 'workflows',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <WorkflowFrame isV2 />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                path: 'new',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <WorkflowFrame isV2 />
                                    </Suspense>
                                ),
                            },
                            {
                                path: ':id',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <WorkflowFrame isV2 />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'workflows_v2',
                access: 'workflows',
                children: [
                    {
                        index: true,
                        element: <Navigate to="/workflows_v2/channels" replace />,
                    },
                    {
                        path: ':tab',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <WorkflowList isV2 />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: 'channels',
                access: 'channels',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <Channels />
                            </Suspense>
                        ),
                    },
                    {
                        path: '360',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <ChannelMindMap />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'web_widget',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <WebWidget />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':channelId',
                        children: [
                            {
                                path: 'web_widget',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <WebWidget />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                    {
                        path: 'new',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AddNewCredentials />
                            </Suspense>
                        ),
                    },
                ],
            },

            {
                path: '*',
                element: <NotFound />,
            },
        ],
    },
];

const authRoutes: RouteType[] = [
    {
        path: '/',
        element: (
            <Suspense fallback={<Loading />}>
                <PrivateLayout />
            </Suspense>
        ),
        children: [
            {
                index: true,
                element: <Navigate to="/ai-agent" />,
            },
            {
                path: 'developer-portal',
                element: (
                    <Suspense fallback={<Loading />}>
                        <DeveloperPortal />
                    </Suspense>
                ),
            },
            ...(env.VITE_APP_ENV === 'dev' || env.VITE_APP_ENV === 'local'
                ? [{
                    path: 'dev-api-monitor',
                    element: (
                        <Suspense fallback={<Loading />}>
                            <ApiMonitor />
                        </Suspense>
                    ),
                }]
                : []),
            {
                path: 'ai-agent',
                access: 'ai_agent',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AIAgent />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':id',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AIAgent />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: 'internal-ai-chat',
                access: 'ai_agent',
                element: (
                    <Suspense fallback={<Loading />}>
                        <InternalAIChat />
                    </Suspense>
                ),
            },
            {
                path: 'ai-tracing',
                access: 'ai_agent',
                element: (
                    <Suspense fallback={<Loading />}>
                        <AITracing />
                    </Suspense>
                ),
            },
            {
                path: 'workflow-v2',
                access: 'workflows_v2',
                element: (
                    <Suspense fallback={<Loading />}>
                        <WorkflowV2 />
                    </Suspense>
                ),
            },
            {
                path: 'chatroom-routing',
                element: (
                    <Suspense fallback={<Loading />}>
                        <OutsideRedirectConversation />
                    </Suspense>
                ),
            },
            {
                path: 'chatroom',
                access: 'conversation',
                element: (
                    <Suspense fallback={<Loading />}>
                        <Dashboard />
                    </Suspense>
                ),
            },
            {
                path: 'databoards',
                access: 'databoards',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <DataboardsIndex />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Databoards />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'automations',
                                children: [
                                    {
                                        index: true,
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <BoardAutomation />
                                            </Suspense>
                                        ),
                                    },
                                    {
                                        path: 'workflow',
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <AutomationWorkflow />
                                            </Suspense>
                                        ),
                                    },
                                ],
                            },
                            {
                                path: ':recId',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Databoards />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'document-models',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <BoardSchema />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'new',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <BoardSchemaCreate />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':id',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <BoardSchemaDetail />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: 'commsiq',
                access: 'databoards',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <Databoards commsiq />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Databoards commsiq />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'automations',
                                children: [
                                    {
                                        index: true,
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <BoardAutomation commsiq />
                                            </Suspense>
                                        ),
                                    },
                                    {
                                        path: 'workflow',
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <AutomationWorkflow commsiq />
                                            </Suspense>
                                        ),
                                    },
                                ],
                            },
                            {
                                path: ':recId',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Databoards commsiq />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'knowledge-hub-all',
                access: 'knowledge_hub',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <KnowledgeHubAll />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'drive/*',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <KnowledgeHubAll />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'drive/:tab/automations',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <BoardAutomation knowledgeHub isDrive />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'workflow',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <AutomationWorkflow knowledgeHub />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <KnowledgeHubAll />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'automations',
                                children: [
                                    {
                                        index: true,
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <BoardAutomation knowledgeHub />
                                            </Suspense>
                                        ),
                                    },
                                    {
                                        path: 'workflow',
                                        element: (
                                            <Suspense fallback={<Loading />}>
                                                <AutomationWorkflow knowledgeHub />
                                            </Suspense>
                                        ),
                                    },
                                ],
                            },
                            {
                                path: ':recId',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <KnowledgeHubAll />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'member',
                access: 'member',
                element: (
                    <Suspense fallback={<Loading />}>
                        <Members />
                    </Suspense>
                ),
            },
            {
                path: 'teams',
                access: 'teams',
                children: [
                    {
                        element: (
                            <Suspense fallback={<Loading />}>
                                <TeamsLayout />
                            </Suspense>
                        ),
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Teams />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'my-teams',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <MyTeams />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'teams/:team_id/members',
                access: 'teams',
                element: (
                    <Suspense fallback={<Loading />}>
                        <TeamMember />
                    </Suspense>
                ),
            },
            {
                path: 'llm-provider',
                access: 'isAdmin',
                element: (
                    <Suspense fallback={<Loading />}>
                        <LLMProvider />
                    </Suspense>
                ),
            },
            {
                path: 'external/generate-external-token',
                access: 'isAdmin',
                element: (
                    <Suspense fallback={<Loading />}>
                        <External />
                    </Suspense>
                ),
            },
            {
                path: 'message_templates',
                access: 'templates',
                element: (
                    <Suspense fallback={<Loading />}>
                        <MessageTemplateList />
                    </Suspense>
                ),
            },
            // {
            //     path: 'templates',
            //     access: 'message_templates',
            //     element: (
            //         <Suspense fallback={<Loading />}>
            //             <Templates />
            //         </Suspense>
            //     ),
            // },
            {
                path: 'templates',
                access: 'templates',
                children: [
                    {
                        element: (
                            <Suspense fallback={<Loading />}>
                                <Templates />
                            </Suspense>
                        ),
                        children: [
                            {
                                index: true,
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <GeneralMessageTemplateList />
                                    </Suspense>
                                ),
                            },
                            {
                                path: 'email',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <EmailTemplateList />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },

            {
                path: 'workflow_v2',
                access: 'workflows',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <WorkflowFrame isV2 />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':tab',
                        children: [
                            {
                                path: 'new',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <WorkflowFrame isV2 />
                                    </Suspense>
                                ),
                            },
                            {
                                path: ':id',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <WorkflowFrame isV2 />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'workflows_v2',
                access: 'workflows',
                children: [
                    {
                        index: true,
                        element: <Navigate to="/workflows_v2/channels" replace />,
                    },
                    {
                        path: ':tab',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <WorkflowList isV2 />
                            </Suspense>
                        ),
                    },
                ],
            },
            // {
            //     path: 'reactworkflow',
            //     access: ['isAdmin', 'workflows'],
            //     isHide: env.VITE_APP_ENV === 'prod',
            //     children: [
            //         {
            //             path: ':tab',
            //             children: [
            //                 {
            //                     path: ':id',
            //                     element: (
            //                         <Suspense fallback={<Loading />}>
            //                             <Workflow />
            //                         </Suspense>
            //                     ),
            //                 },
            //             ],
            //         },
            //     ],
            // },
            {
                path: 'campaign',
                access: 'campaign',
                children: [
                    {
                        index: true,
                        element: <Navigate to="/campaign/list/all" replace />,
                    },
                    {
                        path: 'list',
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/campaign/list/all" replace />,
                            },
                            {
                                path: ':tab',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Campaign />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                    {
                        path: 'grid',
                        children: [
                            {
                                index: true,
                                element: <Navigate to="/campaign/grid/all" replace />,
                            },
                            {
                                path: ':tab',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <Campaign />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
            {
                path: 'touchpoint',
                access: 'campaign',
                children: [
                    {
                        path: ':touchpointId',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <TouchpointOperation />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: 'channels',
                access: 'channels',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <Channels />
                            </Suspense>
                        ),
                    },
                    {
                        path: '360',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <ChannelMindMap />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'web_widget',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <WebWidget />
                            </Suspense>
                        ),
                    },
                    {
                        path: ':channelId',
                        children: [
                            {
                                path: 'web_widget',
                                element: (
                                    <Suspense fallback={<Loading />}>
                                        <WebWidget />
                                    </Suspense>
                                ),
                            },
                        ],
                    },
                    {
                        path: 'new',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AddNewCredentials />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: 'credentials',
                access: 'credentials',
                children: [
                    {
                        index: true,
                        element: (
                            <Suspense fallback={<Loading />}>
                                <Credentials />
                            </Suspense>
                        ),
                    },
                    {
                        path: 'new',
                        element: (
                            <Suspense fallback={<Loading />}>
                                <AddNewCredentials />
                            </Suspense>
                        ),
                    },
                ],
            },
            {
                path: 'events',
                element: (
                    <Suspense fallback={<Loading />}>
                        <NotFound />
                    </Suspense>
                ),
            },
            // {
            //     path: 'analytics',
            //     access: 'analytics',
            //     element: (
            //         <Suspense fallback={<Loading />}>
            //             <Analytics />
            //         </Suspense>
            //     ),
            // },
            // {
            //     path: 'knowledge-base',
            //     access: ['isAdmin', 'knowledge_base'],
            //     isHide: env.VITE_APP_ENV !== 'dev' && env.VITE_APP_ENV !== 'local' && env.VITE_APP_ENV !== 'demo',
            //     element: (
            //         <Suspense fallback={<Loading />}>
            //             <KnowledgeBase />
            //         </Suspense>
            //     ),
            // },
            {
                path: 'executions',
                access: 'workflows',
                element: (
                    <Suspense fallback={<Loading />}>
                        <Executions />
                    </Suspense>
                ),
            },

            ...templates,
            {
                path: '*',
                element: <NotFound />,
            },
        ],
    },
];

const useRouteObject = env.VITE_UNABLE_SENTRY ? useRoutes : wrapUseRoutes(useRoutes);

const useImbraceRoutes = () => {
    const isLoggedIn = useAppSelector((state) => state.Access.isLoggedIn);
    const onBoarded = useAppSelector((state) => state.Account.onBoarded);
    const access = useAccess();

    const excludeRoute = useCallback(
        (route: RouteType) => {
            const finaleRoute = { ...route };
            if (finaleRoute.children) {
                finaleRoute.children = (finaleRoute.children as RouteType[])
                    .filter((childrenRoute) => {
                        if ('isHide' in childrenRoute && childrenRoute.isHide) {
                            return false;
                        }
                        const accessKey = childrenRoute.access;
                        if ('access' in childrenRoute && accessKey) {
                            if (typeof accessKey === 'string') {
                                const accessFunc = access[accessKey];
                                if (typeof accessFunc === 'function') {
                                    return accessFunc();
                                }
                                return true;
                            }
                            return accessKey.every((key) => {
                                const accessFunc = access[key];
                                if (typeof accessFunc === 'function') {
                                    return accessFunc();
                                }
                                return true;
                            });
                        }
                        return true;
                    })
                    .map(excludeRoute);
            }
            delete finaleRoute.access;
            delete finaleRoute.isHide;
            return finaleRoute;
        },
        [access],
    );

    const routes: RouteObject[] | RouteType[] = useMemo(() => {
        if (!isLoggedIn) {
            return loginRoutes;
        }
        if (!onBoarded) {
            return onBoardingRoutes;
        }
        return authRoutes.map(excludeRoute);
    }, [isLoggedIn, excludeRoute, onBoarded]);

    const element = useRouteObject(routes as RouteObject[]);

    return element;
};

export default useImbraceRoutes;
