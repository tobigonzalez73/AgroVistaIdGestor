import { useState, useMemo } from 'react';
import {
    format, addMonths, subMonths, startOfMonth, endOfMonth,
    startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Plus, X, Clock, MapPin,
    FlaskConical, Sprout, CalendarRange, Columns, List,
    CheckSquare
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useTasks, type TaskStatus } from '../context/TaskContext';
import NewEventModal from '../components/agenda/NewEventModal';
import { TaskModal } from '../components/tasks/TaskModal';

// ─── Unified calendar item ────────────────────────────────────────────────────
type ItemKind = 'event' | 'application' | 'evaluation' | 'task';

interface CalItem {
    id: string;
    date: string;
    title: string;
    subtitle?: string;
    description?: string; // Added description field
    time?: string;
    location?: string;
    kind: ItemKind;
    color: string;      // tailwind bg
    textColor: string;  // tailwind text
    ring: string;       // tailwind border/ring
    dot: string;        // solid dot color
    icon: React.ReactNode;
    status?: string;
    done?: boolean;
    responsibles?: any[]; // Added to support editing
}

const KIND_CFG: Record<ItemKind, { label: string; dotClass: string }> = {
    event: { label: 'Evento', dotClass: 'bg-indigo-500' },
    application: { label: 'Aplicación', dotClass: 'bg-emerald-500' },
    evaluation: { label: 'Evaluación', dotClass: 'bg-violet-500' },
    task: { label: 'Tarea', dotClass: 'bg-amber-500' },
};

