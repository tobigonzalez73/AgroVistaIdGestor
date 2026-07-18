import React, { createContext, useContext, useState } from 'react';
import type { CatalogItem, InventoryContainer } from '../types/inventory';

interface InventoryContextType {
    products: CatalogItem[];
    inventory: InventoryContainer[];
    addProduct: (item: CatalogItem) => void;
    addInventoryContainers: (containers: InventoryContainer[]) => void;
    updateStockScale: (itemId: string, amount: number) => void;
    useProductFromStock: (itemId: string, amount: number) => void;
    returnProductToStock: (inventoryId: string, remainingAmount: number) => void;
    customVademecum: any[];
    updateVademecum: (items: any[]) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const MOCK_ITEMS: CatalogItem[] = [
    {
        id: '1', code: 'AQ-001', name: 'Fungicida XPro', itemType: 'Product', family: 'Fungicida', unit: 'L',
        vatPercentage: 10.5, trackStock: true, stockLevel: 0.2,
        activeIngredient: 'Protioconazol + Bixafen', company: 'AgroChemicals', defaultDose: '0.8 L/ha'
    },
    {
        id: '2', code: 'AQ-002', name: 'Herbicida Total', itemType: 'Product', family: 'Herbicida', unit: 'L',
        vatPercentage: 10.5, trackStock: true, stockLevel: 28.5,
        activeIngredient: 'Glifosato 54%', company: 'GlobalAgri', defaultDose: '2-3 L/ha'
    },
    {
        id: '4', code: 'AQ-004', name: 'Fertilizante Foliar NPK', itemType: 'Product', family: 'Fertilizante', unit: 'L',
        vatPercentage: 10.5, trackStock: true, stockLevel: 20,
        activeIngredient: 'Nitrógeno, Fósforo, Potasio', company: 'NutriPlant', defaultDose: '5 L/ha'
    },
    {
        id: '6', code: 'FR-001', name: 'Alambre de Fardo', itemType: 'Product', family: 'Ferretería', unit: 'kg',
        vatPercentage: 21, trackStock: true, stockLevel: 50
    },
    {
        id: '7', code: 'RG-001', name: 'Manguera Goteo 16mm', itemType: 'Product', family: 'Riego', unit: 'm',
        vatPercentage: 21, trackStock: true, stockLevel: 500
    },
    {
        id: '8', code: 'SRV-001', name: 'Flete y Logística', itemType: 'Service', family: 'Servicio', unit: 'un',
        vatPercentage: 21, trackStock: false, stockLevel: 0
    },
];

const MOCK_INVENTORY: InventoryContainer[] = [
    { id: 'inv-1', itemId: '2', batchNumber: 'L23-001', containerType: 'Bidón', totalCapacity: 20, currentAmount: 8.5, unit: 'L', status: 'Abierto' },
    { id: 'inv-2', itemId: '2', batchNumber: 'L23-002', containerType: 'Bidón', totalCapacity: 20, currentAmount: 20, unit: 'L', status: 'Nuevo' },
    { id: 'inv-3', itemId: '1', batchNumber: 'F88-1', containerType: 'Botella', totalCapacity: 1, currentAmount: 0.2, unit: 'L', status: 'Abierto' },
    { id: 'inv-4', itemId: '4', batchNumber: 'N-990', containerType: 'Bidón', totalCapacity: 20, currentAmount: 20, unit: 'L', status: 'Nuevo' },
];

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [products, setProducts] = useState<CatalogItem[]>(MOCK_ITEMS);
    const [inventory, setInventory] = useState<InventoryContainer[]>(MOCK_INVENTORY);
    const [customVademecum, setCustomVademecum] = useState<any[]>(() => {
        const saved = localStorage.getItem('custom_vademecum');
        return saved ? JSON.parse(saved) : [];
    });

    const updateVademecum = (items: any[]) => {
        setCustomVademecum(items);
        localStorage.setItem('custom_vademecum', JSON.stringify(items));
    };

    const addProduct = (item: CatalogItem) => {
        setProducts(prev => [...prev, item]);
    };

    const addInventoryContainers = (containers: InventoryContainer[]) => {
        setInventory(prev => [...prev, ...containers]);
    };

    const useProductFromStock = (itemId: string, amount: number) => {
        setInventory(prev => {
            let remainingToUse = amount;
            const newInventory = [...prev];

            // 1. Try to use from already 'Abierto' containers first
            for (let i = 0; i < newInventory.length; i++) {
                if (newInventory[i].itemId === itemId && newInventory[i].status === 'Abierto') {
                    const take = Math.min(newInventory[i].currentAmount, remainingToUse);
                    newInventory[i] = {
                        ...newInventory[i],
                        currentAmount: Number((newInventory[i].currentAmount - take).toFixed(3))
                    };
                    if (newInventory[i].currentAmount <= 0) {
                        newInventory[i].status = 'Vacío';
                    }
                    remainingToUse -= take;
                    if (remainingToUse <= 0) break;
                }
            }

            // 2. If still need more, open 'Nuevo' containers
            if (remainingToUse > 0) {
                for (let i = 0; i < newInventory.length; i++) {
                    if (newInventory[i].itemId === itemId && newInventory[i].status === 'Nuevo') {
                        const take = Math.min(newInventory[i].currentAmount, remainingToUse);
                        newInventory[i] = {
                            ...newInventory[i],
                            currentAmount: Number((newInventory[i].currentAmount - take).toFixed(3)),
                            status: take < newInventory[i].currentAmount ? 'Abierto' : 'Vacío'
                        };
                        remainingToUse -= take;
                        if (remainingToUse <= 0) break;
                    }
                }
            }

            return newInventory;
        });

        // Update total stock level in catalog
        setProducts(prev => prev.map(p =>
            p.id === itemId ? { ...p, stockLevel: Number((p.stockLevel - amount).toFixed(3)) } : p
        ));
    };

    const returnProductToStock = (inventoryId: string, remainingAmount: number) => {
        setInventory(prev => prev.map(inv => {
            if (inv.id === inventoryId) {
                const diff = remainingAmount - inv.currentAmount;
                // Update catalog stock level based on the difference
                setProducts(prevProducts => prevProducts.map(p =>
                    p.id === inv.itemId ? { ...p, stockLevel: Number((p.stockLevel + diff).toFixed(3)) } : p
                ));

                return {
                    ...inv,
                    currentAmount: remainingAmount,
                    status: remainingAmount <= 0 ? 'Vacío' : 'Abierto'
                };
            }
            return inv;
        }));
    };

    const updateStockScale = (itemId: string, amount: number) => {
        setProducts(prev => prev.map(p =>
            p.id === itemId ? { ...p, stockLevel: Number((p.stockLevel + amount).toFixed(3)) } : p
        ));
    };

    return (
        <InventoryContext.Provider value={{
            products,
            inventory,
            addProduct,
            addInventoryContainers,
            updateStockScale,
            useProductFromStock,
            returnProductToStock,
            customVademecum,
            updateVademecum
        }}>
            {children}
        </InventoryContext.Provider>
    );
};

export const useInventory = () => {
    const context = useContext(InventoryContext);
    if (context === undefined) {
        throw new Error('useInventory must be used within an InventoryProvider');
    }
    return context;
};
