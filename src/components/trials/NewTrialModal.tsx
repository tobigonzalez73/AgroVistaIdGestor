import { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, MapPin, Users, Layers, AlertCircle, Variable, Plus, Bug, Leaf, Sprout, Activity, Clock, Settings, Save, FileText, ShieldCheck, History, Trash2 } from 'lucide-react';
import { SENASA_VADEMECUM } from '../../data/vademecum';
import { useAudit } from '../../context/AuditContext';
import HistoryModal from '../common/HistoryModal';
import type { EvaluationVariable, Evaluation, PlannedApplication, Trial, Treatment, Product, TrialMilestone } from '../../types/trial';
import { useAppContext } from '../../context/AppContext';
import { useGeo } from '../../context/GeoContext';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/UserContext';
import { useNotifications } from '../../context/NotificationContext';
import { db } from '../../firebase';
import { collection, doc } from 'firebase/firestore';
import type { Approval } from '../../types/user';

// Defined local form data interface
interface TrialFormData {
    title: string;
    client: string;
    location: string;
    startDate: string;
    endDate: string;
    objective: string;
    hectares: string;
    crop: string;
    repetitions: number;
    experimentalDesign: string;
    quotePriceNoYield?: number;
    quotePriceWithYield?: number;
    quoteIncludeYield?: boolean;
    quoteLogistics?: number;
    quoteOtherExpenses?: number;
    quoteNotes?: string;
    quoteCurrency?: 'USD' | 'ARS';
}

interface NewTrialModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (trialData: Record<string, any>) => void;
    editingTrial?: Trial | null;
}

