import type { IconProps, Option } from '@imbrace/ui';
import { EllipsisText, Icon, Space } from '@imbrace/ui';
import type { ColumnFilter, ColumnFiltersState } from '@tanstack/react-table';
import { getAllCountries, getCountry } from 'countries-and-timezones';
import type { ManipulateType } from 'dayjs';
import dayjs from 'dayjs';
import type { TFunction } from 'i18next';
import type { CountryCode } from 'libphonenumber-js';
import { getCountryCallingCode, isSupportedCountry } from 'libphonenumber-js';

import type { FilterValue } from '@/components/FlexibleTable/filterPopover';
import { OperatorMapper } from '@/components/FlexibleTable/filterPopover';

export const FieldTypes = [
    'ShortText',
    'LongText',
    'SingleSelection',
    'MultipleSelection',
    'Number',
    'Date',
    'Time',
    'Email',
    'Phone',
    'Link',
    'Priority',
    'Assignee',
    'MultipleAssignee',
    'RichText',
    'Country',
    'Datetime',
    'Origin',
    'Attachment',
    'Notes',
    'Currency',
    'Checkbox',
] as const;

export const FieldTypeText = {
    ShortText: 'field_short_text',
    LongText: 'field_long_text',
    SingleSelection: 'field_single_selection',
    MultipleSelection: 'field_multiple_selection',
    Number: 'field_number',
    Date: 'field_date',
    Time: 'field_time',
    Datetime: 'field_datetime',
    Email: 'field_email',
    Phone: 'field_phone',
    Link: 'field_link',
    Country: 'field_country',
    Priority: 'field_priority',
    Assignee: 'field_assignee',
    MultipleAssignee: 'Multiple Assignee',
    Origin: 'field_origin',
    Attachment: 'field_attachment',
    Notes: 'field_notes',
    Currency: 'field_currency',
    Checkbox: 'field_checkbox',
};

export const FieldTypesOptions = (t: TFunction) => {
    return [
        {
            value: 'ShortText',
            text: t('field_short_text'),
            icon: <Icon name="shortText" fontSize={24} />,
        },
        {
            value: 'LongText',
            text: t('field_long_text'),
            icon: <Icon name="longText" fontSize={24} />,
        },
        {
            value: 'SingleSelection',
            text: t('field_single_selection'),
            icon: <Icon name="singleSelection" fontSize={24} />,
        },
        {
            value: 'MultipleSelection',
            text: t('field_multiple_selection'),
            icon: <Icon name="multipleSelection" fontSize={24} />,
        },
        {
            value: 'Number',
            text: t('field_number'),
            icon: <Icon name="numberSign" fontSize={24} />,
        },
        {
            value: 'Date',
            text: t('field_date'),
            icon: <Icon name="date" fontSize={24} />,
        },
        {
            value: 'Time',
            text: t('field_time'),
            icon: <Icon name="timeClock" fontSize={24} />,
        },
        {
            value: 'Datetime',
            text: t('field_datetime'),
            icon: <Icon name="calendar" fontSize={24} />,
        },
        {
            value: 'Email',
            text: t('field_email'),
            icon: <Icon name="emailOutline" fontSize={24} />,
        },
        {
            value: 'Phone',
            text: t('field_phone'),
            icon: <Icon name="call" fontSize={24} />,
        },
        {
            value: 'Link',
            text: t('field_link'),
            icon: <Icon name="linkSide" fontSize={24} />,
        },
        {
            value: 'Checkbox',
            text: t('field_checkbox'),
            icon: <Icon name="checkbox" fontSize={24} />,
        },
        {
            value: 'Country',
            text: t('field_country'),
            icon: <Icon name="country" fontSize={24} />,
        },
        {
            value: 'Priority',
            text: t('field_priority'),
            icon: <Icon name="priority" fontSize={24} />,
        },
        {
            value: 'Assignee',
            text: t('field_assignee'),
            icon: <Icon name="assignee" fontSize={24} />,
        },
        {
            value: 'MultipleAssignee',
            text: 'Multiple Assignee',
            icon: <Icon name="assignee" fontSize={24} />,
        },
        {
            value: 'Origin',
            text: t('field_origin'),
            icon: <Icon name="mindMap" fontSize={24} />,
        },
        {
            value: 'Attachment',
            text: t('field_attachment'),
            icon: <Icon name="attachment" fontSize={24} />,
        },
        {
            value: 'Notes',
            text: t('field_notes'),
            icon: <Icon name="notes" fontSize={24} />,
        },
        {
            value: 'Currency',
            text: t('field_currency'),
            icon: <Icon name="currency" fontSize={24} />,
        },
    ];
};

