import { useState, useEffect, useCallback } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { createEphemeralSupabaseClient, getSupabaseClient } from '../lib/supabase-client';
import { toast } from 'sonner';
import { getUserRoleAndStatus } from '@backend/services/authService';
import type { UserRole } from '@backend/types/index';

export interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
    avatar?: string;
}

export type { UserRole };

export interface LoginResult {
    user: User;
    role: UserRole;
}

interface UseSupabaseAuthReturn {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    role: UserRole | null;
    adminEmail: string | null;
    handleLogin: (email: string, password: string) => Promise<LoginResult | null>;
    handleRegister: (data: { email: string; password: string; name: string; phone?: string }) => Promise<LoginResult | null>;
    handleLogout: () => Promise<void>;
    handleUpdateUser: (user: User) => Promise<void>;
    handleResetPassword: (email: string) => Promise<boolean>;
    handleChangePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

// Helper to convert Supabase user to app User
function toAppUser(supabaseUser: SupabaseUser): User {
    return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
        phone: supabaseUser.user_metadata?.phone,
        avatar: supabaseUser.user_metadata?.avatar_url,
    };
}

export function useSupabaseAuth(): UseSupabaseAuthReturn {
    const supabase = getSupabaseClient();
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [adminEmail, setAdminEmail] = useState<string | null>(null);
    const [role, setRole] = useState<UserRole | null>(null);

    const refreshRbacState = useCallback(async (nextSession: Session | null) => {
        const email = nextSession?.user?.email ?? null;
        if (!nextSession?.user) {
            setRole(null);
            setAdminEmail(null);
            return;
        }
        const { role: nextRole } = await getUserRoleAndStatus(supabase as any as any, nextSession.user.id);
        setRole(nextRole);
        setAdminEmail(nextRole === 'admin' ? email : null);
    }, [supabase]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ? toAppUser(session.user) : null);
            refreshRbacState(session);
            setIsLoading(false);
        }).catch((error) => {
            console.error('Failed to initialize auth session:', error);
            setSession(null);
            setUser(null);
            setAdminEmail(null);
            setRole(null);
            setIsLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ? toAppUser(session.user) : null);
            refreshRbacState(session);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [refreshRbacState, supabase.auth]);

    const handleLogin = useCallback(async (email: string, password: string): Promise<LoginResult | null> => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                handleAuthError(error);
                return null;
            }
            if (data.user) {
                const { role: nextRole, status } = await getUserRoleAndStatus(supabase as any as any, data.user.id);
                if (status === 'suspended') {
                    await supabase.auth.signOut();
                    toast.error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
                    return null;
                }
                const appUser = toAppUser(data.user);
                setRole(nextRole);
                setAdminEmail(nextRole === 'admin' ? appUser.email : null);
                toast.success('Đăng nhập thành công!');
                return { user: appUser, role: nextRole };
            }
            return null;
        } catch (error) {
            toast.error('Đã xảy ra lỗi khi đăng nhập');
            return null;
        }
    }, [supabase]);

    const handleRegister = useCallback(async (data: { email: string; password: string; name: string; phone?: string }): Promise<LoginResult | null> => {
        try {
            const { data: authData, error } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: { data: { name: data.name, phone: data.phone } },
            });
            if (error) {
                handleAuthError(error);
                return null;
            }
            if (authData.user) {
                if (authData.user.identities?.length === 0) {
                    toast.error('Email này đã được đăng ký');
                    return null;
                }
                if (!authData.session) {
                    toast.success('Vui lòng kiểm tra email để xác nhận tài khoản');
                    return null;
                }
                const appUser = toAppUser(authData.user);
                const { role: nextRole } = await getUserRoleAndStatus(supabase as any as any, authData.user.id);
                setRole(nextRole);
                setAdminEmail(nextRole === 'admin' ? appUser.email : null);
                toast.success('Đăng ký thành công!');
                return { user: appUser, role: nextRole };
            }
            return null;
        } catch (error) {
            toast.error('Đã xảy ra lỗi khi đăng ký');
            return null;
        }
    }, [supabase]);

    const handleLogout = useCallback(async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                toast.error('Đã xảy ra lỗi khi đăng xuất');
                return;
            }
            setUser(null);
            setSession(null);
            setAdminEmail(null);
            setRole(null);
            toast.success('Đã đăng xuất thành công');
        } catch (error) {
            toast.error('Đã xảy ra lỗi khi đăng xuất');
        }
    }, [supabase.auth]);

    const handleUpdateUser = useCallback(async (updatedUser: User) => {
        try {
            const { error } = await supabase.auth.updateUser({
                data: { name: updatedUser.name, phone: updatedUser.phone, avatar_url: updatedUser.avatar },
            });
            if (error) {
                toast.error('Không thể cập nhật thông tin người dùng');
                return;
            }
            setUser(updatedUser);
            toast.success('Cập nhật thông tin thành công!');
        } catch (error) {
            toast.error('Đã xảy ra lỗi khi cập nhật thông tin');
        }
    }, [supabase.auth]);

    const handleResetPassword = useCallback(async (email: string): Promise<boolean> => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: new URL('/reset-password', window.location.origin).toString(),
            });
            if (error) {
                handleAuthError(error);
                return false;
            }
            toast.success('Đã gửi email khôi phục mật khẩu!');
            return true;
        } catch (error) {
            toast.error('Đã xảy ra lỗi khi gửi email khôi phục');
            return false;
        }
    }, [supabase.auth]);

    const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
        try {
            if (!user?.email) {
                toast.error('Không tìm thấy thông tin người dùng');
                return false;
            }
            if (!currentPassword) {
                toast.error('Vui lòng nhập mật khẩu hiện tại');
                return false;
            }
            const authVerifier = createEphemeralSupabaseClient();
            const { error: signInError } = await authVerifier.auth.signInWithPassword({
                email: user.email,
                password: currentPassword,
            });
            if (signInError) {
                if (signInError.message === 'Invalid login credentials') {
                    toast.error('Mật khẩu hiện tại không đúng');
                } else {
                    handleAuthError(signInError);
                }
                return false;
            }
            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                toast.error('Không thể đổi mật khẩu: ' + updateError.message);
                return false;
            }
            toast.success('Đổi mật khẩu thành công!');
            return true;
        } catch (error) {
            toast.error('Đã xảy ra lỗi khi đổi mật khẩu');
            return false;
        }
    }, [user?.email, supabase]);

    return {
        user,
        session,
        isLoading,
        role,
        adminEmail,
        handleLogin,
        handleRegister,
        handleLogout,
        handleUpdateUser,
        handleResetPassword,
        handleChangePassword,
    };
}

function handleAuthError(error: AuthError) {
    const errorMessages: Record<string, string> = {
        'Invalid login credentials': 'Email hoặc mật khẩu không đúng',
        'Email not confirmed': 'Vui lòng xác nhận email trước khi đăng nhập',
        'User already registered': 'Email này đã được đăng ký',
        'Password should be at least 6 characters': 'Mật khẩu phải có ít nhất 6 ký tự',
        'Unable to validate email address: invalid format': 'Định dạng email không hợp lệ',
        'Email rate limit exceeded': 'Đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau',
    };
    const message = errorMessages[error.message] || error.message;
    toast.error(message);
}
