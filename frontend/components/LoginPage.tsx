'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api';
import { Cpu, ExternalLink, RotateCcw, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('');

  useEffect(() => {
    // Check if already authenticated
    if (typeof window !== 'undefined' && apiClient.isAuthenticated()) {
      window.location.href = '/dashboard';
      return;
    }

    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      handleOAuthCallback(code, state);
    } else {
      loadOAuthUrl();
    }
  }, []);

  const loadOAuthUrl = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getOAuthUrl();
      setOauthUrl(response.oauth_url);
      setProvider(response.provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取登录链接失败');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      setLoading(true);
      const result = await apiClient.handleOAuthCallback(code, state);
      // Redirect to dashboard on success
      window.location.href = '/dashboard';
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = () => {
    if (oauthUrl) {
      window.location.href = oauthUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Cpu className="h-12 w-12 text-gray-800" />
            <h1 className="text-4xl font-bold text-gray-900">OpenBook</h1>
          </div>
          <p className="text-gray-600">显卡资源预约与管理系统</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">欢迎使用 OpenBook</CardTitle>
            <CardDescription>
              请通过 OAuth 登录来访问资源预约功能
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="p-4 border border-red-200 bg-red-50 rounded-md">
                <div className="flex items-center space-x-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              </div>
            )}

            {/* Login Button */}
            <Button 
              onClick={handleOAuthLogin}
              disabled={loading || !oauthUrl}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-4 w-4 animate-spin" />
                  <span>加载中...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <ExternalLink className="h-4 w-4" />
                  <span>通过 {provider || 'OAuth'} 登录</span>
                </div>
              )}
            </Button>

            {/* Features */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">功能特色</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>可视化日历界面</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>实时资源状态监控</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>智能预约管理</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                  <span>数据统计分析</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© 2025 OpenBook. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
