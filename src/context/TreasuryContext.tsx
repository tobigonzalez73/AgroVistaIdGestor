import React, { createContext, useContext, useState } from 'react';
import type { BankAccount, TreasuryMovement, Cheque } from '../types/treasury';
import { useAudit } from './AuditContext';
import { useAuth } from './UserContext';

interface TreasuryContextType {
    accounts: BankAccount[];
    movements: TreasuryMovement[];
    cheques: Cheque[];

    setAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
    setMovements: React.Dispatch<React.SetStateAction<TreasuryMovement[]>>;
    setCheques: React.Dispatch<React.SetStateAction<Cheque[]>>;

    addAccount: (acc: BankAccount) => void;
    updateAccount: (id: string, updates: Partial<BankAccount>) => void;
    addMovement: (movement: TreasuryMovement) => void;
    addCheque: (cheque: Cheque) => void;
    updateChequeStatus: (chequeId: string, status: Cheque['status'], entityId?: string) => void;
}

const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

// Mock Initial Data
const MOCK_ACCOUNTS: BankAccount[] = [
    { id: 'acc-cash-1', name: 'Caja Efectivo (Pesos)', type: 'cash', currency: 'ARS', balance: 1500000 },
    { id: 'acc-cash-2', name: 'Caja efectivo (dolares)', type: 'cash', currency: 'USD_DIVISA', balance: 5000 },
    {
        id: 'acc-bank-1',
        name: 'Banco Galicia (Cuenta Corriente)',
        type: 'bank',
        currency: 'ARS',
        balance: 3200000,
        cbu: '0070012345678901234567',
        alias: 'AGRO.VISTA.GAL',
        cuit: '30-12345678-9',
        bankName: 'Banco Galicia'
    },
    { id: 'acc-cheque-1', name: 'Valores a Depositar (Cheques)', type: 'cheque', currency: 'ARS', balance: 750000 },
];

const MOCK_CHEQUES: Cheque[] = [
    {
        id: 'chk-1',
        number: '12345678',
        bankInfo: 'Banco Santander',
        type: 'third_party',
        isECheq: false,
        issueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 350000,
        status: 'en_cartera',
        receivedFromId: 'cli-1',
        holder: 'Juan Pérez'
    },
    {
        id: 'chk-own-1',
        number: '00000123',
        bankInfo: 'Banco Galicia (Cuenta Corriente)',
        type: 'own',
        isECheq: true,
        issueDate: new Date().toISOString().split('T')[0],
        paymentDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 120000,
        status: 'entregado',
        bankAccountId: 'acc-bank-1',
        givenToId: 'sup-1'
    }
];

export const TreasuryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_ACCOUNTS);
    const [movements, setMovements] = useState<TreasuryMovement[]>([]);
    const [cheques, setCheques] = useState<Cheque[]>(MOCK_CHEQUES);
    const { logAction } = useAudit();
    const { currentUser } = useAuth();

    const addAccount = (acc: BankAccount) => {
        setAccounts(prev => [...prev, acc]);
        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'create',
            module: 'tesoreria',
            entityId: acc.id,
            entityName: acc.name,
            details: `Se creó la cuenta/caja: ${acc.name} (${acc.currency})`
        });
    };

    const updateAccount = (id: string, updates: Partial<BankAccount>) => {
        setAccounts(prev => prev.map(acc => {
            if (acc.id === id) {
                const accName = acc.name;
                logAction({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    action: 'update',
                    module: 'tesoreria',
                    entityId: id,
                    entityName: accName,
                    details: `Se actualizaron datos de la cuenta ${accName}. Cambios: ${JSON.stringify(updates)}`
                });
                return { ...acc, ...updates };
            }
            return acc;
        }));
    };

    const addMovement = (movement: TreasuryMovement) => {
        setMovements(prev => [movement, ...prev]);
        const acc = accounts.find(a => a.id === movement.accountId);
        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'create',
            module: 'tesoreria',
            entityId: movement.accountId,
            entityName: acc?.name || 'Cuenta',
            details: `Nuevo movimiento en ${acc?.name}: ${movement.description} por ${movement.amount}`
        });

        // Auto-update the balance of the affected account
        setAccounts(prevAccs => prevAccs.map(acc => {
            if (acc.id === movement.accountId) {
                return { ...acc, balance: acc.balance + movement.amount };
            }
            return acc;
        }));
    };

    const addCheque = (cheque: Cheque) => {
        setCheques(prev => [cheque, ...prev]);
        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'create',
            module: 'tesoreria',
            entityId: cheque.id,
            entityName: `Cheque #${cheque.number}`,
            details: `Ingreso de cheque ${cheque.type === 'own' ? 'propio' : 'de terceros'} #${cheque.number} - ${cheque.bankInfo} por ${cheque.amount}`
        });

        // Only update 'Valores a depositar' if it's a third-party cheque coming EN_CARTERA
        if (cheque.type === 'third_party' && cheque.status === 'en_cartera') {
            setAccounts(prev => prev.map(acc => {
                if (acc.type === 'cheque' && acc.currency === 'ARS') {
                    return { ...acc, balance: acc.balance + cheque.amount };
                }
                return acc;
            }));
        }
    };

    const updateChequeStatus = (chequeId: string, status: Cheque['status'], entityId?: string) => {
        const chkAtMoment = cheques.find(c => c.id === chequeId);
        setCheques(prev => prev.map(chk => {
            if (chk.id === chequeId) {
                logAction({
                    userId: currentUser.id,
                    userName: currentUser.name,
                    action: 'update',
                    module: 'tesoreria',
                    entityId: chequeId,
                    entityName: `Cheque #${chk.number}`,
                    details: `Cambio de estado del cheque #${chk.number}: ${chk.status} -> ${status}`
                });
                const updated = { ...chk, status };
                if (status === 'entregado' && entityId) {
                    updated.givenToId = entityId;
                }
                return updated;
            }
            return chk;
        }));

        // Adjust 'Valores a depositar' balance if it's leaving the wallet
        const chk = chkAtMoment;
        if (chk && chk.type === 'third_party' && chk.status === 'en_cartera') {
            if (status === 'depositado' || status === 'entregado' || status === 'rechazado' || status === 'anulado') {
                setAccounts(prev => prev.map(acc => {
                    if (acc.type === 'cheque' && acc.currency === 'ARS') {
                        return { ...acc, balance: acc.balance - chk.amount };
                    }
                    return acc;
                }));
            }
        }
    };

    return (
        <TreasuryContext.Provider value={{
            accounts, setAccounts,
            movements, setMovements,
            cheques, setCheques,
            addAccount, updateAccount, addMovement, addCheque, updateChequeStatus
        }}>
            {children}
        </TreasuryContext.Provider>
    );
};

export const useTreasury = () => {
    const context = useContext(TreasuryContext);
    if (!context) throw new Error('useTreasury must be used within a TreasuryProvider');
    return context;
};
