export type EstablishmentType = 'Campo Abierto' | 'Invernáculo' | 'Mixto';

export interface Establishment {
    id: string;
    name: string;
    cuitOwner?: string; // Optativo: dueño del campo
    locationStr: string;
    mapUrl?: string; // Enlace a Maps
    type: EstablishmentType;
    totalHectares: number;
    isActive?: boolean;
}

export interface Plot {
    id: string;
    establishmentId: string;
    name: string; // Ej: "Lote 1"
    hectares: number;
    mapUrl?: string; // URL individual
    currentCrop?: string;
    variety?: string;
    isActive?: boolean;
}

