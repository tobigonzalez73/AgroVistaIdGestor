import { Sprout, Calendar, Clock, MapPin, CheckCircle2, Circle, Mail, FileText, UserPlus, ChevronDown, X, Edit, Star } from 'lucide-react';
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import NewApplicationModal from '../components/trials/NewApplicationModal';
import { emailService } from '../services/emailService';
import { MOCK_USERS } from '../services/chatService';
import type { ApplicationTask } from '../types/trial';

export default function Aplicaciones() {
    const { applications, trials, toggleAppStatus, handleAssignResponsible, handleRemoveResponsible, handleSetLeader } = useAppContext();
    const [filter, setFilter] = useState('todas');
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [editingAppId, setEditingAppId] = useState<string | null>(null);
    const [editingResponsible, setEditingResponsible] = useState<string | null>(null);
    const [tempEmail, setTempEmail] = useState('');

    // Get trial name for display if it's an ensayo-specific application
    const getTrialName = (trialId?: string) => {
        if (!trialId) return 'Aplicación General';
        const trial = trials.find(t => t.id === trialId);
        return trial ? trial.title : 'Ensayo Desconocido';
    };

    const onAssignResponsible = async (appId: string) => {
        if (tempEmail) {
            await handleAssignResponsible(appId, tempEmail);
            setTempEmail('');
        }
    };

    const handleNotifyResponsibles = async (app: ApplicationTask) => {
        try {
            await emailService.sendTaskReminder(app);
            alert(`Recordatorio enviado exitosamente a: ${app.responsibleEmails?.join(', ')}`);
        } catch (error) {
            alert('Hubo un error al intentar registrar el envío del correo.');
        }
    };

    const filteredApps = applications.filter(app => {
        if (filter === 'pendientes') return app.status === 'pendiente';
        if (filter === 'completadas') return app.status === 'completada';
        return true;
    });

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <Sprout className="w-7 h-7 mr-3 text-emerald-500" />
                        Aplicaciones y Manejo Agronómico
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Registro de labores, mezclas de productos y aplicaciones por ensayo.
                    </p>
                </div>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm font-medium transition-colors"
                >
                    <Calendar className="w-5 h-5 mr-1.5" />
                    Programar Labor
                </button>
            </div>

            <div className="flex space-x-4 mb-6">
                <button onClick={() => setFilter('todas')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'todas' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                    Todas
                </button>
                <button onClick={() => setFilter('pendientes')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'pendientes' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                    Pendientes
                </button>
                <button onClick={() => setFilter('completadas')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'completadas' ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                    Completadas
                </button>
            </div>

            <div className="space-y-4">
                {filteredApps.map(app => {
                    const hasNotes = !!app.notes;
                    return (
                        <div key={app.id} 
                            onClick={() => setEditingAppId(app.id)}
                            className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden cursor-pointer group/card"
                        >
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleAppStatus(app.id); }} 
                                            className="focus:outline-none flex-shrink-0 relative z-10" 
                                            title={app.status === 'completada' ? "Marcar como pendiente" : "Marcar como completada"}
                                        >
                                            {app.status === 'completada' ? (
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500 hover:text-emerald-600 transition-colors" />
                                            ) : (
                                                <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600 hover:text-emerald-500 transition-colors" />
                                            )}
                                        </button>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                                    {app.type === 'ensayo' ? getTrialName(app.trialId) : 'Labor General'}
                                                </h3>
                                                <span className={`px-2 py-0.5 text-xs font-medium rounded ${app.type === 'general' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                    {app.type === 'general' ? 'Lote Completo' : 'Ensayo'}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                <span className="font-medium mr-2 text-slate-600 dark:text-slate-300">Estadio/Condición:</span>
                                                {app.condition}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="text-sm border-l-2 border-emerald-500 pl-3">
                                        <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">Mezcla (Tanque):</p>
                                        <ul className="list-disc list-inside text-slate-600 dark:text-slate-400">
                                            {app.products.map((prod) => (
                                                <li key={prod.id} className="truncate">
                                                    {prod.product} ({prod.dose} {prod.unit})
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col md:items-end justify-center text-sm space-y-2">
                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                        <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                        Para fecha: <strong>{app.date}</strong>
                                    </div>
                                    <div className="flex items-center text-slate-600 dark:text-slate-300">
                                        <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                                        <span className="truncate">{app.location}</span>
                                    </div>
                                </div>

                                <div className="md:border-l md:border-slate-200 dark:md:border-slate-700 md:pl-4 flex flex-col items-end justify-center gap-2 min-w-[180px]">
                                    {app.responsibleEmails && app.responsibleEmails.length > 0 && app.status === 'pendiente' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleNotifyResponsibles(app); }} 
                                            className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:hover:bg-blue-900/60 rounded-md transition-colors font-bold w-full text-center flex items-center justify-center gap-1.5 relative z-10"
                                        >
                                            <Mail className="w-3.5 h-3.5" /> Notificar a todos
                                        </button>
                                    )}

                                    <div className="w-full flex flex-col gap-2">
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {(app.responsibleEmails || []).map(email => (
                                                <div
                                                    key={email}
                                                    onClick={(e) => { e.stopPropagation(); editingResponsible === app.id && handleSetLeader(app.id, email); }}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 border rounded text-[9px] font-medium transition-colors relative z-10 ${app.leaderEmail === email ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'}`}
                                                    style={{ cursor: editingResponsible === app.id ? 'pointer' : 'default' }}
                                                    title={app.leaderEmail === email ? "Líder de labor" : editingResponsible === app.id ? "Click para marcar como líder" : ""}
                                                >
                                                    {app.leaderEmail === email && <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                                                    <span className="truncate max-w-[80px]">{email}</span>
                                                    {editingResponsible === app.id && (
                                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveResponsible(app.id, email); }} className="text-red-500 hover:text-red-700 ml-0.5">
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {editingResponsible === app.id ? (
                                            <div className="w-full flex flex-col gap-1">
                                                <div className="relative">
                                                    <select
                                                        autoFocus
                                                        value=""
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val) {
                                                                if (val === 'manual') setTempEmail('');
                                                                else {
                                                                    setTempEmail(val);
                                                                    // We trigger the assign logic right away if it's a mock user
                                                                    handleAssignResponsible(app.id, val);
                                                                }
                                                            }
                                                        }}
                                                        className="text-[10px] w-full px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-400 outline-none appearance-none pr-6"
                                                    >
                                                        <option value="">+ Añadir...</option>
                                                        {MOCK_USERS.filter(u => u.email && !(app.responsibleEmails || []).includes(u.email)).map(u => (
                                                            <option key={u.id} value={u.email}>{u.name}</option>
                                                        ))}
                                                        <option value="manual">+ Email manual...</option>
                                                    </select>
                                                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1.5 pointer-events-none" />
                                                </div>

                                                {(MOCK_USERS.every(u => u.email !== tempEmail) && tempEmail !== '') && (
                                                    <div className="flex gap-1">
                                                        <input
                                                            type="email"
                                                            value={tempEmail}
                                                            onChange={(e) => setTempEmail(e.target.value)}
                                                            placeholder="Email..."
                                                            className="text-[10px] flex-1 px-2 py-1 rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-400 outline-none"
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter') onAssignResponsible(app.id);
                                                            }}
                                                        />
                                                        <button onClick={() => onAssignResponsible(app.id)} className="text-[10px] bg-blue-600 text-white px-2 rounded">Ok</button>
                                                    </div>
                                                )}

                                                <button onClick={(e) => { e.stopPropagation(); setEditingResponsible(null); }} className="text-[9px] text-slate-400 hover:text-slate-600 font-bold uppercase transition-colors text-right mt-1 relative z-10">Listo</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingResponsible(app.id);
                                                    setTempEmail('');
                                                }}
                                                className="group flex flex-col items-end w-full relative z-10"
                                                title="Clic para gestionar responsables"
                                            >
                                                {!app.responsibleEmails || app.responsibleEmails.length === 0 ? (
                                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 group-hover:text-blue-500 transition-colors">
                                                        <UserPlus className="w-3 h-3" />
                                                        <span className="italic">Asignar responsables</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-[10px] text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Edit className="w-3 h-3" /> Gestionar
                                                    </div>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {hasNotes && (
                                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                        <FileText className="w-3 h-3 text-emerald-500" /> Indicaciones / Observaciones
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 italic">
                                        "{app.notes}"
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
                {filteredApps.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                        No hay aplicaciones que coincidan con los filtros.
                    </div>
                )}
            </div>

            {isNewModalOpen && (
                <NewApplicationModal onClose={() => setIsNewModalOpen(false)} />
            )}

            {editingAppId && (
                <NewApplicationModal 
                    editingApplicationId={editingAppId} 
                    onClose={() => setEditingAppId(null)} 
                />
            )}
        </div>
    );
}
