import { EllipsisText, Icon, Typography } from '@imbrace/ui';
import {
    AccountBalance as AccountBalanceIcon,
    Facebook as FacebookProfileIcon,
    Instagram as InstagramIcon,
    Mail as MailProfileIcon,
    Smartphone as SmartphoneIcon,
    WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import type { SxProps, Theme } from '@mui/material';
import { AccordionDetails, ClickAwayListener, Divider, Typography as MuiTypography } from '@mui/material';
import type { ReactElement } from 'react';
import { Fragment } from 'react';
import type { Control, FieldErrors, RegisterOptions, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import InputMask from 'react-input-mask';

import LineIcon from '@/assets/icons/line.svg?react';
import MessengerIcon from '@/assets/icons/messenger.svg?react';
import WechatIcon from '@/assets/icons/wechat.svg?react';
import { useAppSelector } from '@/redux/store';
import clsx from '@/utils/clsx';

import type { EditType } from '../../IMember.types';
import { Accordion, AccordionSummary, TextField } from '.';
import styles from './index.module.scss';
type formRulesType = {
    [x in keyof Partial<API.BaseContact>]: {
        rules?: Pick<RegisterOptions<Partial<API.BaseContact>>, 'maxLength' | 'minLength' | 'validate' | 'required' | 'pattern'>;
        sx?: SxProps<Theme>;
        icon?: ReactElement;
        title: string;
        width?: string;
        key: keyof API.BaseContact;
        colorRule: colorRuleType;
    };
};
type colorRuleType = {
    editModeWithValue: string;
    editModeWithoutValue: string;
    viewModeWithValue: string;
    viewModeWithoutValue: string;
};

const colorRule: colorRuleType = {
    editModeWithValue: 'var(--color-light-7)', // #333333;
    editModeWithoutValue: 'var(--color-primary-1)', //#156DF2;
    viewModeWithValue: 'var(--color-light-5)', //#828282;
    viewModeWithoutValue: 'var(--color-light-4)', //#BDBDBD
};

interface InfoAccordionProps {
    watch: UseFormWatch<Partial<API.BaseContact>>;
    editing: boolean;
    control: Control<Partial<API.BaseContact>, any>;
    basicInfoData: EditType;
    handleClickAway: (KeyVariable: keyof Partial<API.BaseContact>) => Promise<void>;
    errors: FieldErrors<Partial<API.BaseContact>>;
    setValue: UseFormSetValue<Partial<API.BaseContact>>;
    onEditing: (KeyVariable: keyof Partial<API.BaseContact>, value: boolean) => void;
    expanded: boolean;
    handleBasicInfoClick: () => void;
}

const getDivider = (height: number) => {
    return (
        <Divider
            sx={{ height: height, width: '1px', borderColor: '#e0e0e0', alignSelf: 'center', margin: '0 7px' }}
            orientation="vertical"
            variant="middle"
            flexItem
        />
    );
};

const InfoAccordion = ({
    expanded,
    handleBasicInfoClick,
    watch,
    editing,
    control,
    basicInfoData,
    handleClickAway,
    errors,
    setValue,
    onEditing,
}: InfoAccordionProps) => {
    const { t } = useTranslation();
    const contact = useAppSelector((state) => state.Contact.contact);

    const profileCompanyForm: formRulesType = {
        company_name: {
            key: 'company_name',
            title: t('form_company'),
            icon: <AccountBalanceIcon />,
            sx: {
                marginLeft: '15px',
                width: '150px',
            },
            colorRule: colorRule,
        },
        location: {
            key: 'location',
            title: t('form_position'),
            sx: {
                width: '150px',
            },
            colorRule: colorRule,
        },
    };

    const profileOtherForm: formRulesType = {
        phone_number: {
            key: 'phone_number',
            title: t('form_phone_number'),
            width: '80%',
            icon: <SmartphoneIcon />,
            rules: {
                pattern: {
                    value: /^[0-9]+$/,
                    message: t('validation_phone_pattern'),
                },
                maxLength: {
                    value: 15,
                    message: t('validation_phone_pattern_maxlength'),
                },
            },
            sx: {
                marginLeft: '15px',
                color: 'var(--color-light-5)',
            },
            colorRule: colorRule,
        },
        email: {
            key: 'email',
            title: t('form_email'),
            width: '80%',
            icon: <MailProfileIcon />,
            rules: {
                pattern: {
                    value: /^[a-zA-Z0-9._%-]+@[[a-zA-Z0-9.\-@]+\.[a-zA-Z]{2,4}$/,
                    message: t('validation_email_pattern'),
                },
            },
            sx: {
                marginLeft: '15px',
                color: 'var(--color-light-5)',
            },
            colorRule: colorRule,
        },
    };

    const conversationIdForm: formRulesType = {
        whatsapp_id: {
            key: 'whatsapp_id',
            title: t('form_whatsapp_id'),
            width: '50%',
            icon: <WhatsAppIcon fill={watch('whatsapp_id') ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue} />,
            sx: {
                marginLeft: '15px',
            },
            colorRule: colorRule,
        },
        facebook_id: {
            key: 'facebook_id',
            title: t('form_facebook_id'),
            width: '50%',
            icon: <FacebookProfileIcon />,
            sx: {
                marginLeft: '15px',
            },
            colorRule: colorRule,
        },
        wechat_id: {
            key: 'wechat_id',
            title: t('form_wechat_id'),
            width: '50%',
            icon: <WechatIcon fill={watch('wechat_id') ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue} />,
            sx: {
                marginLeft: '15px',
            },
            colorRule: colorRule,
        },
        messenger_id: {
            key: 'messenger_id',
            title: t('form_messenger_id'),
            width: '50%',
            icon: <MessengerIcon fill={watch('messenger_id') ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue} />,
            sx: {
                marginLeft: '15px',
            },
            colorRule: colorRule,
        },
        line_id: {
            key: 'line_id',
            title: t('form_line_id'),
            width: '50%',
            icon: <LineIcon fill={watch('line_id') ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue} />,
            sx: {
                marginLeft: '15px',
            },
            colorRule: colorRule,
        },
        instagram_id: {
            key: 'instagram_id',
            title: t('form_instagram_id'),
            width: '50%',
            icon: <InstagramIcon fill={watch('instagram_id') ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue} />,
            sx: {
                marginLeft: '15px',
            },
            colorRule: colorRule,
        },
    };

    const renderValue = (
        renderType: keyof Partial<API.BaseContact>,
        title: string,
        colorObj: colorRuleType,
        rules?: Pick<RegisterOptions<Partial<API.BaseContact>>, 'maxLength' | 'minLength' | 'validate' | 'required'>,
        sx?: SxProps<Theme>,
        width?: string,
    ) => {
        if (editing) {
            if (basicInfoData[renderType as keyof EditType]) {
                return (
                    <>
                        {renderType === 'birthday' ? (
                            <Controller
                                name={renderType}
                                control={control}
                                defaultValue=""
                                rules={rules}
                                render={({ field: { onChange, value } }) => (
                                    <ClickAwayListener
                                        mouseEvent="onMouseDown"
                                        touchEvent="onTouchStart"
                                        onClickAway={() => handleClickAway(renderType)}
                                        disableReactTree
                                    >
                                        <InputMask
                                            mask="99/99/9999"
                                            maskPlaceholder="MM/DD/YYYY"
                                            value={value as string}
                                            onChange={onChange}
                                        >
                                            <TextField id={renderType} placeholder={'MM/DD/YYYY'} sx={sx} width={width} autoFocus />
                                        </InputMask>
                                    </ClickAwayListener>
                                )}
                            />
                        ) : (
                            <Controller
                                name={renderType}
                                control={control}
                                rules={rules}
                                render={({ field }) => (
                                    <ClickAwayListener
                                        mouseEvent="onMouseDown"
                                        touchEvent="onTouchStart"
                                        onClickAway={() => handleClickAway(renderType)}
                                        disableReactTree
                                    >
                                        <TextField
                                            id={renderType}
                                            placeholder={title}
                                            error={!!errors?.[renderType]}
                                            helperText={errors?.[renderType]?.message}
                                            sx={sx}
                                            width={width}
                                            autoFocus
                                            {...field}
                                        />
                                    </ClickAwayListener>
                                )}
                            />
                        )}
                    </>
                );
            }
            if (renderType === 'birthday' && watch(renderType) === 'MM/DD/YYYY') {
                setValue('birthday', null);
            }
            return (
                <EllipsisText
                    key={renderType}
                    text={watch(renderType) || (renderType === 'birthday' ? 'MM/DD/YYYY' : title)}
                    {...((renderType === 'first_name' || renderType === 'last_name') && {
                        className: styles.name,
                    })}
                    element={
                        <MuiTypography
                            sx={{ ...sx, color: watch(renderType) ? colorObj.editModeWithValue : colorObj.editModeWithoutValue }}
                            onClick={() => onEditing(renderType, true)}
                        />
                    }
                />
            );
        }
        let display_name = title;
        if (renderType === 'first_name') {
            display_name = contact?.display_name ?? '';
        }
        if (renderType === 'last_name') return;
        return (
            <EllipsisText
                key={renderType}
                text={renderType !== 'first_name' ? watch(renderType) || title : display_name}
                element={
                    <MuiTypography
                        sx={{
                            ...sx,
                            color:
                                watch(renderType) || renderType === 'first_name'
                                    ? colorObj.viewModeWithValue
                                    : colorObj.viewModeWithoutValue,
                        }}
                    />
                }
            />
        );
    };

    return (
        <Accordion expanded={expanded} defaultExpanded={false} onChange={handleBasicInfoClick} sx={{ margin: 0 }}>
            <AccordionSummary
                expandIcon={
                    <Icon
                        name="dropDown"
                        style={{
                            fontSize: 24,
                        }}
                    />
                }
                sx={{
                    '&:hover': {
                        background: '#E8F2FC',
                    },
                }}
            >
                <Typography variant="SubHeading2">{t('contacts_basic_information')}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: 0 }}>
                <div className={styles.basicInfoContainer}>
                    <div className={clsx(styles.basicInfoSubContainer, styles.basicInfoRow)}>
                        {/* Company Form */}
                        <div className={styles.basicInfoItemContainer}>
                            {Object.entries(profileCompanyForm).map(([key, profileCompany]) => (
                                <Fragment key={`${key}_key`}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        {profileCompany.icon && (
                                            <div
                                                key={`${key}_icon`}
                                                className={styles.basicInfoIconContainer}
                                                style={{
                                                    color: watch(profileCompany.key)
                                                        ? colorRule.viewModeWithValue
                                                        : colorRule.viewModeWithoutValue,
                                                }}
                                            >
                                                {profileCompany.icon}
                                            </div>
                                        )}
                                        {renderValue(
                                            profileCompany.key,
                                            profileCompany.title,
                                            profileCompany.colorRule,
                                            {
                                                validate: {
                                                    checkSpace: (val: string | null | undefined) => {
                                                        if (val && val.length > 0) {
                                                            return val.trim().length > 0 || t('validation_name_pattern');
                                                        }
                                                    },
                                                },
                                            },
                                            profileCompany?.sx,
                                            profileCompany?.width,
                                        )}
                                    </div>
                                    {key === 'company_name' && <div key={`${key}_name`}> {getDivider(18)} </div>}
                                </Fragment>
                            ))}
                        </div>
                    </div>
                    {/* email phone */}
                    {Object.entries(profileOtherForm).map(([key, profileOther]) => (
                        <div key={`${key}_name`} className={styles.basicInfoSubContainer}>
                            <div
                                key={`${key}icon`}
                                className={styles.basicInfoIconContainer}
                                style={{
                                    color: watch(profileOther.key) ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue,
                                }}
                            >
                                {profileOther.icon}
                            </div>
                            {renderValue(
                                profileOther.key,
                                profileOther.title,
                                profileOther.colorRule,
                                profileOther?.rules,
                                profileOther?.sx,
                                profileOther?.width,
                            )}
                        </div>
                    ))}
                    {/* ID */}
                    <div className={styles.basicInfoIdRowContainer}>
                        {Object.entries(conversationIdForm).map(([key, conversationIdObj]) => (
                            <div key={`${key}_id`} className={clsx(styles.basicInfoSubContainer, styles.basicInfoIdContainer)}>
                                <div
                                    key={`${key}_icon`}
                                    className={styles.basicInfoIconContainer}
                                    style={{
                                        color: watch(conversationIdObj.key) ? colorRule.viewModeWithValue : colorRule.viewModeWithoutValue,
                                    }}
                                >
                                    {conversationIdObj.icon}
                                </div>
                                {renderValue(
                                    conversationIdObj.key,
                                    conversationIdObj.title,
                                    conversationIdObj.colorRule,
                                    {
                                        validate: {
                                            checkSpace: (val: string | null | undefined) => {
                                                if (val && val.length > 0) {
                                                    return val.trim().length > 0 || t('validation_id_pattern');
                                                }
                                            },
                                        },
                                    },
                                    conversationIdObj?.sx,
                                    conversationIdObj?.width,
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </AccordionDetails>
        </Accordion>
    );
};

export default InfoAccordion;
