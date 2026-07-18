import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CompanySettings, SystemSettings } from '../types/settings';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface SettingsContextType {
    settings: SystemSettings;
    updateCompanySettings: (company: CompanySettings) => Promise<void>;
    updateSystemSettings: (updated: Partial<SystemSettings>) => Promise<void>;
}

const defaultSettings: SystemSettings = {
    company: {
        name: 'AgroVista S.A.',
        cuit: '30-71458963-9',
        phone: '+54 11 4455-6677',
        email: 'info@agrovista.com',
        address: 'Ruta 8, Km 150, Pergamino, Buenos Aires',
        website: 'www.agrovista.com',
        currency: 'ARS',
        defaultTaxRate: 21,
        activity: 'Investigación y Desarrollo Agronómico'
    },
    notifications: {
        email: true,
        push: true,
        approvalRequests: true
    },
    messaging: {
        enableInternalChat: true,
        enableEmailNotifications: true,
        autoCreateGroupForTrials: true,
        autoCreateGroupForTasks: true,
        allowAttachments: true
    },
    smtp: {
        server: 'smtp.gmail.com',
        port: 587,
        user: 'notificaciones@agrovista.com',
        encryption: 'tls',
        senderEmail: 'no-reply@agrovista.com',
        senderName: 'AgroVista Notifications'
    },
    textTemplates: [
        { id: '1', title: 'Aviso Legal Estándar', content: 'Este documento tiene carácter informativo y no constituye una factura legal definitiva.', category: 'quotation' },
        { id: '2', title: 'Cuentas para Transferencia', content: 'Banco Santander - CBU: 0720000000000000000000 - Alias: agrovista.pago', category: 'invoice' }
    ],
    theme: 'system'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SystemSettings>(defaultSettings);

    // Sync from Firestore: settings/company
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'company'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data() as SystemSettings;
                setSettings({
                    ...defaultSettings,
                    ...data,
                    company: { ...defaultSettings.company, ...(data.company || {}) },
                    notifications: { ...defaultSettings.notifications, ...(data.notifications || {}) },
                    messaging: { ...defaultSettings.messaging, ...(data.messaging || {}) },
                    smtp: data.smtp ? { ...defaultSettings.smtp!, ...data.smtp } : defaultSettings.smtp,
                    textTemplates: data.textTemplates || defaultSettings.textTemplates,
                });
            } else {
                // Initialize with defaults if it doesn't exist
                console.log("Settings not found, initializing with defaults...");
                setDoc(doc(db, 'settings', 'company'), defaultSettings, { merge: true });
            }
        }, (err) => {
            console.error("Firebase Settings Listener Error:", err);
        });

        return () => unsubscribe();
    }, []);

    const updateCompanySettings = async (company: CompanySettings) => {
        const newSettings = { ...settings, company };
        await setDoc(doc(db, 'settings', 'company'), newSettings, { merge: true });
    };

    const updateSystemSettings = async (updated: Partial<SystemSettings>) => {
        const newSettings = { ...settings, ...updated };
        await setDoc(doc(db, 'settings', 'company'), newSettings, { merge: true });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateCompanySettings, updateSystemSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
