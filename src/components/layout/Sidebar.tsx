import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Settings, Map, Thermometer, FlaskConical, Sprout,
    Landmark, Wallet, CheckSquare, Receipt, Users
} from 'lucide-react'; // El ícono Sprout se puede quitar si ya no se usa como fallback.
import { useAuth } from '../../context/UserContext';
import { useSettings } from '../../context/SettingsContext';

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
    const location = useLocation();
    const { settings } = useSettings();

    const { hasPermission } = useAuth();
    // Estilos base para los links
    const baseLinkClass = "flex items-center px-4 py-3 rounded-xl transition-all duration-200 mb-1 group";
    const activeLinkClass = "bg-green-600 text-white shadow-lg shadow-green-900/40";
    const inactiveLinkClass = "text-slate-400 hover:bg-slate-700/50 hover:text-white";

    return (
        <>
            {/* Fondo oscuro para móviles */}
            <div
                className={`fixed inset-0 bg-slate-900/50 z-40 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Contenedor Principal de la Barra Lateral */}
            <aside 
                id="main-sidebar"
                className={`flex flex-col fixed inset-y-0 left-0 z-[60] w-64 bg-[#1e293b] p-4 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:transform-none ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                
                {/* Cabecera con Logo */}
                <div className="flex flex-col items-center pb-6 mb-6 border-b border-slate-700">
                    {settings.company.logoUrl ? (
                        <img src={settings.company.logoUrl} alt="Logo Empresa" className="w-16 h-16 object-contain mb-3 rounded-2xl" />
                    ) : (
                        <div className="bg-white p-2 rounded-2xl shadow-xl mb-3">
                            <FlaskConical className="w-10 h-10 text-green-600" />
                        </div>
                    )}
                    <h1 className="text-white text-xs font-black tracking-widest uppercase opacity-90">AGROVISTA S.A.</h1>
                </div>

                {/* LISTADO DE MÓDULOS FILTRADO POR PERMISOS */}
                <nav className="flex-1 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>
                    
                    {hasPermission('dashboard') && (
                        <Link to="/" className={`${baseLinkClass} ${location.pathname === '/' ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <LayoutDashboard className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Dashboard</span>
                        </Link>
                    )}

                    {hasPermission('ensayos') && (
                        <Link to="/ensayos" className={`${baseLinkClass} ${location.pathname.startsWith('/ensayos') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <FlaskConical className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Ensayos</span>
                        </Link>
                    )}

                    {hasPermission('aplicaciones') && (
                        <Link to="/aplicaciones" className={`${baseLinkClass} ${location.pathname.startsWith('/aplicaciones') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <Sprout className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Labores</span>
                        </Link>
                    )}

                    {hasPermission('comprobantes') && (
                        <Link to="/comprobantes" className={`${baseLinkClass} ${location.pathname.startsWith('/comprobantes') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <Receipt className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Comprobantes</span>
                        </Link>
                    )}

                    {hasPermission('catalogos') && (
                        <>
                            <Link to="/catalogos/productos" className={`${baseLinkClass} ${location.pathname.includes('productos') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                                <Thermometer className="w-5 h-5 mr-3" />
                                <span className="text-sm font-bold">Vademécum</span>
                            </Link>

                            <Link to="/catalogos/geo" className={`${baseLinkClass} ${location.pathname.includes('geo') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                                <Map className="w-5 h-5 mr-3" />
                                <span className="text-sm font-bold">Clientes & Lotes</span>
                            </Link>
                        </>
                    )}

                    {hasPermission('tareas') && (
                        <Link to="/tareas" className={`${baseLinkClass} ${location.pathname.startsWith('/tareas') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <CheckSquare className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Tareas</span>
                        </Link>
                    )}

                    {hasPermission('finanzas') && (
                        <Link to="/finanzas" className={`${baseLinkClass} ${location.pathname.startsWith('/finanzas') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <Landmark className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Cuentas Corrientes</span>
                        </Link>
                    )}

                    {hasPermission('tesoreria') && (
                        <Link to="/tesoreria" className={`${baseLinkClass} ${location.pathname.startsWith('/tesoreria') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <Wallet className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Tesorería</span>
                        </Link>
                    )}

                    {hasPermission('usuarios') && (
                        <Link to="/usuarios" className={`${baseLinkClass} ${location.pathname.startsWith('/usuarios') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <Users className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Gestión de Usuarios</span>
                        </Link>
                    )}

                    {hasPermission('configuracion') && (
                        <Link to="/configuracion" className={`${baseLinkClass} ${location.pathname.startsWith('/configuracion') ? activeLinkClass : inactiveLinkClass}`} onClick={() => setSidebarOpen(false)}>
                            <Settings className="w-5 h-5 mr-3" />
                            <span className="text-sm font-bold">Configuración</span>
                        </Link>
                    )}

                </nav>

                {/* Footer informativo */}
                <div className="mt-auto pt-4 border-t border-slate-700 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Versión del Sistema 2.5 (v1.8.0)</p>
                </div>
            </aside>
        </>
    );
}