// ─── Build unified list from all sources ─────────────────────────────────────
function useCalendarItems(): CalItem[] {
    const { events, trials, applications } = useAppContext();
    const { tasks } = useTasks();

    return useMemo(() => {
        const items: CalItem[] = [];

        // 1. Manual calendar events
        events.forEach(ev => {
            items.push({
                id: `ev - ${ev.id} `,
                date: ev.date,
                title: ev.title,
                subtitle: ev.description,
                time: ev.startTime,
                location: ev.location,
                kind: 'event',
                color: 'bg-indigo-50 dark:bg-indigo-900/30',
                textColor: 'text-indigo-800 dark:text-indigo-200',
                ring: 'border-indigo-200 dark:border-indigo-700',
                dot: 'bg-indigo-500',
                icon: <CalendarRange className="w-3 h-3" />,
                status: ev.type,
            });
        });

        // ─── Grouped Trial Activities ───
        const trialActivities: Record<string, {
            trial: any;
            apps: any[];
            evals: any[];
            date: string;
        }> = {};

        // Map applications to groups
        applications.forEach(app => {
            if (app.type === 'ensayo' && app.trialId) {
                const trial = trials.find(t => t.id === app.trialId);
                if (!trial) return;
                const key = `${app.date} -${app.trialId} `;
                if (!trialActivities[key]) {
                    trialActivities[key] = { trial, apps: [], evals: [], date: app.date };
                }
                trialActivities[key].apps.push(app);
            } else {
                // General Lot Applications
                const productList = app.products?.map(p => p.product).join(', ') || '';
                const responsible = app.responsibleEmails && app.responsibleEmails.length > 0 ? ` ·[${app.responsibleEmails.join(', ')}]` : '';
                items.push({
                    id: `app - ${app.id} `,
                    date: app.date,
                    title: 'LABOR LOTE',
                    subtitle: `${app.condition}${productList ? ` · ${productList}` : ''}${responsible} `,
                    location: app.location,
                    kind: 'application',
                    color: 'bg-purple-100 dark:bg-purple-900/40',
                    textColor: 'text-purple-800 dark:text-purple-200',
                    ring: 'border-purple-300 dark:border-purple-700',
                    dot: 'bg-purple-600',
                    icon: <Sprout className="w-3 h-3" />,
                    status: app.status,
                    done: app.status === 'completada',
                });
            }
        });

        // Map evaluations to groups
        trials.forEach(trial => {
            (trial.evaluations || []).forEach(ev => {
                if (!ev.date) return;
                const key = `${ev.date} -${trial.id} `;
                if (!trialActivities[key]) {
                    trialActivities[key] = { trial, apps: [], evals: [], date: ev.date };
                }
                trialActivities[key].evals.push(ev);
            });
        });

        // Convert groups into CalItems
        Object.values(trialActivities).forEach(group => {
            const { trial, apps, evals, date } = group;

            // Build rich subtitle (Rich Technical Summary)
            const parts: string[] = [];
            const detailsLines: string[] = [];

            if (apps.length > 0) {
                const exNames = apps.map((a: any) => a.condition).filter(Boolean);
                const allAppNames = Array.from(new Set(exNames));
                const headerText = allAppNames.length > 0 ? allAppNames.join(', ') : 'Ejecutada';
                const header = allAppNames.length > 0 ? `LABORES (${headerText}):` : 'LABORES:';

                let hasOverrides = false;

                const tech = trial.treatments?.map((t: any, idx: number) => {
                    const trtStr = `T${idx + 1} [${t.name}]: `;
                    const pList = t.products.map((p: any, pIdx: number) => {
                        let dose = p.dose;
                        let unit = p.unit;
                        let isDisabled = false;

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
                detailsLines.push(`${header}\n${tech}${notes}`);
                parts.push(`${apps.length} labor(es)`);
            }

            const varList = trial.variables?.map((v: any) => `${v.name} (${v.unit || 'uds'})`).join(', ') || 's/d';
            if (evals.length > 0) {
                const evalNames = evals.map(e => e.name).join(' + ');
                detailsLines.push(`MEDICIONES (+ ${evalNames}):\n${varList}`);
                parts.push(`Eval: ${evalNames}`);
            } else {
                detailsLines.push(`MEDICIONES a evaluar:\n${varList}`);
            }

            const allSubStatuses = apps.map(a => a.status);
            const isDone = (apps.length > 0 && apps.every(a => (a.status === 'completada' || a.status === 'cancelada'))) || (evals.length > 0 && apps.length === 0);
            
            // Determine representative status for icon colors
            let groupStatus: TaskStatus = 'pendiente';
            if (allSubStatuses.some(s => s === 'en_progreso')) groupStatus = 'en_progreso';
            else if (allSubStatuses.some(s => s === 'pendiente')) groupStatus = 'pendiente';
            else if (allSubStatuses.some(s => s === 'postergada')) groupStatus = 'postergada';
            else if (allSubStatuses.length > 0 && allSubStatuses.every(s => s === 'cancelada')) groupStatus = 'cancelada';
            else if (isDone) groupStatus = 'completada';


            items.push({
                id: `trialgroup - ${trial.id} -${date} `,
                date,
                title: `${trial.title} — ${trial.client} `,
                subtitle: parts.join(' | '),
                description: detailsLines.join('\n\n'),
                location: trial.location,
                kind: apps.length > 0 ? 'application' : 'evaluation',
                color: apps.length > 0 ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-violet-50 dark:bg-violet-900/30',
                textColor: apps.length > 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-violet-800 dark:text-violet-200',
                ring: apps.length > 0 ? 'border-emerald-200 dark:border-emerald-700' : 'border-violet-200 dark:border-violet-700',
                dot: apps.length > 0 ? 'bg-emerald-500' : 'bg-violet-500',
                icon: apps.length > 0 ? <Sprout className="w-3 h-3" /> : <FlaskConical className="w-3 h-3" />,
                done: isDone,
                status: groupStatus
            });
        });

        // 4. Manual tasks
        tasks.forEach(task => {
            items.push({
                id: task.id, // Use original ID for editing
                date: task.date,
                title: task.title,
                subtitle: task.description || (task.responsibles.length > 0 ? task.responsibles.map(r => r.name).join(', ') : undefined),
                description: task.description, // Pass description too
                time: task.hasTime ? task.time : undefined,
                kind: 'task',
                color: 'bg-amber-50 dark:bg-amber-900/30',
                textColor: 'text-amber-800 dark:text-amber-200',
                ring: 'border-amber-200 dark:border-amber-700',
                dot: 'bg-amber-500',
                icon: <CheckSquare className="w-3 h-3" />,
                status: task.status,
                done: task.status === 'completada' || task.status === 'cancelada',
                responsibles: task.responsibles, // Pass responsibles
            });
        });

        return items;
    }, [events, trials, applications, tasks]);
}

// ─── Day detail panel ─────────────────────────────────────────────────────────
function DayPanel({ date, items, onClose, onAddEvent, onEditTask }: {
    date: Date; items: CalItem[]; onClose: () => void; onAddEvent: (d: Date) => void; onEditTask: (item: CalItem) => void;
}) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayItems = items.filter(i => i.date === dateStr).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1);

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest opacity-70">
                            {format(date, 'EEEE', { locale: es })}
                        </p>
                        <h2 className="text-2xl font-black">
                            {format(date, 'd')} <span className="text-indigo-200 capitalize">{format(date, 'MMMM', { locale: es })}</span>
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                {/* Items */}
                <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
                    {dayItems.length === 0 ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="text-4xl mb-3">📭</div>
                            <p className="text-slate-400 font-semibold text-sm">Sin actividades para este día</p>
                        </div>
                    ) : dayItems.map(item => (
                        <div key={item.id}
                            onClick={(e) => { e.stopPropagation(); onEditTask(item); }}
                            className={`px - 5 py - 3.5 cursor - pointer hover: bg - slate - 50 dark: hover: bg - slate - 800 / 50 transition - colors ${item.done ? 'opacity-50' : ''} `}>
                            <div className="flex items-start gap-3">
                                <div className={`mt - 0.5 p - 1.5 rounded - lg ${item.color} ${item.textColor} `}>{item.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className={`text - sm font - black text - slate - 800 dark: text - slate - 100 ${item.done ? 'line-through' : ''} `}>{item.title}</p>
                                        <span className={`text - [9px] font - black px - 1.5 py - 0.5 rounded - full ${item.color} ${item.textColor} `}>
                                            {KIND_CFG[item.kind].label}
                                        </span>
                                    </div>
                                    {item.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.subtitle}</p>}
                                    <div className="flex items-center gap-3 mt-1">
                                        {item.time && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="w-3 h-3" />{item.time}</span>}
                                        {item.location && <span className="flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="w-3 h-3" />{item.location}</span>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => { onAddEvent(date); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-colors">
                        <Plus className="w-4 h-4" /> Agregar evento
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function Legend({ filter, setFilter }: { filter: ItemKind | 'all'; setFilter: (f: ItemKind | 'all') => void }) {
    return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <button onClick={() => setFilter('all')}
                className={`px - 2.5 py - 1 rounded - lg text - xs font - black transition - all ${filter === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'} `}>
                Todos
            </button>
            {(Object.entries(KIND_CFG) as [ItemKind, typeof KIND_CFG[ItemKind]][]).map(([k, v]) => (
                <button key={k} onClick={() => setFilter(k)}
                    className={`flex items - center gap - 1.5 px - 2.5 py - 1 rounded - lg text - xs font - black transition - all ${filter === k ? `${v.dotClass} text-white` : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'} `}>
                    <span className={`w - 2 h - 2 rounded - full ${v.dotClass} ${filter === k ? 'bg-white' : ''} `} />
                    {v.label}s
                </button>
            ))}
        </div>
    );
}

// ─── MONTH VIEW ───────────────────────────────────────────────────────────────
function MonthView({ currentDate, items, onDayClick }: {
    currentDate: Date; items: CalItem[]; onDayClick: (d: Date) => void;
}) {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const byDay = useMemo(() => {
        const m: Record<string, CalItem[]> = {};
        items.forEach(i => { if (!m[i.date]) m[i.date] = []; m[i.date].push(i); });
        return m;
    }, [items]);

    const rows = [];
    let day = startDate;
    while (day <= endDate) {
        const cells = [];
        for (let i = 0; i < 7; i++) {
            const clone = new Date(day);
            const dayStr = format(clone, 'yyyy-MM-dd');
            const dayItems = byDay[dayStr] || [];
            const isCurrentMonth = isSameMonth(clone, monthStart);
            const isToday = isSameDay(clone, new Date());

            cells.push(
                <div
                    key={dayStr}
                    onClick={() => onDayClick(clone)}
                    className={`min - h - [108px] p - 2 border - r border - b border - slate - 200 dark: border - slate - 700 transition - all cursor - pointer group
                        ${!isCurrentMonth ? 'bg-slate-50/70 dark:bg-slate-900/30' : 'hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10'}
`}
                >
                    <div className="flex items-center justify-between mb-1.5">
                        <span className={`w - 7 h - 7 flex items - center justify - center rounded - full text - sm font - black transition - all
                            ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900' :
                                isCurrentMonth ? 'text-slate-700 dark:text-slate-200 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50' :
                                    'text-slate-300 dark:text-slate-600'
                            } `}>
                            {format(clone, 'd')}
                        </span>
                        {dayItems.length > 0 && (
                            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                                {dayItems.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-0.5">
                        {dayItems.slice(0, 3).map(item => (
                            <div key={item.id}
                                className={`flex items - center gap - 1.5 px - 2 py - 1 rounded - md text - [11px] font - black truncate shadow - sm border - 2 ${item.color} ${item.textColor} ${item.ring} ${item.done ? 'opacity-40 line-through' : ''} `}>
                                <span className={`w - 1.5 h - 1.5 rounded - full shrink - 0 ${item.dot} `} />
                                {item.time && <span className="opacity-60 shrink-0">{item.time}</span>}
                                <span className="truncate">{item.title}</span>
                            </div>
                        ))}
                        {dayItems.length > 3 && (
                            <div className="text-[9px] text-slate-400 dark:text-slate-500 pl-1.5 font-bold">+{dayItems.length - 3} más</div>
                        )}
                    </div>
                </div>
            );
            day = addDays(day, 1);
        }
        rows.push(<div key={day.toISOString()} className="grid grid-cols-7">{cells}</div>);
    }

    return (
        <div className="flex-1 overflow-auto">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
                {Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i)).map((d, i) => (
                    <div key={i} className="py-2.5 text-center text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        {format(d, 'EEE', { locale: es })}
                    </div>
                ))}
            </div>
            <div className="border-l border-t border-slate-200 dark:border-slate-700">{rows}</div>
        </div>
    );
}

// ─── WEEK VIEW ────────────────────────────────────────────────────────────────
function WeekView({ currentDate, items, onDayClick }: {
    currentDate: Date; items: CalItem[]; onDayClick: (d: Date) => void;
}) {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
        <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
                {days.map(d => {
                    const isToday = isSameDay(d, new Date());
                    return (
                        <div key={d.toISOString()} onClick={() => onDayClick(d)}
                            className={`py - 3 text - center border - r border - slate - 200 dark: border - slate - 700 cursor - pointer hover: bg - slate - 50 dark: hover: bg - slate - 800 / 50 transition - colors ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''} `}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(d, 'EEE', { locale: es })}</p>
                            <div className={`mx - auto w - 9 h - 9 mt - 1 flex items - center justify - center rounded - full text - sm font - black ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900' : 'text-slate-700 dark:text-slate-200'} `}>
                                {format(d, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="grid grid-cols-7 border-l border-slate-200 dark:border-slate-700">
                {days.map(d => {
                    const dayStr = format(d, 'yyyy-MM-dd');
                    const dayItems = items.filter(i => i.date === dayStr).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1);
                    return (
                        <div key={dayStr} onClick={() => onDayClick(d)}
                            className="min-h-[420px] p-2 border-r border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors space-y-1.5">
                            {dayItems.length === 0 ? (
                                <p className="text-[10px] text-slate-200 dark:text-slate-700 text-center pt-6 font-medium">sin eventos</p>
                            ) : dayItems.map(item => (
                                <div key={item.id}
                                    className={`p - 2 rounded - xl border ${item.color} ${item.ring} ${item.done ? 'opacity-40' : ''} `}>
                                    <div className="flex items-center gap-1 mb-0.5">
                                        <span className={`${item.textColor} `}>{item.icon}</span>
                                        <p className={`text - [10px] font - black ${item.textColor} truncate ${item.done ? 'line-through' : ''} `}>{item.title}</p>
                                    </div>
                                    {item.time && <p className="text-[9px] text-slate-400 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{item.time}</p>}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── LIST VIEW ────────────────────────────────────────────────────────────────
function ListView({ items }: { items: CalItem[] }) {
    const sorted = [...items].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.time || '') < (b.time || '') ? -1 : 1);

    // Group by date
    const groups: { date: string; items: CalItem[] }[] = [];
    sorted.forEach(item => {
        const last = groups[groups.length - 1];
        if (last && last.date === item.date) last.items.push(item);
        else groups.push({ date: item.date, items: [item] });
    });

    return (
        <div className="flex-1 overflow-auto p-4">
            <div className="max-w-3xl mx-auto space-y-6">
                {groups.length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-center">
                        <div className="text-5xl mb-4">📭</div>
                        <p className="text-slate-400 font-semibold">Sin actividades registradas</p>
                    </div>
                ) : groups.map(({ date, items: groupItems }) => {
                    const d = parseISO(date);
                    const isToday = isSameDay(d, new Date());
                    const isPast = d < new Date(new Date().toDateString());
                    return (
                        <div key={date}>
                            <div className="flex items-center gap-3 mb-3">
                                <div className={`w - 10 h - 10 rounded - xl flex flex - col items - center justify - center text - white shadow - sm ${isToday ? 'bg-indigo-600' : isPast ? 'bg-slate-400 dark:bg-slate-600' : 'bg-slate-700 dark:bg-slate-600'} `}>
                                    <span className="text-[9px] font-black uppercase leading-none">{format(d, 'EEE', { locale: es })}</span>
                                    <span className="text-lg font-black leading-none">{format(d, 'd')}</span>
                                </div>
                                <div>
                                    <p className={`text - sm font - black capitalize ${isToday ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-200'} `}>
                                        {isToday ? '📅 Hoy — ' : ''}{format(d, "EEEE d 'de' MMMM", { locale: es })}
                                    </p>
                                    <p className="text-xs text-slate-400">{groupItems.length} actividad{groupItems.length > 1 ? 'es' : ''}</p>
                                </div>
                            </div>
                            <div className="ml-4 pl-5 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                                {groupItems.map(item => (
                                    <div key={item.id}
                                        className={`flex items - start gap - 3 p - 3.5 rounded - 2xl border - 2 ${item.ring} ${item.color} ${item.done ? 'opacity-50' : ''} transition - all hover: shadow - sm`}>
                                        <div className={`p - 1.5 rounded - lg ${item.textColor} bg - white / 60 dark: bg - black / 20 shrink - 0`}>{item.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className={`text - sm font - black text - slate - 800 dark: text - slate - 100 ${item.done ? 'line-through' : ''} `}>{item.title}</p>
                                                <span className={`text - [9px] font - black px - 1.5 py - 0.5 rounded - full ${item.color} ${item.textColor} border ${item.ring} `}>
                                                    {KIND_CFG[item.kind].label}
                                                </span>
                                                {item.status && (
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 capitalize">{item.status.replace('_', ' ')}</span>
                                                )}
                                            </div>
                                            {item.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.subtitle}</p>}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                {item.time && <span className="flex items-center gap-1 text-[10px] text-slate-400"><Clock className="w-3 h-3" />{item.time}</span>}
                                                {item.location && <span className="flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="w-3 h-3" />{item.location}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── MAIN AGENDA PAGE ─────────────────────────────────────────────────────────
type ViewMode = 'month' | 'week' | 'list';

export default function Agenda() {
    const allItems = useCalendarItems();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<ViewMode>('month');
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>();
    const [editingTask, setEditingTask] = useState<CalItem | null>(null); // State for editing task
    const [kindFilter, setKindFilter] = useState<ItemKind | 'all'>('all');

    const navigate = (dir: number) => {
        const d = new Date(currentDate);
        if (view === 'month') { if (dir > 0) setCurrentDate(addMonths(d, 1)); else setCurrentDate(subMonths(d, 1)); }
        else setCurrentDate(addDays(d, 7 * dir));
    };

    const headerLabel = () => {
        if (view === 'month') return format(currentDate, "MMMM yyyy", { locale: es });
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = addDays(ws, 6);
        return `${format(ws, 'd MMM', { locale: es })} — ${format(we, 'd MMM yyyy', { locale: es })} `;
    };

    const filteredItems = kindFilter === 'all' ? allItems : allItems.filter(i => i.kind === kindFilter);

    const totalCount = {
        events: allItems.filter(i => i.kind === 'event').length,
        applications: allItems.filter(i => i.kind === 'application').length,
        evaluations: allItems.filter(i => i.kind === 'evaluation').length,
        tasks: allItems.filter(i => i.kind === 'task').length,
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                    {view !== 'list' && (<>
                        <button onClick={() => navigate(-1)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-black rounded-xl border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                            Hoy
                        </button>
                        <button onClick={() => navigate(1)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </>)}
                    <h2 className="text-base font-black text-slate-800 dark:text-slate-100 ml-1 capitalize">{view === 'list' ? 'Agenda completa' : headerLabel()}</h2>
                </div>

                <div className="flex items-center gap-2">
                    {/* Stats pills */}
                    <div className="hidden lg:flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-lg">{totalCount.events} eventos</span>
                        <span className="text-[10px] font-black px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 rounded-lg">{totalCount.applications} aplicaciones</span>
                        <span className="text-[10px] font-black px-2 py-1 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300 rounded-lg">{totalCount.evaluations} evaluaciones</span>
                        <span className="text-[10px] font-black px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 rounded-lg">{totalCount.tasks} tareas</span>
                    </div>

                    {/* View switcher */}
                    <div className="flex bg-slate-100 dark:bg-slate-700 rounded-xl p-1 gap-1">
                        {([['month', CalendarRange, 'Mes'], ['week', Columns, 'Semana'], ['list', List, 'Lista']] as [ViewMode, typeof CalendarRange, string][]).map(([v, Icon, label]) => (
                            <button key={v} onClick={() => setView(v)}
                                className={`flex items - center gap - 1.5 px - 3 py - 1.5 rounded - lg text - xs font - black transition - all ${view === v ? 'bg-white dark:bg-slate-600 text-slate-800 dark:text-slate-100 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'} `}>
                                <Icon className="w-3.5 h-3.5" />{label}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => { setModalInitialDate(undefined); setIsEventModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl text-sm shadow-sm transition-all hover:shadow-md hover:shadow-indigo-200/50">
                        <Plus className="w-4 h-4" /> Nuevo evento
                    </button>
                </div>
            </div>

            {/* ── Legend / filter bar ──────────────────────────────────────── */}
            <Legend filter={kindFilter} setFilter={setKindFilter} />

            {/* ── Calendar ────────────────────────────────────────────────── */}
            {view === 'month' && <MonthView currentDate={currentDate} items={filteredItems} onDayClick={d => setSelectedDay(d)} />}
            {view === 'week' && <WeekView currentDate={currentDate} items={filteredItems} onDayClick={d => setSelectedDay(d)} />}
            {view === 'list' && <ListView items={filteredItems} />}

            {/* ── Day panel ───────────────────────────────────────────────── */}
            {selectedDay && (
                <DayPanel
                    date={selectedDay}
                    items={filteredItems}
                    onClose={() => setSelectedDay(null)}
                    onAddEvent={d => { setModalInitialDate(d); setIsEventModalOpen(true); }}
                    onEditTask={(item) => {
                        // All tasks and trial activities (applications/evaluations) use TaskModal
                        if (item.kind === 'task' || item.kind === 'application' || item.kind === 'evaluation') {
                            setEditingTask(item);
                        } else if (item.kind === 'event') {
                            setSelectedDay(null);
                            setModalInitialDate(parseISO(item.date));
                            setIsEventModalOpen(true);
                        }
                    }}
                />
            )}

            {/* ── Event modal ──────────────────────────────────────────────── */}
            {isEventModalOpen && (
                <NewEventModal onClose={() => setIsEventModalOpen(false)} initialDate={modalInitialDate ? format(modalInitialDate, 'yyyy-MM-dd') : undefined} />
            )}

            {/* ── Task modal ───────────────────────────────────────────────── */}
            {editingTask && (
                <TaskModal
                    task={editingTask}
                    onClose={() => setEditingTask(null)}
                />
            )}
        </div>
    );
}
