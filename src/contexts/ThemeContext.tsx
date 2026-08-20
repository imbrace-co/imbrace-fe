import createCache from '@emotion/cache';
import { CacheProvider, ThemeProvider } from '@emotion/react';
import type { ThemeOptions } from '@mui/material';
import { createTheme } from '@mui/material';
// import { createTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { createContext, useEffect, useMemo, useState } from 'react';

import { IMBRACE_COLOR_MODE } from '../constants/app';

type ColorMode = 'dark' | 'light';
const cache = createCache({
    key: 'imbrace',
    prepend: true,
    container: document.getElementById('emotion') as Node,
});
export const getCustomMUITheme: (mode: ColorMode) => ThemeOptions = (mode) => {
    return {
        breakpoints: {
            values: {
                xs: 0,
                sm: 600,
                md: 1024,
                lg: 1440,
                xl: 1920,
            },
        },
        palette: {
            mode: mode,
            primary: {
                main: '#156df2',
            },
            imbrace_blue: {
                main: '#156DF2',
                contrastText: '#fff',
            },
            imbrace_orange: {
                main: '#FA9917',
                contrastText: '#fff',
            },
            imbrace_red: {
                main: '#F36',
                contrastText: '#fff',
            },
            imbrace_grey: {
                main: '#E0E0E0',
                contrastText: '#fff',
            },
            noti_btn_secondary: {
                main: '#bdbdbd',
                darker: '#bdbdbd',
            },
            error: {
                main: '#E53C3C',
            },
            leave_btn: {
                main: '#bdbdbd',
                contrastText: '#fff',
            },
        },
        components: {
            MuiTableCell: {
                styleOverrides: {
                    root: {
                        color: 'var(--color-light-7)',
                    },
                },
            },
            MuiDivider: {
                styleOverrides: {
                    root: {
                        borderColor: 'var(--color-secondary-4)',
                    },
                },
            },
        },
    };
};

export const ThemeContext = createContext({});

export function ThemeContextProvider(props: { children: ReactNode }) {
    // Theme Context Provider controls light/dark theme of custom CSS (CSS var() variables)
    // Theme Provider controls the light/dark theme of MUI components (low level MUI components colors)
    const [colorMode, setColorMode] = useState<ColorMode>('light');
    const MUItheme = useMemo(() => createTheme(getCustomMUITheme(colorMode)), [colorMode]);

    useEffect(() => {
        // obtain color mode from localstorage
        const theme = window.localStorage.getItem(IMBRACE_COLOR_MODE);
        if (theme !== 'light' && theme !== 'dark') {
            window.localStorage.setItem(IMBRACE_COLOR_MODE, 'light');
            document.body.classList.remove('dark');
            setColorMode('light');
            return;
        }

        if (theme === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }

        setColorMode(theme);
    }, []);

    useEffect(() => {
        window.localStorage.setItem(IMBRACE_COLOR_MODE, colorMode);

        if (colorMode === 'dark') {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [colorMode]);

    return (
        <CacheProvider value={cache}>
            <ThemeContext.Provider value={{ colorMode: colorMode, setColorMode: setColorMode }}>
                <ThemeProvider theme={MUItheme}>{props.children}</ThemeProvider>
            </ThemeContext.Provider>
        </CacheProvider>
    );
}
