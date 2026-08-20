import { Button, EllipsisText, Icon, Typography } from '@imbrace/ui';
import { Box, Divider } from '@mui/material';
import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useMatch } from 'react-router-dom';

import Breadcrumb from '@/components/Breadcrumb';
import { openUnlockFeature } from '@/components/UnlockFeatureDialog';
import useAccess from '@/hooks/useAccess';
import type { BoardAutomationFormValue } from '@/pages/Databoards/components/BoardAutomation';
import { useAppSelector } from '@/redux/store';
import { useNavbar } from '@/routes/PrivateLayout';

interface ContentHeaderProps {
    currentContent: API.AutomationWorkflow | 'new' | undefined | 'delete';
    currentBoard?: API.Board;

    onSave: () => void;
}
const ContentHeader = (props: ContentHeaderProps) => {
    const { currentContent, onSave, currentBoard } = props;
    const { openHelpCenter } = useNavbar();
    const { features } = useAccess();
    const supportChannel = useAppSelector((state) => state.Account.support?.customer?.channel);
    const supportTouchpoint = useAppSelector((state) => state.Account.support?.customer?.touchpoint);

    const { t } = useTranslation();
    const name = useWatch({ name: 'name' });
    const {
        getValues,
        formState: { isDirty, isValid },
    } = useFormContext();

    const needUpgrade = useMemo(() => {
        return features.workflows({ dataBoardsAutomationOperation: currentContent === 'new' ? 'create' : 'update' });
    }, [currentContent, features]);

    const crmMatch = useMatch('/crm/:id/automations');
    const databoardsMatch = useMatch('/databoards/:id/automations');
    const documentAiMatch = useMatch('/document-ai/:id/automations');
    const knowledgeHubMatch = useMatch('/knowledge-hub-all/:id/automations');
    const currentPath = crmMatch
        ? 'crm'
        : knowledgeHubMatch
          ? 'knowledge-hub'
          : documentAiMatch
            ? 'document-ai'
            : databoardsMatch
              ? 'databoards'
              : null;

    return (
        <Box sx={{ padding: '0 32px' }}>
            {currentContent !== undefined && (
                <>
                    <Breadcrumb
                        backBtnText={
                            currentPath === 'crm'
                                ? t('menu_crm')
                                : currentPath === 'knowledge-hub'
                                  ? t('menu_knowledgeHub')
                                  : currentPath === 'document-ai'
                                    ? t('menu_document_ai')
                                    : t('menu_databoards')
                        }
                        currentBoard={currentBoard}
                        formValues={{ ...getValues() } as BoardAutomationFormValue}
                    />
                    <Box
                        sx={{
                            paddingTop: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <EllipsisText
                            text={name || t('automation_field_name')}
                            element={
                                <Typography
                                    variant="Heading2"
                                    style={{
                                        width: '500px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        wordBreak: 'break-word',
                                    }}
                                />
                            }
                        />
                        <Button
                            type="primary"
                            variant="contained"
                            size="xs"
                            text={currentContent === 'new' ? t('create') : t('update')}
                            onClick={async () => {
                                if (needUpgrade) {
                                    openUnlockFeature({
                                        channel: supportChannel,
                                        touchpoint: supportTouchpoint,
                                        openHelpCenter: (channelId: string) =>
                                            openHelpCenter?.({
                                                channelId,
                                                prefillMessage: t('unlock_feature_prefill_message'),
                                                defaultWebWidget: true,
                                            }),
                                    });
                                    return;
                                }
                                onSave();
                            }}
                            sx={{
                                padding: '0 24px',
                            }}
                            endIcon={needUpgrade ? <Icon name="premium" /> : null}
                            disabled={!isDirty || !isValid}
                        />
                    </Box>
                    <Divider sx={{ marginY: '12px' }} />
                </>
            )}
        </Box>
    );
};
export default ContentHeader;
