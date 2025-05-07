import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import SectionHeading from '../components/SectionHeading';
import Button from '../components/Button';

export const Contact = () => {
    const [formState, setFormState] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormState({
            ...formState,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // In a real implementation, we would send the form data to a server
        console.log('Form submitted:', formState);
        setSubmitted(true);

        // Reset form after submission
        setTimeout(() => {
            setSubmitted(false);
            setFormState({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: '',
            });
        }, 5000);
    };

    const contactInfo = [
        {
            icon: <MapPin className="w-6 h-6 text-teal-600" />,
            title: 'Nuestra direccion',
            details: ['Calle Francisco Bedregal N° 2877', 'Edificio MGM,Subsuelo, Oficina 3.'],
        },
        {
            icon: <Phone className="w-6 h-6 text-teal-600" />,
            title: 'Celular',
            details: ['69955395'],
        },
        {
            icon: <Mail className="w-6 h-6 text-teal-600" />,
            title: 'Correo',
            details: ['col.psicologoslapaz@gmail.com'],
        },
        {
            icon: <Clock className="w-6 h-6 text-teal-600" />,
            title: 'Horarios',
            details: ['Lunes a Viernes: 8am-6pm'],
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
            <section className="bg-gradient-to-br from-blue-50 to-teal-50 py-20">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-4xl sm:text-5xl font-bold text-gray-800 mb-6"
                        >
                            Contactate con <span className="text-teal-600">Nosotros</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-xl text-gray-600"
                        >
                            Estamos aqui para ayudarte. Contactanos con cualquiera pregunta.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Contact Information */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        title="Informacion de contacto"
                        subtitle="Multiples maneras de contactarnos."
                        centered
                    />

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12"
                    >
                        {contactInfo.map((item, index) => (
                            <motion.div
                                key={index}
                                variants={itemVariants}
                                className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-300"
                            >
                                <div className="flex justify-center mb-4">{item.icon}</div>
                                <h3 className="text-lg font-bold text-gray-800 mb-3">{item.title}</h3>
                                {item.details.map((detail, i) => (
                                    <p key={i} className="text-gray-600">
                                        {detail}
                                    </p>
                                ))}
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Contact Form and Map */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-12">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="lg:w-1/2"
                        >
                            <SectionHeading title="Envianos un mensaje" />
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formState.name}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="email"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Correo
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formState.email}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label
                                            htmlFor="phone"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Numero (Opcional)
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formState.phone}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="subject"
                                            className="block text-sm font-medium text-gray-700 mb-1"
                                        >
                                            Asunto
                                        </label>
                                        <select
                                            id="subject"
                                            name="subject"
                                            value={formState.subject}
                                            onChange={handleChange}
                                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            required
                                        >
                                            <option value="">Porfavor selecciona una</option>
                                            <option value="appointment">Schedule Appointment</option>
                                            <option value="information">Request Information</option>
                                            <option value="support">Crisis Support</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="message"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Mensaje
                                    </label>
                                    <textarea
                                        id="message"
                                        name="message"
                                        value={formState.message}
                                        onChange={handleChange}
                                        rows={5}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                                        required
                                    ></textarea>
                                </div>

                                <div>
                                    <Button type="submit" className="w-full sm:w-auto">
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar Mensaje
                                    </Button>

                                    {submitted && (
                                        <motion.p
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-4 text-green-600 font-medium"
                                        >
                                            Thank you! Your message has been sent successfully.
                                        </motion.p>
                                    )}
                                </div>
                            </form>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="lg:w-1/2"
                        >
                            <SectionHeading title="Nuestra Localización" />
                            <div className="h-96 bg-gray-200 rounded-lg overflow-hidden shadow-md">
                                {/* This would be replaced with an actual map component in a real implementation */}
                                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                    <div className="text-center p-6">
                                        <MapPin className="w-12 h-12 text-teal-600 mx-auto mb-4" />
                                        <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d756.9313345907894!2d-68.12775260748352!3d-16.516484850575743!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915f21f803078a75%3A0x8cffc4fd21073f2b!2sEdificio%20Asturizaga%20Lora!5e1!3m2!1ses-419!2sbo!4v1746630404374!5m2!1ses-419!2sbo" width="700" height="450" style={{border:0}} allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            {/* <section className="py-20 bg-white">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        title="Preguntas frecuentes"
                        subtitle="Encuentra respuestas a preguntas comunes sobre nuestros servicios."
                        centered
                    />

                    <div className="max-w-3xl mx-auto mt-12">
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            {[
                                {
                                    question: 'How do I schedule an appointment?',
                                    answer:
                                        'You can schedule an appointment by calling our office, using the contact form on this page, or emailing us directly at appointments@mindwell.org.',
                                },
                                {
                                    question: 'Do you accept insurance?',
                                    answer:
                                        'Yes, we work with several insurance providers. Please contact us with your insurance information, and we\'ll verify your coverage before your first appointment.',
                                },
                                {
                                    question: 'What should I expect at my first session?',
                                    answer:
                                        'Your first session will involve getting to know you and understanding your needs. We\'ll discuss your history, current concerns, and goals for therapy. This helps us develop a personalized treatment plan.',
                                },
                                {
                                    question: 'Are my sessions confidential?',
                                    answer:
                                        'Yes, all sessions are strictly confidential. We adhere to professional ethical standards and privacy laws to ensure your information remains protected.',
                                },
                            ].map((faq, index) => (
                                <motion.div
                                    key={index}
                                    variants={itemVariants}
                                    className="bg-gray-50 rounded-lg p-6 shadow-sm"
                                >
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">{faq.question}</h3>
                                    <p className="text-gray-600">{faq.answer}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            </section> */}
        </div>
    );
};

