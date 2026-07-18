import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'postergada';

export interface TaskResponsible {
    name: string;
    email: string;
}

export interface PostponementRecord {
    fromDate: string;
    fromTime?: string;
    toDate: string;
    toTime?: string;
    postponedAt: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    responsibles: TaskResponsible[];   // one or more people
    date: string;        // YYYY-MM-DD
    time?: string;       // HH:mm (optional)
    hasTime: boolean;
    status: TaskStatus;
    reminderSent: boolean;
    postponements: PostponementRecord[];
    createdAt: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface TaskContextType {
    tasks: Task[];
    addTask: (t: Omit<Task, 'id' | 'createdAt' | 'postponements' | 'reminderSent'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;
    postponeTask: (id: string, toDate: string, toTime?: string) => void;
    markReminderSent: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | null>(null);
const STORAGE_KEY = 'app_tasks_v2';

function load(): Task[] {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function toYMD(d: Date) {
    return d.toISOString().slice(0, 10);
}

export function TaskProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>(load);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }, [tasks]);

    const addTask = (t: Omit<Task, 'id' | 'createdAt' | 'postponements' | 'reminderSent'>) =>
        setTasks(prev => [...prev, {
            ...t,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            reminderSent: false,
            postponements: []
        }]);

    const updateTask = (id: string, updates: Partial<Task>) =>
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

    const deleteTask = (id: string) =>
        setTasks(prev => prev.filter(t => t.id !== id));

    const postponeTask = (id: string, toDate: string, toTime?: string) =>
        setTasks(prev => prev.map(t => {
            if (t.id !== id) return t;
            const record: PostponementRecord = {
                fromDate: t.date,
                fromTime: t.time,
                toDate,
                toTime,
                postponedAt: new Date().toISOString()
            };
            return {
                ...t,
                date: toDate,
                time: toTime ?? t.time,
                status: 'postergada',
                reminderSent: false,   // reset so new reminder fires
                postponements: [...t.postponements, record]
            };
        }));

    const markReminderSent = (id: string) =>
        setTasks(prev => prev.map(t => t.id === id ? { ...t, reminderSent: true } : t));

    return (
        <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, postponeTask, markReminderSent }}>
            {children}
        </TaskContext.Provider>
    );
}

export function useTasks() {
    const ctx = useContext(TaskContext);
    if (!ctx) throw new Error('useTasks must be used inside TaskProvider');
    return ctx;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns tasks whose reminder should fire today (task date = tomorrow) */
export function getTasksDueForReminder(tasks: Task[]): Task[] {
    const tomorrow = toYMD(new Date(Date.now() + 86400000));
    return tasks.filter(t =>
        t.date === tomorrow &&
        !t.reminderSent &&
        t.status !== 'completada' &&
        t.status !== 'cancelada'
    );
}

/** Builds a mailto: link for a single task reminder */
export function buildReminderMailto(task: Task): string {
    const emails = task.responsibles.map(r => r.email).filter(Boolean).join(',');
    if (!emails) return '';
    const subject = encodeURIComponent(`Recordatorio: "${task.title}" - mañana`);
    const taskDate = new Date(task.date + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
    const names = task.responsibles.map(r => r.name).join(', ');
    const body = encodeURIComponent(
        `Estimado/a ${names},\n\n` +
        `Le recordamos que mañana tiene programada la siguiente actividad:\n\n` +
        `📋 Actividad: ${task.title}\n` +
        `📅 Fecha: ${taskDate}${task.hasTime && task.time ? `\n🕐 Horario: ${task.time}` : ''}\n` +
        (task.description ? `📝 Descripción: ${task.description}\n` : '') +
        `\n¡Recuerde estar preparado/a!\n\nSaludos,\nMonkey Trials ERP`
    );
    return `mailto:${emails}?subject=${subject}&body=${body}`;
}
