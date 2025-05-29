import { pgTable, text, serial, date, varchar, timestamp, integer, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  maxProducts: integer("max_products").default(50), // Limite massimo prodotti per utente
  isActive: integer("is_active").default(1), // Per abilitare/disabilitare utenti (1=attivo, 0=disattivo)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const foodItems = pgTable("food_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  preparationDate: date("preparation_date").notNull(),
  daysToExpiry: integer("days_to_expiry").notNull(),
  expiryDate: date("expiry_date").notNull(),
  quantity: varchar("quantity", { length: 100 }),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const upsertUserSchema = createInsertSchema(users);

export const insertFoodItemSchema = createInsertSchema(foodItems).omit({
  id: true,
  userId: true,
  expiryDate: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  quantity: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
});

export const updateFoodItemSchema = insertFoodItemSchema.partial();

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFoodItem = z.infer<typeof insertFoodItemSchema>;
export type UpdateFoodItem = z.infer<typeof updateFoodItemSchema>;
export type FoodItem = typeof foodItems.$inferSelect;
