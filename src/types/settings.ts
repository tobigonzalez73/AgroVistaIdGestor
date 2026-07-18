export interface CompanySettings {
    name: string;
    cuit: string;
    logoUrl?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    currency: 'ARS' | 'USD';
    defaultTaxRate: number;
    activity?: string;
}

export interface MessagingSettings {
    enableInternalChat: boolean;
    enableEmailNotifications: boolean;
    autoCreateGroupForTrials: boolean;
    autoCreateGroupForTasks: boolean;
    allowAttachments: boolean;
}

export interface SmtpSettings {
    server: string;
    port: number;
    user: string;
    password?: string;
    encryption: 'none' | 'ssl' | 'tls';
    senderEmail: string;
    senderName: string;
}

export interface TextTemplate {
    id: string;
    title: string;
    content: string;
    category: 'invoice' | 'receipt' | 'labor' | 'quotation' | 'all';
}

export interface SystemSettings {
    company: CompanySettings;
    notifications: {
        email: boolean;
        push: boolean;
        approvalRequests: boolean;
    };
    messaging: MessagingSettings;
    smtp?: SmtpSettings;
    textTemplates?: TextTemplate[];
    theme: 'light' | 'dark' | 'system';
}
