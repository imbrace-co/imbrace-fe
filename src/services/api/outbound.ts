import { fetchMethod } from '../axios/index';

export const whatsappOutbound = {
    api: () => '/channel-service/v1/outbounds/whatsapp',
    method: fetchMethod.POST,
};

export const emailOutbound = {
    api: () => '/channel-service/v1/outbounds/email',
    method: fetchMethod.POST,
};
