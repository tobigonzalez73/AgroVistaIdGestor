import { Plus, Search, Filter, PackageOpen, List, Box, Droplets, Hammer, Wrench, Settings, Bug, Sprout, FlaskConical, Beaker, ShieldAlert, Wheat, Edit2, Database, History, MessageCircle } from 'lucide-react';
import HistoryModal from '../components/common/HistoryModal';
import SidebarChat from '../components/chat/SidebarChat';
import { useRef } from 'react';
import { useState } from 'react';
import { useInventory } from '../context/InventoryContext';
import NewItemModal from '../components/catalog/NewItemModal';

export default function ProductCatalog() {
    const { products, inventory, returnProductToStock, updateVademecum } = useInventory();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'catalog' | 'inventory'>('catalog');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // History Modal State
    const [historyConfig, setHistoryConfig] = useState<{ isOpen: boolean; entityId: string; entityTitle: string }>({
        isOpen: false,
        entityId: '',
        entityTitle: ''
    });

    const [chatConfig, setChatConfig] = useState<{ isOpen: boolean; entityId: string; entityTitle: string }>({
        isOpen: false,
        entityId: '',
        entityTitle: ''
    });

    const filteredItems = products.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.activeIngredient?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            if (!text) return;

            const rows = text.split('\n').filter(r => r.trim());
            if (rows.length < 1) return;

            // Detect delimiter: SENASA exports often use ; in Spanish locales
            const firstRow = rows[0];
            const delimiter = firstRow.includes(';') ? ';' : ',';
            const clean = (v: string) => v.replace(/^"|"$/g, '').trim();

            const headers = firstRow.split(delimiter).map(h => clean(h).toLowerCase());
            const hasActualHeaders = headers.some(h => h.includes('marca') || h.includes('producto') || h.includes('activo'));

            const newItems = rows.slice(hasActualHeaders ? 1 : 0).map(row => {
                const rawValues = row.split(delimiter);
                const values = rawValues.map(v => clean(v));
                const item: any = {};

                if (hasActualHeaders) {
                    headers.forEach((h, i) => {
                        if (h.includes('marca') || h.includes('producto')) item.name = values[i];
                        if (h.includes('empresa') || h.includes('laboratorio')) item.brand = values[i];
                        if (h.includes('activo')) item.activeIngredient = values[i];
                    });
                } else {
                    // SENASA Standard Export Mapping (from user's example):
                    // [0] Reg, [1] Nombre (Marca), [2] Empresa, [3] Activo, [4] Banda
                    item.name = values[1];
                    item.brand = values[2];
                    item.activeIngredient = values[3];
                }

                // If name is empty, try the registry number in col 0
                if (!item.name && values[0]) item.name = values[0];

                // Auto-family detection based on active ingredient or manual keywords
                const ai = (item.activeIngredient || '').toLowerCase();
                const name = (item.name || '').toLowerCase();

                if (ai.includes('clorantra') || ai.includes('insecti') || ai.includes('bifentrin') || ai.includes('lambda') || ai.includes('cyper')) {
                    item.family = 'Insecticida';
                } else if (ai.includes('glifo') || ai.includes('2,4-d') || ai.includes('atrazi') || ai.includes('herbi') || ai.includes('fomesafen')) {
                    item.family = 'Herbicida';
                } else if (ai.includes('azoxi') || ai.includes('fungi') || ai.includes('ciproco') || ai.includes('protioconazol')) {
                    item.family = 'Fungicida';
                } else if (ai.includes('aceite') || name.includes('rizospray') || ai.includes('silicona') || ai.includes('coadyuvante')) {
                    item.family = 'Coadyuvante';
                } else if (name.includes('estimulante') || ai.includes('aminoacid')) {
                    item.family = 'Bioestimulante';
                } else if (name.includes('fertilizante') || ai.includes('fosforo') || ai.includes('nitrogeno') || ai.includes('potasio')) {
                    item.family = 'Fertilizante';
                } else {
                    item.family = 'Otro';
                }

                item.unit = (item.name?.toLowerCase().includes('kg') || item.name?.toLowerCase().includes('gr')) ? 'kg' : 'L';

                // VAT per Rule: Agro 21%, Fertilizer 10.5%
                const agroFamilies = ['Herbicida', 'Fungicida', 'Insecticida', 'Bioestimulante', 'Coadyuvante'];
                item.vat = agroFamilies.includes(item.family) ? 21 : 10.5;

                return item;
            }).filter(item => item.name && item.name.length > 2 && !item.name.toLowerCase().includes('marca'));

            if (newItems.length > 0) {
                updateVademecum(newItems);
                alert(`¡Vademécum Sincronizado! Se han procesado ${newItems.length} registros del SENASA.`);
            } else {
                alert('No se detectaron productos válidos. Verifique el formato del archivo.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
                        <PackageOpen className="w-8 h-8 mr-3 text-indigo-500" />
                        Catálogo de Productos y Servicios
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Codificación maestra, familias, IVA y trazabilidad de existencias.
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none font-bold transition-all active:scale-95 group"
                >
                    <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                    Registrar Nuevo
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center mb-8 gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        className="block w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                        placeholder="Buscar por código, nombre o familia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="flex items-center px-5 py-3 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-200 text-slate-700 dark:text-slate-300 rounded-2xl font-bold transition-all w-full sm:w-auto">
                    <Filter className="w-5 h-5 mr-2" />
                    Filtros
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv"
                    className="hidden"
                />
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-100 dark:border-emerald-800/30 hover:border-emerald-300 text-emerald-700 dark:text-emerald-400 rounded-2xl font-bold transition-all w-full sm:w-auto"
                    title="Importar CSV desde SENASA"
                >
                    <Database className="w-5 h-5 mr-2" />
                    Sincronizar Vademécum
                </button>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl mb-8 w-fit">
                <button
                    onClick={() => setActiveTab('catalog')}
                    className={`flex items-center px-6 py-2.5 font-bold rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <List className="w-5 h-5 mr-2" />
                    Catálogo Maestro
                </button>
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`flex items-center px-6 py-2.5 font-bold rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Box className="w-5 h-5 mr-2" />
                    Stock e Inventario
                </button>
            </div>

            {/* Catalog View */}
            {activeTab === 'catalog' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Código</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Nombre / Detalle</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Familia</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">IVA %</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Stock Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="px-6 py-5">
                                            <span className="font-mono text-xs font-bold px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                                {item.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-slate-800 dark:text-slate-100">{item.name}</div>
                                            <div className="flex flex-col gap-0.5 mt-1">
                                                {item.activeIngredient && <div className="text-[11px] text-slate-500 font-bold uppercase tracking-tight">{item.activeIngredient}</div>}
                                                {item.defaultDose && <div className="text-[11px] text-indigo-500 font-black italic">Dosis: {item.defaultDose}</div>}
                                                {item.observations && <div className="text-[11px] text-slate-400 font-medium italic">Obs: {item.observations}</div>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {item.family === 'Herbicida' && <Droplets className="w-4 h-4 text-blue-500" />}
                                                {item.family === 'Fungicida' && <ShieldAlert className="w-4 h-4 text-amber-500" />}
                                                {item.family === 'Insecticida' && <Bug className="w-4 h-4 text-red-500" />}
                                                {item.family === 'Bioestimulante' && <Sprout className="w-4 h-4 text-emerald-500" />}
                                                {item.family === 'Biológico' && <Sprout className="w-4 h-4 text-green-600" />}
                                                {item.family === 'Coadyuvante' && <Beaker className="w-4 h-4 text-indigo-500" />}
                                                {item.family === 'Fertilizante' && <FlaskConical className="w-4 h-4 text-purple-500" />}
                                                {item.family === 'Semilla' && <Wheat className="w-4 h-4 text-orange-400" />}
                                                {item.family === 'Ferretería' && <Hammer className="w-4 h-4 text-orange-500" />}
                                                {item.family === 'Riego' && <Wrench className="w-4 h-4 text-cyan-500" />}
                                                {item.family === 'Servicio' && <Settings className="w-4 h-4 text-slate-500" />}
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{item.family}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-sm font-bold text-slate-500">
                                            {item.vatPercentage}%
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2 pr-6">
                                                <button
                                                    onClick={() => setHistoryConfig({ isOpen: true, entityId: item.id, entityTitle: item.name })}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                                    title="Ver historial"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setChatConfig({ isOpen: true, entityId: item.id, entityTitle: item.name })}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                                    title="Conversaciones"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>
                                                <span className={`text-sm font-black ${item.stockLevel > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                                                    {item.stockLevel} {item.unit}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Inventory View */}
            {activeTab === 'inventory' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Item Maestro</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Lote / Envase</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Nivel de Llenado</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                {inventory.map((item) => {
                                    const prod = products.find(p => p.id === item.itemId);
                                    const percent = (item.currentAmount / item.totalCapacity) * 100;
                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-slate-900 dark:text-slate-100">{prod?.name || 'Desconocido'}</div>
                                                <div className="text-[10px] uppercase font-bold text-slate-400">{prod?.code || '-'}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.batchNumber}</div>
                                                <div className="text-xs text-slate-400">{item.containerType} de {item.totalCapacity}{item.unit}</div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-full h-3 max-w-[120px] overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${percent > 50 ? 'bg-indigo-500' : percent > 15 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                            style={{ width: `${percent}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                                                        {item.currentAmount} {item.unit}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full
                                                    ${item.status === 'Nuevo' ? 'bg-green-100 text-green-700' : ''}
                                                    ${item.status === 'Abierto' ? 'bg-amber-100 text-amber-700' : ''}
                                                    ${item.status === 'Vencido' ? 'bg-red-100 text-red-700' : ''}
                                                    ${item.status === 'Vacío' ? 'bg-slate-100 text-slate-400' : ''}
                                                `}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right whitespace-nowrap">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setChatConfig({ isOpen: true, entityId: item.id, entityTitle: `Lote ${item.batchNumber} - ${prod?.name}` })}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                                        title="Conversaciones"
                                                    >
                                                        <MessageCircle className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setHistoryConfig({ isOpen: true, entityId: item.id, entityTitle: `Lote ${item.batchNumber} - ${prod?.name}` })}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                                        title="Ver historial"
                                                    >
                                                        <History className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const newVal = prompt(`Ingrese la cantidad aproximada restante en el envase (${item.unit}):`, String(item.currentAmount));
                                                            if (newVal !== null) {
                                                                const amount = parseFloat(newVal);
                                                                if (!isNaN(amount) && amount >= 0 && amount <= item.totalCapacity) {
                                                                    returnProductToStock(item.id, amount);
                                                                } else {
                                                                    alert('Cantidad inválida');
                                                                }
                                                            }
                                                        }}
                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors"
                                                        title="Actualizar cantidad (Devolución parcial)"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <NewItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            {historyConfig.isOpen && (
                <HistoryModal 
                    isOpen={historyConfig.isOpen}
                    onClose={() => setHistoryConfig(prev => ({ ...prev, isOpen: false }))}
                    entityId={historyConfig.entityId}
                    entityTitle={historyConfig.entityTitle}
                />
            )}

            {chatConfig.isOpen && (
                <div className="fixed inset-y-0 right-0 z-[80] w-80 shadow-2xl border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 animate-in slide-in-from-right duration-300">
                    <SidebarChat
                        linkedInventoryId={chatConfig.entityId}
                        title={chatConfig.entityTitle}
                        subtitle="Comunicaciones sobre inventario"
                        onClose={() => setChatConfig(prev => ({ ...prev, isOpen: false }))}
                    />
                </div>
            )}
        </div>
    );
}
