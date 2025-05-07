import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Users, Brain, Clock, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import SectionHeading from '../components/SectionHeading';
import Card from '../components/Card';

const Home = () => {
    const services = [
        {
            icon: <Brain className="w-12 h-12 text-teal-600 mb-4" />,
            title: 'Formación Continua',
            description:
                'oportunidades de capacitación y desarrollo profesional.',
        },
        {
            icon: <Users className="w-12 h-12 text-teal-600 mb-4" />,
            title: 'Red de Apoyo',
            description:
                'ambiente colaborativo para conectar y apoyar a los colegas.',
        },
        {
            icon: <Clock className="w-12 h-12 text-teal-600 mb-4" />,
            title: 'Promoción de la Salud Mental',
            description:
                'contribución efectiva y ética al bienestar individual y social.',
        },
    ];

    const testimonials = [
        {
            quote:
                'The compassionate care I received at MindWell transformed my life. For the first time, I felt truly understood and supported.',
            author: 'Maria S.',
        },
        {
            quote:
                'The group sessions helped me realize I wasn\'t alone in my struggles. The community here is incredibly supportive and encouraging.',
            author: 'David L.',
        },
        {
            quote:
                'The tools and strategies I learned have made a lasting impact on how I manage my anxiety. I\'m forever grateful.',
            author: 'Sarah T.',
        },
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
            <section className="bg-gradient-to-br from-blue-50 to-teal-50 py-20 md:py-28">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center">
                        <div className="md:w-1/2 md:pr-12">
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-800 leading-tight mb-6"
                            >
                                Colegio departamental de <span className="text-teal-600">Psicólogos</span> de La Paz
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="text-xl text-gray-600 mb-8"
                            >
                                Fundado en febrero de 1999, nos comprometemos a mejorar las condiciones laborales de nuestros colegas psicólogos y promover el valor de su trabajo en la sociedad.
                            </motion.p>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                                className="flex flex-col sm:flex-row gap-4"
                            >
                                <Button size="large" as={Link} to="/contact">
                                    Registrarse
                                </Button>
                                <Button size="large" variant="outline" as={Link} to="/about">
                                    Mi Estado
                                </Button>
                            </motion.div>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.7, delay: 0.3 }}
                            className="md:w-1/2 mt-12 md:mt-0"
                        >
                            <img
                                src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                                alt="Psychology support team"
                                className="w-full h-auto rounded-lg shadow-xl"
                            />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Our Mission */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <SectionHeading
                            title="Que es el CDPLP?"
                            subtitle="Somos una organización cuyo fin es regular la práctica de la psicología a nivel departamental, que promueve el desarrollo humano de la sociedad boliviana respaldando a los psicólogos para que realicen sus actividades dentro de principios éticos, científicos y profesionales a través de procesos de capacitación y actualización, generando propuestas de acción y apoyo mutuo entre colegiados. Aportamos, a nivel departamental, nacional e internacional, al desarrollo del conocimiento científico, mediante la investigación e innovación en psicología. Asimismo, contribuimos efectiva y éticamente en la generación de soluciones que favorecen el bienestar individual y social."
                            centered
                        />
                        
                    </div>
                </div>
            </section>

            {/* Services */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        title="Nuestros Servicios"
                        subtitle="We offer a range of psychological services to support your mental health journey."
                        centered
                    />

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
                    >
                        {services.map((service, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <Card className="p-8 h-full flex flex-col items-center text-center">
                                    {service.icon}
                                    <h3 className="text-xl font-bold text-gray-800 mb-3">{service.title}</h3>
                                    <p className="text-gray-600">{service.description}</p>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>

                </div>
            </section>

            {/* Testimonials */}
            {/* <section className="py-20 bg-teal-600 text-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        title="Client Experiences"
                        subtitle="Hear from those we\'ve had the privilege to support on their mental health journey."
                        centered
                        className="text-white"
                    />

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12"
                    >
                        {testimonials.map((testimonial, index) => (
                            <motion.div key={index} variants={itemVariants}>
                                <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-white border-opacity-20 h-full flex flex-col">
                                    <div className="flex-1">
                                        <Heart className="w-8 h-8 text-teal-300 mb-4" />
                                        <p className="italic text-white mb-4">{testimonial.quote}</p>
                                    </div>
                                    <p className="font-semibold text-teal-200">— {testimonial.author}</p>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section> */}

            {/* CTA Section */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-4xl mx-auto text-center">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5 }}
                            className="text-3xl md:text-4xl font-bold text-gray-800 mb-6"
                        >
                            Listo para registrarte con nosotros?
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-xl text-gray-600 mb-12"
                        >
                            Mira los requisitos, beneficios y procedimiento para registrarte como miembro del CDPLP.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <Link className='bg-gray-800 p-4  rounded-2xl text-white font-bold' to="/registro">
                                Registrarse
                            </Link>
                        </motion.div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;