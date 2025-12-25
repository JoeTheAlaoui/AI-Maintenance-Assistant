'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import {
    User as UserIcon,
    Building,
    Globe,
    Save,
    Camera,
    Trash2,
    Shield,
    Loader2,
    Check,
    Moon,
    Sun,
    LogOut
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

interface UserProfile {
    full_name: string
    email: string
    phone: string
    organization: string
    site: string
    language: string
    avatar_url: string | null
}

export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [profile, setProfile] = useState<UserProfile>({
        full_name: '',
        email: '',
        phone: '',
        organization: '',
        site: '',
        language: 'fr',
        avatar_url: null
    })

    const { theme, setTheme } = useTheme()
    const router = useRouter()
    const supabase = createClient()

    // Fetch user data on mount
    useEffect(() => {
        async function fetchUser() {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (user) {
                    // Get user metadata
                    const metadata = user.user_metadata || {}
                    setProfile({
                        full_name: metadata.full_name || metadata.name || '',
                        email: user.email || '',
                        phone: metadata.phone || '',
                        organization: metadata.organization || '',
                        site: metadata.site || '',
                        language: metadata.language || 'fr',
                        avatar_url: metadata.avatar_url || null
                    })
                }
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUser()
    }, [supabase])

    // Get initials for avatar
    const getInitials = (name: string) => {
        if (!name) return 'U'
        const parts = name.split(' ')
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        }
        return name.substring(0, 2).toUpperCase()
    }

    // Handle profile save
    const handleSave = async () => {
        if (!user) return

        setSaving(true)
        setSaved(false)

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: profile.full_name,
                    phone: profile.phone,
                    organization: profile.organization,
                    site: profile.site,
                    language: profile.language,
                }
            })

            if (error) throw error

            setSaved(true)
            toast.success('Paramètres enregistrés')

            // Reset saved state after 2s
            setTimeout(() => setSaved(false), 2000)
        } catch (error: any) {
            console.error('Save error:', error)
            toast.error(error.message || 'Erreur lors de la sauvegarde')
        } finally {
            setSaving(false)
        }
    }

    // Handle sign out
    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Handle account deletion
    const handleDeleteAccount = async () => {
        // Note: This requires admin privileges or a backend function
        toast.error('Contactez l\'administrateur pour supprimer votre compte')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Paramètres</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Gérez votre profil et vos préférences</p>
            </div>

            {/* Profile Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <UserIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <CardTitle>Profil</CardTitle>
                    </div>
                    <CardDescription>
                        Vos informations personnelles
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20 border-4 border-gray-100 dark:border-gray-800">
                            {profile.avatar_url ? (
                                <AvatarImage src={profile.avatar_url} />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                                {getInitials(profile.full_name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" disabled>
                                <Camera className="mr-2 h-4 w-4" />
                                Changer la photo
                            </Button>
                            <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG • Max 2 MB</p>
                        </div>
                    </div>

                    <Separator />

                    {/* Form fields */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nom complet</Label>
                            <Input
                                id="name"
                                value={profile.full_name}
                                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                placeholder="Votre nom"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={profile.email}
                                disabled
                                className="bg-gray-50 dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500">L'email ne peut pas être modifié</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Téléphone</Label>
                            <Input
                                id="phone"
                                value={profile.phone}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                placeholder="+212..."
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Organization Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <CardTitle>Organisation</CardTitle>
                    </div>
                    <CardDescription>
                        Informations sur votre établissement
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="org-name">Nom de l'organisation</Label>
                            <Input
                                id="org-name"
                                value={profile.organization}
                                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                                placeholder="Ex: OFPPT"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="org-site">Site / Établissement</Label>
                            <Input
                                id="org-site"
                                value={profile.site}
                                onChange={(e) => setProfile({ ...profile, site: e.target.value })}
                                placeholder="Ex: Centre Hay Salam"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Preferences Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <CardTitle>Préférences</CardTitle>
                    </div>
                    <CardDescription>
                        Langue et apparence
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Language */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Langue</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Langue de l'interface
                            </p>
                        </div>
                        <Select
                            value={profile.language}
                            onValueChange={(value) => setProfile({ ...profile, language: value })}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="fr">🇫🇷 Français</SelectItem>
                                <SelectItem value="en">🇬🇧 English</SelectItem>
                                <SelectItem value="ar">🇲🇦 العربية</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Theme */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Label>Thème sombre</Label>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Activer le mode sombre
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4 text-gray-400" />
                            <Switch
                                checked={theme === 'dark'}
                                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                            />
                            <Moon className="h-4 w-4 text-gray-400" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Session Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <LogOut className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <CardTitle>Session</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
                        <div>
                            <p className="font-medium">Se déconnecter</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Fermer votre session sur cet appareil
                            </p>
                        </div>
                        <Button variant="outline" onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Déconnexion
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200 dark:border-red-900">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-red-500 dark:text-red-400" />
                        <CardTitle className="text-red-600 dark:text-red-400">Zone dangereuse</CardTitle>
                    </div>
                    <CardDescription>
                        Actions irréversibles
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950">
                        <div>
                            <p className="font-medium text-red-700 dark:text-red-400">Supprimer le compte</p>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80">
                                Cette action est irréversible
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Supprimer
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Cette action est irréversible. Toutes vos données seront supprimées définitivement.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteAccount}
                                        className="bg-red-600 hover:bg-red-700"
                                    >
                                        Supprimer mon compte
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            {/* Save Button - Fixed at bottom on mobile */}
            <div className="flex justify-end sticky bottom-4 md:static">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className={`
                        bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700
                        shadow-lg md:shadow-none
                        ${saved ? 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' : ''}
                    `}
                >
                    {saving ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enregistrement...
                        </>
                    ) : saved ? (
                        <>
                            <Check className="mr-2 h-4 w-4" />
                            Enregistré !
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" />
                            Enregistrer les modifications
                        </>
                    )}
                </Button>
            </div>
        </div>
    )
}
