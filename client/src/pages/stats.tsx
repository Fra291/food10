import { useQuery } from "@tanstack/react-query";
import { BarChart3, AlertTriangle, Clock, CheckCircle, Package, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type FoodItem } from "@shared/schema";
import BottomNavigation from "@/components/BottomNavigation";

export default function StatsPage() {
  // Fetch food items
  const { data: foodItems = [], isLoading } = useQuery<FoodItem[]>({
    queryKey: ['/api/food-items'],
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['/api/food-items/stats'],
  });

  // Calculate additional stats
  const totalItems = foodItems.length;
  const categoriesCount = new Set(foodItems.map(item => item.category).filter(Boolean)).size;
  const locationsCount = new Set(foodItems.map(item => item.location)).size;

  // Category breakdown
  const categoryStats = foodItems.reduce((acc, item) => {
    const category = item.category || "Senza categoria";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Location breakdown
  const locationStats = foodItems.reduce((acc, item) => {
    const loc = item.location || 'Sconosciuta';
    acc[loc] = (acc[loc] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="app-content flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento statistiche...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-xl">
              <BarChart3 className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Statistiche</h1>
              <p className="text-xs text-muted-foreground">Panoramica della tua dispensa</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-content safe-area-bottom">
        <div className="px-4 py-4 space-y-4">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="mobile-card">
              <CardContent className="p-4 text-center">
                <Package className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Alimenti totali</p>
              </CardContent>
            </Card>
            
            <Card className="mobile-card">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{categoriesCount}</p>
                <p className="text-xs text-muted-foreground">Categorie</p>
              </CardContent>
            </Card>
          </div>

          {/* Status Stats */}
          <Card className="mobile-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Stato Scadenze
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Scaduti</span>
                </div>
                <span className="text-lg font-bold text-red-600">{(stats as any)?.expired || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium">In Scadenza</span>
                </div>
                <span className="text-lg font-bold text-orange-600">{(stats as any)?.expiring || 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Freschi</span>
                </div>
                <span className="text-lg font-bold text-green-600">{(stats as any)?.fresh || 0}</span>
              </div>
            </CardContent>
          </Card>

          {/* Category Stats */}
          {Object.keys(categoryStats).length > 0 && (
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alimenti per Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(categoryStats)
                  .sort(([,a], [,b]) => b - a)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">{category}</span>
                      <span className="text-sm font-medium text-primary">{count}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Location Stats */}
          {Object.keys(locationStats).length > 0 && (
            <Card className="mobile-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alimenti per Posizione</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(locationStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5) // Show top 5 locations
                  .map(([location, count]) => (
                    <div key={location} className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground truncate flex-1">{location}</span>
                      <span className="text-sm font-medium text-primary ml-2">{count}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
          )}

          {/* Empty state */}
          {totalItems === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">Nessuna statistica disponibile</p>
              <p className="text-sm text-muted-foreground">
                Aggiungi degli alimenti per vedere le statistiche
              </p>
            </div>
          )}

          <div className="pb-20"></div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}