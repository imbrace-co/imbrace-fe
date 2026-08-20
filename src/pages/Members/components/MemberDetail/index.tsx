import { Dropdown, EllipsisText, Icon, Typography as ImbraceTypography, useDialog } from '@imbrace/ui';
import UploadIcon from '@mui/icons-material/Upload';
import { Button as MuiButton, ClickAwayListener, Link, MenuItem, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import type { ChangeEvent, FC, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldError } from 'react-hook-form';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Avatar from '@/components/Avatar';
import Drawer from '@/components/Drawer';
import ResetPasswordDialog from '@/components/ResetPasswordDialog';
import RoleTag from '@/components/RoleTag';
import StatusTag from '@/components/StatusTag';
import TextField from '@/components/TextField';
import useAccess from '@/hooks/useAccess';
import type { FieldsEnumType, FieldsProps, FieldTextType, GenderI18nType, LanguageI18nType, MemberDetailFromType, MemberDetailProps, TeamType } from '@/pages/Members/IMember.types';
import type { ReduxUser } from '@/redux/slices/member.types';
import { useAppSelector } from '@/redux/store';
import { postAccountAvatar, putAccount } from '@/services/api/account';
import { putContactById } from '@/services/api/contact';
import { changeUserRole, deactivateUser, putUser, reactivateUser } from '@/services/api/user';
import { ImbraceFileUpload } from '@/services/axios';
import apiFetch from '@/services/axios/handler';
import styles from './index.module.scss';
const GenderI18n: GenderI18nType = {
    m: 'user_gender_male',
    f: 'user_gender_female',
    n: 'user_gender_neutral',
};
const LanguageI18n: LanguageI18nType = {
    en: 'user_language_en',
    zh: 'user_language_zh',
    cn: 'user_language_cn',
};

const FieldText = styled(Typography, { shouldForwardProp: (props) => props !== 'isEditable' })<FieldTextType>(({ isEditable }) => ({
    color: 'var(--color-light-7)',
    fontWeight: 500,
    cursor: isEditable ? 'pointer' : 'text',
    ...(isEditable
        ? {
              '&:hover': {
                  color: 'var(--color-primary-1)',
              },
          }
        : {}),
}));

const Fields = ({ title, value, type, isEditable, keyName, rules, onEdit }: FieldsProps) => {
    const { t } = useTranslation();
    const [editing, setEditing] = useState<boolean>(false);
    const formRef = useRef<HTMLFormElement>(null);
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        trigger,
    } = useForm<MemberDetailFromType>({
        mode: 'all',
        defaultValues: {
            [keyName]: value,
        },
    });

    useEffect(() => {
        reset({
            [keyName]: value,
        });
    }, [reset, keyName, value]);

    const onEditing = () => {
        setEditing(true);
    };

    const onFinishEdit = async () => {
        const isValidate = await trigger();
        if (isValidate) {
            formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        } else {
            reset();
            setEditing(false);
        }
    };

    const onSubmit = async (formData: MemberDetailFromType) => {
        try {
            if (formData[keyName] === value) {
                setEditing(false);
                return;
            }
            onEdit(formData);
            setEditing(false);
        } catch (error) {
            console.log(error);
            setEditing(false);
        }
    };

    const renderValue = () => {
        switch (type) {
            case 'gender': {
                if (isEditable) {
                    if (!value && !editing) {
                        return (
                            <FieldText
                                isEditable={isEditable}
                                sx={{
                                    color: 'var(--color-primary-1)',
                                }}
                                onClick={onEditing}
                            >
                                ADD
                            </FieldText>
                        );
                    }
                    if (editing) {
                        return (
                            <ClickAwayListener
                                mouseEvent="onMouseDown"
                                touchEvent="onTouchStart"
                                onClickAway={() => onFinishEdit()}
                                disableReactTree
                            >
                                <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                                    <Controller
                                        name={keyName}
                                        control={control}
                                        rules={rules}
                                        render={({ field }) => (
                                            <TextField
                                                select
                                                error={!!errors?.[keyName]}
                                                helperText={
                                                    (errors?.member?.[keyName as keyof typeof errors.member] as FieldError)?.message
                                                }
                                                SelectProps={{
                                                    MenuProps: { disablePortal: true },
                                                }}
                                                {...field}
                                            >
                                                <MenuItem value="m">{t(GenderI18n.m)}</MenuItem>
                                                <MenuItem value="f">{t(GenderI18n.f)}</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </form>
                            </ClickAwayListener>
                        );
                    }
                    return (
                        <FieldText isEditable={isEditable} onClick={onEditing}>
                            {t(GenderI18n[value as keyof GenderI18nType])}
                        </FieldText>
                    );
                }
                return <FieldText>{t(GenderI18n[value as keyof GenderI18nType])}</FieldText>;
            }
            case 'language': {
                if (isEditable) {
                    if (!value && !editing) {
                        return (
                            <FieldText
                                isEditable={isEditable}
                                sx={{
                                    color: 'var(--color-primary-1)',
                                }}
                                onClick={onEditing}
                            >
                                ADD
                            </FieldText>
                        );
                    }
                    if (editing) {
                        return (
                            <ClickAwayListener
                                mouseEvent="onMouseDown"
                                touchEvent="onTouchStart"
                                onClickAway={() => onFinishEdit()}
                                disableReactTree
                            >
                                <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                                    <Controller
                                        name={keyName}
                                        control={control}
                                        rules={rules}
                                        render={({ field }) => (
                                            <TextField
                                                select
                                                error={!!errors?.[keyName]}
                                                helperText={
                                                    (errors?.member?.[keyName as keyof typeof errors.member] as FieldError)?.message
                                                }
                                                SelectProps={{
                                                    MenuProps: { disablePortal: true },
                                                }}
                                                {...field}
                                            >
                                                <MenuItem value="en">{t(LanguageI18n.en)}</MenuItem>
                                                <MenuItem value="zh">{t(LanguageI18n.zh)}</MenuItem>
                                                <MenuItem value="cn">{t(LanguageI18n.cn)}</MenuItem>
                                            </TextField>
                                        )}
                                    />
                                </form>
                            </ClickAwayListener>
                        );
                    }
                    return (
                        <FieldText isEditable={isEditable} onClick={onEditing}>
                            {t(LanguageI18n[value as keyof LanguageI18nType])}
                        </FieldText>
                    );
                }
                return <FieldText>{t(LanguageI18n[value as keyof LanguageI18nType])}</FieldText>;
            }
            case 'role': {
                if (!isEditable && value) {
                    return <RoleTag role={value as API.Role} />;
                }
                if (editing) {
                    return (
                        <ClickAwayListener
                            mouseEvent="onMouseDown"
                            touchEvent="onTouchStart"
                            onClickAway={() => onFinishEdit()}
                            disableReactTree
                        >
                            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                                <Controller
                                    name={'role'}
                                    control={control}
                                    rules={rules}
                                    render={({ field }) => (
                                        <TextField
                                            select
                                            error={!!errors?.role}
                                            helperText={(errors?.member?.[keyName as keyof typeof errors.member] as FieldError)?.message}
                                            SelectProps={{
                                                MenuProps: { disablePortal: true },
                                            }}
                                            {...field}
                                        >
                                            {/* OSS has Member role only */}
                                            <MenuItem value="member">{t('role_member')}</MenuItem>
                                        </TextField>
                                    )}
                                />
                            </form>
                        </ClickAwayListener>
                    );
                }
                return (
                    <div style={{ cursor: isEditable ? 'pointer' : 'text' }} onClick={onEditing}>
                        <RoleTag role={value as API.Role} />
                    </div>
                );
            }
            case 'teamRole':
                return <RoleTag role={value as API.Role} isTeamRole />;
            case 'email':
                if (isEditable) {
                    if (!value && !editing) {
                        return (
                            <FieldText
                                isEditable={isEditable}
                                sx={{
                                    color: 'var(--color-primary-1)',
                                }}
                                onClick={onEditing}
                            >
                                ADD
                            </FieldText>
                        );
                    }
                    if (editing) {
                        return (
                            <ClickAwayListener
                                mouseEvent="onMouseDown"
                                touchEvent="onTouchStart"
                                onClickAway={() => onFinishEdit()}
                                disableReactTree
                            >
                                <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                                    <Controller
                                        name={keyName}
                                        control={control}
                                        rules={rules}
                                        defaultValue={value as string}
                                        render={({ field }) => (
                                            <TextField
                                                id={keyName}
                                                disabled={!isEditable}
                                                error={!!errors?.[keyName]}
                                                helperText={errors?.[keyName]?.message}
                                                fullWidth
                                                {...field}
                                            />
                                        )}
                                    />
                                </form>
                            </ClickAwayListener>
                        );
                    }
                    return <EllipsisText text={value as string} element={<FieldText isEditable={isEditable} onClick={onEditing} />} />;
                }
                return (
                    <EllipsisText
                        text={value as string}
                        element={
                            <Link
                                href={`mailto:${value}`}
                                underline="none"
                                sx={{ display: 'block', color: 'var(--color-primary-1)', fontWeight: 500 }}
                            />
                        }
                    />
                );
            case 'team':
                return (
                    <div className={styles.teamContainer}>
                        {(value as TeamType[]).map((team: TeamType) => (
                            <div key={team.id} className={styles.subField}>
                                <div className={styles.teamAvatarContainer}>
                                    <Avatar
                                        isActive
                                        avatarUrl={team.icon_url}
                                        displayName={team.name}
                                        width={28}
                                        height={28}
                                        fontSize={13}
                                    />
                                    <div className={styles.teamName}>
                                        <span>{team.name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case 'timezone':
                return <EllipsisText text={value as string} element={<FieldText />} />;
            default: {
                if (!isEditable) {
                    return <EllipsisText text={value as string} element={<FieldText />} />;
                }
                if (!value && !editing) {
                    return (
                        <FieldText
                            isEditable={isEditable}
                            sx={{
                                color: 'var(--color-primary-1)',
                            }}
                            onClick={onEditing}
                        >
                            ADD
                        </FieldText>
                    );
                }
                return editing ? (
                    <ClickAwayListener
                        mouseEvent="onMouseDown"
                        touchEvent="onTouchStart"
                        onClickAway={() => onFinishEdit()}
                        disableReactTree
                    >
                        <form ref={formRef} onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
                            <Controller
                                name={keyName}
                                control={control}
                                rules={rules}
                                defaultValue={value as string}
                                render={({ field }) => (
                                    <TextField
                                        id={keyName}
                                        disabled={!isEditable}
                                        placeholder={t('channel_store_name')}
                                        error={!!errors?.[keyName]}
                                        helperText={errors?.[keyName]?.message}
                                        fullWidth
                                        {...field}
                                    />
                                )}
                            />
                        </form>
                    </ClickAwayListener>
                ) : (
                    <EllipsisText text={value as string} element={<FieldText isEditable={isEditable} onClick={onEditing} />} />
                );
            }
        }
    };

    return (
        <div className={styles.fields}>
            <div className={`${styles.fieldTitle} ${keyName === 'joined_teams' ? styles.team : ''}`}>
                <ImbraceTypography style={{ color: 'var(--color-light-5)' }}>{title}</ImbraceTypography>
            </div>
            <div className={`${keyName !== 'joined_teams' ? styles.field : ''}`}>{renderValue()}</div>
        </div>
    );
};

const MemberDetail: FC<MemberDetailProps> = (props) => {
    const { user, onFinish, isEditable, type = 'member', ...restProps } = props;
    const access = useAccess();
    const id = useAppSelector((state) => state.Account.id);
    const organizationId = useAppSelector((state) => state.Account.organizationId);
    const { t } = useTranslation();
    const { isUnderRole } = useAccess();
    const [loading, setLoading] = useState<boolean>(false);
    const [resetPasswordOpen, setResetPasswordOpen] = useState<boolean>(false);
    const [{ dialog }, dialogHolder] = useDialog();

    const uploadRef = useRef<HTMLInputElement>(null);

    const editable = useMemo(
        () => isEditable ?? (id === user?.id || (user && 'role' in user && isUnderRole(user?.role))),
        [isEditable, user, id, isUnderRole],
    );

    const FieldsEnum = useMemo<FieldsEnumType[]>(() => {
        switch (type) {
            case 'team':
                return [
                    {
                        key: 'first_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_first_name_required'),
                            },
                        },
                    },
                    {
                        key: 'last_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_last_name_required'),
                            },
                        },
                    },
                    {
                        key: 'display_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_display_name_required'),
                            },
                        },
                    },
                    { key: 'team_role', type: 'teamRole' },
                    {
                        key: 'email',
                        type: 'email',
                        rules: {
                            pattern: {
                                value: /^[a-zA-Z0-9._%-]+@[[a-zA-Z0-9.\-@]+\.[a-zA-Z]{2,4}$/,
                                message: t('validation_email_pattern'),
                            },
                            required: {
                                value: true,
                                message: t('validation_email_required'),
                            },
                        },
                    },
                    {
                        key: 'phone_number',
                        type: 'text',
                        rules: {
                            pattern: {
                                value: /^[0-9]+$/,
                                message: t('validation_phone_pattern'),
                            },
                            required: {
                                value: true,
                                message: t('validation_phone_required'),
                            },
                        },
                    },
                ];
            case 'user':
                return [
                    {
                        key: 'first_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_first_name_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    {
                        key: 'last_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_last_name_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    {
                        key: 'display_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_display_name_required'),
                            },
                        },
                    },
                    {
                        key: 'email',
                        type: 'email',
                        rules: {
                            pattern: {
                                value: /^[a-zA-Z0-9._%-]+@[[a-zA-Z0-9.\-@]+\.[a-zA-Z]{2,4}$/,
                                message: t('validation_email_pattern'),
                            },
                            required: {
                                value: true,
                                message: t('validation_email_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    {
                        key: 'phone_number',
                        type: 'text',
                        rules: {
                            pattern: {
                                value: /^[0-9]+$/,
                                message: t('validation_phone_pattern'),
                            },
                            required: {
                                value: true,
                                message: t('validation_phone_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    {
                        key: 'gender',
                        type: 'gender',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_gender_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    { key: 'time_zone', type: 'timezone' },
                    {
                        key: 'language',
                        type: 'language',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_language_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    { key: 'remark', type: 'text', isEditable: editable },
                ];
            case 'member':
            default:
                return [
                    {
                        key: 'first_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_first_name_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    {
                        key: 'last_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_last_name_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    {
                        key: 'display_name',
                        type: 'text',
                        rules: {
                            required: {
                                value: true,
                                message: t('validation_display_name_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    { key: 'role', type: 'role', isEditable: user?.id !== id && editable },
                    {
                        key: 'email',
                        type: 'email',
                        rules: {
                            pattern: {
                                value: /^[a-zA-Z0-9._%-]+@[[a-zA-Z0-9.\-@]+\.[a-zA-Z]{2,4}$/,
                                message: t('validation_email_pattern'),
                            },
                            required: {
                                value: true,
                                message: t('validation_email_required'),
                            },
                        },
                    },
                    {
                        key: 'phone_number',
                        type: 'text',
                        rules: {
                            pattern: {
                                value: /^[0-9]+$/,
                                message: t('validation_phone_pattern'),
                            },
                            required: {
                                value: true,
                                message: t('validation_phone_required'),
                            },
                        },
                        isEditable: editable,
                    },
                    { key: 'joined_teams', type: 'team' },
                ];
        }
    }, [type, t, editable, user?.id, id]);

    const onEdit = async (formData: MemberDetailFromType) => {
        try {
            let respData: ReduxUser | undefined = undefined;
            if (type === 'user' && user) {
                const putContactByIdApi = putContactById.api(user.id);
                const { data } = await apiFetch<ReduxUser>(putContactByIdApi, putContactById.method, {
                    ...formData,
                });
                respData = data;
            } else if ('role' in formData) {
                const { data } = await apiFetch<ReduxUser>(changeUserRole.api, changeUserRole.method, {
                    user_id: user?.id,
                    ...formData,
                });
                respData = data;
            } else if (id === user?.id && user) {
                const { data } = await apiFetch<ReduxUser>(putAccount.api.replace('{{user_id}}', user.id), putAccount.method, formData);
                respData = data;
            } else if (user) {
                const { data } = await apiFetch<ReduxUser>(putUser.api.replace('{{user_id}}', user.id), putAccount.method, formData);
                respData = data;
            }
            if (respData) {
                onFinish?.(respData);
            }

            return true;
        } catch (error) {
            console.log(error);
            return false;
        }
    };

    const onSelectFile = async (e: ChangeEvent<HTMLInputElement>) => {
        try {
            if (!e.target.files || e.target.files.length === 0) {
                return;
            }
            const avatarFormData = new FormData();
            avatarFormData.append('file', e.target.files[0]);
            const { data } = await apiFetch<{ url: string }>(
                postAccountAvatar.api,
                postAccountAvatar.method,
                avatarFormData,
                ImbraceFileUpload,
            );
            if (data.url) {
                await onEdit({ avatar_url: data.url });
            }
        } catch (error) {}
    };

    const suspendMember = useCallback(async () => {
        try {
            if (user?.id) {
                setLoading(true);
                const { data: userData } = await apiFetch<API.User>(deactivateUser.api, deactivateUser.method, {
                    user_id: user?.id,
                });
                onFinish?.(userData);
                setLoading(false);
            }
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    }, [onFinish, user?.id]);

    const reactivateMember = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await apiFetch<API.User>(reactivateUser.api, reactivateUser.method, {
                user_id: user?.id,
            });
            onFinish?.(data);
            setLoading(false);
        } catch (error) {
            console.log(error);
            setLoading(false);
        }
    }, [onFinish, user?.id]);

    const renderExtraButton = useCallback((): ReactNode | undefined => {
        return (
            <>
                {editable && type === 'member' && user && 'status' in user && (
                    <Dropdown
                        variant="text"
                        hideArrow
                        hideOnSelect
                        options={[
                            ...(user.status === 'active'
                                ? [
                                      {
                                          text: t('suspend'),
                                          index: 'member_suspend',
                                          disabled: user.role === 'owner',
                                          loading: loading,
                                      },
                                  ]
                                : [
                                      {
                                          text: t('reactivate'),
                                          index: 'member_reactivate',
                                          loading: loading,
                                      },
                                  ]),
                            // Anyone can reset a non-owner member's password; the owner is protected.
                            ...(user.id !== id && 'role' in user && isUnderRole(user.role)
                                ? [
                                      {
                                          text: t('reset_password'),
                                          index: 'member_reset_password',
                                      },
                                  ]
                                : []),
                        ]}
                        icon={<Icon name="more" />}
                        onSelect={async (event, selectedIndex) => {
                            event.stopPropagation();
                            if (selectedIndex === 'member_suspend') {
                                await suspendMember();
                            }
                            if (selectedIndex === 'member_reactivate') {
                                await reactivateMember();
                            }
                            if (selectedIndex === 'member_reset_password') {
                                setResetPasswordOpen(true);
                            }
                        }}
                    />
                )}
            </>
        );
    }, [t, editable, type, user, loading, suspendMember, reactivateMember, access, id]);

    return (
        <Drawer extraButton={() => renderExtraButton()} {...restProps}>
            {dialogHolder}
            {user && (
                <ResetPasswordDialog
                    open={resetPasswordOpen}
                    onClose={() => setResetPasswordOpen(false)}
                    userId={user.id}
                    title={t('reset_password')}
                    description={t('reset_password_member_desc')}
                    isAdmin
                />
            )}
            {user && (
                <div className={styles.memberDetail} style={type === 'user' ? { padding: '0 16px' } : {}}>
                    <div className={styles.fieldsContainer}>
                        <div className={styles.headerContainer}>
                            <div>
                                <div className={styles.uploadContainer}>
                                    <div className={styles.avatarContainer}>
                                        <Avatar
                                            avatarUrl={user.avatar_url}
                                            isActive={type === 'user' || ('is_active' in user && user.is_active)}
                                            displayName={user.display_name}
                                            firstName={user.first_name}
                                            lastName={user.last_name}
                                            width={100}
                                            height={100}
                                            fontSize={30}
                                        />
                                    </div>

                                    {editable && (
                                        <MuiButton
                                            variant="contained"
                                            sx={{
                                                position: 'absolute',
                                                borderRadius: '100%',
                                                minWidth: 40,
                                                width: 40,
                                                height: 40,
                                                right: 0,
                                                bottom: 0,
                                            }}
                                            onClick={() => {
                                                uploadRef?.current?.click();
                                            }}
                                        >
                                            <input
                                                ref={uploadRef}
                                                accept="image/png, image/jpeg"
                                                type="file"
                                                style={{ display: 'none' }}
                                                onInput={onSelectFile}
                                            />
                                            <UploadIcon />
                                        </MuiButton>
                                    )}
                                </div>
                            </div>
                            <div>
                                <ImbraceTypography variant="Heading2">{user.display_name}</ImbraceTypography>
                                {type === 'member' && 'status' in user && (
                                    <StatusTag isActive={user.status === 'active'} text={t(`status_${user.status}`)} />
                                )}
                            </div>
                        </div>
                        <div className={styles.detailContainer}>
                            {FieldsEnum.map((fieldEnum) => (
                                <Fields
                                    key={fieldEnum.key}
                                    keyName={fieldEnum.key}
                                    title={t(`user_${fieldEnum.key}`)}
                                    value={user[fieldEnum.key as keyof typeof user] || ''}
                                    type={fieldEnum.type}
                                    isEditable={fieldEnum.isEditable}
                                    rules={fieldEnum.rules}
                                    onEdit={onEdit}
                                />
                            ))}
                        </div>
                    </div>
                    {/*{editable && type === 'member' && 'status' in user && (*/}
                    {/*    <div className={styles.footer}>*/}
                    {/*        {user.status === 'active' ? (*/}
                    {/*            <Button*/}
                    {/*                type="danger"*/}
                    {/*                sx={{*/}
                    {/*                    width: '100%',*/}
                    {/*                }}*/}
                    {/*                onClick={() => {*/}
                    {/*                    suspendMember();*/}
                    {/*                }}*/}
                    {/*                disabled={user.role === 'owner'}*/}
                    {/*                loading={loading}*/}
                    {/*                text={t('suspend')}*/}
                    {/*            />*/}
                    {/*        ) : (*/}
                    {/*            <Button*/}
                    {/*                type="primary"*/}
                    {/*                variant="outlined"*/}
                    {/*                sx={{*/}
                    {/*                    width: '100%',*/}
                    {/*                }}*/}
                    {/*                onClick={() => {*/}
                    {/*                    reactivateMember();*/}
                    {/*                }}*/}
                    {/*                loading={loading}*/}
                    {/*                text={t('reactivate')}*/}
                    {/*            />*/}
                    {/*        )}*/}
                    {/*    </div>*/}
                    {/*)}*/}
                    {/* <div className={styles.footer}>
                        <Button sx={{ width: '100%', backgroundColor: 'var(--color-primary-1)' }} variant="contained" onClick={() => {}}>
                            {t('member_remove')}
                        </Button>
                    </div> */}
                </div>
            )}
        </Drawer>
    );
};

export default MemberDetail;
