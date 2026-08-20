import { Folder } from "@/pages/KnowledgeHub";
import { Button, FieldText, Space } from "@imbrace/ui";
import { Box } from "@mui/material";
import { Controller, useFormState, useWatch } from "react-hook-form";


interface FolderSettingFormProps {
  control: any;
  getValues: () => any;
  folder: Folder | null;
  isEditMode: boolean;
  onClose: () => void;
  addNewSubFolder?: (folderName: string) => void;
  updateSubFolderName?: (folder: Folder) => void;
  t: (key: string) => string;
}

const FolderSettingForm = ({
  control,
  getValues,
  folder,
  isEditMode,
  onClose,
  addNewSubFolder,
  updateSubFolderName,
  t,
}: FolderSettingFormProps) => {
  const { isDirty, isValid } = useFormState({ control });
  const nameValue = useWatch({ control, name: 'name' });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <span
        style={{
          fontSize: 16,
          textTransform: 'uppercase',
          marginBottom: '10px',
          fontWeight: 800,
        }}
      >
        {t('knowledge_sub_folder_setting')}
      </span>

      <Controller
        name="name"
        control={control}
        rules={{
          required: t('validation_board_setting_name_required'),
          validate: {
            checkSpace: (val: string) =>
              val.trim().length > 0 || t('validation_board_setting_name_required'),
          },
          maxLength: {
            value: 150,
            message: t('validation_board_setting_name_maxlength'),
          },
          minLength: {
            value: 4,
            message: t('validation_board_setting_name_minlength'),
          },
        }}
        render={({ field, fieldState: { error } }) => (
          <FieldText
            label={t('knowledge_folder_name') + ' *'}
            placeholder={t('knowledge_folder_name')}
            fullWidth
            error={!!error}
            helperText={error?.message}
            {...field}
          />
        )}
      />

      <Space style={{ marginTop: '2vh' }} direction="horizontal" justify="end">
        <Button
          sx={{
            width: '160px',
            border: '1px solid var(--color-danger-1)',
            color: 'var(--color-danger-1)',
            background: 'var(--color-light-1)!important',
            borderRadius: '4px',
          }}
          variant="contained"
          text={t('cancel')}
          onClick={onClose}
        />
        <Button
          sx={{ width: '160px', borderRadius: '4px' }}
          variant="contained"
          text={isEditMode ? t('update') : t('create')}
          disabled={!isDirty || !isValid}
          onClick={() => {
            const currentName = getValues('name');
            if (isEditMode && folder) {
              folder.name = currentName;
              updateSubFolderName?.(folder);
            } else {
              addNewSubFolder?.(currentName);
            }
            setTimeout(() => onClose(), 0);
          }}
        />
      </Space>
    </Box>
  );
};

export default FolderSettingForm;