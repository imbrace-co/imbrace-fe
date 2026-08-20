import { FieldText } from '@imbrace/ui';
import { Box } from '@mui/material';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

export interface RenameFileFormType {
    name: string;
}

type RenameFileFormProps = UseFormReturn<RenameFileFormType>;

const RenameFileForm = (props: RenameFileFormProps) => {
    console.log('RenameFileForm props:::', props);
    const { control } = props;
    const { t } = useTranslation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <Controller
                name={'name'}
                control={control}
                rules={{
                    required: {
                        value: true,
                        message: t('validation_knowledge_filename_required'),
                    },
                    minLength: {
                        value: 3,
                        message: t('validation_knowledge_filename_minlength'),
                    },
                    maxLength: {
                        value: 100,
                        message: t('validation_knowledge_filename_maxlength'),
                    },
                }}
                render={({ field, fieldState: { error } }) => (
                    <FieldText
                        label={`${t('knowledge_file_name')}*`}
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
        </Box>
    );
};

export default RenameFileForm;
