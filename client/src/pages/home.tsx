import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, Package, Edit, Trash2, QrCode } from "lucide-react";
import type { FoodItem, InsertFoodItem, UpdateFoodItem } from "@shared/schema";
import BottomNavigation from "@/components/BottomNavigation";
import BarcodeScanner from "@/components/BarcodeScanner";
import { insertFoodItemSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
// import { notificationManager } from "@/utils/notifications";
import QRCode from "qrcode";

function getStatus(preparationDate: string, daysToExpiry: number) {
  const prepDate = new Date(preparationDate);
  const today = new Date();
  const daysDiff = Math.ceil((today.getTime() - prepDate.getTime()) / (1000 * 3600 * 24));
  
  if (daysDiff >= daysToExpiry) return 'expired';
  if (daysDiff >= daysToExpiry - 2) return 'expiring';
  return 'fresh';
}

function getStatusBadge(status: string, daysDiff: number) {
  if (status === 'expired') {
    return <Badge variant="destructive" className="text-xs">🚫 SCADUTO da {daysDiff} giorni</Badge>;
  }
  if (status === 'expiring') {
    return <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">⚠️ Scade tra {daysDiff} giorni</Badge>;
  }
  return <Badge variant="outline" className="text-xs border-green-300 text-green-700">✅ Fresco ({daysDiff} giorni rimanenti)</Badge>;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT');
}

function getDaysUntilExpiry(preparationDate: string, daysToExpiry: number) {
  const prepDate = new Date(preparationDate);
  const today = new Date();
  const daysPassed = Math.ceil((today.getTime() - prepDate.getTime()) / (1000 * 3600 * 24));
  return daysToExpiry - daysPassed;
}

function getCategoryIcon(category: string) {
  const icons = {
    'Verdure': '🥬',
    'Frutta': '🍎',
    'Carne': '🥩',
    'Pesce': '🐟',
    'Latticini': '🧀',
    'Cereali': '🌾',
    'Legumi': '🫘',
    'Bevande': '🥤',
    'Dolci': '🍰',
    'Condimenti': '🧂',
    'Surgelati': '🧊',
    'Altro': '📦'
  };
  return icons[category as keyof typeof icons] || '📦';
}

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [qrCodeModalOpen, setQrCodeModalOpen] = useState(false);
  const [selectedItemForQr, setSelectedItemForQr] = useState<FoodItem | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ['/api/food-items'],
  });

  const { data: stats = { expired: 0, expiring: 0, fresh: 0 } } = useQuery({
    queryKey: ['/api/food-items/stats'],
  });

  const form = useForm<InsertFoodItem>({
    resolver: zodResolver(insertFoodItemSchema),
    defaultValues: {
      name: "",
      category: "",
      preparationDate: new Date().toISOString().split('T')[0],
      daysToExpiry: 7,
      location: "Frigorifero",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertFoodItem) => {
      const response = await fetch('/api/food-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-items/stats'] });
      setIsAddModalOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "✅ Alimento aggiunto!",
        description: "L'alimento è stato aggiunto alla tua dispensa.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateFoodItem }) => {
      const response = await apiRequest('PUT', `/api/food-items/${id}`, data);
      if (!response.ok) {
        throw new Error('Failed to update item');
      }
      return response.json();
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "❌ Errore nell'aggiornamento",
        description: "Non è stato possibile salvare le modifiche. Riprova.",
        variant: "destructive"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-items/stats'] });
      setIsAddModalOpen(false);
      setEditingItem(null);
      form.reset();
      toast({
        title: "✅ Alimento aggiornato!",
        description: "Le modifiche sono state salvate.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/food-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/food-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-items/stats'] });
      toast({
        title: "🗑️ Alimento rimosso",
        description: "L'alimento è stato rimosso dalla dispensa.",
      });
    },
  });

  const handleSubmit = (data: InsertFoodItem) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data });
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEdit = (item: FoodItem) => {
    setEditingItem(item);
    form.reset({
      name: item.name,
      category: item.category || "",
      preparationDate: item.preparationDate,
      daysToExpiry: item.daysToExpiry,
      location: item.location || "Frigorifero",
    });
    setIsAddModalOpen(true);
  };

  const handleVoiceData = (data: Partial<InsertFoodItem>) => {
    if (data.name) {
      form.setValue('name', data.name);
    }
    if (data.category) {
      form.setValue('category', data.category);
    }
    if (data.daysToExpiry) {
      form.setValue('daysToExpiry', data.daysToExpiry);
    }
    if (data.location) {
      form.setValue('location', data.location);
    }
    setIsAddModalOpen(true);
  };

  const handleAutoSubmit = (data: Partial<InsertFoodItem>) => {
    if (data && data.name) {
      const fullData: InsertFoodItem = {
        name: data.name,
        category: data.category || 'Altro',
        preparationDate: new Date().toISOString().split('T')[0],
        daysToExpiry: data.daysToExpiry || 7,
        location: data.location || 'Frigorifero',
      };
      addMutation.mutate(fullData);
    }
  };

  const handleBarcodeData = (data: Partial<InsertFoodItem>) => {
    if (data.name) {
      form.setValue('name', data.name);
    }
    if (data.category) {
      form.setValue('category', data.category);
    }
    if (data.daysToExpiry) {
      form.setValue('daysToExpiry', data.daysToExpiry);
    }
    setIsAddModalOpen(true);
  };

  const handleQrCodeGeneration = async (item: FoodItem) => {
    setSelectedItemForQr(item);
    setQrCodeModalOpen(true);
  };

  // useEffect(() => {
  //   notificationManager.requestPermission();
  //   if (foodItems.length > 0) {
  //     notificationManager.checkExpiringFoods(foodItems);
  //   }
  // }, [foodItems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 md:px-6 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-gradient-to-br from-primary via-primary to-blue-600 p-2 md:p-3 rounded-xl md:rounded-2xl shadow-lg">
                <Package className="h-4 w-4 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg md:text-2xl font-bold tracking-tight text-foreground">FoodTracker</h1>
                <p className="text-xs md:text-sm text-muted-foreground font-medium hidden sm:block">La tua dispensa intelligente</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setQrCodeModalOpen(true)}
                className="h-8 w-8 md:h-11 md:w-11 rounded-full bg-muted/50 hover:bg-muted/80 transition-all duration-200 backdrop-blur-sm"
              >
                <QrCode className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xs md:text-sm font-semibold">MR</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-6 py-4 md:py-6 pb-10 md:pb-16 space-y-4 md:space-y-6">
        {/* Stats Overview */}
        <div className="flex gap-3 mb-6 overflow-x-auto px-1">
          <Card className="flex-shrink-0 min-w-[100px] md:min-w-[120px] bg-gradient-to-br from-red-50 to-red-100/50 border-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-600">Scaduti</p>
                  <p className="text-xl md:text-2xl font-bold text-red-700">{(stats as any)?.expired || 0}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-shrink-0 min-w-[100px] md:min-w-[120px] bg-gradient-to-br from-orange-50 to-orange-100/50 border-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-orange-600">In scadenza</p>
                  <p className="text-xl md:text-2xl font-bold text-orange-700">{(stats as any)?.expiring || 0}</p>
                </div>
                <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-shrink-0 min-w-[100px] md:min-w-[120px] bg-gradient-to-br from-green-50 to-green-100/50 border-0">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-green-600">Freschi</p>
                  <p className="text-xl md:text-2xl font-bold text-green-700">{(stats as any)?.fresh || 0}</p>
                </div>
                <Package className="h-6 w-6 md:h-8 md:w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Food Items Grid */}
        {foodItems.length === 0 ? (
          <Card className="p-8 text-center bg-gradient-to-br from-muted/50 to-muted/20 border-dashed">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Nessun alimento presente</h3>
                <p className="text-muted-foreground">Aggiungi il tuo primo alimento per iniziare a tracciare la tua dispensa</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {foodItems.map((item) => {
              const status = getStatus(item.preparationDate, item.daysToExpiry);
              const daysRemaining = getDaysUntilExpiry(item.preparationDate, item.daysToExpiry);
              
              return (
                <Card key={item.id} className="hover:shadow-lg transition-all duration-200 border-0 bg-white/50 backdrop-blur-sm">
                  <CardContent className="p-3 md:p-4">
                    <div className="space-y-2 md:space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <span className="text-lg md:text-xl flex-shrink-0">{getCategoryIcon(item.category || 'Altro')}</span>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm md:text-base text-foreground truncate">{item.name}</h3>
                            <p className="text-xs text-muted-foreground font-medium">{item.category || 'Altro'}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleQrCodeGeneration(item)}
                            className="h-7 w-7 rounded-lg hover:bg-muted/50"
                          >
                            <QrCode className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(item)}
                            className="h-7 w-7 rounded-lg hover:bg-muted/50"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 md:space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Preparato:</span>
                          <span className="font-medium">{formatDate(item.preparationDate)}</span>
                        </div>
                        
                        {item.location && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Posizione:</span>
                            <span className="font-medium truncate ml-2">{item.location}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Durata:</span>
                          <span className="font-medium">{item.daysToExpiry} giorni</span>
                        </div>
                        
                        <div className="pt-1">
                          {getStatusBadge(status, Math.abs(daysRemaining))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md mx-4">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Modifica Alimento' : 'Nuovo Alimento'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Latte, Pane, Mela..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Verdure">🥬 Verdure</SelectItem>
                          <SelectItem value="Frutta">🍎 Frutta</SelectItem>
                          <SelectItem value="Carne">🥩 Carne</SelectItem>
                          <SelectItem value="Pesce">🐟 Pesce</SelectItem>
                          <SelectItem value="Latticini">🧀 Latticini</SelectItem>
                          <SelectItem value="Cereali">🌾 Cereali</SelectItem>
                          <SelectItem value="Legumi">🫘 Legumi</SelectItem>
                          <SelectItem value="Bevande">🥤 Bevande</SelectItem>
                          <SelectItem value="Dolci">🍰 Dolci</SelectItem>
                          <SelectItem value="Condimenti">🧂 Condimenti</SelectItem>
                          <SelectItem value="Surgelati">🧊 Surgelati</SelectItem>
                          <SelectItem value="Altro">📦 Altro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="preparationDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data preparazione</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="daysToExpiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giorni di durata</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posizione</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Dove si trova?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Frigorifero">Frigorifero</SelectItem>
                          <SelectItem value="Freezer">Freezer</SelectItem>
                          <SelectItem value="Dispensa">Dispensa</SelectItem>
                          <SelectItem value="Cantina">Cantina</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingItem(null);
                      form.reset();
                    }}
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending || updateMutation.isPending}>
                    {editingItem ? 'Aggiorna' : 'Aggiungi'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </main>

      <BottomNavigation 
        onAddClick={() => setIsAddModalOpen(true)} 
        onScanClick={() => setBarcodeScannerOpen(true)}
        onVoiceData={handleVoiceData}
        onVoiceAutoSubmit={handleAutoSubmit}
      />

      {/* QR Code Modal */}
      <QrCodeModal 
        isOpen={qrCodeModalOpen}
        onClose={() => setQrCodeModalOpen(false)}
        item={selectedItemForQr}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={barcodeScannerOpen}
        onClose={() => setBarcodeScannerOpen(false)}
        onProductFound={handleBarcodeData}
      />
    </div>
  );
}

// QR Code Modal Component
function QrCodeModal({ isOpen, onClose, item }: { 
  isOpen: boolean; 
  onClose: () => void; 
  item: FoodItem | null; 
}) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (item && isOpen) {
      const generateQrCode = async () => {
        try {
          const qrData = `${item.name} - ${item.category} - Scade: ${new Date(
            new Date(item.preparationDate).getTime() + item.daysToExpiry * 24 * 60 * 60 * 1000
          ).toLocaleDateString('it-IT')}`;
          
          const url = await QRCode.toDataURL(qrData, {
            width: 256,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#FFFFFF'
            }
          });
          setQrCodeUrl(url);
        } catch (error) {
          console.error('Errore nella generazione del QR code:', error);
        }
      };

      generateQrCode();
    }
  }, [item, isOpen]);

  const handlePrint = () => {
    if (qrCodeUrl) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${item?.name}</title>
              <style>
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                  font-family: Arial, sans-serif;
                }
                .qr-container {
                  text-align: center;
                  background: white;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .qr-code {
                  margin: 0 auto;
                  display: block;
                }
                @media print {
                  body { margin: 0; padding: 0; }
                  .qr-container { box-shadow: none; }
                }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <img src="${qrCodeUrl}" alt="QR Code" class="qr-code" />
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>QR Code per {item.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt={`QR Code per ${item.name}`}
                className="mx-auto border rounded-lg"
              />
            )}
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Questo QR code contiene le informazioni essenziali dell'alimento
            </p>
            <div className="flex justify-center space-x-2">
              <Button onClick={handlePrint} variant="outline">
                🖨️ Stampa
              </Button>
              <Button onClick={onClose}>
                Chiudi
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}