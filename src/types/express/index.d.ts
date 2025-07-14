declare global {
  namespace Express {
    interface Request {
      customer?: {
        customerId: string;
      };
      store?: {
        storeId: string;
      };
      superAdmin?: {
        sAdminId: string;
      };
    }
  }
}

export {};
