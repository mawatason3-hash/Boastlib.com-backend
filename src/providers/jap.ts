import axios from "axios";
import { ProviderAdapter, ProviderServiceInfo, ProviderOrderStatus } from "./providerAdapter";

export class JapProvider implements ProviderAdapter {
  constructor(private apiKey: string, private baseUrl: string) {}

  async getServices(): Promise<ProviderServiceInfo[]> {
    const response = await axios.get(`${this.baseUrl}/services`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return response.data.services.map((item: any) => ({
      providerServiceId: item.id,
      cost: Number(item.cost),
      min: Number(item.min),
      max: Number(item.max),
      speedEstimate: item.speed_estimate,
      avgTimeMinutes: item.avg_time_minutes !== undefined ? Number(item.avg_time_minutes) : undefined,
      guaranteed: Boolean(item.guaranteed),
      dripFeedEnabled: Boolean(item.drip_feed_enabled),
      startTimeEstimate: item.start_time_estimate,
    }));
  }

  async placeOrder(providerServiceId: string, link: string, quantity: number) {
    const response = await axios.post(
      `${this.baseUrl}/orders`,
      { service_id: providerServiceId, link, quantity },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );
    return { providerOrderId: response.data.order_id };
  }

  async getOrderStatus(providerOrderId: string): Promise<ProviderOrderStatus> {
    const response = await axios.get(`${this.baseUrl}/orders/${providerOrderId}`, {
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
