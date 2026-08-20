import { fetchMethod } from '../axios/index';

export const getRooms = {
    api: '/platform/v1/rooms?type=business_unit_id&status={{status}}&skip={{skip}}&q={{business_unit_id}}&limit={{limit}}&channel_types={{channel_types}}',
    method: fetchMethod.GET,
};

export const getRoomById = {
    api: '/platform/v1/rooms/{{room_id}}',
    method: fetchMethod.GET,
};

export const putRoomById = {
    api: '/platform/v1/rooms/{{room_id}}',
    method: fetchMethod.PUT,
};

export const postRoomStatus = {
    api: '/platform/v1/rooms/_status',
    method: fetchMethod.POST,
};

export const postJoinRoom = {
    api: '/platform/v1/rooms/_join',
    method: fetchMethod.POST,
};

export const getRoomStatusCount = {
    api: '/platform/v1/rooms/_status_count?type=business_unit_id&q={{business_unit_id}}',
    method: fetchMethod.GET,
};

export const getSearchRoomList = {
    api: '/platform/v1/rooms/_search?business_unit_id={{business_unit_id}}&type=text&q={{text}}&limit={{limit}}&skip={{skip}}',
    method: fetchMethod.GET,
};
