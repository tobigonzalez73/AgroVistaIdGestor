import { useState } from 'react';
import { X, Save, MapPin, Link as LinkIcon, Building, Edit2, History, AlertCircle } from 'lucide-react';
import { useGeo } from '../../context/GeoContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import { useFinance } from '../../context/FinanceContext';
import { useAudit } from '../../context/AuditContext';
import { useAuth } from '../../context/UserContext';
import HistoryModal from '../common/HistoryModal';
import type { EstablishmentType, Establishment } from '../../types/geo';

interface Props {
    onClose: () => void;
    editingEstablishmentId?: string;
}

export default function NewEstablishmentModal({ onClose, editingEstablishmentId }: Props) {
    const { addEstablishment, updateEstablishment, establishments } = useGeo();
    const { entities } = useFinance();
    const { logAction } = useAudit();
    const { currentUser } = useAuth();

    const editingEst = editingEstablishmentId ? establishments.find(e => e.id === editingEstablishmentId) : null;

    const [name, setName] = useState(editingEst?.name ?? '');
    const [type, setType] = useState<EstablishmentType>(editingEst?.type ?? 'Campo Abierto');
    const [locationStr, setLocationStr] = useState(editingEst?.locationStr ?? '');
    const [cuitOwner, setCuitOwner] = useState(editingEst?.cuitOwner ?? '');
    const [totalHectares, setTotalHectares] = useState(editingEst?.totalHectares?.toString() ?? '');
    const [mapUrl, setMapUrl] = useState(editingEst?.mapUrl ?? '');
    const [showHistory, setShowHistory] = useState(false);
    const [isActive, setIsActive] = useState(editingEst?.isActive !== false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingEstablishmentId && editingEst) {
            const updated: Establishment = {
                ...editingEst,
                name: name.trim(),
                type,
                locationStr: locationStr.trim(),
                cuitOwner: cuitOwner || undefined,
                totalHectares: Number(totalHectares) || 0,
                mapUrl: mapUrl.trim() || undefined,
                isActive
            };
            updateEstablishment(editingEstablishmentId, updated);
            logAction({
                userId: currentUser?.id || 'unknown',
                userName: currentUser?.name || 'Sistema',
                action: 'update',
                module: 'catalogos',
                entityId: editingEstablishmentId,
                entityName: name,
                details: `Editado establecimiento ${name}`
            });
            onClose();
        } else {
            const newId = doc(collection(db, 'establishments')).id;
            const est: Establishment = {
                id: newId,
                name: name.trim(),
                type,
                locationStr: locationStr.trim(),
                cuitOwner: cuitOwner || undefined,
                totalHectares: Number(totalHectares) || 0,
                mapUrl: mapUrl.trim() || undefined,
                isActive: true
            };

            addEstablishment(est);
            logAction({
                userId: currentUser?.id || 'unknown',
                userName: currentUser?.name || 'Sistema',
                action: 'create',
                module: 'catalogos',
                entityId: newId,
                entityName: name,
                details: `Creado establecimiento ${name}`
            });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            {editingEstablishmentId ? (
                                <><Edit2 className="w-5 h-5 mr-2 text-indigo-500" /> Editar Establecimiento</>
                            ) : (
                                <><Building className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Establecimiento</>
                            )}
                        </h2>
                        {editingEstablishmentId && (
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

                <div className="p-6">
                    <form id="new-establishment-form" onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Establecimiento *</label>
                            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-black" placeholder="Ej: Estancia La Paz" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo *</label>
                                <select required value={type} onChange={e => setType(e.target.value as EstablishmentType)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold">
                                    <option value="Campo Abierto">Campo Abierto</option>
                                    <option value="Invernáculo">Invernáculo</option>
                                    <option value="Mixto">Mixto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Superficie Total (ha) *</label>
                                <input required type="number" min="0.1" step="0.1" value={totalHectares} onChange={e => setTotalHectares(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                    <MapPin className="w-4 h-4 mr-1 text-slate-400" /> Ubicación (Ciudad, Provincia) *
                                </label>
                                <input required type="text" value={locationStr} onChange={e => setLocationStr(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" placeholder="Ej: Pergamino, Buenos Aires" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                <LinkIcon className="w-4 h-4 mr-1 text-slate-400" /> Enlace de Google Maps
                            </label>
                            <input type="url" value={mapUrl} onChange={e => setMapUrl(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold text-xs" placeholder="https://maps.app.goo.gl/..." />
                            <p className="text-xs text-slate-500 mt-1">Pega el link directo para abrirlo con un clic desde el catálogo.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asociar a Cliente/Titular (Opcional)</label>
                            <select value={cuitOwner} onChange={e => setCuitOwner(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold">
                                <option value="">Sin asociar / Propio</option>
                                {entities.filter(e => e.type === 'client').map(c => (
                                    <option key={c.id} value={c.cuit}>{c.name} {c.cuit ? `(${c.cuit})` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap justify-between items-center gap-3 rounded-b-2xl">
                    <div className="flex items-center">
                        {editingEstablishmentId && (
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
                        <button type="submit" form="new-establishment-form" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center">
                            <Save className="w-4 h-4 mr-2" />
                            {editingEstablishmentId ? 'Guardar Cambios' : 'Crear'}
                        </button>
                    </div>
                </div>
            </div>

            {showHistory && editingEstablishmentId && (
                <HistoryModal
                    isOpen={showHistory}
                    entityId={editingEstablishmentId}
                    onClose={() => setShowHistory(false)}
                    entityTitle={`Historial de ${name}`}
                />
            )}
        </div>
    );
}
