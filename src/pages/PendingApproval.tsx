import { Sprout, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/UserContext';

export default function PendingApproval() {
    const { logout, currentUser } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
                <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 animate-pulse" />
                </div>
                
                <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                    Cuenta Pendiente de Autorización
                </h1>
                
                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                    Hola <span className="font-bold text-indigo-600 dark:text-indigo-400">{currentUser?.name}</span>. 
                    Tu cuenta ha sido registrada correctamente, pero requiere la validación del Administrador 
                    para acceder al ecosistema de AgroVista.
                </p>

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 mb-8 text-sm text-slate-500 border border-slate-100 dark:border-slate-700">
                    Te enviaremos un correo electrónico una vez que tu acceso haya sido habilitado.
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        Verificar estado nuevamente
                    </button>
                    
                    <button 
                        onClick={logout}
                        className="w-full py-3 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 font-bold transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Cerrar sesión
                    </button>
                </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-slate-400">
                <Sprout className="w-5 h-5" />
                <span className="text-xs font-black tracking-widest uppercase">AgroVista S.A.</span>
            </div>
        </div>
    );
}
