'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
    assetId: string;
    assetName: string;
    className?: string;
}

export function QRCodeGenerator({ assetId, assetName, className }: QRCodeGeneratorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');

    useEffect(() => {
        generateQRCode();
    }, [assetId]);

    const generateQRCode = async () => {
        if (!canvasRef.current) return;

        try {
            // Generate QR code URL (production: use your domain)
            const qrUrl = `${window.location.origin}/assistant?asset=${assetId}`;

            // Generate QR code
            await QRCode.toCanvas(canvasRef.current, qrUrl, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            });

            // Get data URL for download
            const dataUrl = canvasRef.current.toDataURL('image/png');
            setQrDataUrl(dataUrl);

        } catch (error) {
            console.error('QR Code generation error:', error);
        }
    };

    const downloadQRCode = () => {
        const link = document.createElement('a');
        link.download = `QR-${assetName.replace(/\s+/g, '-')}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    const printQRCode = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${assetName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 2px solid #000;
            }
            h1 { font-size: 24px; margin-bottom: 10px; }
            p { font-size: 14px; color: #666; }
            img { margin: 20px 0; }
            @media print {
              @page { margin: 1cm; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${assetName}</h1>
            <p>Asset ID: ${assetId}</p>
            <img src="${qrDataUrl}" alt="QR Code" />
            <p>Scan with OpenGMAO app</p>
          </div>
        </body>
      </html>
    `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className={className}>
            <div className="flex flex-col items-center gap-4">
                <canvas ref={canvasRef} className="border-2 border-gray-200 rounded-lg" />

                <p className="text-sm text-gray-600 text-center">
                    Scannez pour accéder rapidement
                </p>

                <div className="flex gap-2">
                    <Button
                        onClick={downloadQRCode}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Télécharger
                    </Button>

                    <Button
                        onClick={printQRCode}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                    >
                        <Printer className="h-4 w-4" />
                        Imprimer
                    </Button>
                </div>
            </div>
        </div>
    );
}
