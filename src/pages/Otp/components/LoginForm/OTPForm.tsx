import Typography from '@mui/material/Typography';
import type { AxiosError } from 'axios';
import type { KeyboardEvent } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { replace } from 'redux-first-history';

import { IMBRACE_ACCESS_TOKEN } from '@/constants/app';
import { fetchOrganizationListThunk } from '@/redux/slices/organization';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { postLoginEmail, postLoginOTP } from '@/services/api/login';
import apiFetch from '@/services/axios/handler';

import OTPInput from './OTPInput';

const OTPForm = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const login = useAppSelector((state) => state.Login);
    const [pasteCompleted, setPasteCompleted] = useState<boolean>(false);
    const [otp, setOtp] = useState([{ focus: true, value: '' }, ...new Array(5).fill({ focus: false, value: '' })]);

    const handleFocus = (index: number) => {
        setOtp((prevState) =>
            prevState.map((el, idx) =>
                idx === index
                    ? { ...el, focus: true }
                    : {
                          ...el,
                          focus: false,
                      },
            ),
        );
    };

    const handleBlur = (index: number) => {
        setOtp((prevState) =>
            prevState.map((el, idx) =>
                idx === index
                    ? { ...el, focus: false }
                    : {
                          ...el,
                          focus: false,
                      },
            ),
        );
    };

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLInputElement>, index: number) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                let i;

                if (index - 1 < 0) {
                    i = 0;
                } else {
                    i = index - 1;
                }

                handleFocus(i);
                return;
            }

            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                let i;

                if (index + 1 > otp.length - 1) {
                    i = otp.length - 1;
                } else {
                    i = index + 1;
                }

                handleFocus(i);
                return;
            }

            if ((index === 5 && !otp[5].value) || !otp.some((el) => el.value === '')) {
                setPasteCompleted(true);
            }

            if (event.key === 'Backspace') {
                setOtp((prevState) =>
                    prevState.map((el, idx, arr) => {
                        // check if the current input has value,
                        // if has value, don't focus previous input box
                        if (idx === index && arr[index].value) {
                            return {
                                ...el,
                                value: '',
                            };
                        }

                        if (idx === index - 1 && !arr[index].value) {
                            return {
                                ...el,
                                focus: true,
                            };
                        }

                        return el;
                    }),
                );
                return;
            }

            if (!/^[A-Za-z\d]+$/.test(event.key) || event.key.length > 1) {
                return;
            }

            setOtp((prevState) =>
                prevState.map((el, idx) => {
                    if (idx === index) {
                        return {
                            ...el,
                            value: event.key,
                        };
                    }

                    if (idx === index + 1) {
                        return {
                            ...el,
                            focus: true,
                        };
                    }

                    return el;
                }),
            );
        },
        [otp],
    );

    const verifyOTP = useCallback(
        async (requestBody: { email: string | null; otp: string }) => {
            try {
                const response = await apiFetch<API.VerifyOTP>(postLoginOTP.api, postLoginEmail.method, requestBody);

                localStorage.setItem(IMBRACE_ACCESS_TOKEN, response.data.token);

                setOtp(new Array(6).fill({ focus: false, value: '' }));
                await dispatch(fetchOrganizationListThunk({ limit: 10, skip: 0 }));
                await dispatch(replace('/organization'));
            } catch (err) {
                const error = err as AxiosError<API.ErrorResponse>;
                console.log('verify OTP error: ', error);
            }
        },
        [dispatch],
    );

    useEffect(() => {
        if (!otp.some((el) => el.value === '') && pasteCompleted) {
            const code = otp
                .map((el) => el.value)
                .join('')
                .toUpperCase();

            setPasteCompleted(false);

            verifyOTP({ email: login.currentEmailAddress, otp: code });
        }
    }, [login.currentEmailAddress, dispatch, otp, pasteCompleted, verifyOTP]);

    const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedText = event.clipboardData
            .getData('text/plain')
            .substring(0, 6)
            .replaceAll(/[^a-zA-Z0-9 ]/g, '')
            .split('');
        setOtp((prevState) =>
            prevState.map((_el, index) => {
                return {
                    value: pastedText[index],
                    focus: false,
                };
            }),
        );
        setPasteCompleted(true);
    };
    const getTranslation = (str?: string) => {
        if (str === 'Too many attempts, please try again after 15 minutes') {
            return t('login-too-many-attempts');
        }

        if (str === 'Invalid OTP, Too many attempts, please try again after 15 minutes') {
            return t('invalid-otp-too-many-attempts');
        }

        if (str === 'Invalid OTP') {
            return t('otp-invalid-otp');
        }
        return '';
    };

    return (
        <div className="verification-page-otp-form-root" onPaste={handlePaste}>
            <div>
                {otp.map((el: { focus: boolean; value: string }, index: number) => (
                    <OTPInput
                        className={'verification-page-otp-form-input'}
                        type="number"
                        value={el.value}
                        isFocus={el.focus}
                        key={index}
                        onFocus={() => handleFocus(index)}
                        onBlur={() => handleBlur(index)}
                        onKeyDown={(event) => handleKeyDown(event, index)}
                        onChange={() => undefined}
                    />
                ))}
            </div>

            <Typography sx={{ mt: 1, color: '#ff4343' }}>{getTranslation(login.errors?.verifyOTPError)}</Typography>
        </div>
    );
};

export default OTPForm;
