"use client";

import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Briefcase,
    ShoppingBag,
    FileText,
    Users,
    Video,
    Plus,
    TrendingUp,
    MessageSquare,
    UserCircle,
    CreditCard,
    CheckCircle2,
    Package,
    Wrench,
    Search,
    ChevronRight
} from 'lucide-react';

/**
 * EnhancedDashboard Component (Binary Toggle Version)
 * 
 * Features:
 * - Strict Binary Mode Toggle (Employer <-> Vendor)
 * - Persisted active mode in localStorage
 * - Premium Glassmorphic UI matching IOPPS Design System
 * - Responsive Layout
 */
// --- UI Components ---

const SidebarItem = ({ icon: Icon, label, active = false, badge = 0 }: { icon: React.ComponentType<{ size: number }>; label: string; active?: boolean; badge?: number }) => (
    <div className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer mb-1 ${active
        ? 'bg-accent/10 text-[#14B8A6] border border-[#14B8A6]/20'
        : 'text-[var(--text-muted)] hover:text-foreground hover:bg-surface'
        }`}>
        <div className="flex items-center gap-3">
            <Icon size={18} />
            <span className="text-sm font-medium">{label}</span>
        </div>
        {badge > 0 && (
            <span className="bg-accent text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {badge}
            </span>
        )}
    </div>
);

const StatCard = ({ icon: Icon, value, label }: { icon: React.ComponentType<{ size: number }>; value: string | number; label: string }) => (
    <div className="bg-surface border border-[var(--card-border)]/80 p-6 rounded-2xl hover:border-[#14B8A6]/50 focus-within:border-[#14B8A6]/50 active:border-[#14B8A6]/50 transition-all group">
        <div className="flex items-center gap-4 mb-2">
            <div className="p-2.5 rounded-xl bg-surface text-[var(--text-muted)] group-hover:text-[#14B8A6] transition-colors">
                <Icon size={20} />
            </div>
            <div>
                <h3 className="text-2xl font-bold text-foreground">{value}</h3>
                <p className="text-xs text-foreground0 uppercase tracking-wider">{label}</p>
            </div>
        </div>
    </div>
);

export default function EnhancedDashboard() {
    // --- State & Initialization ---
    const [activeMode, setActiveMode] = useState<'employer' | 'vendor'>('employer');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load persistence
    useEffect(() => {
        const savedMode = localStorage.getItem('dashboard_active_mode');
        if (savedMode === 'employer' || savedMode === 'vendor') {
            setActiveMode(savedMode);
        }
        setIsLoaded(true);
    }, []);

    // Save persistence
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem('dashboard_active_mode', activeMode);
        }
    }, [activeMode, isLoaded]);

    // Toggle Function
    const toggleMode = () => {
        setActiveMode(prev => prev === 'employer' ? 'vendor' : 'employer');
    };

    if (!isLoaded) return null;

    return (
        <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/30">
            {/* Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
            </div>

            <div className="relative max-w-[1600px] mx-auto flex h-screen gap-6 p-6 overflow-hidden">

                {/* --- Sidebar --- */}
                <aside className="w-72 flex flex-col gap-6 flex-shrink-0">
                    {/* Logo & Org Info */}
                    <div className="bg-surface border border-[var(--card-border)]/60 p-5 rounded-3xl flex items-center gap-4 backdrop-blur-xl">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14B8A6] to-teal-700 flex items-center justify-center text-slate-950 font-bold text-xl shadow-lg shadow-[#14B8A6]/20">
                            I
                        </div>
                        <div>
                            <h2 className="font-bold text-foreground">IOPPS Indigenous</h2>
                            <p className="text-xs text-foreground0">Red Pheasant First Nation</p>
                        </div>
                    </div>

                    {/* Binary Toggle Switch */}
                    <div className="bg-surface border border-[var(--card-border)]/60 p-5 rounded-3xl backdrop-blur-xl">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground0 mb-4 px-1">Dashboard Mode</h3>

                        <div
                            onClick={toggleMode}
                            className="relative h-12 bg-surface rounded-full border border-[var(--card-border)] cursor-pointer p-1 flex items-center justify-between select-none shadow-inner"
                        >
                            {/* Sliding Knob */}
                            <div
                                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-gradient-to-br transition-all duration-300 shadow-lg z-10 ${activeMode === 'employer'
                                    ? 'left-1 from-blue-600 to-blue-500 shadow-blue-500/20'
                                    : 'left-[calc(50%+4px)] from-[#14B8A6] to-teal-600 shadow-teal-500/20'
                                    }`}
                            />

                            {/* Labels */}
                            <div className={`relative z-20 w-1/2 text-center text-xs font-bold transition-colors duration-300 flex items-center justify-center gap-2 ${activeMode === 'employer' ? 'text-white' : 'text-foreground0'
                                }`}>
                                <Briefcase size={14} />
                                Employer
                            </div>
                            <div className={`relative z-20 w-1/2 text-center text-xs font-bold transition-colors duration-300 flex items-center justify-center gap-2 ${activeMode === 'vendor' ? 'text-slate-950' : 'text-foreground0'
                                }`}>
                                Vendor
                                <ShoppingBag size={14} />
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tools */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="mb-8">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground0 mb-4 px-4 flex items-center gap-2">
                                {activeMode === 'employer' ? <Briefcase size={10} /> : <ShoppingBag size={10} />}
                                {activeMode === 'employer' ? 'Employer Tools' : 'Vendor Tools'}
                            </h3>

                            <SidebarItem icon={LayoutDashboard} label="Overview" active />
                            {activeMode === 'employer' ? (
                                <>
                                    <SidebarItem icon={FileText} label="Job Postings" />
                                    <SidebarItem icon={Users} label="Applications" badge={12} />
                                    <SidebarItem icon={Video} label="Interview Videos" />
                                </>
                            ) : (
                                <>
                                    <SidebarItem icon={Package} label="Products" />
                                    <SidebarItem icon={Wrench} label="Services" />
                                    <SidebarItem icon={MessageSquare} label="Inquiries" badge={5} />
                                    <SidebarItem icon={TrendingUp} label="Shop Performance" />
                                </>
                            )}
                        </div>

                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground0 mb-4 px-4">Account</h3>
                            <SidebarItem icon={MessageSquare} label="Messages" />
                            <SidebarItem icon={UserCircle} label="Organization Profile" />
                            <SidebarItem icon={CreditCard} label="Billing & Subscription" />
                        </div>
                    </div>
                </aside>

                {/* --- Main Content --- */}
                <main className="flex-1 overflow-y-auto rounded-3xl pb-20 scroll-smooth">
                    {/* Header */}
                    <header className="flex items-center justify-between mb-8 sticky top-0 bg-background/20 backdrop-blur-lg p-2 -mx-2 z-10">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${activeMode === 'employer' ? 'bg-blue-600/20 text-blue-400' : 'bg-accent/20 text-[#14B8A6]'
                                    }`}>
                                    {activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} Mode
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">Overview</h1>
                        </div>

                        <button className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 ${activeMode === 'employer'
                            ? 'bg-blue-600 text-white shadow-blue-900/20 hover:bg-blue-500'
                            : 'bg-accent text-slate-950 shadow-[#14B8A6]/20 hover:bg-[#16cdb8]'
                            }`}>
                            <Plus size={18} />
                            {activeMode === 'employer' ? 'Post New Job' : 'Add Product/Service'}
                        </button>
                    </header>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {activeMode === 'employer' ? (
                            <>
                                <StatCard icon={Briefcase} value="3" label="Active Jobs" />
                                <StatCard icon={Users} value="47" label="Applications" />
                                <StatCard icon={Search} value="1.2k" label="Job Views" />
                                <StatCard icon={CheckCircle2} value="8" label="Interviews" />
                            </>
                        ) : (
                            <>
                                <StatCard icon={Package} value="12" label="Products" />
                                <StatCard icon={Wrench} value="5" label="Services" />
                                <StatCard icon={Search} value="892" label="Shop Views" />
                                <StatCard icon={MessageSquare} value="15" label="Inquiries" />
                            </>
                        )}
                    </div>

                    {/* Main Card View */}
                    <div className="bg-surface border border-[var(--card-border)]/60 rounded-3xl p-8 backdrop-blur-xl">
                        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center justify-between">
                            {activeMode === 'employer' ? 'Recent Applications' : 'Product Performance'}
                            <button className="text-xs text-[#14B8A6] font-semibold hover:underline flex items-center gap-1 group">
                                View All <ChevronRight size={14} className="group-hover:translate-x-1 group-active:translate-x-1 transition-transform" />
                            </button>
                        </h2>

                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-slate-900/40 border border-[var(--card-border)]/50 hover:border-[#14B8A6]/30 focus-within:border-[#14B8A6]/30 active:border-[#14B8A6]/30 transition-all cursor-pointer group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-[var(--text-muted)] group-hover:bg-accent/10 group-hover:text-[#14B8A6] transition-all">
                                            {activeMode === 'employer' ? <UserCircle size={24} /> : <Package size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground">
                                                {activeMode === 'employer' ? ['Sarah M.', 'James K.', 'Maria T.'][i - 1] : ['Beaded Earrings', 'Website Design', 'Cedar Smudge'][i - 1]}
                                            </h4>
                                            <p className="text-sm text-foreground0">
                                                {activeMode === 'employer' ? ['Community Health Worker', 'IT Specialist', 'Admin Assistant'][i - 1] : ['Handcrafted', 'Services', 'Wellness'][i - 1]}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground0">3 days ago</span>
                                        <span className={`px-4 py-1.5 rounded-lg text-xs font-bold ${i === 1 ? 'bg-blue-600/20 text-blue-400' : 'bg-surface text-[var(--text-muted)]'
                                            }`}>
                                            {i === 1 ? 'New' : 'Reviewed'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Internal CSS for Scrollbar & Animations */}
            <style jsx global>{`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 20px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #334155;
    }
  `}</style>
        </div>
    );
}
