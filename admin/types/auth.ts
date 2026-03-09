export type SendOtpRequest = {
  first_name: string;
  last_name: string;
  phone_number: string;
};

export type VerifyOtpRequest = {
  phone_number: string;
  otp_code: string;
};

export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: string;
};

export type VerifyOtpResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

