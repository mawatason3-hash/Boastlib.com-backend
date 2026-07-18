export interface ProviderServiceInfo {
  providerServiceId: string;
  cost: number;
  min: number;
  max: number;
  speedEstimate?: string;
  avgTimeMinutes?: number;
  guaranteed?: boolean;
  dripFeedEnabled?: boolean;
  startTimeEstimate?: string;
}

export interface ProviderOrderStatus {
  status: string;
  startCount: number;
  remains: number;
}

export interface ProviderAdapter {
  getServices(): Promise<ProviderServiceInfo[]>;
  placeOrder(providerServiceId: string, link: string, quantity: number): Promise<{ providerOrderId: string }>;
  getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus>;
  getBalance(): Promise<number>;
}
