import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuditEntry } from '../types/user';

interface AuditContextProps {
    entries: AuditEntry[];
    logAction: (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => void;
    getEntriesByUser: (userId: string) => AuditEntry[];
    getEntriesByModule: (module: AuditEntry['module']) => AuditEntry[];
    getEntriesByEntity: (entityId: string) => AuditEntry[];
}

const AuditContext = createContext<AuditContextProps | undefined>(undefined);

export function AuditProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<AuditEntry[]>(() => {
        const stored = localStorage.getItem('agrovista_audit_log');
        return stored ? JSON.parse(stored) : [];
    });

    useEffect(() => {
        localStorage.setItem('agrovista_audit_log', JSON.stringify(entries));
    }, [entries]);

    const logAction = useCallback((entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
        const newEntry: AuditEntry = {
            ...entry,
            id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            timestamp: new Date().toISOString(),
        };
        setEntries(prev => [newEntry, ...prev]);
    }, []);

    const getEntriesByUser = useCallback((userId: string) => {
        return entries.filter(e => e.userId === userId);
    }, [entries]);

    const getEntriesByModule = useCallback((module: AuditEntry['module']) => {
        return entries.filter(e => e.module === module);
    }, [entries]);

    const getEntriesByEntity = useCallback((entityId: string) => {
        return entries.filter(e => e.entityId === entityId);
    }, [entries]);

    return (
        <AuditContext.Provider value={{ entries, logAction, getEntriesByUser, getEntriesByModule, getEntriesByEntity }}>
            {children}
        </AuditContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAudit() {
    const context = useContext(AuditContext);
    if (context === undefined) {
        throw new Error('useAudit must be used within an AuditProvider');
    }
    return context;
}
