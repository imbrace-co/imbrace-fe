import { Space, Typography } from '@imbrace/ui';
import type { PopoverContentProps } from '@reactour/tour';

const Content = (props: { title: string; content: string } & PopoverContentProps) => {
    const { title, content } = props;

    return (
        <Space size={16} direction="vertical" align="start">
            <Typography variant="Heading2" style={{ paddingRight: '40px' }}>
                {title}
            </Typography>
            <Typography style={{ color: 'var(--color-light-5)' }}>{content}</Typography>
        </Space>
    );
};

export default Content;
