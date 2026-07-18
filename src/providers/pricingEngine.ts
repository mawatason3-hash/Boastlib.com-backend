import { query } from "../db";

export const recalculateServicePrice = async (serviceId: string) => {
  const mappingResult = await query(
    `SELECT m.id, m.provider_id, m.cost_price, m.priority_override, m.service_id
       FROM service_provider_mappings m
       WHERE m.service_id = $1 AND m.is_active_provider = false`,
    [serviceId]
  );

  const allMappingsResult = await query(
    `SELECT m.id, m.provider_id, m.cost_price, m.priority_override
       FROM service_provider_mappings m
       WHERE m.service_id = $1`,
    [serviceId]
  );

  if (allMappingsResult.rowCount === 0) {
    return;
  }

  const mappings = allMappingsResult.rows;
  let selected = mappings[0];

  const priority = mappings.find((m: any) => m.priority_override);
  if (priority) {
    selected = priority;
  } else {
    selected = mappings.reduce((prev: any, current: any) => {
      return Number(current.cost_price) < Number(prev.cost_price) ? current : prev;
    }, mappings[0]);
  }

  await query(
    `UPDATE service_provider_mappings
       SET is_active_provider = CASE WHEN id = $1 THEN true ELSE false END
       WHERE service_id = $2`,
    [selected.id, serviceId]
  );

  const ratePer1000 = Number(selected.cost_price) * 1.4;
  await query(
    `UPDATE services
       SET active_provider_id = $1,
           rate_per_1000 = $2
       WHERE id = $3`,
    [selected.provider_id, ratePer1000, serviceId]
  );
};

export const handleProviderFailover = async (providerId: string) => {
  const servicesResult = await query(
    `SELECT s.id
       FROM services s
       WHERE s.active_provider_id = $1`,
    [providerId]
  );

  for (const row of servicesResult.rows) {
    await recalculateServicePrice(row.id);
    await query(
      `INSERT INTO transactions (user_id, type, amount, gateway, gateway_ref, balance_after, status)
         VALUES (NULL, 'system_failover', 0, 'system', $1, NULL, 'completed')`,
      [providerId]
    );
  }
};
