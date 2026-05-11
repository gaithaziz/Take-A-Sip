import { KioskLoginPayload, SendOtpPayload, TokenResponse, VerifyOtpPayload } from '@/types/api';

import { http } from './http';

export const authService = {
  sendOtp: async (payload: SendOtpPayload) => {
    await http.post('/auth/send-otp', payload);
  },
  verifyOtp: async (payload: VerifyOtpPayload) => {
    const { data } = await http.post<TokenResponse>('/auth/verify-otp', payload);
    return data;
  },
  kioskLogin: async (payload: KioskLoginPayload) => {
    const { data } = await http.post<TokenResponse>('/auth/kiosk-login', payload);
    return data;
  },
};
