import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { FinancialEntity, Transaction, EntityBalance, Movement, Application, Currency, TransactionType } from '../types/finance';

interface FinanceContextType {
    entities: FinancialEntity[];
    transactions: Transaction[];
    movements: Movement[];
    applications: Application[];
    setEntities: React.Dispatch<React.SetStateAction<FinancialEntity[]>>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    calculateEntityBalance: (entityId: string) => EntityBalance;
    addEntity: (entity: FinancialEntity) => void;
    getNextDocumentNumber: (type: 'payment_in' | 'payment_out') => string;
    updateTransaction: (id: string, updated: Transaction) => void;
    deleteTransaction: (id: string) => void;
    updateEntity: (id: string, updated: FinancialEntity) => void;
    deleteEntity: (id: string) => void;
    convertBalance: (entityId: string, fromCurrency: Currency, toCurrency: Currency, amount: number, rate: number) => void;
    applyApplication: (sourceTxId: string, destTxId: string, amount: number, rate?: number) => void;
    removeApplicationByMovement: (movementId: string) => void;
    getTransactionBalance: (txId: string) => number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {


    const [entities, setEntities] = useState<FinancialEntity[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);

    // Sync from Firestore instead of localStorage
    useEffect(() => {
        const unsubscribeEntities = onSnapshot(collection(db, 'entities'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as FinancialEntity));
            setEntities(data);
        });
        const unsubscribeTransactions = onSnapshot(collection(db, 'transactions'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Transaction));
            setTransactions(data);
        });

        const unsubscribeApps = onSnapshot(collection(db, 'fin_applications'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Application));
            setApplications(data);
        });

        return () => {
            unsubscribeEntities();
            unsubscribeTransactions();
            unsubscribeApps();
        };
    }, []);

    // Automatically generate movements from transactions
    const movements = useMemo(() => {
        const movs: Movement[] = [];
        const runningBalances: Record<string, Record<Currency, number>> = {};

        // Sort transactions by date and type (invoices before payments)
        const sortedTransactions = [...transactions].sort((a, b) => {
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            const typeWeight = (t: TransactionType) => t.includes('invoice') ? 0 : 1;
            return typeWeight(a.type) - typeWeight(b.type);
        });

        sortedTransactions.forEach(tx => {
            if (!runningBalances[tx.entityId]) {
                runningBalances[tx.entityId] = { ARS: 0, USD_DIVISA: 0, USD_BILLETE: 0 };
            }

            const isNC = tx.documentSubtype === 'nota_credito' || (tx.documentNumber || '').toUpperCase().startsWith('NC');
            const absAmount = Math.abs(tx.amount);
            let debit = 0;
            let credit = 0;

            // ERP Rules:
            // invoice_out (sale): debit (debt)
            // invoice_in (purchase): credit (debt)
            // payment_in (collection): credit (reduces debt)
            // payment_out (payment): debit (reduces debt)
            // NC on sale: credit
            // NC on purchase: debit

            if (tx.type === 'invoice_out') {
                if (isNC) credit = absAmount;
                else debit = absAmount;
            } else if (tx.type === 'invoice_in') {
                if (isNC) debit = absAmount;
                else credit = absAmount;
            } else if (tx.type === 'payment_in') {
                credit = absAmount;
            } else if (tx.type === 'payment_out') {
                debit = absAmount;
            } else if (tx.type === 'currency_swap' && tx.targetCurrency) {
                // Currency swap: original amount is a "debit" (reduces favor in source)
                // and target amount is a "credit" in target currency (creates favor in target)
                debit = absAmount;
            }

            const effect = debit - credit;
            runningBalances[tx.entityId][tx.currency] += effect;

            movs.push({
                id: `mov-${tx.id}`,
                entityId: tx.entityId,
                transactionId: tx.id,
                date: tx.date,
                description: tx.description,
                debit,
                credit,
                currency: tx.currency,
                exchangeRate: tx.exchangeRate,
                amountARS: tx.amountARS,
                balance: runningBalances[tx.entityId][tx.currency]
            });

            // If it's a swap, generate the second leg
            if (tx.type === 'currency_swap' && tx.targetCurrency && tx.targetAmount) {
                if (!runningBalances[tx.entityId][tx.targetCurrency]) {
                    runningBalances[tx.entityId][tx.targetCurrency] = 0;
                }
                runningBalances[tx.entityId][tx.targetCurrency] -= tx.targetAmount;

                movs.push({
                    id: `mov-${tx.id}-target`,
                    entityId: tx.entityId,
                    transactionId: tx.id,
                    date: tx.date,
                    description: `Pase de Moneda (${tx.currency} → ${tx.targetCurrency})`,
                    debit: 0,
                    credit: tx.targetAmount,
                    currency: tx.targetCurrency,
                    exchangeRate: tx.exchangeRate,
                    amountARS: tx.amountARS,
                    balance: runningBalances[tx.entityId][tx.targetCurrency]
                });
            }
        });

        return movs;
    }, [transactions]);

    const calculateEntityBalance = (entityId: string): EntityBalance => {
        const entityMovs = movements.filter(m => m.entityId === entityId);
        
        const latestARS = entityMovs.filter(m => m.currency === 'ARS').slice(-1)[0]?.balance || 0;
        const latestDivisa = entityMovs.filter(m => m.currency === 'USD_DIVISA').slice(-1)[0]?.balance || 0;
        const latestBillete = entityMovs.filter(m => m.currency === 'USD_BILLETE').slice(-1)[0]?.balance || 0;

        // "Available" means credits that haven't been applied yet
        const calculateAvailable = (curr: Currency) => {
            const totalCredits = entityMovs.filter(m => m.currency === curr).reduce((acc, m) => acc + m.credit, 0);
            const totalApplied = applications.filter(a => a.currency === curr && a.movementOrigenId.startsWith('mov-')).reduce((acc, a) => acc + a.amountApplied, 0);
            // This is simplified; professional ERP would track per-movement remaining
            return totalCredits - totalApplied;
        };

        return {
            ARS: latestARS,
            USD_DIVISA: latestDivisa,
            USD_BILLETE: latestBillete,
            availableARS: calculateAvailable('ARS'),
            availableUSD_DIVISA: calculateAvailable('USD_DIVISA'),
            availableUSD_BILLETE: calculateAvailable('USD_BILLETE')
        };
    };

    const addEntity = async (entity: FinancialEntity) => {
        const id = entity.id || doc(collection(db, 'entities')).id;
        await setDoc(doc(db, 'entities', id), { ...entity, id }, { merge: true });
    };

    const getNextDocumentNumber = (type: 'payment_in' | 'payment_out'): string => {
        const prefix = type === 'payment_in' ? 'RC' : 'PG';
        const relevantTxs = transactions.filter(t => t.type === type && t.documentNumber.startsWith(prefix));
        const numbers = relevantTxs.map(t => parseInt(t.documentNumber.split('-')[1] || '0', 10)).filter(n => !isNaN(n));
        const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
        return `${prefix}-${String(nextNum).padStart(6, '0')}`;
    };

    const updateTransaction = async (id: string, updated: Transaction) => {
        await setDoc(doc(db, 'transactions', id), updated, { merge: true });
    };

    const deleteTransaction = async (id: string) => {
        // Integrity Check: Is this TX linked anywhere?
        const isLinked = applications.some(a => {
            const m1 = movements.find(m => m.id === a.movementOrigenId);
            const m2 = movements.find(m => m.id === a.movementDestinoId);
            return m1?.transactionId === id || m2?.transactionId === id;
        }) || transactions.some(t => 
            (t.id !== id && t.settlements?.some(s => s.invoiceId === id)) || 
            (t.id === id && (t.settlements?.length || 0) > 0)
        );

        if (isLinked) {
            alert('🚫 ACCIÓN BLOQUEADA: Este comprobante tiene vinculaciones activas. Debes desvincularlo (abrir el candado 🔓) en el Estado de Cuenta antes de poder eliminarlo.');
            return;
        }

        if (window.confirm('⚠️ ¿Estás seguro de que deseas eliminar este comprobante? Los saldos se recalculen y no quedará rastro en el sistema.')) {
            await deleteDoc(doc(db, 'transactions', id));
        }
    };


    const removeApplicationByMovement = (movementId: string) => {
        setApplications(prev => prev.filter(a => a.movementOrigenId !== movementId && a.movementDestinoId !== movementId));
    };

    const convertBalance = (entityId: string, fromCurrency: Currency, toCurrency: Currency, amount: number, rate: number) => {
        const tx: Transaction = {
            id: doc(collection(db, 'transactions')).id,
            entityId,
            date: new Date().toISOString().split('T')[0],
            type: 'currency_swap',
            currency: fromCurrency,
            targetCurrency: toCurrency,
            amount: amount,
            targetAmount: amount / rate, // For example, if rate is 1000 ARS/USD, and amount is 1000 ARS, target is 1 USD
            amountARS: fromCurrency === 'ARS' ? amount : (amount * rate),
            exchangeRate: rate,
            documentNumber: `SWAP-${Math.random().toString(36).substring(7).toUpperCase()}`,
            description: `Conversión ${fromCurrency} → ${toCurrency}`,
            status: 'completed'
        };
        setTransactions(prev => [tx, ...prev]);
    };

    const applyApplication = (sourceTxId: string, destTxId: string, amount: number, rate?: number) => {
        const sourceMov = movements.find(m => m.transactionId === sourceTxId);
        const destMov = movements.find(m => m.transactionId === destTxId);
        
        if (!sourceMov || !destMov) return;

        const newApp: Application = {
            id: doc(collection(db, 'fin_applications')).id,
            movementOrigenId: sourceMov.id,
            movementDestinoId: destMov.id,
            amountApplied: amount,
            exchangeRateApplied: rate,
            currency: sourceMov.currency,
            date: new Date().toISOString().split('T')[0]
        };

        setApplications(prev => {
            const nextApps = [...prev, newApp];
            // Save to Firestore
            setDoc(doc(db, 'fin_applications', newApp.id), newApp, { merge: true });
            return nextApps;
        });
    };

    const getTransactionBalance = (txId: string): number => {
        const tx = transactions.find(t => t.id === txId);
        if (!tx) return 0;

        // 1. Contributions from settlements (in other transactions)
        const settledAmount = transactions.reduce((acc, other) => {
            const s = other.settlements?.find(s => s.invoiceId === txId);
            return acc + (s?.amountApplied || 0);
        }, 0);

        // 2. Contributions from applications
        const appsAsDest = applications
            .filter(a => movements.find(m => m.id === a.movementDestinoId)?.transactionId === txId)
            .reduce((acc, a) => acc + a.amountApplied, 0);
            
        const appsAsSource = applications
            .filter(a => movements.find(m => m.id === a.movementOrigenId)?.transactionId === txId)
            .reduce((acc, a) => acc + a.amountApplied, 0);

        // Total Used = Money already pushed from this credit to others + Money already pulled from others to this debit
        return Math.max(0, Math.abs(tx.amount) - settledAmount - appsAsDest - appsAsSource);
    };

    return (
        <FinanceContext.Provider value={{
            entities, setEntities,
            transactions, setTransactions,
            movements,
            applications,
            calculateEntityBalance,
            addEntity,
            getNextDocumentNumber,
            updateTransaction,
            deleteTransaction,
            updateEntity: async (id: string, updated: FinancialEntity) => {
                await updateDoc(doc(db, 'entities', id), updated as any);
            },
            deleteEntity: async (id: string) => {
                const entity = entities.find(e => e.id === id);
                if (!entity) return;
                
                const hasTransactions = transactions.some(t => t.entityId === id);
                if (hasTransactions) {
                    if (window.confirm('Este cliente/proveedor tiene movimientos asociados. Se marcará como INACTIVO en lugar de eliminarse permanentemente. ¿Continuar?')) {
                        await updateDoc(doc(db, 'entities', id), { isActive: false });
                    }
                } else {
                    if (window.confirm('¿Estás seguro de que deseas eliminar este contacto permanentemente?')) {
                        await deleteDoc(doc(db, 'entities', id));
                    }
                }
            },
            convertBalance,
            applyApplication,
            removeApplicationByMovement,
            getTransactionBalance
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (context === undefined) throw new Error('useFinance must be used within a FinanceProvider');
    return context;
};
