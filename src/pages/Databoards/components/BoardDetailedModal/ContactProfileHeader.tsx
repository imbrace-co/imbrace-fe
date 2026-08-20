import type { Attachment } from '@imbrace/ui';
import { EllipsisText, FieldDatePicker, FieldSelect, FieldText, Typography, Upload } from '@imbrace/ui';
import { Box, Divider } from '@mui/material';
import dayjs from 'dayjs';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import ActiveStatus from '@/components/ActiveStatus';
import OnlineStatus from '@/components/OnlineStatus';
import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import RecordID from '@/pages/Databoards/components/BoardDetailedModal/RecordID';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import { supportedImageFileExtensions, supportedImageFileMIME } from '@/utils';

import { ProfileContainer, ProfileContent, SubProfileInfo } from './StyledComponents';

interface Props {
    onSelectFile: (files?: Attachment[] | undefined) => void;
    selectedAvatarFile?: Attachment[];
    isEditMode: boolean;
    loading: boolean;
    selectedRowInfo?: CurrentBoardInfo;
    createdType: 'system' | 'manual';
    fields: Field[];
    isPresence?: boolean;
    channelType?: API.ChannelType;
}

interface GenderI18nType {
    [key: string]: string;

    Male: string;
    Female: string;
    Neutral: string;
}

const TitleI18n = {
    'Mr.': 'user_title_mr',
    'Mrs.': 'user_title_mrs',
    'Ms.': 'user_title_ms',
    'Miss.': 'user_title_miss',
    'Mx.': 'user_title_mx',
};

const GenderI18n: GenderI18nType = {
    Male: 'user_gender_male',
    Female: 'user_gender_female',
    Neutral: 'user_gender_neutral',
};

type ColorSchemeType = {
    viewMode: {
        system: {
            displayName: string;
            withoutValue: string;
            withValue: string;
            placeholder: string;
        };
        manual: {
            displayName: string;
            withoutValue: string;
            withValue: string;
            placeholder: string;
        };
    };
    editMode: {
        system: {
            displayName: string;
            withoutValue: string;
            withValue: string;
            placeholder: string;
        };
        manual: {
            displayName: string;
            withoutValue: string;
            withValue: string;
            placeholder: string;
        };
    };
};

export const colorScheme: ColorSchemeType = {
    viewMode: {
        system: {
            displayName: 'var(--color-light-7)',
            withoutValue: 'var(--color-light-4)',
            withValue: 'var(--color-light-5)',
            placeholder: 'var(--color-primary-1)',
        },
        manual: {
            displayName: 'var(--color-light-7)',
            withoutValue: 'var(--color-light-4)',
            withValue: 'var(--color-light-5)',
            placeholder: 'var(--color-primary-1)',
        },
    },
    editMode: {
        system: {
            displayName: 'var(--color-light-7)',
            withoutValue: 'var(--color-light-4)',
            withValue: 'var(--color-light-4)',
            placeholder: 'var(--color-primary-1)',
        },
        manual: {
            displayName: 'var(--color-light-7)',
            withoutValue: 'var(--color-primary-1)',
            withValue: 'var(--color-light-4)',
            placeholder: 'var(--color-primary-1)',
        },
    },
};

