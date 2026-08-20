import { FieldText, Space } from '@imbrace/ui';
import AddIcon from '@mui/icons-material/Add';
import { LoadingButton } from '@mui/lab';
import { Button, Typography } from '@mui/material';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';
import TextField from '@/components/TextField';
import { useAppSelector } from '@/redux/store';
import { postMessages, putMessagesById } from '@/services/api/messageTemplates';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';

interface OperationDrawerProps {
    template?: {
        id: string;
        title: string;
        text: string;
        workflow_id?: string;
    };
    open: boolean;
    onFinish: () => void;
    onClose: () => void;
    title: string;
}
interface formDataType {
    title: string;
    text: string;
    workflow_id?: string;
}
const OperationDrawer: FC<OperationDrawerProps> = (props) => {
    const { template, onFinish, ...restProps } = props;
    const [loading, setLoading] = useState<boolean>(false);
    const formRef = useRef<HTMLFormElement>(null);
    const { t } = useTranslation();
    const { businessUnitList } = useAppSelector((state) => state.BusinessUnit);
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        getValues,
    } = useForm<formDataType>({
        mode: 'all',
        defaultValues: {
            title: '',
            text: '',
            workflow_id: '',
        },
    });

    useEffect(() => {
        if (restProps.open) {
            reset();
            if (template) {
                setValue('title', template.title);
                setValue('text', template.text);
                setValue('workflow_id', template.workflow_id);
            }
        }
    }, [restProps.open, template, reset, setValue]);

    const onSubmit = async (formData: formDataType) => {
        try {
            setLoading(true);
            if (template) {
                await apiFetch(putMessagesById.api(template.id), putMessagesById.method, {
                    ...formData,
                });
            } else {
                await apiFetch(postMessages.api, postMessages.method, {
                    ...formData,
                    business_unit_id: businessUnitList[0].id,
                });
            }

            setLoading(false);
            onFinish();
        } catch (error) {
            setLoading(false);
            console.log(error);
        }
    };

    const onAdd = async () => {
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };

    const updateMessageValue = (message: string) => {
        const lastTwoChar: string = message.slice(-2);
        if (lastTwoChar === '{{') {
            const variableNumber = getLastVariableNumber(message.slice(0, -2));
            message += `${variableNumber + 1}}}`;
        }
        return message;
    };

    const getLastVariableNumber = (text?: string) => {
        const regex = /{{\d+}}/g;
        const variable = text?.match(regex);
        const variableStr = variable?.join('');
        const variableNumber = variableStr?.match(/\d+/g)?.pop();
        return variableNumber ? parseInt(variableNumber, 10) : 0;
    };

    const addVariable = () => {
        let message = getValues('text');
        const variableNumber = getLastVariableNumber(message);
        message += `{{${variableNumber + 1}}}`;
        setValue('text', message);
    };

    return (
        <Drawer {...restProps}>
            <div className={styles.templateDetail}>
                <div className={styles.fieldsContainer}>
                    <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <Typography sx={{ fontWeight: 'bold', color: 'var(--color-light-7)' }}>
                                {t('message_templates_table_header_title')}
                            </Typography>
                            <Controller
                                name={'title'}
                                control={control}
                                rules={{
                                    required: {
                                        value: true,
                                        message: t('validation_message_template_title_required'),
                                    },
                                }}
                                render={({ field }) => (
                                    <TextField placeholder="Title" error={!!errors?.title} helperText={errors?.title?.message} {...field} />
                                )}
                            />
                        </div>
                        <Space direction="vertical" align="start" style={{ width: '100%' }}>
                            <div style={{ width: '100%' }}>
                                <Typography sx={{ fontWeight: 'bold', color: 'var(--color-light-7)' }}>
                                    {t('message_templates_table_header_content')}
                                </Typography>
                                <Controller
                                    name={'text'}
                                    control={control}
                                    rules={{
                                        required: {
                                            value: true,
                                            message: t('validation_message_template_text_required'),
                                        },
                                    }}
                                    render={({ field }) => (
                                        <TextField
                                            placeholder="Message"
                                            error={!!errors?.text}
                                            helperText={errors?.text?.message}
                                            multiline
                                            rows={8}
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(updateMessageValue(e.target.value));
                                            }}
                                        />
                                    )}
                                />
                            </div>

                            <div style={{ width: '100%' }} className={styles.operationDrawerToolbar}>
                                <Button
                                    variant="outlined"
                                    onClick={() => {
                                        addVariable();
                                    }}
                                    startIcon={<AddIcon />}
                                >
                                    {t('message_templates_add_variable')}
                                </Button>
                            </div>
                        </Space>
                        <div>
                            <Controller
                                name={'workflow_id'}
                                control={control}
                                render={({ field }) => <FieldText placeholder="Workflow Id" label="Workflow ID" {...field} />}
                            />
                        </div>
                    </form>
                </div>

                <div className={styles.footer}>
                    <LoadingButton
                        sx={{ width: '100%', boxShadow: ' 0 3px 10px 0 rgba(0, 0, 0, 0.16)', borderRadius: '10px' }}
                        variant="contained"
                        onClick={onAdd}
                        loading={loading}
                    >
                        {template ? t('message_templates_save') : t('message_templates_create')}
                    </LoadingButton>
                </div>
            </div>
        </Drawer>
    );
};
export default OperationDrawer;
