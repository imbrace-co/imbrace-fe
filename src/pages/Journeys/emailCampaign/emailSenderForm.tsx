import { FieldSelect, Icon, IconButton, Space, Typography } from '@imbrace/ui';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { getOrgMembersEmail } from '@/services/api/app';
import apiFetch from '@/services/axios/handler';

const EmailSenderForm = ({
    methods,
    onClose,
}: {
    methods: UseFormReturn<
        {
            emailSender: string;
        },
        any
    >;
    onClose: () => void;
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <Controller
            control={methods.control}
            name="emailSender"
            render={({ field, fieldState: { error } }) => (
                <FieldSelect
                    fullWidth
                    queryKey={['emailSenders']}
                    request={async () => {
                        const { data } = await apiFetch<{ data: API.User[] }>(getOrgMembersEmail.api(), getOrgMembersEmail.method);
                        return data.data.map((user) => ({
                            text: user.email,
                            value: JSON.stringify({
                                user_id: user._id,
                                email: user.email,
                            }),
                        }));
                    }}
                    renderValue={(selectedValue) => {
                        try {
                            const { email } = JSON.parse(selectedValue) as { email: string; user_id: string };
                            return email;
                        } catch (err) {
                            return '';
                        }
                    }}
                    footer={() => (
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
                                onClose();
                                navigate('/member', {
                                    state: {
                                        openInviterMember: true,
                                    },
                                });
                            }}
                        >
                            <Icon name="add" fontSize={24} style={{ color: 'var(--color-primary-1)' }} />
                            <Space size={4}>
                                <Typography style={{ color: 'var(--color-primary-1)' }}>{t('member_invite')}</Typography>
                            </Space>
                        </IconButton>
                    )}
                    placeholder={t('click_to_select')}
                    searchable
                    error={!!error}
                    helperText={error?.message}
                    {...field}
                />
            )}
        />
    );
};

export default EmailSenderForm;
