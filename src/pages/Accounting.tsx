import React, { useMemo, useState } from 'react';
import { Calculator, Receipt, TrendingDown, TrendingUp, HandCoins } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const Accounting: React.FC = () => {
    const { transactions } = useFinance();
    const [selectedMonth, setSelectedMonth] = useState<string>(
        new Date().toISOString().slice(0, 7)
    );

    const taxesData = useMemo(() => {
        let ivaDebit = 0; // Ventas
        let ivaCredit = 0; // Compras
        let retentions = 0;
        let perceptions = 0;
        let other = 0;

        const filtered = transactions.filter(tx => tx.date.startsWith(selectedMonth));

        filtered.forEach(tx => {
            const rate = tx.currency !== 'ARS' ? (tx.exchangeRate || 1000) : 1;

            tx.taxes?.forEach(tax => {
                const amountARS = tax.amount * rate;
                if (tax.type === 'iva') {
                    if (tx.type === 'invoice_out') ivaDebit += amountARS;
                    else if (tx.type === 'invoice_in') ivaCredit += amountARS;
                } else if (tax.type.startsWith('retention')) {
                    retentions += amountARS;
                } else if (tax.type.startsWith('perception')) {
                    perceptions += amountARS;
                } else {
                    other += amountARS;
                }
            });
        });

        return { ivaDebit, ivaCredit, retentions, perceptions, other };
    }, [transactions, selectedMonth]);

    const ivaBalance = taxesData.ivaDebit - taxesData.ivaCredit;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contabilidad e Impuestos</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Gestión fiscal, IVA mensual y retenciones
                    </p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tablero IVA Mensual */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                            <Receipt className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Posición IVA - {selectedMonth}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                Débito Fiscal (Ventas)
                            </div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                ${taxesData.ivaDebit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                                <TrendingDown className="w-4 h-4 text-red-500" />
                                Crédito Fiscal (Compras)
                            </div>
                            <div className="text-xl font-bold text-gray-900 dark:text-white">
                                ${taxesData.ivaCredit.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    <div className={`mt-auto p-4 rounded-lg flex items-center justify-between ${ivaBalance > 0 ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'}`}>
                        <div>
                            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Saldo Técnico Declaración Jurada</span>
                            <span className={`text-2xl font-bold ${ivaBalance > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                                {ivaBalance > 0 ? 'A Pagar: ' : 'Saldo a Favor: '}
                                ${Math.abs(ivaBalance).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <Calculator className={`w-8 h-8 opacity-50 ${ivaBalance > 0 ? 'text-orange-500' : 'text-green-500'}`} />
                    </div>
                </div>

                {/* Tablero Retenciones, Percepciones y Tasas */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
                            <HandCoins className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Retenciones y Tasas Extras</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                    R
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Retenciones Sufridas/Practicadas</p>
                                    <p className="text-xs text-gray-500">IIBB, Ganancias, SUSS</p>
                                </div>
                            </div>
                            <div className="text-right font-medium text-gray-900 dark:text-white">
                                ${taxesData.retentions.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
                                    P
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Percepciones</p>
                                    <p className="text-xs text-gray-500">IIBB, IVA, Aduana</p>
                                </div>
                            </div>
                            <div className="text-right font-medium text-gray-900 dark:text-white">
                                ${taxesData.perceptions.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    T
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Otras Tasas</p>
                                    <p className="text-xs text-gray-500">Municipales, Sellos, etc.</p>
                                </div>
                            </div>
                            <div className="text-right font-medium text-gray-900 dark:text-white">
                                ${taxesData.other.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-750/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Total Otros Impuestos:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                                ${(taxesData.retentions + taxesData.perceptions + taxesData.other).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
