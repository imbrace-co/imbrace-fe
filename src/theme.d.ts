import type { Palette as MuiPalette, PaletteOptions as MuiPaletteOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        imbrace_blue: MuiPalette['primary'];
        imbrace_orange: MuiPalette['primary'];
        imbrace_red: MuiPalette['primary'];
        imbrace_grey: MuiPalette['primary'];
        noti_btn_secondary: MuiPalette['primary'];
        leave_btn: MuiPalette['primary'];
    }

    // allow configuration using `createTheme`
    interface PaletteOptions {
        imbrace_blue?: MuiPaletteOptions['primary'];
        imbrace_orange?: MuiPaletteOptions['primary'];
        imbrace_red?: MuiPaletteOptions['primary'];
        imbrace_grey?: MuiPaletteOptions['primary'];
        noti_btn_secondary?: MuiPaletteOptions['primary'];
        leave_btn?: MuiPaletteOptions['primary'];
    }
}

declare module '@mui/material/Button' {
    interface ButtonPropsColorOverrides {
        imbrace_blue: true;
        imbrace_orange: true;
        imbrace_red: true;
        imbrace_grey: true;
        noti_btn_secondary: true;
        leave_btn: true;
    }
}
declare module '@mui/material/IconButton' {
    interface IconButtonPropsColorOverrides {
        imbrace_blue: true;
        imbrace_orange: true;
        imbrace_red: true;
        imbrace_grey: true;
        noti_btn_secondary: true;
        leave_btn: true;
    }
}
declare module '@mui/material/CircularProgress' {
    interface CircularProgressPropsColorOverrides {
        imbrace_blue: true;
        imbrace_orange: true;
        imbrace_red: true;
        imbrace_grey: true;
        noti_btn_secondary: true;
        leave_btn: true;
    }
}
declare module '@mui/material/Switch' {
    interface SwitchPropsColorOverrides {
        imbrace_blue: true;
        imbrace_orange: true;
        imbrace_red: true;
        imbrace_grey: true;
        noti_btn_secondary: true;
        leave_btn: true;
    }
}
