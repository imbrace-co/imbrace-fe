// src/store/visibilitySlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface License {
  isShow: boolean;
}

const initialState: License = {
  isShow: false, 
};

const visibilitySlice = createSlice({
  name: 'license',
  initialState,
  reducers: {
    setIsShow: (state, action: PayloadAction<boolean>) => {
      state.isShow = action.payload;
    },
    toggleIsShow: (state) => {
      state.isShow = !state.isShow;
    },
  },
});

export const { setIsShow, toggleIsShow } = visibilitySlice.actions;
export default visibilitySlice.reducer;