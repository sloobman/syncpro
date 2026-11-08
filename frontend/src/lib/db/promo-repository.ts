import { query } from "./postgres";
import { SubscriptionRepository, SubscriptionPlan } from "./subscription-repository";

export interface PromoCodeRow {
  id: string;
  code: string;
  plan: SubscriptionPlan;
  duration_days: number;
  max_uses: number | null;
  times_used: number;
  is_active: boolean;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
}

export class PromoRepository {
  private static tableEnsured = false;

  static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS promo_codes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(64) UNIQUE NOT NULL,
          plan VARCHAR(32) NOT NULL DEFAULT 'pro',
          duration_days INTEGER NOT NULL DEFAULT 30,
          max_uses INTEGER,
          times_used INTEGER NOT NULL DEFAULT 0,
          is_active BOOLEAN NOT NULL DEFAULT true,
          expires_at TIMESTAMPTZ,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

        CREATE TABLE IF NOT EXISTS promo_code_redemptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(promo_code_id, user_id)
        );
        CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_code_redemptions(user_id);
      `);
      this.tableEnsured = true;
    } catch (err) {
      console.warn("[PromoRepository] ensureTable notice:", (err as Error).message);
    }
  }

  static async createPromoCode(data: {
    code: string;
    plan?: SubscriptionPlan;
    durationDays?: number;
    maxUses?: number | null;
    expiresAt?: Date | null;
    createdBy?: string | null;
  }): Promise<PromoCodeRow> {
    await this.ensureTable();

    const cleanCode = data.code.trim().toUpperCase();
    const plan = data.plan || "pro";
    const durationDays = data.durationDays || 30;
    const maxUses = data.maxUses && data.maxUses > 0 ? data.maxUses : null;
    const expiresAt = data.expiresAt ? data.expiresAt.toISOString() : null;

    const res = await query<PromoCodeRow>(
      `INSERT INTO promo_codes (code, plan, duration_days, max_uses, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, code, plan, duration_days, max_uses, times_used, is_active, expires_at, created_by, created_at`,
      [cleanCode, plan, durationDays, maxUses, expiresAt, data.createdBy || null]
    );

    return res.rows[0];
  }

  static async listPromoCodes(): Promise<PromoCodeRow[]> {
    await this.ensureTable();
    const res = await query<PromoCodeRow>(
      `SELECT id, code, plan, duration_days, max_uses, times_used, is_active, expires_at, created_by, created_at
       FROM promo_codes
       ORDER BY created_at DESC`
    );
    return res.rows;
  }

  static async togglePromoCode(id: string, isActive: boolean): Promise<boolean> {
    await this.ensureTable();
    const res = await query(
      `UPDATE promo_codes SET is_active = $1 WHERE id = $2`,
      [isActive, id]
    );
    return (res.rowCount ?? 0) > 0;
  }

  static async deletePromoCode(id: string): Promise<boolean> {
    await this.ensureTable();
    const res = await query(`DELETE FROM promo_codes WHERE id = $1`, [id]);
    return (res.rowCount ?? 0) > 0;
  }

  /**
   * Redeems a promo code for a given user with atomic concurrency guarantees (SEC-04).
   */
  static async redeemPromoCode(
    userId: string,
    rawCode: string
  ): Promise<{
    success: boolean;
    error?: string;
    plan?: SubscriptionPlan;
    expiresAt?: string;
    durationDays?: number;
  }> {
    await this.ensureTable();

    const cleanCode = (rawCode || "").trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: "Введите промокод" };
    }

    const res = await query<PromoCodeRow>(
      `SELECT id, code, plan, duration_days, max_uses, times_used, is_active, expires_at
       FROM promo_codes
       WHERE code = $1
       LIMIT 1`,
      [cleanCode]
    );

    const promo = res.rows[0];
    if (!promo) {
      return { success: false, error: "Промокод не найден" };
    }

    if (!promo.is_active) {
      return { success: false, error: "Этот промокод деактивирован" };
    }

    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return { success: false, error: "Срок действия этого промокода истек" };
    }

    // Check if user already redeemed this promo
    const redemptionCheck = await query(
      `SELECT id FROM promo_code_redemptions WHERE promo_code_id = $1 AND user_id = $2`,
      [promo.id, userId]
    );
    if (redemptionCheck.rows.length > 0) {
      return { success: false, error: "Вы уже активировали этот промокод ранее" };
    }

    // Atomic increment conditional on max_uses (SEC-04: Race Condition prevention)
    const atomicInc = await query<{ times_used: number }>(
      `UPDATE promo_codes
       SET times_used = times_used + 1
       WHERE id = $1
         AND is_active = true
         AND (expires_at IS NULL OR expires_at > NOW())
         AND (max_uses IS NULL OR times_used < max_uses)
       RETURNING times_used`,
      [promo.id]
    );

    if (atomicInc.rows.length === 0) {
      return {
        success: false,
        error: "Лимит активаций этого промокода исчерпан или промокод более не активен",
      };
    }

    // Record redemption
    try {
      await query(
        `INSERT INTO promo_code_redemptions (promo_code_id, user_id)
         VALUES ($1, $2)`,
        [promo.id, userId]
      );
    } catch {
      // Rollback increment on duplicate redemption
      await query(`UPDATE promo_codes SET times_used = times_used - 1 WHERE id = $1`, [promo.id]);
      return { success: false, error: "Вы уже активировали этот промокод ранее" };
    }

    // Calculate new expiration date
    const currentSubDetails = await SubscriptionRepository.getSubscription(userId);
    const currentSub = currentSubDetails.subscription;

    let baseTime = Date.now();
    if (
      currentSub.status === "active" &&
      currentSub.plan === promo.plan &&
      currentSub.expires_at &&
      new Date(currentSub.expires_at).getTime() > Date.now()
    ) {
      // Extend existing unexpired subscription
      baseTime = new Date(currentSub.expires_at).getTime();
    }

    const newExpiry = new Date(baseTime + promo.duration_days * 24 * 60 * 60 * 1000);

    // Update user's subscription
    await SubscriptionRepository.updateSubscription(userId, {
      plan: promo.plan,
      status: "active",
      expiresAt: newExpiry,
    });

    return {
      success: true,
      plan: promo.plan,
      durationDays: promo.duration_days,
      expiresAt: newExpiry.toISOString(),
    };
  }
}
