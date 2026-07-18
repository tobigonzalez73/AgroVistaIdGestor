import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

// Simple mapping of paths to titles
const routeTitles: Record<string, string> = {
    '/ensayos': 'Ensayos y Proyectos',
    '/aplicaciones': 'Labores Registradas',
    '/catalogos/geo': 'Catálogo Geo',
    '/catalogos/productos': 'Librería Productos',
};

export function usePageTracking() {
    const location = useLocation();
    const { addRecentPage } = useAppContext();

    useEffect(() => {
        // We only track specifically defined routes, and exclude the Dashboard ('/')
        if (location.pathname !== '/' && routeTitles[location.pathname]) {
            addRecentPage({
                path: location.pathname,
                title: routeTitles[location.pathname],
            });
        }
    }, [location.pathname, addRecentPage]);
}
