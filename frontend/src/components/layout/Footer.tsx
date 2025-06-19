import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaLinkedin, FaEnvelope, FaMapMarkerAlt, FaPhone } from 'react-icons/fa';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-gray-300">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Company Info */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold text-white mb-6">CoverLetter Pro</h3>
            <p className="text-base mb-6 text-gray-400">
              Créez des lettres de motivation professionnelles qui vous démarquent et vous aident à décrocher l'emploi de vos rêves.
            </p>
            <div className="flex space-x-5">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-all duration-300">
                <FaFacebook size={22} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-all duration-300">
                <FaTwitter size={22} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-all duration-300">
                <FaInstagram size={22} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-all duration-300">
                <FaLinkedin size={22} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6">Liens rapides</h3>
            <ul className="space-y-4">
              <li>
                <a href="#features" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Comment ça marche
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Tarifs
                </a>
              </li>
              <li>
                <a href="#faq" className="text-gray-400 hover:text-primary transition-all duration-300">
                  FAQ
                </a>
              </li>
              <li>
                <Link to="/blog" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6">Ressources</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/templates" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Modèles de lettres
                </Link>
              </li>
              <li>
                <Link to="/guides" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Guides de rédaction
                </Link>
              </li>
              <li>
                <Link to="/examples" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Exemples par secteur
                </Link>
              </li>
              <li>
                <Link to="/tips" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Conseils d'expert
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold text-white mb-6">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-center">
                <FaMapMarkerAlt className="text-primary mr-3" />
                <span>10 Rue de Paris, 75001 Paris</span>
              </li>
              <li className="flex items-center">
                <FaPhone className="text-primary mr-3" />
                <span>+33 1 23 45 67 89</span>
              </li>
              <li className="flex items-center">
                <FaEnvelope className="text-primary mr-3" />
                <a href="mailto:contact@coverletterpro.com" className="text-gray-400 hover:text-primary transition-all duration-300">
                  contact@coverletterpro.com
                </a>
              </li>
              <li>
                <Link to="/contact" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Formulaire de contact
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-gray-400 hover:text-primary transition-all duration-300">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-gray-500 mb-4 sm:mb-0">
            &copy; {currentYear} CoverLetter Pro. Tous droits réservés.
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link to="/terms" className="text-gray-500 hover:text-primary transition-all duration-300">
              Conditions d'utilisation
            </Link>
            <Link to="/privacy" className="text-gray-500 hover:text-primary transition-all duration-300">
              Politique de confidentialité
            </Link>
            <Link to="/cookies" className="text-gray-500 hover:text-primary transition-all duration-300">
              Gestion des cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
