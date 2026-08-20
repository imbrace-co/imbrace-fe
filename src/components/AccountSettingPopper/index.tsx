import { EllipsisText, Icon } from '@imbrace/ui';
import List from '@mui/material/List';
import MuiListItemButton from '@mui/material/ListItemButton';
import MuiListItemIcon from '@mui/material/ListItemIcon';
import MuiListItemText from '@mui/material/ListItemText';
import Popover from '@mui/material/Popover';
import { styled } from '@mui/material/styles';
import type { FC } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logoutThunk } from '@/redux/slices/access';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getCurrentLanguage } from '../../utils/LocaleHelper';
import { helpCenterPopper } from '../HelpCenter';
import ResetPasswordDialog from '../ResetPasswordDialog';
import SelectLanguage from './SelectLanguage';
export const ListItemText = styled(MuiListItemText)<{ open: boolean }>(({ open }) => ({
    transition: 'opacity 0.3s ease',
    margin: 0,
    ...(!open && {
        opacity: 0,
        flex: 0,
    }),
    '& .MuiTypography-root': {
        fontSize: '0.875rem',
    },
}));

export const ListItemIcon = styled(MuiListItemIcon)<{ open: boolean }>(({ open }) => ({
    minWidth: 'auto',
    marginRight: open ? 8 : 0,
    transition: 'all 0.3s ease',
    '& svg': {
        color: '#828282',
        transition: 'all 0.3s ease',
        fontSize: 24,
    },
}));

export const ListItemButton = styled(MuiListItemButton)(({ theme }) => ({
    color: 'var(--color-light-5)',
    position: 'relative',
    width: '100%',
    padding: '12px 14px',
    '&:hover': {
        backgroundColor: 'var(--color-light-2)',
    },
    '&.active': {
        color: '#ffffff',
        backgroundColor: 'var(--color-accent-yellow-2)',
        '& svg': {
            color: '#ffffff',
        },
    },
})) as typeof MuiListItemButton;
interface AccountSettingPopperProps {
    open: boolean;
    contentType?: string;
    anchorEl?: null | HTMLElement;
    onClose: () => void;
}

const AccountSettingPopper: FC<AccountSettingPopperProps> = (props) => {
    const { open, anchorEl, onClose } = props;
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const accountId = useAppSelector((state) => state.Account.id);
    const id = open ? 'account-popover' : undefined;
    const [languagePopperAnchorEl, setLanguagePopperAnchorEl] = useState<HTMLElement>();
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    return (
        <>
            <Popover
                id={id}
                open={open}
                anchorEl={anchorEl}
                onClose={onClose}
                anchorOrigin={{
                    vertical: 'center',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'center',
                    horizontal: 'left',
                }}
                PaperProps={{
                    sx: {
                        overflow: 'hidden',
                        padding: '0',
                        width: '208px',
                        boxShadow: '0px 2px 24px 0px #E0E0E033, 0px 4px 8px 0px #BDBDBD14',
                    },
                }}
            >
                <List dense={true} sx={{ padding: 0 }}>
                    <ListItemButton
                        onClick={(event) => {
                            setLanguagePopperAnchorEl(event.currentTarget);
                        }}
                    >
                        <ListItemIcon open>
                            <Icon name="language" />
                        </ListItemIcon>

                        <ListItemText open primary={<EllipsisText text={getCurrentLanguage(i18n.language)} />} />
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Icon name="dropRight" />
                        </div>
                    </ListItemButton>
                    <ListItemButton
                        onClick={() => {
                            setChangePasswordOpen(true);
                            onClose();
                        }}
                    >
                        <ListItemIcon open>
                            <Icon name="lock" />
                        </ListItemIcon>
                        <ListItemText open primary={t('change_password')} />
                    </ListItemButton>
                    <ListItemButton
                        onClick={() => {
                            if (helpCenterPopper?.close) {
                                helpCenterPopper.close();
                            }
                            dispatch(logoutThunk());
                        }}
                    >
                        <ListItemIcon open>
                            <Icon name="logout" />
                        </ListItemIcon>
                        <ListItemText open primary={t('logout')} />
                    </ListItemButton>
                </List>
            </Popover>
            <SelectLanguage
                anchorEl={languagePopperAnchorEl}
                onClose={() => {
                    setLanguagePopperAnchorEl(undefined);
                }}
            />
            <ResetPasswordDialog
                open={changePasswordOpen}
                onClose={() => setChangePasswordOpen(false)}
                userId={accountId}
                title={t('change_password')}
            />
        </>
    );
};

export default AccountSettingPopper;
