import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowLeft, MapPin, AlignLeft, Video, Link as LinkIcon } from 'lucide-react';
import type { CalendarEvent } from '../../types/agenda';

interface Props {
    date: Date;
    events: CalendarEvent[];
    onBack: () => void;
    onAddEvent: (dateStr: string) => void;
}

export default function DayScheduleView({ date, events, onBack, onAddEvent }: Props) {
    // Generar horas de 07:00 a 20:00
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);

    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = events.filter(e => e.date === dateStr);

    const getEventColor = (type: string) => {
        switch (type) {
            case 'reunion': return 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300';
            case 'tarea_general': return 'bg-amber-100 border-amber-400 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-300';
            case 'labor_agronomica': return 'bg-emerald-100 border-emerald-400 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300';
            default: return 'bg-slate-100 border-slate-400 text-slate-800 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-[800px]">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80">
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 mr-3 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 capitalize">
                            {format(date, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                        </h2>
                    </div>
                </div>
                <button
                    onClick={() => onAddEvent(dateStr)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors shadow-sm"
                >
                    + Nuevo Evento
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="relative min-w-[600px]">
                    {/* Time Grid */}
                    {hours.map(hour => (
                        <div key={hour} className="flex border-b border-slate-100 dark:border-slate-700/50 min-h-[80px]">
                            <div className="w-20 pr-4 text-right text-sm font-medium text-slate-500 dark:text-slate-400 py-2 shrink-0">
                                {hour.toString().padStart(2, '0')}:00
                            </div>
                            <div className="flex-1 border-l border-slate-200 dark:border-slate-700 relative group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-crosshair">
                                {/* Invisible click area to add event at specific hour (Future feature) */}
                            </div>
                        </div>
                    ))}

                    {/* Events Overlay */}
                    <div className="absolute top-0 left-20 right-0 bottom-0 pointer-events-none">
                        {dayEvents.map(event => {
                            // Render events mapped to timeline. If no time, put at top.
                            let top = 0;
                            let height = 60; // default height if no end time

                            if (event.startTime) {
                                const [h, m] = event.startTime.split(':').map(Number);
                                if (h >= 7 && h <= 20) {
                                    top = ((h - 7) * 80) + ((m / 60) * 80);

                                    if (event.endTime) {
                                        const [eh, em] = event.endTime.split(':').map(Number);
                                        const endTop = ((eh - 7) * 80) + ((em / 60) * 80);
                                        height = Math.max(endTop - top, 40); // min height 40px
                                    }
                                }
                            } else {
                                // Full day or unspecified time event - rendered at very top
                                height = 40;
                            }

                            return (
                                <div
                                    key={event.id}
                                    style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}
                                    className={`absolute left-2 right-4 rounded-lg border-l-4 p-2 shadow-sm pointer-events-auto overflow-hidden hover:shadow-md transition-shadow ${getEventColor(event.type)}`}
                                    title={event.title}
                                >
                                    <div className="font-bold text-sm truncate flex justify-between">
                                        <span>{event.title}</span>
                                        {event.startTime && <span className="text-xs opacity-80">{event.startTime} - {event.endTime || '...'}</span>}
                                    </div>
                                    {height >= 60 && (
                                        <div className="mt-1 text-xs opacity-90 truncate flex flex-col gap-0.5">
                                            {event.location && <span><MapPin className="w-3 h-3 inline mr-1" />{event.location}</span>}
                                            {event.description && <span><AlignLeft className="w-3 h-3 inline mr-1" />{event.description}</span>}
                                            {event.meetingUrl && (
                                                <a
                                                    href={event.meetingUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 flex items-center gap-1 w-max px-2 py-0.5 bg-white/50 hover:bg-white dark:bg-black/20 dark:hover:bg-black/40 rounded shadow-sm transition-colors text-blue-700 dark:text-blue-300 font-medium"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {event.meetingUrl.includes('meet.google') ? <Video className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                                                    Unirse a Reunión
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
