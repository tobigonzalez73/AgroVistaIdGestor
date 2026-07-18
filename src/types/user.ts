export type ModulePermission =
    | 'dashboard' | 'ensayos' | 'aplicaciones' | 'catalogos'
    | 'tareas' | 'comprobantes' | 'finanzas' | 'tesoreria' | 'contabilidad' | 'usuarios' | 'configuracion';

export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user' | 'external'; // external can't login but can be assigned tasks
    /** Modules the user has access to */
    modules: ModulePermission[];
    avatar?: string;
    isActive: boolean;
}

export interface Approval {
    userId: string;
    status: 'pending' | 'approved' | 'rejected';
    date?: string;
    comments?: string;
}

/** Audit trail entry for tracking all user actions in the system */
export interface AuditEntry {
    id: string;
    userId: string;
    userName: string;
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
    module: 'ensayos' | 'aplicaciones' | 'comprobantes' | 'usuarios' | 'catalogos' | 'finanzas' | 'tesoreria' | 'contabilidad' | 'tareas' | 'configuracion';
    entityId: string;
    entityName: string;
    timestamp: string; // ISO 8601
    details?: string;
}
