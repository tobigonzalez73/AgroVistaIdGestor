import { useState } from 'react';
import { CheckCircle, Search, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../../context/UserContext';

interface ApproverGridProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

/**
 * Grilla de selección de aprobadores.
 * Muestra los usuarios internos activos (no externos) en formato de tabla
 * similar a Gestión de Usuarios. Al hacer click en una fila se
 * selecciona/deselecciona como aprobador.
 *
 * Todos los usuarios pueden ver la grilla, pero SOLO el admin puede
 * modificar los datos de usuario (eso se controla en la página Users).
 */
export default function ApproverGrid({ selectedIds, onChange }: ApproverGridProps) {
    const { users } = useAuth();
    const [search, setSearch] = useState('');

    // Only show active, non-external users as potential approvers
    const eligibleUsers = users.filter(
        u => u.role !== 'external' && u.isActive
    );

    const filtered = eligibleUsers.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const toggleUser = (userId: string) => {
        if (selectedIds.includes(userId)) {
            onChange(selectedIds.filter(id => id !== userId));
        } else {
            onChange([...selectedIds, userId]);
        }
    };

    const selectAll = () => {
        if (selectedIds.length === filtered.length) {
            onChange([]);
        } else {
            onChange(filtered.map(u => u.id));
        }
    };

    const roleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'user': return 'Técnico / Interno';
            default: return role;
        }
    };

    const roleColors = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
            case 'user': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
            default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/50">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                        Seleccionar Autorizadores
                    </span>
                    {selectedIds.length > 0 && (
                        <span className="ml-1 text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full animate-in fade-in">
                            {selectedIds.length} seleccionado{selectedIds.length > 1 ? 's' : ''}
                        </span>
                    )}
                </div>
                <div className="relative max-w-[200px]">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-slate-200"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="max-h-[220px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/40 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 z-10">
                        <tr>
                            <th className="pl-4 pr-2 py-2.5 w-10">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                                    onChange={selectAll}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    title="Seleccionar todos"
                                />
                            </th>
                            <th className="px-3 py-2.5">Usuario</th>
                            <th className="px-3 py-2.5">Rol</th>
                            <th className="px-3 py-2.5 text-center w-24">Autoriza</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map(user => {
                            const isSelected = selectedIds.includes(user.id);
                            return (
                                <tr
                                    key={user.id}
                                    onClick={() => toggleUser(user.id)}
                                    className={`cursor-pointer transition-all duration-150 group ${
                                        isSelected
                                            ? 'bg-indigo-50/80 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <td className="pl-4 pr-2 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleUser(user.id)}
                                            onClick={e => e.stopPropagation()}
                                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                                                isSelected
                                                    ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                            }`}>
                                                {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-sm font-semibold truncate transition-colors ${
                                                    isSelected
                                                        ? 'text-indigo-800 dark:text-indigo-200'
                                                        : 'text-slate-800 dark:text-slate-200'
                                                }`}>
                                                    {user.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColors(user.role)}`}>
                                            {roleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        {isSelected ? (
                                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                                                <CheckCircle className="w-5 h-5 fill-indigo-100 dark:fill-indigo-900/50" />
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <UsersIcon className="w-4 h-4" />
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={4} className="text-center py-6 text-sm text-slate-400">
                                    No se encontraron usuarios.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer summary */}
            {selectedIds.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-900/10 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Autorizadores:</span>
                    {selectedIds.map(id => {
                        const u = users.find(u => u.id === id);
                        if (!u) return null;
                        return (
                            <span
                                key={id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold rounded-full"
                            >
                                {u.name}
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleUser(id); }}
                                    className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-200 ml-0.5"
                                    title="Quitar"
                                >
                                    ×
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
