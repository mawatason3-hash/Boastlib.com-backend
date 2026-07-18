import axios from "axios";

const DPO_API_KEY = process.env.DPO_API_KEY || "";
const dpoClient = axios.create({
  baseURL: "https://api.dpo.example",
  headers: {
    Authorization: `Bearer ${DPO_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export const initMobileMoneyPayment = async (amount: number, phone: string, country: string) => {
  const response = await dpoClient.post("/payments/initiate", {
    amount,
    phone,
    country,
    method: "mobile_money",
  });
  return response.data;
};

export const verifyPayment = async (reference: string) => {
  const response = await dpoClient.get(`/payments/verify/${reference}`);
  return response.data;
};