interface FormType {
    name: string;
    label: string;
}

interface SelectType extends FormType {
    type: 'select';
    options: Option[];
    defaultValue?: string;
    searchFn?: (search: { option: Option; search?: string }) => boolean;
    required: boolean;
}
interface SwitchType extends FormType {
    type: 'switch';
    defaultValue?: boolean;
    required: boolean;
}

export const FieldExtraSetting: Partial<Record<API.FieldType, (SelectType | SwitchType)[]>> = {
    Phone: [
        {
            name: 'default_country_code',
            type: 'select',
            label: 'default_country_code',
            options: Object.keys(getAllCountries())
                .filter((country) => {
                    return isSupportedCountry(country);
                })
                .sort((a, b) => {
                    const aCountry = getCountry(a);
                    const bCountry = getCountry(b);
                    if (aCountry && bCountry) {
                        return aCountry.name.localeCompare(bCountry.name);
                    }
                    return 0;
                })
                .map((country) => ({
                    icon: (
                        <img
                            style={{ width: '20px' }}
                            alt={getCountry(country)?.name}
                            src={`http://purecatamphetamine.github.io/country-flag-icons/3x2/${country}.svg`}
                        />
                    ),
                    text: (
                        <Space size={4} style={{ overflow: 'hidden', width: '100%' }}>
                            <EllipsisText text={getCountry(country)?.name} />
                            <div>{`+${getCountryCallingCode(country as CountryCode)}`}</div>
                        </Space>
                    ),
                    value: country,
                })),
            searchFn: ({ option, search }) => {
                if (!search) {
                    return true;
                }
                if (getCountryCallingCode(option.value as CountryCode).indexOf(search) !== -1) {
                    return true;
                }
                const country = getCountry(option.value as CountryCode);
                if (country && country.name.toLowerCase().indexOf(search.toLowerCase()) !== -1) {
                    return true;
                }

                return `${option.value}`.toLowerCase().indexOf(search.toLowerCase()) !== -1;
            },
            required: true,
        },
    ],
    Currency: [
        {
            name: 'default_currency_code',
            type: 'select',
            label: 'default_currency_code',
            options:
                Intl?.supportedValuesOf?.('currency')?.map((currency) => ({
                    text: currency,
                    value: currency,
                })) ?? [],
            required: true,
        },
    ],
};

export const FieldTypeIcon = (type: API.FieldType, props?: Omit<IconProps, 'name' | 'namespace'>) => {
    switch (type) {
        case 'Date':
            return <Icon name="date" {...props} />;
        case 'ShortText':
            return <Icon name="shortText" {...props} />;
        case 'LongText':
            return <Icon name="longText" {...props} />;
        case 'SingleSelection':
            return <Icon name="singleSelection" {...props} />;
        case 'MultipleSelection':
            return <Icon name="multipleSelection" {...props} />;
        case 'Number':
            return <Icon name="numberSign" {...props} />;
        case 'Email':
            return <Icon name="emailOutline" {...props} />;
        case 'Phone':
            return <Icon name="call" {...props} />;
        case 'Link':
            return <Icon name="linkSide" {...props} />;
        case 'Priority':
            return <Icon name="priority" {...props} />;
        case 'Assignee':
            return <Icon name="assignee" {...props} />;
        case 'MultipleAssignee':
            return <Icon name="assignee" {...props} />;
        case 'Datetime':
            return <Icon name="calendar" {...props} />;
        case 'Country':
            return <Icon name="country" {...props} />;
        case 'Attachment':
            return <Icon name="attachment" {...props} />;
        case 'Origin':
            return <Icon name="mindMap" {...props} />;
        case 'Time':
            return <Icon name="timeClock" {...props} />;
        case 'RichText':
            return <Icon name="richText" {...props} />;
        case 'Notes':
            return <Icon name="notes" {...props} />;
        case 'Currency':
            return <Icon name="currency" {...props} />;
        case 'Checkbox':
            return <Icon name="checkbox" {...props} />;
        default:
            return <Icon name="help" {...props} />;
    }
};

