import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Award, Users, Clock, Check } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import Card from '../components/Card';

const About = () => {
    const team = [
        {
            name: 'Dr. Maria Rodriguez',
            role: 'Clinical Psychologist',
            image: 'https://images.pexels.com/photos/5792641/pexels-photo-5792641.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            bio: 'Dr. Rodriguez specializes in cognitive behavioral therapy with over 15 years of experience helping individuals overcome anxiety and depression.',
        },
        {
            name: 'Dr. James Wilson',
            role: 'Therapist',
            image: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            bio: 'With expertise in family therapy and relationship counseling, Dr. Wilson helps clients build stronger connections and resolve conflicts.',
        },
        {
            name: 'Sarah Thompson',
            role: 'Mental Health Counselor',
            image: 'https://images.pexels.com/photos/5699516/pexels-photo-5699516.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
            bio: 'Sarah specializes in trauma-informed care and mindfulness-based approaches to help clients heal and develop resilience.',
        },
    ];

    const values = [
        {
            icon: <Heart className="w-10 h-10 text-teal-600 mb-4" />,
            title: 'Integridad',
            description: 'Promovemos la honestidad y ética en nuestra profesión.',
        },
        {
            icon: <Award className="w-10 h-10 text-teal-600 mb-4" />,
            title: 'Colaboración',
            description: 'Fomentamos el trabajo en equipo y el intercambio de conocimientos entre colegas.',
        },
        {
            icon: <Users className="w-10 h-10 text-teal-600 mb-4" />,
            title: 'Compromiso',
            description: 'Nos comprometemos a apoyar a nuestros colegas en cada etapa de su carrera profesional.',
        },
        {
            icon: <Clock className="w-10 h-10 text-teal-600 mb-4" />,
            title: 'Participación',
            description: 'Impulsamos la participación activa de todos los miembros del equipo, fomentando la colaboración constante para lograr mejores resultados.',
        },
        {
            icon: <Clock className="w-10 h-10 text-teal-600 mb-4" />,
            title: 'Protección del bienestar',
            description: 'Cuidamos el bienestar de nuestro equipo, promoviendo un ambiente seguro y saludable tanto física como emocionalmente.',
        },
        {
            icon: <Clock className="w-10 h-10 text-teal-600 mb-4" />,
            title: 'Transparencia',
            description: 'Actuamos con total transparencia en todas nuestras acciones, asegurando que la información esté clara y accesible para todos los interesados.',
        }
    ];

    const approaches = [
        {
            title : 'Formación Continua',
            description : 'Ofrecemos oportunidades de capacitación y desarrollo profesional continuo para nuestros miembros.'
        },
        {
            title : 'Defensa de Derechos',
            description : 'Nos comprometemos a defender los derechos profesionales de nuestros colegas con pasión y compromiso.'
        },
        {
            title : 'Red de Apoyo',
            description : 'Brindamos un ambiente colaborativo donde los psicólogos pueden conectar y apoyarse mutuamente.'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    return (
        <div className="pt-16">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-blue-50 to-teal-50 py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-4xl sm:text-5xl font-bold text-gray-800 mb-6"
                        >
                            Sobre <span className="text-teal-600">CDPLP</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-xl text-gray-600"
                        >
                            Fundado en febrero de 1999, nos comprometemos a mejorar las condiciones laborales de nuestros colegas psicólogos y promover el valor de su trabajo en la sociedad.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Our Story */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="md:w-1/2"
                        >
                            <img
                                src="https://images.pexels.com/photos/3184295/pexels-photo-3184295.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                alt="Team meeting"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </motion.div>
                        <div className="md:w-1/2">
                            <SectionHeading title="Misión" />
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="space-y-4 text-gray-600"
                            >
                                <p>
                                Somos una organización comprometida con la sociedad que ejerce la representación legal y la defensa de los derechos de los Psicólogos a nivel departamental.  
                                </p>
                                <p>
                                Respaldamos a los psicólogos para que realicen sus actividades dentro de principios éticos, científicos y profesionales a través de procesos de capacitación y actualización, generando propuestas de acción y apoyo mutuo entre colegiados. Aportamos, a nivel departamental, nacional e internacional, al desarrollo del conocimiento científico, mediante la investigación e innovación en psicología.
                                </p>
                                <p>
                                Asimismo, contribuimos efectiva y éticamente en la generación de soluciones que favorecen el bienestar individual y social.
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>
            {/* vision */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="md:w-1/2">
                            <SectionHeading title="Visión" />
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="space-y-4 text-gray-600"
                            >
                                <p>
                                Promover el ejercicio profesional en todas sus especialidades, al servicio de la prevención, diagnóstico, pronostico, tratamiento, promoción e investigación de la conducta humana, aportando a la Salud Mental de la población en pleno derecho de sus facultades contribuyendo a fomentar una mejor calidad de vida de la población a través del ejercicio legal de la profesión. 
                                </p>
                                
                            </motion.div>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="md:w-1/2"
                        >
                            <img
                                src="https://images.pexels.com/photos/3184295/pexels-photo-3184295.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                alt="Team meeting"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Our Values */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        title="Nuestros Valores"
                        subtitle="Estos son los principios que guían nuestro trabajo y nuestra misión."
                        centered
                    />

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2 gap-8 mt-12"
                    >
                        {values.map((value, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Card className="p-6 h-full flex flex-col items-center text-center">
                                    {value.icon}
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">{value.title}</h3>
                                    <p className="text-gray-600">{value.description}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Our Approach */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="md:w-1/2">
                            <SectionHeading title="Propuesta de Valor Único" />
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-gray-600 mb-6"
                            >
                                Descubre por qué somos la mejor opción para tu desarrollo profesional
                            </motion.p>
                            <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true }}
                                className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mt-6"
                            >
                                {approaches.map((approach, index) => (
                                    <motion.div key={index} variants={itemVariants} className="flex-col">
                                        <Check className="text-teal-600 w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                                        <h2 className='className="text-xl font-bold text-gray-800 mb-2"'>{approach.title}</h2>
                                        <p className="text-gray-600">{approach.description}</p>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="md:w-1/2"
                        >
                            <img
                                src="https://images.pexels.com/photos/7176319/pexels-photo-7176319.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                alt="Therapy session"
                                className="w-full h-auto rounded-lg shadow-lg"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>






            {/* Our Team */}
            {/* <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        title="Conoce a nuestro equipo"
                        subtitle="Un grupo de profesionales apasionados por la psicología y el bienestar social."
                        centered
                    />

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
                    >
                        {team.map((member, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Card className="h-full overflow-hidden flex flex-col">
                                    <div className="relative h-64 overflow-hidden">
                                        <img
                                            src={member.image}
                                            alt={member.name}
                                            className="w-full h-full object-cover object-center transition-transform duration-300 hover:scale-105"
                                        />
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                                        <p className="text-teal-600 mb-4">{member.role}</p>
                                        <p className="text-gray-600 flex-1">{member.bio}</p>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section> */}
        </div>
    );
};

export default About;