import { Button } from '@imbrace/ui';
import { ToggleButton as MuiToggleButton, ToggleButtonGroup as MuiToggleButtonGroup, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { QRCode } from 'antd';
import type { FC, MouseEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import IconCopied from '@/assets/icons/icon_copied.svg?react';
import Loading from '@/components/Loading';
import clsx from '@/utils/clsx';

import { downloadQRcode, getBase64FromUrl } from '../campaignCommonFunc';
import styles from './index.module.scss';

export type IsMissingType = 'channel' | 'workflow' | 'overDuration' | null;

export type RightQRcodeType = {
    isMissing: IsMissingType;
    isNew: boolean;
    isDirty: boolean;
    touchpointData?: API.Touchpoint;
    qRCodeUrl: string | null;
    logo?: string;
    loading: boolean;
};

const ToggleButtonGroup = styled(MuiToggleButtonGroup)(() => ({
    padding: '4px',
    width: '224px',
    height: '48px',
    background: 'var(--color-light-1)',
    border: '1px solid var(--color-secondary-3)',
    boxShadow: '0px 1px 8px rgba(189, 189, 189, 0.08), 0px 2px 16px rgba(224, 224, 224, 0.2)',
    borderRadius: '8px',
}));

const ToggleButton = styled(MuiToggleButton)(() => ({
    width: '108px',
    fontWeight: 700,
    fontSize: '13px',
    textTransform: 'uppercase',
    color: 'var(--color-light-4)',
    border: 'transparent !important',
    borderRadius: '8px !important',
    '&.Mui-selected': {
        background: 'var(--color-secondary-3)',
        color: 'var(--color-light-1)',
        borderRadius: '8px',
        '&:hover': {
            background: 'var(--color-secondary-3)',
            color: 'var(--color-light-1)',
            border: 'transparant !important',
        },
    },
    '&:hover': {
        color: 'var(--color-light-4)',
        background: 'transparent',
        border: 'transparant !important',
    },
}));

const RightQRcode: FC<RightQRcodeType> = (prop) => {
    const { loading, isMissing, isDirty, touchpointData, qRCodeUrl, isNew, logo } = prop;
    const { t } = useTranslation();
    const printRef = useRef<HTMLDivElement>(null);
    const [downloading, setDownloading] = useState<boolean>(false);
    const [copying, setCopying] = useState<boolean>(false);
    const [copyDone, setCopyDone] = useState<boolean>(false);
    const [copyURLDone, setCopyURLDone] = useState<boolean>(false);
    const [alignment, setAlignment] = useState('QRCode');
    const [logoBase64, setLogoBase64] = useState<string>();
    const isFirefox = typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().indexOf('firefox') > -1;

    useEffect(() => {
        const timer = setTimeout(() => {
            setCopyDone(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [copyDone]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCopyURLDone(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, [copyURLDone]);

    useEffect(() => {
        if (logo) {
            const execute = async () => {
                const data = await getBase64FromUrl(logo);
                setLogoBase64(data as string);
            };
            execute();
        }
    }, [logo]);

    const handleChange = (event: MouseEvent<HTMLElement>, newAlignment: string) => {
        if (newAlignment) setAlignment(newAlignment);
    };

    const downloadOrCopyQRcode = async (actionType: string) => {
        try {
            const canvas = printRef?.current?.querySelector('canvas');
            const data = canvas?.toDataURL('image/jpg');
            if (data) {
                if (actionType === 'download') {
                    setDownloading(true);
                    const fileName = `${touchpointData?.name}`;
                    downloadQRcode(data, fileName);
                    setDownloading(false);
                } else {
                    if (copyDone) return;
                    setCopying(true);
                    setCopyDone(false);
                    const getImageBlob = async () => {
                        const image = await fetch(data);
                        const imageBlob = await image.blob();
                        return imageBlob;
                    };
                    await navigator.clipboard.write([
                        new ClipboardItem({
                            'image/png': getImageBlob(),
                        }),
                    ]);
                    setCopying(false);
                    setCopyDone(true);
                }
            }
        } catch (error) {
            console.log(error);
            setCopyDone(false);
            setCopying(false);
            setDownloading(false);
        }
    };

    const accessToken = localStorage.getItem('imbrace-access-token') || '';
    const qrImageUrl = qRCodeUrl ? `${qRCodeUrl}&token=${accessToken}` : '';
    const baseQRUrl = qRCodeUrl ? qRCodeUrl.replace('&isFromQRcode=true', '') : '';
    const fullQRUrl = accessToken ? `${baseQRUrl}&token=${accessToken}` : baseQRUrl;
    const displayQRUrl = accessToken && accessToken.length > 20
        ? `${baseQRUrl}&token=${accessToken.substring(0, 20)}...`
        : fullQRUrl;

    const copyQRcodeURL = async () => {
        if (copyURLDone) return;
        try {
            setCopyURLDone(true);
            setCopying(true);
            await navigator.clipboard.writeText(fullQRUrl);
            setCopying(false);
        } catch (error) {
            console.log(error);
            setCopying(false);
        }
    };

    const absenceErrorText = (arg: IsMissingType) => {
        switch (arg) {
            case 'channel':
                return t('campaign_missing_channel_msg', { alignment: alignment === 'QRCode' ? t('qr_code') : t('url') });
            case 'workflow':
                return t('campaign_missing_workflow_msg', { alignment: alignment === 'QRCode' ? t('qr_code') : t('url') });
            case 'overDuration':
                return t('campaign_over_duration_msg', { alignment: alignment === 'QRCode' ? t('qr_code') : t('url') });
            case null:
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className={styles.rightPanel}>
                <Loading />
            </div>
        );
    }

    return (
        <div className={styles.rightPanel}>
            <div ref={printRef} style={{ display: 'none' }}>
                <QRCode
                    errorLevel="H"
                    bordered={false}
                    bgColor="white"
                    size={2000}
                    iconSize={800}
                    value={qrImageUrl}
                    icon={logoBase64}
                />
            </div>
            <div className={styles.qrcodeField}>
                <div className={styles.qrcodeToggle}>
                    <ToggleButtonGroup color="primary" value={alignment} exclusive onChange={handleChange} aria-label="Platform">
                        <ToggleButton disableRipple value="QRCode">
                            {t('campaign_Title')}
                        </ToggleButton>
                        <ToggleButton disableRipple value="URL">
                            {t('campaign_URL')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </div>
                {alignment === 'QRCode' ? (
                    <>
                        {!isNew && <div className={styles.qrcodeText}>{t('campaign_warning')}</div>}
                        <div className={styles.qrcodeContainer}>
                            {isNew && (
                                <div className={styles.qRCodeEmpty}>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: 400,
                                            fontSize: '14px',
                                            lineHeight: '150%',
                                            textAlign: 'center',
                                        }}
                                    >
                                        {t('campaign_touchpoint_empty')}
                                    </Typography>
                                </div>
                            )}
                            {!isNew && isDirty && (
                                <div className={styles.qRCodeEmpty}>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: 400,
                                            fontSize: '14px',
                                            lineHeight: '150%',
                                            textAlign: 'center',
                                            color: 'var(--color-light-7)',
                                        }}
                                    >
                                        {t('campaign_touchpoint_dirty_form')}
                                    </Typography>
                                </div>
                            )}

                            <QRCode
                                errorLevel="H"
                                bordered={false}
                                bgColor="white"
                                size={368}
                                iconSize={368 * 0.4}
                                value={qrImageUrl}
                                icon={logo}
                            />
                        </div>
                    </>
                ) : (
                    <>
                        {
                            // QR CODE URL
                        }
                        <div className={styles.qrcodeText}>{t('campaign_link_warning')}</div>

                        <div className={styles.qrcodeContainer}>
                            {isNew && (
                                <div className={clsx(styles.qRCodeURLEmpty, isNew ? styles.solidBg : styles.translucentBg)}>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: 400,
                                            fontSize: '14px',
                                            lineHeight: '150%',
                                            textAlign: 'center',
                                            color: 'var(--color-light-7)',
                                        }}
                                    >
                                        {t('campaign_touchpoint_empty')}
                                    </Typography>
                                </div>
                            )}
                            {!isNew && isDirty && (
                                <div className={clsx(styles.qRCodeURLEmpty, isNew ? styles.solidBg : styles.translucentBg)}>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            fontWeight: 400,
                                            fontSize: '14px',
                                            lineHeight: '150%',
                                            textAlign: 'center',
                                            color: 'var(--color-light-7)',
                                        }}
                                    >
                                        {t('campaign_touchpoint_dirty_form')}
                                    </Typography>
                                </div>
                            )}
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    padding: '12px',
                                    gap: '4px',
                                    width: '368px',
                                    height: '164px',
                                    background: '#FFFFFF',
                                    border: '1px solid #E0E0E0',
                                    borderRadius: '4px',
                                    fontWeight: '400',
                                    fontSize: '14px',
                                    lineHeight: '24px',
                                    textDecorationLine: 'underline',
                                    color: '#828282',
                                    whiteSpace: 'normal',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {displayQRUrl}
                            </Typography>
                        </div>
                    </>
                )}
                {qRCodeUrl && !isNew && (
                    <div className={styles.editButton}>
                        {alignment === 'QRCode' && (
                            <>
                                {!isFirefox && (
                                    <Button
                                        variant={'outlined'}
                                        text={copyDone ? t('campaign_copied') : t('campaign_copy')}
                                        onClick={() => downloadOrCopyQRcode('copy')}
                                        loading={copying}
                                        startIcon={copyDone ? <IconCopied /> : undefined}
                                        sx={{
                                            width: 160,
                                            padding: '8px 32px',
                                        }}
                                    />
                                )}
                                <Button
                                    text={t('campaign_download')}
                                    onClick={() => downloadOrCopyQRcode('download')}
                                    loading={downloading}
                                    sx={{
                                        width: 160,
                                        padding: '8px 32px',
                                    }}
                                />
                            </>
                        )}

                        <Button
                            text={copyURLDone ? t('campaign_url_copied') : t('campaign_url_copy')}
                            onClick={() => copyQRcodeURL()}
                            loading={copying}
                            startIcon={copyURLDone ? <IconCopied /> : undefined}
                            sx={{
                                display: alignment === 'QRCode' ? 'none' : 'flex',
                            }}
                        />
                    </div>
                )}
                {isMissing && (
                    <div className={styles.qrcodeError}>
                        <Typography
                            align="center"
                            variant="body1"
                            sx={{
                                fontWeight: 400,
                                fontSize: '12px',
                                lineHeight: '120%',
                                textAlign: 'center',
                                whiteSpace: 'pre-wrap',
                                color: '#E63C3C',
                                width: '368px',
                            }}
                            noWrap={false}
                        >
                            {absenceErrorText(isMissing)}
                        </Typography>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RightQRcode;
