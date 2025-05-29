import { foodItems, type FoodItem, type InsertFoodItem, type UpdateFoodItem, users, type User, type UpsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, desc, asc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations for authentication
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<UpsertUser, 'id'>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Food item operations (user-specific)
  getAllFoodItems(userId: string): Promise<FoodItem[]>;
  getFoodItem(id: number, userId: string): Promise<FoodItem | undefined>;
  createFoodItem(item: InsertFoodItem, userId: string): Promise<FoodItem>;
  updateFoodItem(id: number, item: UpdateFoodItem, userId: string): Promise<FoodItem | undefined>;
  deleteFoodItem(id: number, userId: string): Promise<boolean>;
  searchFoodItems(query: string, userId: string): Promise<FoodItem[]>;
  getFoodItemsByStatus(status: 'expired' | 'expiring' | 'fresh', userId: string): Promise<FoodItem[]>;
  getFoodItemsStats(userId: string): Promise<{ expired: number; expiring: number; fresh: number }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Omit<UpsertUser, 'id'>): Promise<User> {
    const id = Date.now().toString(); // Simple ID generation
    const [user] = await db
      .insert(users)
      .values({ ...userData, id })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllFoodItems(userId: string): Promise<FoodItem[]> {
    return await db.select().from(foodItems)
      .where(eq(foodItems.userId, userId))
      .orderBy(asc(foodItems.expiryDate));
  }

  async getFoodItem(id: number, userId: string): Promise<FoodItem | undefined> {
    const [item] = await db.select().from(foodItems)
      .where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)));
    return item || undefined;
  }

  async createFoodItem(item: InsertFoodItem, userId: string): Promise<FoodItem> {
    // Calculate expiry date from preparation date + days to expiry
    const preparationDate = new Date(item.preparationDate);
    const expiryDate = new Date(preparationDate);
    expiryDate.setDate(preparationDate.getDate() + item.daysToExpiry);
    
    const [foodItem] = await db
      .insert(foodItems)
      .values({
        ...item,
        userId,
        expiryDate: expiryDate.toISOString().split('T')[0],
        updatedAt: new Date(),
      })
      .returning();
    return foodItem;
  }

  async updateFoodItem(id: number, item: UpdateFoodItem, userId: string): Promise<FoodItem | undefined> {
    let updateData: any = { ...item, updatedAt: new Date() };
    
    // If preparation date or days to expiry are updated, recalculate expiry date
    if (item.preparationDate || item.daysToExpiry) {
      const currentItem = await this.getFoodItem(id, userId);
      if (currentItem) {
        const prepDate = new Date(item.preparationDate || currentItem.preparationDate);
        const days = item.daysToExpiry || currentItem.daysToExpiry;
        const expiryDate = new Date(prepDate);
        expiryDate.setDate(prepDate.getDate() + days);
        updateData.expiryDate = expiryDate.toISOString().split('T')[0];
      }
    }
    
    const [updatedItem] = await db
      .update(foodItems)
      .set(updateData)
      .where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)))
      .returning();
    return updatedItem || undefined;
  }

  async deleteFoodItem(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(foodItems)
      .where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  async searchFoodItems(query: string, userId: string): Promise<FoodItem[]> {
    return await db
      .select()
      .from(foodItems)
      .where(
        and(
          eq(foodItems.userId, userId),
          or(
            ilike(foodItems.name, `%${query}%`),
            ilike(foodItems.category, `%${query}%`),
            ilike(foodItems.location, `%${query}%`)
          )
        )
      )
      .orderBy(asc(foodItems.expiryDate));
  }

  async getFoodItemsByStatus(status: 'expired' | 'expiring' | 'fresh', userId: string): Promise<FoodItem[]> {
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    let items = await db.select().from(foodItems)
      .where(eq(foodItems.userId, userId))
      .orderBy(asc(foodItems.expiryDate));
    
    return items.filter(item => {
      const expiryDate = new Date(item.expiryDate);
      const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (status) {
        case 'expired':
          return daysDiff < 0;
        case 'expiring':
          return daysDiff >= 0 && daysDiff <= 3;
        case 'fresh':
          return daysDiff > 3;
        default:
          return true;
      }
    });
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserLimits(userId: string, maxProducts: number, isActive: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        maxProducts,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalProducts: number;
    activeUsers: number;
    avgProductsPerUser: number;
  }> {
    const allUsers = await db.select().from(users);
    const allProducts = await db.select().from(foodItems);
    const activeUsersList = await db.select().from(users).where(eq(users.isActive, 1));
    
    const avgProducts = allProducts.length && allUsers.length 
      ? Math.round(allProducts.length / allUsers.length)
      : 0;

    return {
      totalUsers: allUsers.length,
      totalProducts: allProducts.length,
      activeUsers: activeUsersList.length,
      avgProductsPerUser: avgProducts
    };
  }

  async getFoodItemsStats(userId: string): Promise<{ expired: number; expiring: number; fresh: number }> {
    const allItems = await this.getAllFoodItems(userId);
    const today = new Date();
    
    let expired = 0;
    let expiring = 0;
    let fresh = 0;

    allItems.forEach(item => {
      const expiryDate = new Date(item.expiryDate);
      const daysDiff = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0) {
        expired++;
      } else if (daysDiff <= 3) {
        expiring++;
      } else {
        fresh++;
      }
    });

    return { expired, expiring, fresh };
  }
}

export const storage = new DatabaseStorage();
