import type { ReactElement, ReactNode } from 'react';
import type { FileWithPath } from 'react-dropzone';

import type { CustomDrawerProps } from '@/components/Drawer';
import type {
    handelSortType,
    handleChangePageType,
    handleChangeRowsPerPageType,
    handleFilterChangeType,
    tableColumns,
} from '@/components/Table/ITable';
import type { ReduxUser } from '@/redux/slices/member.types';

export type BatchInviteProp = {
    onFinish: () => void;
};
export type AddMemberDrawerProp = {
    open: boolean;
    onClose: () => void;
    onFinish: () => void;
};
export type InviteTabsProp = {
    step: number;
    setStep: (step: number) => void;
    onFinish: () => void;
};
export type TabPanelProp = {
    children?: ReactNode;
    index: number;
    value: number;
};
export type InviteFiles = {
    path: string;
    name: string;
    size: number;
};
export type FilesType = FileWithPath[];
export type InviteErrorMessage = {
    message: string;
    email: string;
};
export type InviteMember = {
    role?: API.Role;
    email: string;
};

export type MemberFormValues = {
    member: InviteMember[];
};

export type filterType = {
    active: {
        label: string;
        defaultChecked: boolean;
    };
    deactivated: {
        label: string;
        defaultChecked: boolean;
    };
};
export type filterOptions = {
    atLeastOne: boolean;
};
export type MemberListProps = {
    data: ReduxUser[];
    columns: tableColumns<ReduxUser, filterType, filterOptions>[];
    searchbarInput: string;
    setSearchbarInput: (searchbarInput: string) => void;
    pagination: API.pagination;
    handleChangePage?: handleChangePageType;
    handleFilterChange?: handleFilterChangeType;
    handelSort?: handelSortType;
    handleChangeRowsPerPage?: handleChangeRowsPerPageType;
    loading: boolean;
    reload: () => void;
    onRowClick?: (row: ReduxUser) => void;
};

export type UserDetailDrawerType = {
    open: boolean;
    user?: ReduxUser;
};
export type PaginatedResponse = {
    owner: number | undefined;
    data: API.RolesCount;
};
export type ChangeRoleDialogProps = {
    roleOptions: { value: string; name: string; description: string }[];
    setAnchorEl: (anchorEl: HTMLElement | null) => void;
    changeRoleHandler: (id: string, value?: string) => void;
    memberData: ReduxUser;
};
export type SelectedRoleType = {
    description: string;
    value: string;
    name: string;
};
export type MemberDetailsDisplayProps = {
    memberData: MemberDetailData;
    requiredFields: RenderInfoObj[];
    avatarField: string;
    avatarImageOnChange: () => void;
    fieldValueOnChange: (name: string, value: string) => void;
    onSaveChanges: () => void;
    editCancel: () => void;
    separator: boolean;
    disableEdit: boolean;
};
export type RenderInfoObj = {
    name: string;
    type: string;
    i18?: string;
    editable?: boolean;
    placeholder?: string;
    options: {
        value: string;
        i18?: string;
    }[];
};
export type MemberDetailData = {
    avatarField?: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
};
export type FieldTextType = {
    isEditable?: boolean;
};
export interface MemberDetailProps extends CustomDrawerProps {
    title?: string;
    open?: boolean;
    user?: API.Contact | API.User;
    type?: string;
    onFinish?: (data: ReduxUser | API.User | API.Contact) => void;
    isEditable?: boolean;
    readonly?: boolean;
    isPresence?: boolean;
}
export type FieldsProps = {
    key?: string;
    title: string;
    value: TeamType[] | string;
    type: string;
    isEditable?: boolean;
    icon?: ReactElement;
    keyName: string;
    rules?: {
        required?: {
            value: boolean;
            message: string;
        };
    };
    onEdit: (data: MemberDetailFromType) => void;
};
export type MemberDetailFromType = {
    [x: string]: string | TeamType[];
};

export type EditType = {
    first_name?: boolean;
    last_name?: boolean;
    birthday?: boolean;
    time_zone?: boolean;
    company_name?: boolean;
    location?: boolean;
    phone_number?: boolean;
    email?: boolean;
    whatsapp_id?: boolean;
    facebook_id?: boolean;
    wechat_id?: boolean;
    messenger_id?: boolean;
    line_id?: boolean;
    instagram_id?: boolean;
};
export type TeamType = {
    icon_url: string;
    name: string;
    id: string;
};
export type FieldsEnumType = {
    key: string;
    type: string;
    rules?: {
        required: {
            value: boolean;
            message: string;
        };
        pattern?: {
            value: RegExp;
            message: string;
        };
    };
    isEditable?: boolean;
};
export type GenderI18nType = {
    f: string;
    m: string;
    n: string;
};
export type LanguageI18nType = {
    en: string;
    zh: string;
    cn: string;
};
export type TitleI18nType = {
    mr: string;
    mrs: string;
    ms: string;
    miss: string;
    mx: string;
};
