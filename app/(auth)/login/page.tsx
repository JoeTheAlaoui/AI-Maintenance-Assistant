'use client'

import { useActionState, useState, useEffect } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, Loader2, Eye, EyeOff, Zap, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'

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
            toast.error('Échec de la connexion', {
                description: state.error,
            })
        }
    }, [state])

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
    }

    return (
        <div className="min-h-screen flex">
            {/* Left side - Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 bg-background">
                <div className="max-w-md w-full mx-auto space-y-8">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <Wrench className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-bold text-xl">OpenGMAO</span>
                    </div>

                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold">Bon retour ! 👋</h1>
                        <p className="text-muted-foreground">
                            Connectez-vous pour accéder à votre espace de maintenance
                        </p>
                    </div>

                    {/* Social Login */}
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full h-12"
                            onClick={() => handleSocialLogin('google')}
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continuer avec Google
                        </Button>

                        <Button
                            variant="outline"
                            className="w-full h-12"
                            onClick={() => handleSocialLogin('github')}
                        >
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                            </svg>
                            Continuer avec GitHub
                        </Button>
                    </div>

                    <div className="flex items-center gap-4">
                        <Separator className="flex-1" />
                        <span className="text-sm text-muted-foreground">ou</span>
                        <Separator className="flex-1" />
                    </div>

                    {/* Email Form */}
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="nom@example.com"
                                    className="pl-10 h-12"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Mot de passe</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-sm text-primary hover:underline"
                                >
                                    Mot de passe oublié ?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10 h-12"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            disabled={isPending}
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connexion...
                                </>
                            ) : (
                                'Se connecter'
                            )}
                        </Button>
                    </form>

                    {/* Sign up link */}
                    <p className="text-center text-muted-foreground">
                        Pas encore de compte ?{' '}
                        <Link href="/signup" className="text-primary font-semibold hover:underline">
                            Créer un compte
                        </Link>
                    </p>
                </div>
            </div>

            {/* Right side - Branding (hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
                {/* Pattern overlay */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-16 text-white">
                    <div className="space-y-8">
                        <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                            <Zap className="h-10 w-10" />
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-4xl font-bold leading-tight">
                                Maintenance industrielle<br />
                                simplifiée avec l'IA
                            </h2>
                            <p className="text-lg text-white/80 max-w-md">
                                Importez vos manuels PDF et posez des questions en langue naturelle.
                                L'assistant IA vous guide pas à pas.
                            </p>
                        </div>

                        {/* Features */}
                        <div className="space-y-4">
                            {['Import automatique de manuels PDF', 'Assistant IA en français et darija', 'Scan QR pour accès rapide'].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span>{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Decorative elements */}
                <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute top-20 -right-10 w-40 h-40 bg-purple-400/20 rounded-full blur-2xl" />
            </div>
        </div>
    )
}
