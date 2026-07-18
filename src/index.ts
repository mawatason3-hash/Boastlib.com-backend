import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import serviceRoutes from "./routes/services";
import publicServiceRoutes from "./routes/publicServices";
import statsRoutes from "./routes/stats";
import orderRoutes from "./routes/orders";
import fundsRoutes from "./routes/funds";
import transactionRoutes from "./routes/transactions";
import adminRoutes from "./routes/admin";
import adminPowerRoutes from "./routes/adminPower";
import companyRoutes from "./routes/company";
import developerRoutes from "./routes/developer";

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/funds", fundsRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin-power", adminPowerRoutes);
app.use("/api/developer", developerRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/public/services", publicServiceRoutes);

app.get("/health", (_req, res) => res.json({ status: "healthy" }));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`BoastLib backend on ${PORT}`));