const ContactProfileHeader = (props: Props) => {
    const { onSelectFile, selectedAvatarFile, isEditMode, selectedRowInfo, createdType, fields, isPresence, channelType } = props;
    const { t } = useTranslation();
    const mode = isEditMode ? 'editMode' : 'viewMode';

    const {
        getValues,
        control,
        formState: { errors },
        setError,
        watch,
    } = useFormContext();

    const renderTitle = () => {
        const isWithValue = !!getValues('title') ? 'withValue' : 'withoutValue';
        const titleField = fields && fields.find((field) => field?.default_field_name === 'title');

        if (isEditMode) {
            return (
                <Controller
                    name={'title'}
                    control={control}
                    render={({ field, fieldState: { error } }) => {
                        const titleOptions =
                            titleField?.data?.map((item) => {
                                return { value: item._id, text: t(TitleI18n[item.value as keyof typeof TitleI18n]) };
                            }) || [];

                        const getDefaultValue = titleOptions.find((item) => {
                            return item.text === field.value;
                        });
                        return (
                            <FieldSelect
                                queryKey={['title']}
                                onChange={(event) => {
                                    field.onChange(event);
                                }}
                                value={getDefaultValue?.value ?? ''}
                                error={!!error}
                                helperText={error?.message}
                                placeholder={t('user_title')}
                                request={async () => titleOptions}
                                containerStyle={{
                                    height: 'auto',
                                    minWidth: 'auto',
                                    border: 0,
                                    borderRadius: 0,
                                    padding: 0,
                                    gap: '4px',
                                }}
                                placeholderStyle={{
                                    color: colorScheme[mode][createdType].placeholder,
                                }}
                            />
                        );
                    }}
                />
            );
        }
        return (
            <Typography variant="BodyTight" style={{ color: colorScheme[mode][createdType][isWithValue] }}>
                {!!getValues('title') ? t(TitleI18n[getValues('title') as keyof typeof TitleI18n]) : t('user_title')}
            </Typography>
        );
    };

    const renderDisplayName = () => {
        if (isEditMode) {
            return (
                <Controller
                    name={'name'}
                    control={control}
                    rules={{
                        required: {
                            value: true,
                            message: t('validation_crm_field_name_required'),
                        },
                    }}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                id={'name'}
                                error={!!error}
                                helperText={error?.message}
                                placeholder={`${t('user_display_name')}*`}
                                fullWidth
                                {...field}
                                formControlSx={{
                                    gap: 0,
                                    '& .MuiFormHelperText-root': {
                                        marginLeft: 0,
                                        marginBottom: '8px',
                                        lineHeight: '15.6px',
                                    },
                                }}
                                bordered={false}
                                compact
                                sx={{
                                    height: 'auto',
                                    width: '424px',
                                    '& .MuiInputBase-input': {
                                        fontWeight: '800',
                                        fontSize: '20px',
                                        lineHeight: '120%',
                                    },

                                    '& input::placeholder': {
                                        color: error ? 'var(--color-light-3)' : colorScheme[mode][createdType].placeholder,
                                        opacity: 1,
                                    },
                                }}
                            />
                        );
                    }}
                />
            );
        }
        return (
            <EllipsisText
                text={getValues('name') || t('user_display_name')}
                element={
                    <Typography
                        variant="Heading2"
                        style={{
                            width: '424px',
                            minHeight: '24px',
                            color: colorScheme[mode][createdType].displayName,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            wordBreak: 'break-word',
                        }}
                    />
                }
            />
        );
    };

    const renderBirthday = () => {
        const isWithValue = !!getValues('birthday') ? 'withValue' : 'withoutValue';

        if (isEditMode) {
            return (
                <Controller
                    name="birthday"
                    control={control}
                    defaultValue=""
                    render={({ field: { onChange, value, onBlur, ...rest }, fieldState: { error } }) => {
                        const setErrorMsg = () => {
                            setError('birthday', { message: t('validation_crm_field_birthday_pattern') }, { shouldFocus: true });
                        };

                        return (
                            <>
                                <FieldDatePicker
                                    value={new Date(value as string | number)}
                                    onChange={(val, err) => {
                                        if (val === null) {
                                            onChange('');
                                            return;
                                        }
                                        if (err.validationError) {
                                            setErrorMsg();
                                            return;
                                        }
                                        onChange(new Date(val).toISOString());
                                    }}
                                    disableFuture
                                    disableOpenPicker
                                    error={!!error}
                                    helperText={error?.message}
                                    minDate={dayjs(new Date(0))}
                                    {...rest}
                                    sx={{
                                        '& .MuiInputBase-input': { padding: '8.5px 11px' },
                                        height: '20px',
                                        background: 'blue',
                                        border: '2px solid green',
                                    }}
                                    slotProps={{
                                        field: {
                                            fullWidth: true,
                                            sx: {
                                                minWidth: '100%',
                                            },
                                            bordered: false,
                                            compact: true,
                                            onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                                                if (e.target.value === 'MM/DD/YYYY') return;
                                                const pattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;

                                                if (pattern.test(e.target.value)) {
                                                    const inputDate = dayjs(e.target.value, 'MM/DD/YYYY');
                                                    const startDate = dayjs('01/01/1700', 'MM/DD/YYYY');

                                                    const isBeforeDate = inputDate.isBefore(startDate);
                                                    if (isBeforeDate) setErrorMsg();
                                                    return;
                                                }

                                                if (!pattern.test(e.target.value)) {
                                                    setErrorMsg();
                                                    return;
                                                }
                                            },
                                        } as any,
                                    }}
                                    formControlSx={{
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5',
                                        height: '20px',
                                        display: 'flex',
                                        justifyContent: 'center',

                                        '& .MuiInputBase-root': {
                                            height: '20px',
                                            border: 'none',
                                            '& .MuiInputBase-input': {
                                                color: value
                                                    ? 'var(--color-light-7)'
                                                    : !!error
                                                    ? 'var(--color-light-7)'
                                                    : colorScheme[mode][createdType].placeholder,
                                            },
                                        },
                                        '& .MuiFormHelperText-root': {
                                            position: 'absolute',
                                            bottom: '-14px',
                                            left: 0,
                                            marginLeft: 0,
                                            width: '300px',
                                        },
                                    }}
                                />
                            </>
                        );
                    }}
                />
            );
        }

        const getAge = () => {
            const birthday = getValues('birthday');
            let tempAge: number | undefined = undefined;
            if (birthday && birthday.length > 0) {
                const birthdayDate = new Date(birthday);
                const ageDifMs = Date.now() - birthdayDate.getTime();
                const ageDate = new Date(ageDifMs);
                tempAge = Math.abs(ageDate.getUTCFullYear() - 1970);
            }
            return tempAge ? <>{`(${tempAge} ${t('contacts_years_old')})`}</> : '';
        };

        return (
            <>
                <Typography variant="BodyTight" style={{ color: colorScheme[mode][createdType][isWithValue] }}>
                    {getValues('birthday') || t('form_birthday')} {getAge()}
                </Typography>
            </>
        );
    };

    const renderGender = () => {
        const isWithValue = !!getValues('gender') ? 'withValue' : 'withoutValue';

        const genderField = fields.find((field) => field.default_field_name === 'gender');

        if (isEditMode) {
            return (
                <Controller
                    name={'gender'}
                    control={control}
                    render={({ field, fieldState: { error } }) => {
                        const genderOptions =
                            genderField?.data?.map((item) => {
                                return { value: item._id, text: t(GenderI18n[item.value as keyof typeof GenderI18n]) };
                            }) || [];

                        const getIdValue = genderOptions.find((item) => {
                            return item.text === field.value;
                        });

                        return (
                            <FieldSelect
                                queryKey={['gender']}
                                onChange={(event) => {
                                    field.onChange(event);
                                }}
                                value={getIdValue?.value ?? ''}
                                error={!!error}
                                helperText={error?.message}
                                placeholder={t('user_gender')}
                                request={async () => genderOptions}
                                containerStyle={{
                                    height: 'auto',
                                    width: '100%',
                                    minWidth: 'auto',
                                    border: 0,
                                    borderRadius: 0,
                                    padding: 0,
                                    gap: '4px',
                                }}
                                placeholderStyle={{
                                    color: colorScheme[mode][createdType].placeholder,
                                }}
                            />
                        );
                    }}
                />
            );
        }

        const genderValue: string = getValues('gender');
        return (
            <Typography variant="BodyTight" style={{ color: colorScheme[mode][createdType][isWithValue] }}>
                {t(GenderI18n[genderValue]) || t('user_gender')}
            </Typography>
        );
    };

    const renderLocation = () => {
        if (isEditMode) {
            return (
                <Controller
                    name={'location'}
                    control={control}
                    render={({ field, fieldState: { error } }) => {
                        return (
                            <FieldText
                                id={'location'}
                                error={!!error}
                                helperText={error?.message as string}
                                placeholder={`${t('user_location')}`}
                                {...field}
                                formControlSx={{
                                    minWidth: '55px',
                                    width: '55px',
                                }}
                                bordered={false}
                                compact
                                sx={{
                                    width: '55px ',
                                    height: 'auto',

                                    '& .MuiInputBase-root': {
                                        width: '55px',
                                    },

                                    '& .MuiInputBase-input': {
                                        fontWeight: '400',
                                        fontSize: '14px',
                                        lineHeight: '16.8px',
                                        width: '55px',
                                        resize: 'auto',
                                        '&::-webkit-input-placeholder': {
                                            color: colorScheme[mode][createdType].placeholder,
                                            opacity: 1,
                                        },
                                    },

                                    '& .MuiFormHelperText-root': {
                                        marginLeft: 0,
                                    },
                                }}
                            />
                        );
                    }}
                />
            );
        }

        return (
            <Typography
                variant="BodyTight"
                style={{
                    color: !!getValues('location') ? colorScheme[mode][createdType].withValue : colorScheme[mode][createdType].withoutValue,
                }}
            >
                {getValues('location') || t('user_location')}
            </Typography>
        );
    };
    const divider = (height: number) => {
        return (
            <Divider
                sx={{
                    height: height,
                    width: '1px',
                    borderColor: 'var(--color-light-5)',
                    alignSelf: 'center',
                    margin: '0 7px',
                }}
                orientation="vertical"
                variant="middle"
                flexItem
            />
        );
    };

    return (
        <ProfileContainer>
            <Upload
                type="avatar"
                fileValidation={async (file: File) => {
                    const { size, name, type } = file;
                    const extension = name.split('.')[1];
                    if (
                        (!extension || supportedImageFileExtensions.indexOf(extension) === -1) &&
                        supportedImageFileMIME.indexOf(type) === -1
                    ) {
                        return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                    }
                    if (size > 500 * 1000) {
                        return t('error_file_size', { size: '500 KB' });
                    }
                    return true;
                }}
                value={selectedAvatarFile}
                accept="image/png, image/jpeg, .svg"
                onChange={onSelectFile}
                disabled={!isEditMode}
                hideUploadButton={!isEditMode}
            />

            <ProfileContent>
                {/* title */}
                <Box
                    sx={{
                        height: '24px',
                        width: '71px',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {renderTitle()}
                </Box>
                {/* display_name */}
                <Box
                    sx={{
                        minHeight: '30px',
                        display: 'flex',
                        gap: '5px',
                        alignItems: 'center',
                    }}
                >
                    {renderDisplayName()}
                </Box>
                {/* Birthday age gender */}
                <SubProfileInfo>
                    <Box
                        sx={{
                            height: '20px',
                            width: isEditMode ? '90px' : 'auto',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        {renderBirthday()}
                    </Box>

                    {divider(12)}
                    <Box
                        sx={{
                            height: '20px',
                            width: '85px',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        {renderGender()}
                    </Box>
                </SubProfileInfo>

                {/* time_zone since OnlineStatus*/}
                <SubProfileInfo sx={{ marginTop: errors.birthday ? '14px' : 0 }}>
                    {renderLocation()}
                    {divider(12)}
                    {isEditMode ? (
                        <Typography
                            variant="BodyTight"
                            style={{
                                color: !!getValues('created_at')
                                    ? colorScheme[mode][createdType].withValue
                                    : colorScheme[mode][createdType].withoutValue,
                            }}
                        >
                            {selectedRowInfo?.boardItemId === 'new' ? (
                                <ActiveStatus time={new Date().toISOString()} color={'var(--color-light-4)'} />
                            ) : (
                                <ActiveStatus time={getValues('created_at')} color={'var(--color-light-4)'} />
                            )}
                        </Typography>
                    ) : (
                        <ActiveStatus time={getValues('created_at')} color={isEditMode ? 'var(--color-light-4)' : 'var(--color-light-5)'} />
                    )}

                    {channelType === 'web' && (
                        <>
                            {isEditMode ? (
                                <>
                                    {selectedRowInfo?.boardItemId !== 'new' && divider(12)}
                                    <Typography
                                        variant="BodyTight"
                                        style={{
                                            color: !!getValues('location')
                                                ? colorScheme[mode][createdType].withValue
                                                : colorScheme[mode][createdType].withoutValue,
                                        }}
                                    >
                                        {selectedRowInfo?.boardItemId !== 'new' && (
                                            <OnlineStatus
                                                isOnline={isPresence || watch('is_presence')}
                                                showTime={isPresence || !watch('is_presence')}
                                                time={getValues('last_seen')}
                                                color={isEditMode ? 'var(--color-light-4)' : 'var(--color-light-5)'}
                                            />
                                        )}
                                    </Typography>
                                </>
                            ) : (
                                <>
                                    {divider(12)}
                                    <OnlineStatus
                                        isOnline={isPresence || watch('is_presence')}
                                        showTime={isPresence || !watch('is_presence')}
                                        time={getValues('last_seen')}
                                        color={isEditMode ? 'var(--color-light-4)' : 'var(--color-light-5)'}
                                    />
                                </>
                            )}
                        </>
                    )}
                </SubProfileInfo>
            </ProfileContent>
            {selectedRowInfo?.boardItemId !== 'new' && (
                <Box sx={{ paddingRight: '16px', flex: 1, alignSelf: 'flex-end', textAlign: 'right' }}>
                    <RecordID boardId={selectedRowInfo?.boardId} boardItemId={selectedRowInfo?.boardItemId} crm />
                </Box>
            )}
        </ProfileContainer>
    );
};

export default ContactProfileHeader;
