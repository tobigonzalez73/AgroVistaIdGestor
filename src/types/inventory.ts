export type ContainerType = 'Bidón' | 'Botella' | 'Caja' | 'Bolsa' | 'Unidad' | 'Metro' | 'Otro';
export type MeasurementUnit = 'L' | 'kg' | 'cc' | 'g' | 'un' | 'm';
export type ItemFamily =
    | 'Herbicida'
    | 'Fungicida'
    | 'Insecticida'
    | 'Bioestimulante'
    | 'Coadyuvante'
    | 'Fertilizante'
    | 'Biológico'
    | 'Semilla'
    | 'Ferretería'
    | 'Riego'
    | 'Servicio'
    | 'Otro';

// El producto o servicio base que está en el catálogo
export interface CatalogItem {
    id: string;
    code: string; // Codificación para traza única
    name: string;
    itemType: 'Product' | 'Service';
    family?: ItemFamily;
    vatPercentage: number; // % IVA para compras/facturación
    unit: MeasurementUnit;

    // Agroquímicos específicos (opcional)
    activeIngredient?: string;
    company?: string;
    defaultDose?: string; // Dosis de uso
    observations?: string; // Observaciones

    // Gestión de Stock
    trackStock: boolean;
    stockLevel: number; // Cantidad total disponible
}

// Representa un envase físico real o lote de productos en stock
export interface InventoryContainer {
    id: string;
    itemId: string; // Referencia al CatalogItem
    batchNumber: string;
    expirationDate?: string;

    containerType: ContainerType;
    unit: MeasurementUnit;

    totalCapacity: number; // Capacidad original (ej: 20L)
    currentAmount: number; // Cantidad restante

    location?: string;
    status: 'Nuevo' | 'Abierto' | 'Vacío' | 'Vencido';
}
