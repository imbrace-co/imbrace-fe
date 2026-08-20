import React, { useMemo, useState } from 'react';
import { Space, Typography, Button, useDialog } from '@imbrace/ui';
import { Box, Card, CardContent, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { useTranslation } from 'react-i18next';
import apiFetch from '@/services/axios/handler';

interface TransactionData {
    Time: string; // HH:mm 24h
    Amount: string; // "$xx.xx"
    UseChip: 'Swipe Transaction' | 'Chip Transaction' | 'Contactless';
    MerchantName: string;
    MerchantCity: string;
    MerchantState: string; // 2-letter state code
    Zip: number; // numeric (can be decimal)
    MCC: number; // 4-digit code
}

interface PaymentData {
    cardNumber: string; // 16 digits
    expiryDate: string; // MM/YY
    cvv: string; // 3 digits
    cardholderName: string;
}

interface FraudDetectionResponse {
    prediction: number[][];
    shap_values: number[][];
}

const allowedUseChip: TransactionData['UseChip'][] = ['Swipe Transaction', 'Chip Transaction', 'Contactless'];

const NvidiaFraudDetection: React.FC = () => {
    const { t } = useTranslation();
    const [{ dialog }, dialogHolder] = useDialog();

    const [activeCard, setActiveCard] = useState<'configure' | 'payment' | null>(null);
    const [transactionData, setTransactionData] = useState<TransactionData>({
        Time: '13:53',
        Amount: '$86.19',
        UseChip: 'Swipe Transaction',
        MerchantName: '-7146670748125200898',
        MerchantCity: 'Monterey Park',
        MerchantState: 'CA',
        Zip: 91755.0,
        MCC: 5970,
    });
    const [paymentData, setPaymentData] = useState<PaymentData>({
        cardNumber: '4242424242424242',
        expiryDate: '12/27',
        cvv: '321',
        cardholderName: 'Jimmy Ng',
    });

    const [transactionErrors, setTransactionErrors] = useState<Partial<Record<keyof TransactionData, string>>>({});
    const [paymentErrors, setPaymentErrors] = useState<Partial<Record<keyof PaymentData, string>>>({});

    // ------------- Validators -------------
    const validateTime = (time: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? '' : 'Invalid time (use HH:mm 24-hour)');
    const validateAmount = (amount: string) => (/^\$\d+(?:\.\d{2})$/.test(amount) ? '' : 'Invalid amount (use $ and 2 decimals)');
    const validateState = (state: string) => (/^[A-Z]{2}$/.test(state) ? '' : 'State must be 2 letters');
    const validateZip = (zip: number) => (Number.isFinite(zip) ? '' : 'Zip must be a number');
    const validateMCC = (mcc: number) => (/^\d{4}$/.test(String(mcc)) ? '' : 'MCC must be 4 digits');
    const validateUseChip = (v: string) => (allowedUseChip.includes(v as any) ? '' : 'Invalid Use Chip');

    const getTransactionErrors = (data: TransactionData) => {
        return {
            Time: validateTime(data.Time),
            Amount: validateAmount(data.Amount),
            UseChip: validateUseChip(data.UseChip),
            MerchantName: data.MerchantName ? '' : 'Merchant Name is required',
            MerchantCity: data.MerchantCity ? '' : 'Merchant City is required',
            MerchantState: validateState(data.MerchantState),
            Zip: validateZip(data.Zip),
            MCC: validateMCC(data.MCC),
        } as Partial<Record<keyof TransactionData, string>>;
    };

    const validateCardNumber = (v: string) => (/^\d{16}$/.test(v) ? '' : 'Card number must be 16 digits');
    const validateExpiry = (v: string) => {
        if (!/^\d{2}\/\d{2}$/.test(v)) return 'Expiry must be MM/YY';
        const [mmStr] = v.split('/');
        const mm = Number(mmStr);
        if (mm < 1 || mm > 12) return 'Month must be 01-12';
        return '';
    };
    const validateCVV = (v: string) => (/^\d{3}$/.test(v) ? '' : 'CVV must be 3 digits');

    const getPaymentErrors = (data: PaymentData) => ({
        cardNumber: validateCardNumber(data.cardNumber),
        expiryDate: validateExpiry(data.expiryDate),
        cvv: validateCVV(data.cvv),
        cardholderName: data.cardholderName ? '' : 'Cardholder name is required',
    });

    const isTransactionValid = useMemo(() => Object.values(getTransactionErrors(transactionData)).every((e) => !e), [transactionData]);
    const isPaymentValid = useMemo(() => Object.values(getPaymentErrors(paymentData)).every((e) => !e), [paymentData]);

    // ------------- Sanitize Handlers -------------
    const handleConfigureClick = () => setActiveCard('configure');
    const handlePaymentClick = () => setActiveCard('payment');

    const handleTransactionDataChange = (field: keyof TransactionData, rawValue: string | number) => {
        let value: any = rawValue;
        if (field === 'Amount') {
            const digits = String(rawValue).replace(/[^0-9.]/g, '');
            const parts = digits.split('.');
            const normalized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('').slice(0, 2)}` : parts[0];
            value = `$${normalized}`;
        }
        if (field === 'MerchantState') {
            value = String(rawValue).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
        }
        if (field === 'Zip') {
            const sanitized = String(rawValue).replace(/[^0-9.]/g, '');
            value = sanitized ? Number(sanitized) : ('' as any);
        }
        if (field === 'MCC') {
            const onlyDigits = String(rawValue).replace(/\D/g, '').slice(0, 4);
            value = onlyDigits ? Number(onlyDigits) : ('' as any);
        }
        if (field === 'Time') {
            const onlyDigits = String(rawValue).replace(/\D/g, '').slice(0, 4);
            let formatted = onlyDigits;
            if (onlyDigits.length >= 3) {
                formatted = `${onlyDigits.slice(0, 2)}:${onlyDigits.slice(2, 4)}`;
            }
            value = formatted;
        }
        setTransactionData((prev) => ({ ...prev, [field]: value }));
        setTransactionErrors(getTransactionErrors({ ...transactionData, [field]: value } as TransactionData));
    };

    const handlePaymentDataChange = (field: keyof PaymentData, rawValue: string) => {
        let value = rawValue;
        if (field === 'cardNumber') {
            value = rawValue.replace(/\D/g, '').slice(0, 16);
        }
        if (field === 'expiryDate') {
            const digits = rawValue.replace(/\D/g, '').slice(0, 4);
            value = digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
        }
        if (field === 'cvv') {
            value = rawValue.replace(/\D/g, '').slice(0, 3);
        }
        setPaymentData((prev) => ({ ...prev, [field]: value }));
        setPaymentErrors(getPaymentErrors({ ...paymentData, [field]: value }));
    };

    // ------------- Actions -------------
    const handleSaveTransaction = () => {
        const errors = getTransactionErrors(transactionData);
        setTransactionErrors(errors);
        const hasError = Object.values(errors).some(Boolean);
        if (hasError) {
            dialog({ title: 'Invalid Data', content: 'Please correct the highlighted Configure fields.', confirmText: 'OK', hideCancelButton: true });
            return;
        }
        localStorage.setItem('nvidiaFraudTransactionData', JSON.stringify(transactionData));
        dialog({ 
            title: 'Success', 
            content: 'Transaction data saved successfully!', 
            confirmText: 'OK', 
            hideCancelButton: true,
            onConfirm: () => {
                setActiveCard(null);
            }
        });
    };

    const handleSubmitPayment = async () => {
        const pErrors = getPaymentErrors(paymentData);
        setPaymentErrors(pErrors);
        const hasPaymentError = Object.values(pErrors).some(Boolean);
        const saved = localStorage.getItem('nvidiaFraudTransactionData');
        const transaction: TransactionData = saved ? JSON.parse(saved) : transactionData;
        const tErrors = getTransactionErrors(transaction);
        const hasTransactionError = Object.values(tErrors).some(Boolean);

        if (hasPaymentError || hasTransactionError) {
            dialog({
                title: 'Invalid Data',
                content: hasTransactionError
                    ? 'Please ensure Configure data is valid and saved before submitting.'
                    : 'Please correct the highlighted Payment fields.',
                confirmText: 'OK',
                hideCancelButton: true,
            });
            if (hasTransactionError) setActiveCard('configure');
            return;
        }

        try {
            // Format the request body according to the specified structure
            const requestData = {
                User: 0,
                Card: 5, // Hardcoded as 0 regardless of credit card input
                Year: 2002, // Hardcoded
                Month: 9, // Hardcoded
                Day: 3, // Hardcoded
                Time: transaction.Time,
                Amount: transaction.Amount,
                "Use Chip": transaction.UseChip,
                "Merchant Name": transaction.MerchantName,
                "Merchant City": transaction.MerchantCity,
                "Merchant State": transaction.MerchantState,
                Zip: transaction.Zip,
                MCC: transaction.MCC
            };

            console.log(requestData);

            const response = await apiFetch<FraudDetectionResponse>('/predict', 'POST', requestData);
            
            // Extract the prediction value from the response
            const predictionValue = response.data?.prediction?.[0]?.[0];

            if (predictionValue !== undefined && predictionValue > 0.00004) {
                // Fraud detected
                console.log('Prediction value:', predictionValue, '- Showing fraud dialog');
                try {
                    dialog({
                        title: 'Fraud Detection',
                        content: 'This transaction has been flagged as potentially fraudulent.',
                        confirmText: 'OK',
                        confirmButtonProps: { type: 'danger' },
                        hideCancelButton: true,
                    });
                    console.log('Dialog call completed for fraud');
                } catch (dialogError) {
                    console.error('Dialog error for fraud:', dialogError);
                }
            } else {
                // Transaction is safe (non-fraudulent)
                console.log('Prediction value:', predictionValue, '- Showing success dialog');
                try {
                    dialog({
                        title: 'Transaction Verified Safe',
                        content: 'This transaction has been verified as non-fraudulent and is safe to proceed.',
                        confirmText: 'OK',
                        hideCancelButton: true,
                        onConfirm: () => {
                            setActiveCard(null);
                        }
                    });
                    console.log('Dialog call completed for success');
                } catch (dialogError) {
                    console.error('Dialog error for success:', dialogError);
                }
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            dialog({ 
                title: 'Error', 
                content: 'An error occurred while processing the payment.', 
                confirmText: 'OK', 
                confirmButtonProps: { type: 'danger' }, 
                hideCancelButton: true 
            });
        }
    };

    // ------------- Views -------------
    const renderConfigureCard = () => (
        <Card sx={{ width: '100%', maxWidth: 600, margin: '0 auto' }}>
            <CardContent>
                <Typography variant="SubHeading1" style={{ marginBottom: 8 }}>
                    Configure Transaction
                </Typography>
                <Space direction="vertical" size={16} style={{ width: '100%', marginTop: 16 }}>
                    <TextField
                        fullWidth
                        label="Time"
                        value={transactionData.Time}
                        onChange={(e) => handleTransactionDataChange('Time', e.target.value)}
                        placeholder="HH:mm"
                        error={!!transactionErrors.Time}
                        helperText={transactionErrors.Time}
                        inputProps={{ inputMode: 'numeric', maxLength: 5 }}
                    />
                    <TextField
                        fullWidth
                        label="Amount"
                        value={transactionData.Amount}
                        onChange={(e) => handleTransactionDataChange('Amount', e.target.value)}
                        placeholder="$0.00"
                        error={!!transactionErrors.Amount}
                        helperText={transactionErrors.Amount}
                        inputProps={{ inputMode: 'decimal' }}
                    />
                    <FormControl fullWidth error={!!transactionErrors.UseChip}>
                        <InputLabel>Use Chip</InputLabel>
                        <Select
                            value={transactionData.UseChip}
                            label="Use Chip"
                            onChange={(e) => handleTransactionDataChange('UseChip', e.target.value)}
                        >
                            {allowedUseChip.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Merchant Name"
                        value={transactionData.MerchantName}
                        onChange={(e) => handleTransactionDataChange('MerchantName', e.target.value)}
                        error={!!transactionErrors.MerchantName}
                        helperText={transactionErrors.MerchantName}
                    />
                    <TextField
                        fullWidth
                        label="Merchant City"
                        value={transactionData.MerchantCity}
                        onChange={(e) => handleTransactionDataChange('MerchantCity', e.target.value)}
                        error={!!transactionErrors.MerchantCity}
                        helperText={transactionErrors.MerchantCity}
                    />
                    <TextField
                        fullWidth
                        label="Merchant State"
                        value={transactionData.MerchantState}
                        onChange={(e) => handleTransactionDataChange('MerchantState', e.target.value)}
                        placeholder="CA"
                        error={!!transactionErrors.MerchantState}
                        helperText={transactionErrors.MerchantState}
                        inputProps={{ maxLength: 2 }}
                    />
                    <TextField
                        fullWidth
                        label="Zip"
                        value={transactionData.Zip}
                        onChange={(e) => handleTransactionDataChange('Zip', e.target.value)}
                        error={!!transactionErrors.Zip}
                        helperText={transactionErrors.Zip}
                        inputProps={{ inputMode: 'decimal' }}
                    />
                    <TextField
                        fullWidth
                        label="MCC"
                        value={transactionData.MCC}
                        onChange={(e) => handleTransactionDataChange('MCC', e.target.value)}
                        error={!!transactionErrors.MCC}
                        helperText={transactionErrors.MCC}
                        inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                    />
                    <Box sx={{ mt: 2 }}>
                        <Space size={16} style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Button text="Back" onClick={() => setActiveCard(null)} />
                            <Button text="Save" onClick={handleSaveTransaction} disabled={!isTransactionValid} />
                        </Space>
                    </Box>
                </Space>
            </CardContent>
        </Card>
    );

    const renderPaymentCard = () => (
        <Card sx={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
            <CardContent>
                <Typography variant="SubHeading1" style={{ marginBottom: 8 }}>
                    Payment Information
                </Typography>
                <Box sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 2, padding: 3, marginBottom: 3, color: 'white' }}>
                    <Typography variant="SubHeading2" style={{ marginBottom: 8 }}>
                        Credit Card
                    </Typography>
                    <Typography variant="Body" style={{ marginBottom: 8 }}>
                        {paymentData.cardNumber ? paymentData.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ').trim() : '**** **** **** ****'}
                    </Typography>
                    <Space justify="between" style={{ width: '100%' }}>
                        <Typography variant="Body">{paymentData.cardholderName || 'CARDHOLDER NAME'}</Typography>
                        <Typography variant="Body">{paymentData.expiryDate || 'MM/YY'}</Typography>
                    </Space>
                </Box>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <TextField
                        fullWidth
                        label="Card Number"
                        value={paymentData.cardNumber}
                        onChange={(e) => handlePaymentDataChange('cardNumber', e.target.value)}
                        placeholder="4242 4242 4242 4242"
                        error={!!paymentErrors.cardNumber}
                        helperText={paymentErrors.cardNumber}
                        inputProps={{ inputMode: 'numeric', maxLength: 16 }}
                    />
                    <TextField
                        fullWidth
                        label="Cardholder Name"
                        value={paymentData.cardholderName}
                        onChange={(e) => handlePaymentDataChange('cardholderName', e.target.value)}
                        error={!!paymentErrors.cardholderName}
                        helperText={paymentErrors.cardholderName}
                    />
                    <Space size={16} style={{ width: '100%' }}>
                        <TextField
                            label="Expiry Date"
                            value={paymentData.expiryDate}
                            onChange={(e) => handlePaymentDataChange('expiryDate', e.target.value)}
                            placeholder="MM/YY"
                            error={!!paymentErrors.expiryDate}
                            helperText={paymentErrors.expiryDate}
                            inputProps={{ inputMode: 'numeric', maxLength: 5 }}
                            style={{ flex: 1 }}
                        />
                        <TextField
                            label="CVV"
                            value={paymentData.cvv}
                            onChange={(e) => handlePaymentDataChange('cvv', e.target.value)}
                            placeholder="123"
                            error={!!paymentErrors.cvv}
                            helperText={paymentErrors.cvv}
                            inputProps={{ inputMode: 'numeric', maxLength: 3 }}
                            style={{ flex: 1 }}
                        />
                    </Space>
                    <Box sx={{ mt: 2 }}>
                        <Space size={16} style={{ width: '100%', justifyContent: 'space-between' }}>
                            <Button text="Back" onClick={() => setActiveCard(null)} />
                            <Button text="Submit" onClick={handleSubmitPayment} disabled={!isPaymentValid} />
                        </Space>
                    </Box>
                </Space>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ padding: '8px 24px 24px 24px', maxWidth: 1200, margin: '0 auto' }}>
            {dialogHolder}
            <Box sx={{ textAlign: 'center', mb: 1 }}>
                <Typography variant="Heading2" style={{ marginBottom: 8 }}>
                    NVIDIA Fraud Detection Demo
                </Typography>
            </Box>

            {!activeCard ? (
                <Space size={24} style={{ marginTop: 16, justifyContent: 'center' }}>
                    <Card
                        sx={{ width: 300, height: 200, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                        onClick={handleConfigureClick}
                    >
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography variant="SubHeading1" style={{ marginBottom: 8 }}>
                                Configure
                            </Typography>
                            <Typography variant="Body" style={{ color: 'var(--color-light-5)', textAlign: 'center' }}>
                                Set up transaction parameters and merchant information
                            </Typography>
                        </CardContent>
                    </Card>

                    <Card
                        sx={{ width: 300, height: 200, cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.05)' } }}
                        onClick={handlePaymentClick}
                    >
                        <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Typography variant="SubHeading1" style={{ marginBottom: 8 }}>
                                Payment
                            </Typography>
                            <Typography variant="Body" style={{ color: 'var(--color-light-5)', textAlign: 'center' }}>
                                Enter payment details and process transaction
                            </Typography>
                        </CardContent>
                    </Card>
                </Space>
            ) : (
                <Box sx={{ marginTop: 4 }}>
                    {activeCard === 'configure' && renderConfigureCard()}
                    {activeCard === 'payment' && renderPaymentCard()}
                </Box>
            )}
        </Box>
    );
};

export default NvidiaFraudDetection;
