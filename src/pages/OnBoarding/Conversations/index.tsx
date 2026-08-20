import { useEffect, useState } from 'react';

import MessageTemplateDrawerV2 from '@/pages/Conversations/components/MessageTemplateDrawerV2';
import WhatsAppMessageTemplateDrawer from '@/pages/Conversations/components/WhatsAppMessageTemplateDrawer';
import styles from '@/pages/Conversations/index.module.scss';
import MemberDetail from '@/pages/Members/components/MemberDetailV2';
import { updateViewFilter } from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import ConversationBar from './components/ConversationBar';
import ConversationSideBar from './components/ConversationSideBar';
import MessageList from './components/MessageList';

const DRAWER_WIDTH = '440px';

function Dashboard() {
    const dispatch = useAppDispatch();
    const [currentDrawer, setCurrentDrawer] = useState('closed'); // whatsapp | message | contact | closed
    const [sideBarDrawerOpen, setSideBarDrawerOpen] = useState<boolean>(true);
    const drawerIsOpen = useAppSelector((state) => state.Notification.isOpen);
    const teamConversationContact = useAppSelector((state) => state.TeamConversation.teamConversation?.contact);
    const isJoined = useAppSelector((state) => state.TeamConversation.teamConversation?.is_joined);
    const isPresence = useAppSelector((state) => state.TeamConversation.teamConversation?.is_presence);
    const teamRoles = useAppSelector((state) => state.Account.team_roles) || [];

    useEffect(() => {
        if (drawerIsOpen) {
            if (currentDrawer !== 'closed') {
                setCurrentDrawer('closed');
            }
        }
    }, [currentDrawer, drawerIsOpen, dispatch]);

    useEffect(() => {
        if (teamRoles.length > 0) {
            dispatch(
                updateViewFilter({
                    teamId: teamRoles[0].team_id,
                    view: 'team',
                }),
            );
        } else {
            dispatch(
                updateViewFilter({
                    view: 'all',
                }),
            );
        }
    }, [dispatch, teamRoles]);

    return (
        <div className={styles.dashboardRoot}>
            <ConversationSideBar setSideBarDrawerOpen={setSideBarDrawerOpen} sideBarDrawerOpen={sideBarDrawerOpen} />
            <ConversationBar />
            <MessageList drawersOpen={currentDrawer !== 'closed'} setCurrentDrawer={setCurrentDrawer} currentDrawer={currentDrawer} />
            <MessageTemplateDrawerV2 open={currentDrawer === 'message'} width={DRAWER_WIDTH} setCurrentDrawer={setCurrentDrawer} />
            <MemberDetail
                open={currentDrawer === 'contact'}
                user={teamConversationContact}
                isPresence={isPresence}
                type="user"
                isEditable={isJoined}
                width={'639px'}
                onClose={() => {
                    setCurrentDrawer('closed');
                    setSideBarDrawerOpen(true);
                }}
            />
            <WhatsAppMessageTemplateDrawer open={currentDrawer === 'whatsapp'} width={DRAWER_WIDTH} setCurrentDrawer={setCurrentDrawer} />
        </div>
    );
}

export default Dashboard;
