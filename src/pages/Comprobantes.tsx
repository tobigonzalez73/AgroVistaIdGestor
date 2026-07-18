import { useState, useEffect } from 'react';
import {
    FileText, Plus, Search, ArrowUpRight, ArrowDownRight,
    Filter, X, Printer, ChevronDown, RefreshCcw, History
} from 'lucide-react';
import HistoryModal from '../components/common/HistoryModal';
import { useFinance } from '../context/FinanceContext';
import NewTransactionModal from '../components/finance/NewTransactionModal';
import TransactionPrintModal from '../components/finance/TransactionPrintModal';
// type import removed if unused

type TxTab = 'all' | 'invoice_out' | 'invoice_in' | 'payment_in' | 'payment_out' | 'currency_swap';

const TAB_CFG: Record<TxTab, { label: string; color: string; bg: string; border: string; icon: typeof FileText }> = {
    all: { label: 'Todos', color: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-100 dark:bg-slate-700', border: 'border-slate-400', icon: FileText },
    invoice_out: { label: 'Facturas Venta', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/30', border: 'border-emerald-500', icon: ArrowDownRight },
    invoice_in: { label: 'Facturas Compra', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-900/30', border: 'border-rose-500', icon: ArrowUpRight },
    payment_in: { label: 'Cobranzas', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-500', icon: ArrowDownRight },
    payment_out: { label: 'Pagos', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-500', icon: ArrowUpRight },
    currency_swap: { label: 'Pase Moneda', color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-900/30', border: 'border-indigo-500', icon: RefreshCcw },
};

const CURRENCY_BADGE: Record<string, string> = {
    ARS: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    USD_DIVISA: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    USD_BILLETE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

export default function Comprobantes() {
    const { transactions, entities } = useFinance();
    const [activeTab, setActiveTab] = useState<TxTab>('all');
    const [search, setSearch] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [isNewTxOpen, setIsNewTxOpen] = useState(false);
    const [editingTxId, setEditingTxId] = useState<string | null>(null);
    const [printTxId, setPrintTxId] = useState<string | null>(null);
    const [subType, setSubType] = useState<'all' | 'factura' | 'nota_debito' | 'nota_credito'>('all');

    // History Modal State
    const [historyConfig, setHistoryConfig] = useState<{ isOpen: boolean; entityId: string; entityTitle: string }>({
        isOpen: false,
        entityId: '',
        entityTitle: ''
    });

    // Exchange rates banner (BNA)
    const [rates, setRates] = useState<{
        divisaVenta: number; billeteVenta: number;
    } | null>(null);

    useEffect(() => {
        const fetchRates = async () => {
            try {
                const [divisaRes, billeteRes] = await Promise.all([
                    fetch('https://mercados.ambito.com/dolar/divisas/variacion'),
                    fetch('https://mercados.ambito.com/dolar/oficial/variacion')
                ]);
                const [d, b] = await Promise.all([divisaRes.json(), billeteRes.json()]);
                const p = (v: string) => parseFloat(String(v).replace(',', '.')) || 0;
                setRates({ divisaVenta: p(d.venta), billeteVenta: p(b.venta) });
            } catch { /* ignore */ }
        };
        fetchRates();
    }, []);

    const entityName = (id?: string) => id ? (entities.find(e => e.id === id)?.name ?? '—') : '—';

    const filtered = transactions
        .filter(tx => {
            if (activeTab !== 'all' && tx.type !== activeTab) return false;
            if (subType !== 'all' && tx.documentSubtype !== subType) return false;
            if (search) {
                const s = search.toLowerCase();
                const docLabel = (tx.documentSubtype === 'nota_credito' ? 'nota de crédito' : 
                                 tx.documentSubtype === 'nota_debito' ? 'nota de débito' : 
                                 TAB_CFG[tx.type as TxTab]?.label || '').toLowerCase();
                if (!tx.documentNumber.toLowerCase().includes(s) &&
                    !entityName(tx.entityId).toLowerCase().includes(s) &&
                    !docLabel.includes(s) &&
                    !(tx.description || '').toLowerCase().includes(s)) return false;
            }
            if (dateFrom && tx.date < dateFrom) return false;
            if (dateTo && tx.date > dateTo) return false;
            return true;
        })
        .sort((a, b) => b.date.localeCompare(a.date));

    const tabCounts: Record<TxTab, number> = {
        all: transactions.length,
        invoice_out: transactions.filter(t => t.type === 'invoice_out').length,
        invoice_in: transactions.filter(t => t.type === 'invoice_in').length,
        payment_in: transactions.filter(t => t.type === 'payment_in').length,
        payment_out: transactions.filter(t => t.type === 'payment_out').length,
        currency_swap: transactions.filter(t => t.type === 'currency_swap').length,
    };

    const sym = (currency: string) => currency === 'ARS' ? '$' : 'U$D';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-800 dark:text-slate-100">Comprobantes</h1>
                        <p className="text-xs text-slate-400">Registro de facturas, cobros y pagos</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* BNA rates mini pill */}
                    {rates && (
                        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                            <span className="text-blue-600 dark:text-blue-400 font-black">Divisa BNA ${rates.divisaVenta.toLocaleString('es-AR')}</span>
                            <span className="w-px h-3 bg-slate-300 dark:bg-slate-600" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">Billete BNA ${rates.billeteVenta.toLocaleString('es-AR')}</span>
                        </div>
                    )}
                    <button onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-bold transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-700 dark:text-indigo-300' : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                        <Filter className="w-4 h-4" /> Filtros {showFilters && <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button onClick={() => setIsNewTxOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-sm shadow-sm transition-all hover:shadow-md hover:shadow-emerald-200/50">
                        <Plus className="w-4 h-4" /> Nuevo comprobante
                    </button>
                </div>
            </div>

            {/* ── Tabs ───────────────────────────────────────────────────── */}
            <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
                {(Object.entries(TAB_CFG) as [TxTab, typeof TAB_CFG[TxTab]][]).map(([tab, cfg]) => {
                    const Icon = cfg.icon;
                    const active = activeTab === tab;
                    return (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-black rounded-t-xl border-b-2 transition-all whitespace-nowrap ${active ? `${cfg.color} ${cfg.border} bg-transparent` : 'text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-300'}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${active ? `${cfg.bg} ${cfg.color}` : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                {tabCounts[tab]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Filter bar (expandable) ─────────────────────────────────── */}
            {showFilters && (
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input type="text" placeholder="Buscar por comprobante, entidad o concepto..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Desde</label>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Hasta</label>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Tipo</label>
                        <select 
                            value={subType} 
                            onChange={e => setSubType(e.target.value as any)}
                            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="all">Cualquier tipo</option>
                            <option value="factura">Factura</option>
                            <option value="nota_credito">Nota de Crédito</option>
                            <option value="nota_debito">Nota de Débito</option>
                        </select>
                    </div>
                    {(search || dateFrom || dateTo || subType !== 'all') && (
                        <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setSubType('all'); }}
                            className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-2 rounded-lg hover:bg-rose-50 transition-colors">
                            <X className="w-3.5 h-3.5" /> Limpiar
                        </button>
                    )}
                </div>
            )}

            {/* ── Table ──────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10">
                        <tr className="bg-slate-50 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Comprobante</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entidad</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Concepto</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Importe</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Moneda</th>
                            <th className="px-6 py-3 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center">
                                        <FileText className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-3" />
                                        <p className="text-slate-400 font-semibold">Sin comprobantes que coincidan</p>
                                        <p className="text-xs text-slate-300 dark:text-slate-600 mt-1">Creá un nuevo comprobante con el botón de arriba</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filtered.map(tx => {
                            const tabCfg = TAB_CFG[tx.type as TxTab] ?? TAB_CFG.all;
                            return (
                                <tr 
                                    key={tx.id} 
                                    onClick={() => setEditingTxId(tx.id)}
                                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                                >
                                    <td className="px-6 py-3.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {new Date(tx.date + 'T12:00:00').toLocaleDateString('es-AR')}
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 font-mono tracking-tight">
                                            {tx.documentNumber}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${tabCfg.bg} ${tabCfg.color}`}>
                                            {tx.documentSubtype === 'nota_credito' ? 'Nota de Crédito' : 
                                             tx.documentSubtype === 'nota_debito' ? 'Nota de Débito' : 
                                             tabCfg.label}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[160px] truncate">
                                        {entityName(tx.entityId)}
                                    </td>
                                    <td className="px-6 py-3.5 text-xs text-slate-400 dark:text-slate-500 max-w-[180px] truncate">
                                        {tx.description || '—'}
                                    </td>
                                    <td className="px-6 py-3.5 text-right text-sm font-black text-slate-800 dark:text-slate-100 tabular-nums whitespace-nowrap">
                                        {tx.documentSubtype === 'nota_credito' || tx.type === 'invoice_in' ? '-' : ''} {sym(tx.currency)} {tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-3.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${CURRENCY_BADGE[tx.currency] || CURRENCY_BADGE.ARS}`}>
                                            {tx.currency}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3.5">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button onClick={(e) => { e.stopPropagation(); setPrintTxId(tx.id); }}
                                                title="Ver comprobante / Imprimir"
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors relative z-10">
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); setHistoryConfig({ isOpen: true, entityId: tx.id, entityTitle: tx.documentNumber }); }}
                                                title="Ver historial de trazabilidad"
                                                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors relative z-10">
                                                <History className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Footer count */}
                {filtered.length > 0 && (
                    <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-400 font-bold">
                        Mostrando {filtered.length} de {transactions.length} comprobantes
                    </div>
                )}
            </div>

            {/* ── Modals ─────────────────────────────────────────────────── */}
            {isNewTxOpen && <NewTransactionModal onClose={() => setIsNewTxOpen(false)} />}
            {editingTxId && <NewTransactionModal editingTransactionId={editingTxId} onClose={() => setEditingTxId(null)} />}
            {printTxId && <TransactionPrintModal transactionId={printTxId} onClose={() => setPrintTxId(null)} />}
            
            {historyConfig.isOpen && (
                <HistoryModal 
                    isOpen={historyConfig.isOpen}
                    onClose={() => setHistoryConfig(prev => ({ ...prev, isOpen: false }))}
                    entityId={historyConfig.entityId}
                    entityTitle={historyConfig.entityTitle}
                />
            )}
        </div>
    );
}