export const getDateFilterQuery = (filter: ColumnFilter) => {
    const filterData = filter.value as FilterValue;
    let filterString = '';
    const filterKey = `fields_timestamp.${filter.id}`;
    if (Array.isArray(filterData.value) && filterData.value.length !== 0) {
        switch (filterData.operator) {
            case 'is':
            case 'is_not': {
                let startDateTime, endDateTime;
                // ex: ['exactly', 'Wed Dec 13 2023 00:00:00 GMT+0800 (Taipei Standard Time)']
                if (filterData.value[0] === 'exactly' && dayjs(filterData.value[1] as Date).isValid()) {
                    startDateTime = dayjs(filterData.value[1] as Date).unix();
                    endDateTime = dayjs(filterData.value[1] as Date)
                        .endOf('d')
                        .unix();
                }
                // ex: ['next', '3', 'day']
                if (filterData.value[0] === 'next' && filterData.value[1] && filterData.value[2]) {
                    const unit = filterData.value[2] as ManipulateType;
                    const now = dayjs();
                    startDateTime = now.startOf('d').unix();
                    endDateTime = now.add(+filterData.value[1], unit).endOf('d').unix();
                }
                // ex: ['last', '3', 'day']
                if (filterData.value[0] === 'last' && filterData.value[1] && filterData.value[2]) {
                    const unit = filterData.value[2] as ManipulateType;
                    const now = dayjs();
                    startDateTime = now.subtract(+filterData.value[1], unit).startOf('d').unix();
                    endDateTime = now.endOf('d').unix();
                }

                if (startDateTime && endDateTime) {
                    filterString = OperatorMapper[`${filterData.operator}_for_date`]
                        ?.replaceAll('{{id}}', filterKey)
                        .replaceAll('{{value1}}', `${startDateTime}`)
                        .replaceAll('{{value2}}', `${endDateTime}`);
                }
                // ex: ['empty']
                if (filterData.value[0] === 'empty') {
                    filterString = OperatorMapper[filterData.operator === 'is' ? 'is_empty' : 'is_not_empty'].replaceAll(
                        '{{id}}',
                        filterKey,
                    );
                }

                break;
            }
            case 'is_before': {
                let startDateTime;
                // ex: ['exactly', 'Wed Dec 13 2023 00:00:00 GMT+0800 (Taipei Standard Time)']
                if (filterData.value[0] === 'exactly' && dayjs(filterData.value[1] as Date).isValid()) {
                    startDateTime = dayjs(filterData.value[1] as Date)
                        .startOf('d')
                        .unix();
                }
                // ex: ['next', '3', 'day']
                if (filterData.value[0] === 'next' && filterData.value[1] && filterData.value[2]) {
                    const unit = filterData.value[2] as ManipulateType;
                    const now = dayjs();
                    startDateTime = now.add(+filterData.value[1], unit).startOf('d').unix();
                }
                // ex: ['last', '3', 'day']
                if (filterData.value[0] === 'last' && filterData.value[1] && filterData.value[2]) {
                    const unit = filterData.value[2] as ManipulateType;
                    const now = dayjs();
                    startDateTime = now.subtract(+filterData.value[1], unit).startOf('d').unix();
                }
                if (startDateTime) {
                    filterString = OperatorMapper[filterData.operator]
                        ?.replaceAll('{{id}}', filterKey)
                        .replaceAll('{{value}}', `${startDateTime}`);
                }
                break;
            }
            case 'is_before_and_on': {
                let startDateTime;
                // ex: ['exactly', 'Wed Dec 13 2023 00:00:00 GMT+0800 (Taipei Standard Time)']
                if (filterData.value[0] === 'exactly' && dayjs(filterData.value[1] as Date).isValid()) {
                    startDateTime = dayjs(filterData.value[1] as Date)
                        .endOf('d')
                        .unix();
                }
                if (startDateTime) {
                    filterString = OperatorMapper[filterData.operator]
                        ?.replaceAll('{{id}}', filterKey)
                        .replaceAll('{{value}}', `${startDateTime}`);
                }
                break;
            }
            case 'is_after': {
                let endDateTime;
                // ex: ['exactly', 'Wed Dec 13 2023 00:00:00 GMT+0800 (Taipei Standard Time)']
                if (filterData.value[0] === 'exactly' && dayjs(filterData.value[1] as Date).isValid()) {
                    endDateTime = dayjs(filterData.value[1] as Date)
                        .endOf('d')
                        .unix();
                }
                // ex: ['next', '3', 'day']
                if (filterData.value[0] === 'next' && filterData.value[1] && filterData.value[2]) {
                    const unit = filterData.value[2] as ManipulateType;
                    const now = dayjs();
                    endDateTime = now.add(+filterData.value[1], unit).endOf('d').unix();
                }
                // ex: ['last', '3', 'day']
                if (filterData.value[0] === 'last' && filterData.value[1] && filterData.value[2]) {
                    const unit = filterData.value[2] as ManipulateType;
                    const now = dayjs();
                    endDateTime = now.subtract(+filterData.value[1], unit).endOf('d').unix();
                }
                if (endDateTime) {
                    filterString = OperatorMapper[filterData.operator]
                        ?.replaceAll('{{id}}', filterKey)
                        .replaceAll('{{value}}', `${endDateTime}`);
                }
                break;
            }
            case 'is_after_and_on': {
                let endDateTime;
                // ex: ['exactly', 'Wed Dec 13 2023 00:00:00 GMT+0800 (Taipei Standard Time)']
                if (filterData.value[0] === 'exactly' && dayjs(filterData.value[1] as Date).isValid()) {
                    endDateTime = dayjs(filterData.value[1] as Date)
                        .startOf('d')
                        .unix();
                }
                if (endDateTime) {
                    filterString = OperatorMapper[filterData.operator]
                        ?.replaceAll('{{id}}', filterKey)
                        .replaceAll('{{value}}', `${endDateTime}`);
                }
                break;
            }

            case 'is_between':
                if (dayjs(filterData.value[0] as Date).isValid() && dayjs(filterData.value[1] as Date).isValid()) {
                    filterString = OperatorMapper[filterData.operator]
                        ?.replaceAll('{{id}}', filterKey)
                        .replaceAll(
                            '{{value1}}',
                            `${dayjs(filterData.value[0] as Date)
                                .startOf('d')
                                .unix()}`,
                        )
                        .replaceAll(
                            '{{value2}}',
                            `${dayjs(filterData.value[1] as Date)
                                .endOf('d')
                                .unix()}`,
                        );
                }
                break;
            default:
                break;
        }
    }
    return filterString;
};
export const getTimeFilterQuery = (filter: ColumnFilter) => {
    const filterData = filter.value as FilterValue;
    let filterString = '';
    const filterKey = `fields_timestamp.${filter.id}`;
    if (filterData.operator) {
        if (Array.isArray(filterData.value) && filterData.value.length !== 0) {
            const filterValue = filterData.value.map((v) => {
                if (typeof v !== 'number' && v !== undefined && v !== null && dayjs(v as Date).isValid()) {
                    return `${new Date(v as Date).getTime() / 1000}`;
                }
                return v;
            });

            filterString = OperatorMapper[filterData.operator]
                ?.replaceAll('{{id}}', filterKey)
                .replaceAll('{{value}}', `'${filterValue}'`)
                .replaceAll('{{[value]}}', `[${filterValue.map((d) => `'${d}'`).join(', ')}]`)
                .replaceAll('{{value1}}', `${filterValue[0]}`)
                .replaceAll('{{value2}}', `${filterValue[1]}`);
        } else if (filterData.value && dayjs(filterData.value as Date).isValid()) {
            const filterValue = `${new Date(filterData.value as Date).getTime() / 1000}`;

            filterString = OperatorMapper[filterData.operator]
                ?.replaceAll('{{id}}', filterKey)
                .replaceAll('{{value}}', `${filterValue}`)
                .replaceAll('{{[value]}}', `[${filterValue}]`);
        } else if (filterData.operator === 'is_empty') {
            filterString = OperatorMapper[filterData.operator]?.replaceAll('{{id}}', filterKey);
        } else if (filterData.operator === 'is_not_empty') {
            filterString = OperatorMapper[filterData.operator]?.replaceAll('{{id}}', filterKey);
        }
    }
    return filterString;
};

