'use client'

import { useActionState, useState, useEffect } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Mail, Loader2, Eye, EyeOff, Zap, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface LoginState {
    error: string
}

const initialState: LoginState = {
    error: '',
}

export default function LoginPage() {
    const [state, formAction, isPending] = useActionState(async (prevState: LoginState, formData: FormData) => {
        const result = await login(formData);
        if (result?.error) {
            return { error: result.error };
        }
        return { error: '' };
    }, initialState);

    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        if (state?.error) {
            toast.error('Login Failed', {
                description: state.error,
            })
        }
    }, [state])

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50" />
            <div className="absolute inset-0 bg-grid opacity-30" />

            {/* Floating Orbs */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-float-delayed" />

            <div className="relative z-10 w-full max-w-md space-y-8">
                {/* Logo */}
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl shadow-blue-500/30 mb-4">
                        <Zap className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">OpenGMAO</h1>
                    <p className="text-muted-foreground mt-1">AI Maintenance Assistant</p>
                </div>

                {/* Login Card */}
                <Card className="border-2 shadow-2xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-2xl">Welcome Back</CardTitle>
                        <CardDescription>
                            Sign in to access your maintenance dashboard
                        </CardDescription>
                    </CardHeader>

                    <form action={formAction}>
                        <CardContent className="space-y-5">
                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="youssef@ofppt.ma"
                                        required
                                        className="pl-10 h-12 text-base border-2 rounded-xl"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        href="#"
                                        className="text-xs text-primary hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        required
                                        className="pl-10 pr-10 h-12 text-base border-2 rounded-xl"
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <Button
                                className="w-full h-12 text-base btn-gradient rounded-xl"
                                type="submit"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </form>

                    {/* Divider */}
                    <div className="px-6 pb-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white px-2 text-muted-foreground">or</span>
                            </div>
                        </div>

                        {/* Sign Up Link */}
                        <p className="text-center text-sm mt-6 text-muted-foreground">
                            Don't have an account?{' '}
                            <Link href="/signup" className="text-primary font-semibold hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </Card>

                {/* Footer */}
                <p className="text-center text-xs text-muted-foreground">
                    By signing in, you agree to our{' '}
                    <Link href="/legal/terms" className="text-primary hover:underline">
                        Terms
                    </Link>
                    {' '}and{' '}
                    <Link href="/legal/privacy" className="text-primary hover:underline">
                        Privacy Policy
                    </Link>
                </p>
            </div>
        </div>
    )
}
