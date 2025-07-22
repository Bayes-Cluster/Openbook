'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

export default function HomePage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for OAuth callback parameters
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const status = urlParams.get('status');
      const error = urlParams.get('message');

      if (token && status === 'success') {
        // OAuth login successful
        localStorage.setItem('openbook_token', token);
        setStatus('success');
        setMessage('登录成功，正在跳转...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else if (status === 'error') {
        // OAuth login failed
        setStatus('error');
        setMessage(error || '登录失败');
        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
      } else {
        // Normal redirect logic
        if (apiClient.isAuthenticated()) {
          window.location.href = '/dashboard';
        } else {
          window.location.href = '/login';
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="h-8 w-8 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-green-600">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="h-8 w-8 bg-red-500 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="mt-4 text-red-600">{message}</p>
            <p className="mt-2 text-gray-500 text-sm">3秒后自动跳转到登录页面</p>
          </>
        )}
      </div>
    </div>
  );
}
