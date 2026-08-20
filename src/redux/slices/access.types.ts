import type { SerializedError } from '@reduxjs/toolkit';

export interface InitialState {
    loadingStatus: LoadingStatus;
    isLoggedIn: boolean;
    error?: string | SerializedError;
}
