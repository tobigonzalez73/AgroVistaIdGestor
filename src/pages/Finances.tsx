import { useState } from 'react';
import { Landmark, ArrowUpRight, ArrowDownRight, Users, User, Plus, MessageCircle, History, Edit2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import EntityStatementModal from '../components/finance/EntityStatementModal';
import NewEntityModal from '../components/finance/NewEntityModal';
import SidebarChat from '../components/chat/SidebarChat';
import HistoryModal from '../components/common/HistoryModal';

export default function Finances() {
    const { entities, calculateEntityBalance } = useFinance();
    const [activeTab, setActiveTab] = useState<'clients' | 'suppliers' | 'reimbursements'>('clients');
    const [searchTerm, setSearchTerm] = useState('');
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [chatConfig, setChatConfig] = useState<{ isOpen: boolean; entityId: string; entityTitle: string }>({
        isOpen: false,
        entityId: '',
        entityTitle: ''
    });


    // Filter entities by role and search term
    const displayedEntities = entities.filter(e => {
        const matchesTab = activeTab === 'clients' ? (e.type === 'client' || e.type === 'both') && !e.subtype
            : activeTab === 'suppliers' ? (e.type === 'supplier' || e.type === 'both') && !e.subtype
                : (e.subtype === 'partner_employee' || e.subtype === 'third_party');

        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = e.name.toLowerCase().includes(searchLower) || (e.cuit && e.cuit.includes(searchLower));

        return matchesTab && (searchTerm === '' || matchesSearch);
    });

    // Global Summary Calculation
    const calculateGlobalSummary = (typeFilter: 'clients' | 'suppliers' | 'reimbursements') => {
        const filtered = entities.filter(e => {
            return typeFilter === 'clients' ? (e.type === 'client' || e.type === 'both') && !e.subtype
                : typeFilter === 'suppliers' ? (e.type === 'supplier' || e.type === 'both') && !e.subtype
                    : (e.subtype === 'partner_employee' || e.subtype === 'third_party');
        });
        let totalARS = 0;
        let totalDivisa = 0;
        let totalBillete = 0;

        filtered.forEach(e => {
            const bal = calculateEntityBalance(e.id);
            totalARS += bal.ARS;
            totalDivisa += bal.USD_DIVISA;
            totalBillete += bal.USD_BILLETE;
        });

        return { ARS: totalARS, USD_DIVISA: totalDivisa, USD_BILLETE: totalBillete };
    };

    const clientSummary = calculateGlobalSummary('clients'); 
    const supplierSummary = calculateGlobalSummary('suppliers'); 
    const reimbursementSummary = calculateGlobalSummary('reimbursements'); 

    return (
        <div className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <Landmark className="w-7 h-7 mr-3 text-emerald-500" />
                        Cuentas Corrientes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Estado de cuenta bimonetario por cliente y proveedor
                    </p>
                </div>
            </div>

            {/* Global Summaries Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Por Cobrar (Clientes) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <ArrowDownRight className="w-5 h-5 text-emerald-500 mr-2" />
                            A Cobrar (Clientes)
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Saldos ARS</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">$ {clientSummary.ARS.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">USD Divisa</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">U$D {clientSummary.USD_DIVISA.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">USD Billete</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">U$D {clientSummary.USD_BILLETE.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Por Pagar (Proveedores) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <ArrowUpRight className="w-5 h-5 text-rose-500 mr-2" />
                            A Pagar (Proveedores)
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Deudas ARS</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">$ {supplierSummary.ARS.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">USD Divisa</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">U$D {supplierSummary.USD_DIVISA.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">USD Billete</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">U$D {supplierSummary.USD_BILLETE.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Debemos (Reintegros) */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            <Landmark className="w-5 h-5 text-indigo-500 mr-2" />
                            Debemos (Reintegros)
                        </h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Saldos ARS</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">$ {reimbursementSummary.ARS.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">USD Divisa</span>
                            <span className="font-bold text-blue-700 dark:text-blue-300">U$D {reimbursementSummary.USD_DIVISA.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-lg">
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">USD Billete</span>
                            <span className="font-bold text-emerald-700 dark:text-emerald-300">U$D {reimbursementSummary.USD_BILLETE.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Entity List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="flex -mb-px" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('clients')}
                            className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex justify-center items-center transition-colors
                                ${activeTab === 'clients'
                                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            <Users className="w-4 h-4 mr-2" />
                            Clientes
                        </button>
                        <button
                            onClick={() => setActiveTab('suppliers')}
                            className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex justify-center items-center transition-colors
                                ${activeTab === 'suppliers'
                                    ? 'border-rose-500 text-rose-600 dark:text-rose-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            <User className="w-4 h-4 mr-2" />
                            Proveedores
                        </button>
                        <button
                            onClick={() => setActiveTab('reimbursements')}
                            className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm flex justify-center items-center transition-colors
                                ${activeTab === 'reimbursements'
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                                }`}
                        >
                            <Landmark className="w-4 h-4 mr-2" />
                            Reintegros
                        </button>
                    </nav>
                </div>

                {/* Buscador */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between gap-4">
                    <input
                        type="text"
                        placeholder={activeTab === 'clients' ? "Buscar cliente por nombre o CUIT..." : activeTab === 'suppliers' ? "Buscar proveedor por nombre o CUIT..." : "Buscar socio/empleado/tercero por nombre o CUIT..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsEntityModalOpen(true)}
                            className={`flex items-center px-4 py-2 rounded-lg shadow-sm font-semibold text-sm transition-colors text-white ${activeTab === 'clients' ? 'bg-emerald-600 hover:bg-emerald-700' : activeTab === 'suppliers' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {activeTab === 'clients' ? 'Nuevo Cliente' : activeTab === 'suppliers' ? 'Nuevo Proveedor' : 'Nuevo Beneficiario'}
                        </button>
                        {editingEntityId && (
                            <button
                                type="button"
                                onClick={() => setShowHistory(true)}
                                className="flex items-center px-3 py-1 text-xs font-bold transition-colors border rounded-lg text-slate-600 hover:text-indigo-600 bg-white border-slate-200 hover:border-indigo-200"
                            >
                                <History className="w-3.5 h-3.5 mr-1.5" />
                                Historial
                            </button>
                        )}
                        {editingEntityId && (
                            <button
                                type="button"
                                onClick={() => setChatConfig(prev => ({ ...prev, isOpen: !prev.isOpen, entityId: editingEntityId, entityTitle: entities.find(e => e.id === editingEntityId)?.name || '' }))}
                                className={`flex items-center px-3 py-1 text-xs font-bold transition-colors border rounded-lg ${chatConfig.isOpen && chatConfig.entityId === editingEntityId ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 hover:text-indigo-600 bg-white border-slate-200 hover:border-indigo-200'}`}
                            >
                                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                Chat
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Entidad</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Saldo ARS</th>
                                <th className="px-6 py-4 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider text-right bg-blue-50/30 dark:bg-blue-900/10">Saldo U$D (Divisa)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-right bg-emerald-50/30 dark:bg-emerald-900/10">Saldo U$D (Billete)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {displayedEntities.map((entity) => {
                                const bal = calculateEntityBalance(entity.id);
                                return (
                                    <tr
                                        key={entity.id}
                                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedEntityId(entity.id)}
                                        title="Click para ver Estado de Cuenta"
                                    >
                                        <td className="px-6 py-4 relative group">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200">{entity.name}</div>
                                                    <div className="text-xs text-slate-500 mt-1">CUIT: {entity.cuit ?? 'N/A'}</div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingEntityId(entity.id);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                        title="Editar datos de la entidad"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setChatConfig({ isOpen: true, entityId: entity.id, entityTitle: entity.name });
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                        title="Conversaciones"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            <div className="flex flex-col items-end">
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    ${bal.ARS.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                {Math.abs(bal.availableARS) > 0.01 && (
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1 py-0.5 rounded mt-0.5">
                                                        Disp: ${bal.availableARS.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className="px-6 py-4 text-right font-medium bg-blue-50/10 dark:bg-blue-900/5 hover:bg-blue-100/50 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEntityId(entity.id);
                                            }}
                                            title="Ver Estado de Cuenta (Divisa)"
                                        >
                                            <div className="flex flex-col items-end">
                                                <span className="text-blue-700 dark:text-blue-300">
                                                    U$D {bal.USD_DIVISA.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                {Math.abs(bal.availableUSD_DIVISA) > 0.01 && (
                                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded mt-0.5">
                                                        Disp: U$D {bal.availableUSD_DIVISA.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td
                                            className="px-6 py-4 text-right font-medium bg-emerald-50/10 dark:bg-emerald-900/5 hover:bg-emerald-100/50 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedEntityId(entity.id);
                                            }}
                                            title="Ver Estado de Cuenta (Billete)"
                                        >
                                            <div className="flex flex-col items-end">
                                                <span className="text-emerald-700 dark:text-emerald-300">
                                                    U$D {bal.USD_BILLETE.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                                {Math.abs(bal.availableUSD_BILLETE) > 0.01 && (
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-1 py-0.5 rounded mt-0.5">
                                                        Disp: U$D {bal.availableUSD_BILLETE.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {displayedEntities.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        No hay {activeTab === 'clients' ? 'clientes' : activeTab === 'suppliers' ? 'proveedores' : 'socios/empleados o terceros'} registrados o que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedEntityId && (
                <EntityStatementModal
                    entityId={selectedEntityId}
                    onClose={() => setSelectedEntityId(null)}
                />
            )}
            {(isEntityModalOpen || editingEntityId) && (
                <NewEntityModal
                    initialType={activeTab === 'clients' ? 'client' : activeTab === 'suppliers' ? 'supplier' : 'both'}
                    initialSubtype={activeTab === 'reimbursements' ? 'partner_employee' : undefined}
                    editingEntityId={editingEntityId || undefined}
                    onClose={() => {
                        setIsEntityModalOpen(false);
                        setEditingEntityId(null);
                    }}
                />
            )}
            {showHistory && editingEntityId && (
                <HistoryModal
                    isOpen={showHistory}
                    onClose={() => setShowHistory(false)}
                    entityId={editingEntityId}
                    entityTitle={entities.find(e => e.id === editingEntityId)?.name || 'Entidad'}
                    entityType="finance_entity"
                />
            )}
            {chatConfig.isOpen && (
                <div className="fixed inset-y-0 right-0 z-[80] w-80 shadow-2xl border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300">
                    <SidebarChat
                        linkedFinanceId={chatConfig.entityId}
                        title={chatConfig.entityTitle}
                        subtitle="Comunicaciones sobre esta entidad"
                        onClose={() => setChatConfig(prev => ({ ...prev, isOpen: false }))}
                    />
                </div>
            )}
        </div>
    );
}
