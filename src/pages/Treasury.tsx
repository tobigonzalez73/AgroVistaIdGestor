import { useState } from 'react';
import { Landmark, Wallet, Plus, Building, FileText, ArrowUpRight, ArrowDownRight, Share2, Copy, History } from 'lucide-react';
import HistoryModal from '../components/common/HistoryModal';
import { useTreasury } from '../context/TreasuryContext';
import type { AccountType } from '../types/treasury';

export default function Treasury() {
    const { accounts, cheques, movements, updateAccount, updateChequeStatus, addMovement, addAccount } = useTreasury();
    const [activeTab, setActiveTab] = useState<'efectivo' | 'bancos' | 'cheques'>('efectivo');

    // States for Rename and Arqueo
    const [editingAccount, setEditingAccount] = useState<string | null>(null);
    const [renamingName, setRenamingName] = useState('');
    const [viewingArqueo, setViewingArqueo] = useState<string | null>(null);

    // State for New Account
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [newAccountData, setNewAccountData] = useState({
        name: '',
        currency: 'ARS',
        type: 'cash' as AccountType,
        cbu: '',
        alias: '',
        cuit: '',
        bankName: ''
    });

    // State for Sharing
    const [sharingAccount, setSharingAccount] = useState<string | null>(null);

    // States for Deposit Cheque
    const [depositingCheque, setDepositingCheque] = useState<string | null>(null);
    const [destinationBankId, setDestinationBankId] = useState('');

    // History Modal State
    const [historyConfig, setHistoryConfig] = useState<{ isOpen: boolean; entityId: string; entityTitle: string }>({
        isOpen: false,
        entityId: '',
        entityTitle: ''
    });

    const cashAccounts = accounts.filter(a => a.type === 'cash');
    const bankAccounts = accounts.filter(a => a.type === 'bank');

    const handleSaveAccountName = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingAccount && renamingName.trim()) {
            updateAccount(editingAccount, { name: renamingName.trim() });
            setEditingAccount(null);
        }
    };

    const handleDepositCheque = (e: React.FormEvent) => {
        e.preventDefault();
        if (depositingCheque && destinationBankId) {
            const chk = cheques.find(c => c.id === depositingCheque);
            if (!chk) return;

            // 1. Update cheque status
            updateChequeStatus(depositingCheque, 'depositado');

            // 2. Add movement to destination bank
            addMovement({
                id: `mov-dep-${Date.now()}`,
                accountId: destinationBankId,
                date: new Date().toISOString().split('T')[0],
                amount: chk.amount,
                type: 'payment_received',
                description: `Depósito Cheque #${chk.number} - ${chk.bankInfo}`,
            });

            setDepositingCheque(null);
            setDestinationBankId('');
        }
    };

    const handleCreateAccount = (e: React.FormEvent) => {
        e.preventDefault();
        if (newAccountData.name.trim()) {
            addAccount({
                id: `acc-${Date.now()}`,
                name: newAccountData.name.trim(),
                currency: newAccountData.currency as any,
                type: newAccountData.type,
                balance: 0,
                cbu: newAccountData.cbu,
                alias: newAccountData.alias,
                cuit: newAccountData.cuit,
                bankName: newAccountData.bankName
            });
            setIsAddingAccount(false);
            setNewAccountData({ name: '', currency: 'ARS', type: 'cash', cbu: '', alias: '', cuit: '', bankName: '' });
        }
    };

    // Quick summarize function for cards
    const getCurrencyTotal = (accs: typeof accounts, cur: string) =>
        accs.filter(a => a.currency === cur).reduce((sum, a) => sum + a.balance, 0);

    const chequesEnCartera = cheques.filter(c => c.type === 'third_party' && c.status === 'en_cartera');
    const chequesPropios = cheques.filter(c => c.type === 'own');
    const chequesEndosados = cheques.filter(c => c.type === 'third_party' && c.status === 'entregado');

    const totalChequesARS = chequesEnCartera.reduce((sum, c) => sum + c.amount, 0);

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center">
                        <Landmark className="w-8 h-8 mr-3 text-indigo-600 dark:text-indigo-400" />
                        Tesorería
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">
                        Control de cajas, cuentas bancarias y fondos de la empresa.
                    </p>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Caja Efectivo Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24" />
                    </div>
                    <div className="flex items-center space-x-3 mb-4 relative z-10">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Caja Central</h3>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <p className="text-sm text-slate-500 font-medium flex justify-between">
                            <span>Pesos (ARS):</span>
                            <span className="text-emerald-600 font-bold">${getCurrencyTotal(cashAccounts, 'ARS').toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-slate-500 font-medium flex justify-between">
                            <span>Dólar Divisa:</span>
                            <span className="text-emerald-600 font-bold">U$D {getCurrencyTotal(cashAccounts, 'USD_DIVISA').toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-slate-500 font-medium flex justify-between">
                            <span>Dólar Billete:</span>
                            <span className="text-emerald-600 font-bold">US$ {getCurrencyTotal(cashAccounts, 'USD_BILLETE').toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                {/* Bancos Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Building className="w-24 h-24" />
                    </div>
                    <div className="flex items-center space-x-3 mb-4 relative z-10">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Building className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Bancos (Total)</h3>
                    </div>
                    <div className="space-y-2 relative z-10">
                        <p className="text-sm text-slate-500 font-medium flex justify-between">
                            <span>Pesos (ARS):</span>
                            <span className="text-blue-600 font-bold">${getCurrencyTotal(bankAccounts, 'ARS').toLocaleString()}</span>
                        </p>
                        <p className="text-sm text-slate-500 font-medium flex justify-between">
                            <span>Dólar Divisa:</span>
                            <span className="text-blue-600 font-bold">U$D {getCurrencyTotal(bankAccounts, 'USD_DIVISA').toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                {/* Cheques Summary */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <FileText className="w-24 h-24" />
                    </div>
                    <div className="flex items-center space-x-3 mb-4 relative z-10">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Valores a Depositar</h3>
                    </div>
                    <div className="space-y-2 mt-4 relative z-10">
                        <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                            ${totalChequesARS.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-500 font-medium">
                            En {chequesEnCartera.length} cheque(s) en cartera.
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-2 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('efectivo')}
                    className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === 'efectivo' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Wallet className="w-4 h-4 mr-2" />
                    Cajas (Efectivo)
                </button>
                <button
                    onClick={() => setActiveTab('bancos')}
                    className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === 'bancos' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Building className="w-4 h-4 mr-2" />
                    Cuentas Bancarias
                </button>
                <button
                    onClick={() => setActiveTab('cheques')}
                    className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center ${activeTab === 'cheques' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <FileText className="w-4 h-4 mr-2" />
                    Cartera de Cheques
                </button>
            </div>

            {/* Content Area placeholder */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                {activeTab === 'efectivo' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cajas (efectivo)</h2>
                            <button
                                onClick={() => { setIsAddingAccount(true); setNewAccountData({ name: '', currency: 'ARS', type: 'cash', cbu: '', alias: '', cuit: '', bankName: '' }); }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Caja
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {cashAccounts.map(acc => (
                                <div key={acc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                                    <Wallet className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{acc.name}</h4>
                                                        <button
                                                            onClick={() => { setEditingAccount(acc.id); setRenamingName(acc.name); }}
                                                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Editar nombre"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.currency}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                                                    {acc.currency === 'USD_DIVISA' || acc.currency === 'USD_BILLETE' ? 'U$D' : '$'} {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                                <button
                                                    onClick={() => setViewingArqueo(acc.id)}
                                                    className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-emerald-600 hover:text-white transition-all border border-slate-200 dark:border-slate-700"
                                                >
                                                    Ver Arqueo
                                                </button>
                                                <button
                                                    onClick={() => setHistoryConfig({ isOpen: true, entityId: acc.id, entityTitle: acc.name })}
                                                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-all font-bold text-[10px] uppercase"
                                                    title="Ver historial"
                                                >
                                                    <History className="w-3.5 h-3.5" />
                                                </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'bancos' && (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Cuentas Bancarias</h2>
                            <button
                                onClick={() => { setIsAddingAccount(true); setNewAccountData({ name: '', currency: 'ARS', type: 'bank', cbu: '', alias: '', cuit: '', bankName: '' }); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Cuenta
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {bankAccounts.map(acc => (
                                <div key={acc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:shadow-md transition-all group">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                                                    <Building className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{acc.name}</h4>
                                                        <button
                                                            onClick={() => { setEditingAccount(acc.id); setRenamingName(acc.name); }}
                                                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Editar nombre"
                                                        >
                                                            <FileText className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{acc.currency}</p>
                                                    {(acc.alias || acc.cbu) && (
                                                        <p className="text-[10px] text-blue-500 font-bold mt-1">
                                                            {acc.alias || acc.cbu?.slice(0, 10) + '...'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">
                                                    {acc.currency === 'USD_DIVISA' || acc.currency === 'USD_BILLETE' ? 'U$D' : '$'} {acc.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setViewingArqueo(acc.id)}
                                                className="flex-1 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-slate-200 dark:border-slate-700"
                                            >
                                                Ver Extracto
                                            </button>
                                            <button
                                                onClick={() => setSharingAccount(acc.id)}
                                                className="px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-all"
                                                title="Compartir datos de cuenta"
                                            >
                                                <Share2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setHistoryConfig({ isOpen: true, entityId: acc.id, entityTitle: acc.name })}
                                                className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg border border-slate-200 dark:border-slate-700 transition-all font-bold text-[10px] uppercase"
                                                title="Ver historial"
                                            >
                                                <History className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'cheques' && (
                    <div className="space-y-8">
                        {/* Cheques de Terceros (En Cartera) */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <ArrowDownRight className="w-5 h-5 mr-2 text-emerald-500" />
                                    Cheques de Terceros (En Cartera)
                                </h2>
                                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Ingresar Cheque Manual
                                </button>
                            </div>
                            {chequesEnCartera.length === 0 ? (
                                <p className="text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">No hay cheques de terceros en cartera.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                                <th className="pb-3 font-semibold">Nº Cheque / Banco</th>
                                                <th className="pb-3 font-semibold">Titular</th>
                                                <th className="pb-3 font-semibold">Vencimiento</th>
                                                <th className="pb-3 font-semibold">Importe</th>
                                                <th className="pb-3 font-semibold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {chequesEnCartera.map(c => (
                                                <tr key={c.id}>
                                                    <td className="py-3">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="font-medium text-slate-800 dark:text-slate-200">{c.number}</div>
                                                                <div className="text-xs text-slate-500">{c.bankInfo}</div>
                                                            </div>
                                                            {c.isECheq && (
                                                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[9px] font-bold uppercase">E-Cheq</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-slate-600 dark:text-slate-400">{c.holder || '-'}</td>
                                                    <td className="py-3 text-slate-600 dark:text-slate-400">{new Date(c.paymentDate).toLocaleDateString()}</td>
                                                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">${c.amount.toLocaleString()}</td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex justify-end gap-3">
                                                            <button
                                                                onClick={() => setHistoryConfig({ isOpen: true, entityId: c.id, entityTitle: `Cheque #${c.number}` })}
                                                                className="text-slate-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-wider"
                                                            >
                                                                Historial
                                                            </button>
                                                            <button
                                                                onClick={() => setDepositingCheque(c.id)}
                                                                className="text-indigo-600 hover:text-indigo-800 font-black text-[10px] uppercase tracking-wider"
                                                            >
                                                                Depositar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Cheques Propios (Emitidos) */}
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <ArrowUpRight className="w-5 h-5 mr-2 text-rose-500" />
                                    Cheques Propios (Emitidos)
                                </h2>
                            </div>
                            {chequesPropios.length === 0 ? (
                                <p className="text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">No se han emitido cheques propios aún.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                                <th className="pb-3 font-semibold">Nº Cheque / Banco</th>
                                                <th className="pb-3 font-semibold">Cuenta Origen</th>
                                                <th className="pb-3 font-semibold">Vencimiento</th>
                                                <th className="pb-3 font-semibold">Importe</th>
                                                <th className="pb-3 font-semibold text-right">Acciones / Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {chequesPropios.map(c => (
                                                <tr key={c.id}>
                                                    <td className="py-3">
                                                        <div className="flex items-center">
                                                            <div>
                                                                <div className="font-medium text-slate-800 dark:text-slate-200">{c.number}</div>
                                                                <div className="text-xs text-slate-500">{c.bankInfo}</div>
                                                            </div>
                                                            {c.isECheq && (
                                                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-[9px] font-bold uppercase">E-Cheq</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-slate-600 dark:text-slate-400">
                                                        {accounts.find(a => a.id === c.bankAccountId)?.name || 'Sin vincular'}
                                                    </td>
                                                    <td className="py-3 text-slate-600 dark:text-slate-400">{new Date(c.paymentDate).toLocaleDateString()}</td>
                                                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">${c.amount.toLocaleString()}</td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => setHistoryConfig({ isOpen: true, entityId: c.id, entityTitle: `Cheque Propios #${c.number}` })}
                                                                className="text-slate-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-wider"
                                                            >
                                                                Historial
                                                            </button>
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${c.status === 'entregado' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                                                c.status === 'anulado' ? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                                                                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                }`}>
                                                                {c.status}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Cheques de Terceros Endosados */}
                        <div className="pt-8 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <FileText className="w-5 h-5 mr-2 text-slate-400" />
                                    Historial de Cheques Endosados
                                </h2>
                            </div>
                            {chequesEndosados.length === 0 ? (
                                <p className="text-slate-500 text-center py-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">No hay historial de cheques endosados.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead>
                                            <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                                                <th className="pb-3 font-semibold">Nº Cheque / Banco</th>
                                                <th className="pb-3 font-semibold">Vencimiento</th>
                                                <th className="pb-3 font-semibold">Importe</th>
                                                <th className="pb-3 font-semibold text-right">Acciones / Destino</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {chequesEndosados.map(c => (
                                                <tr key={c.id}>
                                                    <td className="py-3">
                                                        <div className="font-medium text-slate-800 dark:text-slate-200">{c.number}</div>
                                                        <div className="text-xs text-slate-500">{c.bankInfo}</div>
                                                    </td>
                                                    <td className="py-3 text-slate-600 dark:text-slate-400">{new Date(c.paymentDate).toLocaleDateString()}</td>
                                                    <td className="py-3 font-bold text-slate-800 dark:text-slate-200">${c.amount.toLocaleString()}</td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <button
                                                                onClick={() => setHistoryConfig({ isOpen: true, entityId: c.id, entityTitle: `Cheque Endosado #${c.number}` })}
                                                                className="text-slate-400 hover:text-indigo-600 font-bold text-[10px] uppercase tracking-wider"
                                                            >
                                                                Historial
                                                            </button>
                                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 rounded-md text-[10px] font-bold uppercase">Endosado</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Modals Section */}

            {/* Modal: Renombrar Caja/Cuenta */}
            {editingAccount && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleSaveAccountName}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" /> Renombrar Caja / Cuenta
                                </h3>
                                <button type="button" onClick={() => setEditingAccount(null)} className="text-slate-400 hover:text-slate-600">&times;</button>
                            </div>
                            <div className="p-6">
                                <p className="text-xs text-slate-500 mb-4 font-medium uppercase tracking-wider">Ingrese el nuevo nombre para identificar esta caja o cuenta bancaria.</p>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-slate-900 dark:text-slate-100 font-bold"
                                    value={renamingName}
                                    onChange={e => setRenamingName(e.target.value)}
                                    placeholder="Nombre de la caja..."
                                />
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex gap-3">
                                <button type="button" onClick={() => setEditingAccount(null)} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-colors">Guardar Cambio</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Ver Arqueo / Extracto */}
            {viewingArqueo && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight flex items-center gap-3">
                                    <Building className="w-6 h-6 text-indigo-600" />
                                    {accounts.find(a => a.id === viewingArqueo)?.name}
                                    <span className="text-xs py-1 px-2 bg-emerald-100 text-emerald-700 rounded-lg ml-2">Arqueo Actualizado</span>
                                </h3>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Historial de movimientos e ingresos recientes</p>
                            </div>
                            <button type="button" onClick={() => setViewingArqueo(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">&times;</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                                        <th className="pb-3 font-black text-[10px] uppercase tracking-widest pl-2">Fecha</th>
                                        <th className="pb-3 font-black text-[10px] uppercase tracking-widest">Descripción / Concepto</th>
                                        <th className="pb-3 font-black text-[10px] uppercase tracking-widest text-right pr-2">Importe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {movements.filter(m => m.accountId === viewingArqueo).length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="py-20 text-center">
                                                <div className="flex flex-col items-center opacity-20">
                                                    <FileText className="w-12 h-12 mb-2" />
                                                    <p className="font-black text-sm uppercase tracking-widest">Sin movimientos registrados</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        movements.filter(m => m.accountId === viewingArqueo).map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-4 font-bold text-slate-500 pl-2">{new Date(m.date).toLocaleDateString()}</td>
                                                <td className="py-4">
                                                    <div className="font-bold text-slate-800 dark:text-slate-100">{m.description}</div>
                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.type}</div>
                                                </td>
                                                <td className={`py-4 text-right pr-2 font-black tabular-nums ${m.amount >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {m.amount >= 0 ? '+' : ''}${Math.abs(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Saldo Actual en Libros</p>
                                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                    $ {accounts.find(a => a.id === viewingArqueo)?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h4>
                            </div>
                            <button onClick={() => setViewingArqueo(null)} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-950 transition-all">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Depositar Cheque */}
            {depositingCheque && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleDepositCheque}>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/20">
                                <h3 className="font-black text-indigo-800 dark:text-indigo-100 uppercase tracking-tight flex items-center gap-2">
                                    <Building className="w-5 h-5" /> Depositar Cheque
                                </h3>
                                <button type="button" onClick={() => setDepositingCheque(null)} className="text-indigo-400 hover:text-indigo-600">&times;</button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cheque a depositar</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-100">
                                        #{cheques.find(c => c.id === depositingCheque)?.number} - {cheques.find(c => c.id === depositingCheque)?.bankInfo}
                                    </div>
                                    <div className="text-lg font-black text-indigo-600">
                                        $ {cheques.find(c => c.id === depositingCheque)?.amount.toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cuenta Bancaria de Destino</label>
                                    <select
                                        required
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl focus:border-indigo-500 font-bold"
                                        value={destinationBankId}
                                        onChange={e => setDestinationBankId(e.target.value)}
                                    >
                                        <option value="">-- Seleccione un Banco --</option>
                                        {bankAccounts.map(b => (
                                            <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex gap-3">
                                <button type="button" onClick={() => setDepositingCheque(null)} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-100">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Confirmar Depósito</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal: Nueva Caja / Cuenta Bancaria */}
            {isAddingAccount && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <form onSubmit={handleCreateAccount}>
                            <div className={`p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center ${newAccountData.type === 'bank' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-emerald-50 dark:bg-emerald-900/20'}`}>
                                <h3 className={`font-black uppercase tracking-tight flex items-center gap-2 ${newAccountData.type === 'bank' ? 'text-blue-800 dark:text-blue-100' : 'text-emerald-800 dark:text-emerald-100'}`}>
                                    {newAccountData.type === 'bank' ? <Building className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                                    {newAccountData.type === 'bank' ? 'Nueva Cuenta Bancaria' : 'Crear Nueva Caja'}
                                </h3>
                                <button type="button" onClick={() => setIsAddingAccount(false)} className="text-slate-400 hover:text-slate-600 transition-colors">&times;</button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                        {newAccountData.type === 'bank' ? 'Nombre del Banco / Cuenta' : 'Nombre de la Caja'}
                                    </label>
                                    <input
                                        autoFocus
                                        required
                                        type="text"
                                        className={`w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all focus:ring-4 ${newAccountData.type === 'bank' ? 'focus:border-blue-500 focus:ring-blue-500/10' : 'focus:border-emerald-500 focus:ring-emerald-500/10'}`}
                                        value={newAccountData.name}
                                        onChange={e => setNewAccountData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder={newAccountData.type === 'bank' ? "Ej: Banco Nación Cta.Cte." : "Ej: Caja Chica Administración"}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Moneda</label>
                                    <select
                                        className={`w-full px-4 py-3 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all focus:outline-none ${newAccountData.type === 'bank' ? 'focus:border-blue-500' : 'focus:border-emerald-500'}`}
                                        value={newAccountData.currency}
                                        onChange={e => setNewAccountData(prev => ({ ...prev, currency: e.target.value }))}
                                    >
                                        <option value="ARS">Pesos (ARS)</option>
                                        <option value="USD_DIVISA">Dólar Divisa (U$D)</option>
                                        <option value="USD_BILLETE">Dólar Billete (US$)</option>
                                    </select>
                                </div>

                                {newAccountData.type === 'bank' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CUIT</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                                    value={newAccountData.cuit}
                                                    onChange={e => setNewAccountData(prev => ({ ...prev, cuit: e.target.value }))}
                                                    placeholder="30-..."
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Banco</label>
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                                    value={newAccountData.bankName}
                                                    onChange={e => setNewAccountData(prev => ({ ...prev, bankName: e.target.value }))}
                                                    placeholder="Galicia, etc."
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CBU / CVU</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                                value={newAccountData.cbu}
                                                onChange={e => setNewAccountData(prev => ({ ...prev, cbu: e.target.value }))}
                                                placeholder="22 dígitos..."
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Alias</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                                                value={newAccountData.alias}
                                                onChange={e => setNewAccountData(prev => ({ ...prev, alias: e.target.value }))}
                                                placeholder="alias.ejemplo"
                                            />
                                        </div>
                                    </>
                                )}

                                {newAccountData.type === 'bank' && (
                                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/50 flex gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-lg h-fit">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <p className="text-[10px] text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                                            Esta cuenta estará disponible para vincular cheques emitidos por Agrovista y para recibir depósitos de cheques de terceros.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex gap-3">
                                <button type="button" onClick={() => setIsAddingAccount(false)} className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
                                <button
                                    type="submit"
                                    className={`flex-1 px-4 py-2.5 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all ${newAccountData.type === 'bank' ? 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700' : 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700'}`}
                                >
                                    {newAccountData.type === 'bank' ? 'Agregar Banco' : 'Crear Caja'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal: Compartir Datos de Cuenta */}
            {sharingAccount && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Building className="w-10 h-10" />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Datos de Cuenta</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Para recibir transferencias</p>
                        </div>

                        <div className="px-8 py-4 space-y-5">
                            {[
                                { label: 'Banco', value: accounts.find(a => a.id === sharingAccount)?.bankName || accounts.find(a => a.id === sharingAccount)?.name, icon: <Landmark className="w-4 h-4" /> },
                                { label: 'CUIT', value: accounts.find(a => a.id === sharingAccount)?.cuit, icon: <FileText className="w-4 h-4" /> },
                                { label: 'CBU / CVU', value: accounts.find(a => a.id === sharingAccount)?.cbu, icon: <Landmark className="w-4 h-4" /> },
                                { label: 'Alias', value: accounts.find(a => a.id === sharingAccount)?.alias, icon: <Plus className="w-4 h-4" /> },
                            ].map((field, idx) => field.value && (
                                <div key={idx} className="group cursor-pointer" onClick={() => {
                                    navigator.clipboard.writeText(field.value!);
                                }}>
                                    <div className="flex justify-between items-end mb-1 px-1">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {field.icon} {field.label}
                                        </div>
                                        <Copy className="w-3.5 h-3.5 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-200 break-all transition-all group-hover:border-blue-200 dark:group-hover:border-blue-900">
                                        {field.value}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-8 pt-4 space-y-3">
                            <button
                                onClick={() => {
                                    const acc = accounts.find(a => a.id === sharingAccount);
                                    if (!acc) return;
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                        printWindow.document.write(`
                                            <html>
                                                <head>
                                                    <title>Datos Bancarios - \${acc.name}</title>
                                                    <style>
                                                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                                                        .card { max-width: 400px; margin: 0 auto; border: 2px solid #e2e8f0; border-radius: 20px; padding: 30px; }
                                                        .header { text-align: center; margin-bottom: 30px; }
                                                        .logo { font-size: 24px; font-weight: 900; color: #2563eb; text-transform: uppercase; margin-bottom: 5px; }
                                                        .subtitle { font-size: 10px; font-weight: 800; color: #94a3b8; letter-spacing: 2px; text-transform: uppercase; }
                                                        .field { margin-bottom: 20px; }
                                                        .label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                                                        .value { font-size: 16px; font-weight: 700; background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #f1f5f9; word-break: break-all; }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="card">
                                                        <div class="header">
                                                            <div class="logo">AGRO VISTA</div>
                                                            <div class="subtitle">Datos de Transferencia Bancaria</div>
                                                        </div>
                                                        \${acc.bankName ? \`<div class="field"><div class="label">Banco</div><div class="value">\${acc.bankName}</div></div>\` : ''}
                                                        \${acc.name ? \`<div class="field"><div class="label">Titular</div><div class="value">\${acc.name}</div></div>\` : ''}
                                                        \${acc.cuit ? \`<div class="field"><div class="label">CUIT</div><div class="value">\${acc.cuit}</div></div>\` : ''}
                                                        \${acc.cbu ? \`<div class="field"><div class="label">CBU / CVU</div><div class="value">\${acc.cbu}</div></div>\` : ''}
                                                        \${acc.alias ? \`<div class="field"><div class="label">Alias</div><div class="value">\${acc.alias}</div></div>\` : ''}
                                                    </div>
                                                    <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }</script>
                                                </body>
                                            </html>
                                        `);
                                        printWindow.document.close();
                                    }
                                }}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" /> Generar PDF / Imprimir
                            </button>
                            <button
                                onClick={() => setSharingAccount(null)}
                                className="w-full py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
