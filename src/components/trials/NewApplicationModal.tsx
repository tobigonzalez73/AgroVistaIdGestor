import React, { useState, useMemo } from 'react';
import { X, Save, AlertTriangle, Calendar as CalendarIcon, MapPin, TestTube2, Layers, Plus, Trash2, Star, ChevronDown, History } from 'lucide-react';
import { SENASA_VADEMECUM } from '../../data/vademecum';
import HistoryModal from '../common/HistoryModal';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/UserContext';
import { useAudit } from '../../context/AuditContext';
import { useNotifications } from '../../context/NotificationContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import type { ApplicationTask, Product, Trial } from '../../types/trial';

interface Props {
    onClose: () => void;
    editingApplicationId?: string;
}

export default function NewApplicationModal({ onClose, editingApplicationId }: Props) {
    const { trials, setApplications, applications, customProducts, addCustomProduct } = useAppContext();
    const { users, currentUser } = useAuth();
    const { logAction } = useAudit();
    const { addNotification } = useNotifications();
    const [type, setType] = useState<'general' | 'ensayo'>('general');
    const [trialId, setTrialId] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [condition, setCondition] = useState('');
    const [responsibleEmails, setResponsibleEmails] = useState<string[]>([]);
    const [leaderEmail, setLeaderEmail] = useState<string>('');
    const [tempEmail, setTempEmail] = useState('');
    const [notes, setNotes] = useState('');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    const [products, setProducts] = useState<Product[]>([{ id: doc(collection(db, 'application_products')).id, product: '', activeIngredient: '', family: '', dose: '', unit: 'L/ha' }]);

    // Load data if editing
    React.useEffect(() => {
        if (editingApplicationId) {
            const app = applications.find(a => a.id === editingApplicationId);
            if (app) {
                setType(app.type);
                setTrialId(app.trialId || '');
                setLocation(app.location || '');
                setDate(app.date || '');
                setCondition(app.condition || '');
                setResponsibleEmails(app.responsibleEmails || []);
                setLeaderEmail(app.leaderEmail || '');
                setNotes(app.notes || '');
                if (app.products && app.products.length > 0) {
                    setProducts(app.products);
                }
            }
        }
    }, [editingApplicationId, applications]);

    // Get unique locations from existing trials for the dropdown
    const activeLocations = Array.from(new Set(trials.filter((t: Trial) => t.status !== 'completado').map((t: Trial) => t.location))).filter(Boolean);

    const handleProductChange = (index: number, field: keyof Product, value: string) => {
        setProducts(prev => {
            const newProducts = [...prev];
            let updatedProd = { ...newProducts[index], [field]: value };

            // Autocompletion logic for SENASA + Custom Vademecum
            if (field === 'product' && typeof value === 'string') {
                const allVademecum = [...SENASA_VADEMECUM, ...customProducts];
                const matchedProduct = allVademecum.find(vp => vp.name.toLowerCase() === value.toLowerCase());
                if (matchedProduct) {
                    updatedProd.activeIngredient = matchedProduct.activeIngredient;
                    updatedProd.family = matchedProduct.family as any;
                }
            }

            newProducts[index] = updatedProd;
            return newProducts;
        });
    };

    const handleAddProduct = () => {
        setProducts(prev => [...prev, { id: doc(collection(db, 'application_products')).id, product: '', activeIngredient: '', family: '', dose: '', unit: 'L/ha' }]);
    };

    const handleRemoveProduct = (index: number) => {
        setProducts(prev => prev.filter((_, i) => i !== index));
    };

    const handleRemoveResponsible = (email: string) => {
        setResponsibleEmails(prev => prev.filter(e => e !== email));
        if (leaderEmail === email) setLeaderEmail('');
    };

    const overlapWarning = useMemo(() => {
        if (type !== 'general' || !location) return null;

        const applicationFamilies = new Set(products.map(p => p.family).filter(f => f && f !== 'Otro' && f !== 'Coadyuvante'));

        if (applicationFamilies.size === 0) return null;

        // Find trials in the SAME location that are active
        const trialsInLocation = trials.filter((t: Trial) => t.location === location && t.status !== 'completado');

        for (const trial of trialsInLocation) {
            if (!trial.treatments) continue;
            for (const treatment of trial.treatments) {
                for (const trialProd of treatment.products) {
                    if (trialProd.family && applicationFamilies.has(trialProd.family)) {
                        return `Atención: En la ubicación "${location}" ya existe el ensayo "${trial.title}" que incluye un tratamiento con un producto de la misma familia ("${trialProd.family}"). Aplicar esto de forma general podría ensuciar el ensayo.`;
                    }
                }
            }
        }
        return null;
    }, [type, location, products, trials]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const finalId = editingApplicationId || doc(collection(db, 'applications')).id;
        const newApp: ApplicationTask = {
            id: finalId,
            type,
            trialId: type === 'ensayo' ? trialId : undefined,
            location: type === 'ensayo' ? (trials.find((t: Trial) => t.id === trialId)?.location || '') : location,
            date,
            condition,
            status: editingApplicationId ? (applications.find(a => a.id === editingApplicationId)?.status || 'pendiente') : 'pendiente',
            responsibleEmails: responsibleEmails,
            leaderEmail: leaderEmail || undefined,
            notes,
            observations: notes,
            createdAt: editingApplicationId 
                ? (applications.find(a => a.id === editingApplicationId)?.createdAt || new Date().toISOString()) 
                : new Date().toISOString(),
            approvals: editingApplicationId 
                ? (applications.find(a => a.id === editingApplicationId)?.approvals)
                : users
                    .filter(u => u.isActive && (u.modules || []).includes('aplicaciones'))
                    .map(u => ({ userId: u.id, status: 'pending' as const })),
            products: products.map(p => ({ ...p, id: p.id || doc(collection(db, 'application_products')).id }))
        };


        if (editingApplicationId) {
            setApplications((prev: ApplicationTask[]) => prev.map(app => app.id === editingApplicationId ? newApp : app));
        } else {
            setApplications((prev: ApplicationTask[]) => [newApp, ...prev]);
        }

        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: editingApplicationId ? 'update' : 'create',
            module: 'aplicaciones',
            entityId: finalId,
            entityName: condition || (type === 'ensayo' ? 'Labor de ensayo' : 'Aplicación general'),
            details: `${editingApplicationId ? 'Actualización' : 'Nueva'} ${type === 'ensayo' ? 'labor de ensayo' : 'aplicación general'} programada para ${date}`,
        });

        // Save new products to custom vademecum
        const allVademecum = [...SENASA_VADEMECUM, ...customProducts];
        products.forEach(p => {
            if (p.product && !allVademecum.find(vp => vp.name.toLowerCase() === p.product.toLowerCase())) {
                addCustomProduct({
                    id: doc(collection(db, 'custom_products')).id,
                    name: p.product,
                    activeIngredient: p.activeIngredient || '',
                    family: p.family || '',
                    company: 'Custom'
                });
            }
        });

        // Notifications
        const authorizers = users.filter(u => u.isActive && (u.modules || []).includes('aplicaciones'));
        
        // To requester
        addNotification({
            userId: currentUser.id,
            title: 'Labor Programada',
            message: `Has programado una nueva labor para el ${date}. Se ha enviado el pedido de autorización.`,
            type: 'success',
            link: '/aplicaciones'
        });

        if (!editingApplicationId) {
            // To authorizers
            authorizers.forEach(auth => {
                addNotification({
                    userId: auth.id,
                    title: 'Autorización de Labor Requerida',
                    message: `${currentUser?.name || currentUser?.email || 'Usuario'} ha programado una nueva labor "${condition || 'Aplicación'}" para el ${date}.`,
                    type: 'approval',
                    link: '/aplicaciones'
                });
            });
        }

        onClose();
    };


    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                            {editingApplicationId ? 'Editar Labor / Aplicación' : 'Programar Nueva Labor / Aplicación'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            type="button"
                            onClick={() => setIsHistoryOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Ver historial"
                        >
                            <History className="w-5 h-5" />
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
                    <form id="new-app-form" onSubmit={handleSubmit} className="space-y-6">

                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Tipo de Aplicación</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="appType" value="general" checked={type === 'general'} onChange={() => setType('general')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Aplicación General de Lote</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="appType" value="ensayo" checked={type === 'ensayo'} onChange={() => setType('ensayo')} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Manejo Específico de Ensayo</span>
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {type === 'ensayo' ? (
                                <div>
                                    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        <TestTube2 className="w-4 h-4 mr-1.5 text-slate-400" /> Ensayo Destino *
                                    </label>
                                    <select required value={trialId} onChange={e => setTrialId(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                        <option value="">Seleccione un ensayo...</option>
                                        {trials.filter((t: Trial) => t.status !== 'completado').map((t: Trial) => (
                                            <option key={t.id} value={t.id}>{t.title} ({t.location})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        <MapPin className="w-4 h-4 mr-1.5 text-slate-400" /> Ubicación (Lote/Invernáculo) *
                                    </label>
                                    <select required value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500">
                                        <option value="">Seleccione o escriba...</option>
                                        {activeLocations.map(loc => (
                                            <option key={loc as string} value={loc as string}>{loc as string}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    <CalendarIcon className="w-4 h-4 mr-1.5 text-slate-400" /> Fecha Planificada *
                                </label>
                                <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Estadio Fenológico o Condición *</label>
                                <input required type="text" value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Ej: Z39, V6, Presiembra" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Responsables de la Labor</label>

                                {responsibleEmails.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3 px-3 py-2 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                                        {responsibleEmails.map(email => (
                                            <div
                                                key={email}
                                                className={`flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border rounded-md text-xs font-medium transition-all cursor-pointer ${leaderEmail === email ? 'border-amber-400 shadow-sm ring-1 ring-amber-400/20' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}
                                                onClick={() => setLeaderEmail(email)}
                                                title={leaderEmail === email ? "Líder Asignado" : "Click para marcar como Líder"}
                                            >
                                                {leaderEmail === email && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                                                <span className={`${leaderEmail === email ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>{email}</span>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveResponsible(email); }}
                                                    className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
                                    <div className="relative">
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val && !responsibleEmails.includes(val)) {
                                                    if (val === 'manual') setTempEmail('');
                                                    else setResponsibleEmails(prev => [...prev, val]);
                                                }
                                            }}
                                            className="w-full px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 appearance-none pr-10 hover:border-emerald-400 transition-colors"
                                        >
                                            <option value="">+ Agregar responsable...</option>
                                            {users.filter(u => u.email && !responsibleEmails.includes(u.email)).map(u => (
                                                <option key={u.id} value={u.email}>{u.name} ({u.email})</option>
                                            ))}
                                            <option value="manual">+ Otro (Ingresar manual)</option>
                                        </select>
                                        <ChevronDown className="w-5 h-5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={tempEmail}
                                            onChange={e => setTempEmail(e.target.value)}
                                            className="flex-1 px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                            placeholder="correo@ejemplo.com"
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && tempEmail) {
                                                    e.preventDefault();
                                                    if (!responsibleEmails.includes(tempEmail)) {
                                                        setResponsibleEmails(prev => [...prev, tempEmail]);
                                                        setTempEmail('');
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (tempEmail && !responsibleEmails.includes(tempEmail)) {
                                                    setResponsibleEmails(prev => [...prev, tempEmail]);
                                                    setTempEmail('');
                                                }
                                            }}
                                            className="px-3 py-2 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-800 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>
                            </div>



                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Indicaciones u Observaciones (Opcional)</label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 bg-white text-slate-950 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 placeholder-slate-400"
                                    placeholder="Ej: Mezclar primero el coadyuvante, aplicar con calma..."
                                    rows={3}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4 mt-6">
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center">
                                    <Layers className="w-5 h-5 mr-2 text-emerald-500" />
                                    Mezcla de Tanque
                                </h3>
                                <button type="button" onClick={handleAddProduct} className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-semibold flex items-center">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Agregar Producto
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="hidden md:grid grid-cols-12 gap-3 px-2 pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <div className="col-span-4">Producto Comercial *</div>
                                    <div className="col-span-3">Familia *</div>
                                    <div className="col-span-2 text-center">Dosis *</div>
                                    <div className="col-span-2">Unidad</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {products.map((p, index) => (
                                    <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3 md:p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="col-span-1 md:col-span-4">
                                            <input 
                                                required 
                                                type="text" 
                                                list="common-products"
                                                value={p.product} 
                                                onChange={e => handleProductChange(index, 'product', e.target.value)} 
                                                placeholder="Agroquímico o Fertilizante" 
                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium" 
                                            />
                                        </div>
                                        <div className="col-span-1 md:col-span-3">
                                            <select 
                                                required 
                                                value={p.family || ''} 
                                                onChange={e => handleProductChange(index, 'family', e.target.value)} 
                                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 dark:text-slate-100 font-medium"
                                            >
                                                <option value="" disabled>Seleccione...</option>
                                                <optgroup label="Protección de Cultivos">
                                                    <option value="Herbicida">🌿 Herbicida</option>
                                                    <option value="Insecticida">🐜 Insecticida</option>
                                                    <option value="Fungicida">🍄 Fungicida</option>
                                                    <option value="Acaricida">🕷️ Acaricida</option>
                                                    <option value="Nematicida">🐛 Nematicida</option>
                                                    <option value="Desecante">🍂 Desecante / Defol.</option>
                                                </optgroup>
                                                <optgroup label="Nutrición y Bioestimulación">
                                                    <option value="Fertilizante">🪴 Fertilizante Suelo</option>
                                                    <option value="Fertilizante Foliar">💧 Fert. Foliar</option>
                                                    <option value="Bioestimulante">⚡ Bioestimulante</option>
                                                    <option value="Inoculante">🧪 Inoculante</option>
                                                    <option value="Enmienda">🧱 Enmienda</option>
                                                </optgroup>
                                                <optgroup label="Otros Insumos">
                                                    <option value="Semilla">🌾 Semilla</option>
                                                    <option value="Tratamiento Semilla">💊 Curasemilla</option>
                                                    <option value="Fitorregulador">🧪 Hormona/Regulad.</option>
                                                    <option value="Coadyuvante">🧼 Coadyuvante</option>
                                                    <option value="Atrayente">🎯 Atrayente/Repelente</option>
                                                    <option value="Otro">➕ Otro</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <input required type="number" step="0.01" min="0" value={p.dose} onChange={e => handleProductChange(index, 'dose', e.target.value)} placeholder="0.0" className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500 text-sm text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500" />
                                        </div>
                                        <div className="col-span-1 md:col-span-2">
                                            <select required value={p.unit} onChange={e => handleProductChange(index, 'unit', e.target.value)} className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-emerald-500 text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase">
                                                <option value="cc/100 L">cc/100 L</option>
                                                <option value="L/100 L">L/100 L</option>
                                                <option value="g/100 L">g/100 L</option>
                                                <option value="kg/100 L">kg/100 L</option>
                                                <option value="L/ha">L/ha</option>
                                                <option value="Kg/ha">Kg/ha</option>
                                                <option value="g/ha">g/ha</option>
                                                <option value="cc/tn">cc/tn</option>
                                                <option value="g/tn">g/tn</option>
                                                <option value="Kg/tn">Kg/tn</option>
                                                <option value="Pills/ha">Pills/ha</option>
                                                <option value="% v/v">% v/v</option>
                                            </select>
                                        </div>
                                        <div className="col-span-1 flex justify-center mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-700">
                                            {products.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveProduct(index)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md transition-colors w-full md:w-auto flex justify-center items-center">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {overlapWarning && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start">
                                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 mr-3 shrink-0" />
                                <div>
                                    <h4 className="text-red-800 dark:text-red-400 font-bold mb-1">Advertencia de Solapamiento</h4>
                                    <p className="text-sm text-red-700 dark:text-red-300 mb-0">{overlapWarning}</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <button type="button" onClick={onClose} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white transition-colors">
                                Cancelar
                            </button>
                            <button type="submit" form="new-app-form" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center">
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Aplicación
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <HistoryModal 
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
                entityId={editingApplicationId || 'new-app'}
                entityTitle={condition || (editingApplicationId ? 'Labor Existente' : 'Nueva Labor (En creación)')}
            />

            {/* Vademecum Datalist */}
            <datalist id="common-products">
                {[...SENASA_VADEMECUM, ...customProducts].map((p, idx) => (
                    <option key={`${p.id}-${idx}`} value={p.name}>
                        {p.id.startsWith('CUSTOM-') ? '👤 Guardado' : p.id} - {p.activeIngredient} - {p.company}
                    </option>
                ))}
            </datalist>
        </div>
    );
}
