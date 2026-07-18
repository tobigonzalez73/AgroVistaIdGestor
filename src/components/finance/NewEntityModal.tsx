import { useState } from 'react';
import { X, Building2, User, Save, Phone, Mail, MapPin, Hash, Edit2, History, AlertCircle } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAudit } from '../../context/AuditContext';
import { useAuth } from '../../context/UserContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import HistoryModal from '../common/HistoryModal';
import type { EntityType } from '../../types/finance';


interface Props {
    initialType?: EntityType;
    initialSubtype?: 'partner_employee' | 'third_party';
    onClose: () => void;
    onSuccess?: (newEntityId: string) => void;
    editingEntityId?: string;
}

export default function NewEntityModal({ initialType, initialSubtype, onClose, onSuccess, editingEntityId }: Props) {
    const { entities, addEntity, updateEntity } = useFinance();
    const { logAction } = useAudit();
    const { currentUser } = useAuth();
    const editingEntity = editingEntityId ? entities.find(e => e.id === editingEntityId) : null;

    const [isLoading, setIsLoading] = useState(false);
    const [savedEntityId, setSavedEntityId] = useState<string | null>(null);
    const [savedEntityName, setSavedEntityName] = useState<string | null>(null); // success screen
    const [showHistory, setShowHistory] = useState(false);

    const [type, setType] = useState<EntityType>(editingEntity?.type ?? initialType ?? 'client');
    const [cuit, setCuit] = useState(editingEntity?.cuit ?? '');
    const [name, setName] = useState(editingEntity?.name ?? '');
    const [email, setEmail] = useState(editingEntity?.email ?? '');
    const [adminEmail, setAdminEmail] = useState(editingEntity?.adminEmail ?? '');
    const [phone, setPhone] = useState(editingEntity?.phone ?? '');
    const [address, setAddress] = useState(editingEntity?.address ?? '');
    const [ivaCondition, setIvaCondition] = useState(editingEntity?.ivaCondition ?? 'Responsable Inscripto');
    const [locality, setLocality] = useState(editingEntity?.locality ?? '');
    const [province] = useState(editingEntity?.province ?? '');
    const [zipCode, setZipCode] = useState(editingEntity?.zipCode ?? '');
    const [isActive, setIsActive] = useState(editingEntity?.isActive !== false);

    const [afipStatus, setAfipStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');


    const lookupAfip = async (rawCuit: string) => {
        const cleanCuit = rawCuit.replace(/\D/g, '');
        if (cleanCuit.length !== 11) {
            setAfipStatus('idle');
            return;
        }

        setIsLoading(true);
        setAfipStatus('loading');
        try {
            // Using TangoFactura API (Public REST)
            const res = await fetch(`https://afip.tangofactura.com/Rest/GetContribuyente?cuit=${cleanCuit}`);
            if (res.ok) {
                const data = await res.json();
                if (data && data.Nombre) {
                    setName(data.Nombre);
                    setAfipStatus('success');
                    if (data.DomicilioFiscal) {
                        setAddress(data.DomicilioFiscal.Direccion || '');
                        setLocality(data.DomicilioFiscal.Localidad || '');
                        setZipCode(data.DomicilioFiscal.CodPostal || '');
                        // Map province ID or name if possible
                    }
                    if (data.TipoPersona === 'FISICA') {
                        setIvaCondition('Monotributista');
                    } else if (data.TipoPersona === 'JURIDICA') {
                        setIvaCondition('Responsable Inscripto');
                    }
                } else {

                    setAfipStatus('error');
                }
            } else {
                setAfipStatus('error');
            }
        } catch (error) {
            console.error("Error fetching CUIT data:", error);
            setAfipStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCuitChange = (val: string) => {
        const clean = val.replace(/\D/g, '').slice(0, 11);
        setCuit(clean);
        if (clean.length === 11) {
            lookupAfip(clean);
        } else {
            setAfipStatus('idle');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            alert("La Razón Social/Nombre es obligatorio.");
            return;
        }

        setIsLoading(true);
        try {
            // Helper to remove undefined fields (Firebase doesn't like them)
            const cleanEntity = (obj: any) => {
                const cleaned: any = {};
                Object.keys(obj).forEach(key => {
                    if (obj[key] !== undefined) cleaned[key] = obj[key];
                });
                return cleaned;
            };

            if (editingEntityId && editingEntity) {
                const updatedData = cleanEntity({
                    ...editingEntity,
                    type,
                    name: name.trim(),
                    cuit: cuit.trim(),
                    email: email.trim(),
                    adminEmail: adminEmail.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    ivaCondition,
                    locality,
                    province,
                    zipCode,
                    isActive
                });
                await updateEntity(editingEntityId, updatedData);
                logAction({
                    userId: currentUser?.id || 'unknown',
                    userName: currentUser?.name || 'Sistema',
                    action: 'update',
                    module: 'finanzas',
                    entityId: editingEntityId,
                    details: `Editada entidad ${name} (${cuit})`,
                    entityName: name
                });
                onClose();
            } else {
                const newId = doc(collection(db, 'entities')).id;
                const newEntity = cleanEntity({
                    id: newId,
                    type,
                    subtype: initialSubtype,
                    name: name.trim(),
                    cuit: cuit.trim(),
                    email: email.trim(),
                    adminEmail: adminEmail.trim(),
                    phone: phone.trim(),
                    address: address.trim(),
                    ivaCondition,
                    locality,
                    province,
                    zipCode,
                    isActive: true
                });

                await addEntity(newEntity);
                logAction({
                    userId: currentUser?.id || 'unknown',
                    userName: currentUser?.name || 'Sistema',
                    action: 'create',
                    module: 'finanzas',
                    entityId: newId,
                    details: `Creada entidad ${name} (${cuit}) tipo ${type}`,
                    entityName: name
                });
                setSavedEntityId(newId);
                setSavedEntityName(newEntity.name);
            }
        } catch (error) {

            console.error("Critical Save Error:", error);
            alert("Error al guardar en Firebase: " + (error instanceof Error ? error.message : "Desconocido") + "\n\nPor favor, verifica tu conexión o permisos.");
        } finally {

            setIsLoading(false);
        }
    };


    if (savedEntityName) {
        return (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm p-8 flex flex-col items-center gap-5 border border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                        <Save className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">¡Guardado correctamente!</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                            <strong className="text-slate-700 dark:text-slate-200">{savedEntityName}</strong> fue dado de alta y seleccionado en el comprobante.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (onSuccess && savedEntityId) onSuccess(savedEntityId);
                            onClose();
                        }}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-200 dark:shadow-none"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            {editingEntityId ? (
                                <><Edit2 className="w-5 h-5 mr-2 text-indigo-500" /> Editar Entidad</>
                            ) : initialSubtype === 'partner_employee' ? (
                                <><User className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Socio / Empleado</>
                            ) : initialSubtype === 'third_party' ? (
                                <><User className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Tercero</>
                            ) : type === 'client' ? (
                                <><User className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Cliente</>
                            ) : type === 'supplier' ? (
                                <><Building2 className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Proveedor</>
                            ) : (
                                <><User className="w-5 h-5 mr-2 text-indigo-500" /> Nuevo Contacto (Mixto)</>
                            )}
                        </h2>
                        {editingEntityId && (
                            <button
                                type="button"
                                onClick={() => setShowHistory(true)}
                                className="flex items-center px-3 py-1 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 rounded-lg transition-colors hover:border-indigo-200"
                            >
                                <History className="w-3.5 h-3.5 mr-1.5" />
                                Historial
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto w-full">
                    <form id="new-entity-form" onSubmit={handleSubmit} className="space-y-5">

                        {!initialSubtype && (
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => setType('client')}
                                    className={`flex-1 flex justify-center items-center py-2 rounded-md font-medium text-sm transition-colors ${type === 'client' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <User className="w-4 h-4 mr-2" /> Cliente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('supplier')}
                                    className={`flex-1 flex justify-center items-center py-2 rounded-md font-medium text-sm transition-colors ${type === 'supplier' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <Building2 className="w-4 h-4 mr-2" /> Proveedor
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('both')}
                                    className={`flex-1 flex justify-center items-center py-2 rounded-md font-medium text-sm transition-colors ${type === 'both' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    <User className="w-4 h-4 mr-1" />/<Building2 className="w-4 h-4 ml-1 mr-2" /> Ambos
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2 relative">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex justify-between">
                                    <span>CUIT / DNI</span>
                                    {afipStatus === 'loading' && <span className="text-xs text-indigo-500 animate-pulse">Buscando en AFIP...</span>}
                                    {afipStatus === 'success' && <span className="text-xs text-emerald-500 font-semibold flex items-center">✓ Datos recuperados de AFIP</span>}
                                    {afipStatus === 'error' && <span className="text-xs text-amber-500 font-medium animate-pulse">! No se encontraron datos automáticos</span>}
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Hash className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <input
                                        type="text"
                                        value={cuit}
                                        onChange={e => handleCuitChange(e.target.value)}
                                        className={`w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold transition-colors ${
                                            afipStatus === 'success' ? 'border-emerald-500 dark:border-emerald-500/50' : 
                                            afipStatus === 'error' ? 'border-amber-300 dark:border-amber-700' :
                                            'border-slate-300 dark:border-slate-600'
                                        }`}
                                        placeholder="Ingrese los 11 dígitos para autocompletar..."
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1 font-medium">Al completar los 11 dígitos se recupera la Razón Social y Domicilio automáticamente.</p>
                            </div>


                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Razón Social o Nombre Completo *</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-black" placeholder="Nombre comercial..." />
                            </div>


                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                    <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" /> Teléfono
                                </label>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" placeholder="Ejem: +54 9 11..." />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                    <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" /> Domicilio Fiscal
                                </label>
                                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" placeholder="Calle, Número, Piso/Depto" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Localidad / C.P.</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="text" value={locality} onChange={e => setLocality(e.target.value)} placeholder="Ciudad" className="w-full px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold text-sm" />
                                    <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="C.P." className="w-full px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Condición de IVA / Fiscal</label>
                                <select 
                                    value={ivaCondition} 
                                    onChange={e => setIvaCondition(e.target.value)}
                                    className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold"
                                >
                                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                                    <option value="Monotributista">Monotributista</option>
                                    <option value="Exento">Exento</option>
                                    <option value="Consumidor Final">Consumidor Final</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                    <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" /> Correo Contacto Principal
                                </label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" placeholder="ejemplo@empresa.com" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center">
                                    <Mail className="w-3.5 h-3.5 mr-1 text-slate-400" /> Correo Administración (Pagos)
                                </label>
                                <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-950 dark:text-slate-100 font-bold" placeholder="administracion@empresa.com" />
                            </div>

                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex flex-wrap justify-between items-center gap-3 rounded-b-2xl">
                    <div className="flex items-center">
                        {editingEntityId && (
                            <button
                                type="button"
                                onClick={() => setIsActive(!isActive)}
                                className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-2 ${
                                    isActive 
                                    ? 'text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/30 dark:hover:bg-red-900/20' 
                                    : 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:border-emerald-900/30 dark:bg-emerald-900/20'
                                }`}
                            >
                                <AlertCircle className="w-4 h-4" />
                                {isActive ? 'Dar de Baja (Desactivar)' : 'Reactivar Contacto'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" form="new-entity-form" disabled={isLoading} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center disabled:opacity-70">
                            <Save className="w-4 h-4 mr-2" />
                            {editingEntityId ? 'Guardar Cambios' : 'Guardar Entidad'}
                        </button>
                    </div>
                </div>
            </div>

            {showHistory && editingEntityId && (
                <HistoryModal
                    isOpen={showHistory}
                    entityId={editingEntityId}
                    onClose={() => setShowHistory(false)}
                    entityTitle={`Historial de ${name}`}
                />
            )}
        </div>
    );
}
