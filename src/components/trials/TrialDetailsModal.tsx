import { useState, useEffect } from 'react';
import {
    X, Calendar as CalendarIcon, MapPin, Users, TestTube2, Edit, Trash2, FileText, Save, Plus,
    Bug, Leaf, Sprout, Activity, Variable, Clock, Table, AlertCircle, MessageCircle, Settings,
    Camera, File, Download, UploadCloud, CheckCircle, StickyNote, History, Layers
} from 'lucide-react';
import { SENASA_VADEMECUM } from '../../data/vademecum';
import { useAudit } from '../../context/AuditContext';
import HistoryModal from '../common/HistoryModal';
import type { EvaluationVariable, Evaluation, Result, Treatment, Trial, Product, PlannedApplication, TrialMilestone } from '../../types/trial';
import { useAppContext } from '../../context/AppContext';
import SidebarChat from '../chat/SidebarChat';
import QuotationPDF from './QuotationPDF';
import { useAuth } from '../../context/UserContext';
import { useNotifications } from '../../context/NotificationContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';

interface TrialDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    trial: Trial | null;
    onUpdate?: (updatedTrial: Trial) => void;
    onDelete?: (trialId: string) => void;
    onEdit?: () => void;
    initialTab?: 'design' | 'results' | 'docs';
}

