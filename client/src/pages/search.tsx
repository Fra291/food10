import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Calendar, MapPin, Package, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { type FoodItem } from "@shared/schema";
import BottomNavigation from "@/components/BottomNavigation";

function getStatus(expiryDate: string) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysDiff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) return 'expired';
  if (daysDiff <= 3) return 'expiring';
  return 'fresh';
}

function getStatusBadge(status: string, daysDiff: number) {
  switch (status) {
    case 'expired':
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs">
          <AlertTriangle className="h-3 w-3" />
          Scaduto
        </Badge>
      );
    case 'expiring':
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          In Scadenza
        </Badge>
      );
    case 'fresh':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1 text-xs">
          <CheckCircle className="h-3 w-3" />
          Fresco
        </Badge>
      );
    default:
      return null;
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('it-IT');
}

function getDaysUntilExpiry(expiryDate: string) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const daysDiff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff < 0) {
    return `Scaduto da ${Math.abs(daysDiff)} giorn${Math.abs(daysDiff) === 1 ? 'o' : 'i'}`;
  } else if (daysDiff === 0) {
    return 'Scade oggi';
  } else if (daysDiff <= 3) {
    return `Tra ${daysDiff} giorn${daysDiff === 1 ? 'o' : 'i'}`;
  } else {
    return `Tra ${daysDiff} giorni`;
  }
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch food items with search parameters
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ['/api/food-items', searchQuery, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const url = `/api/food-items${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      return response.json();
    },
  });

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-xl">
              <Search className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Cerca Alimenti</h1>
              <p className="text-xs text-muted-foreground">Trova quello che cerchi</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-content safe-area-bottom">
        <div className="px-4 py-4 space-y-4">
          {/* Search Section */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cerca per nome, categoria o posizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full border-muted bg-background"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="expired">Scaduti</SelectItem>
                  <SelectItem value="expiring">In Scadenza</SelectItem>
                  <SelectItem value="fresh">Freschi</SelectItem>
                </SelectContent>
              </Select>
              
              <p className="text-sm text-muted-foreground">
                {foodItems.length} risultat{foodItems.length !== 1 ? 'i' : 'o'}
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-3 pb-20">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Ricerca in corso...</p>
              </div>
            ) : foodItems.length === 0 ? (
              <div className="text-center py-12">
                <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">Nessun risultato trovato</p>
                <p className="text-sm text-muted-foreground">
                  Prova a modificare i termini di ricerca
                </p>
              </div>
            ) : (
              foodItems.map((item) => {
                const status = getStatus(item.expiryDate);
                const daysDiff = Math.ceil((new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                
                return (
                  <Card key={item.id} className="mobile-card">
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-foreground truncate">{item.name}</h3>
                            {getStatusBadge(status, daysDiff)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{item.category || "Senza categoria"}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(item.expiryDate)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Package className="h-3 w-3" />
                              <span>{item.quantity}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">{item.location}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getDaysUntilExpiry(item.expiryDate)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}