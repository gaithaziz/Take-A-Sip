import { SendOtpPayload, TokenResponse, VerifyOtpPayload } from '@/types/api';

import { http } from './http';

export const authService = {
  sendOtp: async (payload: SendOtpPayload) => {
    await http.post('/auth/send-otp', payload);
  },
  verifyOtp: async (payload: VerifyOtpPayload) => {
    const { data } = await http.post<TokenResponse>('/auth/verify-otp', payload);
    return data;
  },
};
