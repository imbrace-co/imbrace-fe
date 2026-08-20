import { FieldText, Space } from '@imbrace/ui';
import type { TFunction } from 'i18next';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

export const FooterFormSchema = (t: TFunction<'translation', undefined>) =>
    z.object({
        submit_button_text: z.string({ required_error: t('validation_field_required') }).superRefine((val, ctx) => {
            if (!val || val.length < 1 || val.trim().length <= 0) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('validation_field_required'),
                    fatal: true,
                });

                return z.NEVER;
            }
        }),
        footer: z.string().optional(),
    });

export type FooterFormType = z.infer<ReturnType<typeof FooterFormSchema>>;

const EditFooterForm = ({ methods }: { methods: UseFormReturn<FooterFormType, any> }) => {
    const { control } = methods;
    const { t } = useTranslation();
    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Controller
                control={control}
                name="submit_button_text"
                render={({ field, fieldState: { error } }) => {
                    return (
                        <FieldText {...field} fullWidth label={`${t('submit_button_text')}*`} error={!!error} helperText={error?.message} />
                    );
                }}
            />
            <Controller
                control={control}
                name="footer"
                render={({ field, fieldState: { error } }) => {
                    return <FieldText {...field} fullWidth label={t('footer')} error={!!error} helperText={error?.message} />;
                }}
            />
        </Space>
    );
};

export default EditFooterForm;
