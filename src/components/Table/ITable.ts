import type { ChangeEvent } from 'react';

export type handleChangePageType = (event: ChangeEvent<HTMLInputElement>, page: number) => void;
export interface tableColumns<D, T, F> {
    id: string;
    label: string;
    disableSorter?: boolean;
    disablePadding?: boolean;
    width?: number;
    align?: string;
    customize: (key: string, row: D) => void;
    hasExtraTool?: boolean;
    filter?: T;
    filterOptions?: F;
}

export type Order = 'asc' | 'desc';

export type handleFilterChangeType = (name: string, checked: string[]) => void;
export type handelSortType = (property?: string, direction?: string) => void;
export type handleChangeRowsPerPageType = () => void;
