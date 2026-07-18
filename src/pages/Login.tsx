import { useState } from 'react';
import { Sprout, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/UserContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { settings } = useSettings();
    const { signInWithEmail } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setLoading(true);

        try {
            await signInWithEmail(email, password);
            localStorage.setItem('isAuthenticated', 'true');
            navigate('/');
        } catch (err: any) {
            console.error("Auth Error:", err);
            if (err.message && (err.message.includes('No registrado') || err.message.includes('Usuario no habilitado') || err.message.includes('Usuario no registrado'))) {
                setError(err.message);
            } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Credenciales inválidas.');
            } else {
                setError('Error al intentar acceder. Por favor intente nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 font-sans">
            
            <div className="max-w-md w-full text-center">
                {/* Logo or Sprout */}
                <div className="mb-6 flex justify-center">
                    {settings.company.logoUrl ? (
                        <img src={settings.company.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                    ) : (
                        <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl shadow-sm">
                            <Sprout className="w-8 h-8 text-white" />
                        </div>
                    )}
                </div>

                <h1 className="text-5xl font-light text-slate-800 dark:text-white mb-4">
                    Comenzar Sesión
                </h1>

                <p className="text-sm text-slate-600 dark:text-slate-400 mb-10">
                    Ingresa tus credenciales para acceder a la plataforma.
                </p>

                {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-md flex items-start text-left">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3 shrink-0 mt-0.5" />
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                <div className="space-y-4 w-full max-w-sm mx-auto">
                    <form className="space-y-4 text-left anima-fade-in" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1 uppercase tracking-wider">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="email@ejemplo.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1 uppercase tracking-wider">Contraseña</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-md font-medium hover:opacity-90 transition-opacity mt-2 flex items-center justify-center"
                        >
                            {loading ? (
                                <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <span>Acceder</span>
                            )}
                        </button>
                    </form>
                </div>
            </div>
            
            <div className="mt-12 text-slate-400 text-xs text-center border-t border-slate-200 dark:border-slate-800 pt-6 w-full max-w-md">
                <p>El acceso a este sistema está restringido a usuarios autorizados.<br/>Si necesitas una cuenta, contacta al administrador.</p>
                <p className="mt-2">&copy; {new Date().getFullYear()} {settings.company.name}.</p>
            </div>
        </div>
    );
}
