import MuiStep from '@mui/material/Step';
import MuiStepLabel from '@mui/material/StepLabel';
import MuiStepper from '@mui/material/Stepper';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import ArrowRightIcon from '@/assets/icons/arrow_right.svg?react';
import LabelBlock1 from '@/assets/icons/step_block_1.svg?react';
import LabelBlock2 from '@/assets/icons/step_block_2.svg?react';
import LabelBlock3 from '@/assets/icons/step_block_3.svg?react';
import LabelBlock4 from '@/assets/icons/step_block_4.svg?react';

import styles from './index.module.scss';

export const StepLabel = styled(MuiStepLabel, { shouldForwardProp: (prop) => prop !== 'canClick' })(
    ({ canClick }: { canClick?: boolean }) => ({
        cursor: canClick ? 'pointer' : 'default',
        fontStyle: 'normal',
        fontWeight: 700,
        fontSize: 14,
        lineHeight: '24px',

        '.Mui-active': {
            borderRadius: '4px',
            fill: 'var(--color-accent-yellow-2)',
        },
        '.Mui-disabled': {
            cursor: canClick ? 'pointer' : 'default',
            fill: 'var(--color-light-4)',
        },
        '.Mui-completed': {
            fill: 'var(--color-light-4)',
        },
        '.MuiStepIcon-root': {
            fill: '#bdbdbd',
        },
        '.MuiStepIcon-root.Mui-active': {
            fill: 'var(--color-accent-yellow-2)',
        },
        '.MuiStepIcon-root.Mui-completed': {
            fill: 'var(--color-light-4)',
        },
        '.MuiStepLabel-label': {
            color: '#bdbdbd',
            fontSize: 16,
            display: 'flex',
            alignItem: 'center',
        },
        '.MuiStepLabel-label.Mui-active': {
            color: 'var(--color-accent-yellow-2)',
            '& svg': {
                fill: 'var(--color-accent-yellow-2)',
            },
        },
        '.MuiStepLabel-label.Mui-completed': {
            color: 'var(--color-light-5)',
            '& svg': {
                fill: 'var(--color-light-5)',
            },
        },
        '.MuiStepLabel-label.MuiStepLabel-alternativeLabel': {
            marginTop: 10,
        },
    }),
);

const Step = styled(MuiStep)(() => ({
    padding: 0,
}));

interface StepperProps {
    canClick?: boolean;
    onNext?: () => void;
    steps?: string[];
    activeStep: number;
    goToStep?: (step: number) => void;
}

const LabelIconMap: Record<string, JSX.Element> = {
    '0': <LabelBlock1 />,
    '1': <LabelBlock2 />,
    '2': <LabelBlock3 />,
    '3': <LabelBlock4 />,
};

const Stepper = (props: StepperProps) => {
    const { activeStep, steps, onNext, canClick, goToStep } = props;
    const { t } = useTranslation();

    return (
        <>
            {steps && Array.isArray(steps) ? (
                <MuiStepper activeStep={activeStep} connector={null}>
                    {steps.map((step, index) => {
                        return (
                            <Step key={index}>
                                <StepLabel
                                    canClick={canClick}
                                    onClick={goToStep ? () => goToStep(index) : onNext}
                                    icon={LabelIconMap[`${index}`]}
                                >
                                    {step}
                                    {index < steps.length - 1 && <ArrowRightIcon className={styles.arrow} />}
                                </StepLabel>
                            </Step>
                        );
                    })}
                </MuiStepper>
            ) : (
                <MuiStepper activeStep={activeStep} connector={null}>
                    <Step>
                        <StepLabel canClick={canClick} icon={<LabelBlock1 />}>
                            {t('invite')}
                            <ArrowRightIcon className={styles.arrow} />
                        </StepLabel>
                    </Step>
                    <Step>
                        <StepLabel canClick={canClick} onClick={onNext} icon={<LabelBlock2 />}>
                            {t('step_confirm')}
                        </StepLabel>
                    </Step>
                </MuiStepper>
            )}
        </>
    );
};

export default Stepper;
