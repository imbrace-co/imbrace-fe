export const channelCredTypeMap: Record<string, string> = {
    WebWidget: 'web',
    WhatsApp: 'whatsapp',
    Facebook: 'facebook',
    Line: 'line',
    WeChat: 'wechat',
    Instagram: 'instagram',
};

export const credentialChannelMap: Record<string, string> = {
    web: 'WebWidget',
    whatsapp: 'WhatsApp',
    facebook: 'Facebook',
    line: 'Line',
    wechat: 'WeChat',
    instagram: 'Instagram',
};

// find default value of specific field
export const getDefaultValue = (credentialParamsProps: API.PropertyType[], key: string) => {
    return credentialParamsProps.find((prop) => prop.name === key)?.default;
};

// find display options of specific field and a custom object {field_name: [values, values]}
export const getDisplayOptions = (credentialParamsProps: API.PropertyType[]) => {
    return credentialParamsProps.reduce((acc, cur) => {
        if (cur?.displayOptions && cur.displayOptions.show) {
            Object.keys(cur.displayOptions.show).forEach((key) => {
                if (cur.displayOptions && cur.displayOptions.show[key]) {
                    if (acc[key]) {
                        if (!acc[key].includes(cur.displayOptions.show[key][0])) {
                            acc[key].push(cur.displayOptions.show[key] && cur.displayOptions.show[key][0]);
                        }
                    } else {
                        acc[key] = [cur.displayOptions.show[key] && cur.displayOptions.show[key][0]];
                    }
                }
            });
        }
        return acc;
    }, {} as Record<string, (string | boolean)[]>);
};
