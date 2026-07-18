import { useState } from 'react';
import { X, Check, Bell, Plus, Clock } from 'lucide-react';
import { useTasks, type TaskStatus, type TaskResponsible } from '../../context/TaskContext';
import { useAuth } from '../../context/UserContext';
import { useAppContext } from '../../context/AppContext';
import { useNotifications } from '../../context/NotificationContext';
import type { Trial } from '../../types/trial';

function toYMD(d: Date) { return d.toISOString().slice(0, 10); }

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
    pendiente: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
    en_progreso: { label: 'En progreso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
    completada: { label: 'Completada', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
    cancelada: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
    postergada: { label: 'Postergada', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
};



export function TaskModal({ task, defaultDate, onClose }: { task?: any; defaultDate?: string; onClose: () => void }) {
    const { tasks, addTask, updateTask } = useTasks();
    const { trials, setTrials, setApplications } = useAppContext();
    const { addNotification } = useNotifications();
    const { users, currentUser } = useAuth();
    const isEdit = !!task;
    const isTrialActivity = task?.id?.startsWith('trialgroup') || task?.id?.startsWith('group-') || task?.id?.startsWith('trial-task-') || task?.trialId;

    // Trial info if applicable
    const trialId = task?.id?.split(' - ')[1] || task?.id?.split('-')[1] || task?.trialId;
    const trial = isTrialActivity && trialId ? trials.find((t: Trial) => t.id === trialId) : null;

    // Support both Task type and UnifiedTask/CalItem type
    const [title, setTitle] = useState(task?.title || '');
    const [description, setDescription] = useState(task?.description || '');
    const [date, setDate] = useState(task?.date || defaultDate || toYMD(new Date()));
    const [hasTime, setHasTime] = useState(task?.hasTime ?? false);
    const [time, setTime] = useState(task?.time || '09:00');
    const [status, setStatus] = useState<TaskStatus>(task?.status || 'pendiente');
    const [responsibles, setResponsibles] = useState<TaskResponsible[]>(
        task?.responsibles?.length ? task.responsibles : [{ name: '', email: '' }]
    );

    const addResponsible = () => setResponsibles(p => [...p, { name: '', email: '' }]);
    const removeResponsible = (i: number) => setResponsibles(p => p.filter((_, j) => j !== i));
    const setR = (i: number, field: keyof TaskResponsible, val: string) =>
        setResponsibles(p => p.map((r, j) => j === i ? { ...r, [field]: val } : r));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        const payload = {
            title: title.trim(),
            description: description.trim(),
            date,
            hasTime,
            time: hasTime ? time : undefined,
            status,
            responsibles: responsibles.filter(r => r.name.trim())
        };

        // Case 1: Manual task already in TaskContext
        const existingInContext = task ? tasks.find(t => t.id === task.id) : null;

        if (existingInContext) {
            updateTask(task.id, payload);
        } 
        // Case 2: Trial Activity (Traceability)
        else if (isTrialActivity) {
            // Identify specific entity from Task ID
            const taskParts = task.id ? task.id.split('-') : [];
            const entityType = taskParts[3]; // 'app', 'milestone', or 'eval'
            const entityId = taskParts[4];   // the original ID

            // Update Trials (Source of Truth)
            setTrials((prev: Trial[]) => prev.map(t => {
                if (t.id === trialId) {
                    const updated = { ...t };
                    
                    if (entityType === 'app') {
                        updated.plannedApplications = t.plannedApplications?.map(pa => 
                            pa.id === entityId ? { ...pa, date, isVariable: false } : pa
                        );
                    } else if (entityType === 'milestone') {
                        updated.milestones = t.milestones?.map(m => 
                            m.id === entityId ? { ...m, date, isVariable: false } : m
                        );
                    } else if (entityType === 'eval') {
                        updated.evaluations = t.evaluations?.map(ev => 
                            ev.id === entityId ? { ...ev, date, isVariable: false } : ev
                        );
                    } else {
                        // Fallback to date-based matching if ID-based fails or for older tasks
                        const originalDate = task.date;
                        updated.plannedApplications = t.plannedApplications?.map(pa => {
                            if (pa.date === originalDate || (!pa.date && t.date === originalDate)) {
                                return { ...pa, date, isVariable: false };
                            }
                            return pa;
                        });
                        updated.evaluations = t.evaluations?.map(ev => {
                            if (ev.date === originalDate) {
                                return { ...ev, date, isVariable: false };
                            }
                            return ev;
                        });
                        updated.milestones = t.milestones?.map(m => {
                            if (m.date === originalDate) {
                                return { ...m, date, isVariable: false };
                            }
                            return m;
                        });
                    }
                    
                    return updated;
                }
                return t;
            }));

            // Update Applications (Status & execution)
            setApplications(prev => prev.map(app => {
                // If it's exactly this task or belongs to the same trial and same original date
                const isMatch = app.id === task.id || (app.trialId === trialId && app.date === task.date);
                if (isMatch) {
                    return { 
                        ...app, 
                        date, 
                        status, 
                        notes: description,
                        responsibleEmails: payload.responsibles.map(r => r.email)
                    };
                }
                return app;
            }));

            addNotification({
                userId: currentUser.id,
                title: 'Labor Actualizada',
                message: `Se ha actualizado la labor "${title}" con estado ${status}.`,
                type: 'info'
            });
        }
        // Case 3: Promote trial activity or new task
        else {
            addTask(payload);
        }
        onClose();
    };

    const handlePostpone = () => {
        // Just set the status and let user pick any date in the picker
        setStatus('postergada');
        addNotification({
            userId: currentUser.id,
            title: 'Listo para Postergar',
            message: `Por favor, seleccioná la nueva fecha en el calendario y hacé clic en "Guardar Cambios".`,
            type: 'warning'
        });
    };

    const reminderDate = (() => {
        try {
            const d = new Date(date + 'T12:00:00');
            d.setDate(d.getDate() - 1);
            return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        } catch { return ''; }
    })();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-5 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-700">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{isEdit ? 'Modificar tarea' : 'Nueva tarea'}</h2>
                        {trial ? (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">{trial.title} — {trial.location}</p>
                        ) : (
                            <p className="text-xs text-slate-400">{isEdit ? 'Editá los detalles de esta labor/tarea' : 'Completá los datos de la actividad'}</p>
                        )}
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
                    {task?.isVariable && (
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/50 flex flex-col gap-1 shadow-sm">
                            <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5" /> Actividad Biológica (Estimada)
                            </h4>
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                                Esta actividad depende de tiempos biológicos. Al fijar una fecha definitiva, se sincronizará en el calendario y dejará de ser estimada.
                            </p>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Título *</label>
                        <input required type="text" value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white text-slate-950 text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Descripción / Resumen Técnico</label>
                        <textarea rows={5} value={description} onChange={e => setDescription(e.target.value)}
                            placeholder="T1... mediciones..."
                            className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white text-slate-950 text-sm resize-none focus:ring-2 focus:ring-indigo-500" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Fecha *</label>
                            <input required type="date" value={date} onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white text-slate-950 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                                Horario
                                <label className="ml-2 normal-case font-normal text-slate-400 cursor-pointer inline-flex items-center gap-1">
                                    <input type="checkbox" checked={hasTime} onChange={e => setHasTime(e.target.checked)} className="rounded" /> activar
                                </label>
                            </label>
                            <input type="time" value={time} disabled={!hasTime} onChange={e => setTime(e.target.value)}
                                className={`w-full px-3 py-2.5 border-2 rounded-xl text-sm ${hasTime ? 'border-slate-200 dark:border-slate-600 bg-white text-slate-950' : 'border-slate-100 dark:border-slate-700 bg-slate-50 text-slate-300'}`} />
                        </div>
                    </div>

                    {reminderDate && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <p className="text-[11px] text-amber-700 dark:text-amber-300 italic">
                                Recordatorio automático: <strong>{reminderDate} a las 12:00 hs</strong>
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                        <div className="flex gap-2 flex-wrap">
                            {(Object.entries(STATUS_CFG) as [TaskStatus, typeof STATUS_CFG[TaskStatus]][]).map(([k, v]) => (
                                <button key={k} type="button" onClick={() => setStatus(k)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${status === k ? `${v.bg} ${v.color} ${v.border}` : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-slate-300'}`}>
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">
                            Responsable{responsibles.length > 1 ? 's' : ''}
                        </label>
                        <div className="space-y-2">
                            {responsibles.map((r, i) => (
                                <div key={i} className="flex gap-2">
                                    <select
                                        value={users.find(u => u.name === r.name)?.id || ''}
                                        onChange={e => {
                                            const u = users.find(u => u.id === e.target.value);
                                            if (u) {
                                                setR(i, 'name', u.name);
                                                setR(i, 'email', u.email || '');
                                            } else {
                                                setR(i, 'name', '');
                                                setR(i, 'email', '');
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white text-slate-950 text-sm"
                                    >
                                        <option value="">Seleccionar Usuario...</option>
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name} {u.role === 'external' ? '(Externo)' : ''}</option>
                                        ))}
                                    </select>
                                    <input type="email" placeholder="correo@ejemplo.com" value={r.email} onChange={e => setR(i, 'email', e.target.value)}
                                        className="flex-1 px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white text-slate-950 text-sm" />
                                    {responsibles.length > 1 && (
                                        <button type="button" onClick={() => removeResponsible(i)} className="p-2 text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addResponsible}
                            className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> Agregar responsable
                        </button>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
                    {isEdit && status !== 'completada' && status !== 'postergada' && (
                        <button type="button" onClick={handlePostpone} className="px-4 py-2.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-xl font-bold text-sm hover:bg-purple-200 transition-colors">
                            Postergar
                        </button>
                    )}
                    <button type="submit" className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                        <Check className="w-4 h-4" /> {isEdit ? 'Guardar Cambios' : 'Crear tarea'}
                    </button>
                </div>
            </form>
        </div>
    );
}
