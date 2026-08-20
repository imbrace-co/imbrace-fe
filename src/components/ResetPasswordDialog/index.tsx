import { Button } from '@imbrace/ui';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import type { AxiosError } from 'axios';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useNotify } from '@/contexts/SnackbarContext';
import { passwordRequirements } from '@/pages/SignUp/components/SignUpForm';
import { resetUserPassword } from '@/services/api/user';
import apiFetch from '@/services/axios/handler';

interface ResetPasswordDialogProps {
    open: boolean;
    onClose: () => void;
    /** Target user id. Self (Change Password) = current account id; member (Reset password) = member id. */
    userId: string;
    title: string;
    description?: string;
    /** True when resetting another member's password (owner action) rather than the current user's own. */
    isAdmin?: boolean;
}

const ResetPasswordDialog = ({ open, onClose, userId, title, description, isAdmin }: ResetPasswordDialogProps) => {
    const { t } = useTranslation();
    const { notify } = useNotify();

    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [show, setShow] = useState(false);
    const [loading, setLoading] = useState(false);

    const allRequirementsMet = passwordRequirements.every((req) => req.test(newPassword));
    const passwordsMatch = newPassword.length > 0 && newPassword === confirm;
    const canSubmit = allRequirementsMet && passwordsMatch && !loading;

    const handleClose = () => {
        setNewPassword('');
        setConfirm('');
        setShow(false);
        onClose();
    };

    const onSubmit = async () => {
        if (!canSubmit) return;
        setLoading(true);
        try {
            await apiFetch(resetUserPassword.api(userId, isAdmin), resetUserPassword.method, { new_password: newPassword });
            notify({ type: 'success', message: t('reset_password_success') });
            handleClose();
        } catch (err) {
            const error = err as AxiosError<API.ErrorResponse>;
            notify({ type: 'error', message: error.response?.data?.message || t('reset_password_failed') });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
            <DialogContent>
                {description && (
                    <Typography variant="body2" sx={{ mb: 2, color: 'var(--color-light-5)' }}>
                        {description}
                    </Typography>
                )}

                <TextField
                    fullWidth
                    type={show ? 'text' : 'password'}
                    label={t('reset_password_new')}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    sx={{ mt: 1, mb: 2 }}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={() => setShow((prev) => !prev)} edge="end" tabIndex={-1}>
                                    {show ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />

                <TextField
                    fullWidth
                    type={show ? 'text' : 'password'}
                    label={t('reset_password_confirm')}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    error={confirm.length > 0 && !passwordsMatch}
                    helperText={confirm.length > 0 && !passwordsMatch ? t('reset_password_mismatch') : ''}
                />

                <div style={{ marginTop: 12 }}>
                    {passwordRequirements.map((req) => {
                        const met = req.test(newPassword);
                        return (
                            <Typography
                                key={req.text}
                                variant="caption"
                                sx={{ display: 'block', color: met ? 'var(--color-success-1)' : 'var(--color-light-7)' }}
                            >
                                {met ? '✓' : '•'} {t(req.text)}
                            </Typography>
                        );
                    })}
                </div>
            </DialogContent>
            <DialogActions sx={{ padding: '12px 24px 20px' }}>
                <Button text={t('cancel')} variant="outlined" onClick={handleClose} />
                <Button text={t('reset_password_submit')} variant="contained" onClick={onSubmit} loading={loading} disabled={!canSubmit} />
            </DialogActions>
        </Dialog>
    );
};

export default ResetPasswordDialog;
