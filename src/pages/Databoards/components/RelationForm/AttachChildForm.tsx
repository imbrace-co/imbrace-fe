import { FieldSelect, FieldText, Space, Typography } from '@imbrace/ui';
import { Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { Controller, type UseFormReturn, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { getBoardRecords, getBoards } from '@/services/api/crm';
import apiFetch from '@/services/axios/handler';

export const attachChildFormSchema = (t: TFunction, currentBoardId: string) =>
    z
        .object({
            field_name: z
                .string({ required_error: t('validation_field_required') })
                .superRefine((val, ctx) => {
                    if (!val || val.trim().length === 0) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: t('validation_field_required'),
                        });
                    }
                }),
            child_board_id: z
                .string({ required_error: t('databoard_relation_validation_target_required') })
                .min(1, { message: t('databoard_relation_validation_target_required') }),
        })
        .superRefine((data, ctx) => {
            if (data.child_board_id === currentBoardId) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('databoard_relation_validation_self_reference'),
                    path: ['child_board_id'],
                });
            }
        });

export type AttachChildFormType = z.infer<ReturnType<typeof attachChildFormSchema>>;

interface AttachChildFormProps {
    methods: UseFormReturn<AttachChildFormType>;
    currentBoardId: string;
    currentBoardType?: API.BoardType;
    excludeBoardIds?: string[];
}

const AttachChildForm = ({ methods, currentBoardId, currentBoardType, excludeBoardIds = [] }: AttachChildFormProps) => {
    const { control } = methods;
    const { t } = useTranslation();

    const selectedChildBoardId = useWatch({ control, name: 'child_board_id' });

    const { data: itemsCount } = useQuery({
        queryKey: ['boardItemsCount', selectedChildBoardId],
        queryFn: async () => {
            if (!selectedChildBoardId) return 0;
            const { data } = await apiFetch<API.PaginatedResponse<API.BoardItem[]>>(
                getBoardRecords.api(selectedChildBoardId),
                getBoardRecords.method,
                { limit: 1, skip: 0 },
            );
            return data?.count ?? 0;
        },
        enabled: !!selectedChildBoardId,
    });

    const fetchBoardOptions = async () => {
        const { data } = await apiFetch<API.PaginatedResponse<API.Board[]>>(
            getBoards.api({
                limit: 0,
                skip: 0,
                sort: 'name',
                hidden: false,
                independentOnly: true,
                ...(currentBoardType ? { types: currentBoardType } : {}),
            }),
            getBoards.method,
        );
        const exclude = new Set([currentBoardId, ...excludeBoardIds].filter(Boolean));
        return (data.data || [])
            .filter((board) => !exclude.has(board._id))
            .filter((board) => !currentBoardType || board.type === currentBoardType)
            .map((board) => ({
                value: board._id,
                text: board.name,
            }));
    };

    const hasItems = typeof itemsCount === 'number' && itemsCount > 0;

    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Controller
                control={control}
                name="field_name"
                defaultValue=""
                render={({ field, fieldState: { error } }) => (
                    <FieldText
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        label={`${t('databoard_attach_field_name')}*`}
                        placeholder={t('databoard_attach_field_name')}
                        helperText={error?.message}
                        error={!!error}
                    />
                )}
            />
            <Controller
                control={control}
                name="child_board_id"
                defaultValue=""
                render={({ field, fieldState: { error } }) => (
                    <FieldSelect
                        {...field}
                        value={field.value ?? ''}
                        fullWidth
                        searchable
                        label={`${t('databoard_attach_target_board')}*`}
                        placeholder={t('databoard_attach_target_placeholder')}
                        queryKey={['attachTargetBoards', currentBoardId, currentBoardType ?? '', excludeBoardIds.join(',')]}
                        request={fetchBoardOptions}
                        error={!!error}
                        helperText={error?.message}
                    />
                )}
            />
            {hasItems && (
                <Alert severity="warning" sx={{ fontSize: 13 }}>
                    <Typography variant="Body">
                        {t('databoard_attach_blocked_items', {
                            count: itemsCount,
                            defaultValue:
                                'This board has {{count}} items. Attach with item mapping is not yet supported.',
                        })}
                    </Typography>
                </Alert>
            )}
        </Space>
    );
};

export default AttachChildForm;
