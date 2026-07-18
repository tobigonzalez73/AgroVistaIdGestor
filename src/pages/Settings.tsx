import { useState, useMemo, useEffect } from 'react';
import { Settings as SettingsIcon, Building, Bell, Shield, Save, Upload, Globe, Phone, Mail, MapPin, Hash, CheckCircle2, Briefcase, Server, Lock, Cpu, Users as UsersIcon, Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Clock, ShieldCheck, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useAudit } from '../context/AuditContext';
import { useAuth } from '../context/UserContext';
import type { CompanySettings, MessagingSettings, SmtpSettings, TextTemplate } from '../types/settings';
import type { User, ModulePermission } from '../types/user';
import { backupCollections, resetTestData } from '../utils/firebaseAdminTools';

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

export default function Settings() {
    const { settings, updateCompanySettings, updateSystemSettings } = useSettings();
    const { logAction, getEntriesByUser } = useAudit();
    const { currentUser, users, addUser, updateUser, deleteUser } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'company' | 'notifications' | 'messaging' | 'infrastructure' | 'users' | 'security' | 'templates'>('company');
    const [companyForm, setCompanyForm] = useState<CompanySettings>(settings.company);
    const [messagingForm, setMessagingForm] = useState<MessagingSettings>(settings.messaging);
    const [smtpForm, setSmtpForm] = useState<SmtpSettings>(settings.smtp || {
        server: '',
        port: 587,
        user: '',
        password: '',
        encryption: 'tls' as const,
        senderEmail: '',
        senderName: ''
    });

    // Sincronizar estados locales cuando cambian los settings globales
    useEffect(() => {
        setCompanyForm(settings.company);
        setMessagingForm(settings.messaging);
        if (settings.smtp) setSmtpForm(settings.smtp);
    }, [settings]);

    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Users Tab State
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [userView, setUserView] = useState<'list' | 'permissions' | 'history'>('list');
    const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

    // Text Templates State
    const [editingTemplate, setEditingTemplate] = useState<TextTemplate | null>(null);
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);

    const isAdmin = currentUser.role === 'admin';

    const filteredUsers = useMemo(() => {
        return users.filter((u) => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }, [users, searchTerm]);

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            await updateCompanySettings(companyForm);
            logAction({
                userId: currentUser?.id || 'system',
                userName: currentUser?.name || 'Sistema',
                action: 'update',
                module: 'configuracion',
                entityId: 'company-settings',
                entityName: 'Perfil de Empresa',
                details: `Actualizada información de la empresa: ${companyForm.name}`
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMessagingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            await updateSystemSettings({ messaging: messagingForm });
            logAction({
                userId: currentUser?.id || 'system',
                userName: currentUser?.name || 'Sistema',
                action: 'update',
                module: 'configuracion',
                entityId: 'messaging-settings',
                entityName: 'Configuración de Mensajería',
                details: `Actualizada configuración de mensajería interna.`
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSmtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            await updateSystemSettings({ smtp: smtpForm });
            logAction({
                userId: currentUser?.id || 'system',
                userName: currentUser?.name || 'Sistema',
                action: 'update',
                module: 'configuracion',
                entityId: 'smtp-settings',
                entityName: 'Configuración de Servidor de Correo',
                details: `Actualizada configuración del servidor SMTP: ${smtpForm.server}`
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUserSave = (e: React.FormEvent<HTMLFormElement>) => {
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

        if (isCreatingUser) {
            addUser(userData);
        } else if (editingUser) {
            updateUser(editingUser.id, userData);
        }

        setEditingUser(null);
        setIsCreatingUser(false);
    };

    const formatTimestamp = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
            ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full max-w-5xl mx-auto pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <SettingsIcon className="w-7 h-7 mr-3 text-slate-500" />
                        Configuración del Sistema
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gestiona la información de tu empresa y preferencias del sistema.
                    </p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Navigation */}
                <aside className="w-full md:w-64 space-y-1">
                    <button
                        onClick={() => setActiveTab('company')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'company' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <Building className="w-5 h-5 mr-3" />
                        Perfil de Empresa
                    </button>
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'notifications' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <Bell className="w-5 h-5 mr-3" />
                        Notificaciones
                    </button>
                    <button
                        onClick={() => setActiveTab('messaging')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'messaging' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <Mail className="w-5 h-5 mr-3" />
                        Mensajería
                    </button>
                    <button
                        onClick={() => setActiveTab('infrastructure')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'infrastructure' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <Server className="w-5 h-5 mr-3" />
                        Infraestructura
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'users' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <UsersIcon className="w-5 h-5 mr-3" />
                        Usuarios y Permisos
                    </button>
                    <button
                        onClick={() => setActiveTab('templates')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'templates' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <FileText className="w-5 h-5 mr-3" />
                        Plantillas de Texto
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === 'security' 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        <Shield className="w-5 h-5 mr-3" />
                        Seguridad Avanzada
                    </button>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1">
                    {activeTab === 'company' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Información de la Empresa</h2>
                                <p className="text-sm text-slate-500">Estos datos aparecerán en los reportes y documentos generados.</p>
                            </div>

                            <form onSubmit={handleCompanySubmit}>
                                <div className="p-8 space-y-6">
                                    {/* Logo Upload Section (Simulated) */}
                                    <div className="flex items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-700/50">
                                        <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 relative overflow-hidden group">
                                            {companyForm.logoUrl ? (
                                                <img src={companyForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                            ) : (
                                                <Building className="w-8 h-8 text-slate-400" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Upload className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Logo de la Empresa</h3>
                                            <p className="text-xs text-slate-500 mt-1 mb-3">Sube una imagen PNG o JPG (Máx. 2MB)</p>
                                            <input 
                                                type="file" 
                                                id="logo-upload" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setCompanyForm(prev => ({ ...prev, logoUrl: reader.result as string }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => document.getElementById('logo-upload')?.click()}
                                                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg hover:bg-indigo-100 transition-colors"
                                            >
                                                Cambiar Logo
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <Building className="w-4 h-4 mr-2 text-slate-400" /> Razón Social / Nombre *
                                            </label>
                                            <input 
                                                required 
                                                type="text" 
                                                value={companyForm.name}
                                                onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-bold" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <Briefcase className="w-4 h-4 mr-2 text-slate-400" /> Actividad Principal
                                            </label>
                                            <input 
                                                type="text" 
                                                value={companyForm.activity || ''}
                                                onChange={e => setCompanyForm({...companyForm, activity: e.target.value})}
                                                placeholder="Ej: Investigación Agronómica"
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <Hash className="w-4 h-4 mr-2 text-slate-400" /> CUIT / Identificación Fiscal *
                                            </label>
                                            <input 
                                                required 
                                                type="text" 
                                                value={companyForm.cuit}
                                                onChange={e => setCompanyForm({...companyForm, cuit: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-bold" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <Mail className="w-4 h-4 mr-2 text-slate-400" /> Email de Contacto
                                            </label>
                                            <input 
                                                type="email" 
                                                value={companyForm.email}
                                                onChange={e => setCompanyForm({...companyForm, email: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <Phone className="w-4 h-4 mr-2 text-slate-400" /> Teléfono
                                            </label>
                                            <input 
                                                type="text" 
                                                value={companyForm.phone}
                                                onChange={e => setCompanyForm({...companyForm, phone: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-slate-400" /> Dirección Legal
                                            </label>
                                            <input 
                                                type="text" 
                                                value={companyForm.address}
                                                onChange={e => setCompanyForm({...companyForm, address: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                                placeholder="Calle, Ciudad, Provincia, CP"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center">
                                                <Globe className="w-4 h-4 mr-2 text-slate-400" /> Sitio Web
                                            </label>
                                            <input 
                                                type="text" 
                                                value={companyForm.website}
                                                onChange={e => setCompanyForm({...companyForm, website: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Moneda del Sistema</label>
                                            <select 
                                                value={companyForm.currency}
                                                onChange={e => setCompanyForm({...companyForm, currency: e.target.value as 'ARS' | 'USD'})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-bold"
                                            >
                                                <option value="ARS">Pesos Argentinos (ARS)</option>
                                                <option value="USD">Dólares Estadounidenses (USD)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center gap-4">
                                    {saveSuccess && (
                                        <span className="text-emerald-600 flex items-center text-sm font-medium animate-in fade-in slide-in-from-right-2">
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Cambios guardados
                                        </span>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl shadow-md font-bold transition-all transform active:scale-95"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                                Guardando...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Guardar Cambios
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                             <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Preferencia de Notificaciones</h2>
                                <p className="text-sm text-slate-500">Configura cómo deseas recibir las alertas del sistema.</p>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Notificaciones por Email</p>
                                                <p className="text-xs text-slate-500">Recibe resúmenes de tareas y aprobaciones pendientes.</p>
                                            </div>
                                        </div>
                                        <input type="checkbox" className="w-10 h-5 bg-slate-200 rounded-full appearance-none checked:bg-indigo-600 transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all" defaultChecked={settings.notifications.email} />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Alertas en Tiempo Real (Push)</p>
                                                <p className="text-xs text-slate-500">Notificaciones instantáneas en el navegador.</p>
                                            </div>
                                        </div>
                                        <input type="checkbox" className="w-10 h-5 bg-slate-200 rounded-full appearance-none checked:bg-indigo-600 transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:left-5.5 before:transition-all" defaultChecked={settings.notifications.push} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'messaging' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Configuración de Mensajería</h2>
                                <p className="text-sm text-slate-500">Gestiona el chat interno y comunicaciones automáticas.</p>
                            </div>

                            <form onSubmit={handleMessagingSubmit}>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Activar Chat Interno</p>
                                                <p className="text-xs text-slate-500 text-pretty max-w-sm">Permitir que los usuarios se envíen mensajes en tiempo real dentro de la plataforma.</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={messagingForm.enableInternalChat}
                                                onChange={e => setMessagingForm({...messagingForm, enableInternalChat: e.target.checked})}
                                                className="w-10 h-5 bg-slate-200 checked:bg-indigo-600 rounded-full appearance-none transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-5 before:transition-all" 
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Notificar Mensajes por Email</p>
                                                <p className="text-xs text-slate-500 text-pretty max-w-sm">Enviar una copia del mensaje al correo electrónico si el usuario está desconectado.</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={messagingForm.enableEmailNotifications}
                                                onChange={e => setMessagingForm({...messagingForm, enableEmailNotifications: e.target.checked})}
                                                className="w-10 h-5 bg-slate-200 checked:bg-indigo-600 rounded-full appearance-none transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-5 before:transition-all" 
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Auto-crear grupos para Ensayos</p>
                                                <p className="text-xs text-slate-500 text-pretty max-w-sm">Crea automáticamente una conversación grupal al dar de alta un nuevo ensayo.</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={messagingForm.autoCreateGroupForTrials}
                                                onChange={e => setMessagingForm({...messagingForm, autoCreateGroupForTrials: e.target.checked})}
                                                className="w-10 h-5 bg-slate-200 checked:bg-indigo-600 rounded-full appearance-none transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-5 before:transition-all" 
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Permitir Archivos Adjuntos</p>
                                                <p className="text-xs text-slate-500 text-pretty max-w-sm">Habilitar la subida de imágenes y documentos en el chat.</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={messagingForm.allowAttachments}
                                                onChange={e => setMessagingForm({...messagingForm, allowAttachments: e.target.checked})}
                                                className="w-10 h-5 bg-slate-200 checked:bg-indigo-600 rounded-full appearance-none transition-colors relative cursor-pointer before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 checked:before:translate-x-5 before:transition-all" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center gap-4">
                                    {saveSuccess && (
                                        <span className="text-emerald-600 flex items-center text-sm font-medium animate-in fade-in slide-in-from-right-2">
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Cambios guardados
                                        </span>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl shadow-md font-bold transition-all transform active:scale-95"
                                    >
                                        {isSaving ? 'Guardando...' : 'Guardar Configuración'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'infrastructure' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <Mail className="w-5 h-5 mr-2 text-indigo-500" />
                                    Servidor de Correo (SMTP)
                                </h2>
                                <p className="text-sm text-slate-500">Configura la infraestructura para el envío de notificaciones y alertas automáticas.</p>
                            </div>

                            <form onSubmit={handleSmtpSubmit}>
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center text-pretty">
                                                <Server className="w-4 h-4 mr-2 text-slate-400" /> Host del Servidor (SMTP)
                                            </label>
                                            <input 
                                                required
                                                type="text" 
                                                value={smtpForm.server}
                                                onChange={e => setSmtpForm({...smtpForm, server: e.target.value})}
                                                placeholder="smtp.ejemplo.com"
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center text-pretty">
                                                <Hash className="w-4 h-4 mr-2 text-slate-400" /> Puerto
                                            </label>
                                            <input 
                                                required
                                                type="number" 
                                                value={smtpForm.port}
                                                onChange={e => setSmtpForm({...smtpForm, port: parseInt(e.target.value)})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center text-pretty">
                                                <Mail className="w-4 h-4 mr-2 text-slate-400" /> Usuario / Email Autenticación
                                            </label>
                                            <input 
                                                required
                                                type="text" 
                                                value={smtpForm.user}
                                                onChange={e => setSmtpForm({...smtpForm, user: e.target.value})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center text-pretty">
                                                <Lock className="w-4 h-4 mr-2 text-slate-400" /> Contraseña
                                            </label>
                                            <input 
                                                type="password" 
                                                value={smtpForm.password || ''}
                                                onChange={e => setSmtpForm({...smtpForm, password: e.target.value})}
                                                placeholder="••••••••"
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center text-pretty">
                                                <Globe className="w-4 h-4 mr-2 text-slate-400" /> Cifrado (Encryption)
                                            </label>
                                            <select 
                                                value={smtpForm.encryption}
                                                onChange={e => setSmtpForm({...smtpForm, encryption: e.target.value as any})}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium"
                                            >
                                                <option value="none">None</option>
                                                <option value="ssl">SSL</option>
                                                <option value="tls">TLS</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center text-pretty">
                                                <Mail className="w-4 h-4 mr-2 text-slate-400" /> Email del Remitente
                                            </label>
                                            <input 
                                                required
                                                type="email" 
                                                value={smtpForm.senderEmail}
                                                onChange={e => setSmtpForm({...smtpForm, senderEmail: e.target.value})}
                                                placeholder="no-reply@agrovista.com"
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-slate-100 font-medium" 
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-4">
                                        <Cpu className="w-6 h-6 text-blue-500 shrink-0 mt-1" />
                                        <div>
                                            <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Entorno de Servidores</p>
                                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">El sistema está configurado actualmente en modo Desarrollo. Las conexiones SMTP se validan pero los envíos reales dependen del backend configurado.</p>
                                        </div>
                                    </div>

                                    {/* DANGER ZONE - SYSTEM MAINTENANCE */}
                                    {isAdmin && (
                                        <div className="mt-12 p-6 bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                                            <h3 className="text-sm font-black text-rose-800 dark:text-rose-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                                <Shield className="w-4 h-4" /> Zona de Mantenimiento Crítico
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/20">
                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Respaldo Integral (JSON)</p>
                                                    <p className="text-[10px] text-slate-500 mb-3">Descarga una copia de seguridad de todas las colecciones (Ensayos, Labores, Finanzas, Clientes).</p>
                                                    <button 
                                                        type="button"
                                                        onClick={() => backupCollections(['trials', 'applications', 'transactions', 'clients', 'products'])}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-black text-white rounded-lg text-xs font-bold transition-all"
                                                    >
                                                        <Upload className="w-4 h-4 rotate-180" /> Descargar Backup
                                                    </button>
                                                </div>

                                                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-rose-100 dark:border-rose-900/20">
                                                    <p className="text-xs font-bold text-rose-600 mb-1">Borrado de Datos de Prueba</p>
                                                    <p className="text-[10px] text-slate-500 mb-3">ELIMINA permanentemente ensayos, labores y transacciones. <span className="font-bold text-rose-500 underline uppercase">Sin vuelta atrás</span>.</p>
                                                    <button 
                                                        type="button"
                                                        onClick={() => {
                                                            if (confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción borrará todos los ensayos y datos cargados hasta ahora. Los usuarios y configuraciones se mantendrán.')) {
                                                                resetTestData().then(() => alert('Datos eliminados correctamente. El sistema está limpio para uso real.'));
                                                            }
                                                        }}
                                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black transition-all shadow-lg shadow-rose-200 dark:shadow-none"
                                                    >
                                                        <Trash2 className="w-4 h-4" /> Resetear para Producción
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end items-center gap-4">
                                    {saveSuccess && (
                                        <span className="text-emerald-600 flex items-center text-sm font-medium animate-in fade-in slide-in-from-right-2">
                                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Cambios guardados
                                        </span>
                                    )}
                                    <button 
                                        type="submit" 
                                        disabled={isSaving}
                                        className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl shadow-md font-bold transition-all transform active:scale-95"
                                    >
                                        {isSaving ? 'Probando Conexión...' : 'Guardar y Probar'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'users' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <UsersIcon className="w-6 h-6 text-indigo-500" />
                                        Gestión de Usuarios
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">Configuración de accesos y permisos por módulo.</p>
                                </div>
                                {isAdmin && (
                                    <button
                                        onClick={() => setIsCreatingUser(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                                    >
                                        <Plus className="w-5 h-5" /> Nuevo Usuario
                                    </button>
                                )}
                            </div>

                            {/* View tabs inside Users */}
                            <div className="flex gap-1 bg-slate-100 dark:bg-slate-900/50 rounded-xl p-1 shrink-0">
                                <button
                                    onClick={() => setUserView('list')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${userView === 'list' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    <UsersIcon className="w-3.5 h-3.5" /> Lista
                                </button>
                                <button
                                    onClick={() => setUserView('permissions')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${userView === 'permissions' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" /> Matriz
                                </button>
                                <button
                                    onClick={() => setUserView('history')}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${userView === 'history' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Clock className="w-3.5 h-3.5" /> Auditoría
                                </button>
                            </div>

                            {/* USER LIST VIEW */}
                            {userView === 'list' && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                                        <div className="relative max-w-md">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por nombre o email..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                                                <tr>
                                                    <th className="px-6 py-4 font-bold">Usuario</th>
                                                    <th className="px-6 py-4 font-bold">Rol</th>
                                                    <th className="px-6 py-4 font-bold">Estado</th>
                                                    <th className="px-6 py-4 font-bold">Autoriza en</th>
                                                    {isAdmin && <th className="px-6 py-4 font-bold text-right">Acciones</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                                {filteredUsers.map((user) => (
                                                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                                                    {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                                                                    <p className="text-xs text-slate-500">{user.email || 'Sin email'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40'}`}>
                                                                {user.role === 'admin' ? 'Admin' : user.role === 'user' ? 'Técnico' : 'Externo'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {user.isActive ? (
                                                                <span className="flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                                                                    <CheckCircle className="w-3.5 h-3.5" /> Activo
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 text-slate-400 font-medium text-xs">
                                                                    <XCircle className="w-3.5 h-3.5" /> Inactivo
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                                {user.role === 'admin' ? (
                                                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase">Acceso Total</span>
                                                                ) : user.modules?.length > 0 ? (
                                                                    user.modules.map(modId => (
                                                                        <span key={modId} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700 capitalize">
                                                                            {modId}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-400 italic">Sin módulos</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        {isAdmin && (
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    <button onClick={() => setEditingUser(user)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors">
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button onClick={() => { if (confirm('¿Eliminar usuario?')) deleteUser(user.id) }} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors">
                                                                        <Trash2 className="w-3.5 h-3.5" />
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

                            {/* PERMISSIONS MATRIX */}
                            {userView === 'permissions' && (
                                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-[10px]">
                                            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 font-black uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-4 py-3 text-left sticky left-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200">Usuario</th>
                                                    {MODULES.map(m => (
                                                        <th key={m.id} className="px-2 py-3 text-center min-w-[70px]">{m.label}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {users.filter(u => u.isActive).map(user => (
                                                    <tr key={user.id}>
                                                        <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700 z-10 font-bold text-slate-700">
                                                            {user.name}
                                                        </td>
                                                        {MODULES.map(m => {
                                                            const hasAccess = user.role === 'admin' || (user.modules || []).includes(m.id);
                                                            return (
                                                                <td key={m.id} className="p-2 text-center border-x border-slate-100 dark:border-slate-800">
                                                                    {hasAccess ? (
                                                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mx-auto" />
                                                                    ) : (
                                                                        <XCircle className="w-3.5 h-3.5 text-slate-100 dark:text-slate-800 mx-auto" />
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

                            {/* AUDIT HISTORY */}
                            {userView === 'history' && (
                                <div className="space-y-4">
                                    {users.filter(u => u.isActive && u.role !== 'external').slice(0, 5).map(user => {
                                        const userEntries = getEntriesByUser(user.id);
                                        const isExpanded = expandedUserId === user.id;
                                        return (
                                            <div key={user.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                                                <button
                                                    onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">
                                                            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-slate-800 dark:text-white text-sm">{user.name}</p>
                                                            <p className="text-[10px] text-slate-500">Acciones recientes: {userEntries.length}</p>
                                                        </div>
                                                    </div>
                                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                                </button>
                                                {isExpanded && (
                                                    <div className="border-t border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                                                        {userEntries.map(entry => (
                                                            <div key={entry.id} className="px-4 py-2 flex justify-between items-center text-[11px] border-b border-slate-50 dark:border-slate-900 italic">
                                                                <span className="text-slate-600"><span className="font-black">{ACTION_LABELS[entry.action]}</span> en {MODULE_LABELS[entry.module]}</span>
                                                                <span className="text-slate-400 font-medium">{formatTimestamp(entry.timestamp)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 text-center py-20">
                            <Shield className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tighter">Seguridad Avanzada</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2 text-sm font-medium">La gestión de logs de sistema, 2FA y políticas de contraseñas se encuentra en la fase final de despliegue.</p>
                        </div>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <FileText className="w-6 h-6 text-indigo-500" />
                                        Plantillas para Comprobantes
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">Textos predefinidos para pies de página, notas y observaciones.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setEditingTemplate({ id: Math.random().toString(36).substr(2, 9), title: '', content: '', category: 'all' });
                                        setIsCreatingTemplate(true);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                                >
                                    <Plus className="w-5 h-5" /> Nueva Plantilla
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(settings.textTemplates || []).map(template => (
                                    <div key={template.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                                    template.category === 'invoice' ? 'bg-blue-100 text-blue-700' :
                                                    template.category === 'receipt' ? 'bg-emerald-100 text-emerald-700' :
                                                    template.category === 'labor' ? 'bg-amber-100 text-amber-700' :
                                                    template.category === 'quotation' ? 'bg-purple-100 text-purple-700' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {template.category === 'all' ? 'Universal' : 
                                                     template.category === 'invoice' ? 'Factura' :
                                                     template.category === 'receipt' ? 'Recibo' :
                                                     template.category === 'labor' ? 'Labor' : 'Cotización'}
                                                </span>
                                                <h3 className="font-bold text-slate-800 dark:text-white mt-1">{template.title}</h3>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => {
                                                        setEditingTemplate(template);
                                                        setIsCreatingTemplate(false);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (confirm('¿Eliminar esta plantilla?')) {
                                                            const updated = (settings.textTemplates || []).filter(t => t.id !== template.id);
                                                            updateSystemSettings({ textTemplates: updated });
                                                        }
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                                            "{template.content}"
                                        </p>
                                    </div>
                                ))}
                                {(settings.textTemplates || []).length === 0 && (
                                    <div className="md:col-span-2 py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                        <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 font-medium tracking-tight">No hay plantillas de texto cargadas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* User Edit Modal */}
            {isAdmin && (isCreatingUser || editingUser) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <form onSubmit={handleUserSave} className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    {isCreatingUser ? 'Nuevo Usuario' : 'Perfil de Usuario'}
                                </h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Control de accesos y funciones</p>
                            </div>
                            <button type="button" onClick={() => { setIsCreatingUser(false); setEditingUser(null); }} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest pl-1">Nombre completo</label>
                                    <input required name="name" defaultValue={editingUser?.name || ''} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest pl-1">Email / Login</label>
                                    <input required type="email" name="email" defaultValue={editingUser?.email || ''} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest pl-1">Rol Organizativo</label>
                                    <select name="role" defaultValue={editingUser?.role || 'user'} className="w-full px-4 py-2 bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-sm">
                                        <option value="admin">Administrador (Total)</option>
                                        <option value="user">Técnico Interno</option>
                                        <option value="external">Externo / Tercero</option>
                                    </select>
                                </div>
                                <div className="flex flex-col">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest pl-1">Estado Cuenta</label>
                                    <label className="flex items-center gap-3 px-4 h-[38px] border-2 border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 cursor-pointer transition-all hover:bg-white group">
                                        <input type="checkbox" name="isActive" defaultChecked={editingUser ? editingUser.isActive : true} className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 ring-offset-0" />
                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 uppercase tracking-tighter">Usuario Activo</span>
                                    </label>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 dark:border-slate-700 pt-5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-indigo-500" /> Permisos de Acceso y Autorización por Módulo
                                </label>
                                <p className="text-[10px] text-slate-500 mb-2">Seleccioná los módulos a los que el usuario tiene acceso y capacidad de autorizar.</p>
                                <div className="grid grid-cols-2 gap-1.5 bg-indigo-50/20 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                    {MODULES.map(m => (
                                        <label key={m.id} className="flex items-center gap-2.5 cursor-pointer py-1.5 px-3 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all group border border-transparent hover:border-indigo-100">
                                            <input
                                                type="checkbox"
                                                name="modules"
                                                value={m.id}
                                                defaultChecked={(editingUser?.modules || []).includes(m.id) || false}
                                                className="rounded text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-xs font-black text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 uppercase tracking-tighter">{m.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex gap-3 shrink-0">
                            <button type="button" onClick={() => { setIsCreatingUser(false); setEditingUser(null); }} className="flex-1 py-2.5 px-4 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase text-xs">
                                Descartar
                            </button>
                            <button type="submit" className="flex-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-200/50 dark:shadow-none uppercase text-xs tracking-wider">
                                {isCreatingUser ? 'Crear Usuario Acceso' : 'Actualizar Permisos'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {/* Template Edit Modal */}
            {editingTemplate && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            const templates = settings.textTemplates || [];
                            if (isCreatingTemplate) {
                                updateSystemSettings({ textTemplates: [...templates, editingTemplate] });
                            } else {
                                updateSystemSettings({ 
                                    textTemplates: templates.map(t => t.id === editingTemplate.id ? editingTemplate : t) 
                                });
                            }
                            setEditingTemplate(null);
                        }}
                        className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-200"
                    >
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                                    {isCreatingTemplate ? 'Nueva Plantilla' : 'Editar Plantilla'}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personalización de documentos</p>
                            </div>
                            <button type="button" onClick={() => setEditingTemplate(null)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Título identificador</label>
                                <input 
                                    required
                                    type="text" 
                                    value={editingTemplate.title}
                                    onChange={e => setEditingTemplate({...editingTemplate, title: e.target.value})}
                                    placeholder="Ej: Condiciones de Pago"
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold" 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Categoría del documento</label>
                                <select 
                                    value={editingTemplate.category}
                                    onChange={e => setEditingTemplate({...editingTemplate, category: e.target.value as any})}
                                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                                >
                                    <option value="all">Todas (Universal)</option>
                                    <option value="invoice">Ventas / Facturas</option>
                                    <option value="receipt">Recibos de Pago</option>
                                    <option value="labor">Labores Agrícolas</option>
                                    <option value="quotation">Cotizaciones</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Contenido de la plantilla</label>
                                <textarea 
                                    required
                                    rows={6}
                                    value={editingTemplate.content}
                                    onChange={e => setEditingTemplate({...editingTemplate, content: e.target.value})}
                                    placeholder="Escribe aquí el texto que aparecerá en el comprobante..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-2 italic font-medium">Este texto podrá ser seleccionado al momento de generar el PDF.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-700 flex gap-3">
                            <button type="button" onClick={() => setEditingTemplate(null)} className="flex-1 py-2.5 px-4 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors uppercase text-xs">
                                Cancelar
                            </button>
                            <button type="submit" className="flex-2 px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg shadow-indigo-200/50 dark:shadow-none uppercase text-xs tracking-wider">
                                Guardar Plantilla
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
