import axios from "axios";
import { ProviderAdapter, ProviderServiceInfo, ProviderOrderStatus } from "./providerAdapter";

export class PeakerrProvider implements ProviderAdapter {
  constructor(private apiKey: string, private baseUrl: string) {}

  async getServices(): Promise<ProviderServiceInfo[]> {
    const response = await axios.get(`${this.baseUrl}/services`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.data.services.map((item: any) => ({
      providerServiceId: item.service_id,
      cost: Number(item.price),
      min: Number(item.min),
      max: Number(item.max),
    }));
  }

  async placeOrder(providerServiceId: string, link: string, quantity: number) {
    const response = await axios.post(
      `${this.baseUrl}/order`,
      { service_id: providerServiceId, link, quantity },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return { providerOrderId: response.data.order_id };
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    const response = await axios.get(`${this.baseUrl}/order/${providerOrderId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return {
      status: response.data.status,
      startCount: Number(response.data.start_count || 0),
      remains: Number(response.data.remains || 0),
    };
  }

  async getBalance(): Promise<number> {
    const response = await axios.get(`${this.baseUrl}/balance`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return Number(response.data.balance || 0);
  }
}