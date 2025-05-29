// Utility per gestire le notifiche push
export class NotificationManager {
  private static instance: NotificationManager;
  
  private constructor() {}
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }
  
  // Richiede permesso per le notifiche
  async requestPermission(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log('Questo browser non supporta le notifiche');
        return false;
      }
      
      if (Notification.permission === 'granted') {
        return true;
      }
      
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      
      return false;
    } catch (error) {
      console.log('Errore nel richiedere permessi notifiche:', error);
      return false;
    }
  }
  
  // Invia una notifica push
  sendNotification(title: string, options?: NotificationOptions): void {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        
        silent: false,
        vibrate: [200, 100, 200],
        dir: 'ltr',
        lang: 'it',
        renotify: true,
        sticky: true,
        ...options
      });
      
      // Mantiene la notifica visibile più a lungo
      setTimeout(() => {
        if (!notification.onclick) {
          notification.close();
        }
      }, 10000); // 10 secondi invece del default
    }
  }
  
  // Verifica gli alimenti in scadenza e invia notifiche
  checkExpiringFoods(foods: Array<{
    id: number;
    name: string;
    preparationDate: string;
    daysToExpiry: number;
  }>): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    foods.forEach(food => {
      const prepDate = new Date(food.preparationDate);
      const expiryDate = new Date(prepDate);
      expiryDate.setDate(prepDate.getDate() + food.daysToExpiry);
      expiryDate.setHours(0, 0, 0, 0);
      
      const timeDiff = expiryDate.getTime() - today.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      // Notifica se scade oggi
      if (daysDiff === 0) {
        this.sendNotification(
          '🚨 Alimento in scadenza oggi!',
          {
            body: `${food.name} scade oggi. Consumalo presto!`,
            tag: `expiry-today-${food.id}`,
            requireInteraction: true
          }
        );
      }
      // Notifica se scade domani
      else if (daysDiff === 1) {
        this.sendNotification(
          '⚠️ Alimento scade domani',
          {
            body: `${food.name} scade domani. Pianifica di consumarlo!`,
            tag: `expiry-tomorrow-${food.id}`
          }
        );
      }
    });
  }
  
  // Programma controllo automatico delle scadenze
  scheduleExpiryCheck(foods: Array<{
    id: number;
    name: string;
    preparationDate: string;
    daysToExpiry: number;
  }>): void {
    // Controlla subito
    this.checkExpiringFoods(foods);
    
    // Programma controllo ogni ora
    setInterval(() => {
      this.checkExpiringFoods(foods);
    }, 60 * 60 * 1000); // ogni ora
  }
}

export const notificationManager = NotificationManager.getInstance();