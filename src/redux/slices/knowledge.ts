import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Knowledge {
  tags: string[];
}

const initialState: Knowledge = {
  tags: [], 
};

const visibilitySlice = createSlice({
  name: 'knowledge',
  initialState,
  reducers: {
    setTags: (state, action: PayloadAction<string[]>) => {
      state.tags = action.payload;
    },
  },
});

export const { setTags } = visibilitySlice.actions;
export default visibilitySlice.reducer;