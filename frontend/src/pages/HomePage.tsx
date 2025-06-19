import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaPencilAlt, 
  FaRegFileAlt, 
  FaChartLine, 
  FaCheck, 
  FaAngleRight, 
  FaUsers, 
  FaLightbulb, 
  FaUserTie,
  FaRocket,
  FaStar,
  FaCrown
} from 'react-icons/fa';
import { LazySection } from '../components/performance/LazySection';
import MetaTags from '../components/SEO/MetaTags';
import { analytics } from '../utils/analytics';

const HomePage: React.FC = () => {
  const handleCTAClick = (buttonName: string) => {
    analytics.track({
      action: 'cta_clicked',
      category: 'conversion',
      label: buttonName
    });
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <MetaTags 
        title="Motivation Letter AI - Lettres de motivation parfaites avec l'IA"
        description="Créez des lettres de motivation qui décrochent des entretiens en 30s. IA Gemini Pro, +10k utilisateurs, templates premium. Essai gratuit !"
        keywords="lettre motivation IA, cover letter AI, générateur lettre motivation, templates premium, Gemini Pro"
        url="https://motivationletter.ai"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <LazySection animationType="fade">
          <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
            {/* Background decoration with animations */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl float-animation"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl float-animation" style={{animationDelay: '1s'}}></div>
            
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="lg:w-1/2 max-w-xl">
                  <div className="inline-flex items-center bg-blue-500/20 rounded-full px-4 py-2 text-sm font-medium mb-6 pulse-cta">
                    <FaRocket className="mr-2" />
                    Nouveau : IA intégrée pour la génération
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                    Des lettres de motivation qui 
                    <span className="text-yellow-300 block text-gradient-animated">décrochent des entretiens</span>
                  </h1>
                  
                  <p className="text-lg md:text-xl text-blue-100 mb-8 leading-relaxed">
                    Créez une lettre de motivation professionnelle en quelques minutes grâce à nos modèles éprouvés et notre générateur IA intelligent.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <Link 
                      to="/register" 
                      onClick={() => handleCTAClick('hero-register')}
                      className="inline-flex items-center justify-center px-8 py-4 rounded-xl 
                      bg-blue-700/50 text-blue-700 font-semibold text-lg transition-all duration-300 
                      hover:bg-blue-800/50 hover:shadow-xl hover:scale-105 group btn-premium"
                    >
                      Commencer gratuitement
                      <FaAngleRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link 
                      to="/dashboard/templates" 
                      onClick={() => handleCTAClick('hero-templates')}
                      className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-blue-700/50 text-white border border-blue-400/50 font-semibold text-lg transition-all duration-300 hover:bg-blue-600/50 backdrop-blur-sm"
                    >
                      Voir les modèles
                    </Link>
                  </div>
                  
                  {/* Trust indicators with animations */}
                  <div className="flex items-center gap-6 text-blue-200">
                    <div className="flex items-center">
                      <div className="flex -space-x-2 mr-3">
                        {[...Array(4)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-8 h-8 bg-blue-300 rounded-full border-2 border-white animate-count"
                            style={{animationDelay: `${i * 0.1}s`}}
                          ></div>
                        ))}
                      </div>
                      <span className="text-sm">+10k utilisateurs</span>
                    </div>
                    <div className="flex items-center">
                      <FaStar className="text-yellow-300 mr-1" />
                      <span className="text-sm">4.9/5 étoiles</span>
                    </div>
                  </div>
                </div>
                
                <div className="lg:w-1/2 max-w-lg">
                  <div className="relative card-hover-premium">
                    <div className="absolute -left-4 -top-4 w-full h-full bg-gradient-to-br from-indigo-400/30 to-purple-500/30 rounded-2xl transform -rotate-3 blur-sm"></div>
                    <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-6 gpu-accelerated">
                      {/* Mock letter preview with shimmer effect */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-gray-800 font-semibold">Lettre de motivation</div>
                          <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs success-bounce">Finalisée</div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-200 rounded w-3/4 shimmer"></div>
                          <div className="h-3 bg-gray-200 rounded w-full shimmer"></div>
                          <div className="h-3 bg-gray-200 rounded w-5/6 shimmer"></div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-xs text-blue-600 mb-1">Généré par IA</div>
                          <div className="h-2 bg-blue-200 rounded w-2/3"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Features Section */}
        <LazySection animationType="slideUp">
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Créez des lettres de motivation qui vous démarquent
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Notre plateforme vous offre tous les outils nécessaires pour créer une lettre de motivation percutante qui retient l'attention des recruteurs.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="group p-8 bg-gradient-to-br from-gray-50 to-blue-50/50 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 card-hover-premium">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                    <FaRegFileAlt className="text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Modèles professionnels</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Accédez à une bibliothèque de modèles conçus par des experts en recrutement et adaptés à différents secteurs d'activité.
                  </p>
                </div>

                <div className="group p-8 bg-gradient-to-br from-gray-50 to-purple-50/50 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 card-hover-premium">
                  <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform">
                    <FaPencilAlt className="text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">IA intelligente</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Notre IA vous aide à générer du contenu personnalisé et vous guide pour créer une lettre adaptée à chaque offre d'emploi.
                  </p>
                </div>

                <div className="group p-8 bg-gradient-to-br from-gray-50 to-green-50/50 rounded-2xl hover:shadow-xl transition-all duration-300 hover:-translate-y-2 card-hover-premium">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform">
                    <FaChartLine className="text-2xl" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">Analyse d'impact</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Obtenez des commentaires instantanés sur l'efficacité de votre lettre et des suggestions d'amélioration ciblées.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* How It Works Section */}
        <LazySection animationType="slideLeft">
          <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Comment ça marche
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Trois étapes simples pour créer une lettre de motivation professionnelle qui fait mouche
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="relative">
                  <div className="bg-white p-8 rounded-2xl shadow-lg relative z-10 hover:shadow-xl transition-shadow card-hover-premium">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg">
                      1
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Choisissez un modèle</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Parcourez notre collection de modèles professionnels et sélectionnez celui qui correspond le mieux à votre secteur d'activité.
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-1/2 left-full w-16 h-1 bg-gradient-to-r from-blue-200 to-blue-300 transform -translate-y-1/2 z-0 rounded-full"></div>
                </div>

                <div className="relative">
                  <div className="bg-white p-8 rounded-2xl shadow-lg relative z-10 hover:shadow-xl transition-shadow card-hover-premium">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg">
                      2
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Générez avec l'IA</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Utilisez notre IA pour générer du contenu personnalisé ou adaptez manuellement le texte à votre expérience et l'emploi visé.
                    </p>
                  </div>
                  <div className="hidden md:block absolute top-1/2 left-full w-16 h-1 bg-gradient-to-r from-purple-200 to-green-300 transform -translate-y-1/2 z-0 rounded-full"></div>
                </div>

                <div>
                  <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow card-hover-premium">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center text-xl font-bold mb-6 shadow-lg">
                      3
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Téléchargez et postulez</h3>
                    <p className="text-gray-600 leading-relaxed">
                      Exportez votre lettre en format PDF ou Word professionnel, prête à être envoyée aux recruteurs.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Testimonials Section */}
        <LazySection animationType="scale">
          <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Ce que nos utilisateurs disent
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Des milliers de personnes ont décroché des entretiens grâce à leurs lettres de motivation
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow card-hover-premium">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-4">
                      <FaUsers />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Sophie M.</h4>
                      <p className="text-gray-500 text-sm">Marketing Digital</p>
                    </div>
                    <div className="ml-auto flex text-yellow-400">
                      {[...Array(5)].map((_, i) => <FaStar key={i} className="w-4 h-4" />)}
                    </div>
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">
                    "Grâce à CoverLetter Pro, j'ai pu créer une lettre de motivation qui a vraiment retenu l'attention des recruteurs. J'ai décroché 3 entretiens en une semaine !"
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow card-hover-premium">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mr-4">
                      <FaUserTie />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Thomas L.</h4>
                      <p className="text-gray-500 text-sm">Développeur Web</p>
                    </div>
                    <div className="ml-auto flex text-yellow-400">
                      {[...Array(5)].map((_, i) => <FaStar key={i} className="w-4 h-4" />)}
                    </div>
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">
                    "L'IA m'a permis de mettre en avant mes compétences techniques de manière claire et concise. J'ai reçu des compliments sur ma lettre lors de mon entretien !"
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow card-hover-premium">
                  <div className="flex items-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-4">
                      <FaLightbulb />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Julie R.</h4>
                      <p className="text-gray-500 text-sm">Ressources Humaines</p>
                    </div>
                    <div className="ml-auto flex text-yellow-400">
                      {[...Array(5)].map((_, i) => <FaStar key={i} className="w-4 h-4" />)}
                    </div>
                  </div>
                  <p className="text-gray-700 italic leading-relaxed">
                    "En tant que professionnelle RH, je recommande CoverLetter Pro à tous les candidats. Les modèles sont vraiment de qualité et font la différence."
                  </p>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* Pricing Section */}
        <LazySection animationType="slideUp">
          <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  Tarifs simples et transparents
                </h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                  Choisissez le plan qui correspond à vos besoins
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Free Plan */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 card-hover-premium">
                  <div className="p-8 border-b border-gray-100">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratuit</h3>
                      <p className="text-gray-500 mb-6">Pour commencer</p>
                      <div className="mb-8">
                        <span className="text-4xl font-bold text-gray-900">0€</span>
                        <span className="text-gray-500 ml-2">pour toujours</span>
                      </div>
                      <Link
                        to="/register"
                        onClick={() => handleCTAClick('pricing-free')}
                        className="block w-full py-3 px-4 text-center font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all btn-premium"
                      >
                        Commencer
                      </Link>
                    </div>
                  </div>
                  <div className="p-8">
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Modèles basiques</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Export PDF</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-blue-500 relative transform scale-105 z-10 hover:shadow-2xl transition-all duration-300 card-hover-premium">
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-4 py-2 rounded-bl-xl">
                    <FaCrown className="inline mr-1" />
                    POPULAIRE
                  </div>
                  <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Premium</h3>
                      <p className="text-gray-500 mb-6">Pour les chercheurs d'emploi actifs</p>
                      <div className="mb-8">
                        <span className="text-4xl font-bold text-gray-900">9,99€</span>
                        <span className="text-gray-500 ml-2">/mois</span>
                      </div>
                      <Link
                        to="/register?plan=monthly"
                        onClick={() => handleCTAClick('pricing-premium')}
                        className="block w-full py-3 px-4 text-center font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl btn-premium"
                      >
                        Commencer l'essai
                      </Link>
                    </div>
                  </div>
                  <div className="p-8">
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Lettres illimitées</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Tous les modèles premium</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Export PDF et Word</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Générateur IA avancé</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Assistance prioritaire</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Lifetime Plan */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2 card-hover-premium">
                  <div className="p-8 border-b border-gray-100">
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">À vie</h3>
                      <p className="text-gray-500 mb-6">Pour un accès permanent</p>
                      <div className="mb-8">
                        <span className="text-4xl font-bold text-gray-900">99€</span>
                        <span className="text-gray-500 ml-2">paiement unique</span>
                      </div>
                      <Link
                        to="/register?plan=lifetime"
                        onClick={() => handleCTAClick('pricing-lifetime')}
                        className="block w-full py-3 px-4 text-center font-semibold rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl btn-premium"
                      >
                        Accès à vie
                      </Link>
                    </div>
                  </div>
                  <div className="p-8">
                    <ul className="space-y-4">
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Lettres illimitées</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Tous les modèles premium</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Export tous formats</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Générateur IA avancé</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Assistance VIP</span>
                      </li>
                      <li className="flex items-start">
                        <FaCheck className="text-green-500 mt-1 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">Mises à jour à vie</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </LazySection>

        {/* CTA Section */}
        <LazySection animationType="fade">
          <section className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white py-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl float-animation"></div>
            
            <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Prêt à créer votre lettre de motivation parfaite ?
              </h2>
              <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                Rejoignez des milliers d'utilisateurs qui décrochent des entretiens grâce à leurs lettres de motivation professionnelles.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link 
                  to="/register" 
                  onClick={() => handleCTAClick('final-cta-register')}
                  className="inline-flex items-center justify-center 
                  px-8 py-4 rounded-xl bg-blue-700/50 text-blue-700 font-semibold 
                  text-lg transition-all duration-300 hover:bg-blue-800/50 hover:shadow-xl hover:scale-105 group btn-premium"
                >
                  Commencer gratuitement
                  <FaAngleRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/dashboard/templates" 
                  onClick={() => handleCTAClick('final-cta-templates')}
                  className="inline-flex items-center justify-center px-8 py-4 rounded-xl bg-blue-700/50 text-white border border-blue-400/50 font-semibold text-lg transition-all duration-300 hover:bg-blue-600/50 backdrop-blur-sm"
                >
                  Voir les modèles
                </Link>
              </div>
            </div>
          </section>
        </LazySection>
      </div>
    </>
  );
};

export default HomePage;