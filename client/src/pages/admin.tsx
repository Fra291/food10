import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, Package, Settings, Shield, Edit, Save, X } from "lucide-react";
import { User } from "@shared/schema";

export default function AdminPage() {
  const [adminPassword, setAdminPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editMaxProducts, setEditMaxProducts] = useState<number>(50);
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check admin authentication
  const checkAdminAuth = () => {
    if (adminPassword === "foodtracker2025") {
      setIsAuthenticated(true);
      toast({ description: "Accesso admin autorizzato!" });
    } else {
      toast({ 
        description: "Password admin non corretta",
        variant: "destructive"
      });
    }
  };

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAuthenticated,
  });

  // Fetch admin stats
  const { data: adminStats } = useQuery({
    queryKey: ['/api/admin/stats'],
    enabled: isAuthenticated,
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, maxProducts, isActive }: { 
      userId: string; 
      maxProducts: number; 
      isActive: boolean;
    }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${userId}`, {
        maxProducts,
        isActive: isActive ? 1 : 0
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ description: "Utente aggiornato con successo!" });
      setEditingUser(null);
    },
    onError: () => {
      toast({ 
        description: "Errore durante l'aggiornamento dell'utente",
        variant: "destructive"
      });
    }
  });

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditMaxProducts(user.maxProducts || 50);
    setEditIsActive(user.isActive === 1);
  };

  const handleSaveUser = () => {
    if (editingUser) {
      updateUserMutation.mutate({
        userId: editingUser.id,
        maxProducts: editMaxProducts,
        isActive: editIsActive
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('it-IT');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Admin Panel</CardTitle>
            <p className="text-muted-foreground">Inserisci la password per accedere</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="password">Password Admin</Label>
              <Input
                id="password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && checkAdminAuth()}
                placeholder="Inserisci password..."
                className="mt-2"
              />
            </div>
            <Button onClick={checkAdminAuth} className="w-full">
              Accedi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Gestisci utenti e impostazioni di FoodTracker</p>
          </div>
          <Button 
            onClick={() => setIsAuthenticated(false)}
            variant="outline"
          >
            Logout
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{(adminStats as any)?.totalUsers || 0}</p>
                  <p className="text-sm text-muted-foreground">Utenti Totali</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Package className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{(adminStats as any)?.totalProducts || 0}</p>
                  <p className="text-sm text-muted-foreground">Prodotti Totali</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{(adminStats as any)?.activeUsers || 0}</p>
                  <p className="text-sm text-muted-foreground">Utenti Attivi</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Settings className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{(adminStats as any)?.avgProductsPerUser || 0}</p>
                  <p className="text-sm text-muted-foreground">Media Prodotti/Utente</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestione Utenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Caricamento utenti...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Email</th>
                      <th className="text-left p-3 font-semibold">Nome</th>
                      <th className="text-left p-3 font-semibold">Registrato</th>
                      <th className="text-left p-3 font-semibold">Max Prodotti</th>
                      <th className="text-left p-3 font-semibold">Stato</th>
                      <th className="text-left p-3 font-semibold">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b hover:bg-muted/50">
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">
                          {user.firstName || user.lastName 
                            ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                            : 'N/A'
                          }
                        </td>
                        <td className="p-3">{formatDate((user as any).createdAt?.toISOString?.() || (user as any).createdAt)}</td>
                        <td className="p-3">
                          <Badge variant="outline">
                            {user.maxProducts || 50} prodotti
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={user.isActive === 1 ? "default" : "secondary"}>
                            {user.isActive === 1 ? "Attivo" : "Disattivo"}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Utente</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input value={editingUser.email || ''} disabled />
              </div>
              
              <div>
                <Label htmlFor="maxProducts">Limite Massimo Prodotti</Label>
                <Input
                  id="maxProducts"
                  type="number"
                  value={editMaxProducts}
                  onChange={(e) => setEditMaxProducts(parseInt(e.target.value) || 0)}
                  min="0"
                  max="1000"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="isActive">Utente Attivo</Label>
              </div>
              
              <div className="flex space-x-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Annulla
                </Button>
                <Button 
                  onClick={handleSaveUser}
                  disabled={updateUserMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salva
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}