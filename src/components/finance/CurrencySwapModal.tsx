import { useState } from 'react';
import { X, RefreshCcw, ArrowRight, Info } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import type { Currency } from '../../types/finance';

interface Props {
    entityId: string;
    onClose: () => void;
    initialSourceCurrency?: Currency;
    initialAmount?: number;
    initialSourceId?: string;
}

export default function CurrencySwapModal({ entityId, onClose, initialSourceCurrency, initialAmount, initialSourceId }: Props) {
    const { entities, calculateEntityBalance, setTransactions } = useFinance();
    const entity = entities.find(e => e.id === entityId);
    const balance = calculateEntityBalance(entityId);

    const [sourceCurrency, setSourceCurrency] = useState<Currency>(initialSourceCurrency || 'ARS');
    const [targetCurrency, setTargetCurrency] = useState<Currency>(
        sourceCurrency === 'ARS' ? 'USD_DIVISA' :
            sourceCurrency === 'USD_DIVISA' ? 'ARS' : 'USD_DIVISA'
    );
    const [swapAmount, setSwapAmount] = useState<number>(initialAmount || 0);
    const [exchangeRate, setExchangeRate] = useState<number>(1000);
    const [description, setDescription] = useState('Imputación por Moneda');

    if (!entity) return null;

    const sourceBalance = balance[sourceCurrency];
    const targetAmount = sourceCurrency === 'ARS'
        ? Number((-(swapAmount / exchangeRate)).toFixed(2))
        : Number((-(swapAmount * exchangeRate)).toFixed(2));

    const handleSwap = (e: React.FormEvent) => {
        e.preventDefault();

        if (swapAmount <= 0) {
            alert('Ingrese un monto válido a transferir.');
            return;
        }

        const swapTx = {
            id: doc(collection(db, 'transactions')).id,
            entityId,
            date: new Date().toISOString().split('T')[0],
            type: 'currency_swap' as const,
            currency: sourceCurrency,
            amount: swapAmount, // Reduction of credit in source (positive)
            targetCurrency,
            targetAmount, // Increase of credit in target (negative)
            exchangeRate,
            amountARS: sourceCurrency === 'ARS' ? swapAmount : (swapAmount * exchangeRate),
            documentNumber: `PASE-${Math.random().toString(36).substring(7).toUpperCase()}`,
            description: `${description} (TC: $${exchangeRate.toLocaleString()})`,
            status: 'completed' as const,
            relatedTransactionIds: initialSourceId ? [initialSourceId] : []
        };

        setTransactions(prev => [...prev, swapTx]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                <form onSubmit={handleSwap}>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
                        <h3 className="font-black text-indigo-800 dark:text-indigo-100 uppercase tracking-tight flex items-center gap-2">
                            <RefreshCcw className="w-5 h-5" /> Pase de Monedas
                        </h3>
                        <button type="button" onClick={onClose} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                Use esta función para convertir saldos a favor (créditos) de una moneda a otra.
                                El monto en el origen se <span className="font-black">descontará</span> y se <span className="font-black">acreditará</span> en el destino.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Origen</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                                    value={sourceCurrency}
                                    onChange={e => setSourceCurrency(e.target.value as Currency)}
                                >
                                    <option value="ARS">Pesos (ARS)</option>
                                    <option value="USD_DIVISA">USD Divisa</option>
                                    <option value="USD_BILLETE">USD Billete</option>
                                </select>
                                <p className="text-[10px] font-bold text-slate-400 ml-1">
                                    Saldo actual: <span className={sourceBalance < 0 ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-400'}>
                                        {sourceCurrency === 'ARS' ? '$' : 'U$D'} {sourceBalance.toLocaleString()}
                                    </span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destino</label>
                                <select
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 border-2 border-indigo-200 dark:border-indigo-900 rounded-xl font-bold text-indigo-700 dark:text-indigo-300"
                                    value={targetCurrency}
                                    onChange={e => setTargetCurrency(e.target.value as Currency)}
                                >
                                    <option value="ARS">Pesos (ARS)</option>
                                    <option value="USD_DIVISA">USD Divisa</option>
                                    <option value="USD_BILLETE">USD Billete</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Monto a Transferir (Origen)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full pl-10 pr-4 py-4 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-2xl font-black text-2xl text-slate-900 dark:text-slate-100 focus:border-indigo-500 transition-all outline-none"
                                    value={swapAmount || ''}
                                    onChange={e => setSwapAmount(parseFloat(e.target.value))}
                                    placeholder="0.00"
                                    autoFocus
                                />
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl">
                                    {sourceCurrency === 'ARS' ? '$' : 'U$D'}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 items-center">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Cambio</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:border-indigo-500 outline-none"
                                    value={exchangeRate}
                                    onChange={e => setExchangeRate(parseFloat(e.target.value))}
                                />
                            </div>
                            <div className="flex flex-col items-center">
                                <ArrowRight className="w-5 h-5 text-slate-300 mb-1" />
                                <div className="text-center">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A acreditar en destino</p>
                                    <p className="font-black text-xl text-emerald-600">
                                        {targetCurrency === 'ARS' ? '$' : 'U$D'} {Math.abs(targetAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Referencia / Motivo</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-slate-100"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="p-8 bg-slate-50 dark:bg-slate-800/30 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCcw className="w-4 h-4" /> Confirmar Pase
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
