import type { Attachment } from '@imbrace/ui';
import type { DialogProps } from '@mui/material';
import { useRef } from 'react';

import DialogModal from '@/components/DialogModal';
import type { BasicInformationRef } from '@/pages/Members/components/BasicInformation';
import BasicInformation from '@/pages/Members/components/BasicInformation';

// import BasicInformation from '@/pages/Members/components/BasicInformation';
import type { MemberDetailProps } from '../../IMember.types';

interface DetailModalProps extends Omit<MemberDetailProps, 'onClose'> {
    editable?: boolean;
    onEdit: (formData: Partial<API.BaseContact>) => Promise<boolean>;
    onSelectFile: (files?: Attachment[]) => Promise<void>;
    setShowProfileModal: (visible: boolean) => void;
    selectedProfileAvatar?: Attachment[];
    setSelectedProfileAvatar: (files?: Attachment[]) => void;
    showProfileModal: boolean;
}

const DetailModal = (props: DetailModalProps) => {
    const {
        showProfileModal,
        user,
        setShowProfileModal,
        setSelectedProfileAvatar,
        editable,
        isPresence,
        onEdit,
        onSelectFile,
        type,
        selectedProfileAvatar,
    } = props;
    const basicInfoRef = useRef<BasicInformationRef>(null);

    const onModalClose: DialogProps['onClose'] = (event, reason: 'backdropClick' | 'escapeKeyDown') => {
        if (reason === 'backdropClick' && basicInfoRef.current?.editing) {
            basicInfoRef.current?.openDialog();
        } else {
            setShowProfileModal(false);
        }
    };

    return (
        <DialogModal
            open={showProfileModal}
            onClose={onModalClose}
            showHeader={false}
            // sxDialog={{ '& .MuiPaper-root': { width: '832px', padding: '11px 0' } }}
            sxDialog={{
                '.MuiDialog-paper': {
                    height: '100%',
                    width: '832px',
                },
            }}
            sxContent={{
                overflow: 'hidden',
                height: '100%',
                display: 'flex',
                flexDirection: 'column !important',
            }}
        >
            <BasicInformation
                ref={basicInfoRef}
                editable={editable}
                onEdit={onEdit}
                onSelectFile={onSelectFile}
                isPresence={isPresence}
                type={type}
                onClose={() => setShowProfileModal(false)}
                setShowProfileModal={setShowProfileModal}
                user={user}
                selectedAvatarFile={selectedProfileAvatar}
                setSelectedProfileAvatar={setSelectedProfileAvatar}
                columns="two"
                isProfileModal
            />
        </DialogModal>
    );
};

export default DetailModal;
