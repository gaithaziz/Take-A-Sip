import { AuthUser, SendOtpPayload, TokenResponse, UpdateProfilePayload, VerifyOtpPayload } from '@/types/api';

import { http } from './http';

export const authService = {
  async sendOtp(payload: SendOtpPayload): Promise<{ message: string }> {
    const { data } = await http.post('/auth/send-otp', payload);
    return data;
  },
  async verifyOtp(payload: VerifyOtpPayload): Promise<TokenResponse> {
    const { data } = await http.post('/auth/verify-otp', payload);
    return data;
  },
  async me(): Promise<AuthUser> {
    const { data } = await http.get('/auth/me');
    return data;
  },
  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const { data } = await http.patch('/auth/me', payload);
    return data;
  },
  async deleteAccount(): Promise<{ message: string }> {
    const { data } = await http.delete('/auth/me');
    return data;
  },
};
