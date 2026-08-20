import { IconButton, Popover } from '@mui/material';

function OptionPopover(props) {
    const { toOpen, toClose, anchorEl, triggerBtnComponent, zIndex } = props;
    const displayInfoModalOpen = Boolean(anchorEl);
    return (
        <div>
            <IconButton id="popover-btn" onClick={toOpen} sx={{ width: 24, height: 24, padding: 0 }}>
                {triggerBtnComponent()}
            </IconButton>
            <Popover
                open={displayInfoModalOpen}
                anchorEl={anchorEl}
                onClose={toClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                sx={{ zIndex: zIndex ? zIndex : 0 }}
            >
                {props.children}
            </Popover>
        </div>
    );
}

export default OptionPopover;
