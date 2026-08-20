import type { SerializedError } from '@reduxjs/toolkit';

export interface InitialState {
    loadingStatus: LoadingStatus;
    addressLine1: string;
    addressLine2: string;
    areaCode: string;
    avatar: string;
    displayName: string;
    email: string;
    gender: string;
    firstName: string;
    lastName: string;
    id: string;
    isActive: boolean;
    isArchived: boolean;
    // isEmailVerified: boolean;
    language: string;
    organizationId: string;
    organizationName: string;
    phoneNumber: string;
    role?: API.Role;
    createdAt: string;
    updatedAt: string;
    team_roles: API.TeamRole[];
    organizationModules?: API.Modules;
    organizationLockFeatures?: API.LockFeatures;
    support: API.Account['support'];
    error?: string | SerializedError;
    onBoarded: boolean;
    isPaid: boolean;
    partition: number;
}
