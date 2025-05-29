import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFoodItemSchema, updateFoodItemSchema } from "@shared/schema";
import { z } from "zod";
import { transcribeAudio, parseVoiceInput } from "./openai";
import multer from "multer";
import { setupAuth, isAuthenticated } from "./replitAuth";
import path from "path";

// Simple Firebase auth middleware for development
const firebaseAuth = (req: any, res: any, next: any) => {
  console.log("All headers:", req.headers);
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("No auth header found in request");
    return res.status(401).json({ message: "Not authenticated" });
  }
  
  // Extract Firebase user ID from Authorization header
  const token = authHeader.replace('Bearer ', '');
  console.log("Firebase token received:", token);
  req.user = { uid: token };
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Test route semplice
  app.get('/test', (req, res) => {
    res.send('<h1>Test route funziona!</h1>');
  });

  // Route per la pagina mobile dedicata
  app.get('/mobile', (req, res) => {
    console.log('Mobile route chiamato!');
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#667eea">
    <title>FoodTracker Mobile</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh; color: white; overflow-x: hidden;
        }
        .container { padding: 20px; max-width: 480px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 16px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
        .stat-card { background: rgba(255,255,255,0.2); padding: 16px; border-radius: 16px; text-align: center; backdrop-filter: blur(10px); }
        .stat-number { font-size: 24px; font-weight: bold; margin-bottom: 4px; }
        .stat-label { font-size: 12px; opacity: 0.9; }
        .food-container { background: rgba(255,255,255,0.1); border-radius: 20px; overflow: hidden; margin-bottom: 20px; }
        .food-header { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center; }
        .food-header h2 { font-size: 18px; font-weight: 600; }
        .add-btn { background: rgba(255,255,255,0.2); border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 20px; color: white; cursor: pointer; transition: transform 0.2s; }
        .add-btn:active { transform: scale(0.95); }
        .add-form { padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); display: none; }
        .add-form.show { display: block; }
        .form-input { padding: 12px; border: none; border-radius: 8px; background: rgba(255,255,255,0.9); font-size: 16px; color: #333; width: 100%; margin-bottom: 12px; }
        .form-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 12px; }
        .form-btn { width: 100%; padding: 12px; background: #34c759; border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
        .food-list { max-height: 400px; overflow-y: auto; }
        .food-item { padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; animation: fadeIn 0.3s ease-out; }
        .food-info { flex: 1; }
        .food-name { font-size: 16px; font-weight: 500; margin-bottom: 4px; }
        .food-details { font-size: 14px; opacity: 0.7; }
        .food-actions { display: flex; align-items: center; gap: 12px; }
        .status-dot { width: 12px; height: 12px; border-radius: 50%; }
        .delete-btn { background: none; border: none; color: #ff3b30; font-size: 18px; cursor: pointer; padding: 4px; }
        .empty-state { padding: 40px; text-align: center; opacity: 0.7; }
        .empty-icon { font-size: 48px; margin-bottom: 16px; }
        .info-section { background: rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 80px; }
        .sync-btn { padding: 8px 16px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 20px; color: white; font-size: 14px; cursor: pointer; }
        .bottom-nav { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); padding: 12px 20px; border-top: 1px solid rgba(0,0,0,0.1); display: flex; justify-content: space-around; }
        .nav-btn { background: none; border: none; font-size: 24px; padding: 8px; cursor: pointer; opacity: 0.6; transition: opacity 0.2s; }
        .nav-btn.active { opacity: 1; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍎 FoodTracker Mobile</h1>
            <p>Versione mobile offline</p>
        </div>
        <div class="stats">
            <div class="stat-card"><div class="stat-number" style="color: #ff3b30;" id="expired-count">0</div><div class="stat-label">Scaduti</div></div>
            <div class="stat-card"><div class="stat-number" style="color: #ff9500;" id="expiring-count">0</div><div class="stat-label">In scadenza</div></div>
            <div class="stat-card"><div class="stat-number" style="color: #34c759;" id="fresh-count">0</div><div class="stat-label">Freschi</div></div>
        </div>
        <div class="food-container">
            <div class="food-header">
                <h2>I tuoi alimenti</h2>
                <button class="add-btn" onclick="toggleAddForm()">+</button>
            </div>
            <div class="add-form" id="add-form">
                <input type="text" class="form-input" id="food-name" placeholder="Nome alimento" maxlength="50">
                <div class="form-grid">
                    <select class="form-input" id="food-category">
                        <option value="">Categoria</option>
                        <option value="Frutta">Frutta</option>
                        <option value="Verdure">Verdure</option>
                        <option value="Latticini">Latticini</option>
                        <option value="Carne">Carne</option>
                        <option value="Altro">Altro</option>
                    </select>
                    <input type="number" class="form-input" id="food-days" placeholder="Giorni" min="1" max="365" value="7">
                </div>
                <button class="form-btn" onclick="addFood()">Aggiungi Alimento</button>
            </div>
            <div class="food-list" id="food-list">
                <div class="empty-state" id="empty-state">
                    <div class="empty-icon">📦</div>
                    <p>Nessun alimento aggiunto</p>
                </div>
            </div>
        </div>
        <div class="info-section">
            <p>💾 I dati sono salvati localmente sul tuo dispositivo</p>
            <button class="sync-btn" onclick="window.location.href='/'">🔄 Vai alla versione Desktop</button>
        </div>
    </div>
    <div class="bottom-nav">
        <button class="nav-btn active">🏠</button>
        <button class="nav-btn" onclick="toggleAddForm()">➕</button>
        <button class="nav-btn" onclick="alert('📷 Camera non disponibile in versione mobile offline')">📷</button>
        <button class="nav-btn" onclick="showStats()">📊</button>
    </div>
    <script>
        let foods = [];
        let showForm = false;
        
        function loadFoods() {
            try {
                const saved = localStorage.getItem('foodtracker_mobile_foods');
                foods = saved ? JSON.parse(saved) : [
                    { id: 1, name: 'Mele', category: 'Frutta', addedDate: new Date().toISOString(), daysToExpiry: 7 },
                    { id: 2, name: 'Latte', category: 'Latticini', addedDate: new Date(Date.now() - 2*24*60*60*1000).toISOString(), daysToExpiry: 3 }
                ];
                if (!saved) saveFoods();
            } catch { foods = []; }
        }
        
        function saveFoods() {
            try { localStorage.setItem('foodtracker_mobile_foods', JSON.stringify(foods)); } catch {}
        }
        
        function getExpiryStatus(addedDate, daysToExpiry) {
            const added = new Date(addedDate);
            const now = new Date();
            const daysPassed = Math.floor((now.getTime() - added.getTime()) / (1000 * 60 * 60 * 24));
            const remaining = daysToExpiry - daysPassed;
            
            if (remaining <= 0) return { status: 'expired', color: '#ff3b30', text: 'Scaduto' };
            if (remaining <= 2) return { status: 'expiring', color: '#ff9500', text: remaining + 'g rimasti' };
            return { status: 'fresh', color: '#34c759', text: remaining + 'g rimasti' };
        }
        
        function updateStats() {
            const stats = { expired: 0, expiring: 0, fresh: 0 };
            foods.forEach(food => {
                const status = getExpiryStatus(food.addedDate, food.daysToExpiry).status;
                stats[status]++;
            });
            document.getElementById('expired-count').textContent = stats.expired;
            document.getElementById('expiring-count').textContent = stats.expiring;
            document.getElementById('fresh-count').textContent = stats.fresh;
        }
        
        function updateDisplay() {
            const foodList = document.getElementById('food-list');
            const emptyState = document.getElementById('empty-state');
            
            if (foods.length === 0) {
                emptyState.style.display = 'block';
                return;
            }
            
            emptyState.style.display = 'none';
            foodList.innerHTML = foods.map(food => {
                const expiry = getExpiryStatus(food.addedDate, food.daysToExpiry);
                return '<div class="food-item"><div class="food-info"><div class="food-name">' + food.name + '</div><div class="food-details">' + food.category + ' • ' + expiry.text + '</div></div><div class="food-actions"><div class="status-dot" style="background: ' + expiry.color + '"></div><button class="delete-btn" onclick="removeFood(' + food.id + ')">🗑️</button></div></div>';
            }).join('');
        }
        
        function toggleAddForm() {
            showForm = !showForm;
            const form = document.getElementById('add-form');
            const button = document.querySelector('.add-btn');
            
            if (showForm) {
                form.classList.add('show');
                button.textContent = '✕';
                document.getElementById('food-name').focus();
            } else {
                form.classList.remove('show');
                button.textContent = '+';
                document.getElementById('food-name').value = '';
                document.getElementById('food-category').value = '';
                document.getElementById('food-days').value = '7';
            }
        }
        
        function addFood() {
            const name = document.getElementById('food-name').value.trim();
            const category = document.getElementById('food-category').value || 'Altro';
            const days = parseInt(document.getElementById('food-days').value) || 7;
            
            if (!name) {
                alert('Inserisci il nome dell\\'alimento');
                return;
            }
            
            const food = {
                id: Date.now(),
                name: name,
                category: category,
                addedDate: new Date().toISOString(),
                daysToExpiry: days
            };
            
            foods.push(food);
            saveFoods();
            updateStats();
            updateDisplay();
            toggleAddForm();
        }
        
        function removeFood(id) {
            if (confirm('Rimuovere questo alimento?')) {
                foods = foods.filter(f => f.id !== id);
                saveFoods();
                updateStats();
                updateDisplay();
            }
        }
        
        function showStats() {
            const stats = foods.reduce((acc, food) => {
                const status = getExpiryStatus(food.addedDate, food.daysToExpiry).status;
                acc[status]++;
                return acc;
            }, { expired: 0, expiring: 0, fresh: 0 });
            
            alert('📊 Statistiche:\\n\\n🔴 Scaduti: ' + stats.expired + '\\n🟡 In scadenza: ' + stats.expiring + '\\n🟢 Freschi: ' + stats.fresh + '\\n\\nTotale: ' + foods.length + ' alimenti');
        }
        
        function init() {
            loadFoods();
            updateStats();
            updateDisplay();
        }
        
        document.addEventListener('DOMContentLoaded', init);
        console.log('📱 FoodTracker Mobile caricato con successo');
    </script>
</body>
</html>`);
  });

  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email e password richiesti" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Utente già registrato con questa email" });
      }

      // Create new user
      const user = await storage.createUser({
        email: email.trim(),
        password: password, // In production, hash this password
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      });

      // Set session
      (req.session as any).userId = user.id;
      res.json({ success: true, user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Errore durante la registrazione" });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email e password richiesti" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email o password non corretti" });
      }

      // Check password (in production, compare hashed password)
      if (user.password !== password) {
        return res.status(401).json({ message: "Email o password non corretti" });
      }

      // Set session
      (req.session as any).userId = user.id;
      res.json({ success: true, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Errore durante il login" });
    }
  });

  app.get('/api/auth/user', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { maxProducts, isActive } = req.body;
      const user = await storage.updateUserLimits(id, maxProducts, isActive);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  // Get all food items (user-specific) - Temporary bypass
  app.get("/api/food-items", async (req, res) => {
    try {
      // Use temporary user ID for testing
      const userId = "temp-user-firebase";
      const { search, status } = req.query;
      
      let items;
      if (search) {
        items = await storage.searchFoodItems(search as string, userId);
      } else if (status && status !== 'all') {
        items = await storage.getFoodItemsByStatus(status as 'expired' | 'expiring' | 'fresh', userId);
      } else {
        items = await storage.getAllFoodItems(userId);
      }
      
      res.json(items);
    } catch (error) {
      console.error("Error fetching food items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get food items stats (user-specific) - Temporary bypass
  app.get("/api/food-items/stats", async (req: any, res) => {
    try {
      // Use temporary user ID for testing
      const userId = "temp-user-firebase";
      const stats = await storage.getFoodItemsStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single food item (user-specific)
  app.get("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid food item ID" });
      }

      const item = await storage.getFoodItem(id, userId);
      if (!item) {
        return res.status(404).json({ message: "Food item not found" });
      }

      res.json(item);
    } catch (error) {
      console.error("Error fetching food item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new food item (user-specific) - Temporary bypass for testing
  app.post("/api/food-items", async (req: any, res) => {
    try {
      // Use a temporary user ID for testing
      const userId = "temp-user-firebase";
      const validatedData = insertFoodItemSchema.parse(req.body);
      const newItem = await storage.createFoodItem(validatedData, userId);
      res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error creating food item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update food item (user-specific) - Temporary bypass  
  app.put("/api/food-items/:id", async (req: any, res) => {
    try {
      const userId = "temp-user-firebase";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid food item ID" });
      }

      const validatedData = updateFoodItemSchema.parse(req.body);
      const updatedItem = await storage.updateFoodItem(id, validatedData, userId);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Food item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      console.error("Error updating food item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete food item (user-specific) - Temporary bypass
  app.delete("/api/food-items/:id", async (req: any, res) => {
    try {
      const userId = "temp-user-firebase";
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid food item ID" });
      }

      const deleted = await storage.deleteFoodItem(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Food item not found" });
      }

      res.json({ success: true, message: "Food item deleted successfully" });
    } catch (error) {
      console.error("Error deleting food item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Setup multer for audio file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Simple test endpoint
  app.get("/api/voice-test", (req, res) => {
    console.log("Voice test endpoint called");
    res.json({
      transcript: "test latte 5 giorni",
      parsedData: {
        name: "latte",
        category: "Latticini", 
        daysToExpiry: 5
      }
    });
  });

  // Voice assistant endpoint  
  app.post("/api/voice-assistant", upload.single("audio"), async (req, res) => {
    try {
      console.log("Voice assistant endpoint called");
      
      if (!req.file) {
        console.log("No audio file provided");
        return res.status(400).json({ message: "Nessun file audio fornito" });
      }

      console.log("Audio file received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.buffer.length
      });

      // Force real OpenAI processing - no fallback data
      console.log("=== STARTING REAL VOICE PROCESSING ===");
      
      try {
        console.log("Calling transcribeAudio function...");
        const transcript = await transcribeAudio(req.file.buffer);
        console.log("=== TRANSCRIPTION SUCCESSFUL ===", transcript);
        
        console.log("Calling parseVoiceInput function...");
        const parsedData = await parseVoiceInput(transcript);
        console.log("=== PARSING SUCCESSFUL ===", parsedData);
        
        const response = {
          transcript,
          parsedData
        };
        
        console.log("=== FINAL RESPONSE ===", response);
        res.json(response);
      } catch (openaiError) {
        console.error("=== OPENAI ERROR ===", openaiError);
        throw openaiError; // This will trigger the outer catch block
      }
      
    } catch (error) {
      console.error("Error processing voice input:", error);
      res.status(500).json({ 
        message: "Errore nell'elaborazione dell'audio",
        error: error instanceof Error ? error.message : "Errore sconosciuto"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
