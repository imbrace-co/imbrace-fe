import accessReducer from './access';
import accountReducer from './account';
import businessUnitReducer from './businessUnit';
import contactReducer from './contact';
import loginReducer from './login';
import memberReducer from './member';
import messageReducer from './message';
import messageTemplatesReducer from './messageTemplates';
import notificationReducer from './notification';
import organizationReducer from './organization';
import teamReducer from './team';
import teamConversationReducer from './teamConversation';
import whatsAppMessageTemplatesReducer from './whatsAppTemplates';
import workflowReducer from './workflow';
import licenseReducer from './license';
import knowledgeReducer from './knowledge';

const reducers = {
    WhatsAppMessageTemplates: whatsAppMessageTemplatesReducer,
    MessageTemplates: messageTemplatesReducer,
    TeamConversation: teamConversationReducer,
    Message: messageReducer,
    Team: teamReducer,
    Account: accountReducer,
    Access: accessReducer,
    Contact: contactReducer,
    Login: loginReducer,
    BusinessUnit: businessUnitReducer,
    Organization: organizationReducer,
    Notification: notificationReducer,
    Member: memberReducer,
    Workflow: workflowReducer,
    License: licenseReducer,
    Knowledge: knowledgeReducer,
};

export default reducers;
