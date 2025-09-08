interface ZohoTokenResponse {
  access_token: string;
  scope: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
}

interface ZohoSalesOrder {
  salesorder_id: string;
  salesorder_number: string;
  date: string;
  customer_id: string;
  customer_name: string;
  line_items: ZohoLineItem[];
  total: number;
  currency_code: string;
  custom_fields?: Array<{
    field_id: string;
    customfield_id: string;
    show_in_store: boolean;
    show_in_portal: boolean;
    is_active: boolean;
    index: number;
    label: string;
    show_on_pdf: boolean;
    edit_on_portal: boolean;
    edit_on_store: boolean;
    api_name: string;
    show_in_all_pdf: boolean;
    value_formatted: string;
    search_entity: string;
    data_type: string;
    placeholder: string;
    value: string;
    is_dependent_field: boolean;
    is_color_code_supported?: boolean;
    selected_option_id?: string;
  }>;
  custom_field_hash?: {
    cf_start_date: string;
    cf_start_date_unformatted: string;
    cf_end_date: string;
    cf_end_date_unformatted: string;
    cf_billing_cycle: string;
    cf_billing_cycle_unformatted: string;
    cf_billing_cycle_date: string;
    cf_billing_cycle_date_unformatted: string;
  };
}

interface ZohoLineItem {
  line_item_id: string;
  item_id: string;
  name: string;
  quantity: number;
  rate: number;
  item_total: number;
}

interface ZohoInvoiceResponse {
  code: number;
  message: string;
  invoice: {
    invoice_id: string;
    invoice_number: string;
    invoice_url: string;
    date: string;
    due_date: string;
    customer_id: string;
    customer_name: string;
    currency_code: string;
    status: string;
    total: number;
    balance: number;
  };
}

class ZohoAPI {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private refreshToken: string,
    private organizationId: string,
    private apiDomain: string = 'https://www.zohoapis.in'
  ) {}

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<string> {
    const now = Date.now();
    
    // Check if token is still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiry > now + 300000) {
      return this.accessToken;
    }

    try {
      const response = await fetch('https://accounts.zoho.in/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: 'http://www.zoho.com/books',
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data: ZohoTokenResponse = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Error refreshing Zoho access token:', error);
      throw new Error('Failed to refresh Zoho access token');
    }
  }

  /**
   * Get sales order by ID
   */
  async getSalesOrder(salesOrderId: string): Promise<ZohoSalesOrder> {
    const token = await this.refreshAccessToken();
    
    try {
      const response = await fetch(
        `${this.apiDomain}/books/v3/salesorders/${salesOrderId}?organization_id=${this.organizationId}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch sales order: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`Zoho API error: ${data.message}`);
      }

      return data.salesorder;
    } catch (error) {
      console.error('Error fetching sales order:', error);
      throw new Error('Failed to fetch sales order from Zoho');
    }
  }

  /**
   * Create invoice in Zoho
   */
  async createInvoice(invoiceData: {
    customer_id: string;
    custom_fields: Array<{ customfield_id: string; value: string }>;
    line_items: Array<{ item_id: string; quantity: number; rate: number }>;
  }): Promise<ZohoInvoiceResponse> {
    const token = await this.refreshAccessToken();
    
    const url = `${this.apiDomain}/books/v3/invoices?organization_id=${this.organizationId}`;
    const requestBody = JSON.stringify(invoiceData);
    
    console.log('=== ZOHO BOOKS API REQUEST ===');
    console.log('URL:', url);
    console.log('Method: POST');
    console.log('Headers:', {
      'Authorization': `Zoho-oauthtoken ${token.substring(0, 20)}...`,
      'Content-Type': 'application/json'
    });
    console.log('Request Body:', requestBody);
    console.log('=== END ZOHO REQUEST ===');
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${token}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

      console.log('=== ZOHO HTTP RESPONSE ===');
      console.log('Status:', response.status);
      console.log('Status Text:', response.statusText);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));
      console.log('=== END HTTP RESPONSE ===');

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error Response Body:', errorText);
        throw new Error(`Failed to create invoice: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('=== ZOHO API RESPONSE DATA ===');
      console.log('Response Data:', JSON.stringify(data, null, 2));
      console.log('=== END API RESPONSE DATA ===');
      
      if (data.code !== 0) {
        throw new Error(`Zoho API error: ${data.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error creating invoice in Zoho:', error);
      throw new Error('Failed to create invoice in Zoho');
    }
  }

  /**
   * Get organization info
   */
  async getOrganizationInfo(): Promise<any> {
    const token = await this.refreshAccessToken();
    
    try {
      const response = await fetch(
        `${this.apiDomain}/books/v3/organizations?organization_id=${this.organizationId}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch organization info: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.code !== 0) {
        throw new Error(`Zoho API error: ${data.message}`);
      }

      return data.organization;
    } catch (error) {
      console.error('Error fetching organization info:', error);
      throw new Error('Failed to fetch organization info from Zoho');
    }
  }
}

// Create singleton instance
let zohoAPIInstance: ZohoAPI | null = null;

export function getZohoAPI(): ZohoAPI {
  if (!zohoAPIInstance) {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    const organizationId = process.env.ZOHO_ORGANIZATION_ID;

    if (!clientId || !clientSecret || !refreshToken || !organizationId) {
      throw new Error('Zoho API credentials not configured');
    }

    zohoAPIInstance = new ZohoAPI(
      clientId,
      clientSecret,
      refreshToken,
      organizationId
    );
  }

  return zohoAPIInstance;
}

export { ZohoAPI };
export type { ZohoSalesOrder, ZohoLineItem, ZohoInvoiceResponse };
