import MuiStep from '@mui/material/Step';
import MuiStepper from '@mui/material/Stepper';
import { styled } from '@mui/material/styles';

// import { useTranslation } from 'react-i18next';
import ArrowRightIcon from '@/assets/icons/arrow_right.svg?react';
import LabelBlock1 from '@/assets/icons/step_block_1.svg?react';
import LabelBlock2 from '@/assets/icons/step_block_2.svg?react';
import LabelBlock3 from '@/assets/icons/step_block_3.svg?react';
import LabelBlock4 from '@/assets/icons/step_block_4.svg?react';
import { StepLabel as SharedStepLabel } from '@/components/Stepper';
import styles from '@/components/Stepper/index.module.scss';

const StepLabel = styled(SharedStepLabel, { shouldForwardProp: (prop) => prop !== 'canClick' && prop !== 'shouldDisabled' })(
    ({ shouldDisabled }: { shouldDisabled?: boolean }) => ({
        '.Mui-completed': {
            fill: shouldDisabled ? 'var(--color-light-2)' : 'var(--color-light-4)',
        },
        '.Mui-active.Mui-disabled': {
            fill: 'var(--color-accent-yellow-2)',
        },
        '.MuiStepIcon-root.Mui-completed': {
            fill: shouldDisabled ? 'var(--color-light-2)' : 'var(--color-light-4)',
        },
        '.MuiStepLabel-label.Mui-completed': {
            color: shouldDisabled ? 'var(--color-light-2)' : 'var(--color-light-5)',

            '& svg': {
                fill: shouldDisabled ? 'var(--color-light-2)' : 'var(--color-light-5)',
            },
        },
    }),
);

const Step = styled(MuiStep)(() => ({
    padding: 0,
}));

interface StepperProps {
    canClick?: boolean;
    steps?: string[];
    activeStep: number;
    goToStep: (step: number) => void;
    disabledSteps?: number[];
}

const LabelIconMap: Record<string, JSX.Element> = {
    '0': <LabelBlock1 />,
    '1': <LabelBlock2 />,
    '2': <LabelBlock3 />,
    '3': <LabelBlock4 />,
};

const Stepper = (props: StepperProps) => {
    const { activeStep, steps, canClick, goToStep, disabledSteps } = props;
    // const { t } = useTranslation();

    return (
        <>
            {steps && Array.isArray(steps) && (
                <MuiStepper activeStep={activeStep} connector={null}>
                    {steps.map((step, index) => {
                        let shouldDisabled = false;
                        if (disabledSteps && index < activeStep && disabledSteps.includes(index)) {
                            shouldDisabled = true;
                        }

                        return (
                            <Step key={index} disabled>
                                <StepLabel
                                    canClick={canClick}
                                    shouldDisabled={shouldDisabled}
                                    onClick={() => goToStep(index)}
                                    icon={LabelIconMap[`${index}`]}
                                >
                                    {step}
                                    {index < steps.length - 1 && <ArrowRightIcon className={styles.arrow} />}
                                </StepLabel>
                            </Step>
                        );
                    })}
                </MuiStepper>
            )}
        </>
    );
};

export default Stepper;
