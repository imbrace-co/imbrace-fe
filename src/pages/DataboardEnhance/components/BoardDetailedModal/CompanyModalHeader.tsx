import type { Attachment } from '@imbrace/ui';
import { Button, EllipsisText, FieldSelect, FieldText, Icon, Space, Typography, Upload, useDialog } from '@imbrace/ui';
import { Box, Divider } from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { push } from 'redux-first-history';

import { colorScheme } from '@/pages/Databoards/components/BoardDetailedModal/ContactProfileHeader';
import type { Field } from '@/pages/Databoards/components/BoardDetailedModal/DetailModal';
import RecordID from '@/pages/Databoards/components/BoardDetailedModal/RecordID';
import type { CurrentBoardInfo } from '@/pages/Databoards/types';
import store from '@/redux/store';
import { getTeamConversationUserByConversationID } from '@/services/api/teamConversation';
import apiFetch from '@/services/axios/handler';
import { supportedImageFileExtensions, supportedImageFileMIME } from '@/utils';

import styles from './index.module.scss';
import { ChannelInfo } from './ModalHeader';
import { ModalHeading, ProfileContainer, SubProfileInfo } from './StyledComponents';

interface Props {
    onSelectFile: (files?: Attachment[] | undefined) => void;
    selectedLogoFile?: Attachment[];
    boardType: API.BoardType;
    isEditMode: boolean;
    fields: Field[];
    createdType?: 'system' | 'manual';
    selectedRowInfo?: CurrentBoardInfo;
    conversationIds?: string[];
    onClose?: () => void;
}

