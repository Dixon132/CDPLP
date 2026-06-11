import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Library, PlayCircle, Settings, ChevronLeft, ChevronRight, Activity, Cloud } from 'lucide-react';

const QALayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/qa' },
        { id: 'catalog', label: 'Test Catalog', icon: <Library size={18} />, path: '/qa/catalog' },
        { id: 'settings', label: 'Platform Settings', icon: <Settings size={18} />, path: '/qa/settings' },
    ];

    const isActive = (path) => {
        if (path === '/qa' && location.pathname === '/qa') return true;
        if (path !== '/qa' && location.pathname.startsWith(path)) return true;
        return false;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#F8FAFC', fontFamily: "'Segoe UI', system-ui, sans-serif", color: '#0F172A', overflow: 'hidden' }}>
            {/* Slim Top Navbar (AWS/Azure Style) */}
            <header style={{ height: 48, background: '#1E293B', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#38BDF8' }}>
                        <Cloud size={20} />
                        <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>CDPLP</span>
                    </div>
                    <div style={{ width: 1, height: 20, background: '#334155' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#E2E8F0' }}>Enterprise QA Console</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFFFFF', padding: '4px 12px', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Exit to Main System
                    </button>
                </div>
            </header>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Collapsible Sidebar */}
                <aside style={{ width: collapsed ? 50 : 220, background: '#FFFFFF', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', transition: 'width 0.2s', flexShrink: 0 }}>
                    <div style={{ padding: '8px', display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end' }}>
                        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 4 }}>
                            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                        </button>
                    </div>
                    <nav style={{ flex: 1, padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {menuItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.path)}
                                title={collapsed ? item.label : ''}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px', borderRadius: 6, border: 'none',
                                    background: isActive(item.path) ? '#EFF6FF' : 'transparent',
                                    color: isActive(item.path) ? '#2563EB' : '#475569',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s',
                                    justifyContent: collapsed ? 'center' : 'flex-start'
                                }}
                            >
                                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                                {!collapsed && <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>}
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default QALayout;
