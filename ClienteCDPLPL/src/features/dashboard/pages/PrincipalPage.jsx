import { Activities } from "../components/Activities";
import StatCard from "../components/Cards";
import {
    Users,
    DollarSign,
    ShoppingCart,
    TrendingUp,
    FileText,
    Shield,
    Settings,
    Zap
} from 'lucide-react';
import Tables from "../components/Tables";

const PrincipalPage = () => {

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ">
                <StatCard
                    title="Total Users"
                    value="24,521"
                    change="+12.5%"
                    positive={true}
                    icon={<Users size={20} />}
                    color="blue"
                />
                <StatCard
                    title="Revenue"
                    value="$86,589"
                    change="+8.2%"
                    positive={true}
                    icon={<DollarSign size={20} />}
                    color="green"
                />
                <StatCard
                    title="Orders"
                    value="1,249"
                    change="-3.1%"
                    positive={false}
                    icon={<ShoppingCart size={20} />}
                    color="amber"
                />
                <StatCard
                    title="Conversion"
                    value="3.8%"


                />
            </div>
            <Tables email='nada' esto='Tmbopoco nada'/>
            <div>
                <Activities/>
            </div>
        </>
    );
};

export default PrincipalPage;