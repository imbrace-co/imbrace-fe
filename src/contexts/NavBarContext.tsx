import React, { createContext, useCallback, useContext, useState } from 'react';
type NavBarContextType = {
    isSmallNavBar: boolean;
    setIsSmallNavBar: (val: boolean) => void;
    isNavBarAutoExpand: boolean;
    setIsNavBarAutoExpand: (val: boolean) => void;
};

const NavBarContext = createContext<NavBarContextType | undefined>(undefined);

export const NavBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isSmallNavBar, setIsSmallNavBarState] = useState<boolean>(false);
    const [isNavBarAutoExpand, setIsNavBarAutoExpand] = useState<boolean>(true);

    const setIsSmallNavBar = useCallback((val: boolean) => {
        setIsSmallNavBarState(val);
    }, []);

    const setIsNavBarAutoExpandCallback = useCallback((val: boolean) => {
        setIsNavBarAutoExpand(val);
    }, []);

    return (
        <NavBarContext.Provider
            value={{
                isSmallNavBar,
                setIsSmallNavBar,
                isNavBarAutoExpand,
                setIsNavBarAutoExpand: setIsNavBarAutoExpandCallback,
            }}
        >
            {children}
        </NavBarContext.Provider>
    );
};

export const useNavBar = (): NavBarContextType => {
    const ctx = useContext(NavBarContext);
    if (!ctx) throw new Error('useNavBar must be used within NavBarProvider');
    return ctx;
};
