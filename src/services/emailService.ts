import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { ApplicationTask } from '../types/trial';

export const emailService = {
    /**
     * Sends a reminder email for an ApplicationTask via the Firebase Trigger Email Extension.
     */
    async sendTaskReminder(task: ApplicationTask) {
        if (!task.responsibleEmails || task.responsibleEmails.length === 0) {
            console.warn("No responsible emails assigned to this task.");
            return;
        }

        try {
            const taskTypeLabel = task.type === 'ensayo' ? 'Ensayo' : 'Lote General';
            const locationLabel = task.location || 'N/A';

            await addDoc(collection(db, 'mail'), {
                to: task.responsibleEmails,
                message: {
                    subject: `Recordatorio de Labor Planificada: ${locationLabel}`,
                    html: `
                        <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #10b981;">Recordatorio de Labor en Monkey Trials</h2>
                            <p>Hola,</p>
                            <p>Tienes una labor planificada asignada para la fecha <strong>${task.date}</strong>.</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f8fafc;">Ubicación</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${locationLabel} (${taskTypeLabel})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f8fafc;">Estadio/Condición</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">${task.condition}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background-color: #f8fafc;">Estado</td>
                                    <td style="padding: 8px; border: 1px solid #ddd; text-transform: uppercase;">${task.status}</td>
                                </tr>
                            </table>

                            <h3>Mezcla de Tanque (${task.products.length} productos)</h3>
                            <ul>
                                ${task.products.map(p => `<li><strong>${p.product}</strong> (${p.family || 'N/A'}) - ${p.dose} ${p.unit}</li>`).join('')}
                            </ul>

                            <br />
                            <a href="https://agriotrials.app/aplicaciones" style="display: inline-block; padding: 10px 20px; background-color: #10b981; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Detalles en la Plataforma</a>
                            
                            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0 15px 0;" />
                            <p style="font-size: 11px; color: #999;">Generado automáticamente por Monkey Trials / Agrovista Lab.</p>
                        </div>
                    `
                }
            });
            console.log(`Reminder email written to Firestore for: ${task.responsibleEmails.join(', ')}`);
        } catch (error) {
            console.error("Error creating email reminder document:", error);
            throw error;
        }
    }
};
