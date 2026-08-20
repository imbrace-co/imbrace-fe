import { Button } from '@imbrace/ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchAccountThunk } from '@/redux/slices/account';
import { useAppDispatch } from '@/redux/store';
import { requestJoinTeam } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

interface RequestJoinTeamButtonProps {
    teamId: string;
    reload: () => void;
}
const RequestJoinTeamButton = ({ teamId, reload }: RequestJoinTeamButtonProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [requesting, setRequesting] = useState(false);

    const onRequest = useCallback(async () => {
        try {
            await apiFetch(requestJoinTeam.api(teamId), requestJoinTeam.method);
            reload();
            dispatch(fetchAccountThunk({ silent: true }));
        } catch (error) {}
    }, [teamId, reload, dispatch]);

    const onClick = async () => {
        setRequesting(true);
        await onRequest();
        setRequesting(false);
    };

    return (
        <Button variant="link" size="xxs" text={t('request')} onClick={onClick} loading={requesting} sx={{ padding: 0, width: '100%' }} />
    );
};

export default RequestJoinTeamButton;
