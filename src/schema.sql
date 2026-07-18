CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  google_id TEXT,
  balance NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'active',
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  balance NUMERIC(12,2) DEFAULT 0,
  avg_response_time INT,
  success_rate NUMERIC(5,2),
  connection_status TEXT DEFAULT 'unknown',
  last_synced TIMESTAMP
);

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  rate_per_1000 NUMERIC(10,4) NOT NULL,
  active_provider_id UUID REFERENCES providers(id),
  min_qty INT DEFAULT 100,
  max_qty INT DEFAULT 100000,
  refill_enabled BOOLEAN DEFAULT false,
  cancel_enabled BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE service_provider_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  provider_service_id TEXT NOT NULL,
  cost_price NUMERIC(10,4) NOT NULL,
  min_qty INT,
  max_qty INT,
  speed_estimate TEXT,
  avg_time_minutes INT,
  start_time_estimate TEXT,
  guaranteed BOOLEAN DEFAULT false,
  drip_feed_enabled BOOLEAN DEFAULT false,
  is_active_provider BOOLEAN DEFAULT false,
  priority_override BOOLEAN DEFAULT false
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  provider_id UUID REFERENCES providers(id),
  link TEXT NOT NULL,
  quantity INT NOT NULL,
  charge NUMERIC(10,2) NOT NULL,
  cost_at_time NUMERIC(10,4) NOT NULL,
  start_count INT DEFAULT 0,
  remains INT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  status_history JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  gateway TEXT,
  gateway_ref TEXT,
  balance_after NUMERIC(12,2),
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE developer_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issued_to TEXT NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  base_url TEXT NOT NULL,
  rate_limit INT DEFAULT 60,
  usage_count INT DEFAULT 0,
  last_used TIMESTAMP,
  status TEXT DEFAULT 'active',
  issued_by_admin_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE developer_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  credit_line TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE company_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_country TEXT NOT NULL,
  address_locality TEXT NOT NULL,
  website TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE payment_gateway_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country TEXT NOT NULL,
  method_type TEXT NOT NULL,
  gateway TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true
);

CREATE TABLE admin_power_boosts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES users(id),
  platform TEXT NOT NULL,
  service_id UUID REFERENCES services(id),
  account TEXT NOT NULL,
  quantity INT NOT NULL,
  provider_cost NUMERIC(10,4) NOT NULL,
  status TEXT DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);
