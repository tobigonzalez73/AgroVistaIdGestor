import { useState } from 'react';
import { X, Printer, FileText, Landmark, Mail, MessageCircle, Send, ChevronDown, Sprout } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useSettings } from '../../context/SettingsContext';
import type { Transaction, FinancialEntity } from '../../types/finance';

interface Props {
    transactionId: string;
    onClose: () => void;
}

// ─── Message Templates ────────────────────────────────────────────────
interface MsgTemplate { label: string; body: (tx: Transaction, entity: FinancialEntity, companyName: string) => string; }

const EMAIL_TEMPLATES: MsgTemplate[] = [
    {
        label: 'Envío de factura',
        body: (tx: Transaction, entity: FinancialEntity, companyName: string) =>
            `Estimado/a ${entity.name},\n\nPor medio del presente le enviamos el comprobante ${tx.documentNumber} correspondiente a ${tx.description || 'servicios prestados'} por un importe de ${tx.currency === 'ARS' ? '$' : 'U$D'} ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}.\n\nQuedamos a su disposición ante cualquier consulta.\n\nSaludos cordiales,\n${companyName}`
    },
    {
        label: 'Recordatorio de pago',
        body: (tx: Transaction, entity: FinancialEntity, companyName: string) =>
            `Estimado/a ${entity.name},\n\nLe recordamos que tiene pendiente el comprobante ${tx.documentNumber} por un total de ${tx.currency === 'ARS' ? '$' : 'U$D'} ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}.\n\nPor favor, gestione el pago a la brevedad.\n\nSaludos,\n${companyName}`
    },
    {
        label: 'Confirmación de pago recibido',
        body: (tx: Transaction, entity: FinancialEntity, companyName: string) =>
            `Estimado/a ${entity.name},\n\nConfirmamos la recepción del pago correspondiente al comprobante ${tx.documentNumber} por ${tx.currency === 'ARS' ? '$' : 'U$D'} ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}.\n\nMuchas gracias por su pago.\n\nSaludos cordiales,\n${companyName}`
    },
    {
        label: 'Mensaje personalizado',
        body: () => ''
    }
];

const WA_TEMPLATES: MsgTemplate[] = [
    {
        label: 'Envío de factura',
        body: (tx, entity, companyName) =>
            `Hola ${entity.name} 👋\n\nLe compartimos el comprobante *${tx.documentNumber}* por un importe de *${tx.currency === 'ARS' ? '$' : 'U$D'} ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })} ${tx.currency}*.\n\nQuedamos a su disposición. 🙏\n\n*${companyName}*`
    },
    {
        label: 'Recordatorio de cobro',
        body: (tx, entity, companyName) =>
            `Hola ${entity.name} 👋\n\nLe recordamos que tiene pendiente el comprobante *${tx.documentNumber}* por *${tx.currency === 'ARS' ? '$' : 'U$D'} ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}*.\n\nMuchas gracias! 🙏\n\n*${companyName}*`
    },
    {
        label: 'Confirmación de pago',
        body: (tx, entity, companyName) =>
            `Hola ${entity.name} ✅\n\nConfirmamos la recepción de su pago (${tx.documentNumber}) por *${tx.currency === 'ARS' ? '$' : 'U$D'} ${tx.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}*.\n\nMuchas gracias! 🙏\n\n*${companyName}*`
    },
    {
        label: 'Mensaje personalizado',
        body: () => ''
    }
];

