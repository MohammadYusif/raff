// src/lib/services/zid.service.ts
// PURPOSE: Zid API integration service for merchant product sync

interface ZidConfig {
  accessToken: string;
  storeId: string;
}

interface ZidProduct {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  price: number;
  compare_price?: number;
  sku?: string;
  quantity?: number;
  status: string;
  images?: Array<{ url: string; position: number }>;
  categories?: Array<{ id: string; name: string }>;
}

interface ZidCategory {
  id: string;
  uuid: string;
  name: string;
  description?: string;
  parent_id?: string;
  image?: string;
}

interface ZidPaginatedResponse<T> {
  products?: T[];
  categories?: T[];
  pagination: {
    count: number;
    total: number;
    per_page: number;
    current_page: number;
    total_pages: number;
  };
}

export class ZidService {
  private baseUrl = "https://api.zid.sa/v1";
  private accessToken: string;
  private storeId: string;

  constructor(config: ZidConfig) {
    this.accessToken = config.accessToken;
    this.storeId = config.storeId;
  }

  /**
   * Fetch paginated products from Zid store
   */
  async fetchProducts(
    page: number = 1,
    perPage: number = 50
  ): Promise<ZidPaginatedResponse<ZidProduct>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/managers/store/products?page=${page}&per_page=${perPage}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        products: data.products || [],
        pagination: data.pagination || {
          count: 0,
          total: 0,
          per_page: perPage,
          current_page: page,
          total_pages: 1,
        },
      };
    } catch (error) {
      console.error("Error fetching Zid products:", error);
      throw error;
    }
  }

  /**
   * Fetch single product by ID
   */
  async fetchProduct(productId: string): Promise<ZidProduct | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/managers/store/products/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      return data.product || null;
    } catch (error) {
      console.error("Error fetching Zid product:", error);
      throw error;
    }
  }

  /**
   * Fetch all categories from Zid store
   */
  async fetchCategories(): Promise<ZidCategory[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/managers/store/categories`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      return data.categories || [];
    } catch (error) {
      console.error("Error fetching Zid categories:", error);
      throw error;
    }
  }

  /**
   * Fetch store manager profile
   */
  async fetchStoreProfile(): Promise<{
    id: string;
    name: string;
    email: string;
    domain: string;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/managers/account/profile`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Zid API error: ${response.status}`);
      }

      const data = await response.json();
      return data.manager || null;
    } catch (error) {
      console.error("Error fetching Zid store profile:", error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const response = await fetch("https://oauth.zid.sa/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token: refreshToken,
          client_id: process.env.ZID_CLIENT_ID,
          client_secret: process.env.ZID_CLIENT_SECRET,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error("Error refreshing Zid token:", error);
      throw error;
    }
  }
}

/**
 * Sync products from Zid to Raff database
 */
export async function syncZidProducts(
  merchantId: string,
  accessToken: string
): Promise<{
  productsCreated: number;
  productsUpdated: number;
  categoriesCreated: number;
  categoriesUpdated: number;
}> {
  const service = new ZidService({ accessToken, storeId: "" });

  let productsCreated = 0;
  let productsUpdated = 0;
  let categoriesCreated = 0;
  let categoriesUpdated = 0;

  // TODO: Implement full sync logic
  // 1. Fetch categories and sync to database
  // 2. Fetch all products (paginated)
  // 3. For each product:
  //    - Check if exists in database
  //    - Create or update product
  //    - Handle images
  //    - Link to categories

  return {
    productsCreated,
    productsUpdated,
    categoriesCreated,
    categoriesUpdated,
  };
}