export const getOriginFilterQuery = (filter: ColumnFilter, defaultData: Record<string, string>[] = []) => {
    const filterData = filter.value as FilterValue;
    let filterString = '';
    const filterKey = `fields.${filter.id}`;
    if (filterData.operator) {
        switch (filterData.operator) {
            case 'contains': {
                const filterValue = filterData.value as API.OriginValue[];
                const channelOrigins = filterValue.filter((value) => value.type === 'channel');
                if (channelOrigins.length > 0) {
                    const typeString = OperatorMapper.is?.replaceAll('{{id}}', `${filterKey}.type`).replaceAll('{{value}}', "'channel'");
                    const valueString = OperatorMapper.contains
                        ?.replaceAll('{{id}}', `${filterKey}.data.id`)
                        .replaceAll('{{[value]}}', `[${channelOrigins.map((origin) => `'${origin.data.id}'`).join(', ')}]`);
                    filterString = `${filterString ? `${filterString} OR ` : ''}${typeString} AND ${valueString}`;
                }
                const journeyOrigins = filterValue.filter((value) => value.type === 'journey');
                if (journeyOrigins.length > 0) {
                    const typeString = OperatorMapper.is?.replaceAll('{{id}}', `${filterKey}.type`).replaceAll('{{value}}', "'journey'");
                    const valueString = OperatorMapper.contains
                        ?.replaceAll('{{id}}', `${filterKey}.data.id`)
                        .replaceAll('{{[value]}}', `[${journeyOrigins.map((origin) => `'${origin.data.id}'`).join(', ')}]`);
                    filterString = `${filterString ? `${filterString} OR ` : ''}${typeString} AND ${valueString}`;
                }
                const customizedOrigins = filterValue.filter((value) => value.type === 'customized');
                if (customizedOrigins.length > 0) {
                    const typeString = OperatorMapper.is?.replaceAll('{{id}}', `${filterKey}.type`).replaceAll('{{value}}', "'customized'");
                    let valueString = OperatorMapper.contains
                        ?.replaceAll('{{id}}', `${filterKey}.data.name`)
                        .replaceAll('{{[value]}}', `[${customizedOrigins.map((origin) => `'${origin.data.name}'`).join(', ')}]`);

                    if (customizedOrigins.filter((origin) => origin.data.name === 'Other').length > 0) {
                        const predefinedData = new Set(defaultData.map((data) => data._id));
                        customizedOrigins.forEach((origin) => {
                            if (predefinedData.has(origin.data.name)) {
                                predefinedData.delete(origin.data.name);
                            }
                        });
                        valueString = OperatorMapper.not_contains
                            ?.replaceAll('{{id}}', `${filterKey}.data.name`)
                            .replaceAll('{{[value]}}', `[${[...predefinedData].map((data) => `'${data}'`).join(', ')}]`);
                    }
                    filterString = `${filterString ? `${filterString} OR ` : ''}${typeString} AND ${valueString}`;
                }
                // if (filterValue.type === 'customized') {
                //     const typeString = OperatorMapper.is
                //         ?.replaceAll('{{id}}', `${filterKey}.type`)
                //         .replaceAll('{{value}}', `'${filterValue.type}'`);
                //     const valueString = OperatorMapper.is
                //         ?.replaceAll('{{id}}', `${filterKey}.data.name`)
                //         .replaceAll('{{value}}', `'${filterValue.data.name}'`);
                //     filterString = `${typeString} AND ${valueString}`;
                // } else {
                //     const typeString = OperatorMapper.is
                //         ?.replaceAll('{{id}}', `${filterKey}.type`)
                //         .replaceAll('{{value}}', `'${filterValue.type}'`);
                //     const valueString = OperatorMapper.is
                //         ?.replaceAll('{{id}}', `${filterKey}.data.id`)
                //         .replaceAll('{{value}}', `'${filterValue.data.id}'`);
                //     filterString = `${typeString} AND ${valueString}`;
                // }
                break;
            }
            case 'not_contains': {
                const filterValue = filterData.value as API.OriginValue[];
                const channelOrigins = filterValue.filter((value) => value.type === 'channel');
                if (channelOrigins.length > 0) {
                    const typeString = OperatorMapper.is?.replaceAll('{{id}}', `${filterKey}.type`).replaceAll('{{value}}', "'channel'");
                    const valueString = OperatorMapper.not_contains
                        ?.replaceAll('{{id}}', `${filterKey}.data.id`)
                        .replaceAll('{{[value]}}', `[${channelOrigins.map((origin) => `'${origin.data.id}'`).join(', ')}]`);
                    filterString = `${filterString ? `${filterString} OR ` : ''}${typeString} AND ${valueString}`;
                }
                const journeyOrigins = filterValue.filter((value) => value.type === 'journey');
                if (journeyOrigins.length > 0) {
                    const typeString = OperatorMapper.is?.replaceAll('{{id}}', `${filterKey}.type`).replaceAll('{{value}}', "'journey'");
                    const valueString = OperatorMapper.not_contains
                        ?.replaceAll('{{id}}', `${filterKey}.data.id`)
                        .replaceAll('{{[value]}}', `[${journeyOrigins.map((origin) => `'${origin.data.id}'`).join(', ')}]`);
                    filterString = `${filterString ? `${filterString} OR ` : ''}${typeString} AND ${valueString}`;
                }
                const customizedOrigins = filterValue.filter((value) => value.type === 'customized');
                if (customizedOrigins.length > 0) {
                    const typeString = OperatorMapper.is?.replaceAll('{{id}}', `${filterKey}.type`).replaceAll('{{value}}', "'customized'");
                    let valueString = OperatorMapper.not_contains
                        ?.replaceAll('{{id}}', `${filterKey}.data.name`)
                        .replaceAll('{{[value]}}', `[${customizedOrigins.map((origin) => `'${origin.data.name}'`).join(', ')}]`);

                    if (customizedOrigins.filter((origin) => origin.data.name === 'Other').length > 0) {
                        const predefinedData = new Set(defaultData.map((data) => data._id));
                        customizedOrigins.forEach((origin) => {
                            if (predefinedData.has(origin.data.name)) {
                                predefinedData.delete(origin.data.name);
                            }
                        });
                        valueString = OperatorMapper.contains
                            ?.replaceAll('{{id}}', `${filterKey}.data.name`)
                            .replaceAll('{{[value]}}', `[${[...predefinedData].map((data) => `'${data}'`).join(', ')}]`);
                    }
                    filterString = `${filterString ? `${filterString} OR ` : ''}${typeString} AND ${valueString}`;
                }
                // if (filterValue.type === 'customized') {
                //     const typeString = OperatorMapper.is_not
                //         ?.replaceAll('{{id}}', `${filterKey}.type`)
                //         .replaceAll('{{value}}', `'${filterValue.type}'`);
                //     const valueString = OperatorMapper.is_not
                //         ?.replaceAll('{{id}}', `${filterKey}.data.name`)
                //         .replaceAll('{{value}}', `'${filterValue.data.name}'`);
                //     filterString = `${typeString} AND ${valueString}`;
                // } else {
                //     const typeString = OperatorMapper.is_not
                //         ?.replaceAll('{{id}}', `${filterKey}.type`)
                //         .replaceAll('{{value}}', `'${filterValue.type}'`);
                //     const valueString = OperatorMapper.is_not
                //         ?.replaceAll('{{id}}', `${filterKey}.data.id`)
                //         .replaceAll('{{value}}', `'${filterValue.data.id}'`);
                //     filterString = `${typeString} AND ${valueString}`;
                // }
                break;
            }

            case 'is_empty':
            case 'is_not_empty': {
                filterString = OperatorMapper[filterData.operator]?.replaceAll('{{id}}', filterKey);
                break;
            }
            default:
                break;
        }
    }
    return filterString;
};

