import { Button } from '@imbrace/ui';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchAccountThunk } from '@/redux/slices/account';
import { useAppDispatch } from '@/redux/store';
import { joinTeamV2 } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';

interface JoinTeamButtonProps {
    teamId: string;
    reload: () => void;
}
const JoinTeamButton = ({ teamId, reload }: JoinTeamButtonProps) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [joining, setJoining] = useState(false);

    const onJoin = useCallback(async () => {
        try {
            await apiFetch(joinTeamV2.api, joinTeamV2.method, {
                team_id: teamId,
            });
            reload();
            dispatch(fetchAccountThunk({ silent: true }));
        } catch (error) {}
    }, [teamId, reload, dispatch]);

    const onClick = async () => {
        setJoining(true);
        await onJoin();
        setJoining(false);
    };

    return <Button variant="link" size="xxs" text={t('join')} onClick={onClick} loading={joining} sx={{ padding: 0, width: '100%' }} />;
};

export default JoinTeamButton;
