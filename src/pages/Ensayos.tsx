import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Calendar, FlaskConical, MapPin, CheckCircle2, Trash2, Camera, Paperclip, StickyNote } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, deleteDoc, updateDoc, collection } from 'firebase/firestore';
import NewTrialModal from '../components/trials/NewTrialModal';
import TrialDetailsModal from '../components/trials/TrialDetailsModal';

import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/UserContext';
import { useAudit } from '../context/AuditContext';
import type { Trial } from '../types/trial';

export default function Ensayos() {
    const [searchParams] = useSearchParams();
    const { trials } = useAppContext();

    const { currentUser } = useAuth();
    const { logAction } = useAudit();
    const [selectedTrial, setSelectedTrial] = useState<Trial | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [detailsTab, setDetailsTab] = useState<'design' | 'results' | 'docs'>('design');

    // Deep linking logic
    useEffect(() => {
        const id = searchParams.get('id');
        if (id && trials.length > 0) {
            const trial = trials.find(t => t.id === id);
            if (trial) {
                setSelectedTrial(trial);
                setIsDetailsModalOpen(true);
            }
        }
    }, [searchParams, trials]);

    const columns = [
        { id: 'cotizacion', title: 'Cotizaciones', color: 'border-amber-400 dark:border-amber-500' },
        { id: 'planificado', title: 'Planificados', color: 'border-slate-300 dark:border-slate-600' },
        { id: 'en_curso', title: 'En Curso', color: 'border-blue-400 dark:border-blue-500' },
        { id: 'evaluacion', title: 'En Evaluación', color: 'border-orange-400 dark:border-orange-500' },
        { id: 'completado', title: 'Completados', color: 'border-green-400 dark:border-green-500' },
    ];

    const handleSaveTrial = async (trialData: Partial<Trial> & Record<string, unknown>) => {
        if (trialData.id) {
            // Update existing trial
            await setDoc(doc(db, 'trials', trialData.id as string), trialData, { merge: true });
            
            logAction({
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'update',
                module: 'ensayos',
                entityId: trialData.id as string,
                entityName: (trialData.title as string) || '',
                details: 'Modificación de ensayo',
            });
        } else {
            // Create new trial
            const newId = doc(collection(db, 'trials')).id;
            const newTrial: Trial = {
                ...trialData as Trial,
                id: newId,
                title: (trialData.title as string) || '',
                client: (trialData.client as string) || '',
                location: (trialData.location as string) || '',
                date: (trialData.startDate as string) || (trialData.date as string) || '',
                status: (trialData.status as Trial['status']) || 'cotizacion',
                experimentalDesign: (trialData.experimentalDesign as string) || 'dbca',
                repetitions: Number(trialData.repetitions) || 4,
                objective: (trialData.objective as string) || '',
                hectares: (trialData.hectares as string) || '',
                crop: (trialData.crop as string) || '',
            };
            
            await setDoc(doc(db, 'trials', newId), newTrial, { merge: true });
            
            logAction({
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'create',
                module: 'ensayos',
                entityId: newId,
                entityName: newTrial.title,
                details: `Nuevo ensayo creado: ${newTrial.title}`,
            });
        }
        setIsNewModalOpen(false);
        setIsEditingModalOpen(false);
    };

    const handleUpdateTrial = async (updatedTrial: Trial) => {
        await setDoc(doc(db, 'trials', updatedTrial.id), updatedTrial, { merge: true });
        setSelectedTrial(updatedTrial);
    };

    const handleOpenDetails = (trial: Trial, tab: 'design' | 'results' | 'docs' = 'design') => {
        setDetailsTab(tab);
        setSelectedTrial(trial);
        setIsDetailsModalOpen(true);
    };

    const handleDragStart = (e: React.DragEvent, trialId: string) => {
        e.dataTransfer.setData('trialId', trialId);
    };

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        const trialId = e.dataTransfer.getData('trialId');
        if (trialId) {
            const trial = trials.find(t => t.id === trialId);
            if (trial) {
                await updateDoc(doc(db, 'trials', trialId), { status: statusId as Trial['status'] });
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleRemoveTrial = async (trialId: string) => {
        await deleteDoc(doc(db, 'trials', trialId));
    };

    return (
        <div className="w-full flex flex-col h-[calc(100vh-8rem)]">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                        <FlaskConical className="w-7 h-7 mr-3 text-green-600" />
                        Ensayos Vivos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Gestión de proyectos y ensayos mediante tablero Kanban.
                    </p>
                </div>
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm font-medium transition-colors"
                >
                    <Plus className="w-5 h-5 mr-1.5" />
                    Nuevo Ensayo
                </button>
            </div>

            {/* Kanban Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                <div className="flex gap-6 h-full min-w-max items-start">
                    {columns.map(column => (
                        <div
                            key={column.id}
                            className="w-80 flex flex-col h-full rounded-xl transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                            onDrop={(e) => handleDrop(e, column.id)}
                            onDragOver={handleDragOver}
                        >
                            {/* Column Header */}
                            <div className={`flex items-center justify-between mb-3 px-1 border-b-2 ${column.color} pb-2`}>
                                <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                                    {column.title}
                                </h3>
                                <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {trials.filter((t: Trial) => t.status === column.id).length}
                                </span>
                            </div>

                            {/* Column Content */}
                            <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-2">
                                {trials.filter((t: Trial) => t.status === column.id).map((trial: Trial) => (
                                    <div
                                        key={trial.id}
                                        onClick={() => handleOpenDetails(trial)}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, trial.id)}
                                        className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    {trial.status === 'cotizacion' && <span className="w-2 h-2 rounded-full bg-amber-400"></span>}
                                                    {trial.status === 'planificado' && <span className="w-2 h-2 rounded-full bg-slate-400"></span>}
                                                    {trial.status === 'en_curso' && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>}
                                                    {trial.status === 'evaluacion' && <span className="w-2 h-2 rounded-full bg-orange-500 font-bold"></span>}
                                                    {trial.status === 'completado' && <span className="w-2 h-2 rounded-full bg-green-500"></span>}
                                                    <span className="text-[10px] uppercase font-black tracking-tighter text-slate-400 dark:text-slate-500">
                                                        {trial.status.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                                                    {trial.title}
                                                </h4>
                                            </div>
                                            {trial.status === 'evaluacion' ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm('¿Marcar este ensayo como completado? Ya tienes el informe final listo.')) {
                                                            updateDoc(doc(db, 'trials', trial.id), { status: 'completado' });
                                                        }
                                                    }}
                                                    className="text-slate-400 hover:text-green-600 dark:hover:text-green-400 focus:outline-none p-1 rounded-full hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                                    title="Marcar como Completado"
                                                >
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </button>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenDetails(trial, 'docs');
                                                        }}
                                                        className="text-slate-300 hover:text-blue-500 p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                        title="Ver Evidencia / Adjuntar"
                                                    >
                                                        <Camera className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenDetails(trial, 'design');
                                                        }}
                                                        className="text-slate-300 hover:text-amber-500 p-1 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                        title="Notas / Anotaciones"
                                                    >
                                                        <StickyNote className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleOpenDetails(trial, 'docs');
                                                        }}
                                                        className="text-slate-300 hover:text-amber-600 p-1 rounded-full hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                                        title="Documentos / Archivos"
                                                    >
                                                        <Paperclip className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('¿Estás seguro de que deseas eliminar este ensayo? Esta acción no se puede deshacer.')) {
                                                                handleRemoveTrial(trial.id);
                                                            }
                                                        }}
                                                        className="text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                        title="Eliminar Ensayo"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col space-y-2 mt-3">
                                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                                                <MapPin className="w-3.5 h-3.5 mr-1.5" />
                                                <span className="truncate">{trial.client} • {trial.location}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                                                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                                                <span>Inicio: {trial.date}</span>
                                            </div>
                                            {(trial.attachments && trial.attachments.length > 0) && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    {trial.attachments.filter(a => a.type === 'foto').length > 0 && (
                                                        <div className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                            <Camera className="w-3 h-3 mr-1" />
                                                            {trial.attachments.filter(a => a.type === 'foto').length}
                                                        </div>
                                                    )}
                                                    {trial.generalNotes && (
                                                        <div className="flex items-center text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                                                            <StickyNote className="w-3 h-3 mr-1" />
                                                            Nota
                                                        </div>
                                                    )}
                                                    {trial.attachments.filter(a => a.type === 'documento').length > 0 && (
                                                        <div className="flex items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/40 px-1.5 py-0.5 rounded">
                                                            <Paperclip className="w-3 h-3 mr-1" />
                                                            {trial.attachments.filter(a => a.type === 'documento').length}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Progress Bar Mock */}
                                        {(trial.status === 'en_curso' || trial.status === 'evaluacion') && (
                                            <div className="mt-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5">
                                                <div className={`bg-${trial.status === 'evaluacion' ? 'orange' : 'blue'}-500 h-1.5 rounded-full`} style={{ width: trial.status === 'evaluacion' ? '80%' : '35%' }}></div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <NewTrialModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onSave={handleSaveTrial}
            />

            <NewTrialModal
                isOpen={isEditingModalOpen}
                editingTrial={selectedTrial}
                onClose={() => setIsEditingModalOpen(false)}
                onSave={handleSaveTrial}
            />

            {/* Added Trial Details Modal component */}
            <TrialDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                trial={selectedTrial}
                onUpdate={handleUpdateTrial}
                onDelete={handleRemoveTrial}
                initialTab={detailsTab}
                onEdit={() => {
                    setIsDetailsModalOpen(false);
                    setIsEditingModalOpen(true);
                }}
            />
        </div>
    );
}
