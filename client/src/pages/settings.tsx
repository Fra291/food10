import { useState, useEffect } from "react";
import { Settings, User, Bell, Shield, Info, ChevronRight, Moon, Sun, LogOut, Plus, X, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import BottomNavigation from "@/components/BottomNavigation";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [autoDelete, setAutoDelete] = useState(() => {
    const saved = localStorage.getItem('autoDelete');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [customLocations, setCustomLocations] = useState(() => {
    const saved = localStorage.getItem('customLocations');
    return saved ? JSON.parse(saved) : ['Frigorifero', 'Freezer', 'Dispensa', 'Fruttiera', 'Cantina'];
  });
  const [newLocation, setNewLocation] = useState('');

  // Salva le impostazioni in localStorage quando cambiano
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('autoDelete', JSON.stringify(autoDelete));
  }, [autoDelete]);

  useEffect(() => {
    localStorage.setItem('customLocations', JSON.stringify(customLocations));
  }, [customLocations]);

  const addLocation = () => {
    if (newLocation.trim() && !customLocations.includes(newLocation.trim())) {
      setCustomLocations([...customLocations, newLocation.trim()]);
      setNewLocation('');
      toast({
        title: "✅ Spazio aggiunto",
        description: `"${newLocation.trim()}" è stato aggiunto agli spazi di conservazione`
      });
    }
  };

  const removeLocation = (location: string) => {
    setCustomLocations(customLocations.filter((loc: string) => loc !== location));
    toast({
      title: "🗑️ Spazio rimosso", 
      description: `"${location}" è stato rimosso dagli spazi di conservazione`
    });
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Disconnesso",
        description: "Sei stato disconnesso con successo",
      });
      // Reindirizza alla pagina di login dopo il logout
      setLocation("/");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la disconnessione",
        variant: "destructive",
      });
    }
  };

  const settingsGroups = [
    {
      title: "Account",
      items: [
        {
          icon: User,
          label: "Profilo Utente",
          description: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).email || 'Utente' : "Caricamento...",
          action: "chevron"
        },
        {
          icon: LogOut,
          label: "Disconnetti",
          description: "Esci dal tuo account",
          action: "button",
          onClick: handleLogout
        }
      ]
    },
    {
      title: "Notifiche",
      items: [
        {
          icon: Bell,
          label: "Notifiche Scadenza",
          description: "Ricevi avvisi per alimenti in scadenza",
          action: "switch",
          value: notifications,
          onChange: setNotifications
        }
      ]
    },
    {
      title: "Preferenze",
      items: [
        {
          icon: darkMode ? Moon : Sun,
          label: "Tema Scuro",
          description: "Attiva il tema scuro dell'app",
          action: "switch",
          value: darkMode,
          onChange: setDarkMode
        },
        {
          icon: Shield,
          label: "Eliminazione Automatica",
          description: "Elimina automaticamente alimenti scaduti da 7 giorni",
          action: "switch",
          value: autoDelete,
          onChange: setAutoDelete
        }
      ]
    },
    {
      title: "Spazi di Conservazione",
      items: [
        {
          icon: MapPin,
          label: "Personalizza Spazi",
          description: "Aggiungi o rimuovi spazi di conservazione",
          action: "custom"
        }
      ]
    },
    {
      title: "Informazioni",
      items: [
        {
          icon: Info,
          label: "Informazioni App",
          description: "Versione 1.0.0",
          action: "chevron"
        }
      ]
    }
  ];

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header safe-area-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="bg-primary p-2 rounded-xl">
              <Settings className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Impostazioni</h1>
              <p className="text-xs text-muted-foreground">Personalizza la tua esperienza</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-content safe-area-bottom">
        <div className="px-4 py-4 space-y-6">
          {settingsGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {group.title}
              </h2>
              
              <Card className="mobile-card">
                <CardContent className="p-0">
                  {group.items.map((item, itemIndex) => {
                    const Icon = item.icon;
                    const isLast = itemIndex === group.items.length - 1;
                    
                    return (
                      <div
                        key={itemIndex}
                        className={`flex items-center justify-between p-4 ${
                          !isLast ? 'border-b border-border' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          {item.action === "switch" && "value" in item && "onChange" in item && (
                            <Switch
                              checked={item.value}
                              onCheckedChange={item.onChange}
                            />
                          )}
                          
                          {item.action === "chevron" && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}

                          {item.action === "custom" && (
                            <div className="w-full">
                              {/* Spazi di conservazione personalizzati */}
                              <div className="space-y-3 mt-4">
                                {/* Aggiungi nuovo spazio */}
                                <div className="flex space-x-2">
                                  <Input
                                    placeholder="Nuovo spazio di conservazione"
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                                    className="flex-1"
                                  />
                                  <Button onClick={addLocation} size="sm" disabled={!newLocation.trim()}>
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Lista spazi esistenti */}
                                <div className="space-y-2">
                                  {customLocations.map((location: string, index: number) => (
                                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                                      <span className="text-sm font-medium">{location}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeLocation(location)}
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {item.action === "button" && "onClick" in item && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={item.onClick}
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              Disconnetti
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}

          {/* App Info */}
          <div className="text-center space-y-2 py-8">
            <div className="bg-primary p-3 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Settings className="text-primary-foreground h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">FoodTracker</h3>
            <p className="text-sm text-muted-foreground">
              La tua dispensa smart per evitare sprechi alimentari
            </p>
            <p className="text-xs text-muted-foreground">
              Versione 1.0.0 • Made with ❤️
            </p>
          </div>

          <div className="pb-20"></div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}