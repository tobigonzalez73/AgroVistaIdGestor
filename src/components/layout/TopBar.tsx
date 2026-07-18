import { Menu, Bell, UserCircle, LogOut, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatContext } from '../../context/ChatContext';
import { useAuth } from '../../context/UserContext';
import { useNotifications } from '../../context/NotificationContext';
import { useSettings } from '../../context/SettingsContext';

interface TopBarProps {
    setSidebarOpen: (open: (prev: boolean) => boolean) => void;
}

export default function TopBar({ setSidebarOpen }: TopBarProps) {
    const navigate = useNavigate();
    const { toggleChat, totalUnreadCount } = useChatContext();
    const { currentUser, logout } = useAuth();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
    const { settings } = useSettings();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30 transition-colors duration-200">
            <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 -mb-px">

                    {/* Header left */}
                    <div className="flex">
                        <button
                            className="text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 lg:hidden"
                            aria-controls="sidebar"
                            onClick={(e) => { e.stopPropagation(); setSidebarOpen((open) => !open); }}
                        >
                            <span className="sr-only">Abrir sidebar</span>
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Header right */}
                    <div className="flex items-center space-x-3">
                        <div className="hidden md:flex flex-col items-end mr-2 pr-2 border-r border-slate-200 dark:border-slate-800">
                             <span className="text-[10px] font-black tracking-widest text-emerald-500 uppercase animate-pulse">Servidor Firebase: LIVE</span>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 rounded-full py-0.5">Versión Global 1.8.0 (Anti-Overwrite Activo)</span>





                        </div>


                        {/* Mensajeria */}
                        {settings.messaging.enableInternalChat && (
                            <button
                                onClick={toggleChat}
                                className="relative flex items-center justify-center p-2 text-slate-400 hover:text-green-500 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors"
                                title="Mensajes"
                            >
                                <span className="sr-only">Mensajes</span>
                                <MessageSquare className="w-5 h-5" />
                                {totalUnreadCount > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full min-w-[20px] h-[20px]">
                                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Notificaciones Dropdown */}
                        <div className="relative group">
                            <button className="flex items-center justify-center p-2 text-slate-400 hover:text-green-500 rounded-full bg-slate-100 dark:bg-slate-800 transition-colors">
                                <span className="sr-only">Notificaciones</span>
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-amber-500 rounded-full min-w-[18px] h-[18px]">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            
                            {/* Dropdown Menu */}
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Notificaciones</h3>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllAsRead} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                                            Marcar todas como leídas
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-20" />
                                            <p className="text-xs text-slate-400 font-medium">No hay notificaciones</p>
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <button 
                                                key={n.id} 
                                                onClick={() => {
                                                    markAsRead(n.id);
                                                    if (n.link) navigate(n.link);
                                                }}
                                                className={`w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex gap-3 ${!n.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                                            >
                                                <div className={`mt-1 shrink-0 w-2 h-2 rounded-full ${
                                                    n.type === 'approval' ? 'bg-amber-500' :
                                                    n.type === 'success' ? 'bg-emerald-500' :
                                                    'bg-indigo-500'
                                                }`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'}`}>
                                                        {n.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                                                    <p className="text-[9px] text-slate-400 mt-1 font-medium italic">
                                                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <div className="p-2 bg-slate-50 dark:bg-slate-800/80 text-center border-t border-slate-100 dark:border-slate-700">
                                        <button onClick={clearNotifications} className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors">
                                            Limpiar historial
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <hr className="w-px h-6 bg-slate-200 dark:bg-slate-700 border-none mx-3" />

                        <div className="flex items-center space-x-2 text-slate-500 hover:text-green-600 transition-colors cursor-pointer" title="Perfil">
                            <UserCircle className="w-8 h-8 opacity-80" />
                            <div className="font-medium text-sm hidden sm:block text-slate-800 dark:text-slate-200">
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {currentUser.name || currentUser.email || 'Usuario'}
                                    </span>
                                    <span className="text-[10px] block opacity-50 uppercase font-black">
                                        {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'user' ? 'Técnico' : 'Externo'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            title="Cerrar sesión"
                            className="flex items-center justify-center p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
                        >
                            <span className="sr-only">Cerrar sesión</span>
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>

                </div>
            </div>
        </header>
    );
}
