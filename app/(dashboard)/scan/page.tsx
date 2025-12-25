'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode'
import {
    QrCode,
    CheckCircle,
    Camera,
    CameraOff,
    Package,
    ArrowRight,
    Keyboard,
    Zap,
    Flashlight,
    FlashlightOff,
    AlertCircle,
    RefreshCw,
    X
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type ScannerState = 'loading' | 'scanning' | 'success' | 'error' | 'no-permission'

export default function ScanPage() {
    const [scannerState, setScannerState] = useState<ScannerState>('loading')
    const [errorMessage, setErrorMessage] = useState('')
    const [scannedCode, setScannedCode] = useState('')
    const [showManualEntry, setShowManualEntry] = useState(false)
    const [manualCode, setManualCode] = useState('')
    const [flashlightOn, setFlashlightOn] = useState(false)
    const [hasFlashlight, setHasFlashlight] = useState(false)

    const scannerRef = useRef<Html5Qrcode | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Extract asset ID from QR code content
    const extractAssetId = useCallback((content: string): string | null => {
        // Trim whitespace
        content = content.trim()

        // Check if it's a UUID pattern (simple asset ID)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(content)) {
            return content
        }

        // Check if it's a URL containing an asset ID
        // Format: https://domain.com/assets/[UUID]
        const urlPattern = /\/assets\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
        const urlMatch = content.match(urlPattern)
        if (urlMatch) {
            return urlMatch[1]
        }

        // Check if URL ends with just an ID
        const endingIdPattern = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i
        const endingMatch = content.match(endingIdPattern)
        if (endingMatch) {
            return endingMatch[1]
        }

        return null
    }, [])

    // Handle successful scan
    const handleScanSuccess = useCallback((decodedText: string) => {
        const assetId = extractAssetId(decodedText)

        if (assetId) {
            setScannedCode(assetId)
            setScannerState('success')

            // Stop scanner
            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { })
            }

            // Redirect after short delay for visual feedback
            setTimeout(() => {
                router.push(`/assets/${assetId}`)
            }, 1200)
        } else {
            // Not a valid asset QR code - just store the raw content
            setScannedCode(decodedText)
            setScannerState('success')

            if (scannerRef.current) {
                scannerRef.current.stop().catch(() => { })
            }

            // Search by code
            setTimeout(() => {
                router.push(`/assets?search=${encodeURIComponent(decodedText)}`)
            }, 1200)
        }
    }, [extractAssetId, router])

    // Initialize scanner
    useEffect(() => {
        let mounted = true

        const initScanner = async () => {
            if (!containerRef.current) return

            try {
                const scanner = new Html5Qrcode('qr-reader')
                scannerRef.current = scanner

                const cameras = await Html5Qrcode.getCameras()

                if (cameras.length === 0) {
                    if (mounted) {
                        setScannerState('no-permission')
                        setErrorMessage('Aucune caméra trouvée')
                    }
                    return
                }

                // Prefer back camera
                const backCamera = cameras.find(c =>
                    c.label.toLowerCase().includes('back') ||
                    c.label.toLowerCase().includes('arrière') ||
                    c.label.toLowerCase().includes('environment')
                )
                const cameraId = backCamera?.id || cameras[cameras.length - 1].id

                await scanner.start(
                    cameraId,
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    handleScanSuccess,
                    () => { } // Ignore scan errors (no QR found)
                )

                // Check flashlight availability
                try {
                    const capabilities = scanner.getRunningTrackCapabilities()
                    if (capabilities && 'torch' in capabilities) {
                        setHasFlashlight(true)
                    }
                } catch {
                    // Flashlight not available
                }

                if (mounted) {
                    setScannerState('scanning')
                }
            } catch (err: any) {
                console.error('Scanner init error:', err)
                if (mounted) {
                    if (err.message?.includes('Permission') || err.name === 'NotAllowedError') {
                        setScannerState('no-permission')
                        setErrorMessage('Permission caméra refusée')
                    } else {
                        setScannerState('error')
                        setErrorMessage(err.message || 'Erreur d\'initialisation')
                    }
                }
            }
        }

        initScanner()

        return () => {
            mounted = false
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState()
                    if (state === Html5QrcodeScannerState.SCANNING) {
                        scannerRef.current.stop().catch(() => { })
                    }
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    }, [handleScanSuccess])

    // Toggle flashlight
    const toggleFlashlight = async () => {
        if (!scannerRef.current || !hasFlashlight) return

        try {
            await scannerRef.current.applyVideoConstraints({
                // @ts-ignore - torch is a valid constraint
                advanced: [{ torch: !flashlightOn }]
            })
            setFlashlightOn(!flashlightOn)
        } catch (err) {
            console.error('Flashlight toggle error:', err)
        }
    }

    // Retry camera access
    const retryCamera = () => {
        setScannerState('loading')
        setErrorMessage('')
        window.location.reload()
    }

    // Handle manual submit
    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (manualCode.trim()) {
            const assetId = extractAssetId(manualCode.trim())
            if (assetId) {
                router.push(`/assets/${assetId}`)
            } else {
                router.push(`/assets?search=${encodeURIComponent(manualCode)}`)
            }
        }
    }

    return (
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
            {/* Header */}
            <div className="text-center py-4 shrink-0">
                <Badge className={cn(
                    "gap-1.5 mb-3",
                    scannerState === 'scanning' && "bg-green-500 text-white",
                    scannerState === 'success' && "bg-blue-500 text-white",
                    scannerState === 'error' && "bg-red-500 text-white",
                    scannerState === 'no-permission' && "bg-amber-500 text-white",
                    scannerState === 'loading' && "bg-gray-500 text-white"
                )}>
                    {scannerState === 'scanning' && (
                        <>
                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            Caméra active
                        </>
                    )}
                    {scannerState === 'success' && (
                        <>
                            <CheckCircle className="w-3 h-3" />
                            Code détecté !
                        </>
                    )}
                    {scannerState === 'error' && (
                        <>
                            <AlertCircle className="w-3 h-3" />
                            Erreur
                        </>
                    )}
                    {scannerState === 'no-permission' && (
                        <>
                            <CameraOff className="w-3 h-3" />
                            Permission requise
                        </>
                    )}
                    {scannerState === 'loading' && (
                        <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Initialisation...
                        </>
                    )}
                </Badge>
                <h1 className="text-xl md:text-2xl font-bold">Scanner un QR Code</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Pointez vers le code QR de l'équipement
                </p>
            </div>

            {/* Scanner View */}
            <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4">
                <Card className="overflow-hidden border-2 flex-1 flex flex-col">
                    <CardContent className="p-0 flex-1 relative">
                        {/* QR Reader Container */}
                        <div
                            id="qr-reader"
                            ref={containerRef}
                            className={cn(
                                "w-full h-full min-h-[300px] md:min-h-[400px]",
                                scannerState !== 'scanning' && "hidden"
                            )}
                        />

                        {/* Loading State */}
                        {scannerState === 'loading' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center text-white">
                                    <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-400" />
                                    <p className="text-lg font-medium">Initialisation de la caméra...</p>
                                    <p className="text-sm text-gray-400 mt-1">Veuillez autoriser l'accès</p>
                                </div>
                            </div>
                        )}

                        {/* Success State */}
                        {scannerState === 'success' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-green-500">
                                <div className="text-center text-white">
                                    <CheckCircle className="w-16 h-16 mx-auto mb-4 animate-bounce" />
                                    <h3 className="text-xl font-bold">QR code scanné !</h3>
                                    <p className="text-white/80 mt-1 text-sm">Redirection en cours...</p>
                                    <p className="text-white/60 mt-2 text-xs font-mono truncate max-w-[250px]">
                                        {scannedCode.substring(0, 50)}...
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Error State */}
                        {scannerState === 'error' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center text-white p-6">
                                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                                    <h3 className="text-lg font-bold">Erreur de scanner</h3>
                                    <p className="text-gray-400 mt-2 text-sm">{errorMessage}</p>
                                    <Button onClick={retryCamera} className="mt-4">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Réessayer
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* No Permission State */}
                        {scannerState === 'no-permission' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                                <div className="text-center text-white p-6">
                                    <CameraOff className="w-12 h-12 mx-auto mb-4 text-amber-400" />
                                    <h3 className="text-lg font-bold">Accès caméra refusé</h3>
                                    <p className="text-gray-400 mt-2 text-sm max-w-[280px]">
                                        Autorisez l'accès à la caméra dans les paramètres de votre navigateur pour scanner des QR codes.
                                    </p>
                                    <Button onClick={retryCamera} className="mt-4">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Réessayer
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Flashlight Toggle (when scanning) */}
                        {scannerState === 'scanning' && hasFlashlight && (
                            <Button
                                onClick={toggleFlashlight}
                                size="icon"
                                variant="secondary"
                                className="absolute bottom-4 right-4 z-10 rounded-full w-12 h-12 bg-black/50 hover:bg-black/70 text-white"
                            >
                                {flashlightOn ? (
                                    <FlashlightOff className="h-5 w-5" />
                                ) : (
                                    <Flashlight className="h-5 w-5" />
                                )}
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Manual Entry */}
                <Card className="mt-4 shrink-0">
                    <CardContent className="p-4">
                        {!showManualEntry ? (
                            <button
                                onClick={() => setShowManualEntry(true)}
                                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-2 transition-colors"
                            >
                                <Keyboard className="h-4 w-4" />
                                Entrer le code manuellement
                            </button>
                        ) : (
                            <form onSubmit={handleManualSubmit} className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="ID ou code équipement..."
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        autoFocus
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowManualEntry(false)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <Button type="submit" disabled={!manualCode.trim()} className="w-full">
                                    Rechercher
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Alternative action */}
                <Link href="/assets" className="mt-4 shrink-0">
                    <Button variant="outline" className="w-full">
                        <Package className="mr-2 h-4 w-4" />
                        Parcourir les équipements
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </div>

            {/* Custom styles for html5-qrcode */}
            <style jsx global>{`
                #qr-reader {
                    border: none !important;
                }
                #qr-reader video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 0 !important;
                }
                #qr-reader__scan_region {
                    min-height: 300px !important;
                }
                #qr-reader__dashboard {
                    display: none !important;
                }
                #qr-reader__scan_region > img {
                    display: none !important;
                }
                #qr-reader__header_message {
                    display: none !important;
                }
                #qr-shaded-region {
                    border-width: 50px !important;
                }
            `}</style>
        </div>
    )
}
