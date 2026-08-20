import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

function ReorderableItem(props) {
    const { id, index, moveListItem, itemClassName, itemStyles, renderItem, bannedIndex = [] } = props;
    const ref = useRef();

    const [{ handlerId }, drop] = useDrop({
        accept: 'card',
        collect: (monitor) => {
            return { handlerId: monitor.getHandlerId() };
        },
        hover: (item, monitor) => {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) {
                return;
            }
            const hoverBoundingRect = ref.current?.getBoundingClientRect();
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
            const clientOffset = monitor.getClientOffset();
            const hoverClientY = clientOffset.y - hoverBoundingRect.top;
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }
            moveListItem(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: 'card',
        item: () => {
            return { id, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: () => {
            console.log(bannedIndex);
            return !bannedIndex.includes(index);
        },
    });

    drag(drop(ref));

    return (
        <div style={{ ...itemStyles, opacity: isDragging ? 0 : 1 }} className={itemClassName} ref={ref} data-handler-id={handlerId}>
            {renderItem(props)}
        </div>
    );
}

export default ReorderableItem;
