import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth'; // Se restaura la conexión con tu hook original.
import { Scale, Users, FileText, Vote, Github, Twitter, Linkedin } from 'lucide-react';

const Index = () => {
    // Se mantiene la lógica de autenticación original
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    // El diseño ahora está en formato TSX con el nuevo tema de colores
    return (
        <div className="w-full bg-white text-gray-800 font-sans">

            {/* Header / Navegación */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm">
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16 border-b border-gray-200">
                        <div className="flex items-center space-x-2">
                            <Scale className="text-blue-600" />
                            <a href="#" className="text-xl font-bold text-gray-900">The Resolution Hub</a>
                        </div>
                        <div className="flex items-center space-x-6">
                            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-600">
                                <a href="#features" className="hover:text-blue-600 transition-colors">Características</a>
                                <a href="#how-it-works" className="hover:text-blue-600 transition-colors">¿Cómo funciona?</a>
                                <a href="#" className="hover:text-blue-600 transition-colors">Precios</a>
                                <a href="news" className="hover:text-blue-600 transition-colors">Noticias</a>
                            </nav>
                            
                            <a href="/auth" className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors border border-gray-300">
                                Iniciar Sesión
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <main className="pt-16">
                {/* Sección Hero */}
                <section className="py-20 md:py-32 text-center bg-gray-50">
                    <div className="container mx-auto px-4">
                        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
                            Gestiona tus Modelos de <br className="hidden md:block" /> Naciones Unidas con <span className="bg-gradient-to-r from-sky-500 to-blue-600 text-transparent bg-clip-text">precisión</span>.
                        </h1>
                        <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
                            Una plataforma todo en uno para organizar, administrar y ejecutar simulaciones MUN de manera eficiente, desde la gestión de delegados hasta la votación final de resoluciones.
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <a href="/auth" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                                Empezar Ahora
                            </a>
                        </div>
                    </div>
                </section>

                {/* Sección de Características */}
                <section id="features" className="py-20">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-gray-900">Todo lo que necesitas para un MUN exitoso</h2>
                            <p className="mt-2 text-gray-600">Herramientas poderosas para organizadores y participantes.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="inline-block bg-blue-100 p-3 rounded-lg mb-4">
                                    <Users className="text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Gestión de Delegados</h3>
                                <p className="mt-2 text-sm text-gray-600">Inscribe, asigna y comunica con todos los participantes desde un único panel de control.</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="inline-block bg-blue-100 p-3 rounded-lg mb-4">
                                    <FileText className="text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Flujo de Resoluciones</h3>
                                <p className="mt-2 text-sm text-gray-600">Permite la redacción, envío, debate y enmienda de propuestas de resolución en tiempo real.</p>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                <div className="inline-block bg-blue-100 p-3 rounded-lg mb-4">
                                    <Vote className="text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">Votaciones y Resultados</h3>
                                <p className="mt-2 text-sm text-gray-600">Facilita los procesos de votación con resultados instantáneos y registros históricos.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Sección de Visualización */}
                <section id="how-it-works" className="py-20 bg-gray-50">
                    <div className="container mx-auto px-4 text-center">
                        <h2 className="text-3xl font-bold text-gray-900">Una interfaz intuitiva y poderosa</h2>
                        <p className="mt-2 text-gray-600 max-w-xl mx-auto">Diseñada para que todos puedan concentrarse en el debate, no en el software.</p>
                        <div className="mt-12">
                            <div className="bg-white ring-1 ring-gray-200 rounded-xl shadow-2xl p-4 max-w-4xl mx-auto">
                                <div className="flex items-center space-x-2 mb-3 px-2">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                                    <img src="https://placehold.co/1024x576/f3f4f6/4b5563?text=Vista+Previa+de+la+App" alt="Vista previa de la aplicación" className="w-full h-full object-cover rounded-lg"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-gray-100 border-t border-gray-200">
                <div className="container mx-auto px-4 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="md:col-span-1">
                            <div className="flex items-center space-x-2 mb-4">
                                <Scale className="text-blue-600" />
                                <span className="text-lg font-bold text-gray-900">The Resolution Hub</span>
                            </div>
                            <p className="text-sm text-gray-600">Suscríbete para recibir noticias y actualizaciones.</p>
                            <form className="mt-4 flex">
                                <input type="email" placeholder="Tu correo electrónico" className="w-full bg-white border border-gray-300 rounded-l-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <button type="submit" className="bg-gray-200 text-gray-700 px-4 rounded-r-lg text-sm font-semibold hover:bg-gray-300">Suscribir</button>
                            </form>
                        </div>
                        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                            <div>
                                <h4 className="font-semibold text-gray-900">Producto</h4>
                                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                                    <li><a href="#" className="hover:text-blue-600">Características</a></li>
                                    <li><a href="#" className="hover:text-blue-600">Seguridad</a></li>
                                    <li><a href="#" className="hover:text-blue-600">Precios</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Compañía</h4>
                                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                                    <li><a href="#" className="hover:text-blue-600">Sobre nosotros</a></li>
                                    <li><a href="#" className="hover:text-blue-600">Carreras</a></li>
                                    <li><a href="#" className="hover:text-blue-600">Contacto</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900">Legal</h4>
                                <ul className="mt-4 space-y-2 text-sm text-gray-600">
                                    <li><a href="#" className="hover:text-blue-600">Términos</a></li>
                                    <li><a href="#" className="hover:text-blue-600">Privacidad</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
                        <p>&copy; 2024 The Resolution Hub. Todos los derechos reservados.</p>
                        <div className="flex space-x-4 mt-4 md:mt-0">
                            <a href="#" className="hover:text-gray-900"><Github size={20} /></a>
                            <a href="#" className="hover:text-gray-900"><Twitter size={20} /></a>
                            <a href="#" className="hover:text-gray-900"><Linkedin size={20} /></a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Index;

