import { useState, useMemo } from 'react';
import { X, Printer, Trash2, Edit2, Pencil, RefreshCcw, Link, Unlock, CheckSquare, Square, Info, ArrowLeftRight } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import type { Currency, Transaction } from '../../types/finance';
import NewTransactionModal from './NewTransactionModal';
import TransactionPrintModal from './TransactionPrintModal';
import NewEntityModal from './NewEntityModal';
import CurrencySwapModal from './CurrencySwapModal';

interface Props {
    entityId: string;
    onClose: () => void;
}

export default function EntityStatementModal({ entityId, onClose }: Props) {
    const { entities, transactions, movements, applications, deleteTransaction, calculateEntityBalance, removeApplicationByMovement } = useFinance();
    const entity = entities.find(e => e.id === entityId);

    const totalBalances = useMemo(() => calculateEntityBalance(entityId), [calculateEntityBalance, entityId, transactions, movements]);

    // Filters & Selection
    const [filterCurrency, setFilterCurrency] = useState<Currency | 'ALL'>('ALL');
    const [startDate] = useState('');
    const [endDate] = useState('');
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [viewingTxId, setViewingTxId] = useState<string | null>(null);
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [swapData, setSwapData] = useState<{ currency: Currency, amount: number, sourceId?: string } | null>(null);
    const [isMatchingModalOpen, setIsMatchingModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());


    const handleSwapAction = (row: any, group: any) => {
        setSwapData({ currency: group.currency, amount: Math.abs(row.runningBalance), sourceId: row.id });
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const groupedData = useMemo(() => {
        if (!entity) return [];
        const currencies: Currency[] = ['ARS', 'USD_DIVISA', 'USD_BILLETE'];

        return currencies
            .filter(curr => filterCurrency === 'ALL' || filterCurrency === curr)
            .map(curr => {
                const rows = movements
                    .filter(m => m.entityId === entityId && m.currency === curr)
                    .filter(m => (!startDate || m.date >= startDate) && (!endDate || m.date <= endDate))
                    .map(m => {
                        const tx = transactions.find(t => t.id === m.transactionId);
                        const isCredit = m.credit > 0.01;
                        const isDebit = m.debit > 0.01;
                        const isLinked = applications.some(a => a.movementOrigenId === m.id || a.movementDestinoId === m.id);

                        return {
                            ...m,
                            documentNumber: tx?.documentNumber || m.id,
                            description: m.description,
                            runningBalance: m.balance,
                            isVirtual: m.id.includes('target'),
                            isCredit,
                            isDebit,
                            type: tx?.type,
                            documentSubtype: tx?.documentSubtype,
                            isLinked,
                            isSwapRow: tx?.type === 'currency_swap' && !m.id.includes('target'),
                            isSwapTargetRow: m.id.includes('target'),
                            available: isCredit ? (m.credit - applications.filter(a => a.movementOrigenId === m.id).reduce((acc, a) => acc + a.amountApplied, 0)) 
                                                : isDebit ? (m.debit - applications.filter(a => a.movementDestinoId === m.id).reduce((acc, a) => acc + a.amountApplied, 0))
                                                : 0,
                            canSwap: m.currency === 'ARS' && m.balance > 0, 
                            canRevert: m.description?.includes('Pase') || m.id.includes('target')
                        };
                    });
                
                return { 
                    currency: curr, 
                    rows, 
                    finalBalance: rows.length > 0 ? rows[rows.length - 1].runningBalance : 0 
                };
            })
            .filter(group => group.rows.length > 0 || group.finalBalance !== 0);
    }, [entity, movements, transactions, applications, filterCurrency, startDate, endDate, entityId]);

    if (!entity) return null;

    const findBaseTransaction = (id: string) => {
        // For IDs like swap-123-target, split('-')[0]+'-'+split('-')[1] gives swap-123
        // For IDs like simple-id, split('-')[0] is fine usually if they don't have dashes, 
        // but better:
        const realId = id.replace('-target', '').replace(/-vuelco-.*/, '').replace(/-cross-.*/, '');
        return transactions.find(t => t.id === realId);
    };

    const selectedList = Array.from(selectedIds).map(id => findBaseTransaction(id)).filter(Boolean) as Transaction[];
    const canLinkBatch = selectedIds.size >= 2;
    const canUnlinkBatch = selectedList.some(tx => tx.relatedTransactionIds && tx.relatedTransactionIds.length > 0) || selectedList.some(tx => tx.settlements && tx.settlements.length > 0);

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 print:p-0 print:bg-white">
                <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden print:max-h-none print:shadow-none print:rounded-none">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0 print:hidden">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                {entity.name}
                                <span className="ml-3 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-400 rounded-md font-bold uppercase">
                                    CUIT: {entity.cuit || '—'}
                                </span>
                            </h2>
                            <button onClick={() => setIsEntityModalOpen(true)} className="p-1 text-indigo-500 hover:bg-indigo-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                        </div>
                        <div className="flex items-center gap-3">
                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg animate-in fade-in slide-in-from-right-4">
                                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">{selectedIds.size} Seleccionados</span>
                                    {canLinkBatch && (
                                        <button
                                            onClick={() => setIsMatchingModalOpen(true)}
                                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm transition-all"
                                        >
                                            <Link className="w-3 h-3" /> Vincular (Generar Recibo)
                                        </button>
                                    )}
                                    {canUnlinkBatch && (
                                        <button
                                            onClick={() => {
                                                if (window.confirm(`¿Desvincular los ${selectedIds.size} comprobantes seleccionados? Sus efectos en el saldo se revertirán.`)) {
                                                    selectedIds.forEach(id => removeApplicationByMovement(id));
                                                    setSelectedIds(new Set());
                                                }
                                            }}
                                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-[10px] font-black uppercase flex items-center gap-1.5 shadow-sm transition-all"
                                        >
                                            <Unlock className="w-3 h-3" /> Desvincular
                                        </button>
                                    )}
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedIds(new Set());
                                        }} 
                                        className="text-emerald-400 hover:text-emerald-600 pl-2 border-l border-emerald-200 dark:border-emerald-800 ml-1 transition-colors"
                                        title="Limpiar selección"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto w-full flex-grow print:overflow-visible print:bg-white text-slate-900">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4 mb-6 print:hidden">
                            <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Saldo ARS</p>
                                <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                                    $ {totalBalances.ARS.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Saldo USD Divisa</p>
                                <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                                    U$D {totalBalances.USD_DIVISA.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1 italic">Saldo USD Billete</p>
                                <p className="text-xl font-black text-slate-900 dark:text-slate-100">
                                    U$D {totalBalances.USD_BILLETE.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>

                        {/* Search & Filters */}
                        <div className="bg-slate-100 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-end print:hidden">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs text-slate-500 mb-1 font-bold">Ver Cuenta Corriente</label>
                                <select value={filterCurrency} onChange={e => setFilterCurrency(e.target.value as 'ALL' | Currency)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-1 focus:ring-emerald-500">
                                    <option value="ALL">Todas las Monedas</option>
                                    <option value="ARS">Pesos (ARS)</option>
                                    <option value="USD_DIVISA">Dólar Divisa</option>
                                    <option value="USD_BILLETE">Dólar Billete</option>
                                </select>
                            </div>
                            <div className="ml-auto flex gap-2">
                                <button onClick={() => setSwapData({ currency: 'ARS', amount: 0 })} className="flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm font-bold transition-colors text-sm"><RefreshCcw className="w-4 h-4 mr-2" /> Pase de Monedas</button>
                                <button onClick={() => window.print()} className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-bold transition-colors text-sm"><Printer className="w-4 h-4 mr-2" /> Exportar</button>
                            </div>
                        </div>

                        {groupedData.map(group => (
                            <div key={group.currency} className="mb-10 last:mb-0">
                                <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                    Movimientos en {group.currency === 'ARS' ? 'Pesos (ARS)' : group.currency.replace('_', ' ')}
                                </h3>
                                <div className="border border-slate-300 dark:border-slate-700 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-900 overflow-x-auto">
                                    <table className="w-full text-sm border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                <th className="px-3 py-3 w-8 print:hidden"></th>
                                                <th className="px-3 py-3 text-left">Fecha</th>
                                                <th className="px-4 py-3 text-left">N° Comprobante</th>
                                                <th className="px-4 py-3 text-left">Concepto / Detalle</th>
                                                <th className="px-4 py-3 text-right">Debe (+)</th>
                                                <th className="px-4 py-3 text-right">Haber (-)</th>
                                                <th className="px-4 py-3 text-right font-black">Saldo</th>
                                                <th className="px-3 py-3 w-10 print:hidden"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.rows.map(row => {
                                                const isSwapMain = row.isSwapRow;
                                                const isSwapTarget = row.isSwapTargetRow;
                                                const isZeroBalance = Math.abs(row.runningBalance) < 0.01;

                                                return (
                                                    <tr key={row.id} className={`group border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors ${isSwapMain || isSwapTarget ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''}`}>
                                                        <td className="px-3 py-2 print:hidden text-center">
                                                            {(!row.isLinked || selectedIds.has(row.id)) && (
                                                                <button onClick={() => toggleSelect(row.id)} className={`transition-colors ${selectedIds.has(row.id) ? 'text-emerald-600' : 'text-slate-300 hover:text-slate-400'}`}>
                                                                    {selectedIds.has(row.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-500 tabular-nums whitespace-nowrap align-top">{new Date(row.date + 'T12:00:00').toLocaleDateString('es-AR')}</td>
                                                        <td className="px-4 py-2 align-top">
                                                            <div className="flex flex-col">
                                                                <span className={`font-black uppercase tracking-tight ${isSwapMain || isSwapTarget ? 'text-amber-700 dark:text-amber-400 flex items-center gap-1.5' : 'text-slate-900 dark:text-slate-100'}`}>
                                                                    {isSwapMain || isSwapTarget ? <ArrowLeftRight className="w-3 h-3" /> : null}
                                                                    {row.documentNumber}
                                                                </span>
                                                                {row.exchangeRate && (isSwapMain || isSwapTarget) && (
                                                                    <span className="text-[9px] font-black text-amber-500">TC: ${row.exchangeRate.toLocaleString()}</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-2 align-top italic text-[13px] ${isSwapMain || isSwapTarget ? 'text-amber-600 dark:text-amber-500 font-bold' : 'text-slate-500'}`}>
                                                            {row.description}
                                                            {(isSwapMain || isSwapTarget) && <span className="ml-2 not-italic text-[10px] bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded border border-amber-200">REF: {row.id.split('-')[0]}</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-rose-600 align-top font-bold tabular-nums">
                                                            {(row.debit ?? 0) > 0.001 ? (row.debit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) : ''}
                                                            {row.documentSubtype === 'nota_credito' && row.type === 'invoice_in' && <span className="ml-1 opacity-60 text-[8px]">(NC)</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-emerald-600 align-top font-bold tabular-nums">
                                                            {(row.credit ?? 0) > 0.001 ? `- ${(row.credit ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : ''}
                                                            {row.documentSubtype === 'nota_credito' && row.type === 'invoice_out' && <span className="ml-1 opacity-60 text-[8px]">(NC)</span>}
                                                        </td>
                                                        <td className="px-4 py-2 text-right align-top">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <span className={`font-black tabular-nums transition-colors ${isZeroBalance ? 'text-slate-400' : row.runningBalance < -0.01 ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                                                    {row.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                </span>
                                                                {row.runningBalance < -0.01 && (
                                                                    <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-1 rounded-sm border border-emerald-200 uppercase animate-pulse">A Favor</span>
                                                                )}
                                                                {!isZeroBalance && (row as any).isCredit && (row as any).available > 0.01 && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedIds(new Set([row.id]));
                                                                            setIsMatchingModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all shadow-sm print:hidden"
                                                                        title="Imputar / Vincular a Factura"
                                                                    >
                                                                        <Link className="w-3.5 h-3.5" />
                                                                    </button>
                                                                )}
                                                                {!isZeroBalance && row.runningBalance < -0.01 && row.canSwap && (
                                                                    <button
                                                                        onClick={() => handleSwapAction(row, group)}
                                                                        className={`p-1.5 rounded-lg border print:hidden transition-all shadow-sm ${row.canRevert ? 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200' : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'}`}
                                                                        title={row.canRevert ? "Volver a Origen (Revertir Pase)" : "Hacer Pase de Moneda"}
                                                                    >
                                                                        <RefreshCcw className={`w-3.5 h-3.5 ${row.canRevert ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 print:hidden align-top text-right">
                                                            {!row.isVirtual && (
                                                                <div className="flex gap-1.5 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    {row.isLinked && (
                                                                        <button onClick={() => {}} title="Desvincular" className="p-1.5 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded border border-orange-200"><Unlock className="w-4 h-4" /></button>
                                                                    )}
                                                                    <button onClick={() => setEditingTxId(row.id)} className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 rounded border border-slate-200"><Pencil className="w-4 h-4" /></button>
                                                                    <button onClick={() => deleteTransaction(row.id)} className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded border border-slate-200"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-900 text-white font-black border-t-2 border-slate-900 group">
                                                <td colSpan={6} className="px-4 py-4 text-right text-slate-400 uppercase text-[10px] tracking-widest">Saldo Final de la Cuenta:</td>
                                                <td className="px-4 py-4 text-right text-lg tabular-nums">
                                                    {group.currency === 'ARS' ? '$' : 'U$D'} {group.finalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {editingTxId && <NewTransactionModal editingTransactionId={editingTxId} onClose={() => setEditingTxId(null)} />}
            {viewingTxId && <TransactionPrintModal transactionId={viewingTxId} onClose={() => setViewingTxId(null)} />}
            {swapData && <CurrencySwapModal entityId={entityId} initialSourceCurrency={swapData.currency} initialAmount={swapData.amount} initialSourceId={swapData.sourceId} onClose={() => setSwapData(null)} />}
            {isEntityModalOpen && <NewEntityModal editingEntityId={entityId} onClose={() => setIsEntityModalOpen(false)} />}
            {isMatchingModalOpen && (
                <PaymentMatchingModal
                    paymentId={Array.from(selectedIds).find(id => {
                        const tx = findBaseTransaction(id);
                        const isCredit = tx?.type === 'payment_in' || tx?.type === 'payment_out' || tx?.documentSubtype === 'nota_credito' || id.endsWith('-target');
                        return isCredit;
                    }) || Array.from(selectedIds)[0]}
                    preSelectedIds={Array.from(selectedIds)}
                    onClose={() => {
                        setIsMatchingModalOpen(false);
                        setSelectedIds(new Set());
                    }}
                />
            )}
        </>
    );
}

function PaymentMatchingModal({ paymentId, preSelectedIds, onClose }: { paymentId: string, preSelectedIds: string[], onClose: () => void }) {
    const { transactions, applyApplication } = useFinance();

    // Resolve payment - virtual or real
    // Important: strip 'mov-' prefix if it comes from a movement ID
    const cleanId = paymentId.startsWith('mov-') ? paymentId.substring(4) : paymentId;
    const realPaymentId = cleanId.replace('-target', '').replace(/-vuelco-.*/, '').replace(/-cross-.*/, '');
    const payment = transactions.find(t => t.id === realPaymentId);
    if (!payment) return null;

    const isSwapTarget = paymentId.endsWith('-target');
    const paymentAmount = isSwapTarget ? Math.abs(payment.targetAmount || 0) : Math.abs(payment.amount);

    const [appliedAmounts, setAppliedAmounts] = useState<Record<string, string>>(() => {
        const init: Record<string, string> = {};

        // Calcular cuánto le queda al documento origen (NC/Pago) para imputar
        const totalUsed = (payment.settlements || []).reduce((s, set) => s + (set.amountApplied || 0), 0);
        const availableInPayment = Math.max(0, paymentAmount - totalUsed);

        preSelectedIds.forEach(id => {
            if (id === paymentId) return;
            const tx = transactions.find(t => t.id === id);
            if (tx && (tx.type === 'invoice_in' || tx.type === 'invoice_out') && tx.documentSubtype !== 'nota_credito') {
                // Calcular cuánto le falta a la factura
                const settledOnInv = transactions.reduce((acc, currentTx) => {
                    const s = currentTx.settlements?.find(s => s.invoiceId === tx.id);
                    return acc + (s?.amountApplied || 0);
                }, 0);
                const invRemaining = Math.max(0, tx.amount - settledOnInv);

                // Sugerir el mínimo entre lo que falta en la factura y lo que tiene el pago/NC
                init[id] = Math.min(invRemaining, availableInPayment).toString();
            }
        });
        return init;
    });

    const [exchangeRates, setExchangeRates] = useState<Record<string, string>>({});

    const pendingInvoices = useMemo(() => {
        return transactions.filter(t =>
            t.entityId === payment.entityId &&
            (t.type === 'invoice_in' || t.type === 'invoice_out') &&
            t.documentSubtype !== 'nota_credito' &&
            t.id !== realPaymentId
        ).map(inv => {
            const settled = transactions.reduce((acc, tx) => {
                const s = tx.settlements?.find(s => s.invoiceId === inv.id);
                return acc + (s?.amountApplied || 0);
            }, 0);
            return { ...inv, remaining: inv.amount - settled };
        }).filter(inv => inv.remaining > 0.01 || preSelectedIds.includes(inv.id));
    }, [transactions, payment.entityId, realPaymentId, preSelectedIds]);

    const handleApplyAll = () => {
        Object.keys(appliedAmounts).forEach(invId => {
            const amount = parseFloat(appliedAmounts[invId]);
            const rate = parseFloat(exchangeRates[invId]) || undefined;
            if (!isNaN(amount) && amount > 0) {
                applyApplication(realPaymentId, invId, amount, rate);
            }
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter">Generar Recibo de Vinculación</h3>
                        <p className="text-xs text-slate-500 font-bold">Documento Origen: <span className="text-indigo-600 dark:text-indigo-400">{payment.documentNumber}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-start gap-3 text-slate-900">
                        <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-medium">Estás vinculando comprobantes. Al confirmar, el documento origen se convertirá en un <b>RECIBO</b> oficial.</p>
                    </div>

                    {pendingInvoices.filter(inv => preSelectedIds.includes(inv.id) || preSelectedIds.length === 1).map(inv => {
                        const originalAmount = inv.amount;
                        const totalSettled = transactions.reduce((acc, tx) => {
                            const s = tx.settlements?.find(s => s.invoiceId === inv.id);
                            return acc + (s?.amountApplied || 0);
                        }, 0);
                        const suggested = Math.max(0, originalAmount - totalSettled);

                        return (
                            <div key={inv.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm text-slate-900">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-slate-100">{inv.documentNumber}</p>
                                        <div className="flex gap-2 items-center mt-1">
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded uppercase tracking-wider">Original: {inv.currency} {originalAmount.toLocaleString()}</span>
                                            {totalSettled > 0.01 && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded uppercase tracking-wider">Cobrado/NC: -{totalSettled.toLocaleString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-slate-400 uppercase">Saldo Pendiente</p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <p className="font-black text-rose-600 tabular-nums text-lg">
                                                {inv.currency === 'ARS' ? '$' : 'U$D'} {suggested.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                            <button
                                                onClick={() => setAppliedAmounts(prev => ({ ...prev, [inv.id]: suggested.toString() }))}
                                                className="text-[10px] font-black bg-slate-900 text-white px-2 py-1 rounded hover:bg-slate-800 uppercase"
                                            >
                                                Saldar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Monto a Imputar ({inv.currency})</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-emerald-500 text-sm font-black">{inv.currency === 'ARS' ? '$' : 'u$d'}</span>
                                            <input
                                                type="number"
                                                value={appliedAmounts[inv.id] || ''}
                                                onChange={e => setAppliedAmounts(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-black text-emerald-600 focus:ring-1 focus:ring-emerald-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    {inv.currency !== payment.currency && (
                                        <div>
                                            <label className="block text-[10px] font-black text-indigo-500 uppercase mb-1">Tipo de Cambio</label>
                                            <input
                                                type="number"
                                                value={exchangeRates[inv.id] || ''}
                                                onChange={e => setExchangeRates(prev => ({ ...prev, [inv.id]: e.target.value }))}
                                                className="w-full px-3 py-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700 rounded-lg text-sm font-black text-indigo-600 focus:ring-1 focus:ring-indigo-500"
                                                placeholder={`TC fijado para ${inv.currency}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
                    <button onClick={handleApplyAll} className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black uppercase shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2">
                        <Link className="w-4 h-4" /> Generar Recibo
                    </button>
                </div>
            </div>
        </div>
    );
}
