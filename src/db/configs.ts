/** თვიური საწყისი ბალანსი (`monthly_configs`) */

export async function getStartingBalance(
  db: D1Database,
  monthId: string,
): Promise<number | null> {
  const row = await db
    .prepare('SELECT starting_balance FROM monthly_configs WHERE month_id = ?')
    .bind(monthId)
    .first<{ starting_balance: number }>()

  return row ? Number(row.starting_balance) : null
}

export async function saveStartingBalance(
  db: D1Database,
  monthId: string,
  balance: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO monthly_configs (month_id, starting_balance)
       VALUES (?, ?)
       ON CONFLICT(month_id) DO UPDATE SET starting_balance = excluded.starting_balance`,
    )
    .bind(monthId, balance)
    .run()
}
