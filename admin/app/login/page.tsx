"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { setAuthToken } from '@/lib/auth';
import { adminApi } from '@/services/admin-api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [firstName, setFirstName] = useState('Admin');
  const [lastName, setLastName] = useState('User');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const sendOtp = async () => {
    try {
      setLoading(true);
      await adminApi.sendOtp({ first_name: firstName, last_name: lastName, phone_number: phone });
      setOtpSent(true);
      toast.success('OTP sent');
    } catch {
      toast.error('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    try {
      setLoading(true);
      const result = await adminApi.verifyOtp({ phone_number: phone, otp_code: otpCode });
      if (result.user.role !== 'ADMIN') {
        toast.error('Only admin users can access this dashboard');
        return;
      }
      setAuthToken(result.access_token);
      toast.success('Welcome back');
      router.push('/');
    } catch {
      toast.error('OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f6f2] p-4">
      <Card className="w-full max-w-md border-[#e7ded3] shadow-sm">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
          <CardDescription>Sign in with OTP using an ADMIN role account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input value={lastName} onChange={(event) => setLastName(event.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+9627..." />
          </div>
          {otpSent ? (
            <div className="space-y-1.5">
              <Label>OTP code</Label>
              <Input value={otpCode} onChange={(event) => setOtpCode(event.target.value)} placeholder="123456" />
            </div>
          ) : null}
          {!otpSent ? (
            <Button className="w-full" onClick={sendOtp} disabled={loading || !phone}>
              Send OTP
            </Button>
          ) : (
            <Button className="w-full" onClick={verifyOtp} disabled={loading || !otpCode}>
              Verify OTP
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

