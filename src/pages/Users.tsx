import { useState } from 'react';
import { useAuth } from '../context/UserContext';
import { useAudit } from '../context/AuditContext';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Users as UsersIcon, Search, ShieldCheck, Clock, Eye, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { User, ModulePermission } from '../types/user';
const MODULES: { id: ModulePermission; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'ensayos', label: 'Ensayos' },
    { id: 'aplicaciones', label: 'Aplicaciones' },
    { id: 'catalogos', label: 'Catálogos' },
    { id: 'tareas', label: 'Tareas' },
    { id: 'comprobantes', label: 'Comprobantes' },
    { id: 'finanzas', label: 'Cuentas Corrientes' },
    { id: 'tesoreria', label: 'Tesorería' },
    { id: 'contabilidad', label: 'Contabilidad' },
    { id: 'usuarios', label: 'Gestión de Usuarios' },
];
/** Modules where authorization is relevant */
const ACTION_LABELS: Record<string, string> = {
    create: 'Creó',
    update: 'Modificó',
    delete: 'Eliminó',
    approve: 'Aprobó',
    reject: 'Rechazó',
};
const MODULE_LABELS: Record<string, string> = {
    ensayos: 'Ensayos',
    aplicaciones: 'Aplicaciones',
    comprobantes: 'Comprobantes',
    usuarios: 'Usuarios',
    catalogos: 'Catálogos',
    finanzas: 'Cuentas Corrientes',
    tesoreria: 'Tesorería',
    contabilidad: 'Contabilidad',
    tareas: 'Tareas',
};
export default function Users() {
    const { users, addUser, updateUser, deleteUser, currentUser } = useAuth();
    const { entries, getEntriesByUser } = useAudit();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [activeView, setActiveView] = useState<'list' | 'permissions' | 'history'>('list');
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
    const isAdmin = currentUser.role === 'admin';
    // Everyone can see the Users module, but only admin can edit
    // Safe filtering to avoid crashes if name or email are missing
    const filteredUsers = users.filter((u) => {
        const nameMatch = (u.name || '').toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || emailMatch;
    });
    
    const pendingUsers = filteredUsers.filter(u => !u.isActive && u.role !== 'admin');
    const activeUsers = filteredUsers.filter(u => u.isActive || u.role === 'admin');
    const handleAuthorizeAndNotify = (user: User) => {
        // 1. Activate User
        updateUser(user.id, { isActive: true });
        
        // 2. Prepare Email Notification
        const subject = encodeURIComponent('Acceso Habilitado - AgroVista S.A.');
        const body = encodeURIComponent(`Hola ${user.name},\n\nEs un placer informarte que tu acceso al sistema de gestión de AgroVista S.A. ha sido habilitado por el administrador.\n\nYa puedes ingresar utilizando tu cuenta en el siguiente enlace:\nhttps://agrovista-id.firebaseapp.com/\n\nBienvenido al ecosistema digital de AgroVista.\n\nSaludos,\nAdministración AgroVista S.A.`);
        
        const mailtoUrl = `mailto:${user.email}?subject=${subject}&body=${body}`;
        
        // Open user's email client
        window.location.href = mailtoUrl;
    };
    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const role = fd.get('role') as 'admin' | 'user' | 'external';
        const modules = fd.getAll('modules') as ModulePermission[];
        const userData: Partial<User> = {
            name: fd.get('name') as string,
            email: fd.get('email') as string,
            role,
            modules: role === 'admin' ? MODULES.map(m => m.id) : modules,
            isActive: fd.get('isActive') === 'on'
        };
        try {
            if (isCreating) {
                const emailExists = users.some(u => (u.email || '').toLowerCase() === (userData.email || '').toLowerCase());
                if (emailExists) {
                    alert('Ya existe un usuario con este correo electrónico.');
                    return;
                }
                await addUser(userData);
            } else if (editingUser) {
                await updateUser(editingUser.id, userData);
            }
            setEditingUser(null);
            setIsCreating(false);
        } catch (error: any) {
            console.error("Error al guardar usuario:", error);
            alert(`Error al guardar usuario: ${error.message || error}`);
        }
    };
    const formatTimestamp = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };
    return (
        <div className="p-4 lg:p-6 w-full max-w-9xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        <UsersIcon className="w-7 h-7 text-indigo-500" />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Usuarios, permisos por módulo, autorizaciones e historial de actividad.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <Plus className="w-5 h-5" /> Nuevo Usuario
                    </button>
                )}
            </div>
            {/* View tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button
                    onClick={() => setActiveView('list')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeView === 'list' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <UsersIcon className="w-4 h-4" /> Usuarios
                    <span className="ml-1.5 px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-[10px]">{users.length}</span>
                </button>
                <button
                    onClick={() => setActiveView('permissions')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeView === 'permissions' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Eye className="w-4 h-4" /> Funcionalidades por Módulo
                </button>
                <button
                    onClick={() => setActiveView('history')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${activeView === 'history' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                    <Clock className="w-4 h-4" /> Historial de Actividad
                </button>
            </div>
            {/* VIEW: User List */}
            {activeView === 'list' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar usuario..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Usuario</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Rol</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">Autoriza en</th>
                                    {isAdmin && <th className="px-6 py-4 font-bold text-right text-xs uppercase tracking-wider">Acciones</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {pendingUsers.length > 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-2 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border-y border-amber-100 dark:border-amber-900/30">
                                            Solicitudes Pendientes de Autorización ({pendingUsers.length})
                                        </td>
                                    </tr>
                                )}
                                {/* PENDING USERS SECTION */}
                                {pendingUsers.map((user) => (
                                    <tr key={user.id} className="bg-amber-50/20 dark:bg-amber-900/5 hover:bg-amber-50/40 transition-colors border-l-4 border-l-amber-500">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 font-bold border border-amber-200 dark:border-amber-800 shadow-sm">
                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                                                        {user.name || 'Sin nombre'}
                                                        <span className="flex items-center gap-1 text-[9px] bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded-full font-black uppercase shrink-0">
                                                            <Clock className="w-3 h-3" /> Pendiente
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select 
                                                defaultValue={user.role || 'user'}
                                                onChange={(e) => updateUser(user.id, { role: e.target.value as any })}
                                                className="text-[10px] font-black uppercase bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg px-2 py-1 focus:ring-1 focus:ring-amber-500 outline-none"
                                            >
                                                <option value="user">Técnico / Interno</option>
                                                <option value="external">Externo / Solicitante</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                                                <XCircle className="w-4 h-4" /> Inactivo
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[11px] text-slate-400 italic">No disponible</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleAuthorizeAndNotify(user)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-emerald-200 dark:shadow-none"
                                                >
                                                    <ShieldCheck className="w-4 h-4" /> Autorizar y Notificar
                                                </button>
                                                <button onClick={() => { if (confirm('¿Rechazar y eliminar solicitud?')) deleteUser(user.id) }} className="p-2 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeUsers.length > 0 && (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4} className="px-6 py-2 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border-y border-slate-100 dark:border-slate-800">
                                            Usuarios Activos ({activeUsers.length})
                                        </td>
                                    </tr>
                                )}
                                {/* ACTIVE USERS SECTION */}
                                {activeUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-white truncate">{user.name || 'Usuario'}</p>
                                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                                    user.role === 'user' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                        'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                                }`}>
                                                {user.role === 'admin' ? 'Administrador' : user.role === 'user' ? 'Técnico / Interno' : 'Externo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.isActive ? (
                                                <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                                                    <CheckCircle className="w-4 h-4" /> Activo
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                                                    <XCircle className="w-4 h-4" /> Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-[400px]">
                                                {user.role === 'admin' ? (
                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase">Acceso Total</span>
                                                ) : user.modules && user.modules.length > 0 ? (
                                                    user.modules.map(modId => {
                                                        const mod = MODULES.find(m => m.id === modId);
                                                        return (
                                                            <span key={modId} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700">
                                                                {mod?.label || modId}
                                                            </span>
                                                        )
                                                    })
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 italic">Sin accesos</span>
                                                )}
                                            </div>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingUser(user)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => { if (confirm('¿Eliminar usuario?')) deleteUser(user.id) }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* VIEW: Permissions / Functionalities Matrix */}
            {activeView === 'permissions' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                            <Eye className="w-4 h-4 text-indigo-500" />
                            Matriz de Permisos y Autorizaciones por Usuario
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> = Puede ver/acceder</span>
                            <span className="ml-4 inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-indigo-500" /> = Puede autorizar</span>
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left sticky left-0 bg-slate-100 dark:bg-slate-900/50 z-10 min-w-[160px]">Usuario</th>
                                    {MODULES.map(m => (
                                        <th key={m.id} className="px-2 py-3 text-center min-w-[80px]">
                                            <span className="block">{m.label}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {users.filter(u => u.isActive).map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-800 z-10">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 text-[10px] font-bold shrink-0">
                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 dark:text-white truncate">{user.name}</p>
                                                    <p className="text-[9px] text-slate-400">{user.role === 'admin' ? 'Admin' : user.role === 'user' ? 'Técnico' : 'Externo'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        {MODULES.map(m => {
                                            const hasAccess = user.role === 'admin' || (user.modules || []).includes(m.id);
                                            return (
                                                <td key={m.id} className="px-2 py-3 text-center">
                                                    {hasAccess ? (
                                                        <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                                                    ) : (
                                                        <XCircle className="w-4 h-4 text-slate-100 dark:text-slate-800 mx-auto" />
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* VIEW: Audit History */}
            {activeView === 'history' && (
                <div className="space-y-4">
                    {users.filter(u => u.isActive && u.role !== 'external').map(user => {
                        const userEntries = getEntriesByUser(user.id);
                        const isExpanded = expandedUserId === user.id;
                        return (
                            <div key={user.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <button
                                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{user.name}</p>
                                            <p className="text-[10px] text-slate-500">{user.email}</p>
                                        </div>
                                        <span className="ml-2 px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold rounded-full">
                                            {userEntries.length} accion{userEntries.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                                </button>
                                {isExpanded && (
                                    <div className="border-t border-slate-200 dark:border-slate-700">
                                        {userEntries.length === 0 ? (
                                            <div className="p-6 text-center text-sm text-slate-400">
                                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                                Este usuario aún no tiene actividad registrada.
                                            </div>
                                        ) : (
                                            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                                {userEntries.map(entry => (
                                                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                                            entry.action === 'create' ? 'bg-emerald-500' :
                                                            entry.action === 'update' ? 'bg-blue-500' :
                                                            entry.action === 'delete' ? 'bg-red-500' :
                                                            entry.action === 'approve' ? 'bg-indigo-500' :
                                                            'bg-amber-500'
                                                        }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-slate-700 dark:text-slate-200">
                                                                <span className="font-bold">{ACTION_LABELS[entry.action] || entry.action}</span>
                                                                {' '}
                                                                <span className="text-slate-500">en</span>
                                                                {' '}
                                                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{MODULE_LABELS[entry.module] || entry.module}</span>
                                                                {entry.entityName && (
                                                                    <>: <span className="font-medium">"{entry.entityName}"</span></>
                                                                )}
                                                            </p>
                                                            {entry.details && (
                                                                <p className="text-xs text-slate-400 mt-0.5 italic">{entry.details}</p>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                                                            {formatTimestamp(entry.timestamp)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {/* Global recent activity */}
                    {entries.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Actividad Global Reciente</h3>
                                <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                                    Últimas {Math.min(entries.length, 30)}
                                </span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {entries.slice(0, 30).map(entry => (
                                    <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                                        <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                            entry.action === 'create' ? 'bg-emerald-500' :
                                            entry.action === 'update' ? 'bg-blue-500' :
                                            entry.action === 'delete' ? 'bg-red-500' :
                                            entry.action === 'approve' ? 'bg-indigo-500' :
                                            'bg-amber-500'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 dark:text-slate-200">
                                                <span className="font-bold text-slate-800 dark:text-white">{entry.userName}</span>
                                                {' '}
                                                <span className="text-slate-500">{ACTION_LABELS[entry.action] || entry.action}</span>
                                                {' '}
                                                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{MODULE_LABELS[entry.module] || entry.module}</span>
                                                {entry.entityName && (
                                                    <>: <span className="font-medium">"{entry.entityName}"</span></>
                                                )}
                                            </p>
                                            {entry.details && (
                                                <p className="text-xs text-slate-400 mt-0.5 italic">{entry.details}</p>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                                            {formatTimestamp(entry.timestamp)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {/* Create/Edit Modal - Only admin can open this */}
            {isAdmin && (isCreating || editingUser) && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white">
                                    {isCreating ? 'Nuevo Usuario' : 'Editar Usuario'}
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Completa los datos del usuario.</p>
                            </div>
                            <button type="button" onClick={() => { setIsCreating(false); setEditingUser(null); }} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre completo</label>
                                <input required name="name" defaultValue={editingUser?.name || ''} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correo (Login o Referencia)</label>
                                <input required type="email" name="email" defaultValue={editingUser?.email || ''} className="w-full px-4 py-2 bg-white text-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rol</label>
                                    <select name="role" defaultValue={editingUser?.role || 'user'} className="w-full px-4 py-2.5 bg-white text-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500">
                                        <option value="admin">Administrador (Total)</option>
                                        <option value="user">Técnico / Interno</option>
                                        <option value="external">Externo (Solo asignaciones)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Estado</label>
                                    <label className="flex items-center gap-3 p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white text-slate-900 cursor-pointer h-11">
                                        <input type="checkbox" name="isActive" defaultChecked={editingUser ? editingUser.isActive : true} className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                                        <span className="text-sm font-bold">Activo</span>
                                    </label>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                                        Acceso a Módulos
                                    </label>
                                    <div className="grid grid-cols-2 gap-2 bg-indigo-50/20 text-slate-900 l p-4 rounded-xl border border-indigo-100">
                                        {MODULES.map(m => (
                                            <label key={m.id} className="flex items-center gap-2 cursor-pointer py-1.5 px-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-indigo-100">
                                                <input
                                                    type="checkbox"
                                                    name="modules"
                                                    value={m.id}
                                                    defaultChecked={(editingUser?.modules || []).includes(m.id)}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-xs font-bold">{m.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
                            <button type="button" onClick={() => { setIsCreating(false); setEditingUser(null); }} className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors">
                                Guardar Usuario
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
