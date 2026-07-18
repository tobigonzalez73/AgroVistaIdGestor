// Familia del producto
export type ProductFamily = 'Insecticida' | 'Fungicida' | 'Herbicida' | 'Acaricida' | 'Nematicida' | 'Desecante' | 'Fertilizante' | 'Fertilizante Foliar' | 'Bioestimulante' | 'Inoculante' | 'Enmienda' | 'Semilla' | 'Tratamiento Semilla' | 'Fitorregulador' | 'Coadyuvante' | 'Atrayente' | 'Otro' | '';

import type { Approval } from './user';

// 1. Productos aplicados en un tratamiento
export interface Product {
    id: string | number;
    product: string;
    activeIngredient: string;
    family?: ProductFamily;
    dose: string;
    unit: string;
    isEvaluationTarget?: boolean; // Si es true, se considera para análisis estadístico
}

// 2. Tratamientos
export interface Treatment {
    id: string | number;
    name: string;
    products: Product[];
    applicationIds?: string[]; // IDs de PlannedApplication en las que participa
    applicationSettings?: Record<string, {
        overrides?: Record<string | number, { dose?: string; unit?: string; isDisabled?: boolean }>;
    }>;
}

// 3. Variables Evaluadas
export type VariableCategory = 'maleza' | 'insecto' | 'enfermedad' | 'produccion' | 'fisiologia' | 'rinde' | 'suelo' | 'otro';
export interface EvaluationVariable {
    id: string;
    category: VariableCategory;
    target: string; // Ej: Tuta absoluta, Roya
    name: string; // Ej: Incidencia, Severidad, Nº de larvas
    unit?: string; // Ej: %, cnt, kg/ha
}

// 4. Hitos y Eventos (Labores o Fenología)
export interface TrialMilestone {
    id: string;
    name: string; // Ej: Floración, Emergencia, Incorporación Rastrojo
    date?: string;
    isVariable?: boolean;
    type?: 'labor' | 'fenologia' | 'otro';
}

// 4. Evaluaciones en el tiempo
export interface Evaluation {
    id: string;
    name: string; // Ej: 0 DDA, 7 DDA, Cosecha
    date?: string; // Fecha definitiva/fija
    daysAfterApplication?: number; // Offset en días (se mantiene por compatibilidad)
    
    // Nuevos campos para referencias
    referenceType?: 'protocol' | 'milestone' | 'init' | 'fixed';
    referenceId?: string; // ID de PlannedApplication o TrialMilestone
    
    notes?: string;
    isVariable?: boolean; // Si la fecha depende de un evento biológico o manual
}

// 5. Resultados de las evaluaciones
export interface Result {
    id: string;
    evaluationId: string;
    treatmentId: string | number;
    repetitionNumber: number; // 1, 2, 3...
    variableId: string;
    value: number | string; // Valor de la evaluación
}

// 7. Aplicaciones planificadas (protocolo)
export interface PlannedApplication {
    id: string;
    name: string; // A1, A2, etc
    daysAfterStart: number; // 0, 7, 14, 21 DAA (para compatibilidad)
    
    // Nuevos campos para referencias (encadenamiento)
    referenceType?: 'protocol' | 'milestone' | 'init' | 'fixed';
    referenceId?: string; // ID de PlannedApplication o TrialMilestone relative to
    daysAfterReference?: number; // Offset desde la referencia

    date?: string; // Fecha definitiva/fija
    notes?: string;
    isVariable?: boolean; // Si la fecha depende de un evento biológico o manual
}

// 6. Ensayo principal
export interface TrialAttachment {
    id: string;
    name: string;
    url: string;
    type: 'foto' | 'documento';
    uploadDate: string;
}

export interface Trial {
    id: string;
    title: string;
    client: string;
    location: string;
    date: string;
    status: 'cotizacion' | 'planificado' | 'en_curso' | 'evaluacion' | 'completado';
    experimentalDesign?: string;
    repetitions?: number;
    objective?: string;
    hectares?: string;
    crop?: string;
    clientId?: string;
    clientName?: string;
    establishmentId?: string;
    establishmentName?: string;
    plotId?: string;
    plotName?: string;
    treatments?: Treatment[];



    evaluations?: Evaluation[];
    variables?: EvaluationVariable[];
    results?: Result[];

    plannedApplications?: PlannedApplication[];
    milestones?: TrialMilestone[]; // Nuevos hitos del ensayo

    // Archivos adjuntos
    attachments?: TrialAttachment[];
    finalReportUrl?: string; // Solo para estado 'completado'

    // Cotización
    quotePriceNoYield?: number;
    quotePriceWithYield?: number;
    quoteIncludeYield?: boolean;
    quoteLogistics?: number;
    quoteOtherExpenses?: number;
    quoteNotes?: string;
    quoteCurrency?: 'USD' | 'ARS';
    generalNotes?: string;

    // Aprobaciones requeridas
    approvals?: Approval[];
}

// 7. Tareas de Aplicación
export interface ApplicationTask {
    id: string;
    type: 'general' | 'ensayo';
    trialId?: string;
    location: string;
    date: string;
    condition: string;
    status: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada' | 'postergada';
    products: Product[];
    notes?: string;
    responsibleEmails?: string[];
    leaderEmail?: string;
    approvals?: Approval[];
    isVariable?: boolean;
    observations?: string;
    createdAt?: string;
}


