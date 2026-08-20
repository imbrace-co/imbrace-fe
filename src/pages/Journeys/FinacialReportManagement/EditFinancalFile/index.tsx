import { Controller, UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { FieldSelect, Space, FieldText } from '@imbrace/ui';

export const EditFinancalFile = ({
    methods,
    fileName,
    fileDescription,
    type,
}: {
    methods: UseFormReturn<
        {
            fileName: string;
            fileDescription: string;
        },
        any
    >;
    fileName: string;
    fileDescription: string;
    type: 'file' | 'report';
}) => {
    const { control } = methods;

    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                <Controller
                    name={'fileName'}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                        return (
                            <Space size={0} style={{ width: '100%'}} direction="vertical" align="start">
                                <FieldText
                                    fullWidth
                                    label={type === 'file' ? 'File Name' : 'Report Name'}
                                    value={value}
                                    placeholder={type === 'file' ? 'Enter file name' : 'Enter report name'}
                                    onChange={(e) => onChange(e.target.value)}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            </Space>
                        );
                    }}
                />

                <Controller
                    name={'fileDescription'}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                        return (
                            <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                <FieldText
                                    fullWidth
                                    label={type === 'file' ? 'File Description' : 'Report Description'}
                                    value={value}
                                    placeholder={type === 'file' ? 'Enter file description' : 'Enter report description'}
                                    onChange={(e) => onChange(e.target.value)}
                                    error={!!error}
                                    helperText={error?.message}
                                    multiline
                                    rows={6}
                                />
                            </Space>
                        );
                    }}
                />
            </Space>
        </Space>
    );
};
