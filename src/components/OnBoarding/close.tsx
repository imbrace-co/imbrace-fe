import { Icon, IconButton } from '@imbrace/ui';
import { useTour } from '@reactour/tour';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';

import { fetchAccountThunk } from '@/redux/slices/account';
import { useAppDispatch, useAppSelector } from '@/redux/store';

import { helpCenterPopper } from '../HelpCenter';
import { handelUpdateAccount } from './navigation';

const Close = ({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) => {
    const { setIsOpen } = useTour();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const userId = useAppSelector((state) => state.Account.id);

    const updateAccount = useMutation({
        mutationFn: handelUpdateAccount,
        onSuccess: () => {
            dispatch(fetchAccountThunk({ silent: true }));
            setIsOpen(false);
            helpCenterPopper?.close?.();
        },
        onError: () => {
            setIsOpen(false);
            helpCenterPopper?.close?.();
        },
    });
    return (
        <IconButton
            onClick={async () => {
                try {
                    await updateAccount.mutateAsync({
                        userId,
                        formData: {
                            on_boarded: true,
                        },
                    });
                    navigate('/ai-agent');
                } catch (error) {}
                onClick?.();
            }}
            disabled={disabled}
            sx={{
                position: 'absolute',
                right: 34,
            }}
            variant="text"
            size="xs"
            type="secondary"
            loading={updateAccount.isPending}
        >
            <Icon name="close" style={{ fontSize: 20 }} />
        </IconButton>
    );
};

export default Close;
