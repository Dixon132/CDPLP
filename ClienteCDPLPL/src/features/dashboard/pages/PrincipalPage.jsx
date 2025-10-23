import {
    Users,
    DollarSign,
    ShoppingCart,
    TrendingUp,
    Calendar,
    FileText,
    UserCheck,
    Award,
    Clock,
    ChevronRight,
    Activity,
    Mail,
    BookOpen,
    Heart,
    Shield
} from 'lucide-react';

const StatCard = ({ title, value, change, positive, icon, color }) => {
    const colorClasses = {
        blue: 'from-blue-500 to-blue-600 text-blue-600 bg-blue-50',
        green: 'from-green-500 to-green-600 text-green-600 bg-green-50',
        amber: 'from-amber-500 to-amber-600 text-amber-600 bg-amber-50',
        purple: 'from-purple-500 to-purple-600 text-purple-600 bg-purple-50',
        indigo: 'from-indigo-500 to-indigo-600 text-indigo-600 bg-indigo-50',
        rose: 'from-rose-500 to-rose-600 text-rose-600 bg-rose-50'
    };

    return (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 hover:shadow-xl transition-all duration-300 group hover:-translate-y-1 ">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colorClasses[color]?.split(' ')[3] || 'bg-blue-50'}`}>
                    <span className={colorClasses[color]?.split(' ')[2] || 'text-blue-600'}>
                        {icon}
                    </span>
                </div>
                {change && (
                    <div className={`flex items-center text-sm font-semibold ${positive ? 'text-green-600' : 'text-red-600'
                        }`}>
                        <TrendingUp size={14} className={`mr-1 ${positive ? '' : 'rotate-180'}`} />
                        {change}
                    </div>
                )}
            </div>
            <div>
                <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
                <p className="text-slate-600 text-sm font-medium">{title}</p>
            </div>
        </div>
    );
};

const QuickAction = ({ title, icon, color, onClick }) => {
    return (
        <button
            onClick={onClick}
            className="group bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/60 hover:shadow-lg transition-all duration-300 flex items-center space-x-3 hover:border-blue-300"
        >
            <div className={`p-2 rounded-lg ${color}`}>
                {icon}
            </div>
            <span className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                {title}
            </span>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all ml-auto" />
        </button>
    );
};

const RecentActivity = ({ title, time, type, icon }) => {
    const typeColors = {
        success: 'bg-green-100 text-green-600',
        warning: 'bg-amber-100 text-amber-600',
        info: 'bg-blue-100 text-blue-600',
        default: 'bg-slate-100 text-slate-600'
    };

    return (
        <div className="flex items-center space-x-4 p-3 rounded-lg hover:bg-slate-50/80 transition-colors">
            <div className={`p-2 rounded-lg ${typeColors[type] || typeColors.default}`}>
                {icon}
            </div>
            <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{title}</p>
                <p className="text-xs text-slate-500">{time}</p>
            </div>
        </div>
    );
};

