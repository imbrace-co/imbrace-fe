import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { LoadingButton } from '@mui/lab';
import { Box, Button, Divider, FormLabel, IconButton, Typography } from '@mui/material';
import type { FC } from 'react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import Drawer from '@/components/Drawer';
import TextField from '@/components/TextField';
import { useAppSelector } from '@/redux/store';
import { createStore, modifyStore } from '@/services/api/physicalStore';
import apiFetch from '@/services/axios/handler';

import styles from './index.module.scss';
interface OperationStoreDrawerType {
    open: boolean;
    onClose: () => void;
    current?: API.Channel;
    onFinish: () => void;
}

interface OperationStoreFormType {
    name: string;
    scanners: OperationStoreFormScannersType[];
}
interface OperationStoreFormScannersType {
    name: string;
    id: string;
}
const OperationStoreDrawer: FC<OperationStoreDrawerType> = (props) => {
    const { open, onClose, current, onFinish } = props;
    const [loading, setLoading] = useState(false);
    const businessUnitList = useAppSelector((state) => state.BusinessUnit.businessUnitList);
    const { t } = useTranslation();
    const formRef = useRef<HTMLFormElement>(null);
    const {
        control,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
    } = useForm<OperationStoreFormType>({
        mode: 'all',
        defaultValues: {
            name: '',
            scanners: [
                {
                    name: '',
                    // sensitive_level: '',
                },
            ],
        },
    });
    const { fields, append, remove, replace } = useFieldArray<OperationStoreFormType>({
        control,
        name: 'scanners',
    });

    useEffect(() => {
        if (!open) {
            if (!current) {
                reset();
            }
        } else if (current) {
            setValue('name', current.name);
            replace(
                current.floor_plans?.[0]?.scanners.map((scanner) => ({
                    name: scanner.name,
                    id: scanner.id,
                })) || [
                    {
                        name: '',
                        id: '',
                        // sensitive_level: '',
                    },
                ],
            );
        } else {
            reset();
        }
    }, [open, current, setValue, replace, reset]);

    const onAddField = () => {
        append({ name: '', id: '' });
    };

    const onClear = (index: number) => {
        remove(index);
    };
    const handleCreateStore = async (formData: OperationStoreFormType) => {
        try {
            setLoading(true);
            await apiFetch(createStore.api, createStore.method, {
                ...formData,
                business_unit_id: businessUnitList[0].id,
            });
            setLoading(false);
            onFinish();
        } catch (error) {
            setLoading(false);
            console.log(error);
        }
    };
    const handleEditStore = async (formData: OperationStoreFormType) => {
        try {
            if (current?.floor_plans) {
                setLoading(true);

                const currentScanners = current?.floor_plans[0].scanners;
                const deleteScanners: string[] = [];
                const createScanners = formData.scanners.filter((scanner) => !scanner.id);
                const updateScanners: OperationStoreFormScannersType[] = [];

                currentScanners?.forEach((scanner) => {
                    const existIndex = formData.scanners.findIndex((fScanner) => fScanner.id === scanner.id);
                    if (existIndex === -1) {
                        deleteScanners.push(scanner.id);
                    } else if (formData.scanners[existIndex].name !== scanner.name) {
                        updateScanners.push(formData.scanners[existIndex]);
                    }
                });

                await apiFetch(modifyStore.api, modifyStore.method, {
                    name: formData.name,
                    store_id: current?.id,
                    business_unit_id: businessUnitList[0].id,
                    delete_scanner_ids: deleteScanners,
                    create_scanners: createScanners,
                    update_scanners: updateScanners,
                });
                setLoading(false);
                onFinish();
            }
        } catch (error) {
            setLoading(false);
            console.log(error);
        }
    };
    const onSubmit = async (formData: OperationStoreFormType) => {
        if (current) {
            handleEditStore(formData);
            return;
        }
        handleCreateStore(formData);
    };

    const onNext = () => {
        formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    };

    return (
        <Drawer
            title={!!current ? t('channel_physical_store_edit_store') : t('channel_physical_store_new_store')}
            open={open}
            onClose={onClose}
        >
            <div className={styles.operationStore}>
                <div className={styles.fieldsContainer}>
                    <form ref={formRef} onSubmit={handleSubmit(onSubmit)}>
                        <Box sx={{ mb: '10px' }}>
                            <FormLabel sx={{ fontWeight: 'bold', color: 'var(--color-light-7)' }} htmlFor="name">
                                {t('channel_store_name')}
                            </FormLabel>
                        </Box>
                        <Controller
                            name="name"
                            control={control}
                            rules={{
                                required: {
                                    value: true,
                                    message: t('validation_store_name_required'),
                                },
                                maxLength: {
                                    value: 100,
                                    message: t('validation_store_name_maxlength'),
                                },
                                minLength: {
                                    value: 4,
                                    message: t('validation_store_name_minlength'),
                                },
                                validate: {
                                    checkSpace: (val) => val.trim().length > 0 || t('validation_store_name_required'),
                                },
                            }}
                            render={({ field }) => (
                                <TextField
                                    id="name"
                                    placeholder={t('channel_store_name')}
                                    error={!!errors?.name}
                                    helperText={errors?.name?.message}
                                    fullWidth
                                    {...field}
                                />
                            )}
                        />
                        <Divider sx={{ marginTop: '30px', marginBottom: '30px' }} />
                        <Typography sx={{ fontWeight: 'bold', color: 'var(--color-light-7)' }}>{t('channel_devices_list')}</Typography>
                        <div className={styles.devicesContainer}>
                            {fields.length > 0 && (
                                <div className={`${styles.formFields} ${styles.formHeader}`}>
                                    <div>
                                        <span className={styles.heading}>{t('channel_device_name')}</span>
                                    </div>
                                    {/* <div>
                                        <span className={styles.heading}>{t('channel_sensitive_level')}</span>
                                    </div> */}
                                    <div></div>
                                </div>
                            )}
                            <div className={styles.devicesFormFieldsContainer}>
                                {fields.map((field, index) => (
                                    <Fragment key={field.id}>
                                        <div className={styles.formFields}>
                                            <div>
                                                <Controller
                                                    name={`scanners.${index}.name`}
                                                    control={control}
                                                    defaultValue={field.name}
                                                    rules={{
                                                        required: {
                                                            value: true,
                                                            message: t('validation_device_name_required'),
                                                        },
                                                        maxLength: {
                                                            value: 100,
                                                            message: t('validation_device_name_maxlength'),
                                                        },
                                                        minLength: {
                                                            value: 4,
                                                            message: t('validation_device_name_minlength'),
                                                        },
                                                        validate: {
                                                            checkSpace: (val) =>
                                                                val.trim().length > 0 || t('validation_device_name_required'),
                                                        },
                                                    }}
                                                    render={({ field: controlField }) => (
                                                        <TextField
                                                            error={!!errors?.scanners?.[index]?.name}
                                                            helperText={errors?.scanners?.[index]?.name?.message}
                                                            {...controlField}
                                                        />
                                                    )}
                                                />
                                            </div>
                                            {/* <div>
                                                <Controller
                                                    name={`devices.${index}.sensitive_level`}
                                                    control={control}
                                                    rules={{
                                                        required: {
                                                            value: true,
                                                            message: t('validation_sensitive_level_required'),
                                                        },
                                                    }}
                                                    render={({ field }) => (
                                                        <TextField
                                                            select
                                                            error={!!errors?.devices?.[index]?.sensitive_level}
                                                            helperText={errors?.devices?.[index]?.sensitive_level?.message}
                                                            {...field}
                                                        >
                                                            <MenuItem value="1">{`1(${t('channel_sensitive_level_weakest')})`}</MenuItem>
                                                            <MenuItem value="2">2</MenuItem>
                                                            <MenuItem value="3">3</MenuItem>
                                                            <MenuItem value="4">4</MenuItem>
                                                            <MenuItem value="5">{`5(${t('channel_sensitive_level_strongest')})`}</MenuItem>
                                                        </TextField>
                                                    )}
                                                />
                                            </div> */}
                                            <div>
                                                <IconButton
                                                    onClick={() => {
                                                        onClear(index);
                                                    }}
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            </div>
                                        </div>
                                    </Fragment>
                                ))}
                            </div>
                        </div>
                    </form>
                    <div>
                        <Button startIcon={<AddIcon />} sx={{ color: '#3399fc' }} variant="text" onClick={onAddField}>
                            {t('channel_add_new_device')}
                        </Button>
                    </div>
                </div>

                <div className={styles.footer}>
                    <LoadingButton
                        sx={{ width: '100%', borderRadius: '10px', boxShadow: ' 0 3px 10px 0 rgba(0, 0, 0, 0.16)' }}
                        variant="contained"
                        onClick={onNext}
                        loading={loading}
                    >
                        {t('channel_save_store')}
                    </LoadingButton>
                    {!!current && (
                        <Button
                            sx={{
                                width: '100%',
                                borderRadius: '10px',
                                background: '#bdbdbd',
                                boxShadow: ' 0 3px 10px 0 rgba(0, 0, 0, 0.16)',
                                '&:hover': {
                                    backgroundColor: '#999999',
                                },
                            }}
                            variant="contained"
                            onClick={onClose}
                        >
                            {t('channel_discard')}
                        </Button>
                    )}
                </div>
            </div>
        </Drawer>
    );
};

export default OperationStoreDrawer;
