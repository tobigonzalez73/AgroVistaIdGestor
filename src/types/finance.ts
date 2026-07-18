export type Currency = 'ARS' | 'USD_DIVISA' | 'USD_BILLETE';
export type TransactionType = 'invoice_in' | 'invoice_out' | 'payment_in' | 'payment_out' | 'currency_swap';
export type EntityType = 'client' | 'supplier' | 'both';
export type TransactionStatus = 'pending' | 'paid' | 'partial' | 'completed';

export interface FinancialEntity {
    id: string;
    name: string;
    type: EntityType;
    subtype?: 'partner_employee' | 'third_party';
    email?: string;
    adminEmail?: string;
    cuit?: string;
    phone?: string;
    address?: string;
    ivaCondition?: string;
    locality?: string;
    province?: string;
    zipCode?: string;
    isActive?: boolean;
}


export interface InvoiceItem {
    id: string;
    description: string;
    inventoryItemId?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    ivaPercentage: number;
    ivaAmount: number;
}

export interface TaxDetail {
    id: string;
    name: string;
    type: 'iva' | 'retention_iibb' | 'retention_ganancias' | 'perception_iibb' | 'perception_ganancias' | 'perception_iva' | 'municipal_tax' | 'other';
    amount: number;
}

export interface Application {
    id: string;
    movementOrigenId: string; // The payment/collection/NC movement
    movementDestinoId: string; // The invoice/ND movement
    amountApplied: number;     // In the currency of the movement
    exchangeRateApplied?: number;
    currency: Currency;
    date: string;
}

export interface Movement {
    id: string;
    entityId: string;
    transactionId: string;
    date: string;
    description: string;
    debit: number;
    credit: number;
    currency: Currency;
    exchangeRate?: number;
    amountARS: number; // Equivalent in ARS at the time of movement
    balance: number;   // Cumulative balance for that entity and currency
}

export interface Transaction {
    id: string;
    entityId: string;
    date: string;
    type: TransactionType;
    currency: Currency;
    documentSubtype?: 'factura' | 'nota_debito' | 'nota_credito';
    documentNumber: string;
    description: string;
    amount: number;
    amountARS: number;
    exchangeRate?: number;
    status: TransactionStatus;
    items?: InvoiceItem[];
    taxes?: TaxDetail[];
    paymentBreakdown?: any[];
    relatedTransactionIds?: string[];
    settlements?: {
        invoiceId: string;
        amountApplied: number;
        exchangeRateApplied?: number;
    }[];
    paidByThirdPartyId?: string;
    provisionalExchangeRate?: number;
    targetCurrency?: Currency;
    targetAmount?: number;
}

export interface EntityBalance {
    ARS: number;
    USD_DIVISA: number;
    USD_BILLETE: number;
    availableARS: number;
    availableUSD_DIVISA: number;
    availableUSD_BILLETE: number;
}
