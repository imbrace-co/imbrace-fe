import update from 'immutability-helper';
import React, { useCallback, useEffect,useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import ReorderableItem from './Item';

function ReorderableList(props) {
    const { list, styles, className, itemClassName, itemStyles, renderItem, bannedIndex = [] } = props;
    const [listItems, setListItems] = useState([]);
    //bannedIndex: which item in the list cannot be moved [array]

    useEffect(() => {
        setListItems(list);
    }, [list]);

    const moveListItem = useCallback(
        (dragIndex, hoverIndex) => {
            if (bannedIndex.includes(dragIndex) || bannedIndex.includes(hoverIndex)) {
                return;
            }

            setListItems((prevCards) =>
                update(prevCards, {
                    $splice: [
                        [dragIndex, 1],
                        [hoverIndex, 0, prevCards[dragIndex]],
                    ],
                }),
            );
        },
        [bannedIndex],
    );

    const renderList = useCallback(
        (item, index) => {
            const { id } = item;
            if (!id) {
                console.log('each item in reorderable list needs uuid');
            }

            return (
                <ReorderableItem
                    {...item}
                    index={index}
                    key={item.id}
                    itemClassName={itemClassName}
                    itemStyles={itemStyles}
                    renderItem={renderItem}
                    moveListItem={moveListItem}
                    bannedIndex={bannedIndex}
                />
            );
        },
        [bannedIndex, itemClassName, itemStyles, moveListItem, renderItem],
    );

    return (
        <DndProvider backend={HTML5Backend}>
            <div style={styles} className={className}>
                {listItems.map((item, index) => renderList(item, index))}
            </div>
        </DndProvider>
    );
}

export default ReorderableList;
