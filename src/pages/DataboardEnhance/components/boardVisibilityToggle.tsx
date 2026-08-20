import { Icon, IconButton, Tooltip } from '@imbrace/ui';
import { useState } from 'react';

import { updateBoardById } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

const BoardVisibilityToggle = ({
    board,
    hide,
    onFinish,
    disabled,
    tooltip,
}: {
    board: API.Board;
    hide: boolean;
    onFinish?: () => void;
    disabled: boolean;
    tooltip?: string;
}) => {
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        try {
            setLoading(true);
            await apiFetch(updateBoardById.api(board._id), updateBoardById.method, {
                name: board.name,
                hidden: !hide,
                description: board.description,
            });
            onFinish?.();
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    };

    return (
        <Tooltip title={tooltip} arrow placement="top" disableHoverListener={!tooltip} disableFocusListener>
            <div>
                <IconButton type="secondary" loading={loading} fontSize={20} variant="text" size="xs" disabled={disabled} onClick={toggle}>
                    <Icon name={hide ? 'visibilityOff' : 'visibility'} fontSize={20} />
                </IconButton>
            </div>
        </Tooltip>
    );
};

export default BoardVisibilityToggle;
