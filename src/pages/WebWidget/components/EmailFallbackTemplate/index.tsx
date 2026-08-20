import { Button, EllipsisText } from '@imbrace/ui';
import ArrowDownIcon from '@mui/icons-material/ArrowDropDown';
import MoreIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PrintIcon from '@mui/icons-material/PrintOutlined';
import ReplyIcon from '@mui/icons-material/Shortcut';
import StarIcon from '@mui/icons-material/StarBorder';
import { Divider, Typography } from '@mui/material';
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SenderAvatarIcon from '@/assets/icons/icon_email_sender.svg?react';
import LabelImportantIcon from '@/assets/icons/icon_label_important.svg?react';

import {
    EmailBody,
    EmailFooter,
    EmailProfile,
    EmailTitle,
    ESignatureContainer,
    Header,
    HeaderContainer,
    IconContainer,
    ProfileColumn,
    ProfileText,
    StyledPaper,
} from './StyleComponents';

interface Props {
    fallbackEmail?: string;
    subjectTitle: string;
    profileDisplayName: string;
    displayCtaBtn?: boolean;
    ctaBtnAction?: string;
    ctaBtnColor?: string;
    ctaBtnText?: string;
    ctaBtnUrl?: string;
    eSignaturePic?: File | string;
    displayPoweredBy?: boolean;
    eSignatureTeamName?: string;
    eSignatureContactInfo?: string;
    legalDisclaimer?: string;
    action_button_text?: string;
}

const EmailFallbackTemplate: FC<Props> = (props) => {
    const {
        fallbackEmail,
        subjectTitle,
        profileDisplayName,
        displayCtaBtn = true,
        ctaBtnAction,
        ctaBtnText,
        eSignaturePic,
        displayPoweredBy = true,
        eSignatureTeamName,
        eSignatureContactInfo,
        legalDisclaimer,
        action_button_text,
    } = props;

    const { t } = useTranslation();
    const [preview, setPreview] = useState<string>();

    useEffect(() => {
        if (typeof eSignaturePic === 'string') {
            setPreview(eSignaturePic);
            return;
        }

        let objectUrl: string;
        if (eSignaturePic instanceof File) {
            objectUrl = URL.createObjectURL(eSignaturePic);
            setPreview(objectUrl);

            return () => URL.revokeObjectURL(objectUrl);
        }
        return () => URL.revokeObjectURL(objectUrl);
    }, [eSignaturePic]);

    const buttonText = () => {
        if (ctaBtnAction === undefined) return action_button_text;
        switch (ctaBtnAction) {
            case 'reply':
                return t('email_template_cta_btn_reply');
            case 'customize':
                return ctaBtnText || t('email_template_cta_btn_text');
            default:
                return t('email_template_cta_btn_text');
        }
    };

    return (
        <StyledPaper elevation={0}>
            <HeaderContainer>
                <Header>
                    <EmailTitle>
                        <>
                            <EllipsisText
                                text={subjectTitle || t('email_template_subject_line')}
                                style={{ fontSize: '22px', fontWeight: 700 }}
                            />
                        </>
                    </EmailTitle>
                    <IconContainer>
                        <div>
                            <LabelImportantIcon />
                        </div>
                        <div>
                            <PrintIcon sx={{ color: 'var(--color-light-7)' }} />
                            <OpenInNewIcon sx={{ color: 'var(--color-light-7)' }} />
                        </div>
                    </IconContainer>
                </Header>
                <EmailProfile>
                    <div className="avatarContainer">
                        <SenderAvatarIcon />
                    </div>
                    <div className="profileContainer">
                        <ProfileColumn width="60%">
                            <div className="profileDetail">
                                <div className="profileDisplayName">
                                    <EllipsisText
                                        text={profileDisplayName || t('email_template_profile_displayed_name')}
                                        style={{ fontSize: '14px', fontWeight: 500 }}
                                    />
                                </div>
                                <span className="fallbackEmail">
                                    <EllipsisText
                                        text={`<${fallbackEmail || 'example@email.com'}>`}
                                        style={{ fontSize: '12px', fontWeight: 400 }}
                                    />
                                </span>
                            </div>
                            <ProfileText>
                                <span className="toMe">
                                    to me <ArrowDownIcon sx={{ color: 'var(--color-light-7)', height: '20px', width: '20px' }} />
                                </span>
                            </ProfileText>
                        </ProfileColumn>
                        <ProfileColumn width="20%">
                            <ProfileText>
                                <span className="timestamp">
                                    <EllipsisText text="9:07 AM (2 hours ago)" style={{ fontSize: '14px', fontWeight: 300 }} />
                                </span>
                            </ProfileText>
                        </ProfileColumn>
                        <ProfileColumn width="20%">
                            <span className="icons">
                                <StarIcon sx={{ color: 'var(--color-light-7)', height: '20px', width: '20px' }} />
                                <ReplyIcon
                                    sx={{
                                        color: 'var(--color-light-7)',
                                        height: '20px',
                                        width: '20px',
                                        transform: 'scaleX(-1)',
                                    }}
                                />
                                <MoreIcon sx={{ color: 'var(--color-light-7)', height: '20px', width: '20px' }} />
                            </span>
                        </ProfileColumn>
                    </div>
                </EmailProfile>
            </HeaderContainer>
            <EmailBody>
                <Typography variant="body2" sx={{ paddingBottom: '12px', fontWeight: 400, fontSize: '14px', lineHeight: '24px' }}>
                    {t('web_widget_dear_customer')}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 400, fontSize: '14px', lineHeight: '21px' }}>
                    {t('web_widget_rep_reply')}
                </Typography>

                {displayCtaBtn && (
                    <>
                        <Button text={buttonText()} sx={{ marginTop: '32px', padding: '8px 30px' }} />
                        <Typography
                            sx={{
                                color: 'var(--color-light-5)',
                                paddingTop: '8px',
                                fontSize: '12px',
                                fontWeight: 400,
                                lineHeight: '14.4px',
                            }}
                        >
                            {t('web_widget_action_button_notice')}
                        </Typography>
                    </>
                )}
            </EmailBody>
            <EmailFooter>
                <ESignatureContainer>
                    {preview && (
                        <div className="imgContainer">
                            <img src={preview} alt="eSignature" style={{ maxWidth: '96px', height: '44px' }} />
                        </div>
                    )}
                    <div className="textContainer">
                        <Typography
                            variant="caption"
                            sx={{ color: 'var(--color-light-7)', fontWeight: 500, fontSize: '14px', lineHeight: '18px' }}
                        >
                            {eSignatureTeamName}
                        </Typography>
                        <Typography
                            variant="subtitle1"
                            sx={{ color: 'var(--color-light-7)', fontWeight: 400, fontSize: '14px', lineHeight: '18px' }}
                        >
                            {eSignatureContactInfo}
                        </Typography>
                    </div>
                </ESignatureContainer>

                <Divider sx={{ marginBottom: '4px' }} />
                {displayPoweredBy && (
                    <Typography variant="caption" sx={{ display: 'block', lineHeight: '18px', fontWeight: 700 }}>
                        Powered by iMBrace Limited.
                    </Typography>
                )}
                <Typography variant="caption" sx={{ lineHeight: '18px', fontWeight: 400 }}>
                    {legalDisclaimer}
                </Typography>
            </EmailFooter>
            <div className="disclaimer">
                <Typography sx={{ fontSize: '12px', fontWeight: 300, lineHeight: '18px' }}>
                    {t('email_template_preview_purpose')}
                </Typography>
            </div>
        </StyledPaper>
    );
};

export default EmailFallbackTemplate;
