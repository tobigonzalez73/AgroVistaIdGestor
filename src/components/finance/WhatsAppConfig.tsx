/**
 * WhatsApp Business API Configuration
 * Stores credentials in localStorage and provides the send function.
 * Uses Meta Cloud API: https://graph.facebook.com/v20.0/{phone_number_id}/messages
 */

export interface WAConfig {
    accessToken: string;
    phoneNumberId: string;
    businessName: string;
}

const WA_CONFIG_KEY = 'wa_business_config';

export function getWAConfig(): WAConfig | null {
    try {
        const raw = localStorage.getItem(WA_CONFIG_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as WAConfig;
    } catch {
        return null;
    }
}

export function saveWAConfig(config: WAConfig): void {
    localStorage.setItem(WA_CONFIG_KEY, JSON.stringify(config));
}

export function clearWAConfig(): void {
    localStorage.removeItem(WA_CONFIG_KEY);
}

/** Formats a local Argentine number to E.164 format for the API */
export function toE164(phone: string): string {
    const clean = phone.replace(/[\s\-().+]/g, '');
    if (clean.startsWith('54')) return `+${clean}`;
    if (clean.startsWith('0')) return `+54${clean.slice(1)}`;
    return `+54${clean}`;
}

export interface WASendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Sends a free-form text message via Meta Cloud API.
 * NOTE: Free-form text requires a 24-hour customer-initiated window.
 * For outbound notifications, use approved templates.
 */
export async function sendWAMessage(
    to: string,
    text: string,
    config: WAConfig
): Promise<WASendResult> {
    const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
    const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toE164(to),
        type: 'text',
        text: { body: text, preview_url: false }
    };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.accessToken}`
            },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data?.error?.message || `Error ${res.status}` };
        }
        return { success: true, messageId: data?.messages?.[0]?.id };
    } catch (err: unknown) {
        return { success: false, error: err instanceof Error ? err.message : 'Error de red' };
    }
}
