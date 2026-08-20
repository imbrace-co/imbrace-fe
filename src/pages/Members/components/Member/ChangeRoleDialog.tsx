import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MuiListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import type { SelectChangeEvent } from '@mui/material/Select';
import Select from '@mui/material/Select';
import type { MouseEvent, ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { ChangeRoleDialogProps, SelectedRoleType } from '@/pages/Members/IMember.types';

function ChangeRoleDialog(props: ChangeRoleDialogProps) {
    const { roleOptions, setAnchorEl, changeRoleHandler, memberData } = props;
    const { t } = useTranslation();

    const [selectedRole, setSelectedRoles] = useState<SelectedRoleType | undefined>(
        roleOptions.find((obj) => obj.value === memberData.role),
    );
    const [open, setOpen] = useState<boolean>(false);

    const selectedRoleOnChange = (e: SelectChangeEvent<string>, child: ReactNode) => {
        setSelectedRoles(roleOptions.filter((obj) => obj.value === e.target?.value)[0]);
    };

    const handleClickOpen = (e: MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        setOpen(true);
    };

    const handleClose = (e: MouseEvent<HTMLButtonElement | HTMLAnchorElement | MouseEvent>) => {
        e.stopPropagation();
        setOpen(false);
        setAnchorEl(null);
    };

    const onSubmit = () => {
        // console.log(id);
        changeRoleHandler(memberData.id, selectedRole?.value);
        setAnchorEl(null);
    };

    return (
        <div>
            <MuiListItemButton onClick={handleClickOpen}>
                <ListItemText primary={t('member_change_role')} />
            </MuiListItemButton>
            <Dialog fullWidth open={open} onClose={handleClose} onClick={(e) => e.stopPropagation()}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mr: 1 }}>
                    <DialogTitle>{t('member_change_role')}</DialogTitle>
                    <IconButton disableRipple onClick={handleClose}>
                        <CloseIcon />
                    </IconButton>
                </Box>
                <DialogContent>
                    <DialogContentText sx={{ color: '#000' }}>{t('member_access_control')}</DialogContentText>
                    <Box sx={{ width: '250px', mt: 1 }}>
                        <Select
                            id="accessControlSelect"
                            label=""
                            value={selectedRole?.value}
                            onChange={selectedRoleOnChange}
                            notched={false}
                            fullWidth
                            displayEmpty
                            inputProps={{ 'aria-label': 'Without label' }}
                        >
                            {roleOptions.map((obj) => (
                                <MenuItem key={obj.value} value={obj.value}>
                                    {t(obj.name)}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>
                    <DialogContentText sx={{ mt: 2 }}>{selectedRole && t(selectedRole.description)}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button variant="contained" sx={{ mr: 1, mb: 1 }} onClick={onSubmit}>
                        {t('member_change_role_done')}
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ChangeRoleDialog;