// ─── Share Modal ──────────────────────────────────────────────────────
function ShareModal({ tx, entity, onClose }: { tx: Transaction; entity: FinancialEntity; onClose: () => void }) {
    const { settings } = useSettings();
    const [tab, setTab] = useState<'email' | 'whatsapp'>('email');
    const [contact, setContact] = useState(tab === 'email' ? (entity.email || '') : (entity.phone || ''));
    const [selectedTemplate, setSelectedTemplate] = useState(0);
    const [customBody, setCustomBody] = useState('');

    const templates = tab === 'email' ? EMAIL_TEMPLATES : WA_TEMPLATES;
    const tmpl = templates[selectedTemplate];
    const generatedBody = tmpl.label === 'Mensaje personalizado' ? customBody : (tmpl.body as any)(tx, entity, settings.company.name);

    const handleTabChange = (t: 'email' | 'whatsapp') => {
        setTab(t);
        setContact(t === 'email' ? (entity.email || '') : (entity.phone || ''));
        setSelectedTemplate(0);
    };

    const handleSend = () => {
        if (!contact) return;
        if (tab === 'email') {
            const subject = encodeURIComponent(`Comprobante ${tx.documentNumber} - ${entity.name}`);
            const body = encodeURIComponent(generatedBody);
            window.open(`mailto:${contact}?subject=${subject}&body=${body}`, '_self');
        } else {
            const clean = contact.replace(/[\s\-().+]/g, '');
            const phone = clean.startsWith('54') ? clean : `54${clean}`;
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(generatedBody)}`, '_blank');
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h3 className="text-base font-black text-slate-800 dark:text-slate-100">Enviar comprobante</h3>
                        <p className="text-xs text-slate-500">{tx.documentNumber} — {entity.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => handleTabChange('email')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${tab === 'email' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Mail className="w-4 h-4" /> Email
                    </button>
                    <button
                        onClick={() => handleTabChange('whatsapp')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold transition-colors ${tab === 'whatsapp' ? 'text-green-600 border-b-2 border-green-600 bg-green-50 dark:bg-green-900/20' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    {/* Contact */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                            {tab === 'email' ? '📧 Email destino' : '📱 Teléfono WhatsApp'}
                        </label>
                        <input
                            type={tab === 'email' ? 'email' : 'tel'}
                            autoFocus
                            value={contact}
                            onChange={e => setContact(e.target.value)}
                            placeholder={tab === 'email' ? 'correo@ejemplo.com' : 'Ej: 2317551234'}
                            className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Template selector */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                            📝 Plantilla de mensaje
                        </label>
                        <div className="relative">
                            <select
                                value={selectedTemplate}
                                onChange={e => setSelectedTemplate(Number(e.target.value))}
                                className="w-full appearance-none px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm pr-8 focus:ring-2 focus:ring-blue-500"
                            >
                                {templates.map((t, i) => (
                                    <option key={i} value={i}>{t.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Message preview / editor */}
                    <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-1.5">
                            Vista previa del mensaje {tmpl.label === 'Mensaje personalizado' ? '(editá el texto)' : '(se puede modificar)'}
                        </label>
                        <textarea
                            rows={6}
                            value={generatedBody}
                            onChange={e => {
                                if (tmpl.label === 'Mensaje personalizado') {
                                    setCustomBody(e.target.value);
                                } else {
                                    // allow ad-hoc edit: switch to custom and copy
                                    setSelectedTemplate(templates.length - 1);
                                    setCustomBody(e.target.value);
                                }
                            }}
                            className="w-full px-3 py-2.5 border-2 border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 text-xs font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 leading-relaxed"
                        />
                    </div>
                </div>

                <div className="px-4 pb-4 flex gap-2">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!contact || !generatedBody}
                        className={`flex-1 py-2.5 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-40 ${tab === 'email' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-green-500 hover:bg-green-600'}`}
                    >
                        <Send className="w-4 h-4" />
                        {tab === 'email' ? 'Abrir email' : 'Abrir WhatsApp'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────
export default function TransactionPrintModal({ transactionId, onClose }: Props) {
    const { transactions, entities } = useFinance();
    const { settings } = useSettings();

    const tx = transactions.find(t => t.id === transactionId);
    const entity = entities.find(e => e && tx && e.id === tx.entityId);

    const isInvoice = tx?.type === 'invoice_in' || tx?.type === 'invoice_out';
    const isPayment = tx?.type === 'payment_in' || tx?.type === 'payment_out';

    const [showShare, setShowShare] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    if (!tx || !entity) return null;

    const availableTemplates = (settings.textTemplates || []).filter(t => 
        t.category === 'all' || 
        (isInvoice && t.category === 'invoice') || 
        (isPayment && t.category === 'receipt')
    );

    const selectedTemplate = availableTemplates.find(t => t.id === selectedTemplateId);
    const observationText = selectedTemplate ? selectedTemplate.content : (tx.description || `Comprobante emitido mediante el sistema de gestión ${settings.company.name}. La firma al pie constituye la aceptación de las condiciones comerciales pactadas.`);

    const subtotal = (tx.items || []).reduce((acc, item) => acc + item.subtotal, 0);
    const totalTaxes = (tx.taxes || []).reduce((acc, tax) => acc + tax.amount, 0);

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:p-0 print:bg-white">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 print:shadow-none print:border-none print:max-h-none print:rounded-none">

                {/* Modal Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 print:hidden shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Vista de Comprobante</h2>
                            <p className="text-xs text-slate-500">{tx.documentNumber}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Share button */}
                        <button
                            onClick={() => setShowShare(true)}
                            className="flex items-center px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg shadow-sm font-semibold text-sm transition-all gap-2"
                            title="Enviar por Email o WhatsApp"
                        >
                            <Send className="w-4 h-4" />
                            <span className="hidden sm:inline">Enviar</span>
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-semibold text-sm transition-all"
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir / PDF
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-2">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-8 md:p-12 overflow-y-auto w-full flex-grow print:overflow-visible print:p-0 bg-white text-slate-900">

                    {/* Document Header */}
                    <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
                                    {settings.company.logoUrl ? (
                                        <img src={settings.company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Sprout className="w-8 h-8 text-green-600" />
                                    )}
                                </div>
                                <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">{settings.company.name}</h1>
                            </div>
                            <div className="text-sm text-slate-600 space-y-0.5">
                                <p className="font-bold text-slate-800 italic">{settings.company.activity || 'Soluciones Agronómicas Digitales'}</p>
                                <p>{settings.company.address}</p>
                                <p>Tel: {settings.company.phone} | {settings.company.website}</p>
                                <p>{settings.company.activity}</p>
                                <p>CUIT: {settings.company.cuit}</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                            <div className="bg-slate-900 text-white px-6 py-2 rounded-t-lg text-sm font-bold tracking-widest uppercase">
                                {isInvoice ? (tx.documentSubtype?.toUpperCase().replace('_', ' ') || 'FACTURA') : 'RECIBO'}
                            </div>
                            <div className="border-2 border-slate-900 px-6 py-4 rounded-b-lg rounded-tl-lg flex flex-col items-center min-w-[200px]">
                                <span className="text-4xl font-black mb-1">{tx.documentNumber.split(' ')[0]}</span>
                                <span className="text-xl font-bold">{tx.documentNumber.split(' ')[1] || ''}</span>
                                <div className="mt-3 text-xs uppercase font-bold text-slate-500 border-t border-slate-200 pt-2 w-full text-center">Original</div>
                            </div>
                            <div className="mt-4 text-right">
                                <p className="text-sm font-bold text-slate-500 uppercase">Fecha de Emisión</p>
                                <p className="text-xl font-black">{new Date(tx.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Entity Information */}
                    <div className="grid grid-cols-2 gap-8 mb-10 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        <div>
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1">Señor(es) / Cliente</h3>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-slate-900">{entity.name}</p>
                                {entity.cuit && <p className="text-sm font-medium"><span className="text-slate-500">CUIT:</span> {entity.cuit}</p>}
                                {entity.address && <p className="text-sm font-medium"><span className="text-slate-500">Dirección:</span> {entity.address}</p>}
                                {entity.email && <p className="text-sm font-medium"><span className="text-slate-500">Email:</span> {entity.email}</p>}
                                {entity.phone && <p className="text-sm font-medium"><span className="text-slate-500">Tel:</span> {entity.phone}</p>}
                            </div>
                        </div>
                        <div className="flex flex-col justify-center items-end border-l border-slate-200 pl-8">
                            <p className="text-xs font-black text-slate-400 uppercase mb-1">Condición Frente al IVA</p>
                            <p className="text-sm font-bold text-slate-800">{isInvoice ? 'Responsable Inscripto / Cons. Final' : 'N/A'}</p>
                            <p className="text-xs font-black text-slate-400 uppercase mt-4 mb-1">Moneda del Comprobante</p>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${tx.currency === 'ARS' ? 'bg-slate-200 border-slate-300' : tx.currency === 'USD_DIVISA' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-emerald-100 border-emerald-200 text-emerald-700'}`}>
                                    {tx.currency}
                                </span>
                                {tx.exchangeRate && <span className="text-xs font-bold text-slate-500">TC: ${tx.exchangeRate.toLocaleString()}</span>}
                            </div>
                        </div>
                    </div>

                    {/* Invoice Detail */}
                    {isInvoice && (
                        <div className="mb-10">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-widest">
                                        <th className="px-4 py-3 rounded-tl-lg">Descripción / Concepto</th>
                                        <th className="px-4 py-3 text-right">Cant.</th>
                                        <th className="px-4 py-3 text-right">Precio Unit.</th>
                                        <th className="px-4 py-3 text-right">IVA %</th>
                                        <th className="px-4 py-3 text-right rounded-tr-lg">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 border-b-2 border-slate-900">
                                    {(tx.items || []).length > 0 ? (
                                        tx.items!.map(item => (
                                            <tr key={item.id} className="text-sm">
                                                <td className="px-4 py-4 font-bold text-slate-800">{item.description}</td>
                                                <td className="px-4 py-4 text-right">{item.quantity}</td>
                                                <td className="px-4 py-4 text-right">${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="px-4 py-4 text-right">{item.ivaPercentage}%</td>
                                                <td className="px-4 py-4 text-right font-black">${item.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr className="text-sm italic text-slate-500">
                                            <td colSpan={5} className="px-4 py-8 text-center">{tx.description || 'Detalle no especificado'}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Payment Detail */}
                    {isPayment && (
                        <div className="mb-10">
                            <h3 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center">
                                <Landmark className="w-4 h-4 mr-2 text-indigo-500" />
                                Detalle de Imputación de {tx.type === 'payment_in' ? 'Cobranza' : 'Pago'}
                            </h3>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 uppercase text-[10px] font-black tracking-widest border-y border-slate-200">
                                        <th className="px-4 py-2">Comprobante Vinculado</th>
                                        <th className="px-4 py-2 text-right">Importe Aplicado</th>
                                        <th className="px-4 py-2 text-right">Moneda Origen</th>
                                        <th className="px-4 py-2 text-right">TC Aplicado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                                    {(tx.settlements || []).map(s => (
                                        <tr key={s.invoiceId} className="text-sm font-medium">
                                            <td className="px-4 py-3 font-bold text-slate-800">
                                                {transactions.find(t => t.id === s.invoiceId)?.documentNumber || 'Factura Desconocida'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-indigo-600">
                                                {tx.currency === 'ARS' ? '$' : 'U$D'} {s.amountApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px] font-bold">
                                                    {transactions.find(t => t.id === s.invoiceId)?.currency || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500">
                                                {s.exchangeRateApplied ? `$${s.exchangeRateApplied.toLocaleString()}` : 'Paridad'}
                                            </td>
                                        </tr>
                                    ))}
                                    {(tx.settlements || []).length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-6 text-center italic text-slate-400 text-sm">
                                                {tx.type === 'payment_in' ? 'Cobranza' : 'Pago'} a cuenta / Sin vinculación específica
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer Totals */}
                    <div className="flex justify-between items-start gap-12">
                        <div className="flex-grow max-w-[450px]">
                            {/* Template Selector for UI only */}
                            {!availableTemplates.length ? null : (
                                <div className="mb-3 print:hidden">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest pl-1">Agregar Plantilla de Texto</label>
                                    <div className="relative">
                                        <select
                                            value={selectedTemplateId}
                                            onChange={e => setSelectedTemplateId(e.target.value)}
                                            className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">(Observaciones originales)</option>
                                            {availableTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-h-[100px]">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-2">Observaciones</h4>
                                <p className="text-xs text-slate-600 leading-relaxed italic">
                                    {observationText}
                                </p>
                            </div>
                            <div className="mt-8 flex gap-20">
                                <div className="border-t border-slate-400 pt-2 px-8 min-w-[150px] text-center">
                                    <p className="text-[9px] font-black uppercase text-slate-400">Entregado por</p>
                                </div>
                                <div className="border-t border-slate-400 pt-2 px-8 min-w-[150px] text-center">
                                    <p className="text-[9px] font-black uppercase text-slate-400">Recibido por</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-[300px] shrink-0">
                            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
                                <div className="space-y-3 mb-6">
                                    {isInvoice && (
                                        <>
                                            <div className="flex justify-between items-center text-xs opacity-70">
                                                <span>Subtotal Neto:</span>
                                                <span className="font-bold">${(subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs opacity-70 border-b border-white/10 pb-2">
                                                <span>Impuestos y Tasas:</span>
                                                <span className="font-bold">${(totalTaxes || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </>
                                    )}
                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">Importe Total</span>
                                            <span className="text-3xl font-black">
                                                {tx.currency === 'ARS' ? '$' : 'U$D'} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[9px] text-white/40 italic font-medium leading-tight">
                                    {isPayment ? 'Recibo oficial de pago. No válido como factura.' : 'Factura legal emitida sujeta a condiciones AFIP.'}
                                    {' '}Valor expresado en {tx.currency}.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] border-t border-slate-100 pt-8">
                        - Gracias por confiar en {settings.company.name} -
                    </div>
                </div>
            </div>

            {showShare && (
                <ShareModal tx={tx} entity={entity} onClose={() => setShowShare(false)} />
            )}

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\\:block, .print\\:block * { visibility: visible; }
                    .print\\:block { position: absolute; left: 0; top: 0; width: 100%; }
                    @page { size: auto; margin: 10mm; }
                }
            `}</style>
        </div>
    );
}
