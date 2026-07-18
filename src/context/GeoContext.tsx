import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, addDoc } from 'firebase/firestore';

import type { Establishment, Plot } from '../types/geo';

const cleanData = (data: any) => {
    const clean = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
    console.log("ENVIANDO A FIREBASE (LIMPIO):", clean);
    return clean;
};

interface GeoContextType {
    establishments: Establishment[];
    setEstablishments: React.Dispatch<React.SetStateAction<Establishment[]>>;
    plots: Plot[];
    setPlots: React.Dispatch<React.SetStateAction<Plot[]>>;
    addEstablishment: (est: Establishment) => void;
    updateEstablishment: (id: string, est: Establishment) => void;
    addPlot: (plot: Plot) => void;
    updatePlot: (id: string, plot: Plot) => void;
    deleteEstablishment: (id: string) => void;
    deletePlot: (id: string) => void;
}

const GeoContext = createContext<GeoContextType | undefined>(undefined);

export function GeoProvider({ children }: { children: React.ReactNode }) {
    const [establishments, setEstablishments] = useState<Establishment[]>([]);
    const [plots, setPlots] = useState<Plot[]>([]);

    // Sync from Firestore instead of localStorage
    useEffect(() => {
        const unsubscribeEst = onSnapshot(collection(db, 'establishments'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Establishment));
            setEstablishments(data);
        }, (err) => {
            console.error("Firebase Est Listener Error:", err);
            alert("Error de conexión (Establecimientos): " + err.message);
        });

        const unsubscribePlots = onSnapshot(collection(db, 'plots'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Plot));
            setPlots(data);
        }, (err) => {
            console.error("Firebase Plot Listener Error:", err);
            alert("Error de conexión (Lotes): " + err.message);
        });



        return () => {
            unsubscribeEst();
            unsubscribePlots();
        };
    }, []);

    const addEstablishment = async (est: Establishment) => {
        const id = est.id || doc(collection(db, 'establishments')).id;
        const data = cleanData({ ...est, id });
        await setDoc(doc(db, 'establishments', id), data, { merge: true }).catch(err => {
            console.error("Firebase Est Save Error:", err);
            alert("Error al guardar en Firebase: " + err.message);
            throw err;
        });
    };

    
    const updateEstablishment = async (id: string, updated: Establishment) => {
        const data = cleanData(updated);
        await updateDoc(doc(db, 'establishments', id), data).catch(err => {
            console.error("Firebase Est Update Error:", err);
            alert("Error al actualizar en Firebase: " + err.message);
            throw err;
        });
    };


    const addPlot = async (plot: Plot) => {
        const data = cleanData(plot);
        try {
            await addDoc(collection(db, 'plots'), data);
            console.log("GUARDADO OK");
        } catch (err) {
            console.error("ERROR FIREBASE", err);
            throw err;
        }
    };



    const updatePlot = async (id: string, updated: Plot) => {
        const data = cleanData(updated);
        await updateDoc(doc(db, 'plots', id), data).catch(err => {
            console.error("Firebase Plot Update Error:", err);
            alert("Error al actualizar el lote en Firebase: " + err.message);
            throw err;
        });
    };

    const deleteEstablishment = async (id: string) => {
        if (window.confirm('¿Deseas dar de baja este establecimiento? Los datos históricos se mantendrán pero ya no aparecerá en las listas activas.')) {
            await updateDoc(doc(db, 'establishments', id), { isActive: false }).catch(err => {
                console.error("Firebase Est Deactivate Error:", err);
                alert("Error al desactivar: " + err.message);
            });
        }
    };

    const deletePlot = async (id: string) => {
        if (window.confirm('¿Deseas dar de baja este lote?')) {
            await updateDoc(doc(db, 'plots', id), { isActive: false }).catch(err => {
                console.error("Firebase Plot Deactivate Error:", err);
                alert("Error al desactivar: " + err.message);
            });
        }
    };


    return (
        <GeoContext.Provider value={{ 
            establishments, 
            setEstablishments, 
            plots, 
            setPlots, 
            addEstablishment, 
            updateEstablishment,
            addPlot,
            updatePlot,
            deleteEstablishment,
            deletePlot
        }}>
            {children}
        </GeoContext.Provider>
    );
}

export function useGeo() {
    const context = useContext(GeoContext);
    if (context === undefined) {
        throw new Error('useGeo must be used within a GeoProvider');
    }
    return context;
}
