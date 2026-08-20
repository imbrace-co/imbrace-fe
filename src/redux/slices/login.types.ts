export interface InitialState {
    sendOTPStatus: LoadingStatus;
    verifyOTPStatus: LoadingStatus;
    resendOTPStatus: LoadingStatus;
    currentEmailAddress: string;
    currentSignupStep: number;
    customerId?: string | null;
    errors?: {
        sendOTPError?: string;
        verifyOTPError?: string;
        resendOTPError?: string;
    };
}
