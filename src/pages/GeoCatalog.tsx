import { useState } from 'react';
import { Map as MapIcon, Plus, Search, MapPin, Grid, AlertCircle, Users, Building2, User, Phone, Mail, Hash, ExternalLink, Edit2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useGeo } from '../context/GeoContext';
import NewEntityModal from '../components/finance/NewEntityModal';
import EntityStatementModal from '../components/finance/EntityStatementModal';
import NewEstablishmentModal from '../components/geo/NewEstablishmentModal';

import NewPlotModal from '../components/geo/NewPlotModal';

export default function GeoCatalog() {

    const { entities } = useFinance();
    const { establishments, plots } = useGeo();
    const [activeTab, setActiveTab] = useState<'contacts' | 'geo'>('contacts');
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Modal States
    const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
    const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null); // For statement
    
    const [isEstablishmentModalOpen, setIsEstablishmentModalOpen] = useState(false);
    const [editingEstablishmentId, setEditingEstablishmentId] = useState<string | null>(null);
    
    const [selectedEstablishmentForPlot, setSelectedEstablishmentForPlot] = useState<string | null>(null);
    const [editingPlotId, setEditingPlotId] = useState<string | null>(null);
    const [establishmentForEditingPlot, setEstablishmentForEditingPlot] = useState<string | null>(null);

    // Filter and sort contacts alphabetically
    const filteredContacts = entities
        .filter(e => {
            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || (e.cuit && e.cuit.includes(searchTerm));
            const isActive = e.isActive !== false;
            return matchesSearch && (showInactive || isActive);
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    
    // Total actives count for UI feedback
    const activeContactsCount = entities.filter(e => e.isActive !== false).length;

    const filteredEstablishments = establishments
        .filter(e => {
            const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.locationStr.toLowerCase().includes(searchTerm.toLowerCase());
            const isActive = e.isActive !== false;
            return matchesSearch && (showInactive || isActive);
        });
    
    const activeEstCount = establishments.filter(e => e.isActive !== false).length;

    return (
        <div className="w-full h-full pb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <MapIcon className="w-7 h-7 mr-3 text-indigo-500" />
                        Clientes y Lotes
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Directorio de Contactos Comerciales y Gestión Geoespacial.
                    </p>
                </div>
                <button
                    onClick={() => activeTab === 'contacts' ? setIsEntityModalOpen(true) : setIsEstablishmentModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm font-medium transition-colors"
                >
                    <Plus className="w-5 h-5 mr-1.5" />
                    {activeTab === 'contacts' ? 'Nuevo Contacto' : 'Nuevo Establecimiento'}
                </button>
            </div>

            {/* Main Tabs */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex overflow-hidden">
                <button
                    onClick={() => setActiveTab('contacts')}
                    className={`flex-1 py-4 px-6 font-medium text-sm flex justify-center items-center transition-colors border-b-2
                        ${activeTab === 'contacts'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-500'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 border-transparent hover:border-slate-300'
                        }`}
                >
                    <Users className="w-5 h-5 mr-2" />
                    Directorio de Contactos (Clientes/Proveedores)
                </button>
                <button
                    onClick={() => setActiveTab('geo')}
                    className={`flex-1 py-4 px-6 font-medium text-sm flex justify-center items-center transition-colors border-b-2
                        ${activeTab === 'geo'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-500'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 border-transparent hover:border-slate-300'
                        }`}
                >
                    <MapIcon className="w-5 h-5 mr-2" />
                    Establecimientos y Lotes (Geo)
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
                <div className="relative flex-1 max-w-md">
                    <label htmlFor="search-input" className="sr-only">Buscar</label>
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-5 h-5 text-slate-400" />
                    </div>
                    <input
                        id="search-input"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
                        placeholder={activeTab === 'contacts' ? "Buscar por nombre, CUIT..." : "Buscar establecimientos..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowInactive(!showInactive)}
                        className={`flex items-center px-4 py-2 text-sm font-semibold rounded-lg border transition-all ${
                            showInactive 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800' 
                            : 'bg-white text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50'
                        }`}
                    >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {showInactive ? 'Ocultar Inactivos' : 'Ver Inactivos (Bajas)'}
                    </button>
                    <div className="hidden sm:flex flex-col items-end text-[10px] font-bold text-slate-400 uppercase tracking-tight leading-none px-3 py-1 border-l border-slate-200 dark:border-slate-700">
                        <span>{activeTab === 'contacts' ? 'Activos' : 'Activos'}</span>
                        <span className="text-emerald-500 text-sm mt-0.5">{activeTab === 'contacts' ? activeContactsCount : activeEstCount}</span>
                    </div>
                </div>
            </div>

            {/* Content: Contacts Directory */}
            {activeTab === 'contacts' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700">
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Razón Social / Nombre</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">CUIT</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Contacto</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ubicación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {filteredContacts.map(contact => (
                                    <tr
                                        key={contact.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${contact.isActive === false ? 'opacity-50 grayscale select-none' : ''}`}
                                        onClick={() => setEditingEntityId(contact.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className={`p-2 rounded-lg mr-3 ${contact.type === 'client' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : contact.type === 'supplier' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                    {contact.type === 'client' ? <User className="w-5 h-5" /> : contact.type === 'supplier' ? <Building2 className="w-5 h-5" /> : <div className="flex -space-x-2"><User className="w-4 h-4 z-10" /><Building2 className="w-4 h-4" /></div>}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                        {contact.name}
                                                        {contact.isActive === false && (
                                                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-black rounded uppercase tracking-widest">Inactivo</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-500">{contact.type === 'client' ? 'Cliente' : contact.type === 'supplier' ? 'Proveedor' : 'Cliente & Proveedor'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex items-center">
                                                <Hash className="w-4 h-4 mr-2 text-slate-400" />
                                                {contact.cuit || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            {contact.phone && (
                                                <div className="flex items-center mb-1">
                                                    <Phone className="w-4 h-4 mr-2 text-slate-400" /> {contact.phone}
                                                </div>
                                            )}
                                            {contact.email && (
                                                <div className="flex items-center">
                                                    <Mail className="w-4 h-4 mr-2 text-slate-400" /> {contact.email}
                                                </div>
                                            )}
                                            {!contact.phone && !contact.email && <span className="text-slate-400 italic">Sin datos de contacto</span>}
                                        </td>
                                         <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                            <div className="flex flex-col gap-1.5">
                                                {contact.address ? (
                                                    <div className="flex items-center" title={contact.address}>
                                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" /> 
                                                        <span className="truncate">{contact.address}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-xs">Sin dirección</span>
                                                )}
                                                {(contact.locality || contact.province) && (
                                                    <div className="text-xs text-slate-500 ml-5 italic">
                                                        {contact.locality}{contact.locality && contact.province ? ', ' : ''}{contact.province}
                                                    </div>
                                                )}
                                                {contact.ivaCondition && (
                                                    <div className="ml-5 mt-0.5">
                                                        <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-[10px] font-bold rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                                                            {contact.ivaCondition}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredContacts.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                            No se encontraron contactos que coincidan con la búsqueda.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Content: Geo Grid */}
            {activeTab === 'geo' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {filteredEstablishments.map((est) => {
                            const estPlots = plots.filter(p => p.establishmentId === est.id && (showInactive || p.isActive !== false));
                            const calcHectares = estPlots.reduce((sum, p) => sum + (p.isActive !== false ? p.hectares : 0), 0) || est.totalHectares;
                            const calcPlotsCount = estPlots.filter(p => p.isActive !== false).length;

                            return (
                                <div key={est.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow flex flex-col ${est.isActive === false ? 'opacity-70 grayscale-[50%]' : ''}`}>
                                    <div 
                                        className="h-32 bg-slate-200 dark:bg-slate-700 relative overflow-hidden flex items-center justify-center cursor-pointer group"
                                        onClick={() => setEditingEstablishmentId(est.id)}
                                    >
                                        <div className="absolute inset-0 opacity-20 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=-34.6,-58.4&zoom=10&size=400x200&sensor=false')] bg-cover bg-center mix-blend-overlay group-hover:opacity-40 transition-opacity"></div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-indigo-500/0 group-hover:bg-indigo-500/10 transition-colors">
                                            <Edit2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                                        </div>
                                        <MapPin className="w-10 h-10 text-slate-400 relative z-10 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <div className="p-5 flex-grow flex flex-col">
                                            <div className="flex flex-col">
                                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                    {est.name}
                                                    {est.isActive === false && (
                                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 text-[10px] font-black rounded uppercase">Inactivo</span>
                                                    )}
                                                </h3>
                                            </div>
                                            <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs font-semibold rounded-full">
                                                {est.type}
                                            </span>

                                        <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm mb-4">
                                            <MapPin className="w-4 h-4 mr-2 shrink-0" />
                                            <span className="truncate">{est.locationStr}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-4 mb-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center mb-1">
                                                    <Grid className="w-3.5 h-3.5 mr-1" />
                                                    Lotes/Sectores
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                                                    {calcPlotsCount}
                                                    <button
                                                        onClick={() => setSelectedEstablishmentForPlot(est.id)}
                                                        className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                                        title="Agregar Lote"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center mb-1">
                                                    <MapIcon className="w-3.5 h-3.5 mr-1" />
                                                    Superficie
                                                </span>
                                                <span className="font-semibold text-slate-800 dark:text-slate-200">{calcHectares} ha</span>
                                            </div>
                                        </div>

                                        {/* Ploted Lists Summary */}
                                        {estPlots.length > 0 && (
                                            <div className="mb-4">
                                                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Lotes Activos</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {estPlots.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEstablishmentForEditingPlot(est.id);
                                                                setEditingPlotId(p.id);
                                                            }}
                                                            className={`text-xs px-2.5 py-1 rounded-md border ${p.isActive === false 
                                                                ? 'bg-red-50 text-red-700 border-red-200 opacity-60' 
                                                                : p.mapUrl
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                                                                : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-100'
                                                                } transition-colors flex items-center`}
                                                        >
                                                            {p.name} ({p.hectares}ha)
                                                            {p.isActive === false && <span className="ml-1 text-[8px] font-bold uppercase">(Baja)</span>}
                                                            {p.mapUrl && p.isActive !== false && <ExternalLink className="w-3 h-3 ml-1" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                                            {est.mapUrl ? (
                                                <a
                                                    href={est.mapUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center justify-center w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/30 dark:hover:bg-slate-900/50 text-indigo-600 dark:text-indigo-400 text-sm font-medium rounded-lg transition-colors border border-slate-200 dark:border-slate-700 border-dashed"
                                                >
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Abrir Mapa Principal en Google Maps
                                                </a>
                                            ) : (
                                                <button className="flex items-center justify-center w-full py-2 bg-slate-50 dark:bg-slate-900/30 text-slate-400 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 border-dashed hover:text-indigo-500 hover:border-indigo-300 transition-colors">
                                                    + Vincular Mapa Principal
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-emerald-500" />
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                    <strong>Sincronización Total con Firebase Cloud Activa:</strong> Todos los establecimientos y lotes se guardan de forma permanente y segura en tu base de datos de la nube.
                                </p>
                            </div>
                        </div>
                    </div>

                </>
            )}

            {(isEntityModalOpen || editingEntityId) && (
                <NewEntityModal
                    onClose={() => {
                        setIsEntityModalOpen(false);
                        setEditingEntityId(null);
                    }}
                    editingEntityId={editingEntityId || undefined}
                    initialType="client"
                />
            )}

            {selectedEntityId && (
                <EntityStatementModal
                    entityId={selectedEntityId}
                    onClose={() => setSelectedEntityId(null)}
                />
            )}

            {(isEstablishmentModalOpen || editingEstablishmentId) && (
                <NewEstablishmentModal
                    onClose={() => {
                        setIsEstablishmentModalOpen(false);
                        setEditingEstablishmentId(null);
                    }}
                    editingEstablishmentId={editingEstablishmentId || undefined}
                />
            )}

            {(selectedEstablishmentForPlot || (editingPlotId && establishmentForEditingPlot)) && (
                <NewPlotModal
                    establishmentId={selectedEstablishmentForPlot || establishmentForEditingPlot || ''}
                    onClose={() => {
                        setSelectedEstablishmentForPlot(null);
                        setEditingPlotId(null);
                        setEstablishmentForEditingPlot(null);
                    }}
                    editingPlotId={editingPlotId || undefined}
                />
            )}
        </div>
    );
}
