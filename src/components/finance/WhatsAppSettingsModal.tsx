import { useState, useEffect } from 'react';
import { X, MessageCircle, CheckCircle, AlertTriangle, ExternalLink, Trash2, Settings } from 'lucide-react';
import { getWAConfig, saveWAConfig, clearWAConfig, sendWAMessage, type WAConfig } from './WhatsAppConfig';

interface Props {
    onClose: () => void;
}

export default function WhatsAppSettingsModal({ onClose }: Props) {
    const [config, setConfig] = useState<WAConfig>({ accessToken: '', phoneNumberId: '', businessName: '' });
    const [isSaved, setIsSaved] = useState(false);
    const [testPhone, setTestPhone] = useState('');
    const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
    const [testError, setTestError] = useState('');

    useEffect(() => {
        const stored = getWAConfig();
        if (stored) { setConfig(stored); setIsSaved(true); }
    }, []);

    const handleSave = () => {
        if (!config.accessToken || !config.phoneNumberId) return;
        saveWAConfig(config);
        setIsSaved(true);
    };

    const handleClear = () => {
        clearWAConfig();
        setConfig({ accessToken: '', phoneNumberId: '', businessName: '' });
        setIsSaved(false);
    };

    const handleTest = async () => {
        if (!testPhone || !isSaved) return;
        setTestStatus('loading');
        setTestError('');
        const result = await sendWAMessage(
            testPhone,
            `✅ Prueba de conexión desde ${config.businessName || 'Monkey Trials ERP'}. La integración con WhatsApp Business API está funcionando correctamente.`,
            config
        );
        if (result.success) {
            setTestStatus('ok');
        } else {
            setTestStatus('error');
            setTestError(result.error || 'Error desconocido');
        }
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500 rounded-xl text-white">
                            <MessageCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">WhatsApp Business API</h2>
                            <p className="text-xs text-slate-500">Configuración de Meta Cloud API</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                    {/* Docs link */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                            <span className="font-black">¿Cómo obtener las credenciales?</span>{' '}
                            Creá una app en{' '}
                            <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline font-bold inline-flex items-center gap-0.5">
                                Meta for Developers <ExternalLink className="w-3 h-3" />
                            </a>
                            {' '}, agrgá el producto <strong>WhatsApp</strong>, creá un número de prueba y copiá el token de acceso permanente.
                        </p>
                    </div>

                    {/* Fields */}
                    <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Nombre del negocio (aparece en los mensajes)
                        </label>
                        <input
                            type="text"
                            value={config.businessName}
                            onChange={e => setConfig(p => ({ ...p, businessName: e.target.value }))}
                            placeholder="Ej: Monkey Trials ERP"
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Access Token (Permanent Token) *
                        </label>
                        <textarea
                            value={config.accessToken}
                            onChange={e => setConfig(p => ({ ...p, accessToken: e.target.value }))}
                            placeholder="EAABw...token permanente..."
                            rows={3}
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-xs font-mono focus:ring-2 focus:ring-green-500 resize-none"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Encontralo en tu app de Meta → WhatsApp → Configuration → Access Token.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Phone Number ID *
                        </label>
                        <input
                            type="text"
                            value={config.phoneNumberId}
                            onChange={e => setConfig(p => ({ ...p, phoneNumberId: e.target.value }))}
                            placeholder="Ej: 123456789012345"
                            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 text-sm font-mono focus:ring-2 focus:ring-green-500"
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Encontralo en Meta → WhatsApp → Getting Started → Phone number ID.</p>
                    </div>

                    {/* Save / Clear buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={!config.accessToken || !config.phoneNumberId}
                            className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            {isSaved ? <><CheckCircle className="w-4 h-4" /> Guardado</> : 'Guardar configuración'}
                        </button>
                        {isSaved && (
                            <button onClick={handleClear} className="px-3 py-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-rose-200 transition-colors" title="Eliminar configuración">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Test section */}
                    {isSaved && (
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <p className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Enviar mensaje de prueba</p>
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    value={testPhone}
                                    onChange={e => setTestPhone(e.target.value)}
                                    placeholder="Ej: 2317551234"
                                    className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
                                />
                                <button
                                    onClick={handleTest}
                                    disabled={!testPhone || testStatus === 'loading'}
                                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold rounded-lg text-sm transition-colors"
                                >
                                    {testStatus === 'loading' ? '...' : 'Enviar'}
                                </button>
                            </div>
                            {testStatus === 'ok' && (
                                <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> ¡Mensaje enviado correctamente!</p>
                            )}
                            {testStatus === 'error' && (
                                <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 rounded-lg">
                                    <p className="text-xs text-rose-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Error: {testError}</p>
                                    <p className="text-[10px] text-rose-500 mt-1">El número destino debe haber iniciado una conversación con tu número de WhatsApp Business en las últimas 24hs, o debés usar un template aprobado.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Limits note */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed font-medium">
                            <span className="font-black">⚠ Importante:</span> Para enviar mensajes a contactos que no iniciaron conversación en las últimas 24hs, Meta requiere <strong>Message Templates</strong> aprobados.
                            Podés crear plantillas en Meta Business Manager → WhatsApp Manager → Message Templates.
                            En modo de prueba (Sandbox), solo podés enviar a los números verificados en tu cuenta de Meta.
                        </p>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

// Small settings trigger button to embed in the UI
export function WASettingsButton({ onClick }: { onClick: () => void }) {
    const configured = !!getWAConfig();
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${configured
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500 hover:bg-slate-200'}`}
            title="Configurar WhatsApp Business API"
        >
            <Settings className="w-3.5 h-3.5" />
            {configured ? '✓ WhatsApp API' : 'Config. WhatsApp'}
        </button>
    );
}
