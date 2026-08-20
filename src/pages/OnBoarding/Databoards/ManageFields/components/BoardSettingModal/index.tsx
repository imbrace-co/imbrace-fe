import { FieldText, Tooltip } from '@imbrace/ui';
import { Box } from '@mui/material';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import styles from './index.module.scss';

export interface BoardSettingFormValue {
    name: string;
    description: string;
}

export interface BoardSettingProps extends UseFormReturn<BoardSettingFormValue, any> {
    board?: API.Board;
}

export const BoardSetting = ({ board, control }: BoardSettingProps) => {
    const { t } = useTranslation();
    const [boardDescLength, setBoardDescLength] = useState(board?.description.length || 0);
    const boardDescLimit = 1000;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Controller
                name="name"
                control={control}
                rules={{
                    required: t('validation_board_setting_name_required'),
                    validate: {
                        checkSpace: (val: string) => val.trim().length > 0 || t('validation_board_setting_name_required'),
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
                    <Tooltip
                        title={t('board_system_disabled_edit_name')}
                        disableHoverListener={!board || board?.type !== 'System'}
                        disableFocusListener={!board || board?.type !== 'System'}
                        placement="top"
                        arrow
                    >
                        <FieldText
                            label={`${t('board_setting_form_name')}*`}
                            fullWidth
                            multiline
                            error={!!error}
                            helperText={error?.message}
                            {...field}
                            disabled={board?.type === 'System'}
                        />
                    </Tooltip>
                )}
            />

            <Controller
                name="description"
                control={control}
                rules={{
                    maxLength: {
                        value: boardDescLimit,
                        message: t('validation_input_description_maxlength', {
                            max: boardDescLimit,
                        }),
                    },
                }}
                render={({ field, fieldState: { error } }) => (
                    <div className={styles.boardDesc}>
                        <FieldText
                            label={t('board_setting_form_description')}
                            fullWidth
                            multiline
                            error={!!error}
                            helperText={error?.message}
                            {...field}
                            minRows={4}
                            maxRows={7}
                            onChange={(e) => {
                                const boardContent = e.target.value;
                                field.onChange(boardContent.length > boardDescLimit ? boardContent.slice(0, boardDescLimit) : boardContent);
                                setBoardDescLength(boardContent.length > boardDescLimit ? boardDescLimit : boardContent?.length);
                            }}
                        />
                        <label
                            className={`${styles.boardLimit} ${
                                boardDescLength <= boardDescLimit ? styles.boardDescIsLimit : styles.boardDescOverLimit
                            }`}
                        >
                            {boardDescLength} / {boardDescLimit}
                        </label>
                    </div>
                )}
            />
        </Box>
    );
};
