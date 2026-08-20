import { Icon } from '@imbrace/ui';
import type { Meta, StoryFn } from '@storybook/react';

import ActionButton from '.';

export default {
    title: 'Imbrace/ActionButton',
    component: ActionButton,

    argTypes: {
        disabled: {
            type: 'boolean',
            defaultValue: false,
        },
        loading: {
            type: 'boolean',
            defaultValue: false,
        },
        type: {
            control: 'select',
        },
        onClick: {
            table: {
                category: 'Events',
            },
            control: false,
        },
        icon: {
            table: {
                category: 'Element',
            },
            control: false,
        },
    },
    args: {
        text: 'Action Button',
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/KMoQjjjfdoxwJClKLKxY13/Platform---Core-Library?node-id=1339%3A80622&t=TlLrZq5B1JYeDXAz-1',
        },
        docs: { source: { type: 'dynamic' } },
    },
} as Meta<typeof ActionButton>;

const Template: StoryFn<typeof ActionButton> = (args) => <ActionButton {...args} />;

export const Default = Template.bind({});
Default.args = {
    icon: <Icon name="copyCode" />,
};

export const Secondary = Template.bind({});
Secondary.args = {
    type: 'secondary',
    icon: <Icon name="copyCode" />,
};

export const Disabled = Template.bind({});
Disabled.args = {
    disabled: true,
    icon: <Icon name="back" />,
};

export const Loading = Template.bind({});

Loading.args = {
    loading: true,
    icon: <Icon name="copyCode" />,
};
