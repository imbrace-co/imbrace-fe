import { Button } from '@imbrace/ui';
import CloseIcon from '@mui/icons-material/Close';
import { Divider, IconButton, MenuItem } from '@mui/material';
import type { AxiosError } from 'axios';
import type { FC } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import RoleTag from '@/components/RoleTag';
import Stepper from '@/components/Stepper';
import TextField from '@/components/TextField';
import type { InviteErrorMessage, InviteMember, InviteTabsProp, MemberFormValues } from '@/pages/Members/IMember.types';
import { inviteMembers } from '@/services/api/member';
import apiFetch from '@/services/axios/handler';
import { errorMessage } from '@/utils/notificationHelper';

import styles from './index.module.scss';

const Invite: FC<InviteTabsProp> = (props) => {
    const { step, setStep, onFinish } = props;
    const [members, setMembers] = useState<InviteMember[]>([]);
    const [inviting, setInviting] = useState(false);
    const [errorMembers, setErrorMembers] = useState<InviteErrorMessage[]>([]);
    const { t } = useTranslation();
    const {
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<MemberFormValues>({
        mode: 'all',
        defaultValues: {
            member: [
                {
                    email: '',
                    role: undefined,
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'member',
    });

    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (step === 0) {
            setErrorMembers([]);
        }
    }, [step]);

    const onAddField = () => {
        append({ email: '', role: undefined });
    };

    const onClear = (index: number) => {
        remove(index);
    };

    const onSubmit = (data: { member: InviteMember[] }) => {
        setMembers(data.member);
        setStep(1);
    };

    const onNext = () => {
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };

    const onConfirm = async () => {
        try {
            setInviting(true);
            await apiFetch(inviteMembers.api, inviteMembers.method, {
                invitations: members,
            });
            onFinish();
            setInviting(false);
        } catch (error) {
            const typedError = error as AxiosError;
            setInviting(false);
            const code = typedError?.response?.data?.code;
            if (code === 40000 || code === 400) {
                const { message } = typedError?.response?.data;

                if (message?.error === 'Emails already exist') {
                    const respErrorMembers = message.refs;
                    setErrorMembers(
                        respErrorMembers.map((errorMember: InviteMember) => ({
                            ...errorMember,
                            message: message?.error,
                        })),
                    );
                } else if (message?.error) {
                    errorMessage(message.error);
                } else if (typeof message === 'string') {
                    errorMessage(message);
                }
            }
        }
    };

    const renderStep = () => {
        if (step === 0) {
            return (
                <div className={styles.inviteMember}>
                    <div className={styles.inviteFormContainer}>
                        <div className={styles.form}>
                            <div className={`${styles.formFields} ${styles.formHeader}`}>
                                <div>
                                    <span className={styles.heading}>{t('member_add_member_heading_email')}</span>
                                </div>
                                <div>
                                    <span className={styles.heading}>{t('member_add_member_heading_role')}</span>
                                </div>
                                <div></div>
                            </div>
                            <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
                                {fields.map((field, index) => (
                                    <Fragment key={field.id}>
                                        <div className={styles.formFields}>
                                            <div>
                                                <Controller
                                                    name={`member.${index}.email`}
                                                    control={control}
                                                    defaultValue={field.email}
                                                    rules={{
                                                        pattern: {
                                                            value: /^[a-zA-Z\d._%-]+@[[a-zA-Z\d.\-@]+\.[a-zA-Z]{2,4}$/,
                                                            message: t('validation_email_pattern'),
                                                        },
                                                        required: {
                                                            value: true,
                                                            message: t('validation_email_required'),
                                                        },
                                                    }}
                                                    render={({ field: controlField }) => (
                                                        <TextField
                                                            placeholder="Email"
                                                            error={!!errors?.member?.[index]?.email}
                                                            helperText={errors?.member?.[index]?.email?.message}
                                                            {...controlField}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            <div>
                                                <Controller
                                                    name={`member.${index}.role`}
                                                    control={control}
                                                    rules={{
                                                        required: {
                                                            value: true,
                                                            message: t('validation_role_required'),
                                                        },
                                                    }}
                                                    render={({ field: controlField }) => (
                                                        <TextField
                                                            select
                                                            error={!!errors?.member?.[index]?.role}
                                                            helperText={errors?.member?.[index]?.role?.message}
                                                            {...controlField}
                                                        >
                                                            {/* OSS invites users as Member only */}
                                                            <MenuItem value="member">{t('role_member')}</MenuItem>
                                                        </TextField>
                                                    )}
                                                />
                                            </div>
                                            <div>
                                                {index !== 0 && (
                                                    <IconButton
                                                        onClick={() => {
                                                            onClear(index);
                                                        }}
                                                    >
                                                        <CloseIcon />
                                                    </IconButton>
                                                )}
                                            </div>
                                        </div>
                                        <Divider />
                                    </Fragment>
                                ))}
                            </form>
                        </div>
                        <Button
                            variant="text"
                            onClick={onAddField}
                            text={t('member_add_member_new_field')}
                            sx={{
                                color: '#3399fc',
                                padding: '6px 8px',
                                fontSize: '15px',
                                fontWeight: '400',
                                lineHeight: '16px',
                            }}
                        />
                    </div>
                    <div className={styles.footer}>
                        <Button variant="contained" onClick={onNext} text={t('member_add_member_next')} sx={{ width: '100%' }} />
                    </div>
                </div>
            );
        }
        if (step === 1) {
            return (
                <div className={styles.inviteMemberConfirm}>
                    <div>
                        <span className={styles.heading}>{t('member_add_member_heading_member_list')}</span>
                    </div>
                    <div className={styles.listContainer}>
                        {members.map((member, index) => {
                            const error = errorMembers.find((errorMember) => errorMember.email === member.email);
                            return (
                                <div key={index} className={`${styles.row} ${error ? styles.error : ''}`}>
                                    <div className={styles.header}>
                                        <span>{member.email}</span>
                                        {error && <span>{error.message}</span>}
                                    </div>

                                    {member.role && <RoleTag role={member.role} />}
                                </div>
                            );
                        })}
                    </div>
                    <div className={styles.footer}>
                        <Button text={t('member_add_member_confirm')} onClick={onConfirm} loading={inviting} />
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <>
            <div className={styles.stepperContainer}>
                <Stepper activeStep={step} />
            </div>

            {renderStep()}
        </>
    );
};

export default Invite;