export const getFilterQuery = (filters: ColumnFiltersState, currentBoard: API.Board) => {
    return filters
        .filter((filter) => {
            if (filter.value) {
                const filterData = filter.value as FilterValue;
                if (filterData.operator) {
                    if (
                        filterData.operator === 'is_empty' ||
                        filterData.operator === 'is_not_empty' ||
                        filterData.operator === 'is_checked' ||
                        filterData.operator === 'is_not_checked'
                    ) {
                        return true;
                    } else if (filterData.value) {
                        return true;
                    }
                }
            }
            return false;
        })
        .map((filter) => {
            if (filter.value) {
                const filterData = filter.value as FilterValue;
                const currentField = currentBoard.fields.find((field) => field._id === filter.id);
                const fieldType = currentField?.type;
                if (filterData.operator) {
                    let filterString = '';
                    let filterKey = `fields.${filter.id}`;
                    if (fieldType === 'Assignee') {
                        filterKey = `fields.${filter.id}._id`;
                    }
                    if (fieldType === 'Country') {
                        filterKey = `fields.${filter.id}.country_code`;
                    }
                    if (fieldType === 'Phone') {
                        filterKey = `fields.${filter.id}.calling_code_with_number`;
                    }
                    if (fieldType === 'Currency') {
                        filterKey = `fields.${filter.id}.amounts`;
                    }
                    if (fieldType === 'Origin') {
                        return getOriginFilterQuery(filter, currentField?.data);
                    }
                    if (fieldType === 'Date') {
                        return getDateFilterQuery(filter);
                    }
                    if (fieldType === 'Time' || fieldType === 'Datetime') {
                        return getTimeFilterQuery(filter);
                    }
                    if (fieldType === 'Attachment') {
                        filterKey = `fields.${filter.id}.data.extension`;
                    }
                    if (
                        filterData.operator === 'is_empty' ||
                        filterData.operator === 'is_not_empty' ||
                        filterData.operator === 'is_checked' ||
                        filterData.operator === 'is_not_checked'
                    ) {
                        filterKey = `fields.${filter.id}`;
                        filterString = OperatorMapper[filterData.operator]?.replaceAll('{{id}}', filterKey);
                    } else if (Array.isArray(filterData.value) && filterData.value.length !== 0) {
                        const filterValue = filterData.value.map((v) => {
                            // no case for datetime
                            // if (typeof v !== 'number' && v !== undefined && v !== null && dayjs(v as Date).isValid()) {
                            //     return `${new Date(v as Date).getTime() / 1000}`;
                            // }
                            return v;
                        });

                        filterString = OperatorMapper[filterData.operator]
                            ?.replaceAll('{{id}}', filterKey)
                            .replaceAll('{{value}}', `'${filterValue}'`)
                            .replaceAll('{{[value]}}', `[${filterValue.map((d) => `'${d}'`).join(', ')}]`)
                            .replaceAll('{{value1}}', `${filterValue[0]}`)
                            .replaceAll('{{value2}}', `${filterValue[1]}`);
                    } else if ((typeof filterData.value === 'string' && filterData.value) || typeof filterData.value === 'number') {
                        // Ta-Da  Magic
                        const filterValue = `'${filterData.value}'`.replace(/\$/g, '$$$');

                        filterString = OperatorMapper[filterData.operator]
                            ?.replaceAll('{{id}}', filterKey)
                            .replaceAll('{{value}}', `${filterValue}`)
                            .replaceAll('{{[value]}}', `[${filterValue}]`);
                    } else if (typeof filterData.value === 'object' && filterData.value && 'calling_code_with_number' in filterData.value) {
                        const filterValue = `'${filterData.value.calling_code_with_number}'`;
                        filterString = OperatorMapper[filterData.operator]
                            ?.replaceAll('{{id}}', filterKey)
                            .replaceAll('{{value}}', `${filterValue}`)
                            .replaceAll('{{[value]}}', `[${filterValue}]`);
                    }
                    return filterString;
                }
            }
            return '';
        })
        .join(` ${(filters[0].value as FilterValue).condition?.toUpperCase() ?? 'AND'} `);
};

/**
 * for filter
 */
export const attachmentSupportedFileTypes: Record<string, string> = {
    jpeg: 'JPG',
    png: 'PNG',
    svg: 'SVG',
    gif: 'GIF',
    pdf: 'PDF',
    mp4: 'MP4',
    tif: 'TIFF',
    // doc: 'DOC',
    // docx: 'DOCX',
    // xls: 'XLS',
    // xlsx: 'XLSX',
    // ppt: 'PPT',
    // pptx: 'PPTX',
    // txt: 'TXT',
    csv: 'CSV',
    // zip: 'ZIP',
};

export const SingularBoardName: Record<API.BoardType, string> = {
    Companies: 'Company',
    Contacts: 'Contact',
    Tasks: 'Task',
    Opportunities: 'Opportunity',
    Products: 'Product',
    General: 'General',
    OptOut: 'OptOut',
    System: 'System',
    KnowledgeHub: 'KnowledgeHub',
    DocumentAI: 'DocumentAI',
};

export const KnowledgeSupportFileTypeText = 'pdf, ppt, pptx, doc, docx, xls, xlsx, csv, jpg, jpeg or png';
