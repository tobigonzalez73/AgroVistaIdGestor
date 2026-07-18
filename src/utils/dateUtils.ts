/**
 * Formats a timestamp into a relative distance string (e.g. "5m", "2h", "yesterday", "dd/MM/yyyy")
 */
export function formatDistanceToNow(timestamp: number | string | Date): string {
    const date = new Date(timestamp);
    const now = new Date();

    if (isNaN(date.getTime())) return ''; // Invalid date

    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
        return 'ahora';
    } else if (diffMins < 60) {
        return `${diffMins}m`;
    } else if (diffHours < 24) {
        return `${diffHours}h`;
    } else if (diffDays === 1) {
        return 'ayer';
    } else if (diffDays < 7) {
        return `${diffDays}d`;
    } else {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
    }
}
