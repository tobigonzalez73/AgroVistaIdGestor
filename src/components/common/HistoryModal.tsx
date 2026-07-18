import { X, Search, FileText, Download } from 'lucide-react';
import { useAudit } from '../../context/AuditContext';
import { useMemo, useState } from 'react';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityId: string;
    entityTitle: string;
    entityType?: string;
}

export default function HistoryModal({ isOpen, onClose, entityId, entityTitle, entityType }: HistoryModalProps) {
    const { getEntriesByEntity } = useAudit();
    const [searchQuery, setSearchQuery] = useState('');

    // Using entityType to provide context in the modal
    const displayType = entityType ? entityType.replace('_', ' ').toUpperCase() : 'AUDITORÍA';

    const entries = useMemo(() => {
        const unfiltered = getEntriesByEntity(entityId);
        if (!searchQuery) return unfiltered;
        
        const lowQuery = searchQuery.toLowerCase();
        return unfiltered.filter(e => 
            e.userName.toLowerCase().includes(lowQuery) || 
            e.details?.toLowerCase().includes(lowQuery) ||
            e.action.toLowerCase().includes(lowQuery)
        );
    }, [entityId, getEntriesByEntity, searchQuery]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
                
                {/* Header - Styled like Finnegans */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Historial de Auditoría</h2>
                            <p className="text-xs text-slate-500 font-medium">{entityTitle}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 shrink-0">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar en el historial..."
                            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                            <Download className="w-3.5 h-3.5" />
                            Exportar
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800 z-10">
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha y Hora</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuario</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Acción</th>
                                <th className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalle</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {entries.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="opacity-20 mb-2">
                                            <FileText className="w-12 h-12 mx-auto" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">No se encontraron registros de auditoría.</p>
                                    </td>
                                </tr>
                            ) : (
                                entries.map((e) => (
                                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-0.5 text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded uppercase">{displayType}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                {new Date(e.timestamp).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {new Date(e.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{e.userName}</div>
                                            <div className="text-[10px] text-slate-400">ID: {e.userId}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase ${
                                                e.action === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' :
                                                e.action === 'update' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' :
                                                e.action === 'delete' ? 'bg-red-100 text-red-700 dark:bg-red-900/30' :
                                                'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30'
                                            }`}>
                                                {e.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-normal max-w-xs">{e.details}</p>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                    <button onClick={onClose} className="px-4 py-1.5 text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
