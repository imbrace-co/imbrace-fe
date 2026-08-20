import type { Attachment } from '@imbrace/ui';
import { useRef } from 'react';

import Drawer from '@/components/DrawerV2';
import type { BasicInformationRef } from '@/pages/Members/components/BasicInformation';
import BasicInformation from '@/pages/Members/components/BasicInformation';

import type { MemberDetailProps } from '../../IMember.types';

interface DetailDrawerProps extends MemberDetailProps {
    editable?: boolean;
    onEdit: (formData: Partial<API.BaseContact>) => Promise<boolean>;
    onSelectFile: (files?: Attachment[]) => Promise<void>;
    setShowProfileModal: (visible: boolean) => void;
    selectedProfileAvatar?: Attachment[];
    setSelectedProfileAvatar: (files?: Attachment[]) => void;
}

const DetailDrawer = (props: DetailDrawerProps) => {
    const {
        user,
        setShowProfileModal,
        editable,
        isPresence,
        onEdit,
        onSelectFile,
        onClose,
        type,
        selectedProfileAvatar,
        setSelectedProfileAvatar,
        ...restProps
    } = props;
    const basicInfoRef = useRef<BasicInformationRef>(null);

    const onBackdropClick = () => {
        if (basicInfoRef.current?.editing) {
            basicInfoRef.current?.openDialog();
        } else {
            onClose();
        }
    };

    return (
        <Drawer onBackdropClick={onBackdropClick} {...restProps}>
            <BasicInformation
                ref={basicInfoRef}
                editable={editable}
                onEdit={onEdit}
                onSelectFile={onSelectFile}
                isPresence={isPresence}
                type={type}
                onClose={onClose}
                showCropFree
                setShowProfileModal={setShowProfileModal}
                user={user}
                selectedAvatarFile={selectedProfileAvatar}
                setSelectedProfileAvatar={setSelectedProfileAvatar}
            />
        </Drawer>
    );
};

export default DetailDrawer;
