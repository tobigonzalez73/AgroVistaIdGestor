import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { ReactNode } from 'react';
import type { Trial, ApplicationTask } from '../types/trial';
import type { CalendarEvent } from '../types/agenda';
import type { VademecumProduct } from '../data/vademecum';

// Initial data removed for production

interface RecentPage {
    path: string;
    title: string;
}

interface AppContextType {
    trials: Trial[];
    setTrials: React.Dispatch<React.SetStateAction<Trial[]>>;
    applications: ApplicationTask[];
    setApplications: React.Dispatch<React.SetStateAction<ApplicationTask[]>>;
    recentPages: RecentPage[];
    addRecentPage: (page: RecentPage) => void;
    events: CalendarEvent[];
    setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
    syncApplications: (trials: Trial[]) => void;
    customProducts: VademecumProduct[];
    addCustomProduct: (product: VademecumProduct) => void;
    handleSetLeader: (appId: string, email: string) => Promise<void>;
    toggleAppStatus: (appId: string) => Promise<void>;
    handleAssignResponsible: (appId: string, email: string) => Promise<void>;
    handleRemoveResponsible: (appId: string, email: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [trials, setTrials] = useState<Trial[]>([]);
    const [applications, setApplications] = useState<ApplicationTask[]>([]);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [customProducts, setCustomProducts] = useState<VademecumProduct[]>([]);
    const [recentPages, setRecentPages] = useState<RecentPage[]>(() => {
        const stored = localStorage.getItem('agrovista_recent_pages');
        return stored ? JSON.parse(stored) : [];
    });

    // Sync from Firestore instead of localStorage
    useEffect(() => {
        const unsubscribeTrials = onSnapshot(collection(db, 'trials'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Trial));
            setTrials(data);
        });
        const unsubscribeApps = onSnapshot(collection(db, 'applications'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ApplicationTask));
            setApplications(data);
        });
        const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalendarEvent));
            setEvents(data);
        });
        const unsubscribeCustomProducts = onSnapshot(collection(db, 'custom_products'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as VademecumProduct));
            setCustomProducts(data);
        });

        return () => {
            unsubscribeTrials();
            unsubscribeApps();
            unsubscribeEvents();
            unsubscribeCustomProducts();
        };
    }, []);

    React.useEffect(() => {
        localStorage.setItem('agrovista_recent_pages', JSON.stringify(recentPages));
    }, [recentPages]);

    const handleSetLeader = async (appId: string, email: string) => {
        await updateDoc(doc(db, 'applications', appId), { leaderEmail: email });
    };

    const toggleAppStatus = async (appId: string) => {
        const app = applications.find(a => a.id === appId);
        if (app) {
            await updateDoc(doc(db, 'applications', appId), {
                status: app.status === 'completada' ? 'pendiente' : 'completada'
            });
        }
    };

    const handleAssignResponsible = async (appId: string, email: string) => {
        const app = applications.find(a => a.id === appId);
        if (app) {
            const current = app.responsibleEmails || [];
            if (email && !current.includes(email)) {
                const newEmails = [...current, email];
                const newLeader = app.leaderEmail || email;
                await updateDoc(doc(db, 'applications', appId), {
                    responsibleEmails: newEmails,
                    leaderEmail: newLeader
                });
            }
        }
    };

    const handleRemoveResponsible = async (appId: string, email: string) => {
        const app = applications.find(a => a.id === appId);
        if (app) {
            const newEmails = (app.responsibleEmails || []).filter(e => e !== email);
            let newLeader = app.leaderEmail;
            if (newLeader === email) {
                newLeader = newEmails.length > 0 ? newEmails[0] : undefined;
            }
            await updateDoc(doc(db, 'applications', appId), {
                responsibleEmails: newEmails,
                leaderEmail: newLeader
            });
        }
    };

    const syncApplications = useCallback((updatedTrials: Trial[]) => {
        setApplications(prev => {
            // Keep general tasks and manual tasks
            let updatedApps = [...prev.filter(app => app.type === 'general' || !app.id.startsWith('trial-task-'))];

            updatedTrials.forEach(trial => {
                const resolvedDates: Record<string, string> = {};

                const resolveDate = (referenceType?: string, referenceId?: string, offset: number = 0): string => {
                    let baseDate = trial.date;
                    if (referenceType === 'init') {
                        baseDate = trial.date;
                    } else if (referenceId && resolvedDates[referenceId]) {
                        baseDate = resolvedDates[referenceId];
                    } else if (referenceType === 'fixed' && referenceId) {
                        baseDate = referenceId;
                    }
                    
                    try {
                        const dateObj = new Date(baseDate + 'T12:00:00');
                        dateObj.setDate(dateObj.getDate() + offset);
                        return dateObj.toISOString().split('T')[0];
                    } catch {
                        return baseDate;
                    }
                };

                // 1. Milestones
                (trial.milestones || []).forEach(m => {
                    const taskId = `trial-task-${trial.id}-milestone-${m.id}`;
                    const existingTask = prev.find(a => a.id === taskId);
                    const date = m.date || trial.date;
                    resolvedDates[m.id] = date;

                    updatedApps.push({
                        id: taskId,
                        type: 'ensayo',
                        trialId: trial.id,
                        location: trial.location,
                        date: date,
                        condition: `Hito: ${m.name}`,
                        status: existingTask ? existingTask.status : 'pendiente',
                        products: [],
                        notes: `Tipo: ${m.type}`,
                        isVariable: m.isVariable
                    });
                });

                // 2. Applications
                (trial.plannedApplications || []).forEach(plannedApp => {
                    const taskId = `trial-task-${trial.id}-app-${plannedApp.id}`;
                    const existingTask = prev.find(a => a.id === taskId);

                    let calculatedDate = plannedApp.date;
                    if (!calculatedDate) {
                        calculatedDate = resolveDate(plannedApp.referenceType, plannedApp.referenceId, plannedApp.daysAfterReference ?? plannedApp.daysAfterStart ?? 0);
                    }
                    resolvedDates[plannedApp.id] = calculatedDate;

                    const allProducts: any[] = [];
                    trial.treatments?.forEach(t => {
                        if (t.applicationIds?.includes(plannedApp.id)) {
                            t.products.forEach(p => {
                                const override = t.applicationSettings?.[plannedApp.id]?.overrides?.[p.id];
                                allProducts.push({
                                    ...p,
                                    dose: override?.dose ?? p.dose,
                                    unit: override?.unit ?? p.unit
                                });
                            });
                        }
                    });

                    updatedApps.push({
                        id: taskId,
                        type: 'ensayo',
                        trialId: trial.id,
                        location: trial.location,
                        date: calculatedDate,
                        condition: plannedApp.notes ? `${plannedApp.name} (${plannedApp.notes})` : plannedApp.name,
                        status: existingTask ? existingTask.status : 'pendiente',
                        products: allProducts,
                        notes: plannedApp.notes,
                        isVariable: plannedApp.isVariable
                    });
                });

                // 3. Evaluations
                (trial.evaluations || []).forEach(ev => {
                    const taskId = `trial-task-${trial.id}-eval-${ev.id}`;
                    const existingTask = prev.find(a => a.id === taskId);

                    let calculatedDate = ev.date;
                    if (!calculatedDate) {
                        calculatedDate = resolveDate(ev.referenceType, ev.referenceId, ev.daysAfterApplication ?? 0);
                    }
                    resolvedDates[ev.id] = calculatedDate;

                    updatedApps.push({
                        id: taskId,
                        type: 'ensayo',
                        trialId: trial.id,
                        location: trial.location,
                        date: calculatedDate,
                        condition: `Evaluación: ${ev.name}`,
                        status: existingTask ? existingTask.status : 'pendiente',
                        products: [],
                        notes: `Variables: ${ev.name}${ev.referenceId ? ` (Ref: ${ev.referenceId})` : ''}`,
                        isVariable: ev.isVariable
                    });
                });
            });

            return updatedApps;
        });
    }, []);

    const addRecentPage = useCallback((page: RecentPage) => {
        setRecentPages((prev) => {
            // Remove if already exists to move it to the top
            const filtered = prev.filter((p) => p.path !== page.path);
            const updated = [page, ...filtered];
            // Keep only the most recent 4 pages
            return updated.slice(0, 4);
        });
    }, []);

    const addCustomProduct = useCallback(async (product: VademecumProduct) => {
        const id = product.id || doc(collection(db, 'custom_products')).id;
        await setDoc(doc(db, 'custom_products', id), { ...product, id }, { merge: true });
    }, []);

    // Auto-sync applications when trials change
    React.useEffect(() => {
        syncApplications(trials);
    }, [trials, syncApplications]);

    return (
        <AppContext.Provider value={{ 
            trials, setTrials, 
            applications, setApplications, 
            recentPages, addRecentPage, 
            events, setEvents, 
            syncApplications,
            customProducts,
            addCustomProduct,
            handleSetLeader,
            toggleAppStatus,
            handleAssignResponsible,
            handleRemoveResponsible
        }}>
            {children}
        </AppContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
}
