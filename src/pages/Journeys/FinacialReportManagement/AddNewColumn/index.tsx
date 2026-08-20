import { Controller, UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { FieldSelect, Space, FieldText } from '@imbrace/ui';

export const AddNewColumn = ({
    methods,
}: {
    methods: UseFormReturn<
        {
            columnName: string;
            columnType: string;
        },
        any
    >;
}) => {
    const { control } = methods;

    return (
        <Space size={16} direction="vertical" align="stretch" style={{ width: '100%' }}>
            <Space size={4} direction="vertical" align="start" style={{ width: '100%' }}>
                <Controller
                    name={'columnName'}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                        return (
                            <Space size={0} style={{ width: '100%' }} direction="vertical" align="start">
                                <FieldText
                                    fullWidth
                                    label="Column Name"
                                    value={value}
                                    placeholder="Enter column name"
                                    onChange={(e) => onChange(e.target.value)}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            </Space>
                        );
                    }}
                />

                <Controller
                    name={'columnType'}
                    control={control}
                    render={({ field: { onChange, value }, fieldState: { error } }) => {
                        return (
                            <Space size={0} style={{ width: '100%', marginTop: '20px' }} direction="vertical" align="start">
                                <FieldSelect
                                    fullWidth
                                    label="Column Type"
                                    queryKey={['columnType']}
                                    request={() => [
                                        {
                                            text: 'VARCHAR (Text, variable length)',
                                            value: 'VARCHAR',
                                        },
                                        {
                                            text: 'INT (Integer)',
                                            value: 'INTEGER',
                                        },
                                        {
                                            text: 'BIGINT (Large integer)',
                                            value: 'BIGINT',
                                        },
                                        {
                                            text: 'SMALLINT (Small integer)',
                                            value: 'SMALLINT',
                                        },
                                        {
                                            text: 'DECIMAL (Exact decimal)',
                                            value: 'DECIMAL',
                                        },
                                        {
                                            text: 'FLOAT (Floating point)',
                                            value: 'FLOAT',
                                        },
                                        {
                                            text: 'BOOLEAN (True/False)',
                                            value: 'BOOLEAN',
                                        },
                                        {
                                            text: 'DATE (Date only)',
                                            value: 'DATE',
                                        },
                                        {
                                            text: 'TIME (Time only)',
                                            value: 'TIME',
                                        },
                                    ]}
                                    value={value}
                                    placeholder="Select column type"
                                    emptyText="No column types available"
                                    onReset={() => {
                                        onChange('');
                                    }}
                                    onChange={(value) => {
                                        onChange(value);
                                    }}
                                    error={!!error}
                                    helperText={error?.message}
                                />
                            </Space>
                        );
                    }}
                />
            </Space>
        </Space>
    );
};
