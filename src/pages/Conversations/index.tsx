import { useEffect, useState } from 'react';

import { useQuery } from '@/hooks/useQuery';
import { updateViewFilter } from '@/redux/slices/teamConversation';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import ContactDetailDrawer from '../Databoards/components/RecordDetail/contactDetailDrawer';
import ConversationBar from './components/ConversationBar';
import ConversationSideBar from './components/ConversationSideBar';
import MessageList from './components/MessageList';
import MessageTemplateDrawerV2 from './components/MessageTemplateDrawerV2';
import WhatsAppMessageTemplateDrawer from './components/WhatsAppMessageTemplateDrawer';
import styles from './index.module.scss';

const DRAWER_WIDTH = '510px'; // 440px

function Dashboard() {
    const dispatch = useAppDispatch();
    const query = useQuery();
    const [currentDrawer, setCurrentDrawer] = useState('closed'); // whatsapp | message | contact | closed
    const [sideBarDrawerOpen, setSideBarDrawerOpen] = useState<boolean>(true);
    const drawerIsOpen = useAppSelector((state) => state.Notification.isOpen);
    const teamConversationContact = useAppSelector((state) => state.TeamConversation.teamConversation?.contact);
    const teamRoles = useAppSelector((state) => state.Account.team_roles);
    const messageIndex = query.get('messageIndex') || undefined;

    useEffect(() => {
        if (drawerIsOpen) {
            if (currentDrawer !== 'closed') {
                setCurrentDrawer('closed');
            }
        }
    }, [currentDrawer, drawerIsOpen, dispatch]);

    useEffect(() => {
        // A deep-linked conversation (?conv_id= / ?to_conv= share link) must
        // survive this default-view dispatch: a view change makes
        // ConversationList clear the selection and auto-select the first row,
        // replacing the linked conversation with an unrelated one.
        const params = new URLSearchParams(window.location.search);
        if (params.has('conv_id') || params.has('to_conv')) {
            return;
        }
        const firstTeamId = teamRoles?.[0]?.team_id || teamRoles?.[0]?.team?._id || teamRoles?.[0]?.team?.id;
        if (firstTeamId) {
            dispatch(updateViewFilter({ view: 'team', teamId: firstTeamId }));
        } else {
            dispatch(updateViewFilter({ view: 'all' }));
        }
    }, [dispatch, teamRoles]);

    return (
        <div className={styles.dashboardRoot}>
            <ConversationSideBar setSideBarDrawerOpen={setSideBarDrawerOpen} sideBarDrawerOpen={sideBarDrawerOpen} />
            <ConversationBar />
            <MessageList
                drawersOpen={currentDrawer !== 'closed'}
                setCurrentDrawer={setCurrentDrawer}
                currentDrawer={currentDrawer}
                messageIndex={messageIndex}
            />
            <MessageTemplateDrawerV2 open={currentDrawer === 'message'} width={DRAWER_WIDTH} setCurrentDrawer={setCurrentDrawer} />
            <ContactDetailDrawer
                open={currentDrawer === 'contact'}
                contact={teamConversationContact}
                onClose={() => {
                    setCurrentDrawer('closed');
                }}
                openDetail={() => {
                    setCurrentDrawer('contact');
                }}
            />
            <WhatsAppMessageTemplateDrawer open={currentDrawer === 'whatsapp'} width={DRAWER_WIDTH} setCurrentDrawer={setCurrentDrawer} />
        </div>
    );
}

export default Dashboard;
