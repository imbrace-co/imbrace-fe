import { FieldText } from '@imbrace/ui';
import type { FC } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

interface Props {
    name: string;
    rules: Record<string, Record<string, unknown>>;
    placeholder?: string;
}

const InputController: FC<Props> = ({ placeholder, ...rest }) => {
    const { control } = useFormContext();
    return (
        <Controller
            {...rest}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <FieldText fullWidth placeholder={placeholder} error={!!error} helperText={error?.message} {...field} />
            )}
        />
    );
};
export default InputController;
