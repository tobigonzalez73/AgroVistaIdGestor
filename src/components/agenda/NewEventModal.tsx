import { useState } from 'react';
import { X, Save, Clock, MapPin, AlignLeft, Calendar as CalendarIcon, Link, Video } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import type { CalendarEvent, EventType } from '../../types/agenda';

interface Props {
    onClose: () => void;
    initialDate?: string;
}

export default function NewEventModal({ onClose, initialDate }: Props) {
    const { setEvents } = useAppContext();
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [type, setType] = useState<EventType>('tarea_general');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [meetingUrl, setMeetingUrl] = useState('');

    const handleGenerateMeet = () => {
        // Fallback for generating a meet easily via Google Calendar web intent
        const startDateTime = `${date.replace(/-/g, '')}T${(startTime || '09:00').replace(':', '')}00`;
        const endDateTime = `${date.replace(/-/g, '')}T${(endTime || '10:00').replace(':', '')}00`;

        let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title || 'Reunión Monkey Trials')}`;
        url += `&dates=${startDateTime}/${endDateTime}`;
        if (description) url += `&details=${encodeURIComponent(description)}`;
        if (location) url += `&location=${encodeURIComponent(location)}`;

        // This prompts the user to add Meet directly on GCal UI and paste back the link
        window.open(url, '_blank');
        alert("Se abrió Google Calendar. Desde allí asegúrate de 'Añadir videollamada de Google Meet', guardar el evento y luego pegar el enlace aquí.");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newEvent: CalendarEvent = {
            id: doc(collection(db, 'events')).id,
            title,
            date,
            startTime: startTime || undefined,
            endTime: endTime || undefined,
            type,
            description,
            location,
            meetingUrl: meetingUrl.trim() || undefined
        };

        setEvents((prev) => [...prev, newEvent]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <CalendarIcon className="w-5 h-5 mr-2 text-indigo-500" />
                        Nuevo Evento de Agenda
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto w-full">
                    <form id="new-event-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título del Evento *</label>
                                <input required type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" placeholder="Ej: Revisión de Lotes, Reunión con Cliente" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha *</label>
                                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo de Evento *</label>
                                <select required value={type} onChange={e => setType(e.target.value as EventType)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100">
                                    <option value="tarea_general">Tarea General</option>
                                    <option value="reunion">Reunión</option>
                                    <option value="labor_agronomica">Labor Agronómica</option>
                                </select>
                            </div>

                            <div className="flex gap-4 md:col-span-2">
                                <div className="flex-1">
                                    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        <Clock className="w-4 h-4 mr-1 text-slate-400" /> Hora Inicio
                                    </label>
                                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" />
                                </div>
                                <div className="flex-1">
                                    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        <Clock className="w-4 h-4 mr-1 text-slate-400" /> Hora Fin
                                    </label>
                                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" />
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <MapPin className="w-4 h-4 mr-1 text-slate-400" /> Ubicación (Opcional)
                                </label>
                                <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100" placeholder="Ej: Sala de reuniones, Lote 5" />
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300">
                                    <Link className="w-4 h-4 mr-1 text-slate-400" /> Enlace de Reunión Virtual (Opcional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="url"
                                        value={meetingUrl}
                                        onChange={e => setMeetingUrl(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100"
                                        placeholder="Ej: https://meet.google.com/abc-defg-hij"
                                    />
                                    {type === 'reunion' && (
                                        <button
                                            type="button"
                                            onClick={handleGenerateMeet}
                                            className="px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded-lg font-medium text-sm transition-colors flex items-center whitespace-nowrap"
                                        >
                                            <Video className="w-4 h-4 mr-1.5" /> Google Meet
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="md:col-span-2">
                                <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <AlignLeft className="w-4 h-4 mr-1 text-slate-400" /> Descripción o Notas
                                </label>
                                <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 resize-none" placeholder="Añadir notas sobre la agenda..."></textarea>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
                        Cancelar
                    </button>
                    <button type="submit" form="new-event-form" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center">
                        <Save className="w-4 h-4 mr-2" /> Guardar Evento
                    </button>
                </div>
            </div>
        </div>
    );
}
