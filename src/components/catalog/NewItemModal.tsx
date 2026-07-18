import { X, Save, Search, Plus } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useInventory } from '../../context/InventoryContext';
import { useAudit } from '../../context/AuditContext';
import { useAuth } from '../../context/UserContext';
import type { CatalogItem, ItemFamily, MeasurementUnit } from '../../types/inventory';
import vademecumData from '../../data/vademecum.json';

interface VademecumProduct {
    name: string;
    brand: string;
    activeIngredient: string;
    family: string;
    unit: string;
    vat: number;
    defaultDose: string;
}

interface NewItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialType?: 'Product' | 'Service';
    onSuccess?: (item: CatalogItem) => void;
}

export default function NewItemModal({ isOpen, onClose, initialType = 'Product', onSuccess }: NewItemModalProps) {
    const { addProduct, customVademecum } = useInventory();
    const { logAction } = useAudit();
    const { currentUser } = useAuth();

    const agrochemicalFamilies: ItemFamily[] = [
        'Herbicida', 'Fungicida', 'Insecticida', 'Bioestimulante', 'Coadyuvante', 'Fertilizante', 'Biológico'
    ];

    const categories: ItemFamily[] = [
        ...agrochemicalFamilies,
        'Semilla', 'Ferretería', 'Riego', 'Otro'
    ];

    // New Item Form State
    const [newItem, setNewItem] = useState<Partial<CatalogItem>>({
        itemType: initialType,
        family: initialType === 'Product' ? 'Herbicida' : 'Servicio',
        unit: 'L',
        vatPercentage: 10.5,
        trackStock: initialType === 'Product',
        stockLevel: 0
    });

    const [vademecumSearch, setVademecumSearch] = useState('');
    const [showVademecumResults, setShowVademecumResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const filteredVademecum = [...vademecumData, ...customVademecum].filter(p =>
        p.name.toLowerCase().includes(vademecumSearch.toLowerCase()) ||
        p.activeIngredient.toLowerCase().includes(vademecumSearch.toLowerCase())
    ).slice(0, 5);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowVademecumResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Auto-generate code when family or type changes
    useEffect(() => {
        if (!newItem.code || newItem.code.startsWith('AUTO-') || (newItem.itemType === 'Service' && !newItem.code.startsWith('SRV-'))) {
            const prefix = newItem.itemType === 'Service' ? 'SRV' : (newItem.family?.substring(0, 3).toUpperCase() || 'ITM');
            const random = Math.floor(1000 + Math.random() * 9000);
            setNewItem(prev => ({ ...prev, code: `${prefix}-${random}` }));
        }

        // Logic for default VAT
        if (newItem.itemType === 'Product') {
            const isAgrochemical = agrochemicalFamilies.includes(newItem.family as ItemFamily) && newItem.family !== 'Fertilizante';
            setNewItem(prev => ({ ...prev, vatPercentage: isAgrochemical ? 21 : 10.5 }));
        } else {
            setNewItem(prev => ({ ...prev, vatPercentage: 21 }));
        }
    }, [newItem.family, newItem.itemType]);

    const handleSelectVademecum = (prod: VademecumProduct) => {
        setNewItem({
            ...newItem,
            name: prod.name,
            company: prod.brand,
            activeIngredient: prod.activeIngredient,
            family: prod.family as ItemFamily,
            unit: prod.unit as MeasurementUnit,
            vatPercentage: prod.vat,
            defaultDose: prod.defaultDose
        });
        setVademecumSearch(prod.name);
        setShowVademecumResults(false);
    };

    const handleSave = () => {
        if (!newItem.code || !newItem.name) {
            alert("Por favor complete código y nombre");
            return;
        }

        const item: CatalogItem = {
            id: Math.random().toString(36).substr(2, 9),
            code: newItem.code,
            name: newItem.name,
            itemType: newItem.itemType as any,
            family: newItem.itemType === 'Service' ? 'Servicio' : newItem.family,
            vatPercentage: newItem.vatPercentage || 0,
            unit: (newItem.unit as MeasurementUnit) || 'un',
            trackStock: newItem.trackStock || false,
            stockLevel: newItem.stockLevel || 0,
            activeIngredient: newItem.activeIngredient,
            company: newItem.company,
            defaultDose: newItem.defaultDose,
            observations: newItem.observations
        };

        addProduct(item);

        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: 'create',
            module: 'catalogos',
            entityId: item.id,
            entityName: item.name,
            details: `Se registró un nuevo ${item.itemType === 'Product' ? 'producto' : 'servicio'} en el catálogo: ${item.name} (${item.code})`
        });

        if (onSuccess) onSuccess(item);
        onClose();
        // Reset local state if needed between opens, though usually it unmounts
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Registrar en Catálogo</h2>
                        <p className="text-sm text-slate-500 font-medium">Define productos maestro o servicios para la empresa.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                    {/* Type Toggle */}
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit">
                        <button
                            onClick={() => setNewItem({ ...newItem, itemType: 'Product', family: 'Herbicida', trackStock: true })}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${newItem.itemType === 'Product' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Producto
                        </button>
                        <button
                            onClick={() => setNewItem({ ...newItem, itemType: 'Service', family: 'Servicio', trackStock: false, activeIngredient: '', company: '', defaultDose: '' })}
                            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${newItem.itemType === 'Service' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            Servicio
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-1">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Código Maestro</label>
                            <input
                                type="text"
                                placeholder="Generado automáticamente..."
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-mono font-bold text-slate-500 dark:text-slate-400 cursor-not-allowed"
                                value={newItem.code || ''}
                                readOnly
                            />
                        </div>
                        <div className="col-span-1 relative" ref={searchRef}>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                                <span>Nombre Comercial</span>
                                {newItem.itemType === 'Product' && (
                                    <span className="text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full flex items-center gap-1 font-black leading-none">
                                        <Search className="w-2.5 h-2.5" /> VADEMECUM
                                    </span>
                                )}
                            </label>
                            <input
                                type="text"
                                placeholder={newItem.itemType === 'Product' ? "Buscar en Vademecum o escribir..." : "Nombre del servicio"}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                value={newItem.itemType === 'Product' ? vademecumSearch || newItem.name || '' : newItem.name || ''}
                                onChange={(e) => {
                                    if (newItem.itemType === 'Product') {
                                        setVademecumSearch(e.target.value);
                                        setNewItem({ ...newItem, name: e.target.value });
                                        setShowVademecumResults(true);
                                    } else {
                                        setNewItem({ ...newItem, name: e.target.value });
                                    }
                                }}
                                onFocus={() => newItem.itemType === 'Product' && setShowVademecumResults(true)}
                            />

                            {showVademecumResults && newItem.itemType === 'Product' && filteredVademecum.length > 0 && (
                                <div className="absolute z-[120] left-0 right-0 top-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="p-2 bg-slate-50 dark:bg-slate-900/50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-700">
                                        Resultados Vademecum CASAFE
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {filteredVademecum.map((prod, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectVademecum(prod)}
                                                className="w-full text-left p-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-between group border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                            >
                                                <div className="flex-1">
                                                    <div className="font-black text-slate-800 dark:text-slate-100">{prod.name}</div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">{prod.brand}</span>
                                                        <span className="text-[10px] text-slate-300">•</span>
                                                        <span className="text-[10px] font-medium text-slate-500 truncate max-w-[150px]">{prod.activeIngredient}</span>
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-800 transition-colors">
                                                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="p-2 bg-indigo-50/50 dark:bg-indigo-900/10 text-[9px] text-indigo-600 dark:text-indigo-400 text-center font-bold">
                                        💡 Los productos nuevos/experimentales deben cargarse manualmente.
                                    </div>
                                </div>
                            )}
                        </div>

                        {newItem.itemType === 'Product' && (
                            <div className="col-span-2 grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Familia / Categoría</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                        value={newItem.family || 'Herbicida'}
                                        onChange={(e) => setNewItem({ ...newItem, family: e.target.value as ItemFamily })}
                                    >
                                        {categories.filter(c => c !== 'Servicio').map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Unidad de Medida</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                        value={newItem.unit || 'L'}
                                        onChange={(e) => setNewItem({ ...newItem, unit: e.target.value as MeasurementUnit })}
                                    >
                                        <option value="L">Litros (L)</option>
                                        <option value="kg">Kilogramos (kg)</option>
                                        <option value="un">Unidades (un)</option>
                                        <option value="m">Metros (m)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="col-span-1">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">% IVA (Compras/Ventas)</label>
                            <select
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                value={newItem.vatPercentage}
                                onChange={(e) => setNewItem({ ...newItem, vatPercentage: parseFloat(e.target.value) })}
                            >
                                <option value={21}>21% (General / Agroquímicos)</option>
                                <option value={10.5}>10.5% (Fertilizantes / Capital)</option>
                                <option value={27}>27% (Servicios Públicos)</option>
                                <option value={0}>0% (Exento)</option>
                            </select>
                        </div>

                        {newItem.itemType === 'Product' && agrochemicalFamilies.includes(newItem.family as ItemFamily) && (
                            <>
                                <div className="col-span-1 animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Principio Activo</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                        value={newItem.activeIngredient || ''}
                                        onChange={(e) => setNewItem({ ...newItem, activeIngredient: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1 animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Laboratorio / Empresa</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                        value={newItem.company || ''}
                                        onChange={(e) => setNewItem({ ...newItem, company: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {newItem.itemType === 'Product' && (
                            <>
                                <div className="col-span-1 animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Dosis de Uso</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                        placeholder="Ej: 2 L/ha"
                                        value={newItem.defaultDose || ''}
                                        onChange={(e) => setNewItem({ ...newItem, defaultDose: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1 animate-in slide-in-from-top-2">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Observaciones</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                                        placeholder="Notas adicionales..."
                                        value={newItem.observations || ''}
                                        onChange={(e) => setNewItem({ ...newItem, observations: e.target.value })}
                                    />
                                </div>
                            </>
                        )}

                        {newItem.itemType === 'Product' && (
                            <div className="col-span-2 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">Control de Stock</h4>
                                        <p className="text-xs text-slate-500 font-medium">Llevar trazabilidad de cantidades físicas.</p>
                                    </div>
                                    <div
                                        onClick={() => setNewItem({ ...newItem, trackStock: !newItem.trackStock })}
                                        className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-all ${newItem.trackStock ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${newItem.trackStock ? 'translate-x-6' : 'translate-x-0'}`} />
                                    </div>
                                </div>
                                {newItem.trackStock && (
                                    <div className="mt-4 animate-in zoom-in-95 duration-200">
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Stock Inicial</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                className="w-32 px-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 focus:border-indigo-500 rounded-2xl outline-none font-black text-slate-900 dark:text-slate-100"
                                                value={newItem.stockLevel || 0}
                                                onChange={(e) => setNewItem({ ...newItem, stockLevel: parseFloat(e.target.value) })}
                                            />
                                            <span className="text-sm font-bold text-slate-500">{newItem.unit}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center px-10 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95"
                    >
                        <Save className="w-5 h-5 mr-2" />
                        Guardar Item
                    </button>
                </div>
            </div>
        </div>
    );
}
