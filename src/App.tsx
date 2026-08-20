import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { clarity } from 'clarity-js';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { HistoryRouter as Router } from 'redux-first-history/rr6';

import { env } from '@/env';

import { ThemeContextProvider } from './contexts/ThemeContext';
import store, { history } from './redux/store';
import ImBraceRouter from './Router';
import { NavBarProvider } from './contexts/NavBarContext';
import { DeveloperPortalProvider, useDeveloperPortal } from './contexts/DeveloperPortalContext';
import { useNavigate } from 'react-router-dom';
import { setNavigator } from './utils/navigate';

dayjs.extend(utc);
dayjs.extend(timezone);

export const queryClient = new QueryClient();

const AppContent = () => {
    const { isDeveloperPortal } = useDeveloperPortal();

    const navigate = useNavigate();
    useEffect(() => {
        setNavigator(navigate);
    }, [navigate]);

    useEffect(() => {
        if (env.VITE_APP_CLARITY_ID) {
            clarity.consent();

            clarity.start({
                projectId: env.VITE_APP_CLARITY_ID,
                upload: 'https://m.clarity.ms/collect',
                track: true,
                content: true,
                cookies: ['user_name', 'user_role', 'org_id', 'org_name'],
            });
            return () => {
                clarity.stop();
            };
        }
    }, []);

    const renderDeveloperPortalBar = () => {
        return (
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    backgroundColor: 'var(--color-developer-portal)',
                    width: '100%',
                    height: '16px',
                }}
            ></div>
        );
    };

    return (
        <ThemeContextProvider>
            <NavBarProvider>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <QueryClientProvider client={queryClient}>
                        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
                        {isDeveloperPortal && renderDeveloperPortalBar()}
                        <ImBraceRouter />
                    </QueryClientProvider>
                </LocalizationProvider>
            </NavBarProvider>
        </ThemeContextProvider>
    );
};

function App() {
    return (
        <Provider store={store}>
            <Router history={history}>
                <DeveloperPortalProvider>
                    <AppContent />
                </DeveloperPortalProvider>
            </Router>
        </Provider>
    );
}

export default App;