export default function NewTrialModal({ isOpen, onClose, onSave, editingTrial }: NewTrialModalProps) {
    const { establishments, plots } = useGeo();
    const { entities } = useFinance();
    const { customProducts, addCustomProduct } = useAppContext();
    const { users, currentUser } = useAuth();
    const { addNotification } = useNotifications();
    const { logAction } = useAudit();
    const [activeTab, setActiveTab] = useState<'general' | 'treatments' | 'variables'>('general');
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);



    const [treatments, setTreatments] = useState<Treatment[]>(editingTrial?.treatments || [
        {
            id: doc(collection(db, 'treatments')).id,
            name: 'T0 (Testigo)',
            products: [{ id: doc(collection(db, 'treatment_products')).id, product: 'Testigo Absoluto', activeIngredient: 'N/A', dose: '0', unit: 'N/A', family: 'Otro' }],
            applicationIds: []
        },
        {
            id: doc(collection(db, 'treatments')).id,
            name: 'T1',
            products: [{ id: doc(collection(db, 'treatment_products')).id, product: '', activeIngredient: '', dose: '', unit: 'L/ha', family: '' }],
            applicationIds: ['p1']
        }
    ]);

    const [variables, setVariables] = useState<EvaluationVariable[]>(editingTrial?.variables || [
        { id: 'v1', category: 'insecto', target: '', name: '', unit: '%' },
        { id: 'v2', category: 'enfermedad', target: '', name: '', unit: '%' },
        { id: 'v3', category: 'maleza', target: '', name: '', unit: '%' }
    ]);

    const [evaluations, setEvaluations] = useState<Evaluation[]>(editingTrial?.evaluations || [
        {
            id: 'e1',
            name: '0 DDA (Previa)',
            daysAfterApplication: 0
        },
        {
            id: 'e2',
            name: '7 DDA',
            daysAfterApplication: 7
        }
    ]);
    const [editingApplication, setEditingApplication] = useState<{ treatmentId: string | number; appId: string } | null>(null);
    const [plannedApplications, setPlannedApplications] = useState<PlannedApplication[]>(editingTrial?.plannedApplications || [
        { id: 'p1', name: 'A1 (Inicial)', daysAfterStart: 0 }
    ]);
    const [milestones, setMilestones] = useState<TrialMilestone[]>(editingTrial?.milestones || []);

    const [formData, setFormData] = useState<TrialFormData & { clientId?: string; establishmentId?: string; plotId?: string }>({
        title: editingTrial?.title || '',
        client: editingTrial?.client || '',
        clientId: editingTrial?.clientId || '',
        location: editingTrial?.location || '',
        establishmentId: editingTrial?.establishmentId || '',
        plotId: editingTrial?.plotId || '',
        startDate: editingTrial?.date || '',
        endDate: '',
        objective: editingTrial?.objective || '',
        hectares: editingTrial?.hectares || '',
        crop: editingTrial?.crop || '',
        repetitions: editingTrial?.repetitions || 4,
        experimentalDesign: editingTrial?.experimentalDesign || 'dbca',
        quotePriceNoYield: editingTrial?.quotePriceNoYield || 0,
        quotePriceWithYield: editingTrial?.quotePriceWithYield || 0,
        quoteIncludeYield: editingTrial?.quoteIncludeYield || false,
        quoteLogistics: editingTrial?.quoteLogistics || 0,
        quoteOtherExpenses: editingTrial?.quoteOtherExpenses || 0,
        quoteNotes: editingTrial?.quoteNotes || '',
        quoteCurrency: editingTrial?.quoteCurrency || 'USD'
    });

    // Sync state when editingTrial changes or modal opens
    useEffect(() => {
        if (isOpen && editingTrial) {
            setFormData({
                title: editingTrial.title || '',
                client: editingTrial.client || editingTrial.clientName || '',
                clientId: editingTrial.clientId || '',
                location: editingTrial.location || editingTrial.plotName || '',
                establishmentId: editingTrial.establishmentId || '',
                plotId: editingTrial.plotId || '',
                startDate: editingTrial.date || '',
                endDate: '',
                objective: editingTrial.objective || '',
                hectares: editingTrial.hectares || '',
                crop: editingTrial.crop || '',
                repetitions: editingTrial.repetitions || 4,
                experimentalDesign: editingTrial.experimentalDesign || 'dbca',
                quotePriceNoYield: editingTrial.quotePriceNoYield || 0,
                quotePriceWithYield: editingTrial.quotePriceWithYield || 0,
                quoteIncludeYield: editingTrial.quoteIncludeYield || false,
                quoteLogistics: editingTrial.quoteLogistics || 0,
                quoteOtherExpenses: editingTrial.quoteOtherExpenses || 0,
                quoteNotes: editingTrial.quoteNotes || '',
                quoteCurrency: editingTrial.quoteCurrency || 'USD'
            });

            setTreatments(editingTrial.treatments || []);
            setVariables(editingTrial.variables || []);
            setEvaluations(editingTrial.evaluations || []);
            setPlannedApplications(editingTrial.plannedApplications || []);
            setMilestones(editingTrial.milestones || []);
            setActiveTab('general');
        } else if (isOpen && !editingTrial) {
            // Check for draft in localStorage
            const draft = localStorage.getItem('new_trial_draft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    setFormData(parsed.formData || {
                        title: '',
                        client: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        objective: '',
                        hectares: '',
                        crop: '',
                        repetitions: 4,
                        experimentalDesign: 'dbca',
                        quoteCurrency: 'USD'
                    });
                    setTreatments(parsed.treatments || []);
                    setVariables(parsed.variables || []);
                    setEvaluations(parsed.evaluations || []);
                    setPlannedApplications(parsed.plannedApplications || []);
                    setMilestones(parsed.milestones || []);
                    addNotification({
                        userId: currentUser.id,
                        title: 'Borrador Recuperado',
                        message: 'Se ha recuperado un borrador guardado automáticamente.',
                        type: 'info'
                    });
                } catch (e) {
                    console.error("Error parsing trial draft", e);
                    // If parsing fails, clear the corrupted draft and reset to defaults
                    localStorage.removeItem('new_trial_draft');
                    setFormData({
                        title: '',
                        client: '',
                        location: '',
                        startDate: '',
                        endDate: '',
                        objective: '',
                        hectares: '',
                        crop: '',
                        repetitions: 4,
                        experimentalDesign: 'dbca',
                        quoteCurrency: 'USD'
                    });
                    setTreatments([
                        {
                            id: doc(collection(db, 'treatments')).id,
                            name: 'T0 (Testigo)',
                            products: [{ id: doc(collection(db, 'treatment_products')).id, product: 'Testigo Absoluto', activeIngredient: 'N/A', dose: '0', unit: 'N/A', family: 'Otro' }],
                            applicationIds: []
                        },
                        {
                            id: doc(collection(db, 'treatments')).id,
                            name: 'T1',
                            products: [{ id: doc(collection(db, 'treatment_products')).id, product: '', activeIngredient: '', dose: '', unit: 'L/ha', family: '' }],
                            applicationIds: ['p1']
                        }
                    ]);
                    setVariables([
                        { id: 'v1', category: 'insecto', target: '', name: '', unit: '%' },
                        { id: 'v2', category: 'enfermedad', target: '', name: '', unit: '%' },
                        { id: 'v3', category: 'maleza', target: '', name: '', unit: '%' }
                    ]);
                    setEvaluations([
                        { id: 'e1', name: '0 DDA (Previa)', daysAfterApplication: 0 },
                        { id: 'e2', name: '7 DDA', daysAfterApplication: 7 }
                    ]);
                    setPlannedApplications([
                        { id: 'p1', name: 'A1 (Inicial)', daysAfterStart: 0 }
                    ]);
                    setMilestones([]);
                    addNotification({
                        userId: currentUser.id,
                        title: 'Error al Recuperar Borrador',
                        message: 'El borrador guardado estaba corrupto y ha sido eliminado. Se ha iniciado un nuevo formulario.',
                        type: 'error'
                    });
                }
            } else {
                // Reset to defaults for a new trial only if no draft
                setFormData({
                    title: '',
                    client: '',
                    location: '',
                    startDate: '',
                    endDate: '',
                    objective: '',
                    hectares: '',
                    crop: '',
                    repetitions: 4,
                    experimentalDesign: 'dbca',
                    quoteCurrency: 'USD'
                });

                setTreatments([
                    {
                        id: doc(collection(db, 'treatments')).id,
                        name: 'T0 (Testigo)',
                        products: [{ id: doc(collection(db, 'treatment_products')).id, product: 'Testigo Absoluto', activeIngredient: 'N/A', dose: '0', unit: 'N/A', family: 'Otro' }],
                        applicationIds: []
                    },
                    {
                        id: doc(collection(db, 'treatments')).id,
                        name: 'T1',
                        products: [{ id: doc(collection(db, 'treatment_products')).id, product: '', activeIngredient: '', dose: '', unit: 'L/ha', family: '' }],
                        applicationIds: ['p1']
                    }
                ]);
                setVariables([
                    { id: 'v1', category: 'insecto', target: '', name: '', unit: '%' },
                    { id: 'v2', category: 'enfermedad', target: '', name: '', unit: '%' },
                    { id: 'v3', category: 'maleza', target: '', name: '', unit: '%' }
                ]);
                setEvaluations([
                    { id: 'e1', name: '0 DDA (Previa)', daysAfterApplication: 0 },
                    { id: 'e2', name: '7 DDA', daysAfterApplication: 7 }
                ]);
                setPlannedApplications([
                    { id: 'p1', name: 'A1 (Inicial)', daysAfterStart: 0 }
                ]);
                setMilestones([]);
            }
            setActiveTab('general');
        }
    }, [isOpen, editingTrial]);

    // Autosave useEffect
    useEffect(() => {
        if (isOpen && !editingTrial) {
            const timeoutId = setTimeout(() => {
                const draft = {
                    formData,
                    treatments,
                    variables,
                    evaluations,
                    plannedApplications,
                    milestones
                };
                localStorage.setItem('new_trial_draft', JSON.stringify(draft));
            }, 1000); // Save every 1 second of inactivity
            return () => clearTimeout(timeoutId);
        }
    }, [isOpen, editingTrial, formData, treatments, variables, evaluations, plannedApplications]);

    const clearDraft = () => {
        localStorage.removeItem('new_trial_draft');
        setFormData({
            title: '',
            client: '',
            location: '',
            startDate: '',
            endDate: '',
            objective: '',
            hectares: '',
            crop: '',
            repetitions: 4,
            experimentalDesign: 'dbca',
            quoteCurrency: 'USD'
        });
        setTreatments([
            {
                id: doc(collection(db, 'treatments')).id,
                name: 'T0 (Testigo)',
                products: [{ id: doc(collection(db, 'treatment_products')).id, product: 'Testigo Absoluto', activeIngredient: 'N/A', dose: '0', unit: 'N/A', family: 'Otro' }],
                applicationIds: []
            },
            {
                id: doc(collection(db, 'treatments')).id,
                name: 'T1',
                products: [{ id: doc(collection(db, 'treatment_products')).id, product: '', activeIngredient: '', dose: '', unit: 'L/ha', family: '' }],
                applicationIds: ['p1']
            }
        ]);
        setVariables([
            { id: 'v1', category: 'insecto', target: '', name: '', unit: '%' },
            { id: 'v2', category: 'enfermedad', target: '', name: '', unit: '%' },
            { id: 'v3', category: 'maleza', target: '', name: '', unit: '%' }
        ]);
        setEvaluations([
            { id: 'e1', name: '0 DDA (Previa)', daysAfterApplication: 0 },
            { id: 'e2', name: '7 DDA', daysAfterApplication: 7 }
        ]);
        setPlannedApplications([
            { id: 'p1', name: 'A1 (Inicial)', daysAfterStart: 0 }
        ]);
        setMilestones([]);
        addNotification({
            userId: currentUser.id,
            title: 'Borrador Eliminado',
            message: 'El borrador actual ha sido eliminado y el formulario se ha reiniciado.',
            type: 'info'
        });
    };

    if (!isOpen) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev: TrialFormData) => ({ 
            ...prev, 
            [name]: type === 'number' ? Number(value) : value 
        }));
    };

    const handleAddTreatment = () => {
        setTreatments((prev: Treatment[]) => {
            const newId = doc(collection(db, 'treatments')).id; // Ensure unique ID
            return [
                ...prev,
                {
                    id: newId,
                    name: `T${prev.length}`,
                    products: [{ id: doc(collection(db, 'treatment_products')).id, product: '', activeIngredient: '', dose: '', unit: 'L/ha', family: '' }],
                    applicationIds: plannedApplications.length > 0 ? [plannedApplications[0].id] : []
                }
            ];
        });
    };

    const handleToggleTreatmentApp = (treatmentId: string | number, appId: string) => {
        setTreatments((prev: Treatment[]) => prev.map(t => {
            if (t.id === treatmentId) {
                const currentIds = t.applicationIds || [];
                const isFound = currentIds.includes(appId);
                const newIds = isFound
                    ? currentIds.filter((id: string) => id !== appId)
                    : [...currentIds, appId];

                // If we are deactivating, and it's the one currently being edited, close editing
                if (isFound && editingApplication?.treatmentId === treatmentId && editingApplication?.appId === appId) {
                    setEditingApplication(null);
                }

                return { ...t, applicationIds: newIds };
            }
            return t;
        }));
    };

    const handleTreatmentNameChange = (id: string | number, value: string) => {
        setTreatments((prev: Treatment[]) => prev.map(t => t.id === id ? { ...t, name: value } : t));
    };

    const handleRemoveTreatment = (id: string | number) => {
        if (treatments.length === 1) return; // keep at least one
        setTreatments((prev: Treatment[]) => prev.filter(t => t.id !== id));
    };

    // --- Product Mix Handlers ---
    const handleAddProductToTreatment = (treatmentId: string | number) => {
        setTreatments((prev: Treatment[]) => prev.map(t => {
            if (t.id === treatmentId) {
                // Generate a more robust ID for local state to avoid collisions
                const newId = doc(collection(db, 'treatment_products')).id;
                return { ...t, products: [...t.products, { id: newId, product: '', activeIngredient: '', dose: '', unit: 'L/ha', family: '' }] };
            }
            return t;
        }));
    };

    const handleProductChange = (treatmentId: string | number, productId: string | number, field: string, value: string | boolean) => {
        setTreatments((prev: Treatment[]) => prev.map(t => {
            if (t.id === treatmentId) {
                return {
                    ...t,
                    products: t.products.map((p: Product) => {
                        if (p.id === productId) {
                            let updatedProd = { ...p, [field]: value };
                            
                            // Autocompletion logic for SENASA + Custom Vademecum
                            if (field === 'product' && typeof value === 'string') {
                                const allVademecum = [...SENASA_VADEMECUM, ...customProducts];
                                const matchedProduct = allVademecum.find(vp => vp.name.toLowerCase() === value.toLowerCase());
                                if (matchedProduct) {
                                    updatedProd.activeIngredient = matchedProduct.activeIngredient;
                                    updatedProd.family = matchedProduct.family as import('../../types/trial').ProductFamily;
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

    const handleRemoveProductFromTreatment = (treatmentId: string | number, productId: string | number) => {
        setTreatments((prev: Treatment[]) => prev.map(t => {
            if (t.id === treatmentId) {
                // Prevent deleting the last product line if it's the only one
                if (t.products.length <= 1) return t;
                return { ...t, products: t.products.filter((p: Product) => p.id !== productId) };
            }
            return t;
        }));
    };

    const handleOverrideDose = (treatmentId: string | number, appId: string, productId: string | number, field: 'dose' | 'unit', value: string) => {
        setTreatments((prev: Treatment[]) => prev.map(t => {
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
        setVariables((prev: EvaluationVariable[]) => [
            ...prev,
            { id: doc(collection(db, 'trial_variables')).id, category: 'insecto', target: '', name: '', unit: '' }
        ]);
    };

    const handleVariableChange = (id: string, field: keyof EvaluationVariable, value: string) => {
        setVariables((prev: EvaluationVariable[]) => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
    };

    const handleRemoveVariable = (id: string) => {
        setVariables((prev: EvaluationVariable[]) => prev.filter(v => v.id !== id));
    };

    const handleAddEvaluation = () => {
        const lastApp = plannedApplications[plannedApplications.length - 1];
        setEvaluations((prev: Evaluation[]) => [
            ...prev,
            { 
                id: doc(collection(db, 'trial_evaluations')).id, 
                name: '', 
                daysAfterApplication: 7,
                referenceType: lastApp ? 'protocol' : 'init',
                referenceId: lastApp ? lastApp.id : '',
                isVariable: true
            }
        ]);
    };

    const handleEvaluationChange = (id: string, field: keyof Evaluation, value: string | number | boolean) => {
        setEvaluations((prev: Evaluation[]) => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    const handleToggleEvaluationVariable = (id: string) => {
        setEvaluations((prev: Evaluation[]) => prev.map(e => 
            e.id === id ? { ...e, isVariable: !e.isVariable } : e
        ));
    };

    const handleRemoveEvaluation = (id: string) => {
        setEvaluations((prev: Evaluation[]) => prev.filter(e => e.id !== id));
    };

    const handleAddMilestone = () => {
        setMilestones((prev: TrialMilestone[]) => [
            ...prev,
            { id: doc(collection(db, 'trial_milestones')).id, name: '', type: 'labor', isVariable: true }
        ]);
    };

    const handleMilestoneChange = (id: string, field: keyof TrialMilestone, value: any) => {
        setMilestones((prev: TrialMilestone[]) => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleRemoveMilestone = (id: string) => {
        setMilestones((prev: TrialMilestone[]) => prev.filter(m => m.id !== id));
    };

    const handlePlannedAppChange = (id: string, field: keyof PlannedApplication, value: string | number | boolean) => {
        setPlannedApplications((prev: PlannedApplication[]) => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };

    const handleTogglePlannedAppVariable = (id: string) => {
        setPlannedApplications((prev: PlannedApplication[]) => prev.map(p => 
            p.id === id ? { ...p, isVariable: !p.isVariable } : p
        ));
    };

    const handleRemovePlannedApp = (id: string) => {
        setPlannedApplications((prev: PlannedApplication[]) => prev.filter(p => p.id !== id));
    };

    const handleQuickAddApp = () => {
        const nextNum = plannedApplications.length + 1;
        const newAppId = doc(collection(db, 'planned_apps')).id;
        const prevApp = plannedApplications[plannedApplications.length - 1];
        
        const newApp: PlannedApplication = {
            id: newAppId,
            name: `A${nextNum}`,
            daysAfterStart: (prevApp?.daysAfterStart || 0) + 7,
            daysAfterReference: 7,
            referenceType: prevApp ? 'protocol' : 'init',
            referenceId: prevApp ? prevApp.id : '',
            isVariable: prevApp ? true : false
        };

        setPlannedApplications(prev => [...prev, newApp]);
    };

    const handleSetAppCount = (count: number) => {
        const currentCount = plannedApplications.length;
        if (count > currentCount) {
            const newApps: PlannedApplication[] = [];
            for (let i = currentCount; i < count; i++) {
                const prevApp = i === 0 ? null : (newApps[i - currentCount - 1] || plannedApplications[currentCount - 1]);
                newApps.push({
                    id: doc(collection(db, 'planned_apps')).id,
                    name: `A${i + 1}`,
                    daysAfterStart: i === 0 ? 0 : (prevApp?.daysAfterStart || 0) + 7,
                    daysAfterReference: i === 0 ? 0 : 7,
                    referenceType: prevApp ? 'protocol' : 'init',
                    referenceId: prevApp ? prevApp.id : '',
                    isVariable: i === 0 ? false : true
                });
            }
            setPlannedApplications(prev => [...prev, ...newApps]);
        } else if (count < currentCount && count >= 0) {
            const removedIds = plannedApplications.slice(count).map(a => a.id);
            setPlannedApplications(prev => prev.slice(0, count));
            setTreatments(prev => prev.map(t => ({
                ...t,
                applicationIds: (t.applicationIds || []).filter(id => !removedIds.includes(id))
            })));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Automatically assign ONLY users specifically configured to authorize 'ensayos'
        const ensayosAuthorizers = users.filter(u => u.isActive && (u.modules || []).includes('ensayos'));

        const approvals: Approval[] = ensayosAuthorizers.map(u => {
            const existing = editingTrial?.approvals?.find(a => a.userId === u.id);
            return existing || { userId: u.id, status: 'pending' };
        });

        onSave({
            ...(editingTrial || {}),
            ...formData,
            // Ensure both ID and Name are saved for robustness
            clientId: formData.clientId,
            clientName: formData.client,
            establishmentId: formData.establishmentId,
            establishmentName: establishments.find(e => e.id === formData.establishmentId)?.name || '',
            plotId: formData.plotId,
            plotName: plots.find(p => p.id === formData.plotId)?.name || '',
            
            date: formData.startDate,

            treatments,
            variables,
            evaluations,
            plannedApplications,
            milestones,
            approvals
        });

        // 3. Save new products to custom vademecum
        const allVademecum = [...SENASA_VADEMECUM, ...customProducts];
        treatments.forEach(t => {
            t.products.forEach(p => {
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
        });

        // Notifications
        if (!editingTrial) {
            // To requester
            addNotification({
                userId: currentUser.id,
                title: 'Ensayo Creado',
                message: `Has creado el ensayo "${formData.title}". Se ha enviado el pedido de autorización.`,
                type: 'success',
                link: '/ensayos'
            });

            // To authorizers
            ensayosAuthorizers.forEach(auth => {
                addNotification({
                    userId: auth.id,
                    title: 'Autorización Pendiente',
                    message: `${currentUser?.name || currentUser?.email || 'Usuario'} ha creado un nuevo ensayo: "${formData.title}" y requiere tu firma.`,
                    type: 'approval',
                    link: '/ensayos'
                });
            });
            // Clear draft after successful creation
            localStorage.removeItem('new_trial_draft');
        }

        logAction({
            userId: currentUser.id,
            userName: currentUser.name,
            action: editingTrial ? 'update' : 'create',
            module: 'ensayos',
            entityId: editingTrial?.id || doc(collection(db, 'trials')).id,
            entityName: formData.title,
            details: editingTrial ? 'Se actualizaron los datos del ensayo' : 'Se creó un nuevo ensayo'
        });

        onClose();
    };

    // Compute approval status for displaying badge
    const approvalStatus = (() => {
        if (!editingTrial?.approvals || editingTrial.approvals.length === 0) return null;
        const all = editingTrial.approvals;
        if (all.every(a => a.status === 'approved')) return 'approved';
        if (all.some(a => a.status === 'rejected')) return 'rejected';
        return 'pending';
    })();



    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            {editingTrial ? 'Editar Ensayo' : 'Nuevo Ensayo'}
                        </h3>
                        {approvalStatus && (
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                approvalStatus === 'approved'
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : approvalStatus === 'rejected'
                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            }`}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                {approvalStatus === 'approved' ? 'Autorizado' : approvalStatus === 'rejected' ? 'Rechazado' : 'Pendiente de autorizar'}
                            </span>
                        )}
                        {editingTrial && (
                            <button 
                                onClick={() => setIsHistoryOpen(true)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                                title="Ver historial de cambios"
                            >
                                <History className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
                    <button
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center ${activeTab === 'general' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        <span>1. Diseño Principal</span>
                        <span className="text-xs font-normal opacity-70">Ubicación y Repeticiones</span>
                    </button>
                    <button
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center ${activeTab === 'treatments' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        onClick={() => setActiveTab('treatments')}
                    >
                        <span>2. Protocolo y Tratamientos</span>
                        <span className="text-xs font-normal opacity-70">Esquema, Protocolo y Cronograma</span>
                    </button>
                    <button
                        className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex flex-col items-center ${activeTab === 'variables' ? 'border-green-500 text-green-600 dark:text-green-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        onClick={() => setActiveTab('variables')}
                    >
                        <span>3. Análisis de Variables</span>
                        <span className="text-xs font-normal opacity-70">Enfermedades, Plagas y Objetivos</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
                    <form id="trial-form" onSubmit={handleSubmit}>

                        {activeTab === 'general' && (
                            <div className="space-y-6">
                                {/* Section 1: Topography */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Título del Ensayo *</label>
                                        <input required type="text" name="title" value={formData.title} onChange={handleInputChange} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-slate-900 dark:text-slate-100" placeholder="Ej: Eficacia Herbicida en Maíz Tardío" />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                <Users className="w-4 h-4 mr-1.5 text-slate-400" /> Cliente / Patrocinador *
                                            </label>
                                            <select 
                                                required 
                                                name="client" 
                                                value={formData.clientId} 
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const entity = entities.find(ent => ent.id === id);
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        clientId: id, 
                                                        client: entity?.name || '' 
                                                    }));
                                                }} 
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100"
                                            >
                                                <option value="">Seleccione un cliente...</option>
                                                {entities
                                                    .filter(e => e.type === 'client' || e.type === 'both')
                                                    .map(e => (
                                                        <option key={e.id} value={e.id}>{e.name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>

                                        <div>
                                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                <Sprout className="w-4 h-4 mr-1.5 text-slate-400" /> Cultivo *
                                            </label>
                                            <input 
                                                required 
                                                type="text" 
                                                name="crop" 
                                                value={formData.crop} 
                                                onChange={handleInputChange} 
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100" 
                                                placeholder="Ej: Trigo, Maíz, Soja..." 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                <MapPin className="w-4 h-4 mr-1.5 text-slate-400" /> Establecimiento (Campo) *
                                            </label>
                                            <select 
                                                required 
                                                name="establishmentId" 
                                                value={formData.establishmentId} 
                                                onChange={(e) => {
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        establishmentId: e.target.value,
                                                        plotId: '' // Reset plot when establishment changes
                                                    }));
                                                }} 
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100"
                                            >
                                                <option value="">Seleccione un campo...</option>
                                                {establishments.map(est => (
                                                    <option key={est.id} value={est.id}>{est.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                <Layers className="w-4 h-4 mr-1.5 text-slate-400" /> Lote Específico *
                                            </label>
                                            <select 
                                                required 
                                                name="plotId" 
                                                value={formData.plotId} 
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    const plot = plots.find(p => p.id === id);
                                                    setFormData(prev => ({ 
                                                        ...prev, 
                                                        plotId: id,
                                                        location: plot?.name || '' 
                                                    }));
                                                }} 
                                                disabled={!formData.establishmentId}
                                                className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100 disabled:opacity-50"
                                            >
                                                <option value="">{formData.establishmentId ? 'Seleccione el lote...' : 'Primero elija el campo'}</option>
                                                {plots
                                                    .filter(p => p.establishmentId === formData.establishmentId)
                                                    .map(plot => (
                                                        <option key={plot.id} value={plot.id}>{plot.name} ({plot.hectares} ha)</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>


                                    {/* Quotation Pricing Preview for New Trials */}
                                    <div className="col-span-full mt-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                                            <h3 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Presupuesto Estimado</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                            <div className="relative">
                                                <label className="block text-[10px] font-bold text-amber-700/70 uppercase mb-1">Precio s/Rinde</label>
                                                <span className="absolute left-3 bottom-2 text-amber-500 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    value={formData.quotePriceNoYield}
                                                    onChange={(e) => setFormData(p => ({ ...p, quotePriceNoYield: Number(e.target.value) }))}
                                                    className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-900 dark:text-white"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="block text-[10px] font-bold text-amber-700/70 uppercase mb-1">Precio c/Rinde</label>
                                                <span className="absolute left-3 bottom-2 text-amber-500 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    value={formData.quotePriceWithYield}
                                                    onChange={(e) => setFormData(p => ({ ...p, quotePriceWithYield: Number(e.target.value) }))}
                                                    className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-900 dark:text-white"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-amber-700/70 uppercase mb-1">Evaluación</label>
                                                <div className="flex bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-amber-200 dark:border-slate-700">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, quoteIncludeYield: false }))}
                                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${!formData.quoteIncludeYield ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}
                                                    >
                                                        Base
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData(p => ({ ...p, quoteIncludeYield: true }))}
                                                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${formData.quoteIncludeYield ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}
                                                    >
                                                        + Rinde
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="relative">
                                                <label className="block text-[10px] font-bold text-amber-700/70 uppercase mb-1">Gastos (Log. + Otros)</label>
                                                <span className="absolute left-3 bottom-2 text-amber-500 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    value={(formData.quoteLogistics || 0) + (formData.quoteOtherExpenses || 0)}
                                                    onChange={(e) => setFormData(p => ({ ...p, quoteLogistics: Number(e.target.value), quoteOtherExpenses: 0 }))}
                                                    className="w-full pl-8 pr-4 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-900 dark:text-white"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="relative">
                                                <label className="block text-[10px] font-bold text-amber-700/70 uppercase mb-1">Moneda</label>
                                                <select
                                                    value={formData.quoteCurrency}
                                                    onChange={(e) => setFormData(p => ({ ...p, quoteCurrency: e.target.value as 'USD' | 'ARS' }))}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-sm font-bold text-slate-900 dark:text-white"
                                                >
                                                    <option value="USD">USD ($)</option>
                                                    <option value="ARS">ARS ($)</option>
                                                </select>
                                            </div>

                                            <div className="bg-white dark:bg-slate-900/50 rounded-lg p-3 border border-amber-100 dark:border-slate-800 h-[42px] flex flex-col justify-center">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-[10px] font-bold text-amber-600">TOTAL:</span>
                                                    <div className="text-right">
                                                        <span className="text-lg font-black text-slate-900 dark:text-white leading-none">
                                                            {(formData.quoteCurrency === 'USD' ? '$' : '$')} {(
                                                                ((Number(formData.quoteIncludeYield ? (formData.quotePriceWithYield || 0) : (formData.quotePriceNoYield || 0)) || 0) * (treatments?.length || 0)) +
                                                                (Number(formData.quoteLogistics) || 0) +
                                                                (Number(formData.quoteOtherExpenses) || 0)
                                                            ).toLocaleString()}
                                                        </span>
                                                        <span className="text-[8px] text-slate-400 ml-1">{formData.quoteCurrency}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <label className="block text-[10px] font-bold text-amber-700/70 uppercase mb-1">Aclaraciones de Presupuesto</label>
                                            <textarea
                                                value={formData.quoteNotes}
                                                onChange={(e) => setFormData(p => ({ ...p, quoteNotes: e.target.value }))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 text-xs italic"
                                                placeholder="Detalle de gastos, viáticos o condiciones de la cotización..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                            <CalendarIcon className="w-4 h-4 mr-1.5 text-slate-400" /> Fecha Planificada Inicial
                                        </label>
                                        <input required type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100" />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cultivo / Variedad</label>
                                        <input required type="text" name="crop" value={formData.crop} onChange={handleInputChange} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100" placeholder="Ej: Maíz DK72-10" />
                                    </div>


                                </div>

                                {/* Section 2: Experimental Design */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                                        <Variable className="w-5 h-5 mr-2 text-blue-500" />
                                        Parámetros Analíticos y de Diseño
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Diseño Estadístico *</label>
                                            <select required name="experimentalDesign" value={formData.experimentalDesign} onChange={handleInputChange} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100">
                                                <option value="dbca">Diseño en Bloques Completamente Aleatorizados (DBCA)</option>
                                                <option value="dca">Diseño Completamente Aleatorizado (DCA)</option>
                                                <option value="parcelas_divididas">Parcelas Divididas (Split-Plot)</option>
                                                <option value="cuadrado_latino">Cuadrado Latino</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cantidad de Repeticiones (Bloques) *</label>
                                            <input required type="number" min="1" max="20" name="repetitions" value={formData.repetitions} onChange={handleInputChange} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100" />
                                            <p className="text-xs text-slate-500 mt-1">Total de parcelas resultantes: {treatments.length * formData.repetitions}</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Objetivo Estadístico de la Prueba</label>
                                    <textarea rows={3} name="objective" value={formData.objective} onChange={handleInputChange} className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-slate-900 dark:text-slate-100" placeholder="Ej: Determinar diferencias significativas (p < 0.05) en rendimiento frente al testigo..." />
                                </div>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start border border-blue-100 dark:border-blue-800">
                                    <AlertCircle className="w-5 h-5 text-blue-500 mr-2 shrink-0 mt-0.5" />
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Basado en tu diseño de <strong>{formData.repetitions} repeticiones</strong> y <strong>{treatments.length} tratamientos</strong>, el sistema generará automáticamente la disposición espacial y croquis de las {formData.repetitions * treatments.length} parcelas para captura offline.
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'treatments' && (
                            <div className="space-y-8">
                                {/* 1. Esquema de Tratamientos */}
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                                                <Layers className="w-5 h-5 mr-2 text-blue-500" />
                                                1. Esquema de tratamientos
                                            </h3>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                Diseña cada tratamiento y añade los productos. Asigna las aplicaciones A1, A2... definidas abajo.
                                            </p>
                                        </div>
                                        <button type="button" onClick={handleAddTreatment} className="px-3 py-2 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800 text-green-700 dark:text-green-300 text-sm font-semibold rounded-md transition-colors flex items-center justify-center shadow-sm shrink-0 border border-green-200 dark:border-green-700">
                                            <Layers className="w-4 h-4 mr-1.5" />
                                            Agregar Nuevo Tratamiento
                                        </button>
                                    </div>

                                    <datalist id="common-products">
                                        <option value="Glifosato 48%" /><option value="Glifosato 74% WG" /><option value="Atrazina 90% WG" /><option value="2,4-D Sal Amina" /><option value="Dicamba" /><option value="Cletodim 24%" /><option value="Haloxifop" /><option value="Urea 46%" /><option value="UAN (Urea Nitrato de Amonio)" /><option value="MAP (Fosfato Monoamónico)" /><option value="DAP (Fosfato Diamónico)" /><option value="Fungicida (Azoxi + Cipro)" /><option value="Fungicida (Pyraclo + Epoxi)" /><option value="Insecticida (Clorpirifos)" /><option value="Insecticida (Bifentrin)" /><option value="Inoculante (Bradyrhizobium)" /><option value="Coadyuvante Siliconado" /><option value="Aceite Vegetal Metilado" />
                                    </datalist>

                                    <div className="space-y-6">
                                        {treatments.map((t, treatmentIndex) => (
                                            <div key={t.id} className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                                                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-sm border border-slate-200 dark:border-slate-600">
                                                            Tratamiento #{treatmentIndex}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            value={t.name}
                                                            onChange={(e) => handleTreatmentNameChange(t.id, e.target.value)}
                                                            className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md font-mono focus:ring-2 focus:ring-green-500 text-slate-900 dark:text-slate-100 shadow-sm w-48 text-sm"
                                                            placeholder="Ej: T1"
                                                        />
                                                    </div>
                                                    {treatments.length > 1 && (
                                                        <button type="button" onClick={() => handleRemoveTreatment(t.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm font-medium flex items-center transition-colors">
                                                            <X className="w-4 h-4 mr-1" />
                                                            <span>Eliminar</span>
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="p-4 space-y-3">
                                                    {t.products.map((p) => (
                                                        <div key={p.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm group">
                                                            <div className="col-span-1 text-center flex items-center justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleProductChange(t.id, p.id, 'isEvaluationTarget', !p.isEvaluationTarget)}
                                                                    className={`p-2 rounded-full transition-all ${p.isEvaluationTarget ? 'bg-green-100 text-green-600 border-green-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
                                                                >
                                                                    <Sprout className={`w-4 h-4 ${p.isEvaluationTarget ? 'scale-110' : 'scale-90 opacity-50'}`} />
                                                                </button>
                                                            </div>
                                                            <div className="col-span-3">
                                                                <input type="text" list="common-products" value={p.product} onChange={(e) => handleProductChange(t.id, p.id, 'product', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100" placeholder="Producto..." />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <input type="text" value={p.activeIngredient} onChange={(e) => handleProductChange(t.id, p.id, 'activeIngredient', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100" placeholder="A.I / %" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <select value={p.family} onChange={(e) => handleProductChange(t.id, p.id, 'family', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-sm text-slate-900 dark:text-slate-100 font-medium">
                                                                    <option value="">Familia...</option>
                                                                    <optgroup label="Protección de Cultivos">
                                                                        <option value="Herbicida">🌿 Herbicida</option>
                                                                        <option value="Insecticida">🐜 Insecticida</option>
                                                                        <option value="Fungicida">🍄 Fungicida</option>
                                                                        <option value="Acaricida">🕷️ Acaricida</option>
                                                                        <option value="Nematicida">🐛 Nematicida</option>
                                                                        <option value="Desecante">🍂 Desecante / Defoliante</option>
                                                                    </optgroup>
                                                                    <optgroup label="Nutrición y Bioestimulación">
                                                                        <option value="Fertilizante">🪴 Fertilizante Suelo</option>
                                                                        <option value="Fertilizante Foliar">💧 Fertilizante Foliar</option>
                                                                        <option value="Bioestimulante">⚡ Bioestimulante</option>
                                                                        <option value="Inoculante">🧪 Inoculante</option>
                                                                        <option value="Enmienda">🧱 Enmienda</option>
                                                                    </optgroup>
                                                                    <optgroup label="Otros Insumos">
                                                                        <option value="Semilla">🌾 Semilla</option>
                                                                        <option value="Tratamiento Semilla">💊 Curasemilla / Tratamiento</option>
                                                                        <option value="Fitorregulador">🧪 Hormonas / Regulador</option>
                                                                        <option value="Coadyuvante">🧼 Coadyuvante / Tensoactiv.</option>
                                                                        <option value="Atrayente">🍯 Atrayente / Repelente</option>
                                                                        <option value="Otro">➕ Otro</option>
                                                                    </optgroup>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-1">
                                                                <input type="text" value={p.dose} onChange={(e) => handleProductChange(t.id, p.id, 'dose', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-sm text-center font-bold text-slate-900 dark:text-slate-100" placeholder="0.0" />
                                                            </div>
                                                            <div className="col-span-2">
                                                                <select value={p.unit} onChange={(e) => handleProductChange(t.id, p.id, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase">
                                                                    <option value="L/ha">L/ha</option>
                                                                    <option value="Kg/ha">Kg/ha</option>
                                                                    <option value="cc/100 L">cc/100 L</option>
                                                                    <option value="g/100 L">g/100 L</option>
                                                                    <option value="cc/tn">cc/tn</option>
                                                                    <option value="g/tn">g/tn</option>
                                                                    <option value="Kg/tn">Kg/tn</option>
                                                                    <option value="Pills/ha">Pill/ha</option>
                                                                    <option value="% v/v">% v/v</option>
                                                                </select>
                                                            </div>
                                                            <div className="col-span-1 flex justify-center">
                                                                <button type="button" onClick={() => handleRemoveProductFromTreatment(t.id, p.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => handleAddProductToTreatment(t.id)} className="text-xs font-bold text-blue-600 py-2 px-4 border-2 border-dashed border-blue-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 flex items-center">
                                                        <Plus className="w-4 h-4 mr-2" /> Añadir Producto
                                                    </button>
                                                </div>

                                                <div className="px-4 pb-4">
                                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                                                        {plannedApplications.map((app) => {
                                                            const isActive = t.applicationIds?.includes(app.id);
                                                            const isEditingThis = editingApplication?.treatmentId === t.id && editingApplication?.appId === app.id;
                                                            return (
                                                                <div key={app.id} className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleTreatmentApp(t.id, app.id)}
                                                                        className={`w-full p-2 rounded-lg border-2 text-[10px] font-black uppercase transition-all ${isActive ? 'bg-green-600 text-white border-green-700 shadow-md' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-300'} ${isEditingThis ? 'ring-2 ring-blue-400 z-10' : ''}`}
                                                                    >
                                                                        {app.name}
                                                                    </button>
                                                                    {isActive && (
                                                                        <button type="button" onClick={() => setEditingApplication({ treatmentId: t.id, appId: app.id })} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-slate-800 text-green-600 border border-green-600 rounded-full flex items-center justify-center shadow-md z-20">
                                                                            <Settings className="w-3 h-3" />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        <button type="button" onClick={handleQuickAddApp} className="p-2 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 rounded-lg text-center hover:text-blue-500 hover:border-blue-300">
                                                            <Plus className="w-3 h-3 mx-auto" strokeWidth={3} />
                                                            <span className="text-[7px] font-black block mt-1 uppercase">NUEVA</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {editingApplication && editingApplication.treatmentId === t.id && (
                                                    <div className="mx-4 mb-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                                                <Settings className="w-3.5 h-3.5" /> Ajustes de Dosis para: {plannedApplications.find(a => a.id === editingApplication.appId)?.name}
                                                            </h4>
                                                            <button type="button" onClick={() => setEditingApplication(null)} className="p-1 hover:bg-white rounded transition-colors">
                                                                <X className="w-3.5 h-3.5 text-blue-400" />
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                            {t.products.map(prod => {
                                                                const override = t.applicationSettings?.[editingApplication.appId]?.overrides?.[prod.id];
                                                                const hasOverride = !!override && (override.dose !== undefined || override.unit !== undefined);
                                                                return (
                                                                    <div key={prod.id} className={`p-2.5 rounded-lg border transition-all ${hasOverride ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700'}`}>
                                                                        <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800 pb-1 mb-2">
                                                                            <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">{prod.product || 'Sin nombre'}</span>
                                                                            <span className="text-[8px] text-slate-400">Base: {prod.dose} {prod.unit}</span>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={override?.dose ?? prod.dose}
                                                                                onChange={(e) => handleOverrideDose(t.id, editingApplication.appId, prod.id, 'dose', e.target.value)}
                                                                                className="w-full text-center font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1"
                                                                            />
                                                                            <select
                                                                                value={override?.unit ?? prod.unit}
                                                                                onChange={(e) => handleOverrideDose(t.id, editingApplication.appId, prod.id, 'unit', e.target.value)}
                                                                                className="w-full text-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1 py-1"
                                                                            >
                                                                                <option value="L/ha">L/ha</option><option value="Kg/ha">Kg/ha</option><option value="cc/100 L">cc/100 L</option><option value="g/100 L">g/100 L</option>
                                                                            </select>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="flex justify-end mt-3">
                                                            <button type="button" onClick={() => setEditingApplication(null)} className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm">
                                                                Confirmar Ajustes
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-8" />

                                {/* 2. Protocolo de Aplicaciones (Labores) */}
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                                                <Sprout className="w-5 h-5 mr-2 text-green-500" />
                                                2. Protocolo de aplicaciones
                                            </h3>
                                            <p className="text-xs text-slate-500 max-w-xl">
                                                Define cuántas aplicaciones tendrá este ensayo y cuándo se realizarán.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200">
                                                <span className="text-[10px] font-bold text-slate-500">Cantidad:</span>
                                                <input type="number" min="0" max="10" value={plannedApplications.length} onChange={(e) => handleSetAppCount(parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center font-bold" />
                                            </div>
                                            <button type="button" onClick={handleQuickAddApp} className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 text-sm font-semibold rounded-md flex items-center shadow-sm text-xs font-bold transition-all">
                                                <Plus className="w-4 h-4 mr-1.5" /> Nueva Ventana
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {plannedApplications.map((app, index) => (
                                            <div key={app.id} className="flex flex-col md:flex-row gap-4 items-end bg-green-50/30 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-800 shadow-sm relative">
                                                <div className="flex-1 w-full shrink-0 md:max-w-[180px]">
                                                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre Ventana</div>
                                                    <input type="text" value={app.name} onChange={(e) => handlePlannedAppChange(app.id, 'name', e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm focus:ring-2 focus:ring-green-500 outline-none" placeholder="A1..." required />
                                                </div>

                                                <div className="flex-1 w-full min-w-[200px] space-y-3">
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contar desde (Labor/Hito):</div>
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
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
                                                        >
                                                            <option value="init">🚀 Inicio del Ensayo</option>
                                                            <optgroup label="Protocolo (Otras Ventanas)">
                                                                {plannedApplications.filter((_, i) => i < index).map(otherApp => (
                                                                    <option key={otherApp.id} value={otherApp.id}>📦 {otherApp.name}</option>
                                                                ))}
                                                            </optgroup>
                                                            {milestones.length > 0 && (
                                                                <optgroup label="Hitos y Labores">
                                                                    {milestones.map(m => (
                                                                        <option key={m.id} value={m.id}>{m.type === 'labor' ? '🚜' : '🌱'} {m.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tiempo de espera:</div>
                                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={app.daysAfterReference ?? app.daysAfterStart ?? ''}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        handlePlannedAppChange(app.id, 'daysAfterReference', val);
                                                                        handlePlannedAppChange(app.id, 'daysAfterStart', val);
                                                                    }}
                                                                    className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-center focus:ring-2 focus:ring-green-500 outline-none"
                                                                />
                                                                <span className="text-[11px] font-bold text-slate-500 uppercase">días después</span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="w-1/3 pt-5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleTogglePlannedAppVariable(app.id)}
                                                                className={`w-full py-2.5 rounded-lg border text-[10px] font-black uppercase tracking-tighter transition-all shadow-sm ${
                                                                    app.isVariable 
                                                                        ? 'bg-amber-500 text-white border-amber-600' 
                                                                        : 'bg-white text-slate-400 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                                                }`}
                                                            >
                                                                {app.isVariable ? '🔄 Var' : '🗓️ Fijo'}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {!app.isVariable && (
                                                        <div className="animate-in fade-in slide-in-from-top-1">
                                                            <div className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest mb-1.5 ml-1">Fecha Programada:</div>
                                                            <input
                                                                type="date"
                                                                value={app.date || ''}
                                                                onChange={(e) => handlePlannedAppChange(app.id, 'date', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-green-200 dark:border-green-800/30 rounded-lg text-xs font-bold focus:ring-2 focus:ring-green-500 outline-none shadow-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                <button type="button" onClick={() => handleRemovePlannedApp(app.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors self-start mt-8" title="Quitar Ventana">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}

                                        {plannedApplications.length > 0 && (
                                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mt-6 border-l-4 border-l-green-500 shadow-sm">
                                                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                    <h4 className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase">Asignación Masiva de Protocolo</h4>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-xs text-left">
                                                        <thead>
                                                            <tr className="bg-slate-100 dark:bg-slate-800/50 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400">
                                                                <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-700">Tratamiento</th>
                                                                {plannedApplications.map((app: PlannedApplication) => (
                                                                    <th key={app.id} className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-700 shrink-0">{app.name}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {treatments.map((t: Treatment) => (
                                                                <tr key={t.id} className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                                                    <td className="px-4 py-2 font-bold border-r border-slate-200 dark:border-slate-700 truncate max-w-[140px] text-slate-700 dark:text-slate-300">{t.name}</td>
                                                                    {plannedApplications.map((app: PlannedApplication) => (
                                                                        <td key={app.id} className="px-3 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                                                                            <input type="checkbox" checked={t.applicationIds?.includes(app.id)} onChange={() => handleToggleTreatmentApp(t.id, app.id)} className="w-4 h-4 rounded text-green-600 focus:ring-green-500 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm" />
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Otros Hitos y Eventos Biológicos */}
                                    <div className="mt-8 space-y-4 bg-amber-50/20 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                                                    <Activity className="w-5 h-5 mr-2 text-amber-500" />
                                                    3. Otros Hitos y Eventos Biológicos
                                                </h3>
                                                <p className="text-xs text-slate-500 max-w-xl">
                                                    Registra eventos clave (Floración, Emergencia, Labores de suelo) para referenciar aplicaciones o evaluaciones.
                                                </p>
                                            </div>
                                            <button type="button" onClick={handleAddMilestone} className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-bold rounded-md flex items-center shadow-sm transition-all border border-amber-200">
                                                <Plus className="w-4 h-4 mr-1.5" /> Nuevo Evento
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {milestones.map((m: TrialMilestone) => (
                                                <div key={m.id} className="flex flex-col md:flex-row gap-4 items-end bg-amber-50/30 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800 shadow-sm relative">
                                                    <div className="flex-1 w-full">
                                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Nombre del Evento / Labor</div>
                                                        <input type="text" value={m.name} onChange={(e) => handleMilestoneChange(m.id, 'name', e.target.value)} className="w-full px-4 py-2 border dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm" placeholder="Ej: Floración, Incorporación..." required />
                                                    </div>
                                                    <div className="w-full md:w-40">
                                                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Tipo</div>
                                                        <select value={m.type} onChange={(e) => handleMilestoneChange(m.id, 'type', e.target.value)} className="w-full px-3 py-2 border dark:border-slate-700 rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm">
                                                            <option value="labor">Labor Agronómica</option>
                                                            <option value="fenologia">Fenología</option>
                                                            <option value="otro">Otro</option>
                                                        </select>
                                                    </div>
                                                    <div className="w-full md:w-56">
                                                        <div className={`text-[10px] font-bold uppercase mb-2 ${m.isVariable ? 'text-amber-500' : 'text-slate-500'}`}>
                                                            {m.isVariable ? 'Fecha Estimada' : 'Fecha Fija'}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <input type="date" value={m.date || ''} onChange={(e) => handleMilestoneChange(m.id, 'date', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border-amber-200" />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleMilestoneChange(m.id, 'isVariable', !m.isVariable)}
                                                                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                                    m.isVariable 
                                                                        ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                                                        : 'bg-slate-100 text-slate-700 border-slate-200'
                                                                }`}
                                                            >
                                                                {m.isVariable ? '🔄' : '🗓️'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveMilestone(m.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            {milestones.length === 0 && (
                                                <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                                    <p className="text-xs text-slate-400">Opcional: Define hitos como Floración o Cosecha para vincular mediciones.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-8" />

                                {/* 4. Cronograma de evaluaciones */}
                                <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center">
                                                <Clock className="w-5 h-5 mr-2 text-indigo-500" />
                                                4. Cronograma de evaluaciones
                                            </h3>
                                            <p className="text-xs text-slate-500 max-w-xl">
                                                Define en qué etapas se realizarán las mediciones.
                                            </p>
                                        </div>
                                        <button type="button" onClick={handleAddEvaluation} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-md transition-colors flex items-center justify-center shadow-sm shrink-0 border border-blue-200 dark:border-blue-700">
                                            <Plus className="w-4 h-4 mr-1.5" />
                                            Agregar Medición
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {evaluations.map((ev: Evaluation) => (
                                            <div key={ev.id} className="flex flex-col md:flex-row gap-4 items-end bg-blue-50/30 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800 shadow-sm relative">
                                                <div className="flex-1 w-full">
                                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Nombre (p.ej 7 DDA, Floración)</div>
                                                    <input
                                                        type="text"
                                                        value={ev.name}
                                                        onChange={(e) => handleEvaluationChange(ev.id, 'name', e.target.value)}
                                                        className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm font-medium shadow-sm"
                                                        placeholder="Cosecha, etc..."
                                                        required
                                                    />
                                                </div>
                                                <div className="w-full md:w-48">
                                                    <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1">Tipo de Fecha</div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleEvaluationVariable(ev.id)}
                                                        className={`w-full px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                                                            ev.isVariable 
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' 
                                                                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {ev.isVariable ? '🔄 Variable' : '🗓️ Fija'}
                                                    </button>
                                                </div>
                                                
                                                <div className="flex-1 w-full min-w-[200px] space-y-3">
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Contar desde (Labor/Hito):</div>
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
                                                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        >
                                                            <option value="init">🚀 Inicio del Ensayo</option>
                                                            <optgroup label="Protocolo (Aplicaciones)">
                                                                {plannedApplications.map((app: any) => (
                                                                    <option key={app.id} value={app.id}>📦 {app.name}</option>
                                                                ))}
                                                            </optgroup>
                                                            {milestones.length > 0 && (
                                                                <optgroup label="Hitos y Labores">
                                                                    {milestones.map((m: any) => (
                                                                        <option key={m.id} value={m.id}>{m.type === 'labor' ? '🚜' : '🌱'} {m.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                        </select>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1">
                                                            <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tiempo de espera:</div>
                                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                                                <input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    value={ev.daysAfterApplication ?? ''}
                                                                    onChange={(e) => handleEvaluationChange(ev.id, 'daysAfterApplication', parseInt(e.target.value) || 0)}
                                                                    className="w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-sm font-bold text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                                                />
                                                                <span className="text-[11px] font-bold text-slate-500 uppercase">días después</span>
                                                            </div>
                                                        </div>
                                                        <div className="w-1/3 pt-5" />
                                                    </div>

                                                    {!ev.isVariable && (
                                                        <div className="animate-in fade-in slide-in-from-top-1">
                                                            <div className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1.5 ml-1">Fecha de Ejecución:</div>
                                                            <input
                                                                type="date"
                                                                value={ev.date || ''}
                                                                onChange={(e) => handleEvaluationChange(ev.id, 'date', e.target.value)}
                                                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/30 rounded-lg text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                                <button type="button" onClick={() => handleRemoveEvaluation(ev.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors self-start mt-8" title="Quitar Medición">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}


                        {activeTab === 'variables' && (
                            <div className="space-y-6">
                                <div className="h-px bg-slate-200 dark:bg-slate-700 my-8" />
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                                        Define qué vas a evaluar en este ensayo globalmente. Por ejemplo, la incidencia de una enfermedad, la eficacia sobre un insecto en un estadio específico, o si es control de malezas.
                                    </p>
                                    <button type="button" onClick={handleAddVariable} className="px-3 py-2 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 text-sm font-semibold rounded-md transition-colors flex items-center justify-center shadow-sm shrink-0 border border-blue-200 dark:border-blue-700">
                                        <Plus className="w-4 h-4 mr-1.5" />
                                        Agregar Variable
                                    </button>
                                </div>

                                <div className="hidden md:grid grid-cols-12 gap-4 px-4 pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                                    <div className="col-span-2">Categoría</div>
                                    <div className="col-span-4">Objetivo (Plaga/Enfermedad/Maleza)</div>
                                    <div className="col-span-3">Variable a Medir</div>
                                    <div className="col-span-2">Unidad Métrica</div>
                                    <div className="col-span-1 text-center">Acción</div>
                                </div>

                                <div className="space-y-3">
                                    {variables.map((v: EvaluationVariable) => (
                                        <div key={v.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">

                                            {/* Category */}
                                            <div className="col-span-1 md:col-span-2">
                                                <div className="md:hidden block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Categoría</div>
                                                <select
                                                    value={v.category}
                                                    onChange={(e) => handleVariableChange(v.id, 'category', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm"
                                                >
                                                    <option value="insecto">Insecto</option>
                                                    <option value="enfermedad">Enfermedad</option>
                                                    <option value="maleza">Maleza</option>
                                                    <option value="produccion">Producción</option>
                                                    <option value="otro">Otro</option>
                                                </select>
                                            </div>

                                            {/* Target */}
                                            <div className="col-span-1 md:col-span-4">
                                                <div className="md:hidden block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Objetivo (Plaga/Enfermedad)</div>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                                        {v.category === 'insecto' ? <Bug className="w-4 h-4" /> :
                                                            v.category === 'enfermedad' ? <Activity className="w-4 h-4" /> :
                                                                v.category === 'maleza' ? <Leaf className="w-4 h-4" /> :
                                                                    <Sprout className="w-4 h-4" />}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={v.target}
                                                        onChange={(e) => handleVariableChange(v.id, 'target', e.target.value)}
                                                        className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm"
                                                        placeholder={v.category === 'insecto' ? "Ej: Tuta absoluta (larvas)" : v.category === 'enfermedad' ? "Ej: Roya asiática" : "Ej: Amaranthus spp."}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <div className="col-span-1 md:col-span-3">
                                                <div className="md:hidden block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Variable a Medir</div>
                                                <input
                                                    type="text"
                                                    list={`var-list-${v.id}`}
                                                    value={v.name}
                                                    onChange={(e) => handleVariableChange(v.id, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm font-medium"
                                                    placeholder="Ej: Incidencia..."
                                                    required
                                                />
                                                <datalist id={`var-list-${v.id}`}>
                                                    {v.category === 'insecto' && <><option value="Incidencia" /><option value="Severidad" /><option value="Huevos" /><option value="Larvas" /><option value="Ninfas" /><option value="Adultos" /><option value="Daño Foliar" /><option value="Eficacia de Control" /></>}
                                                    {v.category === 'enfermedad' && <><option value="Incidencia" /><option value="Severidad" /><option value="AUDPC" /><option value="Eficacia de Control" /></>}
                                                    {v.category === 'maleza' && <><option value="Cobertura" /><option value="Eficacia de Control" /><option value="Fitotoxicidad" /><option value="Biomasa Fresca" /><option value="Biomasa Seca" /><option value="Conteo Individuos" /></>}
                                                    {v.category === 'produccion' && <><option value="Rendimiento" /><option value="Peso 1000 granos" /><option value="Número de frutos" /><option value="Peso promedio" /><option value="Calidad" /></>}
                                                </datalist>
                                            </div>

                                            {/* Unit */}
                                            <div className="col-span-1 md:col-span-2">
                                                <div className="md:hidden block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Unidad Métrica</div>
                                                <input
                                                    type="text"
                                                    list={`unit-list-${v.id}`}
                                                    value={v.unit || ''}
                                                    onChange={(e) => handleVariableChange(v.id, 'unit', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-slate-100 text-sm"
                                                    placeholder="Ej: %, kg/ha, N° /m2"
                                                />
                                                <datalist id={`unit-list-${v.id}`}>
                                                    {v.category === 'insecto' && <><option value="%" /><option value="Nº/hoja" /><option value="Nº/planta" /><option value="Nº/m²" /><option value="Grado (1-5)" /></>}
                                                    {v.category === 'enfermedad' && <><option value="%" /><option value="Grado (1-9)" /><option value="cm²" /></>}
                                                    {v.category === 'maleza' && <><option value="%" /><option value="Nº/m²" /><option value="g/m²" /><option value="kg/ha" /><option value="Grado EWRC" /></>}
                                                    {v.category === 'produccion' && <><option value="kg/ha" /><option value="qq/ha" /><option value="tn/ha" /><option value="g" /><option value="kg" /></>}
                                                </datalist>
                                            </div>

                                            {/* Action */}
                                            <div className="col-span-1 flex justify-center md:justify-end mt-2 md:mt-0">
                                                <button type="button" onClick={() => handleRemoveVariable(v.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-md transition-colors flex justify-center items-center w-full md:w-auto" title="Quitar Variable">
                                                    <X className="w-5 h-5 md:mr-0 mr-2" />
                                                    <span className="md:hidden text-sm">Eliminar</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {variables.length === 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                            No hay variables definidas. Agrega las enfermedades, plagas y métricas para evaluar en este ensayo.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center rounded-b-2xl">
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        {activeTab !== 'general' && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    if (activeTab === 'treatments') setActiveTab('general');
                                    if (activeTab === 'variables') setActiveTab('treatments');
                                }} 
                                className="px-5 py-2.5 font-medium text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center"
                            >
                                <span className="mr-2">←</span> Anterior
                            </button>
                        )}
                        {!editingTrial && localStorage.getItem('new_trial_draft') && (
                            <button
                                type="button"
                                onClick={clearDraft}
                                className="flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg text-sm font-semibold transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpiar Borrador
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3 items-center">
                        {activeTab !== 'variables' ? (
                            <button 
                                type="button" 
                                onClick={() => {
                                    if (activeTab === 'general') setActiveTab('treatments');
                                    else if (activeTab === 'treatments') setActiveTab('variables');
                                }} 
                                className="px-5 py-2.5 font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors flex items-center"
                            >
                                Siguiente <span className="ml-2">→</span>
                            </button>
                        ) : (
                            <button type="submit" form="trial-form" className="px-5 py-2.5 font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors flex items-center">
                                <Save className="w-4 h-4 mr-2" />
                                {editingTrial ? 'Guardar Cambios' : 'Crear Proyecto'}
                            </button>
                        )}
                    </div>
                </div>

                {editingTrial && (
                    <HistoryModal 
                        isOpen={isHistoryOpen}
                        onClose={() => setIsHistoryOpen(false)}
                        entityId={editingTrial.id}
                        entityTitle={editingTrial.title}
                    />
                )}
            </div>
            {/* Vademecum Datalist */}
            <datalist id="common-products">
                {[...SENASA_VADEMECUM, ...customProducts].map((p: any, idx: number) => (
                    <option key={`${p.id}-${idx}`} value={p.name}>
                        {p.id.startsWith('CUSTOM-') ? '👤 Guardado' : p.id} - {p.activeIngredient} - {p.company}
                    </option>
                ))}
            </datalist>
        </div>
    );
}
