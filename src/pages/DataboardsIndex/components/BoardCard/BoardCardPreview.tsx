import { FieldSelect, FieldText, Space, Typography } from '@imbrace/ui';
import { Box, Fade, Popper } from '@mui/material';
import clsx from 'clsx';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

// Reuse the exact Field-tab grid/styles so the preview is pixel-aligned with Board Setting.
import tableStyles from '@/pages/Databoards/components/BoardSetting/ManageFields/components/Table/index.module.scss';
import { FieldTypeIcon, FieldTypeText } from '@/pages/Databoards/utils';

// Only the Attribute Name + AI Logic (type) columns.
const GRID_NAME_TYPE = 'minmax(150px, 1.3fr) minmax(150px, 1fr)';

// A point-anchor at the cursor; MUI Popper reads getBoundingClientRect.
export type VirtualAnchor = { getBoundingClientRect: () => DOMRect };

interface BoardCardPreviewProps {
    board: API.Board;
    anchorEl: VirtualAnchor | HTMLElement | null;
    open: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

const BoardCardPreview = ({ board, anchorEl, open, onMouseEnter, onMouseLeave }: BoardCardPreviewProps) => {
    const { t } = useTranslation();

    // Fields come straight from the boards list payload — no per-card fetch.
    const fields = (board.fields || []).filter((f) => !f.hidden);

    return (
        <Popper
            open={open}
            anchorEl={anchorEl}
            placement="right-start"
            transition
            modifiers={[
                { name: 'offset', options: { offset: [0, 12] } },
                { name: 'flip', options: { fallbackPlacements: ['left-start', 'right-end', 'left-end'] } },
                { name: 'preventOverflow', options: { padding: 8 } },
            ]}
            style={{ zIndex: 1300 }}
        >
            {({ TransitionProps }) => (
                <Fade {...TransitionProps} timeout={150}>
                    <Box
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                        sx={{
                            width: 420,
                            maxWidth: '92vw',
                            bgcolor: 'background.paper',
                            border: '1px solid',
                            borderColor: 'divider',
                            borderRadius: 2,
                            boxShadow: 6,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '70vh',
                        }}
                    >
                        {/* Metadata header */}
                        <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
                            <Typography
                                variant="SubHeading2"
                                style={{
                                    color: 'var(--color-light-7)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                }}
                            >
                                {board.name}
                            </Typography>
                            <Box display="flex" gap={2} mt={0.5}>
                                <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                                    {`${board.items_count ?? 0} ${t('records', 'Records')}`}
                                </Typography>
                                <Typography variant="Caption" style={{ color: 'var(--color-light-5)' }}>
                                    {`${fields.length} ${t('fields', 'Fields')}`}
                                </Typography>
                            </Box>
                        </Box>

                        {fields.length === 0 ? (
                            <Typography variant="Caption" style={{ color: 'var(--color-light-5)', padding: 12 }}>
                                {t('no_fields', 'No fields')}
                            </Typography>
                        ) : (
                            <>
                                {/* Column header (sticky above the scroll area) */}
                                <div
                                    className={clsx(tableStyles.tableRow, tableStyles.tableHeader, tableStyles.aiLayout)}
                                    style={{ gridTemplateColumns: GRID_NAME_TYPE, flexShrink: 0 }}
                                >
                                    <div className={tableStyles.cell}>{t('databoard_attribute_name', 'Attribute Name')}</div>
                                    <div className={tableStyles.cell}>{t('databoard_ai_logic', 'AI Logic')}</div>
                                </div>

                                {/* Scrollable rows */}
                                <Box sx={{ overflowY: 'auto', p: 1, pt: 0 }}>
                                    {fields.map((field) => (
                                        <div
                                            key={field._id}
                                            className={clsx(tableStyles.tableRow, tableStyles.aiLayout)}
                                            style={{ gridTemplateColumns: GRID_NAME_TYPE }}
                                        >
                                            {/* Attribute Name */}
                                            <Space className={tableStyles.cell} align="center">
                                                <FieldText fullWidth disabled value={field.name ?? ''} />
                                            </Space>
                                            {/* AI Logic (type) */}
                                            <Space className={tableStyles.cell} align="center">
                                                <FieldSelect
                                                    fullWidth
                                                    disabled
                                                    value={field.type ?? ''}
                                                    request={() => []}
                                                    renderValue={() => (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                                            {FieldTypeIcon(field.type, { fontSize: 24, style: { color: 'var(--color-light-5)' } })}
                                                            <span>{t(FieldTypeText[field.type as keyof typeof FieldTypeText] ?? '', field.type)}</span>
                                                        </span>
                                                    )}
                                                />
                                            </Space>
                                        </div>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Box>
                </Fade>
            )}
        </Popper>
    );
};

export default memo(BoardCardPreview);
