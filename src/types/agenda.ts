export type EventType = 'reunion' | 'tarea_general' | 'labor_agronomica';

export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // YYYY-MM-DD
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    type: EventType;
    description?: string;
    participants?: string[];
    location?: string;
    meetingUrl?: string; // Add support for video conference links
    googleEventId?: string; // Add support for Google Calendar sync 
}
