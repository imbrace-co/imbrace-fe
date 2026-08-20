import { useArgs } from '@storybook/client-api';
import type { Meta, StoryFn } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Upload } from '.';
import axios from 'axios';

export default {
    title: 'Imbrace/Upload',
    component: Upload,

    argTypes: {
        value: {
            control: 'object',
        },
        disabled: {
            type: 'boolean',
        },
        uploadButtonProps: {
            control: 'object',
        },
        onChange: {
            table: {
                category: 'Events',
            },
            control: false,
        },
        onUpload: {
            table: {
                category: 'Events',
            },
            control: false,
        },
        onDelete: {
            table: {
                category: 'Events',
            },
            control: false,
        },
        fileValidation: {
            table: {
                category: 'Events',
            },
            control: false,
        },
        type: {
            control: 'radio',
            options: ['list', 'avatar', 'input'],
            defaultValue: 'list',
            type: 'string',
        },
        accept: {
            type: 'string',
        },
    },
    args: {
        value: [],
    },
    decorators: [
        (Story) => (
            <QueryClientProvider client={new QueryClient()}>
                <Story />
            </QueryClientProvider>
        ),
    ],
} as Meta<typeof Upload>;

const fileValidation = async (file: File) => {
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        return 'Only accept jpg or png file';
    }
    return true;
};
const onUpload = async (file: File) => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const { data } = await axios.post<{
        data: {
            id: string;
            name: string;
            size: number;
            short_path?: string;
        };
    }>('http://localhost:9001/marketplaces/v2/files', uploadFormData, {
        headers: {
            'X-Access-Token': window.localStorage.getItem('imbrace-access-token'),
        },
    });
    return {
        url: `http://localhost:8080/api/files/marketplaces/v2/download/${data.data.short_path}`,
        id: data.data.id,
        name: data.data.name,
        size: data.data.size,
    };
};
const onDelete = async (fileId: string) => {
    const { data } = await axios.delete<{ message: string }>(`http://localhost:9001/marketplaces/v2/files/${fileId}`, {
        headers: {
            'X-Access-Token': window.localStorage.getItem('imbrace-access-token'),
        },
    });
    return data.message;
};
const Template: StoryFn<typeof Upload> = (args) => {
    const [{ value }, updateArgs] = useArgs();
    return (
        <div>
            <Upload
                {...args}
                value={value}
                fileValidation={fileValidation}
                onUpload={onUpload}
                onDelete={onDelete}
                onChange={(e) => {
                    args.onChange?.(e);
                    updateArgs({ value: e });
                }}
            />
        </div>
    );
};

export const Default = Template.bind({});
Default.args = {};
Default.argTypes = {
    max: {
        type: 'number',
    },
    multiple: {
        type: 'boolean',
    },
};

const AvatarTemplate: StoryFn<typeof Upload> = (args) => {
    const [{ value }, updateArgs] = useArgs();
    return (
        <div>
            <Upload
                {...args}
                value={value}
                fileValidation={fileValidation}
                onUpload={onUpload}
                onDelete={onDelete}
                onChange={(e) => {
                    args.onChange?.(e);
                    updateArgs({ value: e });
                }}
            />
        </div>
    );
};

export const Avatar = AvatarTemplate.bind({});
Avatar.argTypes = {
    width: {
        type: 'number',
    },
    height: {
        type: 'number',
    },
    hideUploadButton: {
        type: 'boolean',
    },
    defaultIcon: {
        type: 'function',
    },
    imgProps: {
        type: 'symbol',
    },
    uploadButtonDisplay: {
        type: 'string',
        control: 'radio',
        options: ['always', 'hover'],
        table: {
            defaultValue: {
                summary: 'always',
            },
        },
    },
};
Avatar.args = {
    type: 'avatar',
    uploadButtonDisplay: 'always',
};

const InputTemplate: StoryFn<typeof Upload> = (args) => {
    const [{ value }, updateArgs] = useArgs();
    return (
        <div>
            <Upload
                {...args}
                value={value}
                // fileValidation={fileValidation}
                onUpload={onUpload}
                onDelete={onDelete}
                multiple
                onChange={(e) => {
                    args.onChange?.(e);
                    updateArgs({ value: e });
                }}
            />
        </div>
    );
};

export const Input = InputTemplate.bind({});
Input.args = {
    type: 'input',
    multiple: true,
    rows: 1,
    addButtonDisplay: 'always',
};
Input.argTypes = {
    multiple: {
        type: 'boolean',
    },
    max: {
        type: 'number',
    },
    rows: {
        type: 'number',
        table: {
            defaultValue: {
                summary: '1',
            },
        },
    },
    hint: {
        type: 'string',
    },
    addButtonDisplay: {
        type: 'string',
        control: 'radio',
        options: ['always', 'hover'],
        table: {
            defaultValue: {
                summary: 'always',
            },
        },
    },
};
