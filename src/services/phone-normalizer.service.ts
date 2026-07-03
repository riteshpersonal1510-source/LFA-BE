// Phone number normalization and validation for WhatsApp automation.
export type NormalizeResult = { normalizedPhone: string; isValid: boolean; reason: string };

class PhoneNormalizer {
  private INDIAN_MOBILE_PREFIXES = new Set(['6', '7', '8', '9']);
  private MAX_DIGITS = 15;

  normalize(rawPhone?: string | null): NormalizeResult {
    if (!rawPhone) return { normalizedPhone: '', isValid: false, reason: 'Empty phone number' };

    const original = String(rawPhone).trim();
    try {
      const normalized = this._normalizePhoneNumber(original);
      const { isValid, reason } = this._validateNormalizedPhone(normalized);
      return { normalizedPhone: normalized, isValid, reason };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return { normalizedPhone: '', isValid: false, reason };
    }
  }

  isValidIndianMobile(phone?: string | null): boolean {
    const { isValid } = this.normalize(phone || '');
    return isValid;
  }

  private _normalizePhoneNumber(phone: string): string {
    if (!phone) throw new Error('Empty phone number');

    let p = phone.trim();
    p = p.replace(/\s+/g, '');
    p = p.replace(/[()\-\.]/g, '');
    p = p.replace(/^\+/, '');
    // keep only digits
    const cleaned = p.replace(/\D/g, '');

    if (!cleaned) throw new Error('No digits found in phone number');

    let digits = cleaned;
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('91')) digits = digits.slice(2);

    if (digits.length === 10) {
      digits = '91' + digits;
    }

    if (digits.length < 10) throw new Error(`Too short (${digits.length} digits)`);
    if (digits.length > this.MAX_DIGITS) throw new Error(`Too long (${digits.length} digits)`);

    if (!digits.startsWith('91')) digits = '91' + digits;

    return digits;
  }

  private _validateNormalizedPhone(normalized: string): { isValid: boolean; reason: string } {
    if (!normalized) return { isValid: false, reason: 'Empty phone number' };

    if (normalized.length < 10) return { isValid: false, reason: `Too short (${normalized.length} digits)` };
    if (normalized.length > this.MAX_DIGITS) return { isValid: false, reason: `Too long (${normalized.length} digits)` };
    if (!normalized.startsWith('91')) return { isValid: false, reason: 'Must start with country code 91' };

    const digits = normalized.slice(2);
    if (digits.length !== 10) return { isValid: false, reason: `Mobile number must be 10 digits, got ${digits.length}` };

    const prefix = digits.charAt(0);
    if (!this.INDIAN_MOBILE_PREFIXES.has(prefix)) return { isValid: false, reason: `Invalid mobile prefix: ${prefix}` };

    return { isValid: true, reason: 'Valid' };
  }
}

export const phoneNormalizer = new PhoneNormalizer();