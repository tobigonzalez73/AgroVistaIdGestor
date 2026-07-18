import type { Currency } from './finance';

export type AccountType = 'cash' | 'bank' | 'cheque';

export interface BankAccount {
    id: string;
    name: string; // Ej: "Caja Fuerte", "Banco Galicia", "Valores a Depositar"
    type: AccountType;
    currency: Currency; // ARS, USD_DIVISA, USD_BILLETE
    balance: number;
    cbu?: string;
    alias?: string;
    cuit?: string;
    bankName?: string;
}

export interface TreasuryMovement {
    id: string;
    accountId: string;
    date: string;
    amount: number; // Positive for income, negative for outcome
    type: 'deposit' | 'withdrawal' | 'transfer' | 'payment_received' | 'payment_sent';
    relatedTransactionId?: string; // Link to the payment in Current Accounts
    description: string;
}

// Special model for Checks (Cartera)
export interface Cheque {
    id: string;
    number: string;
    bankInfo: string;
    type: 'own' | 'third_party';
    isECheq: boolean;
    issueDate: string;
    paymentDate: string;
    amount: number;
    status: 'en_cartera' | 'depositado' | 'rechazado' | 'entregado' | 'anulado';
    receivedFromId?: string; // Trazabilidad (Client ID)
    givenToId?: string; // If endorsed to a supplier (Supplier ID)
    bankAccountId?: string; // For OWN cheques, which bank account they belong to
    holder?: string; // For third-party cheques
}
