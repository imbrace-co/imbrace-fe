import { IMBRACE_DEV_PORTAL } from '@/constants/app';
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface DeveloperPortalContextType {
    isDeveloperPortal: boolean;
    setIsDeveloperPortal: (value: boolean) => void;
}

const DeveloperPortalContext = createContext<DeveloperPortalContextType | undefined>(undefined);

export const useDeveloperPortal = () => {
    const context = useContext(DeveloperPortalContext);
    if (context === undefined) {
        throw new Error('useDeveloperPortal must be used within a DeveloperPortalProvider');
    }
    return context;
};

interface DeveloperPortalProviderProps {
    children: ReactNode;
}

export const DeveloperPortalProvider = ({ children }: DeveloperPortalProviderProps) => {
    const [isDeveloperPortal, setIsDeveloperPortal] = useState(localStorage.getItem(IMBRACE_DEV_PORTAL) === 'true');

    useEffect(() => {
        const handleStorageChange = () => {
            const newIsDeveloperPortal = localStorage.getItem(IMBRACE_DEV_PORTAL) === 'true';
            setIsDeveloperPortal(newIsDeveloperPortal);
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('localStorageChange', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('localStorageChange', handleStorageChange);
        };
    }, []);

    return (
        <DeveloperPortalContext.Provider value={{ isDeveloperPortal, setIsDeveloperPortal }}>
            {children}
        </DeveloperPortalContext.Provider>
    );
}; 