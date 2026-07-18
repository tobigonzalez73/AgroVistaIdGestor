import { useState } from 'react';
import { FileText, MapPin, Calendar, Users, Sprout, ClipboardCheck, Info, ChevronDown } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import type { Trial } from '../../types/trial';

interface QuotationPDFProps {
    trial: Trial;
    onClose: () => void;
}

export default function QuotationPDF({ trial, onClose }: QuotationPDFProps) {
    const { settings } = useSettings();
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    const handlePrint = () => {
        window.print();
    };

    const availableTemplates = (settings.textTemplates || []).filter(t => 
        t.category === 'all' || t.category === 'quotation'
    );

    const selectedTemplate = availableTemplates.find(t => t.id === selectedTemplateId);
    const observationText = selectedTemplate ? selectedTemplate.content : trial.quoteNotes;

    // Calculations
    const treatmentsCount = trial.treatments?.length || 0;
    const basePrice = (trial.quoteIncludeYield ? trial.quotePriceWithYield : trial.quotePriceNoYield) || 0;
    const subtotalEnsayos = basePrice * treatmentsCount;
    const totalExtra = (trial.quoteLogistics || 0) + (trial.quoteOtherExpenses || 0);
    const totalFinal = subtotalEnsayos + totalExtra;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden">

                {/* Header / Actions (Not printed) */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="font-bold text-slate-800">Vista Previa de Cotización</h2>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cerrar
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-shadow shadow-lg flex items-center gap-2"
                        >
                            Imprimir / Guardar PDF
                        </button>
                    </div>
                </div>

                {/* Document Content (The part that gets printed) */}
                <div className="flex-1 overflow-y-auto p-8 md:p-12 print:p-0 bg-slate-100 print:bg-white custom-scrollbar">

                    <div className="bg-white mx-auto w-full max-w-[800px] shadow-sm border border-slate-200 print:border-none print:shadow-none min-h-[1000px] p-10 md:p-16 flex flex-col gap-10 print-area">

                        {/* 1. Header with Logo and Info */}
                        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm">
                                        {settings.company.logoUrl ? (
                                            <img src={settings.company.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                        ) : (
                                            <Sprout className="w-7 h-7 text-green-600" />
                                        )}
                                    </div>
                                    <span className="text-2xl font-black tracking-tighter text-slate-900 uppercase">{settings.company.name}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{settings.company.activity || 'Investigación & Desarrollo'}</p>
                                <div className="mt-4 text-[11px] text-slate-500 space-y-0.5">
                                    <p>{settings.company.address}</p>
                                    <p>{settings.company.email} | {settings.company.phone}</p>
                                    <p>CUIT: {settings.company.cuit}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <h1 className="text-3xl font-black text-slate-900 uppercase">Cotización</h1>
                                <p className="text-sm font-bold text-slate-400 mt-1">Nº QC-{trial.id.substring(0, 8).toUpperCase()}</p>
                                <div className="mt-6 space-y-1">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Fecha de Emisión</p>
                                    <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* 2. Client & Project Info */}
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-slate-400" /> Cliente / Patrocinador
                                </h3>
                                <div className="space-y-1">
                                    <p className="text-lg font-black text-slate-900">{trial.client}</p>
                                    <p className="text-sm text-slate-600">Departamento de Innovación y Ensayos</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-2">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Detalles del Proyecto
                                </h3>
                                <div className="space-y-2">
                                    <p className="text-sm font-bold text-slate-900 leading-tight">{trial.title}</p>
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {trial.location}</p>
                                        <p className="flex items-center gap-2"><Calendar className="w-3 h-3" /> Inicio estimado: {trial.date}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Protocol Snapshot */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-2">
                                <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" /> Alcance del Trabajo
                            </h3>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex flex-wrap gap-x-12 gap-y-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tratamientos</p>
                                    <p className="text-sm font-black text-slate-900">{treatmentsCount} variantes</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Repeticiones</p>
                                    <p className="text-sm font-black text-slate-900">{trial.repetitions || 4} réplicas</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Evaluación de Rinde</p>
                                    <p className="text-sm font-black text-slate-900">{trial.quoteIncludeYield ? 'Incluida' : 'No incluida'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Diseño Experimental</p>
                                    <p className="text-sm font-black text-slate-900 uppercase">{trial.experimentalDesign || 'DBCA'}</p>
                                </div>
                            </div>
                        </div>

                        {/* 4. Financial breakdown table */}
                        <div className="mt-4 flex-1">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b-2 border-slate-900">
                                        <th className="py-4 text-xs font-black text-slate-900 uppercase">Descripción de Servicios</th>
                                        <th className="py-4 text-xs font-black text-slate-900 uppercase text-right">Cantidad</th>
                                        <th className="py-4 text-xs font-black text-slate-900 uppercase text-right">Unitario</th>
                                        <th className="py-4 text-xs font-black text-slate-900 uppercase text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="py-5">
                                            <p className="text-sm font-black text-slate-900">Desarrollo de Ensayo a Campo</p>
                                            <p className="text-xs text-slate-500 mt-1">Ejecución, monitoreo y evaluación {trial.quoteIncludeYield ? 'con reporte de rinde' : 'base'}.</p>
                                        </td>
                                        <td className="py-5 text-sm text-slate-900 text-right font-medium">{treatmentsCount}</td>
                                        <td className="py-5 text-sm text-slate-900 text-right font-medium">{trial.quoteCurrency === 'USD' ? 'USD' : trial.quoteCurrency} ${Number(basePrice || 0).toLocaleString()}</td>
                                        <td className="py-5 text-sm text-slate-900 text-right font-black">{trial.quoteCurrency === 'USD' ? 'USD' : trial.quoteCurrency} ${Number(subtotalEnsayos || 0).toLocaleString()}</td>
                                    </tr>
                                    {(trial.quoteLogistics || 0) > 0 && (
                                        <tr>
                                            <td className="py-5">
                                                <p className="text-sm font-black text-slate-900">Logística y Traslados</p>
                                                <p className="text-xs text-slate-500 mt-1">Movilidad, viáticos y despliegue técnico en zona.</p>
                                            </td>
                                            <td className="py-5 text-sm text-slate-900 text-right font-medium">1</td>
                                            <td className="py-5 text-sm text-slate-900 text-right font-medium">{trial.quoteCurrency === 'USD' ? 'USD' : trial.quoteCurrency} ${Number(trial.quoteLogistics || 0).toLocaleString()}</td>
                                            <td className="py-5 text-sm text-slate-900 text-right font-black">{trial.quoteCurrency === 'USD' ? 'USD' : trial.quoteCurrency} ${Number(trial.quoteLogistics || 0).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    {(trial.quoteOtherExpenses || 0) > 0 && (
                                        <tr>
                                            <td className="py-5">
                                                <p className="text-sm font-black text-slate-900">Gastos Adicionales / Insumos</p>
                                                <p className="text-xs text-slate-500 mt-1">Insumos especiales, equipamiento o servicios externos.</p>
                                            </td>
                                            <td className="py-5 text-sm text-slate-900 text-right font-medium">1</td>
                                            <td className="py-5 text-sm text-slate-900 text-right font-medium">{trial.quoteCurrency === 'USD' ? 'USD' : trial.quoteCurrency} ${Number(trial.quoteOtherExpenses || 0).toLocaleString()}</td>
                                            <td className="py-5 text-sm text-slate-900 text-right font-black">{trial.quoteCurrency === 'USD' ? 'USD' : trial.quoteCurrency} ${Number(trial.quoteOtherExpenses || 0).toLocaleString()}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* 5. Remarks and Notes */}
                        <div className="space-y-4">
                            {/* Template Selector for UI ONLY */}
                            {availableTemplates.length > 0 && (
                                <div className="print:hidden">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest pl-1">Agregar Plantilla de Condiciones</label>
                                    <div className="relative">
                                        <select
                                            value={selectedTemplateId}
                                            onChange={e => setSelectedTemplateId(e.target.value)}
                                            className="w-full pl-3 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 appearance-none focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="">(Notas originales de la orden)</option>
                                            {availableTemplates.map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            )}

                            {(observationText || trial.quoteNotes) && (
                                <div className="bg-amber-50/50 p-6 rounded-xl border border-amber-100 space-y-3 min-h-[80px]">
                                    <h4 className="text-[10px] font-black text-amber-700 uppercase flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5" /> Observaciones y Condiciones
                                    </h4>
                                    <p className="text-xs text-slate-600 leading-relaxed italic">
                                        {observationText ? `"${observationText}"` : "(Sin observaciones)"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 6. Total Summary Section */}
                        <div className="flex justify-end pt-10 border-t-2 border-slate-900">
                            <div className="w-full max-w-[300px] space-y-4">
                                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                    <span>SUBTOTAL SERVICIOS</span>
                                    <span>{trial.quoteCurrency || 'USD'} ${Number(subtotalEnsayos || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-bold text-slate-500">
                                    <span>EXTRAS Y GASTOS</span>
                                    <span>{trial.quoteCurrency || 'USD'} ${Number(totalExtra || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                                    <span className="text-lg font-black text-slate-900">TOTAL FINAL</span>
                                    <span className="text-2xl font-black text-green-700">{trial.quoteCurrency || 'USD'} ${Number(totalFinal || 0).toLocaleString()}</span>
                                </div>
                                <p className="text-[10px] text-right text-slate-400 font-bold uppercase mt-2">Valores expresados en {trial.quoteCurrency === 'ARS' ? 'Pesos Argentinos' : 'Dólares Estadounidenses'}</p>
                            </div>
                        </div>

                        {/* 7. Footer Seal/Signatures Area */}
                        <div className="mt-auto pt-16 grid grid-cols-2 gap-20">
                            <div className="border-t border-slate-300 pt-4 flex flex-col items-center">
                                <div className="w-32 h-12 mb-2 bg-slate-50 flex items-center justify-center text-slate-300 italic text-[10px]">Espacio para sello</div>
                                <p className="text-xs font-bold text-slate-900 uppercase">Ing. Agr. Responsable</p>
                                <p className="text-[11px] text-slate-500">{settings.company.name}</p>
                            </div>
                            <div className="border-t border-slate-300 pt-4 flex flex-col items-center">
                                <div className="w-32 h-12 mb-2 bg-slate-50 flex items-center justify-center text-slate-300 italic text-[10px]">Aceptación de Cliente</div>
                                <p className="text-xs font-bold text-slate-900 uppercase">Firma / Aclaración</p>
                                <p className="text-[11px] text-slate-500">Representante Autorizado</p>
                            </div>
                        </div>

                    </div>
                </div>

                <style dangerouslySetInnerHTML={{
                    __html: `
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-area, .print-area * {
                            visibility: visible;
                        }
                        .print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            margin: 0 !important;
                            padding: 2cm !important;
                            border: none !important;
                            box-shadow: none !important;
                        }
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        .print:hidden, .print-hidden {
                            display: none !important;
                        }
                    }
                ` }} />
            </div>
        </div>
    );
}
