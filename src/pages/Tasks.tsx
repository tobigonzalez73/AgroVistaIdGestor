import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Plus, ChevronLeft, ChevronRight, Calendar, Columns, X,
    Trash2, Clock, User, Mail, CalendarDays,
    ArrowRight, History, Bell, MailOpen, MessageCircle,
    CheckSquare, Sprout, FlaskConical, AlertCircle
} from 'lucide-react';
import {
    useTasks, type Task, type TaskStatus, type TaskResponsible, type PostponementRecord,
    getTasksDueForReminder, buildReminderMailto
} from '../context/TaskContext';
import { TaskModal } from '../components/tasks/TaskModal';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/UserContext';
import SidebarChat from '../components/chat/SidebarChat';

// ─── Utility ─────────────────────────────────────────────────────────────────
function toYMD(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(d.getDate() - d.getDay()); return r; }

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];


export type UnifiedTaskType = 'task' | 'labur' | 'evaluacion';

export interface UnifiedTask {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    hasTime?: boolean;
    status: TaskStatus;
    type: UnifiedTaskType;
    responsibles?: TaskResponsible[];
    approvals?: any[];
    origin?: any; // To store original object if needed
}

const STATUS_CFG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
    pendiente: { label: 'Pendiente', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
    en_progreso: { label: 'En progreso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
    completada: { label: 'Completada', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-300' },
    cancelada: { label: 'Cancelada', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
    postergada: { label: 'Postergada', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' },
};

const TYPE_CFG: Record<UnifiedTaskType, { label: string; color: string; icon: any }> = {
    task: { label: 'Tarea', color: 'text-slate-500', icon: CheckSquare },
    labur: { label: 'Labor', color: 'text-emerald-500', icon: Sprout },
    evaluacion: { label: 'Evaluación', color: 'text-indigo-500', icon: FlaskConical }
};

// ─── Reminder Banner ──────────────────────────────────────────────────────────
function ReminderBanner() {
    const { tasks, markReminderSent } = useTasks();
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const due = useMemo(() => getTasksDueForReminder(tasks).filter(t => !dismissed.has(t.id)), [tasks, dismissed]);
    if (due.length === 0) return null;

    return (
        <div className="mx-4 mt-3 mb-0">
            <div className="bg-amber-50 border border-amber-300 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 border-b border-amber-300">
                    <Bell className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-sm font-black text-amber-800">Recordatorios — {due.length} tarea{due.length > 1 ? 's' : ''} para mañana</p>
                </div>
                {due.map(task => {
                    const mailto = buildReminderMailto(task);
                    return (
                        <div key={task.id} className="flex items-center gap-3 px-4 py-3 border-b border-amber-200 last:border-0">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-amber-900 truncate">{task.title}</p>
                                <p className="text-xs text-amber-600">
                                    {new Date(task.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    {task.hasTime && task.time ? ` · ${task.time}` : ''}
                                    {' — '}
                                    {task.responsibles.map(r => r.name).join(', ')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {mailto && (
                                    <a href={mailto} onClick={() => markReminderSent(task.id)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors">
                                        <MailOpen className="w-3.5 h-3.5" /> Enviar recordatorio
                                    </a>
                                )}
                                <button onClick={() => { markReminderSent(task.id); setDismissed(p => new Set([...p, task.id])); }}
                                    className="p-1.5 text-amber-400 hover:text-amber-600 rounded-lg hover:bg-amber-200 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Postpone Modal ───────────────────────────────────────────────────────────
function PostponeModal({ task, onClose }: { task: Task; onClose: () => void }) {
    const { postponeTask } = useTasks();
    const tomorrow = toYMD(addDays(new Date(), 1));
    const [newDate, setNewDate] = useState(toYMD(addDays(new Date(task.date + 'T12:00:00'), 1)));
    const [newTime, setNewTime] = useState(task.time || '');

    const handleConfirm = () => {
        postponeTask(task.id, newDate, task.hasTime ? newTime : undefined);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-200 dark:border-purple-700">
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-slate-100 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-purple-600" /> Postergar tarea</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{task.title}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                    {task.postponements.length > 0 && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 flex items-center gap-1"><History className="w-3 h-3" /> Historial de postergaciones</p>
                            {task.postponements.map((p, i) => (
                                <p key={i} className="text-xs text-slate-500">
                                    {new Date(p.fromDate + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    {p.fromTime ? ` ${p.fromTime}` : ''}
                                    {' → '}
                                    {new Date(p.toDate + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    {p.toTime ? ` ${p.toTime}` : ''}
                                </p>
                            ))}
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Nueva fecha</label>
                        <input type="date" value={newDate} min={tomorrow} onChange={e => setNewDate(e.target.value)}
                            className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500" />
                    </div>
                    {task.hasTime && (
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase mb-1.5">Nuevo horario (opcional)</label>
                            <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                                className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-purple-500" />
                        </div>
                    )}
                    <p className="text-xs text-slate-400 flex items-start gap-1.5"><Bell className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />Se enviará un nuevo recordatorio el día anterior a las 12:00 hs.</p>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors">Cancelar</button>
                    <button onClick={handleConfirm} className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                        <ArrowRight className="w-4 h-4" /> Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}



export interface UnifiedTask {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    hasTime?: boolean;
    status: TaskStatus;
    type: UnifiedTaskType;
    responsibles?: TaskResponsible[];
    postponements?: PostponementRecord[];
    isVariable?: boolean;
}

// ─── Task Card (for list / detail) ────────────────────────────────────────────
function TaskCard({ task, onEdit, onPostpone, onDelete, onStatusChange, onChat }: {
    task: UnifiedTask;
    onEdit: () => void;
    onPostpone: () => void;
    onDelete: () => void;
    onStatusChange: (s: TaskStatus) => void;
    onChat: () => void;
}) {
    const { setApplications } = useAppContext();
    const { currentUser } = useAuth();

    const sta = STATUS_CFG[task.status] || STATUS_CFG.pendiente;
    const done = task.status === 'completada' || task.status === 'cancelada';
    const typeInfo = TYPE_CFG[task.type];
    const TypeIcon = typeInfo.icon;
    const isManualTask = task.type === 'task';

    // buildReminderMailto expects a Task. We only use it for manual tasks.
    const mailto = isManualTask ? buildReminderMailto(task as any) : '';

    const handleApprove = (status: 'approved' | 'rejected') => {
        setApplications(prev => prev.map(app => {
            if (app.id === task.id && app.approvals) {
                return {
                    ...app,
                    approvals: app.approvals.map(a =>
                        a.userId === currentUser?.id ? { ...a, status, date: new Date().toISOString() } : a
                    )
                };
            }
            return app;
        }));
    };

    return (
        <div className={`rounded-2xl border-2 p-4 ${sta.border} ${sta.bg} transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-xl bg-white dark:bg-slate-800 border ${typeInfo.color} border-current opacity-80 shrink-0`}>
                        <TypeIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${typeInfo.color}`}>{typeInfo.label}</span>
                                <span className="text-slate-300">•</span>
                                <span className={`shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black ${sta.bg} ${sta.color} border ${sta.border}`}>{sta.label}</span>
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onChat(); }}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-all"
                                title="Comunicaciones sobre esta labor"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </button>
                        </div>
                        <p className={`text-base font-black text-slate-800 dark:text-slate-100 ${done ? 'line-through opacity-60' : ''}`}>
                            {task.isVariable && <span className="mr-1.5 inline-flex items-center text-amber-500" title="Fecha Variable (Biológica)"><Clock className="w-4 h-4" /></span>}
                            {task.title}
                        </p>
                        {task.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{task.description}</p>}
                    </div>
                </div>
            </div>

            {task.approvals?.some(a => a.userId === currentUser?.id && a.status === 'pending') && (
                <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-400">Requiere tu aprobación</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button onClick={(e) => { e.stopPropagation(); handleApprove('rejected'); }} className="flex-1 sm:flex-none px-3 py-1.5 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg text-xs font-bold">
                            Rechazar
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleApprove('approved'); }} className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-bold">
                            Aprobar
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                <span className={`flex items-center gap-1.5 ${task.isVariable ? 'text-amber-600 font-bold' : ''}`}>
                    <Calendar className={`w-3.5 h-3.5 ${task.isVariable ? 'text-amber-500' : 'text-slate-400'}`} />
                    {task.isVariable ? 'Estimada: ' : ''}
                    {new Date(task.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {task.hasTime && task.time && (
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> {task.time}
                    </span>
                )}
                {task.responsibles && task.responsibles.length > 0 && (
                    <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" /> {task.responsibles.map(r => r.name).filter(Boolean).join(', ')}
                    </span>
                )}
                {task.postponements && task.postponements.length > 0 && (
                    <span className="flex items-center gap-1 text-purple-500 font-bold">
                        <History className="w-3 h-3" /> Postergada {task.postponements.length}x
                    </span>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                <div className="flex gap-1.5 flex-wrap">
                    {(Object.keys(STATUS_CFG) as TaskStatus[]).map(s => (
                        <button key={s} onClick={() => onStatusChange(s)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all border ${task.status === s ? `${STATUS_CFG[s].bg} ${STATUS_CFG[s].color} ${STATUS_CFG[s].border}` : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-slate-300'}`}>
                            {STATUS_CFG[s].label}
                        </button>
                    ))}
                </div>
                <div className="flex-1" />
                {isManualTask && mailto && (
                    <a href={mailto}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700 text-xs font-bold rounded-xl hover:bg-amber-100 transition-colors">
                        <Mail className="w-3.5 h-3.5" /> Recordatorio
                    </a>
                )}
                {!done && isManualTask && (
                    <button onClick={onPostpone}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-700 text-xs font-bold rounded-xl hover:bg-purple-100 transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" /> Postergar
                    </button>
                )}
                <button onClick={onEdit} className="px-2.5 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors">
                    Editar
                </button>
                {isManualTask && (
                    <button onClick={onDelete} className="p-1.5 text-rose-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}

// ─── Calendar views ───────────────────────────────────────────────────────────
function MonthView({ refDate, tasks, onDayClick, onEdit }: { refDate: Date; tasks: UnifiedTask[]; onDayClick: (d: string) => void; onEdit: (t: UnifiedTask) => void }) {
    const today = toYMD(new Date());
    const start = startOfMonth(refDate);
    const firstCell = startOfWeek(start);
    const cells: Date[] = Array.from({ length: 42 }, (_, i) => addDays(firstCell, i));

    const byDay = useMemo(() => {
        const m: Record<string, UnifiedTask[]> = {};
        tasks.forEach(t => { if (!m[t.date]) m[t.date] = []; m[t.date].push(t); });
        return m;
    }, [tasks]);

    return (
        <div>
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                {DAYS_ES.map(d => <div key={d} className="py-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
                {cells.map(cell => {
                    const ymd = toYMD(cell);
                    const inMonth = cell.getMonth() === refDate.getMonth();
                    const isToday = ymd === today;
                    const dayTasks = byDay[ymd] || [];
                    return (
                        <div key={ymd} onClick={() => onDayClick(ymd)}
                            className={`min-h-[100px] p-1.5 border-b border-r border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors ${!inMonth ? 'bg-slate-50/60 dark:bg-slate-800/20' : ''}`}>
                            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black mb-1 ${isToday ? 'bg-indigo-600 text-white' : inMonth ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                                {cell.getDate()}
                            </div>
                            <div className="space-y-0.5">
                                {dayTasks.slice(0, 3).map(t => {
                                    const isLote = t.title === 'LABOR LOTE';
                                    const sta = STATUS_CFG[t.status] || STATUS_CFG.pendiente;
                                    const typeInfo = TYPE_CFG[t.type];
                                    return (
                                        <div key={t.id}
                                            onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                            className={`px-1.5 py-0.5 rounded text-[10px] ${isLote ? 'bg-purple-100 text-purple-800 border-purple-300 font-black' : `${sta.bg} ${sta.color} ${sta.border} font-bold`} cursor-pointer hover:shadow-md transition-shadow ${t.status === 'completada' || t.status === 'cancelada' ? 'opacity-50 line-through' : ''} border flex items-center gap-1 shadow-sm`}>
                                            {t.isVariable ? <Clock className="w-2.5 h-2.5 text-amber-500" /> : <typeInfo.icon className={`w-2.5 h-2.5 shrink-0 ${isLote ? 'text-purple-600' : ''}`} />}
                                            <span className="truncate">{t.isVariable ? 'Estimada: ' : ''}{t.title}</span>
                                        </div>
                                    );
                                })}
                                {dayTasks.length > 3 && <div className="text-[10px] text-slate-400 pl-1 font-bold">+{dayTasks.length - 3} más</div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function WeekView({ refDate, tasks, onDayClick, onEdit }: { refDate: Date; tasks: UnifiedTask[]; onDayClick: (d: string) => void; onEdit: (t: UnifiedTask) => void }) {
    const today = toYMD(new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(refDate), i));
    return (
        <div>
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                {days.map(d => {
                    const ymd = toYMD(d); const isToday = ymd === today;
                    return (
                        <div key={ymd} onClick={() => onDayClick(ymd)}
                            className={`py-3 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 border-r border-slate-200 dark:border-slate-700 transition-colors ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                            <p className="text-xs font-black text-slate-400 uppercase">{DAYS_ES[d.getDay()]}</p>
                            <div className={`mx-auto w-8 h-8 flex items-center justify-center rounded-full text-sm font-black mt-0.5 ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-200'}`}>{d.getDate()}</div>
                        </div>
                    );
                })}
            </div>
            <div className="grid grid-cols-7">
                {days.map(d => {
                    const ymd = toYMD(d);
                    const dayTasks = tasks.filter(t => t.date === ymd).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1);
                    return (
                        <div key={ymd} onClick={() => onDayClick(ymd)}
                            className="min-h-[360px] p-2 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50/30 transition-colors space-y-1.5">
                            {dayTasks.length === 0 ? (
                                <p className="text-[10px] text-slate-300 dark:text-slate-600 text-center pt-4">—</p>
                            ) : (
                                dayTasks.map(t => {
                                    const isLote = t.title === 'LABOR LOTE';
                                    const sta = STATUS_CFG[t.status] || STATUS_CFG.pendiente;
                                    const typeInfo = TYPE_CFG[t.type];
                                    return (
                                        <div key={t.id} onClick={(e) => { e.stopPropagation(); onEdit(t); }} className={`p-2 rounded-xl border cursor-pointer hover:shadow-md transition-shadow ${isLote ? 'bg-purple-100 border-purple-300' : `${sta.bg} ${sta.border}`}`}>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                {t.isVariable ? <Clock className="w-3.5 h-3.5 text-amber-500" /> : <typeInfo.icon className={`w-3 h-3 ${isLote ? 'text-purple-600' : typeInfo.color}`} />}
                                                <p className={`text-[10px] font-black ${isLote ? 'text-purple-800' : t.isVariable ? 'text-amber-700' : sta.color} ${t.status === 'completada' ? 'line-through' : ''} truncate`}>{t.isVariable ? 'Estimada: ' : ''}{t.title}</p>
                                            </div>
                                            {(t.hasTime && t.time) || t.description ? (
                                                <p className={`text-[9px] ${isLote ? 'text-purple-600' : 'text-slate-500'} truncate overflow-ellipsis max-w-full font-medium`}>
                                                    {t.hasTime && t.time && <Clock className="w-2.5 h-2.5 inline mr-0.5 opacity-60" />}
                                                    {t.hasTime && t.time ? `${t.time} · ` : ''}
                                                    {t.description}
                                                </p>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week' | 'list';

export default function Tasks() {
    const [searchParams] = useSearchParams();
    const { trials, applications, events } = useAppContext();
    const { tasks, updateTask, deleteTask } = useTasks();
    const [view, setView] = useState<ViewMode>('month');

    // Deep linking logic
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            // If we have an ID, we switch to List view to show it more clearly
            setView('list');
            // We could also scroll to it if it was a very long list
        }
    }, [searchParams]);
    const [refDate, setRefDate] = useState(new Date());
    const [modalOpen, setModalOpen] = useState(false);
    const [defaultDate, setDefaultDate] = useState<string | undefined>();
    const [editingTask, setEditingTask] = useState<UnifiedTask | null>(null);
    const [postponingTask, setPostponingTask] = useState<Task | null>(null);
    const [filterStatus, setFilterStatus] = useState<TaskStatus | 'todas'>('todas');
    const [chatTaskId, setChatTaskId] = useState<string | null>(null);
    const [chatTaskTitle, setChatTaskTitle] = useState<string>('');
    const [chatTaskSubtitle, setChatTaskSubtitle] = useState<string>('');

    const allUnifiedTasks = useMemo(() => {
        const unified: UnifiedTask[] = [];

        // Manual tasks
        tasks.forEach(t => unified.push({ ...t, type: 'task' }));

        // Calendar Events
        events.forEach(ev => {
            unified.push({
                id: `ev-${ev.id}`,
                title: ev.title,
                description: ev.description || ev.type,
                date: ev.date,
                time: ev.startTime,
                status: 'pendiente',
                type: 'task',
                responsibles: []
            });
        });

        // ─── Grouped Trial Activities ───
        const trialGroups: Record<string, {
            trial: any;
            apps: any[];
            plannedApps: any[];
            evals: any[];
            date: string;
        }> = {};

        // 1. Applications (Labores ya ejecutadas o registradas)
        applications.forEach(app => {
            if (app.type === 'ensayo' && app.trialId) {
                const trial = trials.find(t => t.id === app.trialId);
                if (!trial) return;
                const key = `${app.date}-${app.trialId}`;
                if (!trialGroups[key]) trialGroups[key] = { trial, apps: [], plannedApps: [], evals: [], date: app.date };
                trialGroups[key].apps.push(app);
            } else {
                // Labor General de Lote (Violeta/Púrpura)
                const products = app.products?.map(p => p.product).join(' + ') || '';
                unified.push({
                    id: app.id,
                    title: `LABOR LOTE`,
                    description: `${app.condition}${products ? ` - Mezcla: ${products}` : ''}`,
                    date: app.date,
                    status: app.status as TaskStatus,
                    type: 'labur',
                    responsibles: app.responsibleEmails?.map((e: any) => ({ name: e, email: e })) || [],
                    approvals: app.approvals
                });
            }
        });

        // 2. Planned Applications (Protocolo)
        trials.forEach(trial => {
            if (trial.status === 'cotizacion') return;
            (trial.plannedApplications || []).forEach(plan => {
                let appDate = plan.date;
                if (!appDate) {
                    const baseDate = new Date(trial.date + 'T12:00:00');
                    baseDate.setDate(baseDate.getDate() + (plan.daysAfterStart || 0));
                    appDate = baseDate.toISOString().split('T')[0];
                }
                const key = `${appDate}-${trial.id}`;
                if (!trialGroups[key]) trialGroups[key] = { trial, apps: [], plannedApps: [], evals: [], date: appDate };
                trialGroups[key].plannedApps.push(plan);
            });
        });

        // 3. Evaluations
        trials.forEach(trial => {
            if (trial.status === 'cotizacion') return;
            (trial.evaluations || []).forEach(ev => {
                let evDate = ev.date;
                if (!evDate) {
                    const baseDate = new Date(trial.date + 'T12:00:00');
                    baseDate.setDate(baseDate.getDate() + (ev.daysAfterApplication || 0));
                    evDate = baseDate.toISOString().split('T')[0];
                }
                const key = `${evDate}-${trial.id}`;
                if (!trialGroups[key]) trialGroups[key] = { trial, apps: [], plannedApps: [], evals: [], date: evDate };
                trialGroups[key].evals.push(ev);
            });
        });

        // 4. Convert Trial Groups to Unified Tasks
        Object.values(trialGroups).forEach(group => {
            const { trial, apps, plannedApps, evals, date } = group;

            const titles: string[] = [];
            const details: string[] = [];

            if (apps.length > 0 || plannedApps.length > 0) {
                titles.push('Aplicación');

                const paNames = plannedApps.map((pa: any) => pa.name);
                const exNames = apps.map((a: any) => a.condition).filter(Boolean);
                const allAppNames = Array.from(new Set([...paNames, ...exNames]));
                const headerText = allAppNames.length > 0 ? allAppNames.join(', ') : 'Ejecutada';
                const header = allAppNames.length > 0 ? `LABORES (${headerText}):` : 'LABORES:';

                let hasOverrides = false;

                const products = trial.treatments?.map((t: any, idx: number) => {
                    const trtStr = `T${idx + 1} [${t.name}]: `;
                    const pList = t.products.map((p: any, pIdx: number) => {
                        let dose = p.dose;
                        let unit = p.unit;
                        let isDisabled = false;

                        // Check plannedApps directly mapped to this date
                        plannedApps.forEach((pa: any) => {
                            const ov = t.applicationSettings?.[pa.id]?.overrides?.[pIdx];
                            if (ov) {
                                if (ov.isDisabled) isDisabled = true;
                                if (ov.dose !== undefined) dose = ov.dose;
                                if (ov.unit !== undefined) unit = ov.unit;
                            }
                        });

                        // Check executed apps that might map to a planned application name (like A2)
                        apps.forEach((a: any) => {
                            const matchedPa = trial.plannedApplications?.find((pa: any) => pa.name === a.condition);
                            if (matchedPa) {
                                const ov = t.applicationSettings?.[matchedPa.id]?.overrides?.[pIdx];
                                if (ov) {
                                    if (ov.isDisabled) isDisabled = true;
                                    if (ov.dose !== undefined) dose = ov.dose;
                                    if (ov.unit !== undefined) unit = ov.unit;
                                }
                            }
                        });

                        if (isDisabled) return `${p.product} (No se aplica)`;
                        const isChanged = (dose !== p.dose || unit !== p.unit);
                        if (isChanged) hasOverrides = true;

                        return `${p.product} ${dose} ${unit}${isChanged ? ' (*)' : ''}`;
                    }).join(' + ');

                    return trtStr + pList;
                }).join('\n') || 'Tratamientos s/d';

                const notes = hasOverrides ? '\n(* Dosis modificada para esta aplicación)' : '';
                details.push(`${header}\n${products}${notes}`);
            }

            const variables = trial.variables?.map((v: any) => `${v.name} (${v.unit || 'uds'})`).join(', ') || 's/d';
            if (evals.length > 0) {
                titles.push('Evaluación');
                const evNames = evals.map(e => e.name).join(' + ');
                details.push(`MEDICIONES (+ ${evNames}):\n${variables}`);
            } else {
                details.push(`MEDICIONES a evaluar:\n${variables}`);
            }

            // 4. Derive Status (Most active)
            const allStatuses = [...apps, ...plannedApps.map(() => ({ status: 'pendiente' }))].map(item => item.status as TaskStatus);
            let status: TaskStatus = 'pendiente';

            if (allStatuses.some(s => s === 'en_progreso')) status = 'en_progreso';
            else if (allStatuses.some(s => s === 'pendiente')) status = 'pendiente';
            else if (allStatuses.some(s => s === 'postergada')) status = 'postergada';
            else if (allStatuses.length > 0 && allStatuses.every(s => s === 'cancelada')) status = 'cancelada';
            else if (allStatuses.length > 0 && allStatuses.every(s => s === 'completada' || s === 'cancelada')) status = 'completada';
            else if (allStatuses.length === 0) status = 'completada'; // fallback for evaluations without tasks


            unified.push({
                id: `group-${trial.id}-${date}`,
                title: `${trial.title} — ${trial.client}`,
                description: `${details.join('\n\n')}`,
                date: date,
                status: status,
                type: apps.length > 0 || plannedApps.length > 0 ? 'labur' : 'evaluacion',
                isVariable: (plannedApps.some((pa: any) => pa.isVariable) || evals.some((e: any) => e.isVariable)),
                origin: group, // Store everything for editing
                responsibles: apps[0]?.responsibleEmails?.map((e: string) => ({ name: e, email: e })) || []
            });
        });

        return unified;
    }, [tasks, applications, trials, events]);

    const navigate = (dir: number) => {
        const d = new Date(refDate);
        if (view === 'month') d.setMonth(d.getMonth() + dir);
        else d.setDate(d.getDate() + 7 * dir);
        setRefDate(d);
    };

    const goToday = () => setRefDate(new Date());

    const headerLabel = () => {
        if (view === 'month') return `${MONTHS_ES[refDate.getMonth()]} ${refDate.getFullYear()}`;
        if (view === 'week') {
            const ws = startOfWeek(refDate);
            const we = addDays(ws, 6);
            return `${ws.getDate()} ${MONTHS_ES[ws.getMonth()].slice(0, 3)} – ${we.getDate()} ${MONTHS_ES[we.getMonth()].slice(0, 3)} ${we.getFullYear()}`;
        }
        return 'Listado de tareas';
    };

    const filteredTasks = useMemo(() => {
        const sorted = [...allUnifiedTasks].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || '') < (b.time || '') ? -1 : 1);
        return filterStatus === 'todas' ? sorted : sorted.filter(t => t.status === filterStatus);
    }, [allUnifiedTasks, filterStatus]);

    const handleDayClick = (ymd: string) => {
        setEditingTask(null);
        setDefaultDate(ymd);
        setModalOpen(true);
    };

    return (
        <div className="flex h-full overflow-hidden bg-white dark:bg-slate-900">
            <div className="flex-1 flex flex-col min-w-0">
                {/* Reminder banner */}
                <ReminderBanner />

                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-2">
                        {view !== 'list' && (<>
                            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={goToday} className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors">Hoy</button>
                            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"><ChevronRight className="w-5 h-5" /></button>
                        </>)}
                        <h2 className="text-base font-black text-slate-800 dark:text-slate-100 ml-1 capitalize">{headerLabel()}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* View switcher */}
                        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-1">
                            {([['month', Calendar, 'Mes'], ['week', Columns, 'Semana'], ['list', CalendarDays, 'Lista']] as [ViewMode, typeof Calendar, string][]).map(([v, Icon, label]) => (
                                <button key={v} onClick={() => setView(v)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                    <Icon className="w-3.5 h-3.5" />{label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => { setEditingTask(null); setDefaultDate(toYMD(refDate)); setModalOpen(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-sm transition-colors">
                            <Plus className="w-4 h-4" /> Nueva tarea
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {view === 'month' && <MonthView refDate={refDate} tasks={allUnifiedTasks} onDayClick={handleDayClick} onEdit={setEditingTask} />}
                    {view === 'week' && <WeekView refDate={refDate} tasks={allUnifiedTasks} onDayClick={handleDayClick} onEdit={setEditingTask} />}
                    {view === 'list' && (
                        <div className="p-4 max-w-3xl mx-auto space-y-3">
                            {/* Status filter */}
                            <div className="flex gap-2 flex-wrap pb-1">
                                <button onClick={() => setFilterStatus('todas')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${filterStatus === 'todas' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'}`}>
                                    Todas ({tasks.length})
                                </button>
                                {(Object.entries(STATUS_CFG) as [TaskStatus, typeof STATUS_CFG[TaskStatus]][]).map(([k, v]) => {
                                    const count = tasks.filter(t => t.status === k).length;
                                    return count > 0 ? (
                                        <button key={k} onClick={() => setFilterStatus(k)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${filterStatus === k ? `${v.bg} ${v.color} ${v.border}` : 'border-slate-200 dark:border-slate-600 text-slate-400 hover:border-slate-300'}`}>
                                            {v.label} ({count})
                                        </button>
                                    ) : null;
                                })}
                            </div>

                            {filteredTasks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="text-5xl mb-4">✅</div>
                                    <p className="text-slate-400 font-semibold">Sin tareas {filterStatus !== 'todas' ? `con estado "${STATUS_CFG[filterStatus as TaskStatus]?.label}"` : 'registradas'}</p>
                                    <p className="text-sm text-slate-300 mt-1">Hacé click en "+ Nueva tarea" para agregar una</p>
                                </div>
                            ) : filteredTasks.map(t => (
                                <div key={t.id} className={searchParams.get('id') === t.id ? 'ring-2 ring-indigo-500 rounded-2xl ring-offset-2' : ''}>
                                    <TaskCard task={t}
                                        onEdit={() => setEditingTask(t)}
                                        onPostpone={() => {
                                            if (t.type === 'task') {
                                                const actualTask = tasks.find(at => at.id === t.id);
                                                if (actualTask) setPostponingTask(actualTask);
                                            }
                                        }}
                                        onDelete={() => t.type === 'task' && deleteTask(t.id)}
                                        onStatusChange={s => t.type === 'task' && updateTask(t.id, { status: s })}
                                        onChat={() => {
                                            setChatTaskId(t.id);
                                            setChatTaskTitle(t.title);
                                            setChatTaskSubtitle(t.description || '');
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modals */}
                {(modalOpen || editingTask) && (
                    <TaskModal
                        task={editingTask}
                        defaultDate={defaultDate}
                        onClose={() => { setModalOpen(false); setEditingTask(null); }}
                    />
                )}
                {postponingTask && (
                    <PostponeModal task={postponingTask} onClose={() => setPostponingTask(null)} />
                )}
            </div>

            {/* Sidebar Chat */}
            {chatTaskId && (
                <div className="w-80 h-full border-l border-slate-200 dark:border-slate-700 shrink-0">
                    <SidebarChat
                        linkedTaskId={chatTaskId}
                        title={chatTaskTitle}
                        subtitle={chatTaskSubtitle}
                        onClose={() => setChatTaskId(null)}
                    />
                </div>
            )}
        </div>
    );
}
