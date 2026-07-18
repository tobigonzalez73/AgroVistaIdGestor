import { useState } from 'react';
import { X, Save, Map as MapIcon, Link as LinkIcon, Edit2, History, AlertCircle } from 'lucide-react';
import { useGeo } from '../../context/GeoContext';
import { useAudit } from '../../context/AuditContext';
import { useAuth } from '../../context/UserContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import HistoryModal from '../common/HistoryModal';

interface Props {
    establishmentId: string;
    onClose: () => void;
    editingPlotId?: string;
}

export default function NewPlotModal({ establishmentId, onClose, editingPlotId }: Props) {
    const { addPlot, updatePlot, establishments, plots } = useGeo();
    const { logAction } = useAudit();
    const { currentUser } = useAuth();

    const establishment = establishments.find(e => e.id === establishmentId);
    const editingPlot = editingPlotId ? plots.find(p => p.id === editingPlotId) : null;

    const [name, setName] = useState(editingPlot?.name ?? '');
    const [hectares, setHectares] = useState(editingPlot?.hectares?.toString() ?? '');
    const [mapUrl, setMapUrl] = useState(editingPlot?.mapUrl ?? '');
    const [showHistory, setShowHistory] = useState(false);
    const [isActive, setIsActive] = useState(editingPlot?.isActive !== false);

    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const cleanData = (obj: any) => {
            const cleaned: any = {};
            Object.keys(obj).forEach(key => {
                if (obj[key] !== undefined) cleaned[key] = obj[key];
            });
            return cleaned;
        };

        try {
            if (editingPlotId && editingPlot) {
                const updated = cleanData({
                    ...editingPlot,
                    name: name.trim(),
                    hectares: Number(hectares) || 0,
                    mapUrl: mapUrl.trim() || undefined,
                    isActive
                });
                await updatePlot(editingPlotId, updated);
                logAction({
                    userId: currentUser?.id || 'unknown',
                    userName: currentUser?.name || 'Sistema',
                    action: 'update',
                    module: 'catalogos',
                    entityId: editingPlotId,
                    entityName: name,
                    details: `Editado lote ${name} en ${establishment?.name}`
                });
                onClose();
            } else {
                const newId = doc(collection(db, 'plots')).id;
                const plot = cleanData({
                    id: newId,
                    establishmentId,
                    name: name.trim(),
                    hectares: Number(hectares) || 0,
                    mapUrl: mapUrl.trim() || undefined,
                    isActive: true
                });
                await addPlot(plot);

                logAction({
                    userId: currentUser?.id || 'unknown',
                    userName: currentUser?.name || 'Sistema',
                    action: 'create',
                    module: 'catalogos',
                    entityId: newId,
                    entityName: name,
                    details: `Creado lote ${name} en ${establishment?.name}`
                });
                onClose();
            }
        } catch (error) {
            console.error("Error saving plot:", error);
            alert("Error al guardar lote en Firebase: " + (error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    if (!establishment) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            {editingPlotId ? (
                                <><Edit2 className="w-5 h-5 mr-2 text-indigo-500" /> Editar Lote</>
                            ) : (
                                <><MapIcon className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Lote / Sector</>
                            )}
                        </h2>
                        {editingPlotId && (
                            <button
                                type="button"
                                onClick={() => setShowHistory(true)}
                                className="flex items-center px-3 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg transition-colors hover:border-indigo-200"
                            >
                                <History className="w-3.5 h-3.5 mr-1.5" />
                                Historial
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Establecimiento: <span className="text-slate-800 dark:text-slate-200">{establishment.name}</span></p>
                </div>

                <div className="p-6">
                    <form id="new-plot-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre / Identificador del Lote *</label>
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-black" placeholder="Ej: Lote 14 Norte" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Superficie (ha) *</label>
                            <input required type="number" min="0.1" step="0.1" value={hectares} onChange={e => setHectares(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" placeholder="Ej: 50.5" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                <LinkIcon className="w-4 h-4 mr-1 text-slate-400" /> Enlace de Google Maps Polígono (Opcional)
                            </label>
                            <input type="url" value={mapUrl} onChange={e => setMapUrl(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold text-xs" placeholder="https://maps.app.goo.gl/..." />
                            <p className="text-xs text-slate-500 mt-1 font-medium">Si tienes un MyMap o link directo georreferenciado, pégalo aquí.</p>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap justify-between items-center gap-3 rounded-b-2xl">
                    <div className="flex items-center">
                        {editingPlotId && (
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 ${
                                    isActive 
                                    ? 'text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/30' 
                                    : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:border-emerald-900/30 dark:bg-emerald-900/20'
                                }`}
                            >
                                <AlertCircle className="w-4 h-4" />
                                {isActive ? 'Dar de Baja' : 'Reactivar'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" form="new-plot-form" disabled={isLoading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center disabled:opacity-50">
                            <Save className="w-4 h-4 mr-2" />
                            {isLoading ? 'Guardando...' : editingPlotId ? 'Guardar Cambios' : 'Guardar Lote'}
                        </button>
                    </div>
                </div>
            </div>

            {showHistory && editingPlotId && (
                <HistoryModal
                    isOpen={showHistory}
                    entityId={editingPlotId}
                    onClose={() => setShowHistory(false)}
                    entityTitle={`Historial de ${name}`}
                />
            )}
        </div>
    );
}
