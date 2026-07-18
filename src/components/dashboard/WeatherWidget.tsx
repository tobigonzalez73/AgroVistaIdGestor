import { MapPin, Sun, CloudRain, Cloud, CloudLightning, ThermometerSun, ChevronDown } from 'lucide-react';
import { useState } from 'react';

// Simulated 10-day weather data
const BASE_MOCK_WEATHER = [
    { day: 'Hoy', min: 14, max: 26, pop: 10, condition: 'sunny', icon: Sun, color: 'text-amber-500' },
    { day: 'Mañana', min: 15, max: 28, pop: 20, condition: 'partly-cloudy', icon: Cloud, color: 'text-slate-400' },
    { day: 'Mié', min: 18, max: 30, pop: 60, condition: 'rain', icon: CloudRain, color: 'text-blue-500' },
    { day: 'Jue', min: 16, max: 24, pop: 80, condition: 'storm', icon: CloudLightning, color: 'text-indigo-600' },
    { day: 'Vie', min: 12, max: 22, pop: 10, condition: 'sunny', icon: Sun, color: 'text-amber-500' },
    { day: 'Sáb', min: 14, max: 25, pop: 0, condition: 'sunny', icon: Sun, color: 'text-amber-500' },
    { day: 'Dom', min: 15, max: 27, pop: 30, condition: 'cloudy', icon: Cloud, color: 'text-slate-400' },
    { day: 'Lun', min: 17, max: 29, pop: 40, condition: 'rain', icon: CloudRain, color: 'text-blue-500' },
    { day: 'Mar', min: 18, max: 31, pop: 15, condition: 'sunny', icon: Sun, color: 'text-amber-500' },
    { day: 'Mié', min: 19, max: 32, pop: 5, condition: 'hot', icon: ThermometerSun, color: 'text-rose-500' },
];

const AVAILABLE_LOCATIONS = [
    { id: 'laplata', name: 'La Plata, Buenos Aires' },
    { id: 'rojas', name: 'Rojas, Buenos Aires' },
    { id: 'pergamino', name: 'Pergamino, Buenos Aires' },
    { id: 'rosario', name: 'Rosario, Santa Fe' },
    { id: 'cordoba', name: 'Córdoba, Córdoba' }
];

export default function WeatherWidget() {
    const [selectedLocation, setSelectedLocation] = useState(AVAILABLE_LOCATIONS[0].id);

    // Simple pseudo-random modifier based on location select to make the mock look dynamic
    const dynamicWeatherData = BASE_MOCK_WEATHER.map((day) => {
        const modifier = AVAILABLE_LOCATIONS.findIndex(l => l.id === selectedLocation) * 2;
        return {
            ...day,
            min: day.min + modifier,
            max: day.max + modifier,
            pop: Math.min(100, day.pop + (modifier * 5))
        }
    });

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col h-[600px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-br from-emerald-600 to-teal-800 text-white relative">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                        <div className="relative group cursor-pointer inline-flex items-center">
                            <MapPin className="w-5 h-5 mr-1" />
                            <select
                                value={selectedLocation}
                                onChange={(e) => setSelectedLocation(e.target.value)}
                                className="appearance-none bg-transparent text-xl font-bold pr-6 outline-none cursor-pointer hover:opacity-80 transition-opacity"
                            >
                                {AVAILABLE_LOCATIONS.map(loc => (
                                    <option key={loc.id} value={loc.id} className="text-slate-800 bg-white">
                                        {loc.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-4 h-4 ml-1 absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-80 group-hover:opacity-100" />
                        </div>
                        <p className="text-blue-100 text-sm opacity-90 mt-1">Establecimiento Seleccionado</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{dynamicWeatherData[0].max}°</div>
                        <p className="text-blue-100 text-sm">Pronóstico Actual</p>
                    </div>
                </div>
            </div>

            {/* 10-Day Forecast List */}
            <div className="flex-1 overflow-y-auto p-2">
                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">
                    Pronóstico 10 días
                </h3>
                <div className="space-y-1">
                    {dynamicWeatherData.map((day, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                            <span className="w-16 font-medium text-slate-700 dark:text-slate-300">
                                {day.day}
                            </span>
                            <div className="flex items-center justify-center w-12">
                                <day.icon className={`w-5 h-5 ${day.color}`} />
                            </div>
                            <div className="flex items-center justify-end w-24 gap-2">
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{day.max}°</span>
                                <span className="text-sm text-slate-400">{day.min}°</span>
                            </div>
                            <div className="flex items-center justify-end w-16 text-xs text-blue-500 dark:text-blue-400 font-medium">
                                {day.pop > 0 && `${day.pop}%`}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/80">
                Basado en catálogos de establecimientos
            </div>
        </div>
    );
}
