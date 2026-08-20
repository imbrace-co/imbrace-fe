import { FieldSelect, FieldText, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export const MediaTypes: Record<string, string> = {
    prints: 'campaign_media_prints',
    emails: 'campaign_media_email',
    social_posts: 'campaign_media_social',
    outdoors: 'campaign_media_outdoors',
    events: 'campaign_media_events',
    tv: 'campaign_media_tv',
    ads: 'campaign_media_ads',
};

const SelectMedia = () => {
    const { t } = useTranslation();
    const [selectOther, setSelectOther] = useState(false);
    const otherMediaRef = useRef<HTMLInputElement>(null);

    const { control, setValue, watch } = useFormContext();

    const handlerSelectURL = () => {
        setSelectOther(true);
        setValue('media_name', '');
    };
    const onReset = () => {
        setSelectOther(false);
        setValue('media_name', '');
    };
    const mediaOptions = useMemo(
        () => [
            ...Object.entries(MediaTypes).map(([key, mediaValue]) => ({
                text: t(mediaValue),
                value: key,
            })),
        ],
        [t],
    );

    useEffect(() => {
        if (selectOther && otherMediaRef.current) {
            otherMediaRef.current?.focus();
        }
    }, [selectOther, otherMediaRef]);

    return !selectOther && (Object.keys(MediaTypes).indexOf(watch('media_name')) !== -1 || typeof watch('media_name') === 'undefined') ? (
        <Controller
            control={control}
            name={'media_name'}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
                <FieldSelect
                    {...(value && {
                        onReset: () => {
                            setValue('media_name', undefined);
                        },
                    })}
                    queryKey={['touchpointMedia']}
                    request={async () => {
                        return mediaOptions;
                    }}
                    footer={() => {
                        return (
                            <IconButton
                                size="default"
                                variant="text"
                                type="secondary"
                                sx={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    gap: '12px',
                                    justifyContent: 'flex-start',
                                    textTransform: 'capitalize',
                                    borderRadius: 0,
                                }}
                                onClick={() => {
                                    handlerSelectURL();
                                }}
                            >
                                <Icon name="add" fontSize={24} style={{ color: 'var(--color-primary-1)' }} />
                                <Space size={4}>
                                    <Typography
                                        variant="BodyTight"
                                        style={{
                                            color: 'var(--color-primary-1)',
                                        }}
                                    >
                                        {t('campaign_media_other')}
                                    </Typography>
                                </Space>
                            </IconButton>
                        );
                    }}
                    error={!!error}
                    helperText={error?.message}
                    value={value}
                    onChange={(val) => {
                        if (val === 'other') {
                            return;
                        }
                        onChange(val);
                    }}
                    popoverProps={{
                        disablePortal: false,
                    }}
                    fullWidth
                    label={`${t('campaign_media_title')}${watch('utm_tracking') ? '*' : ''}`}
                    description={watch('utm_tracking') ? t('campaign_utm_medium_subtitle') : t('campaign_media_subtitle')}
                    placeholder={t('campaign_initiation_phrase_placeholder')}
                />
            )}
        />
    ) : (
        <Controller
            control={control}
            name={'media_name'}
            rules={{
                validate: {
                    checkSpace: (val: string | null | undefined) => {
                        if (val && val.length > 0) {
                            return val.trim().length > 0 || t('validation_qrcode_phase_pattern');
                        }
                    },
                },
                maxLength: {
                    value: 50,
                    message: t('validation_qrcode_media_name_length'),
                },
            }}
            render={({ field, fieldState: { error } }) => (
                <FieldText
                    inputRef={otherMediaRef}
                    label={`${t('campaign_media_title')}${watch('utm_tracking') ? '*' : ''}`}
                    description={watch('utm_tracking') ? t('campaign_utm_medium_subtitle') : t('campaign_media_subtitle')}
                    fullWidth
                    placeholder={t('campaign_media_other_placeholder')}
                    error={!!error}
                    onReset={onReset}
                    helperText={error?.message}
                    {...field}
                />
            )}
        />
    );
};

export default SelectMedia;
