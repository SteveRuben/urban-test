import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { useAuthStore } from '../../store';

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    console.log("État d'authentification dans Navbar:", isAuthenticated);
    console.log("Utilisateur dans Navbar:", user);
  }, [isAuthenticated, user]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white sticky top-0 z-50 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-900">CoverLetter Pro</span>
            </Link>
          </div>
          
          {/* Menu principal pour desktop - conditionnel basé sur la page */}
          {location.pathname === '/' && (
            <div className="hidden md:flex md:items-center md:space-x-8">
              <a
                href="#features"
                className={`font-medium text-gray-700 hover:text-primary px-3 py-2 transition-all duration-300 ${
                  location.hash === '#features' ? 'text-primary' : ''
                }`}
              >
                Fonctionnalités
              </a>
              <a
                href="#how-it-works"
                className={`font-medium text-gray-700 hover:text-primary px-3 py-2 transition-all duration-300 ${
                  location.hash === '#how-it-works' ? 'text-primary' : ''
                }`}
              >
                Comment ça marche
              </a>
              <a
                href="#pricing"
                className={`font-medium text-gray-700 hover:text-primary px-3 py-2 transition-all duration-300 ${
                  location.hash === '#pricing' ? 'text-primary' : ''
                }`}
              >
                Tarifs
              </a>
              <a
                href="#faq"
                className={`font-medium text-gray-700 hover:text-primary px-3 py-2 transition-all duration-300 ${
                  location.hash === '#faq' ? 'text-primary' : ''
                }`}
              >
                FAQ
              </a>
            </div>
          )}
          
          {/* Boutons de connexion/inscription pour desktop */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-full text-white bg-primary hover:bg-primaryDark transition-all duration-300 shadow-md hover:shadow-lg"
              >
                Mon compte {user?.displayName ? `(${user.displayName})` : ''}
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="font-medium text-gray-700 hover:text-primary px-3 py-2 transition-all duration-300"
                >
                  Se connecter
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium rounded-full text-white bg-primary hover:bg-primaryDark transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </div>
          
          {/* Bouton hamburger pour mobile */}
          <div className="flex items-center md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-primary hover:bg-gray-100 focus:outline-none"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">{isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
              {isMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Menu mobile */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'}`}>
        {location.pathname === '/' && (
          <div className="pt-2 pb-3 space-y-1 px-4">
            <a
              href="#features"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-all duration-300"
              onClick={toggleMenu}
            >
              Fonctionnalités
            </a>
            <a
              href="#how-it-works"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-all duration-300"
              onClick={toggleMenu}
            >
              Comment ça marche
            </a>
            <a
              href="#pricing"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-all duration-300"
              onClick={toggleMenu}
            >
              Tarifs
            </a>
            <a
              href="#faq"
              className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-all duration-300"
              onClick={toggleMenu}
            >
              FAQ
            </a>
          </div>
        )}
        
        <div className="pt-4 pb-3 border-t border-gray-200 px-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="block w-full text-center px-6 py-3 mx-auto text-base font-medium text-white bg-primary hover:bg-primaryDark rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
              onClick={toggleMenu}
            >
              Mon compte {user?.displayName ? `(${user.displayName})` : ''}
            </Link>
          ) : (
            <div className="flex flex-col space-y-3">
              <Link
                to="/login"
                className="block w-full text-center px-6 py-3 text-base font-medium text-primary hover:bg-gray-50 border-2 border-primary rounded-full transition-all duration-300"
                onClick={toggleMenu}
              >
                Se connecter
              </Link>
              <Link
                to="/register"
                className="block w-full text-center px-6 py-3 text-base font-medium text-white bg-primary hover:bg-primaryDark rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
                onClick={toggleMenu}
              >
                S'inscrire
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