const CompanyModalHeader = (props: Props) => {
    const { isEditMode, fields, onSelectFile, selectedLogoFile, createdType = 'manual', selectedRowInfo, conversationIds, onClose } = props;
    const { t } = useTranslation();
    const mode = isEditMode ? 'editMode' : 'viewMode';
    const [{ dialog }, dialogHolder] = useDialog();
    const {
        control,
        getValues,
        formState: { errors },
    } = useFormContext();

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
    const handleNoPermissionNotify = (conversation: API.ConversationWithTeams) => {
        dialog({
            title: t('conversation_no_permission_to_access'),
            content: (
                <Space direction="vertical" size={24}>
                    <span>{t('conversation_no_permission_to_access_desc')}</span>
                    <div className={styles.conversations}>
                        <Space className={styles.container}>
                            <div className={styles.conversation}>
                                <div>{ChannelInfo[conversation.channel_type].icon}</div>

                                <EllipsisText text={conversation.name} style={{ fontSize: 14, color: 'var(--color-light-7)' }} />
                            </div>
                            <div className={styles.team}>
                                <EllipsisText
                                    text={conversation.teams?.[0]?.name}
                                    style={{ fontSize: 12, color: 'var(--color-light-5)' }}
                                />
                            </div>
                        </Space>
                    </div>
                </Space>
            ),
            onConfirm: async () => {},
            onClose: () => {
                store.dispatch(push('/teams'));
                onClose?.();
            },
            actionsAlign: 'flex-end',
            confirmText: t('done'),
            cancelText: t('my_teams'),
        });
    };

    const goToChatroom = async () => {
        try {
            if (conversationIds && conversationIds.length > 0) {
                const { data } = await apiFetch<{ data: API.TeamConversationUserItem[]; conversation: API.ConversationWithTeams }>(
                    getTeamConversationUserByConversationID.api(conversationIds[0]),
                    getTeamConversationUserByConversationID.method,
                );
                if (data.data.length > 0) {
                    store.dispatch(push(`/chatroom?conv_id=${data.data[0].conversation_id}`));
                    onClose?.();
                } else {
                    handleNoPermissionNotify(data.conversation);
                }
            }
        } catch (error) {}
    };

    const renderCompanyName = () => {
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
                    defaultValue={getValues('name') || ''}
                    render={({ field }) => (
                        <FieldText
                            onChange={(event) => {
                                field.onChange(event);
                            }}
                            value={field.value}
                            error={!!errors?.name}
                            helperText={errors?.name?.message as string}
                            placeholder={`${t('crm_company_name')}*`}
                            formControlSx={{
                                gap: 0,
                                '& .MuiFormHelperText-root': {
                                    marginLeft: 0,
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
                                    color: colorScheme[mode][createdType].placeholder,
                                    opacity: 1,
                                },
                                '& .MuiFormHelperText-root': {
                                    marginLeft: 0,
                                },
                            }}
                        />
                    )}
                />
            );
        }

        return (
            <EllipsisText
                text={getValues('name') || t('crm_company_name')}
                element={
                    <Typography
                        variant="Heading2"
                        style={{
                            width: '424px',
                            minHeight: '24px',
                            color: 'var(--color-light-7)',
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

    const renderCompanySize = () => {
        const findField = fields.find((field) => field.default_field_name === 'size');
        const singleSelectionMap =
            findField?.data?.reduce((acc: Record<string, string>, item: Record<string, string>) => {
                acc[item._id] = item.value;
                return acc;
            }, {}) || {};

        if (isEditMode) {
            const singleSelectionOptions = findField?.data?.map((item) => {
                return { value: item._id, text: item.value };
            });
            return (
                <Controller
                    name={'size'}
                    control={control}
                    defaultValue={getValues('size') || ''}
                    render={({ field }) => (
                        <FieldSelect
                            queryKey={['companySize']}
                            onChange={(event) => {
                                field.onChange(event);
                            }}
                            value={field.value}
                            error={!!errors?.size}
                            helperText={errors?.size?.message as string}
                            placeholder={t('crm_size')}
                            request={async () => singleSelectionOptions || []}
                            formControlSx={{
                                width: 'auto',
                            }}
                            containerStyle={{
                                height: 'auto',
                                width: '100%',
                                minWidth: 'auto',
                                border: 0,
                                borderRadius: 0,
                                padding: 0,
                                gap: 0,
                                justifyContent: 'between',
                            }}
                            placeholderStyle={{
                                color: colorScheme[mode][createdType].placeholder,
                            }}
                        />
                    )}
                />
            );
        }

        return (
            <EllipsisText
                element={<Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }} />}
                text={getValues('size') ? t('crm_company_size', { size: singleSelectionMap[getValues('size')] }) : t('crm_size')}
            />
        );
    };

    const renderCompanyLocation = () => {
        if (isEditMode) {
            return (
                <Controller
                    name={'location'}
                    control={control}
                    defaultValue={getValues('location') || ''}
                    render={({ field }) => (
                        <FieldText
                            onChange={(event) => {
                                field.onChange(event);
                            }}
                            value={field.value}
                            error={!!errors?.size}
                            helperText={errors?.size?.message as string}
                            placeholder={t('crm_location')}
                            bordered={false}
                            compact
                            sx={{
                                height: 'auto',
                                minWidth: 'auto',
                                '& .MuiInputBase-input': {
                                    fontWeight: '400',
                                    fontSize: '14px',
                                    lineHeight: '16.8px',
                                },

                                '& input::placeholder': {
                                    color: colorScheme[mode][createdType].placeholder,
                                    opacity: 1,
                                },
                                '& .MuiFormHelperText-root': {
                                    marginLeft: 0,
                                },
                            }}
                        />
                    )}
                />
            );
        }

        return (
            <EllipsisText
                element={<Typography variant="BodyTight" style={{ color: 'var(--color-light-5)' }} />}
                text={getValues('location') || t('crm_location')}
            />
        );
    };

    return (
        <ProfileContainer>
            {dialogHolder}
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
                    if (size > 20 * 1000 * 1000) {
                        return t('error_file_size', { size: '20 MB' });
                    }
                    return true;
                }}
                value={selectedLogoFile}
                accept="image/png, image/jpeg, .svg"
                onChange={onSelectFile}
                disabled={!isEditMode}
                hideUploadButton={!isEditMode}
            />

            <ModalHeading>
                {renderCompanyName()}
                <SubProfileInfo
                    sx={{
                        maxWidth: '435px',
                    }}
                >
                    <Box
                        sx={{
                            width: isEditMode ? (getValues('size') ? 'auto' : '46px') : 'auto',
                            maxWidth: '130px',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        {renderCompanySize()}
                    </Box>
                    {divider(12)}
                    <Box sx={{ width: 'auto', maxWidth: '100px', display: 'flex', alignItems: 'center' }}>{renderCompanyLocation()}</Box>
                    {conversationIds && conversationIds.length > 0 && (
                        <>
                            {divider(12)}
                            <Button
                                variant="link"
                                onClick={goToChatroom}
                                sx={{ fontWeight: 400 }}
                                text={
                                    <Space size={4}>
                                        <span>{t('conversation_chatroom')}</span>
                                        <Icon name="openNew" fontSize={16} />
                                    </Space>
                                }
                            />
                        </>
                    )}
                </SubProfileInfo>
            </ModalHeading>
            {selectedRowInfo?.boardItemId !== 'new' && (
                <Box sx={{ paddingRight: '16px', flex: 1, alignSelf: 'flex-end', textAlign: 'right' }}>
                    <RecordID boardId={selectedRowInfo?.boardId} boardItemId={selectedRowInfo?.boardItemId} crm />
                </Box>
            )}
        </ProfileContainer>
    );
};

export default CompanyModalHeader;
