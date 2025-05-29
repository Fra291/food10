import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { InsertFoodItem } from "@shared/schema";

interface VoiceInputProps {
  onVoiceData: (data: Partial<InsertFoodItem>) => void;
  onTranscript: (transcript: string) => void;
  onAutoSubmit?: () => void;
}

export default function VoiceInput({ onVoiceData, onTranscript, onAutoSubmit }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);

      toast({
        title: "🎤 Registrazione avviata",
        description: "Parla chiaramente per aggiungere l'alimento"
      });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Errore microfono",
        description: "Impossibile accedere al microfono",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      console.log("Starting audio processing...");
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      console.log("Sending request to server...");
      const response = await fetch('/api/voice-assistant', {
        method: 'POST',
        body: formData
      });

      console.log("Response received:", response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      const result = JSON.parse(responseText);
      console.log("Response parsed:", result);
      
      if (result.transcript) {
        onTranscript(result.transcript);
      }
      
      if (result.parsedData) {
        onVoiceData(result.parsedData);
      }

      toast({
        title: "✅ Audio elaborato",
        description: `Riconosciuto: "${result.transcript || 'Test completato'}"`
      });

      // Auto-submit if we have a name and daysToExpiry
      if (result.parsedData?.name && result.parsedData?.daysToExpiry && onAutoSubmit) {
        setTimeout(() => {
          onAutoSubmit();
        }, 1000); // Give user time to see what was recognized
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Errore elaborazione",
        description: `Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <Button
        type="button"
        onClick={handleClick}
        disabled={isProcessing}
        className={`rounded-full w-16 h-16 ${
          isRecording 
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        size="lg"
      >
        {isProcessing ? (
          <Volume2 className="h-8 w-8 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>
      
      <p className="text-sm text-muted-foreground text-center">
        {isProcessing 
          ? "Elaborando..." 
          : isRecording 
            ? "Tocca per fermare" 
            : "Tocca per parlare"
        }
      </p>
      
      {isRecording && (
        <p className="text-xs text-blue-600 text-center animate-pulse">
          🔴 Registrando...
        </p>
      )}
    </div>
  );
}