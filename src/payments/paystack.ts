import axios from "axios";
import crypto from "crypto";

type PaystackInitResponse = {
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};

type PaystackVerifyResponse = {
  data: {
    status: string;
    reference: string;
    amount: number;
    customer: { email: string };
  };
};

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
const paystackClient = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

export const initCardPayment = async (amount: number, email: string) => {
  const response = await paystackClient.post<PaystackInitResponse>("/transaction/initialize", {
    email,
    amount: Math.round(amount * 100),
  });
  return response.data.data;
};

export const verifyPayment = async (reference: string) => {
  const response = await paystackClient.get<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
  return response.data.data;
};

export const verifyPaystackSignature = (signature: string, payload: string) => {
  const secret = PAYSTACK_SECRET_KEY;
  const hash = crypto.createHmac("sha512", secret).update(payload).digest("hex");
  return signature === hash;
};
