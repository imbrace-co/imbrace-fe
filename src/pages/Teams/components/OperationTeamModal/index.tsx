import { FieldSelect, FieldText, FieldUpload, Icon, Space, Tooltip, Typography } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { TFunction } from 'i18next';
import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { teamAssignType } from '@/config/teamAssignModeConfig';
import { postTeamIcon } from '@/services/api/team';
import apiFetch from '@/services/axios/handler';
import { supportedImageFileExtensions, supportedImageFileMIME } from '@/utils';
import { AttachmentSchema, RequiredStringSchema } from '@/utils/schema';

export const CreateTeamFormSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        name: RequiredStringSchema(t),
        mode: z.enum(['grab', 'public']),
        file: AttachmentSchema.optional().superRefine((val, ctx) => {
            if (val?.some((attachment) => attachment.error)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: val.filter((attachment) => attachment.error)[0].error,
                    fatal: true,
                });
                return z.NEVER;
            }
        }),
    });

export type CreateTeamFormType = z.infer<ReturnType<typeof CreateTeamFormSchema>>;

interface TeamFormProps extends UseFormReturn<CreateTeamFormType, any> {
    title: string;
    onClose: () => void;
    current?: API.TeamListItem | API.Team;

    businessUnitList: API.BusinessUnit[];
    onConfirm?: () => Promise<void>;
    lockAssignMode?: (mode: API.TeamMode) => boolean | undefined;
}

const onUpload = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    const { data } = await apiFetch<API.FileUpload>(postTeamIcon.api, postTeamIcon.method, uploadFormData);
    return {
        url: data.url,
        id: '1',
        name: file.name,
        size: file.size,
    };
};

const OperationTeamModal = (props: TeamFormProps) => {
    const { current, control, lockAssignMode, setError, clearErrors } = props;
    const { t } = useTranslation();

    const modeOptions = useMemo(() => {
        return Object.entries(teamAssignType).map(([value, label]) => {
            const desc = (str: string) => {
                switch (str) {
                    case 'grab':
                        return t('teams_field_mode_grab_desc');
                    case 'public':
                        return t('teams_field_mode_public_desc');
                    default:
                        return '';
                }
            };
            return {
                value: value,
                text: lockAssignMode?.(value as API.TeamMode) ? (
                    <Space size={4} align="center">
                        <Typography>{t(label)}</Typography>
                        <Icon name="premium" style={{ color: 'var(--color-primary-1)', fontSize: 16 }} />
                    </Space>
                ) : (
                    t(label)
                ),
                description: desc(value),
            };
        });
    }, [t, lockAssignMode]);

    return (
        <Box sx={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Controller
                control={control}
                name="file"
                render={({ field, fieldState: { error } }) => (
                    <FieldUpload
                        {...field}
                        error={!!error}
                        helperText={error?.message}
                        type="avatar"
                        onUpload={onUpload}
                        fileValidation={async (file: File) => {
                            const { size, name, type } = file;
                            const extension = name.split('.')[1];
                            if (
                                (!extension || supportedImageFileExtensions.indexOf(extension) === -1) &&
                                supportedImageFileMIME.indexOf(type) === -1
                            ) {
                                return t('error_only_accept_file', { file: 'JPG, PNG, SVG' });
                            }
                            if (size > 5 * 1000 * 1000) {
                                return t('error_image_file_size', { size: '5 MB' });
                            }
                            return true;
                        }}
                        label={t('teams_icon_header')}
                        description={
                            <Typography style={{ color: 'var(--color-light-5)', whiteSpace: 'pre-line' }}>
                                {t('teamlist_icon_body')}
                            </Typography>
                        }
                        defaultIcon={<Icon name="photoOutlined" fontSize="36px" />}
                        onChange={(files) => {
                            field.onChange(files);

                            if (
                                files?.some(
                                    (file) => file.status === 'uploading' || file.status === 'deleting' || file.status === 'missingFile',
                                )
                            ) {
                                setError('root.hasProcessingFiles', { type: 'custom', message: 'hasProcessingFiles' });
                            } else {
                                clearErrors('root.hasProcessingFiles');
                            }
                        }}
                        accept="image/png, image/jpeg, .svg"
                    />
                )}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Controller
                    name={'name'}
                    control={control}
                    rules={{
                        required: {
                            value: false,
                            message: t('validation_team_name_required'),
                        },
                        minLength: {
                            value: 1,
                            message: t('validation_team_name_min_length'),
                        },
                        maxLength: {
                            value: 100,
                            message: t('validation_team_name_max_length'),
                        },
                    }}
                    render={({ field, fieldState: { error } }) => (
                        <FieldText
                            label={`${t('team_name')}*`}
                            error={!!error}
                            helperText={error?.message}
                            formControlSx={{
                                width: '100%',
                                '& .MuiFormControl-root': {
                                    width: '100%',
                                },
                            }}
                            {...field}
                        />
                    )}
                />

                <div>
                    <Tooltip
                        disableHoverListener={!current}
                        disableFocusListener
                        disableTouchListener
                        arrow
                        placement="top"
                        title={t('crm_field_stage_disabled_desc')}
                    >
                        <div>
                            <Controller
                                name={'mode'}
                                control={control}
                                rules={{
                                    required: {
                                        value: true,
                                        message: t('select_one_option'),
                                    },
                                }}
                                render={({ field, fieldState: { error } }) => {
                                    return (
                                        <FieldSelect
                                            queryKey={['team_assignment_method']}
                                            label={`${t('assignment_method')}${!!current ? '' : '*'}`}
                                            fullWidth
                                            error={!!error}
                                            helperText={error?.message}
                                            request={async () => modeOptions}
                                            disabled={!!current}
                                            placeholder={t('click_to_select')}
                                            onChange={field.onChange}
                                            value={field.value}
                                        />
                                    );
                                }}
                            />
                        </div>
                    </Tooltip>
                </div>
            </Box>
        </Box>
    );
};
export default OperationTeamModal;
