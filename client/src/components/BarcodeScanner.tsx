import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, Loader2, Type } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { InsertFoodItem } from "@shared/schema";
import Quagga from "quagga";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (data: Partial<InsertFoodItem>) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onProductFound }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && !showManualInput) {
      // Avvia automaticamente la scansione quando si apre
      setTimeout(() => {
        startScanning();
      }, 100);
    } else {
      // Ferma la scansione se si passa al manuale o si chiude
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [isOpen, showManualInput]);

  const startScanning = async () => {
    if (!scannerRef.current) return;

    try {
      setIsScanning(true);
      setError(null);

      // Richiedi permessi fotocamera prima su mobile
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        try {
          await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        } catch (permissionError) {
          setError("Permessi fotocamera richiesti. Vai in Impostazioni Chrome > Fotocamera");
          setIsScanning(false);
          setShowManualInput(true);
          return;
        }
      }

      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment"
          }
        },
        locator: {
          patchSize: "large",
          halfSample: false,
          debug: {
            showCanvas: false,
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false,
            boxFromPatches: {
              showTransformed: false,
              showTransformedBox: false,
              showBB: false
            }
          }
        },
        numOfWorkers: 4,
        frequency: 10,
        decoder: {
          readers: [
            "ean_reader",
            "ean_8_reader", 
            "code_128_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "i2of5_reader"
          ],
          debug: {
            drawBoundingBox: false,
            showFrequency: false,
            drawScanline: false,
            showPattern: false
          }
        },
        locate: true
      };

      await new Promise((resolve, reject) => {
        Quagga.init(config, (err) => {
          if (err) {
            console.error("Errore inizializzazione Quagga:", err);
            reject(err);
            return;
          }
          resolve(null);
        });
      });

      Quagga.onDetected(handleBarcodeDetected);
      Quagga.start();

    } catch (err: any) {
      console.error("Errore durante l'avvio della scansione:", err);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        setError("iPhone: Vai in Impostazioni Chrome > Siti web > Fotocamera e abilita l'accesso");
      } else {
        setError("Impossibile accedere alla fotocamera. Verifica i permessi.");
      }
      setIsScanning(false);
      setShowManualInput(true); // Mostra automaticamente l'input manuale
    }
  };

  const stopScanning = () => {
    if (isScanning) {
      try {
        Quagga.stop();
        Quagga.offDetected(handleBarcodeDetected);
        
        // Forza lo stop di tutti i track video
        if (scannerRef.current) {
          const video = scannerRef.current.querySelector('video');
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              track.stop();
            });
          }
        }
      } catch (err) {
        console.log("Errore durante lo stop della scansione:", err);
      }
      setIsScanning(false);
    }
  };

  const handleBarcodeDetected = (result: any) => {
    const barcode = result.codeResult.code;
    console.log("Codice a barre rilevato:", barcode);
    
    // Feedback per l'utente
    if (navigator.vibrate) {
      navigator.vibrate(200); // Vibrazione su dispositivi che la supportano
    }
    
    // Ferma immediatamente la scansione e la telecamera
    stopScanning();
    fetchProductInfo(barcode);
  };

  const fetchProductInfo = async (barcode: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await response.json();

      if (data.status === 1 && data.product) {
        const product = data.product;
        
        // Estrai informazioni rilevanti
        const productData: Partial<InsertFoodItem> = {
          name: product.product_name || product.product_name_it || `Prodotto ${barcode}`,
          category: mapCategory(product.categories_tags || []),
          daysToExpiry: estimateShelfLife(product.categories_tags || []),
          quantity: product.quantity || "",
          preparationDate: new Date().toISOString().split('T')[0]
        };

        console.log("Informazioni prodotto trovate:", productData);
        onProductFound(productData);
        onClose();
      } else {
        // Prodotto non trovato, crea entry base
        const basicProduct: Partial<InsertFoodItem> = {
          name: `Prodotto ${barcode}`,
          category: "Altro",
          daysToExpiry: 7,
          preparationDate: new Date().toISOString().split('T')[0]
        };
        
        onProductFound(basicProduct);
        onClose();
      }
    } catch (err) {
      console.error("Errore nel recupero informazioni prodotto:", err);
      setError("Impossibile recuperare informazioni sul prodotto");
    } finally {
      setIsLoading(false);
    }
  };

  const mapCategory = (categories: string[]): string => {
    // Mappa le categorie di Open Food Facts alle nostre categorie
    const categoryMap: Record<string, string> = {
      'en:beverages': 'Bevande',
      'en:dairy': 'Latticini',
      'en:meat': 'Carne',
      'en:fish': 'Pesce',
      'en:fruits': 'Frutta',
      'en:vegetables': 'Verdura',
      'en:cereals': 'Cereali',
      'en:pasta': 'Pasta e Riso',
      'en:bread': 'Pane e Lievitati',
      'en:snacks': 'Snack',
      'en:desserts': 'Dolci',
      'en:frozen-foods': 'Surgelati'
    };

    for (const category of categories) {
      if (categoryMap[category]) {
        return categoryMap[category];
      }
    }
    
    return "Altro";
  };

  const estimateShelfLife = (categories: string[]): number => {
    // Stima la durata di conservazione basata sulla categoria
    const shelfLifeMap: Record<string, number> = {
      'en:dairy': 7,        // Latticini: 7 giorni
      'en:meat': 3,         // Carne: 3 giorni
      'en:fish': 2,         // Pesce: 2 giorni
      'en:fruits': 7,       // Frutta: 7 giorni
      'en:vegetables': 10,  // Verdura: 10 giorni
      'en:bread': 5,        // Pane: 5 giorni
      'en:pasta': 365,      // Pasta secca: 1 anno
      'en:cereals': 180,    // Cereali: 6 mesi
      'en:canned': 730,     // Conserve: 2 anni
      'en:frozen-foods': 90 // Surgelati: 3 mesi
    };

    for (const category of categories) {
      if (shelfLifeMap[category]) {
        return shelfLifeMap[category];
      }
    }
    
    return 7; // Default 7 giorni
  };

  const handleManualSubmit = async () => {
    if (manualBarcode.trim()) {
      await fetchProductInfo(manualBarcode.trim());
      setManualBarcode("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center">Scanner Codice a Barre</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!showManualInput ? (
            <>
              <div className="text-center text-sm text-muted-foreground space-y-1">
                <div>Inquadra il codice a barre del prodotto con la fotocamera</div>
                <div className="text-xs text-blue-600">
                  💡 Tieni il telefono fermo e assicurati che ci sia buona luce
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="relative">
                <div 
                  ref={scannerRef}
                  className="w-full h-48 bg-black rounded-lg overflow-hidden relative mx-auto max-w-sm"
                >
                  {!isScanning && !isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-12 w-12 text-white/50" />
                    </div>
                  )}
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                      <div className="text-white text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <div className="text-sm">Cercando prodotto...</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {isScanning && (
                  <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-1 bg-red-500 shadow-lg"></div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={() => setShowManualInput(true)} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                >
                  <Type className="h-3 w-3 mr-1" />
                  Inserisci manualmente
                </Button>
                <Button 
                  onClick={onClose} 
                  variant="outline" 
                  size="sm"
                  className="flex-1"
                  disabled={isLoading}
                >
                  <X className="h-3 w-3 mr-1" />
                  Annulla
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center text-sm text-muted-foreground">
                Inserisci il codice a barre manualmente
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="manual-barcode" className="text-sm font-medium">
                    Codice a barre (EAN/UPC)
                  </Label>
                  <Input
                    id="manual-barcode"
                    type="text"
                    placeholder="es. 8001234567890"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleManualSubmit()}
                    className="mt-1"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={() => setShowManualInput(false)} 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Torna alla fotocamera
                  </Button>
                  <Button 
                    onClick={handleManualSubmit} 
                    disabled={!manualBarcode.trim() || isLoading}
                    size="sm"
                    className="flex-1"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Camera className="h-3 w-3 mr-1" />
                    )}
                    {isLoading ? "Cercando..." : "Cerca"}
                  </Button>
                </div>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center">
            {!showManualInput 
              ? "Assicurati che il codice a barre sia ben illuminato e dentro l'area di scansione"
              : "Il codice a barre si trova solitamente sul retro della confezione ed è composto da 8-13 cifre"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}