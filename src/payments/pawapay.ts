import axios from "axios";

const PAWAPAY_API_KEY = process.env.PAWAPAY_API_KEY || "";
const pawapayClient = axios.create({
  baseURL: "https://api.pawapay.example",
  headers: {
    Authorization: `Bearer ${PAWAPAY_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export const initMobileMoneyPayment = async (amount: number, phone: string, country: string) => {
  const response = await pawapayClient.post("/payments/initiate", {
    amount,
    phone,
    country,
    method: "mobile_money",
  });
  return response.data;
};

export const verifyPayment = async (reference: string) => {
  const response = await pawapayClient.get(`/payments/verify/${reference}`);
  return response.data;
};
