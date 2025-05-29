import { useLocation } from "wouter";
import { Home, Search, BarChart3, Settings, Plus, Mic, Camera } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import BrowserVoiceInput from "./BrowserVoiceInput";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InsertFoodItem } from "@shared/schema";

const navItems = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/search", icon: Search, label: "Cerca" },
  { path: "/stats", icon: BarChart3, label: "Statistiche" },
  { path: "/settings", icon: Settings, label: "Impostazioni" },
];

interface BottomNavigationProps {
  onAddClick?: () => void;
  onScanClick?: () => void;
  onVoiceData?: (data: Partial<InsertFoodItem>) => void;
  onVoiceAutoSubmit?: (data: Partial<InsertFoodItem>) => void;
}

export default function BottomNavigation({ onAddClick, onScanClick, onVoiceData, onVoiceAutoSubmit }: BottomNavigationProps) {
  const [location] = useLocation();
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [queryResponse, setQueryResponse] = useState("");

  const handleVoiceData = (data: Partial<InsertFoodItem>) => {
    if (onVoiceData) {
      onVoiceData(data);
    }
  };

  const handleVoiceAutoSubmit = (data?: Partial<InsertFoodItem>) => {
    if (onVoiceAutoSubmit && data) {
      onVoiceAutoSubmit(data);
      // Chiudi immediatamente il modal vocale dopo il riconoscimento
      setTimeout(() => {
        setIsVoiceModalOpen(false);
      }, 1000); // Aspetta 1 secondo per vedere il messaggio di successo
    }
  };

  const handleTranscript = (transcript: string) => {
    setLastTranscript(transcript);
  };

  const handleVoiceQuery = (queryType: string, result: string) => {
    setQueryResponse(result);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-bottom z-50">
        <div className="flex items-center justify-between px-4 md:px-6 py-0.5">
          {/* Left navigation items */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {navItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center justify-center p-1.5 md:p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5 mb-0.5 md:mb-1" />
                  <span className="text-[10px] md:text-xs font-medium truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Central buttons */}
          <div className="flex items-center space-x-3">
            <Button 
              onClick={onScanClick}
              className="h-8 w-8 rounded-full bg-white/90 dark:bg-card/90 hover:bg-white dark:hover:bg-card shadow-sm border border-border/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
              size="sm"
            >
              <Camera className="h-4 w-4 text-foreground" />
            </Button>
            
            <BrowserVoiceInput 
              onVoiceData={handleVoiceData}
              onTranscript={setLastTranscript}
              onAutoSubmit={(data) => {
                if (data && onVoiceAutoSubmit) {
                  onVoiceAutoSubmit(data);
                }
              }}
              onQuery={(type, result) => setQueryResponse(result)}
            />
            
            <Button 
              onClick={onAddClick}
              className="h-8 w-8 rounded-full bg-white/90 dark:bg-card/90 hover:bg-white dark:hover:bg-card shadow-sm border border-border/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 active:scale-95"
              size="sm"
            >
              <Plus className="h-4 w-4 text-foreground" />
            </Button>
          </div>

          {/* Right navigation items */}
          <div className="flex items-center space-x-4 md:space-x-6">
            {navItems.slice(2).map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex flex-col items-center justify-center p-1.5 md:p-2 rounded-lg transition-colors min-w-0 flex-1 ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <Icon className="h-4 w-4 md:h-5 md:w-5 mb-0.5 md:mb-1" />
                  <span className="text-[10px] md:text-xs font-medium truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Voice Assistant Modal */}
      <Dialog open={isVoiceModalOpen} onOpenChange={setIsVoiceModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">🎤 Assistente Vocale</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 p-4">
            <BrowserVoiceInput 
              onVoiceData={handleVoiceData}
              onTranscript={handleTranscript}
              onAutoSubmit={handleVoiceAutoSubmit}
              onQuery={handleVoiceQuery}
            />
            {lastTranscript && (
              <div className="w-full p-3 bg-muted rounded-lg text-sm">
                <p className="text-muted-foreground mb-1">Hai detto:</p>
                <p className="text-foreground">"{lastTranscript}"</p>
              </div>
            )}
            {queryResponse && (
              <div className="w-full p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm border border-blue-200 dark:border-blue-800">
                <p className="text-blue-800 dark:text-blue-200 mb-1">Risposta:</p>
                <div className="text-blue-900 dark:text-blue-100 whitespace-pre-line">
                  {queryResponse}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Dì qualcosa come "latte che scade tra 5 giorni" o "cosa scade oggi?"
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}