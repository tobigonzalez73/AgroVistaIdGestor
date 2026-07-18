import { useState } from 'react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import ChatPanel from '../chat/ChatPanel';
import { usePageTracking } from '../../hooks/usePageTracking';

interface LayoutProps {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    usePageTracking();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Sidebar */}
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

            {/* Content area */}
            <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                {/* Topbar */}
                <TopBar setSidebarOpen={setSidebarOpen} />

                {/* Main Content */}
                <main className="w-full">
                    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
            {/* Slide-over del chat global */}
            <ChatPanel />
        </div>
    );
}
