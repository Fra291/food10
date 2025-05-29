import OpenAI from "openai";
import { InsertFoodItem } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  try {
    console.log("Audio buffer size:", audioBuffer.length);
    
    if (audioBuffer.length === 0) {
      throw new Error("Audio buffer è vuoto");
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY non configurata");
    }

    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });
    console.log("Created audio file:", audioFile.size, "bytes");
    console.log("Calling OpenAI API...");
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "it", // Italian language
    });

    console.log("OpenAI API call successful!");
    console.log("Transcription result:", transcription.text);
    return transcription.text;
  } catch (error) {
    console.error("DETAILED Error transcribing audio:", {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error; // Re-throw the original error for better debugging
  }
}

export async function parseVoiceInput(transcript: string): Promise<Partial<InsertFoodItem>> {
  try {
    const prompt = `
Analizza questo testo trascritto in italiano e estrai le informazioni per un alimento da inserire in un inventario alimentare.
Testo: "${transcript}"

Estrai le seguenti informazioni se presenti:
- name: nome dell'alimento
- category: categoria (Frutta, Verdura, Latticini, Carne, Pesce, Cereali, Legumi, Dolci, Bevande, Altro)
- quantity: quantità (es. "1L", "500g", "2 pz")
- location: dove è conservato (Frigorifero, Freezer, Dispensa, Altro)
- daysToExpiry: numero di giorni prima della scadenza (solo numero)

Rispondi SOLO con un oggetto JSON valido, senza altre spiegazioni.
Se un'informazione non è presente, ometti il campo o usa null.

Esempi:
"Aggiungi del latte che scade tra 5 giorni" -> {"name": "latte", "category": "Latticini", "daysToExpiry": 5}
"Ho comprato 2 mele per il frigorifero" -> {"name": "mele", "category": "Frutta", "quantity": "2 pz", "location": "Frigorifero"}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Sei un assistente per l'inventario alimentare. Analizza il testo e restituisci solo JSON valido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Clean up the result and ensure proper types
    const cleanResult: Partial<InsertFoodItem> = {};
    
    if (result.name && typeof result.name === 'string') {
      cleanResult.name = result.name.trim();
    }
    
    if (result.category && typeof result.category === 'string') {
      cleanResult.category = result.category.trim();
    }
    
    if (result.quantity && typeof result.quantity === 'string') {
      cleanResult.quantity = result.quantity.trim();
    }
    
    if (result.location && typeof result.location === 'string') {
      cleanResult.location = result.location.trim();
    }
    
    if (result.daysToExpiry && (typeof result.daysToExpiry === 'number' || typeof result.daysToExpiry === 'string')) {
      const days = parseInt(result.daysToExpiry.toString());
      if (!isNaN(days) && days >= 0) {
        cleanResult.daysToExpiry = days;
      }
    }

    return cleanResult;
  } catch (error) {
    console.error("Error parsing voice input:", error);
    throw new Error("Errore nell'analisi del testo");
  }
}