export default function TrialDetailsModal({ isOpen, onClose, trial, onUpdate, onDelete, onEdit, initialTab }: TrialDetailsModalProps) {
    const { customProducts, addCustomProduct } = useAppContext();
    const [activeTab, setActiveTab] = useState<'design' | 'results' | 'docs'>(initialTab || 'design');
    const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(false);
    const [showQuotationPDF, setShowQuotationPDF] = useState(false);
    const { currentUser, users } = useAuth();
    const { addNotification } = useNotifications();

    const [editedTreatments, setEditedTreatments] = useState<Treatment[]>(trial?.treatments || []);
    const [editedVariables, setEditedVariables] = useState<EvaluationVariable[]>(trial?.variables || []);
    const [isEditing, setIsEditing] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const { logAction } = useAudit();
    const [editingApplication, setEditingApplication] = useState<{ treatmentId: string | number, appId: string } | null>(null);
    const [editedEvaluations, setEditedEvaluations] = useState<Evaluation[]>(trial?.evaluations || []);
    const [editedPlannedApplications, setEditedPlannedApplications] = useState<PlannedApplication[]>(trial?.plannedApplications || []);
    const [editedResults, setEditedResults] = useState<Result[]>(trial?.results || []);
    const [editedDate, setEditedDate] = useState(trial?.date || '');
    const [editedAttachments, setEditedAttachments] = useState<any[]>(trial?.attachments || []);
    const [editedMilestones, setEditedMilestones] = useState<TrialMilestone[]>(trial?.milestones || []);
    const [finalReport, setFinalReport] = useState<string | undefined>(trial?.finalReportUrl);

    const [selectedEvaluationId, setSelectedEvaluationId] = useState<string>('');
    const [selectedVariableId, setSelectedVariableId] = useState<string>('');

    const [quotePriceNoYield, setQuotePriceNoYield] = useState<number>(trial?.quotePriceNoYield || 0);
    const [quotePriceWithYield, setQuotePriceWithYield] = useState<number>(trial?.quotePriceWithYield || 0);
    const [quoteIncludeYield, setQuoteIncludeYield] = useState<boolean>(trial?.quoteIncludeYield || false);
    const [quoteLogistics, setQuoteLogistics] = useState<number>(trial?.quoteLogistics || 0);
    const [quoteOtherExpenses, setQuoteOtherExpenses] = useState<number>(trial?.quoteOtherExpenses || 0);
    const [quoteNotes, setQuoteNotes] = useState<string>(trial?.quoteNotes || '');
    const [quoteCurrency, setQuoteCurrency] = useState<'USD' | 'ARS'>(trial?.quoteCurrency || 'USD');
    const [generalNotes, setGeneralNotes] = useState<string>(trial?.generalNotes || '');
    const [editedRepetitions, setEditedRepetitions] = useState<number>(trial?.repetitions || 4);
    const [editedExperimentalDesign, setEditedExperimentalDesign] = useState<string>(trial?.experimentalDesign || 'dbca');
    const [editedTitle, setEditedTitle] = useState(trial?.title || '');
    const [editedObjective, setEditedObjective] = useState(trial?.objective || '');
    const [editedCrop, setEditedCrop] = useState(trial?.crop || '');

    useEffect(() => {
        if (isOpen && trial) {
            setEditedTreatments(trial.treatments || []);
            setEditedVariables(trial.variables || []);
            setEditedEvaluations(trial.evaluations || []);
            setEditedPlannedApplications(trial.plannedApplications || []);
            setEditedResults(trial.results || []);
            setEditedDate(trial.date || '');
            setEditedAttachments(trial.attachments || []);
            setEditedMilestones(trial.milestones || []);
            setFinalReport(trial.finalReportUrl);
            setQuotePriceNoYield(trial.quotePriceNoYield || 0);
            setQuotePriceWithYield(trial.quotePriceWithYield || 0);
            setQuoteIncludeYield(trial.quoteIncludeYield || false);
            setQuoteLogistics(trial.quoteLogistics || 0);
            setQuoteOtherExpenses(trial.quoteOtherExpenses || 0);
            setQuoteNotes(trial.quoteNotes || '');
            setQuoteCurrency(trial.quoteCurrency || 'USD');
            setGeneralNotes(trial.generalNotes || '');
            setEditedRepetitions(trial.repetitions || 4);
            setEditedExperimentalDesign(trial.experimentalDesign || 'dbca');
            setEditedTitle(trial.title || '');
            setEditedObjective(trial.objective || '');
            setEditedCrop(trial.crop || '');
            setIsEditing(false); // Default to view mode

            // Check for draft after initial sync to overwrite if exists
            const draft = localStorage.getItem(`trial_edit_draft_${trial.id}`);
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    setEditedTreatments(parsed.editedTreatments);
                    setEditedVariables(parsed.editedVariables);
                    setEditedEvaluations(parsed.editedEvaluations);
                    setEditedPlannedApplications(parsed.editedPlannedApplications);
                    setEditedResults(parsed.editedResults);
                    setEditedDate(parsed.editedDate);
                    setEditedTitle(parsed.editedTitle);
                    setEditedObjective(parsed.editedObjective);
                    setEditedCrop(parsed.editedCrop);
                    setEditedMilestones(parsed.editedMilestones || []);
                    setGeneralNotes(parsed.generalNotes);
                    
                    addNotification({
                        userId: currentUser.id,
                        title: 'Modificaciones Pendientes',
                        message: `Se han restaurado cambios no guardados para el ensayo ${trial.title}.`,
                        type: 'info'
                    });
                    setIsEditing(true);
                } catch (e) {
                    console.error("Error parsing trial edit draft", e);
                }
            }
            setActiveTab(initialTab || 'design'); 
        }
    }, [trial, isOpen]);    // Autosave for TrialDetailsModal
    useEffect(() => {
        if (isOpen && trial && isEditing) {
            const timeoutId = setTimeout(() => {
                const draft = {
                    editedTreatments,
                    editedVariables,
                    editedEvaluations,
                    editedPlannedApplications,
                    editedResults,
                    editedDate,
                    editedTitle,
                    editedObjective,
                    editedCrop,
                    editedMilestones,
                    generalNotes
                };
                localStorage.setItem(`trial_edit_draft_${trial.id}`, JSON.stringify(draft));
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, trial, isEditing, editedTreatments, editedVariables, editedEvaluations, editedPlannedApplications, editedResults, editedDate, editedTitle, editedObjective, editedCrop, editedMilestones, generalNotes]);

    const clearEditDraft = () => {
        if (trial) {
            localStorage.removeItem(`trial_edit_draft_${trial.id}`);
            // Force re-sync with original trial data
            setEditedTreatments(trial.treatments || []);
            setEditedVariables(trial.variables || []);
            setEditedEvaluations(trial.evaluations || []);
            setEditedPlannedApplications(trial.plannedApplications || []);
            setEditedResults(trial.results || []);
            setEditedDate(trial.date || '');
            setEditedTitle(trial.title || '');
            setEditedObjective(trial.objective || '');
            setEditedCrop(trial.crop || '');
            setEditedMilestones(trial.milestones || []);
            setGeneralNotes(trial.generalNotes || '');
            setIsEditing(false);
            
            addNotification({
                userId: currentUser.id,
                title: 'Borrador Descartado',
                message: 'Se han descartado los cambios no guardados.',
                type: 'info'
            });
        }
    };

    // (Removed useEffect that was setting state derived from editedEvaluations directly)

    const handleOpenTrialChat = () => {
        setIsChatSidebarOpen(!isChatSidebarOpen);
    };

    if (!isOpen || !trial) return null;

    const handleProductChange = (treatmentId: string | number, productId: string | number, field: string, value: string | boolean) => {
        setEditedTreatments(prev => prev.map(t => {
            if (t.id === treatmentId) {
                return {
                    ...t,
                    products: t.products.map(p => {
                        if (p.id === productId) {
                            let updatedProd = { ...p, [field]: value };
                            
                            // Autocompletion logic for SENASA + Custom Vademecum
                            if (field === 'product' && typeof value === 'string') {
                                const allVademecum = [...SENASA_VADEMECUM, ...customProducts];
                                const matchedProduct = allVademecum.find(vp => vp.name.toLowerCase() === value.toLowerCase());
                                if (matchedProduct) {
                                    updatedProd.activeIngredient = matchedProduct.activeIngredient;
                                    updatedProd.family = matchedProduct.family as any;
                                }
                            }
                            
                            return updatedProd;
                        }
                        return p;
                    })
                };
            }
            return t;
        }));
    };

    const handleAddProduct = (treatmentId: string | number) => {
        setEditedTreatments(prev => prev.map(t => {
            if (t.id === treatmentId) {
                const newProductId = `prod_${Date.now()}`;
                return {
                    ...t,
                    products: [...t.products, { id: newProductId, product: '', activeIngredient: '', dose: '', unit: 'cc/100 L', family: '' }]
                };
            }
            return t;
        }));
    };

    const handleRemoveProduct = (treatmentId: string | number, productId: string | number) => {
        setEditedTreatments(prev => prev.map(t => {
            if (t.id === treatmentId) {
                return { ...t, products: t.products.filter(p => p.id !== productId) };
            }
            return t;
        }));
    };

    const handleAddNewTreatment = () => {
        setEditedTreatments(prev => [
            ...prev,
            {
                id: doc(collection(db, 'treatments')).id,
                name: `T${prev.length}`,
                products: [{ id: `prod_${Date.now()}`, product: '', activeIngredient: '', dose: '', unit: 'cc/100 L', family: '' }],
                applicationIds: []
            }
        ]);
    };

    const handleQuickAddApp = () => {
        const nextNum = editedPlannedApplications.length + 1;
        const newAppId = `p${Date.now()}`;
        const prevApp = editedPlannedApplications[editedPlannedApplications.length - 1];

        const newApp: PlannedApplication = {
            id: newAppId,
            name: `A${nextNum}`,
            daysAfterStart: (prevApp?.daysAfterStart || 0) + 7,
            daysAfterReference: 7,
            referenceType: prevApp ? 'protocol' : 'init',
            referenceId: prevApp ? prevApp.id : '',
            isVariable: prevApp ? true : false
        };
        setEditedPlannedApplications(prev => [...prev, newApp]);
    };

    const handleRemoveTreatment = (treatmentId: string | number) => {
        setEditedTreatments(prev => prev.filter(t => t.id !== treatmentId));
    };

    const handleTreatmentNameChange = (treatmentId: string | number, newName: string) => {
        setEditedTreatments(prev => prev.map(t => t.id === treatmentId ? { ...t, name: newName } : t));
    };

    const handleToggleTreatmentApp = (treatmentId: string | number, appId: string) => {
        setEditedTreatments(prev => prev.map(t => {
            if (t.id === treatmentId) {
                const currentIds = t.applicationIds || [];
                const isFound = currentIds.includes(appId);
                const newIds = isFound
                    ? currentIds.filter(id => id !== appId)
                    : [...currentIds, appId];

                if (isFound && editingApplication?.treatmentId === treatmentId && editingApplication?.appId === appId) {
                    setEditingApplication(null);
                }

                return { ...t, applicationIds: newIds };
            }
            return t;
        }));
    };

    const handleOverrideDose = (treatmentId: string | number, appId: string, productId: string | number, field: 'dose' | 'unit', value: string) => {
        setEditedTreatments(prev => prev.map(t => {
            if (t.id === treatmentId) {
                const settings = t.applicationSettings || {};
                const appSettings = settings[appId] || { overrides: {} };
                const overrides = appSettings.overrides || {};
                const prodOverride = overrides[productId] || {};

                return {
                    ...t,
                    applicationSettings: {
                        ...settings,
                        [appId]: {
                            ...appSettings,
                            overrides: {
                                ...overrides,
                                [productId]: { ...prodOverride, [field]: value }
                            }
                        }
                    }
                };
            }
            return t;
        }));
    };

    const handleAddVariable = () => {
        setEditedVariables(prev => [
            ...prev,
            { id: `v${Date.now()}`, category: 'enfermedad', target: '', name: '', unit: '' }
        ]);
    };

    const handleVariableChange = (id: string, field: keyof EvaluationVariable, value: string) => {
        setEditedVariables(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleRemoveVariable = (id: string) => {
        setEditedVariables(prev => prev.filter(v => v.id !== id));
    };

    const handleAddEvaluation = () => {
        const lastApp = editedPlannedApplications[editedPlannedApplications.length - 1];
        setEditedEvaluations(prev => [
            ...prev,
            { 
                id: `e${Date.now()}`, 
                name: '', 
                daysAfterApplication: 7,
                referenceType: lastApp ? 'protocol' : 'init',
                referenceId: lastApp ? lastApp.id : '',
                isVariable: true
            }
        ]);
    };

    const handleEvaluationChange = (id: string, field: keyof Evaluation, value: string | number | boolean) => {
        setEditedEvaluations(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleToggleEvaluationVariable = (id: string) => {
        setEditedEvaluations(prev => prev.map(e => 
            e.id === id ? { ...e, isVariable: !e.isVariable } : e
        ));
    };

    const handleRemoveEvaluation = (id: string) => {
        setEditedEvaluations(prev => prev.filter(e => e.id !== id));
    };

    const handleAddMilestone = () => {
        setEditedMilestones(prev => [
            ...prev,
            { id: `m${Date.now()}`, name: '', type: 'labor', isVariable: true }
        ]);
    };

    const handleMilestoneChange = (id: string, field: keyof TrialMilestone, value: any) => {
        setEditedMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleRemoveMilestone = (id: string) => {
        setEditedMilestones(prev => prev.filter(m => m.id !== id));
    };



    const handlePlannedAppChange = (id: string, field: keyof PlannedApplication, value: string | number | boolean) => {
        setEditedPlannedApplications(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleTogglePlannedAppVariable = (id: string) => {
        setEditedPlannedApplications(prev => prev.map(p => 
            p.id === id ? { ...p, isVariable: !p.isVariable } : p
        ));
    };

    const handleRemovePlannedApp = (id: string) => {
        setEditedPlannedApplications(prev => prev.filter(p => p.id !== id));
    };

    const handleAddAttachment = (type: 'foto' | 'documento') => {
        const names = {
            'foto': ['Foto Lote 1.jpg', 'Geminivirus Obs.png', 'Muestra Hoja.jpg'],
            'documento': ['Protocolo Externo.pdf', 'Analisis Suelo.xlsx', 'Receta Agronomica.pdf']
        };
        const randomName = names[type][Math.floor(Math.random() * names[type].length)];

        setEditedAttachments(prev => [
            ...prev,
            {
                id: `att_${Date.now()}`,
                name: randomName,
                url: '#',
                type: type,
                uploadDate: new Date().toISOString().split('T')[0]
            }
        ]);
    };

    const handleRemoveAttachment = (id: string) => {
        setEditedAttachments(prev => prev.filter(att => att.id !== id));
    };

    const handleApproveProject = () => {
        if (onUpdate) {
            onUpdate({ ...trial, status: 'planificado' });
            onClose();
        }
    };

    const handleApproveOrReject = (status: 'approved' | 'rejected') => {
        if (onUpdate && trial) {
            const updatedApprovals = trial.approvals?.map(a =>
                a.userId === currentUser.id ? { ...a, status, date: new Date().toISOString() } : a
            );
            onUpdate({ ...trial, approvals: updatedApprovals });

            logAction({
                userId: currentUser.id,
                userName: currentUser.name,
                action: status === 'approved' ? 'approve' : 'reject',
                module: 'ensayos',
                entityId: trial.id,
                entityName: trial.title,
                details: status === 'approved' ? 'El usuario aprobó el ensayo.' : 'El usuario rechazó el ensayo.'
            });
        }
    };

    const handleResultChange = (treatmentId: string | number, repetitionNumber: number, value: string) => {
        if (!selectedEvaluationId || !selectedVariableId) return;

        const resultId = `${selectedEvaluationId}_${selectedVariableId}_${treatmentId}_${repetitionNumber}`;

        setEditedResults(prev => {
            const existingIndex = prev.findIndex(r => r.id === resultId);
            if (existingIndex >= 0) {
                const newResults = [...prev];
                newResults[existingIndex] = { ...newResults[existingIndex], value };
                return newResults;
            } else {
                return [...prev, {
                    id: resultId,
                    evaluationId: selectedEvaluationId,
                    variableId: selectedVariableId,
                    treatmentId,
                    repetitionNumber,
                    value
                }];
            }
        });
    };

    const handleSave = () => {
        if (onUpdate) {
            let newStatus = trial.status;
            const expectedTotal = (editedTreatments.length || 0) * (trial.repetitions || 0) * (editedVariables.length || 0) * (editedEvaluations.length || 0);
            const validResultsCount = editedResults.filter(r => r.value !== '' && r.value !== null && !Number.isNaN(Number(r.value))).length;

            if (expectedTotal > 0 && newStatus !== 'completado') {
                if (validResultsCount === 0) {
                    newStatus = 'planificado';
                } else if (validResultsCount > 0 && validResultsCount < expectedTotal) {
                    newStatus = 'en_curso';
                } else if (validResultsCount >= expectedTotal) {
                    newStatus = 'evaluacion';
                }
            }

            const updatedTrial = {
                ...trial,
                title: editedTitle,
                objective: editedObjective,
                crop: editedCrop,
                date: editedDate,
                treatments: editedTreatments,
                variables: editedVariables,
                evaluations: editedEvaluations,
                plannedApplications: editedPlannedApplications,
                milestones: editedMilestones,
                results: editedResults,
                status: newStatus,
                attachments: editedAttachments,
                finalReportUrl: finalReport,
                quotePriceNoYield,
                quotePriceWithYield,
                quoteIncludeYield,
                quoteLogistics,
                quoteOtherExpenses,
                quoteNotes,
                quoteCurrency,
                generalNotes,
                repetitions: editedRepetitions,
                experimentalDesign: editedExperimentalDesign
            };

            // Save new products to custom vademecum
            const allVademecum = [...SENASA_VADEMECUM, ...customProducts];
            editedTreatments.forEach(t => {
                t.products.forEach(p => {
                    if (p.product && !allVademecum.find(vp => vp.name.toLowerCase() === p.product.toLowerCase())) {
                        addCustomProduct({
                            id: `CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                            name: p.product,
                            activeIngredient: p.activeIngredient || '',
                            family: p.family || '',
                            company: 'Custom'
                        });
                    }
                });
            });

            onUpdate(updatedTrial);

            logAction({
                userId: currentUser.id,
                userName: currentUser.name,
                action: 'update',
                module: 'ensayos',
                entityId: trial.id,
                entityName: trial.title,
                details: 'Se actualizaron los datos del ensayo (desde vista detalle)'
            });
        }
        setIsEditing(false);
        if (trial) {
            localStorage.removeItem(`trial_edit_draft_${trial.id}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity overflow-y-auto">
            <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full ${isChatSidebarOpen ? 'max-w-7xl' : 'max-w-5xl'} max-h-[90vh] flex overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-300`}>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="flex-col border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                        <div className="flex justify-between items-start p-6 pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-500 shrink-0">
                                    <TestTube2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        {isEditing ? (
                                            <input 
                                                value={editedTitle}
                                                onChange={(e) => setEditedTitle(e.target.value)}
                                                className="text-xl font-bold bg-white dark:bg-slate-900 border border-slate-300 rounded px-2 py-1 text-slate-800 dark:text-slate-100"
                                            />
                                        ) : (
                                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{trial.title}</h2>
                                        )}
                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                            {trial.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">ID: {trial.id} • Creado el {trial.date}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleOpenTrialChat}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50 rounded-lg text-sm font-medium transition-colors"
                                    title="Chat del Ensayo"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="hidden sm:inline">Comunicaciones</span>
                                </button>
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                                    title="Ver historial de cambios"
                                >
                                    <History className="w-4 h-4" />
                                    <span className="hidden sm:inline">Historial</span>
                                </button>
                                {trial.status === 'cotizacion' && (
                                    <button
                                        onClick={handleApproveProject}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                                        title="Pasar de Cotización a Planificado"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        Aprobar Proyecto
                                    </button>
                                )}
                                {isEditing && trial && localStorage.getItem(`trial_edit_draft_${trial.id}`) && (
                                    <button
                                        onClick={clearEditDraft}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-lg text-sm font-medium transition-colors"
                                        title="Descartar cambios no guardados"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Descartar Borrador
                                    </button>
                                )}
                                <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                        {/* Navigation Tabs */}
                        <div className="flex px-6 space-x-6">
                            <button
                                onClick={() => setActiveTab('design')}
                                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                Diseño y Planificación
                            </button>
                            <button
                                onClick={() => setActiveTab('results')}
                                className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'results' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                <Table className="w-4 h-4" />
                                Carga de Resultados
                            </button>
                        </div>
                    </div>

                    {/* Pending Approvals Banner */}
                    {trial.approvals?.some(a => a.userId === currentUser.id && a.status === 'pending') && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 p-4 px-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-400">Aprobación Pendiente</h4>
                                    <p className="text-sm text-amber-700 dark:text-amber-500">Fuiste asignado para aprobar la creación y presupuesto de este ensayo.</p>
                                </div>
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto shrink-0">
                                <button onClick={() => handleApproveOrReject('rejected')} className="flex-1 sm:flex-none px-4 py-2 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg text-sm font-bold transition-colors">
                                    Rechazar
                                </button>
                                <button onClick={() => handleApproveOrReject('approved')} className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-sm font-bold transition-colors shadow-sm">
                                    Aprobar Ensayo
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Body Content */}
                    <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-800 space-y-8">
                        {activeTab === 'design' && (
                            <>
                                {/* General Info Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Información General</h3>

                                        <div className="flex items-start gap-3">
                                            <Users className="w-5 h-5 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-slate-500">Cliente / Patrocinador</p>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{trial.client}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                                            <div>
                                                <p className="text-sm text-slate-500">Ubicación</p>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">{trial.location}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <CalendarIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                                            <div className="flex-1">
                                                <p className="text-sm text-slate-500 mb-1">Fecha de Inicio</p>
                                                {isEditing ? (
                                                    <input
                                                        type="date"
                                                        value={editedDate}
                                                        onChange={(e) => setEditedDate(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100"
                                                    />
                                                ) : (
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">{trial.date}</p>
                                                )}
                                            </div>
                                        </div>

                                        {trial.crop && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 mt-0.5" /> {/* Spacer */}
                                                <div>
                                                    <p className="text-sm text-slate-500">Cultivo / Variedad</p>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200">{trial.crop}</p>
                                                </div>
                                            </div>
                                        )}

                                        {trial.objective && (
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 mt-0.5" />
                                                <div>
                                                    <p className="text-sm text-slate-500">Objetivo General</p>
                                                    <p className="font-medium text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{trial.objective}</p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-2 mb-3">
                                                <StickyNote className="w-4 h-4 text-amber-500" />
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Anotaciones y Bitácora</h4>
                                            </div>
                                            <textarea
                                                value={generalNotes}
                                                onChange={(e) => setGeneralNotes(e.target.value)}
                                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-green-500 text-sm placeholder-slate-400 min-h-[150px] italic shadow-inner"
                                                placeholder="Escribe aquí observaciones generales, bitácora de campo o notas internas..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Diseño Experimental</h3>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Diseño Estadístico</label>
                                                        <select 
                                                            value={editedExperimentalDesign}
                                                            onChange={(e) => setEditedExperimentalDesign(e.target.value)}
                                                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded text-slate-800 dark:text-slate-100"
                                                        >
                                                            <option value="dbca">DBCA</option>
                                                            <option value="dca">DCA</option>
                                                            <option value="parcelas_divididas">Parcelas Divididas</option>
                                                            <option value="cuadrado_latino">Cuadrado Latino</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-slate-500 mb-1 uppercase font-bold">Repeticiones</label>
                                                        <input 
                                                            type="number" 
                                                            value={editedRepetitions}
                                                            onChange={(e) => setEditedRepetitions(Number(e.target.value))}
                                                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 rounded text-slate-800 dark:text-slate-100"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-slate-500 mb-2">Diseño: <span className="font-medium text-slate-800 dark:text-slate-200 uppercase">{trial.experimentalDesign || 'N/A'}</span></p>
                                                    <p className="text-slate-500 mb-2">Repeticiones: <span className="font-medium text-slate-800 dark:text-slate-200">{trial.repetitions || 'N/A'}</span></p>
                                                </>
                                            )}
                                            <p className="text-slate-500">Total Parcelas: <span className="font-medium text-slate-800 dark:text-slate-200">
                                                {(editedRepetitions && editedTreatments?.length) ? editedRepetitions * editedTreatments.length : 'N/A'}
                                            </span></p>
                                        </div>

                                        {trial.approvals && trial.approvals.length > 0 && (
                                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Aprobaciones y Responsables</h3>
                                                <div className="space-y-2">
                                                    {trial.approvals.map((appr, idx) => {
                                                        const user = users.find(u => u.id === appr.userId);
                                                        return (
                                                            <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                                                <div className="flex items-center gap-2 max-w-[60%]">
                                                                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                                                        {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={user?.name}>{user?.name}</span>
                                                                </div>
                                                                <div className="shrink-0 flex items-center gap-2">
                                                                    {appr.status === 'pending' ? (
                                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg">Pendiente</span>
                                                                    ) : appr.status === 'approved' ? (
                                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1">
                                                                            <CheckCircle className="w-3 h-3" /> Aprobado
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-lg flex items-center gap-1">
                                                                            <X className="w-3 h-3" /> Rechazado
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quotation Pricing Section */}
                                {(trial.status === 'cotizacion' || isEditing) && (
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4">
                                            <div className="p-1.5 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                                                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                            </div>
                                            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Presupuesto de Cotización</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-amber-700/70 dark:text-amber-500/70 uppercase">Precio por Tratamiento</label>
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            value={quotePriceNoYield}
                                                            onChange={(e) => setQuotePriceNoYield(Number(e.target.value))}
                                                            disabled={!isEditing && trial.status !== 'cotizacion'}
                                                            className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                            placeholder="Precio sin rinde"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Sin Rinde</span>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            value={quotePriceWithYield}
                                                            onChange={(e) => setQuotePriceWithYield(Number(e.target.value))}
                                                            disabled={!isEditing && trial.status !== 'cotizacion'}
                                                            className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                            placeholder="Precio con rinde"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Con Rinde</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col justify-center gap-4">
                                                <label className="block text-xs font-bold text-amber-700/70 dark:text-amber-500/70 uppercase">Evaluación de Rinde</label>
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => (isEditing || trial.status === 'cotizacion') && setQuoteIncludeYield(false)}
                                                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${!quoteIncludeYield
                                                            ? 'bg-amber-100 border-amber-400 text-amber-800'
                                                            : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className="text-xs font-bold">Base</span>
                                                        <span className="text-[10px]">Sin Rinde</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => (isEditing || trial.status === 'cotizacion') && setQuoteIncludeYield(true)}
                                                        className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${quoteIncludeYield
                                                            ? 'bg-amber-100 border-amber-400 text-amber-800'
                                                            : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-900 dark:border-slate-700'
                                                            }`}
                                                    >
                                                        <span className="text-xs font-bold">Full</span>
                                                        <span className="text-[10px]">Eval. Rinde</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-amber-700/70 dark:text-amber-500/70 uppercase">Gastos Adicionales</label>
                                                <div className="space-y-2">
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            value={quoteLogistics}
                                                            onChange={(e) => setQuoteLogistics(Number(e.target.value))}
                                                            disabled={!isEditing && trial.status !== 'cotizacion'}
                                                            className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-900 dark:text-slate-100"
                                                            placeholder="Logística/Viáticos"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Logística</span>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500 font-bold">$</span>
                                                        <input
                                                            type="number"
                                                            value={quoteOtherExpenses}
                                                            onChange={(e) => setQuoteOtherExpenses(Number(e.target.value))}
                                                            disabled={!isEditing && trial.status !== 'cotizacion'}
                                                            className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-900 dark:text-slate-100"
                                                            placeholder="Otros gastos"
                                                        />
                                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-medium">Otros</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <label className="block text-xs font-bold text-amber-700/70 dark:text-amber-500/70 uppercase">Moneda</label>
                                                <select
                                                    value={quoteCurrency}
                                                    onChange={(e) => setQuoteCurrency(e.target.value as 'USD' | 'ARS')}
                                                    disabled={!isEditing && trial.status !== 'cotizacion'}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-900 dark:text-slate-100"
                                                >
                                                    <option value="USD">USD ($)</option>
                                                    <option value="ARS">ARS ($)</option>
                                                </select>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-amber-200 dark:border-slate-700 flex flex-col justify-between shadow-inner">
                                                <div className="space-y-1 text-[11px]">
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span>Subtotal Ensayos:</span>
                                                        <span className="font-bold">
                                                            ${((quoteIncludeYield ? (quotePriceWithYield || 0) : (quotePriceNoYield || 0)) * (editedTreatments?.length || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-slate-500">
                                                        <span>Extras (Log. + Otros):</span>
                                                        <span className="font-bold">${((quoteLogistics || 0) + (quoteOtherExpenses || 0)).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <div className="border-t border-slate-100 dark:border-slate-800 mt-2 pt-2 flex justify-between items-end">
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase">Total Final</span>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                                            ${(
                                                                ((Number(quoteIncludeYield ? (quotePriceWithYield || 0) : (quotePriceNoYield || 0)) || 0) * (editedTreatments?.length || 0)) +
                                                                (Number(quoteLogistics) || 0) +
                                                                (Number(quoteOtherExpenses) || 0)
                                                            ).toLocaleString()}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-medium">{quoteCurrency} VALOR DIVISA</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-bold text-amber-700/70 dark:text-amber-500/70 uppercase">Observaciones y Aclaraciones de Gastos</label>
                                            <textarea
                                                value={quoteNotes}
                                                onChange={(e) => setQuoteNotes(e.target.value)}
                                                disabled={!isEditing && trial.status !== 'cotizacion'}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm italic text-slate-600 dark:text-slate-300 placeholder-slate-400 resize-none"
                                                placeholder="Detalle aquí viáticos, traslados, insumos especiales o cualquier aclaración sobre el presupuesto..."
                                                rows={6}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Layers className="w-4 h-4" /> 1. Esquema de Tratamientos
                                        </h3>
                                        <button
                                            onClick={() => onEdit ? onEdit() : setIsEditing(!isEditing)}
                                            className={`flex items-center text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${isEditing ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'}`}
                                        >
                                            {isEditing ? 'Cancelar Edición' : <><Edit className="w-3.5 h-3.5 mr-1" /> Editar Proyecto Completo</>}
                                        </button>
                                    </div>

                                    {editedTreatments && editedTreatments.length > 0 ? (
                                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-x-auto">
                                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tratamiento</th>
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Eval.</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Producto Comercial</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Activo</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Familia</th>
                                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Dosis</th>
                                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unidad</th>
                                                        {isEditing && <th scope="col" className="px-4 py-3 font-medium text-center">Acción</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                    {editedTreatments.map((t, tIndex) => (
                                                        t.products.map((p, pIndex) => (
                                                            <tr key={`${t.id}-${p.id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                                <td className="px-4 py-3 align-top">
                                                                    {pIndex === 0 ? (
                                                                        <>
                                                                            {isEditing ? (
                                                                                <div className="flex flex-col gap-1">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={t.name}
                                                                                            onChange={(e) => handleTreatmentNameChange(t.id, e.target.value)}
                                                                                            className="w-full px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white"
                                                                                            placeholder="Ej: T1"
                                                                                        />
                                                                                        {tIndex === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">(Testigo)</span>}
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <span className="font-bold text-slate-800 dark:text-slate-200 block pt-1">
                                                                                    {t.name}
                                                                                    {tIndex === 0 && <span className="ml-2 text-xs font-normal text-slate-500">(Testigo)</span>}
                                                                                </span>
                                                                            )}
                                                                            <div className="mt-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2">
                                                                                <div className="flex items-center justify-between mb-2 px-1">
                                                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cronograma</span>
                                                                                    <span className="text-[9px] font-bold text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 rounded-full border border-green-100 dark:border-green-800">
                                                                                        {(t.applicationIds || []).length} ent.
                                                                                    </span>
                                                                                </div>
                                                                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                                                                                    {editedPlannedApplications.length > 0 ? (
                                                                                        editedPlannedApplications.map(app => {
                                                                                            const isActive = (t.applicationIds || []).includes(app.id);
                                                                                            const isEditingThis = editingApplication?.treatmentId === t.id && editingApplication?.appId === app.id;
                                                                                            const hasOverrides = !!t.applicationSettings?.[app.id]?.overrides && Object.keys(t.applicationSettings[app.id].overrides || {}).length > 0;

                                                                                            return (
                                                                                                <div key={app.id} className="relative">
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        onClick={() => isEditing && handleToggleTreatmentApp(t.id, app.id)}
                                                                                                        disabled={!isEditing}
                                                                                                        className={`w-full px-1 py-1 rounded text-[9px] font-black transition-all border ${isActive
                                                                                                            ? 'bg-green-600 text-white border-green-700 shadow-sm'
                                                                                                            : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                                                                                            } ${!isEditing ? 'cursor-default opacity-80' : 'cursor-pointer hover:border-slate-300 active:scale-95'} ${isEditingThis ? 'ring-2 ring-blue-400 z-10' : ''}`}
                                                                                                        title={`${app.name} - ${app.daysAfterStart} DDA`}
                                                                                                    >
                                                                                                        {app.name}
                                                                                                        {isActive && hasOverrides && (
                                                                                                            <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-yellow-300 rounded-full" />
                                                                                                        )}
                                                                                                    </button>
                                                                                                    {isEditing && isActive && (
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={(e) => {
                                                                                                                e.stopPropagation();
                                                                                                                setEditingApplication({ treatmentId: t.id, appId: app.id });
                                                                                                            }}
                                                                                                            className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm z-20 ${isEditingThis ? 'bg-blue-500 text-white' : 'bg-white text-green-600 border border-green-200'}`}
                                                                                                        >
                                                                                                            <Settings className="w-2 h-2" />
                                                                                                        </button>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        })
                                                                                    ) : (
                                                                                        <span className="text-[9px] italic text-slate-400 col-span-full">Sin protocolo</span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Dose Overrides for TrialDetailsModal */}
                                                                                {isEditing && editingApplication && editingApplication.treatmentId === t.id && (
                                                                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg animate-in fade-in slide-in-from-top-1">
                                                                                        <div className="flex justify-between items-center mb-2">
                                                                                            <h4 className="text-[8px] font-black text-blue-600 uppercase flex items-center gap-1">
                                                                                                <Settings className="w-2.5 h-2.5" /> Ajustes: {editedPlannedApplications.find(a => a.id === editingApplication.appId)?.name}
                                                                                            </h4>
                                                                                            <button type="button" onClick={() => setEditingApplication(null)} className="p-0.5 hover:bg-white rounded">
                                                                                                <X className="w-2.5 h-2.5 text-blue-400" />
                                                                                            </button>
                                                                                        </div>
                                                                                        <div className="grid grid-cols-1 gap-2">
                                                                                            {t.products.map(prod => {
                                                                                                const override = t.applicationSettings?.[editingApplication.appId]?.overrides?.[prod.id];
                                                                                                return (
                                                                                                    <div key={prod.id} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700 shadow-sm">
                                                                                                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-700 pb-1 mb-1">
                                                                                                            <span className="text-[8px] font-bold text-slate-700 dark:text-slate-300 truncate">{prod.product || 'Sin nombre'}</span>
                                                                                                            <span className="text-[7px] text-slate-400">Base: {prod.dose} {prod.unit}</span>
                                                                                                        </div>
                                                                                                        <div className="grid grid-cols-2 gap-1.5">
                                                                                                            <div>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={override?.dose ?? prod.dose}
                                                                                                                    onChange={(e) => handleOverrideDose(t.id, editingApplication.appId, prod.id, 'dose', e.target.value)}
                                                                                                                    className="w-full text-center font-bold text-[10px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-0.5 text-slate-900 dark:text-white"
                                                                                                                />
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <select
                                                                                                                    value={override?.unit ?? prod.unit}
                                                                                                                    onChange={(e) => handleOverrideDose(t.id, editingApplication.appId, prod.id, 'unit', e.target.value)}
                                                                                                                    className="w-full text-[9px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded py-0.5 text-slate-900 dark:text-white"
                                                                                                                >
                                                                                                                    <option value="L/ha">L/ha</option>
                                                                                                                    <option value="Kg/ha">Kg/ha</option>
                                                                                                                    <option value="cc/100 L">cc/100 L</option>
                                                                                                                    <option value="g/100 L">g/100 L</option>
                                                                                                                </select>
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    ) : null}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {isEditing ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleProductChange(t.id, p.id, 'isEvaluationTarget', !p.isEvaluationTarget)}
                                                                            className={`p-2 rounded-full transition-all border shrink-0 ${p.isEvaluationTarget
                                                                                ? 'bg-green-100 text-green-600 border-green-200 shadow-sm'
                                                                                : 'bg-slate-100 text-slate-400 border-slate-200'
                                                                                }`}
                                                                            title={p.isEvaluationTarget ? 'Dato de evaluación' : 'Acompañante'}
                                                                        >
                                                                            <Sprout className={`w-4 h-4 ${p.isEvaluationTarget ? 'scale-110' : 'opacity-40 scale-90'}`} />
                                                                        </button>
                                                                    ) : (
                                                                        <div className="flex justify-center">
                                                                            {p.isEvaluationTarget ? (
                                                                                <Sprout className="w-5 h-5 text-green-500 dark:text-green-400" />
                                                                            ) : (
                                                                                <Leaf className="w-4 h-4 text-slate-300 dark:text-slate-600 opacity-40" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {isEditing ? (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <input
                                                                                type="text"
                                                                                list="common-products"
                                                                                value={p.product}
                                                                                onChange={(e) => handleProductChange(t.id, p.id, 'product', e.target.value)}
                                                                                className={`w-full px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white ${p.isEvaluationTarget ? 'font-bold' : 'italic text-slate-400'}`}
                                                                                placeholder="Nombre del producto"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <span className={`${p.isEvaluationTarget ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-400 italic font-normal'} text-sm truncate`}>
                                                                            {p.product || '-'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="text"
                                                                            value={p.activeIngredient || ''}
                                                                            onChange={(e) => handleProductChange(t.id, p.id, 'activeIngredient', e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white"
                                                                            placeholder="Ej. Glifosato 48%"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-slate-600 dark:text-slate-300 text-sm">{p.activeIngredient || '-'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {isEditing ? (
                                                                        <select
                                                                            required
                                                                            value={p.family || ''}
                                                                            onChange={(e) => handleProductChange(t.id, p.id, 'family', e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white font-medium"
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
                                                                                <option value="Otro">➕ Otro</option>
                                                                            </optgroup>
                                                                        </select>
                                                                    ) : (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                                                                            {p.family || 'No definida'}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-center">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={p.dose}
                                                                            onChange={(e) => handleProductChange(t.id, p.id, 'dose', e.target.value)}
                                                                            className="w-20 px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white text-center inline-block"
                                                                            placeholder="0.0"
                                                                        />
                                                                    ) : (
                                                                        p.dose || '-'
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {isEditing ? (
                                                                        <select
                                                                            value={p.unit}
                                                                            onChange={(e) => handleProductChange(t.id, p.id, 'unit', e.target.value)}
                                                                            className="w-full px-2 py-1 text-sm bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-white"
                                                                        >
                                                                            <option value="N/A">N/A</option>
                                                                            <option value="cc/100 L">cc/100 L</option>
                                                                            <option value="L/100 L">L/100 L</option>
                                                                            <option value="g/100 L">g/100 L</option>
                                                                            <option value="kg/100 L">kg/100 L</option>
                                                                            <option value="L/ha">L/ha</option>
                                                                            <option value="Kg/ha">Kg/ha</option>
                                                                            <option value="g/ha">g/ha</option>
                                                                        </select>
                                                                    ) : (
                                                                        p.unit
                                                                    )}
                                                                </td>
                                                                {isEditing && (
                                                                    <td className="px-4 py-3 text-center">
                                                                        <div className="flex items-center justify-center gap-2">
                                                                            {pIndex === 0 ? (
                                                                                tIndex > 0 && (
                                                                                    <button onClick={() => handleRemoveTreatment(t.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Eliminar Tratamiento">
                                                                                        <Trash2 className="w-4 h-4" />
                                                                                    </button>
                                                                                )
                                                                            ) : (
                                                                                <button onClick={() => handleRemoveProduct(t.id, p.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Quitar mezcla">
                                                                                    <X className="w-4 h-4" />
                                                                                </button>
                                                                            )}
                                                                            {pIndex === t.products.length - 1 && (
                                                                                <button
                                                                                    onClick={() => handleAddProduct(t.id)}
                                                                                    className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded hover:bg-blue-100 transition-all text-[10px] font-bold"
                                                                                    title="Añadir producto a la mezcla"
                                                                                >
                                                                                    <Plus className="w-3 h-3" /> MEZCLA
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        ))
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">
                                            <Layers className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                            <p className="text-slate-500 text-sm">No se han definido tratamientos para este ensayo.</p>
                                        </div>
                                    )}

                                    {isEditing && (
                                        <button
                                            onClick={handleAddNewTreatment}
                                            className="mt-4 w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Habilitar Nuevo Tratamiento (Renglón)
                                        </button>
                                    )}
                                </div>

                                    {/* 2. Protocol Section */}
                                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Sprout className="w-4 h-4" /> 2. Protocolo de Aplicaciones
                                            </h3>
                                            {isEditing && (
                                                <button
                                                    onClick={handleQuickAddApp}
                                                    className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md transition-colors bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Ventana
                                                </button>
                                            )}
                                        </div>

                                        {editedPlannedApplications && editedPlannedApplications.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {editedPlannedApplications.map((app, index) => (
                                                    <div key={app.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative shadow-sm">
                                                        {isEditing && (
                                                            <button onClick={() => handleRemovePlannedApp(app.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isEditing ? (
                                                            <div className="space-y-2 pr-6">
                                                                <input
                                                                    type="text"
                                                                    value={app.name}
                                                                    onChange={(e) => handlePlannedAppChange(app.id, 'name', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium mb-1"
                                                                    placeholder="Nombre (Ej. A1)"
                                                                />
                                                                <div className="flex flex-col gap-2">
                                                                    <div>
                                                                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1 ml-1">Contar desde:</div>
                                                                        <select
                                                                            value={app.referenceId || 'init'}
                                                                            onChange={(e) => {
                                                                                const val = e.target.value;
                                                                                if (val === 'init') {
                                                                                    handlePlannedAppChange(app.id, 'referenceType', 'init');
                                                                                    handlePlannedAppChange(app.id, 'referenceId', '');
                                                                                } else if (val.startsWith('p')) {
                                                                                    handlePlannedAppChange(app.id, 'referenceType', 'protocol');
                                                                                    handlePlannedAppChange(app.id, 'referenceId', val);
                                                                                } else if (val.startsWith('m')) {
                                                                                    handlePlannedAppChange(app.id, 'referenceType', 'milestone');
                                                                                    handlePlannedAppChange(app.id, 'referenceId', val);
                                                                                }
                                                                            }}
                                                                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 rounded text-[10px] font-bold shadow-sm focus:ring-1 focus:ring-green-500 outline-none"
                                                                        >
                                                                            <option value="init">🚀 Inicio Ensayo</option>
                                                                            <optgroup label="Protocolo (Otras Ventanas)">
                                                                                {editedPlannedApplications.filter((_, i) => i < index).map(otherApp => (
                                                                                    <option key={otherApp.id} value={otherApp.id}>📦 {otherApp.name}</option>
                                                                                ))}
                                                                            </optgroup>
                                                                            {editedMilestones.length > 0 && (
                                                                                <optgroup label="Hitos y Labores">
                                                                                    {editedMilestones.map(m => (
                                                                                        <option key={m.id} value={m.id}>{m.type === 'labor' ? '🚜' : '🌱'} {m.name}</option>
                                                                                    ))}
                                                                                </optgroup>
                                                                            )}
                                                                        </select>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1">
                                                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Espera (días):</div>
                                                                            <input
                                                                                type="number"
                                                                                value={app.daysAfterReference ?? app.daysAfterStart ?? ''}
                                                                                onChange={(e) => {
                                                                                    const val = parseInt(e.target.value) || 0;
                                                                                    handlePlannedAppChange(app.id, 'daysAfterReference', val);
                                                                                    handlePlannedAppChange(app.id, 'daysAfterStart', val);
                                                                                }}
                                                                                className="w-full px-1.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 rounded text-xs font-bold text-center focus:ring-1 focus:ring-green-500 outline-none"
                                                                            />
                                                                        </div>
                                                                        <div className="w-1/3 pt-4">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleTogglePlannedAppVariable(app.id)}
                                                                                className={`w-full px-1 py-1.5 rounded text-[8px] font-black uppercase tracking-tighter border transition-all shadow-sm ${
                                                                                    app.isVariable
                                                                                        ? 'bg-amber-500 text-white border-amber-600'
                                                                                        : 'bg-white text-slate-400 border-slate-200'
                                                                                }`}
                                                                            >
                                                                                {app.isVariable ? '🔄 Var' : '🗓️ Fijo'}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    {!app.isVariable && (
                                                                        <div>
                                                                            <div className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase mb-1 ml-1">Fecha Programada:</div>
                                                                            <input
                                                                                type="date"
                                                                                value={app.date || ''}
                                                                                onChange={(e) => handlePlannedAppChange(app.id, 'date', e.target.value)}
                                                                                className="w-full px-1.5 py-1 text-[10px] bg-white border border-green-200 rounded text-slate-900 dark:text-slate-100 font-bold"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium pb-1 border-b border-green-100/50 dark:border-green-800/50">
                                                                    <Sprout className={`w-3.5 h-3.5 ${app.isVariable ? 'text-amber-500' : 'text-green-500'}`} />
                                                                    <span className="truncate text-slate-700 dark:text-slate-300 font-bold">{app.name}</span>
                                                                    {app.isVariable && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Biológica</span>}
                                                                </div>
                                                                <div className="flex flex-col gap-0.5 mt-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Programado:</span>
                                                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                                                            {app.date ? `${app.date}` : `${app.daysAfterReference ?? app.daysAfterStart} DDA`}
                                                                        </span>
                                                                    </div>
                                                                    {app.referenceId && (
                                                                        <div className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 px-1 py-0.5 rounded italic">
                                                                            <Clock className="w-2.5 h-2.5" />
                                                                            {app.daysAfterReference ?? app.daysAfterStart}d después de {
                                                                                app.referenceType === 'protocol'
                                                                                    ? (editedPlannedApplications.find(a => a.id === app.referenceId)?.name || 'V. Ant.')
                                                                                    : (editedMilestones.find(m => m.id === app.referenceId)?.name || 'Hito')
                                                                            }
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">
                                                <Sprout className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                                <p className="text-slate-500 text-sm">No se ha definido un protocolo de aplicaciones múltiples.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Milestones Section */}
                                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Activity className="w-4 h-4" /> 3. Hitos y Eventos Biológicos
                                            </h3>
                                            {isEditing && (
                                                <button
                                                    onClick={handleAddMilestone}
                                                    className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md transition-colors bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Evento
                                                </button>
                                            )}
                                        </div>

                                        {editedMilestones && editedMilestones.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {editedMilestones.map(m => (
                                                    <div key={m.id} className="bg-amber-50/30 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-lg p-3 flex flex-col gap-2 relative shadow-sm">
                                                        {isEditing && (
                                                            <button onClick={() => handleRemoveMilestone(m.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isEditing ? (
                                                            <div className="space-y-2 pr-6">
                                                                <input
                                                                    type="text"
                                                                    value={m.name}
                                                                    onChange={(e) => handleMilestoneChange(m.id, 'name', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 rounded font-medium"
                                                                    placeholder="Nombre de evento"
                                                                />
                                                                <div className="flex gap-1">
                                                                    <select value={m.type} onChange={(e) => handleMilestoneChange(m.id, 'type', e.target.value)} className="w-1/2 px-1 py-1 border rounded text-[10px] bg-white">
                                                                        <option value="labor">Labor</option>
                                                                        <option value="fenologia">Fenología</option>
                                                                    </select>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleMilestoneChange(m.id, 'isVariable', !m.isVariable)}
                                                                        className={`w-1/2 px-1 py-1 rounded text-[10px] font-bold border ${m.isVariable ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600'}`}
                                                                    >
                                                                        {m.isVariable ? 'Variable' : 'Fija'}
                                                                    </button>
                                                                </div>
                                                                <input
                                                                    type="date"
                                                                    value={m.date || ''}
                                                                    onChange={(e) => handleMilestoneChange(m.id, 'date', e.target.value)}
                                                                    className="w-full px-2 py-1 text-[10px] bg-white border rounded"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium border-b border-amber-100/50 pb-1">
                                                                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{m.name}</span>
                                                                </div>
                                                                <div className="flex justify-between items-center mt-1">
                                                                    <span className="text-[10px] uppercase text-slate-400 font-bold">{m.type}</span>
                                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                                                                        {m.isVariable ? '🔄 ' : '🗓️ '}
                                                                        {m.date || 'Pendiente'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4 text-center">
                                                <p className="text-slate-400 text-xs italic">Sin hitos registrados.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Evaluations Section */}
                                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                <Clock className="w-4 h-4" /> 4. Cronograma de Evaluaciones
                                            </h3>
                                            {isEditing && (
                                                <button
                                                    onClick={handleAddEvaluation}
                                                    className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Medición
                                                </button>
                                            )}
                                        </div>

                                        {editedEvaluations && editedEvaluations.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                                {editedEvaluations.map(ev => (
                                                    <div key={ev.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative shadow-sm">
                                                        {isEditing && (
                                                            <button onClick={() => handleRemoveEvaluation(ev.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {isEditing ? (
                                                            <div className="space-y-2 pr-6">
                                                                <input
                                                                    type="text"
                                                                    value={ev.name}
                                                                    onChange={(e) => handleEvaluationChange(ev.id, 'name', e.target.value)}
                                                                    className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium mb-1"
                                                                    placeholder="Nombre (Ej. 7 DDA)"
                                                                />
                                                                <div className="flex flex-col gap-3">
                                                                     <div>
                                                                         <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Desde el evento:</div>
                                                                         <select
                                                                             value={ev.referenceId || 'init'}
                                                                             onChange={(e) => {
                                                                                 const val = e.target.value;
                                                                                 if (val === 'init') {
                                                                                     handleEvaluationChange(ev.id, 'referenceType', 'init');
                                                                                     handleEvaluationChange(ev.id, 'referenceId', '');
                                                                                 } else if (val.startsWith('p')) {
                                                                                     handleEvaluationChange(ev.id, 'referenceType', 'protocol');
                                                                                     handleEvaluationChange(ev.id, 'referenceId', val);
                                                                                 } else if (val.startsWith('m')) {
                                                                                     handleEvaluationChange(ev.id, 'referenceType', 'milestone');
                                                                                     handleEvaluationChange(ev.id, 'referenceId', val);
                                                                                 }
                                                                             }}
                                                                             className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 rounded text-[10px] font-bold shadow-sm focus:ring-1 focus:ring-amber-500 outline-none"
                                                                         >
                                                                             <option value="init">🚀 Inicio Ensayo</option>
                                                                             <optgroup label="Protocolo">
                                                                                 {editedPlannedApplications.map(app => (
                                                                                     <option key={app.id} value={app.id}>📦 {app.name}</option>
                                                                                 ))}
                                                                             </optgroup>
                                                                             {editedMilestones.length > 0 && (
                                                                                 <optgroup label="Hitos y Labores">
                                                                                     {editedMilestones.map(m => (
                                                                                         <option key={m.id} value={m.id}>{m.type === 'labor' ? '🚜' : '🌱'} {m.name}</option>
                                                                                     ))}
                                                                                 </optgroup>
                                                                             )}
                                                                         </select>
                                                                     </div>

                                                                     <div className="flex items-center gap-2">
                                                                         <div className="flex-1">
                                                                             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 ml-1">Espera:</div>
                                                                             <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1 rounded border border-slate-200 dark:border-slate-700">
                                                                                 <input
                                                                                     type="number"
                                                                                     value={ev.daysAfterApplication ?? ''}
                                                                                     onChange={(e) => handleEvaluationChange(ev.id, 'daysAfterApplication', parseInt(e.target.value) || 0)}
                                                                                     className="w-12 px-1 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-bold text-center focus:ring-1 focus:ring-amber-500 outline-none"
                                                                                 />
                                                                                 <span className="text-[9px] font-bold text-slate-500 uppercase">días después</span>
                                                                             </div>
                                                                         </div>
                                                                         <div className="w-1/3 pt-4">
                                                                             <button
                                                                                 type="button"
                                                                                 onClick={() => handleToggleEvaluationVariable(ev.id)}
                                                                                 className={`w-full px-2 py-2 rounded text-[9px] font-black uppercase tracking-tighter border transition-all shadow-sm ${
                                                                                     ev.isVariable
                                                                                         ? 'bg-amber-500 text-white border-amber-600'
                                                                                         : 'bg-white text-slate-400 border-slate-200'
                                                                                 }`}
                                                                             >
                                                                                 {ev.isVariable ? '🔄 Var' : '🗓️ Fija'}
                                                                             </button>
                                                                         </div>
                                                                     </div>

                                                                     {(!ev.isVariable || ev.date) && (
                                                                         <div>
                                                                             <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 ml-1">Fecha:</div>
                                                                             <input
                                                                                 type="date"
                                                                                 value={ev.date || ''}
                                                                                 onChange={(e) => handleEvaluationChange(ev.id, 'date', e.target.value)}
                                                                                 className="w-full px-2 py-1.5 text-[10px] bg-white border border-blue-200 rounded text-slate-900 dark:text-slate-100 font-bold outline-none shadow-sm"
                                                                             />
                                                                         </div>
                                                                     )}
                                                                 </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium pb-1 border-b border-slate-100 dark:border-slate-700/50">
                                                                    <Clock className={`w-3.5 h-3.5 ${ev.isVariable ? 'text-amber-500' : 'text-blue-400'}`} />
                                                                    <span className="truncate text-slate-700 dark:text-slate-300 font-bold">{ev.isVariable ? 'Estimada: ' : ''}{ev.name}</span>
                                                                    {ev.isVariable && <span className="text-[9px] bg-amber-100 text-amber-700 px-1 rounded flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" /> Biológica</span>}
                                                                </div>
                                                                <div className="flex justify-between items-end mt-1">
                                                                    {ev.date ? (
                                                                        <span className={`text-sm font-semibold ${ev.isVariable ? 'text-amber-700' : 'text-slate-800 dark:text-slate-100'}`}>
                                                                            {ev.isVariable ? '🔄 ' : '🗓️ '}
                                                                            {ev.date}
                                                                        </span>
                                                                    ) : (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                                                {ev.referenceType === 'protocol' ? (editedPlannedApplications.find(a => a.id === ev.referenceId)?.name || 'Aplicación') : 
                                                                                 ev.referenceType === 'milestone' ? (editedMilestones.find(m => m.id === ev.referenceId)?.name || 'Hito') : 
                                                                                 'Luego del Inicio'}
                                                                            </span>
                                                                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{ev.daysAfterApplication} días</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center">
                                                <Clock className="w-6 h-6 mx-auto text-slate-400 mb-2" />
                                                <p className="text-slate-500 text-sm">No se ha definido un cronograma de mediciones para este ensayo.</p>
                                            </div>
                                        )}
                                    </div>
                                
                                {/* 5. Variables a Evaluar (Moved from above) */}
                                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 mt-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Variable className="w-4 h-4" /> 5. Variables del Ensayo
                                        </h3>
                                        {isEditing && (
                                            <button
                                                onClick={handleAddVariable}
                                                className="flex items-center text-xs font-medium px-3 py-1.5 rounded-md transition-colors bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Variable
                                            </button>
                                        )}
                                    </div>

                                    {editedVariables && editedVariables.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {editedVariables.map(v => (
                                                <div key={v.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex flex-col gap-2 relative shadow-sm">
                                                    {isEditing && (
                                                        <button onClick={() => handleRemoveVariable(v.id)} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {isEditing ? (
                                                        <div className="space-y-2 pr-6">
                                                            <div className="flex gap-2">
                                                                <select
                                                                    value={v.category}
                                                                    onChange={(e) => handleVariableChange(v.id, 'category', e.target.value)}
                                                                    className="w-1/3 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                                >
                                                                    <option value="insecto">Insecto</option>
                                                                    <option value="enfermedad">Enfermedad</option>
                                                                    <option value="maleza">Maleza</option>
                                                                    <option value="produccion">Producción</option>
                                                                    <option value="otro">Otro</option>
                                                                </select>
                                                                <input
                                                                    type="text"
                                                                    value={v.target}
                                                                    onChange={(e) => handleVariableChange(v.id, 'target', e.target.value)}
                                                                    className="w-2/3 px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                                    placeholder="Objetivo (Ej. Roya)"
                                                                />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <div className="w-2/3">
                                                                    <input
                                                                        type="text"
                                                                        list={`var-list-details-new-${v.id}`}
                                                                        value={v.name}
                                                                        onChange={(e) => handleVariableChange(v.id, 'name', e.target.value)}
                                                                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 font-medium"
                                                                        placeholder="Nombre (Ej. Severidad)"
                                                                    />
                                                                    <datalist id={`var-list-details-new-${v.id}`}>
                                                                        {v.category === 'insecto' && <><option value="Incidencia" /><option value="Severidad" /><option value="Huevos" /><option value="Larvas" /><option value="Ninfas" /><option value="Adultos" /><option value="Daño Foliar" /><option value="Eficacia de Control" /></>}
                                                                        {v.category === 'enfermedad' && <><option value="Incidencia" /><option value="Severidad" /><option value="AUDPC" /><option value="Eficacia de Control" /></>}
                                                                        {v.category === 'maleza' && <><option value="Cobertura" /><option value="Eficacia de Control" /><option value="Fitotoxicidad" /><option value="Biomasa Fresca" /><option value="Biomasa Seca" /><option value="Conteo Individuos" /></>}
                                                                        {v.category === 'produccion' && <><option value="Rendimiento" /><option value="Peso 1000 granos" /><option value="Número de frutos" /><option value="Peso promedio" /><option value="Calidad" /></>}
                                                                    </datalist>
                                                                </div>
                                                                <div className="w-1/3">
                                                                    <input
                                                                        type="text"
                                                                        list={`unit-list-details-new-${v.id}`}
                                                                        value={v.unit || ''}
                                                                        onChange={(e) => handleVariableChange(v.id, 'unit', e.target.value)}
                                                                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                                        placeholder="Unidad (Ej. %)"
                                                                    />
                                                                    <datalist id={`unit-list-details-new-${v.id}`}>
                                                                        {v.category === 'insecto' && <><option value="%" /><option value="Nº/hoja" /><option value="Nº/planta" /><option value="Nº/m²" /><option value="Grado (1-5)" /></>}
                                                                        {v.category === 'enfermedad' && <><option value="%" /><option value="Grado (1-9)" /><option value="cm²" /></>}
                                                                        {v.category === 'maleza' && <><option value="%" /><option value="Nº/m²" /><option value="g/m²" /><option value="kg/ha" /><option value="Grado EWRC" /></>}
                                                                        {v.category === 'produccion' && <><option value="kg/ha" /><option value="qq/ha" /><option value="tn/ha" /><option value="g" /><option value="kg" /></>}
                                                                    </datalist>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium pb-1 border-b border-slate-100 dark:border-slate-700/50">
                                                                {v.category === 'insecto' ? <Bug className="w-3.5 h-3.5" /> :
                                                                    v.category === 'enfermedad' ? <Activity className="w-3.5 h-3.5" /> :
                                                                        v.category === 'maleza' ? <Leaf className="w-3.5 h-3.5" /> :
                                                                            <Sprout className="w-3.5 h-3.5" />}
                                                                <span className="uppercase">{v.category}</span>
                                                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                <span className="truncate text-slate-700 dark:text-slate-300 font-bold">{v.target}</span>
                                                            </div>
                                                            <div className="flex justify-between items-end mt-1">
                                                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{v.name}</span>
                                                                {v.unit && <span className="text-xs font-mono text-slate-500 px-1.5 bg-slate-100 dark:bg-slate-700 rounded">{v.unit}</span>}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-center">
                                            <p className="text-[10px] text-slate-400 italic">No se han definido variables para este ensayo.</p>
                                        </div>
                                    )}
                                </div>

                            </>
                        )}

                        {activeTab === 'results' && (
                            <div className="space-y-6">
                                {(!editedEvaluations.length || !editedVariables.length || !trial.treatments?.length || !trial.repetitions) ? (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 text-center text-amber-700 dark:text-amber-400">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-80" />
                                        <h4 className="font-semibold mb-1">Información Incompleta</h4>
                                        <p className="text-sm">Para cargar resultados necesitas definir Tratamientos, Variables, Cronograma de Evaluaciones y el número de Repeticiones del diseño experimental.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Selectors */}
                                        <div className="flex flex-col md:flex-row gap-4 mb-6">
                                            <div className="flex-1">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Momento de Evaluación</label>
                                                <select
                                                    value={selectedEvaluationId}
                                                    onChange={(e) => setSelectedEvaluationId(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm font-medium"
                                                >
                                                    <option value="" disabled>Seleccione una evaluación...</option>
                                                    {editedEvaluations.map((ev) => (
                                                        <option key={ev.id} value={ev.id}>{ev.name} ({ev.daysAfterApplication} DDA)</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Variable Evaluada</label>
                                                <select
                                                    value={selectedVariableId}
                                                    onChange={(e) => setSelectedVariableId(e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm font-medium"
                                                >
                                                    <option value="" disabled>Seleccione una variable...</option>
                                                    {editedVariables.map((v) => (
                                                        <option key={v.id} value={v.id}>{v.target} - {v.name} {v.unit ? `(${v.unit})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Matrix / Table */}
                                        {selectedEvaluationId && selectedVariableId ? (
                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                                            <tr>
                                                                <th className="px-4 py-3 font-semibold border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-50 dark:bg-slate-800/80 z-10 w-48">Tratamiento</th>
                                                                {Array.from({ length: trial.repetitions }).map((_, i) => (
                                                                    <th key={`rep-${i + 1}`} className="px-4 py-3 font-semibold text-center min-w-[100px]">R{i + 1}</th>
                                                                ))}
                                                                <th className="px-4 py-3 font-semibold text-center bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 min-w-[80px]">Promedio</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                                            {editedTreatments.map((t) => {
                                                                // Calculate average
                                                                const treatmentResults = Array.from({ length: trial.repetitions! }).map((_, i) => {
                                                                    const rId = `${selectedEvaluationId}_${selectedVariableId}_${t.id}_${i + 1}`;
                                                                    const res = editedResults.find(r => r.id === rId);
                                                                    return res ? parseFloat(res.value as string) : NaN;
                                                                }).filter(v => !isNaN(v));

                                                                const sum = treatmentResults.reduce((a, b) => a + b, 0);
                                                                const avg = treatmentResults.length > 0 ? (sum / treatmentResults.length).toFixed(2) : '-';

                                                                return (
                                                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 z-10">
                                                                            <div className="truncate" title={t.name}>{t.name}</div>
                                                                            <div className="text-xs text-slate-500 font-normal truncate" title={t.products?.map((p: Product) => p.product).join(' + ')}>
                                                                                {t.products?.[0]?.product || 'Sin producto'} {t.products?.length > 1 ? `+${t.products.length - 1}` : ''}
                                                                            </div>
                                                                        </td>
                                                                        {Array.from({ length: trial.repetitions! }).map((_, i) => {
                                                                            const repNum = i + 1;
                                                                            const rId = `${selectedEvaluationId}_${selectedVariableId}_${t.id}_${repNum}`;
                                                                            const res = editedResults.find(r => r.id === rId);
                                                                            return (
                                                                                <td key={`cell-${t.id}-${repNum}`} className="px-2 py-2">
                                                                                    <input
                                                                                        type="number"
                                                                                        step="0.01"
                                                                                        value={res?.value ?? ''}
                                                                                        onChange={(e) => handleResultChange(t.id, repNum, e.target.value)}
                                                                                        className="w-full px-2 py-1.5 text-center text-sm rounded border focus:ring-1 focus:ring-blue-500 transition-colors bg-slate-50 border-slate-300 focus:bg-white dark:bg-slate-900 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                                                                                        placeholder="-"
                                                                                    />
                                                                                </td>
                                                                            );
                                                                        })}
                                                                        <td className="px-4 py-3 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-900/10">
                                                                            {avg}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        )}

                        {activeTab === 'docs' && (
                            <div className="space-y-10 py-2">
                                {/* Summary / Report Stage */}
                                {trial.status === 'completado' && (
                                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 shadow-sm border-l-4 border-l-green-500">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                                                    <CheckCircle className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 italic tracking-tight">INFORME FINAL DISPONIBLE</h3>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400">Este ensayo ha finalizado su ciclo y el reporte consolidado ha sido generado.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => alert('Abriendo Informe Final Consolidado...')}
                                                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 dark:shadow-none transition-all flex items-center gap-2 group active:scale-95"
                                            >
                                                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                                                Descargar Reporte Final
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Section: Photos */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Camera className="w-5 h-5 text-blue-500" />
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Registro Fotográfico del Ensayo</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleAddAttachment('foto')}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-full transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Adjuntar Foto
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {editedAttachments.filter(a => a.type === 'foto').length > 0 ? (
                                            editedAttachments.filter(a => a.type === 'foto').map(photo => (
                                                <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                    <div className="absolute inset-0 flex items-center justify-center text-slate-300 dark:text-slate-700">
                                                        <Camera className="w-10 h-10 opacity-20" />
                                                    </div>
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                                        <p className="text-[10px] text-white font-medium truncate">{photo.name}</p>
                                                        <p className="text-[8px] text-white/60">{photo.uploadDate}</p>
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                        <button className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-md">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleRemoveAttachment(photo.id)} className="p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full text-white">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                                                <Camera className="w-12 h-12 opacity-10 mb-2" />
                                                <p className="text-sm">Sin fotografías capturadas aún.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Section: Documents */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <File className="w-5 h-5 text-amber-500" />
                                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Documentos y Archivos Anexos</h3>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleAddAttachment('documento')}
                                            className="text-xs font-bold text-amber-600 hover:text-amber-700 dark:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-full transition-colors"
                                        >
                                            <Plus className="w-3.5 h-3.5" /> Adjuntar Documento
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {editedAttachments.filter(a => a.type === 'documento').length > 0 ? (
                                            editedAttachments.filter(a => a.type === 'documento').map(doc => (
                                                <div key={doc.id} className="group flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow">
                                                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{doc.name}</p>
                                                        <p className="text-[10px] text-slate-500">{doc.uploadDate}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors">
                                                            <Download className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleRemoveAttachment(doc.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400">
                                                <UploadCloud className="w-12 h-12 opacity-10 mb-2" />
                                                <p className="text-sm italic">Cargue archivos PDF, Excel o Word relevantes.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center rounded-b-2xl">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    if (window.confirm('¿Está seguro de eliminar este ensayo? Esta acción no se puede deshacer.')) {
                                        if (onDelete) onDelete(trial.id);
                                        onClose();
                                    }
                                }}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                title="Eliminar Ensayo"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex gap-3">
                            {/* NEW: Navigation Buttons */}
                            <button
                                onClick={() => {
                                    if (activeTab === 'results') setActiveTab('design');
                                    else if (activeTab === 'docs') setActiveTab('results');
                                }}
                                disabled={activeTab === 'design'}
                                className={`flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors shadow-sm ${activeTab === 'design' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                            >
                                ← Anterior
                            </button>
                            <button
                                onClick={() => {
                                    if (activeTab === 'design') setActiveTab('results');
                                    else if (activeTab === 'results') setActiveTab('docs');
                                }}
                                disabled={activeTab === 'docs'}
                                className={`flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors shadow-sm ${activeTab === 'docs' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                            >
                                Siguiente →
                            </button>

                            {isEditing || activeTab === 'results' ? (
                                <button
                                    onClick={handleSave}
                                    className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm ml-2"
                                >
                                    <Save className="w-4 h-4 mr-2" />
                                    Guardar {activeTab === 'results' ? 'Resultados' : 'Cambios'}
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowQuotationPDF(true)}
                                    className="flex items-center px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors shadow-sm ml-2"
                                >
                                    <FileText className="w-4 h-4 mr-2 text-red-500" />
                                    Exportar a PDF
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quotation PDF Preview Modal */}
                    {showQuotationPDF && (
                        <QuotationPDF
                            trial={{
                                ...trial,
                                quotePriceNoYield,
                                quotePriceWithYield,
                                quoteIncludeYield,
                                quoteLogistics,
                                quoteOtherExpenses,
                                quoteNotes,
                                quoteCurrency,
                                treatments: editedTreatments,
                                variables: editedVariables,
                                repetitions: editedRepetitions,
                                experimentalDesign: editedExperimentalDesign
                            }}
                            onClose={() => setShowQuotationPDF(false)}
                        />
                    )}

                </div>

                {/* Sidebar Chat Integration */}
                {isChatSidebarOpen && (
                    <div className="w-80 border-l border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden">
                        <SidebarChat
                            linkedTrialId={trial.id}
                            title={`Ensayo: ${trial.title}`}
                            subtitle={trial.client}
                            onClose={() => setIsChatSidebarOpen(false)}
                        />
                    </div>
                )}
                {isHistoryOpen && (
                    <HistoryModal 
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                        entityId={trial.id}
                        entityTitle={trial.title}
                    />
                )}
            </div>
        </div >
    );
}
