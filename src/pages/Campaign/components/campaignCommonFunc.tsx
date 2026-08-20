import { Icon } from '@imbrace/ui';

export const getQRcodeURLByType = (type: string, id: string, text: string) => {
    let url = `${id}`;
    switch (type) {
        case 'line':
            if (text && text.length > 0) {
                url += `/?${text}`;
            }
            return `https://line.me/R/oaMessage/${url}`;
        case 'whatsapp':
            if (text && text.length > 0) {
                url += `?text=${text}`;
            }
            return `https://wa.me/${url}`;
        default:
            return;
    }
};
export const getBase64FromUrl = async (url: string) => {
    const data = await fetch(url);
    const blob = await data.blob();
    return new Promise<string | ArrayBuffer | null>((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64data = reader.result;
            resolve(base64data);
        };
    });
};
export const downloadQRcode = (data: string | undefined, fileName: string) => {
    const link = document.createElement('a');
    if (typeof link.download === 'string' && data) {
        link.href = data;
        link.download = `${fileName}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        window.open(data);
    }
};
export const checkDate = (startDate: Date | null, endDate: Date | null) => {
    const today = new Date();
    return endDate || (startDate && startDate.getTime() > today.getTime());
};

export const getChannelIcon = (type: string, disabled = false) => {
    switch (type) {
        case 'line':
            return <Icon namespace="channel" name="line" fontSize={24} inactive={disabled} />;
        case 'whatsapp':
            return <Icon namespace="channel" name="whatsapp" fontSize={24} inactive={disabled} />;
        case 'wechat':
            return <Icon namespace="channel" name="wechat" fontSize={24} inactive={disabled} />;
        case 'facebook':
            return <Icon namespace="channel" name="facebook" fontSize={24} inactive={disabled} />;
        default:
            return;
    }
};

export const calculateAspectRatioFit = (srcWidth: number, srcHeight: number, maxWidth: number, maxHeight: number) => {
    const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth * ratio, height: srcHeight * ratio };
};
