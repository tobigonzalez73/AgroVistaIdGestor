
export interface VademecumProduct {
    id: string; // SENASA Registration Number
    name: string;
    activeIngredient: string;
    family: string;
    company?: string;
}

export const SENASA_VADEMECUM: VademecumProduct[] = [
    // HERBICIDAS
    { id: "34125", name: "Roundup Full II", activeIngredient: "Glifosato 66.2%", family: "Herbicida", company: "Bayer" },
    { id: "39872", name: "Zidua Pack", activeIngredient: "Pyroxasulfone 50%", family: "Herbicida", company: "BASF" },
    { id: "35412", name: "Enlist Colex-D", activeIngredient: "2,4-D Sal Colina 66.8%", family: "Herbicida", company: "Corteva" },
    { id: "32101", name: "Starane Xtra", activeIngredient: "Fluroxipir 48%", family: "Herbicida", company: "Corteva" },
    { id: "38721", name: "Dual Gold", activeIngredient: "S-Metolacloro 96%", family: "Herbicida", company: "Syngenta" },
    { id: "36500", name: "Concurrence", activeIngredient: "Flumioxazin 48%", family: "Herbicida", company: "Summit Agro" },
    { id: "31000", name: "Banvel", activeIngredient: "Dicamba 57.7%", family: "Herbicida", company: "Syngenta" },
    { id: "39000", name: "Hussar", activeIngredient: "Iodosulfuron 5%", family: "Herbicida", company: "Bayer" },
    { id: "40125", name: "Spider", activeIngredient: "Diclosulam 84%", family: "Herbicida", company: "Corteva" },
    { id: "37200", name: "Pivote", activeIngredient: "Imazetapìr 10%", family: "Herbicida", company: "BASF" },
    
    // FUNGICIDAS
    { id: "38120", name: "Miravis Duo", activeIngredient: "Adepidyn + Difenoconazole", family: "Fungicida", company: "Syngenta" },
    { id: "39200", name: "Orchestra Ultra", activeIngredient: "Fluxapyroxad + Pyraclostrobin", family: "Fungicida", company: "BASF" },
    { id: "37400", name: "Cripton Xtra", activeIngredient: "Trifloxistrobin + Prothioconazole", family: "Fungicida", company: "Bayer" },
    { id: "35100", name: "Stratego", activeIngredient: "Trifloxistrobin + Tebuconazole", family: "Fungicida", company: "Bayer" },
    { id: "32500", name: "Amistar Xtra", activeIngredient: "Azoxystrobin + Cyproconazole", family: "Fungicida", company: "Syngenta" },
    
    // INSECTICIDAS
    { id: "36210", name: "Belt", activeIngredient: "Flubendiamide 48%", family: "Insecticida", company: "Bayer" },
    { id: "39100", name: "Coragen", activeIngredient: "Rynaxypyr 20%", family: "Insecticida", company: "FMC" },
    { id: "32140", name: "Expedition", activeIngredient: "Isoclast + Lambdacialotrina", family: "Insecticida", company: "Corteva" },
    { id: "30500", name: "Engage", activeIngredient: "Tiametoxam + Lambdacialotrina", family: "Insecticida", company: "Syngenta" },
    { id: "38900", name: "Pirate", activeIngredient: "Clorfenapir 24%", family: "Insecticida", company: "BASF" },
    
    // TRATAMIENTO SEMILLAS
    { id: "31200", name: "Vibrance Integral", activeIngredient: "Sedaxane + Fludioxonil + Metalaxyl-M + Thiamethoxam", family: "Tratamiento Semilla", company: "Syngenta" },
    { id: "34500", name: "Evergol Energy", activeIngredient: "Prothioconazole + Penflufen + Metalaxyl", family: "Tratamiento Semilla", company: "Bayer" },
    { id: "39010", name: "Ilevo", activeIngredient: "Fluopyram 50%", family: "Tratamiento Semilla", company: "BASF" },

    // BIOESTIMULANTES Y FOLIAR
    { id: "BIO-001", name: "Fertigrow Foliar", activeIngredient: "N-P-K + Micronutrientes", family: "Fertilizante Foliar", company: "Yara" },
    { id: "BIO-002", name: "Megafol", activeIngredient: "Aminoácidos + Vitaminas", family: "Bioestimulante", company: "Valagro" },
    { id: "BIO-003", name: "Crop+ ", activeIngredient: "Extractos vegetales enriquecidos", family: "Bioestimulante", company: "Cytozyme" },
    { id: "BIO-004", name: "Biozyme TF", activeIngredient: "Enzimas + Hormonas vegetales", family: "Bioestimulante", company: "UPL" },
    { id: "BIO-005", name: "YaraVita Brassitrel", activeIngredient: "Boro, Magnesio, Molibdeno", family: "Fertilizante Foliar", company: "Yara" },

    // COADYUVANTES
    { id: "ADJ-001", name: "Rizovant", activeIngredient: "Aceite Metilado de Soja", family: "Coadyuvante", company: "Rizobacter" },
    { id: "ADJ-002", name: "Silwet L-77", activeIngredient: "Organosilicona 100%", family: "Coadyuvante", company: "Momentive" },
    { id: "ADJ-003", name: "Break-Thru", activeIngredient: "Poliéter Trisiloxano", family: "Coadyuvante", company: "Evonik" },
    { id: "ADJ-004", name: "Sinergia", activeIngredient: "Corrector de agua + Secuestrante", family: "Coadyuvante", company: "SpeedAgro" },
];
