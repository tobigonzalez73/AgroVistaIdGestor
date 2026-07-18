import type { CalendarEvent } from '../types/agenda';

/**
 * Service to handle Google Calendar API interactions.
 * Note: Requires valid OAuth2 access token with Calendar scopes.
 */
export const gcalService = {
    /**
     * Creates an event in the user's Google Calendar and conditionally generates a Google Meet link.
     */
    async createEventWithMeet(eventData: CalendarEvent, googleAccessToken: string) {
        if (!googleAccessToken) {
            console.warn("No Google Access Token provided. Cannot sync to Google Calendar.");
            return null;
        }

        try {
            const startDateTime = `${eventData.date}T${eventData.startTime || '09:00:00'}-03:00`; // Assuming ART timezone for Agrovista
            const endDateTime = `${eventData.date}T${eventData.endTime || '10:00:00'}-03:00`;

            const requestBody: any = {
                summary: eventData.title,
                description: eventData.description || '',
                start: {
                    dateTime: startDateTime,
                    timeZone: 'America/Argentina/Buenos_Aires',
                },
                end: {
                    dateTime: endDateTime,
                    timeZone: 'America/Argentina/Buenos_Aires',
                },
            };

            if (eventData.location) {
                requestBody.location = eventData.location;
            }

            // If it's a meeting, request conference data (Google Meet)
            if (eventData.type === 'reunion') {
                requestBody.conferenceData = {
                    createRequest: {
                        requestId: Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7),
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                };
            }

            // Using conferenceDataVersion=1 is required to get link back
            const response = await fetch(
                'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${googleAccessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("GCal API Error:", errorData);
                throw new Error('Failed to create Google Calendar event');
            }

            const data = await response.json();

            // Extract the Meet link if created
            const meetingUrl = data.hangoutLink || undefined;

            return {
                googleEventId: data.id,
                meetingUrl
            };

        } catch (error) {
            console.error('Error synchronizing with Google Calendar:', error);
            throw error;
        }
    }
};