const DashboardHome = () => {
    return (
        <div className="min-h-full space-y-8 m-9">
            {/* Hero Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-3xl">
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-purple-800/90" />
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-48 translate-x-48 blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full translate-y-48 -translate-x-48 blur-3xl" />
                </div>

                <div className="relative px-8 py-12">
                    <div className="grid md:grid-cols-2 gap-8 items-center">
                        <div className="space-y-6">
                            <div className="flex items-center space-x-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                    {/* Placeholder para logo */}
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-blue-100 flex items-center justify-center">
                                        <Shield className="text-blue-600" size={24} />
                                    </div>
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-white">CDPLP</h1>
                                    <p className="text-blue-100 text-sm">Dashboard Administrativo</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-4xl font-bold text-white leading-tight">
                                    Bienvenido al Colegio Departamental de Psicólogos de La Paz
                                </h2>
                                <p className="text-blue-100 text-lg leading-relaxed">
                                    Nos alegra tenerte aquí. Gestiona eficientemente todas las actividades,
                                    correspondencia y servicios de nuestra institución profesional.
                                </p>
                            </div>

                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/30">
                                    <Calendar className="text-white" size={16} />
                                    <span className="text-white text-sm font-medium">
                                        {new Date().toLocaleDateString('es-ES', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 bg-green-500/20 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-400/30">
                                    <Activity className="text-green-300" size={16} />
                                    <span className="text-green-300 text-sm font-medium">Sistema Activo</span>
                                </div>
                            </div>
                        </div>

                        <div className="hidden md:flex justify-center">
                            <div className="relative">
                                <div className="w-72 h-72 rounded-full flex items-center justify-center">

                                    <img src="/img/logo.png" alt="Logo" />

                                </div>
                                <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center ">
                                    <Award className="text-white" size={32} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-slate-900">Estadísticas Generales</h3>
                    <button className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium">
                        <span>Ver más detalles</span>
                        <ChevronRight size={16} />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Colegiados Activos"
                        value="2,847"
                        change="+12.5%"
                        positive={true}
                        icon={<Users size={20} />}
                        color="blue"
                    />
                    <StatCard
                        title="Ingresos Mensuales"
                        value="Bs. 186,589"
                        change="+8.2%"
                        positive={true}
                        icon={<DollarSign size={20} />}
                        color="green"
                    />
                    <StatCard
                        title="Correspondencias"
                        value="1,249"
                        change="-3.1%"
                        positive={false}
                        icon={<Mail size={20} />}
                        color="amber"
                    />
                    <StatCard
                        title="Eventos Realizados"
                        value="47"
                        change="+15.8%"
                        positive={true}
                        icon={<Calendar size={20} />}
                        color="purple"
                    />
                </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid lg:grid-cols-3 gap-8">
                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Acciones Rápidas</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <QuickAction
                            title="Nuevo Colegiado"
                            icon={<UserCheck className="text-blue-600" size={20} />}
                            color="bg-blue-50"
                        />
                        <QuickAction
                            title="Generar Reporte"
                            icon={<FileText className="text-green-600" size={20} />}
                            color="bg-green-50"
                        />
                        <QuickAction
                            title="Revisar Correspondencia"
                            icon={<Mail className="text-amber-600" size={20} />}
                            color="bg-amber-50"
                        />
                        <QuickAction
                            title="Programar Evento"
                            icon={<Calendar className="text-purple-600" size={20} />}
                            color="bg-purple-50"
                        />
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-900">Actividad Reciente</h3>
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-6 space-y-4">
                        <RecentActivity
                            title="Nueva correspondencia recibida"
                            time="Hace 5 minutos"
                            type="info"
                            icon={<Mail size={16} />}
                        />
                        <RecentActivity
                            title="Colegiado aprobado"
                            time="Hace 1 hora"
                            type="success"
                            icon={<UserCheck size={16} />}
                        />
                        <RecentActivity
                            title="Evento programado"
                            time="Hace 2 horas"
                            type="warning"
                            icon={<Calendar size={16} />}
                        />
                        <RecentActivity
                            title="Reporte generado"
                            time="Hace 4 horas"
                            type="default"
                            icon={<FileText size={16} />}
                        />
                    </div>
                </div>
            </div>

            {/* Professional Services Section */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-2xl p-8 border border-slate-200/60">
                <div className="text-center space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-3xl font-bold text-slate-900">Servicios Profesionales</h3>
                        <p className="text-slate-600 max-w-2xl mx-auto">
                            Comprometidos con la excelencia profesional y el desarrollo continuo de
                            la psicología en el departamento de La Paz.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60 hover:shadow-lg transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="text-blue-600" size={24} />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">Formación Continua</h4>
                            <p className="text-slate-600 text-sm">Programas de capacitación y actualización profesional</p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60 hover:shadow-lg transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mx-auto mb-4">
                                <Shield className="text-green-600" size={24} />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">Ética Profesional</h4>
                            <p className="text-slate-600 text-sm">Supervisión y garantía de estándares éticos</p>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200/60 hover:shadow-lg transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-4">
                                <Heart className="text-purple-600" size={24} />
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900 mb-2">Apoyo Comunitario</h4>
                            <p className="text-slate-600 text-sm">Servicios y programas para el bienestar social</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHome;