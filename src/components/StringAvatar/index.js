import { Avatar, Badge } from '@mui/material';
import { styled } from '@mui/material/styles';
import React from 'react';

import { stringAvatarName, stringToColor } from '../../utils/AvatarHelper';
import { isNullString } from '../../utils/StringHelper';

const StyledBadge = styled(Badge, { shouldForwardProp: (prop) => prop !== 'color' })(({ theme, color }) => ({
    '& .MuiBadge-badge': {
        backgroundColor: color,
        color: color,
        // '#44b700'
        boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
        '&::after': {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            content: '""',
        },
    },
}));

function StringAvatar(props) {
    const { avatarStyle, avatarUrl, displayName, firstName, lastName, onClick, isOnline, onlineStatusColor } = props;
    return (
        <StyledBadge
            overlap="circular"
            color={onlineStatusColor || '#ccc'}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            variant="dot"
            invisible={isOnline === undefined}
        >
            <Avatar
                onClick={onClick}
                sx={{ ...styles.avatar, backgroundColor: stringToColor(displayName || firstName + lastName), ...avatarStyle }}
                src={avatarUrl || ''}
                children={isNullString(avatarUrl) ? stringAvatarName(displayName, firstName, lastName) : null}
            />
        </StyledBadge>
    );
}

const styles = {
    avatar: {
        height: 100,
        width: 100,
    },
};

export default StringAvatar;

StringAvatar.defaultProps = {
    avatarUrl: '',
    displayName: '',
    firstName: '',
    lastName: '',
    avatarStyle: {},
    onClick: () => {},
    isOnline: undefined,
};
