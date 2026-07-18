import { Activity, Beaker, Sprout, TrendingUp, ArrowRight, FileText, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import WallFeed from '../components/dashboard/WallFeed';
import WeatherWidget from '../components/dashboard/WeatherWidget';
import { useAppContext } from '../context/AppContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/UserContext';

export default function Dashboard() {
    const { recentPages, trials, applications } = useAppContext();
    const { settings } = useSettings();
    const { hasPermission } = useAuth();

    // Calculate real stats
    const activeTrials = trials.filter(t => t.status !== 'completado').length;
    const pendingApps = applications.filter(a => a.status === 'pendiente').length;
    const inEvaluation = trials.filter(t => t.status === 'evaluacion').length;
    const completedTrials = trials.filter(t => t.status === 'completado').length;
    const totalTrials = trials.length;
    const completionPercent = totalTrials > 0 ? Math.round((completedTrials / totalTrials) * 100) : 0;

    const kpiStats = [
        { title: 'Ensayos Activos', value: activeTrials.toString(), icon: Beaker, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
        { title: 'Aplicaciones Pendientes', value: pendingApps.toString(), icon: Sprout, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30' },
        { title: 'Resultados Pendientes', value: inEvaluation.toString(), icon: Activity, color: 'text-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30' },
        { title: 'Ensayos Finalizados', value: `${completionPercent}%`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    ];

    return (
        <div className="w-full pb-8">
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Resumen General - {settings.company.name} ✨
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                    Bienvenido nuevamente al panel de gestión de {settings.company.name}.
                </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {kpiStats.map((kpi, i) => (
                    <div key={i} className="flex items-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-shadow hover:shadow-md">
                        <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${kpi.bg} ${kpi.color} mr-4`}>
                            <kpi.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{kpi.title}</p>
                            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{kpi.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Listado de Ensayos en Evaluación (Informes Pendientes) */}
            {trials.filter(t => t.status === 'evaluacion').length > 0 && (
                <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                            <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mr-2" />
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Informes Pendientes <span className="text-indigo-500">({trials.filter(t => t.status === 'evaluacion').length})</span>
                            </h2>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-100 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
                            Acción Requerida
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {trials.filter(t => t.status === 'evaluacion').map(trial => (
                            <Link
                                key={trial.id}
                                to={`/ensayos?id=${trial.id}`}
                                className="flex items-center p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-white dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
                            >
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg mr-3 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{trial.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{trial.client} • {trial.location}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 ml-auto text-slate-300 group-hover:text-indigo-500 translate-x-0 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Contenido Principal: Feed y Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">

                {/* Columna Izquierda: Accesos Rápidos (Desktop sidebar effect) */}
                <div className="hidden lg:block lg:col-span-1 xl:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                        <h2 className="text-sm uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-3">Módulos Principales</h2>
                        <div className="space-y-3">
                            {hasPermission('ensayos') && (
                                <Link to="/ensayos" className="group p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-green-500 transition-colors flex justify-between items-center">
                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-green-600 transition-colors">Ensayos</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-green-500 transition-transform transform group-hover:translate-x-1" />
                                </Link>
                            )}
                            {hasPermission('aplicaciones') && (
                                <Link to="/aplicaciones" className="group p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-500 transition-colors flex justify-between items-center">
                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 transition-colors">Labores</span>
                                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-transform transform group-hover:translate-x-1" />
                                </Link>
                            )}
                            {(!hasPermission('ensayos') && !hasPermission('aplicaciones')) && (
                                <p className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    Aún no tienes módulos asignados. Contacta al administrador si crees que esto es un error.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700">
                        <h2 className="text-sm uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 mb-3">Recientes</h2>
                        {recentPages.length > 0 ? (
                            <ul className="space-y-2">
                                {recentPages.map((page, i) => (
                                    <li key={i}>
                                        <Link to={page.path} className="flex p-2 items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg cursor-pointer transition-colors border-l-2 border-transparent hover:border-green-500">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 mr-2"></div>
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{page.title}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay módulos vistos recientemente.</p>
                        )}
                    </div>
                </div>

                {/* Main Feed: Muro */}
                <div className="lg:col-span-2 xl:col-span-2">
                    <WallFeed />
                </div>

                {/* Columna Derecha: Clima */}
                <div className="lg:col-span-3 xl:col-span-1">
                    <WeatherWidget />
                </div>
            </div>
        </div>
    );
}
