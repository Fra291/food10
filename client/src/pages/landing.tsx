import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Clock, Smartphone, Scan, Mic, Bell } from "lucide-react";
import { useState } from "react";
import { signUpWithEmail, signInWithEmail } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export default function Landing() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Campi richiesti",
        description: "Inserisci email e password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email.trim(), password);
        toast({
          title: "Account creato!",
          description: "Benvenuto in FoodTracker",
        });
      } else {
        await signInWithEmail(email.trim(), password);
        toast({
          title: "Accesso effettuato!",
          description: "Bentornato in FoodTracker",
        });
      }
    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Riprova più tardi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex flex-col">
      {/* Header */}
      <header className="p-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🥗 FoodTracker
          </h1>
          <p className="text-xl text-gray-600">
            La tua app intelligente per gestire gli alimenti e ridurre gli sprechi
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Mai più cibo sprecato!
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Tieni traccia di tutti i tuoi alimenti, ricevi notifiche prima della scadenza 
            e ottimizza la gestione della tua cucina con l'intelligenza artificiale.
          </p>
          
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-lg"
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleEmailAuth()}
                className="text-lg"
              />
              <Button 
                onClick={handleEmailAuth}
                disabled={isLoading}
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? "Caricamento..." : (isSignUp ? "Crea Account" : "Accedi")}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {isSignUp ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-green-600" />
                Scanner Barcode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Scansiona i codici a barre per aggiungere automaticamente 
                i prodotti con tutte le informazioni nutrizionali.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-blue-600" />
                Controllo Vocale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Aggiungi alimenti semplicemente parlando: "Latte 5 giorni" 
                e l'IA capirà automaticamente.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                Notifiche Scadenze
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ricevi avvisi in tempo reale quando i tuoi alimenti 
                stanno per scadere.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-purple-600" />
                Calcolo Automatico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Le date di scadenza vengono calcolate automaticamente 
                in base al tipo di alimento e alla data di preparazione.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-red-600" />
                Gestione Intelligente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Organizza gli alimenti per posizione, categoria e stato 
                con filtri avanzati e ricerca rapida.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-indigo-600" />
                Mobile-First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ottimizzata per smartphone con interfaccia touch-friendly 
                e navigazione intuitiva.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white rounded-lg p-8 shadow-md">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Pronto per iniziare?
          </h3>
          <p className="text-gray-600 mb-6">
            Crea il tuo account o accedi per iniziare a gestire i tuoi alimenti 
            in modo intelligente. È gratuito e semplice!
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        <p>© 2025 FoodTracker - Gestione intelligente degli alimenti</p>
      </footer>
    </div>
  );
}