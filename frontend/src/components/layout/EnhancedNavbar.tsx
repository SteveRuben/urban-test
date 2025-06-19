// src/components/layout/EnhancedNavbar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaBars, 
  FaTimes, 
  FaChevronDown, 
  FaFileAlt, 
  FaCrown, 
  FaUser,
  FaSignOutAlt,
  FaCog,
  FaQuestionCircle,
  FaRocket,
  FaLightbulb,
  FaLayerGroup
} from 'react-icons/fa';
import { useAuthStore } from '../../store/auth.store';
import { useSubscriptionStore } from '../../store/subscription.store';

const EnhancedNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { subscription } = useSubscriptionStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Détecter le scroll pour effet de navbar flottante
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Fermer le dropdown au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  // Menu items pour utilisateurs non connectés
  const publicMenuItems = [
    {
      label: 'Fonctionnalités',
      href: '#features',
      submenu: [
        {
          icon: <FaRocket className="text-blue-500" />,
          title: 'Génération IA',
          description: 'Créez des lettres en 30 secondes',
          href: '#ai-generation'
        },
        {
          icon: <FaLayerGroup className="text-purple-500" />,
          title: 'Templates Premium',
          description: 'Modèles professionnels',
          href: '#templates'
        },
        {
          icon: <FaFileAlt className="text-green-500" />,
          title: 'Export Multi-format',
          description: 'PDF, Word, et plus',
          href: '#export'
        }
      ]
    },
    {
      label: 'Tarifs',
      href: '#pricing'
    },
    {
      label: 'Support',
      href: '#support',
      submenu: [
        {
          icon: <FaQuestionCircle className="text-blue-500" />,
          title: 'Centre d\'aide',
          description: 'FAQ et guides',
          href: '/help'
        },
        {
          icon: <FaLightbulb className="text-yellow-500" />,
          title: 'Conseils & Astuces',
          description: 'Optimisez vos lettres',
          href: '/tips'
        }
      ]
    }
  ];

  const getPlanBadge = () => {
    if (!subscription) return null;
    
    const planColors = {
      basic: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
      premium: 'bg-yellow-100 text-yellow-700'
    };
    
    return (
      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
        planColors[subscription.planId as keyof typeof planColors] || 'bg-gray-100 text-gray-700'
      }`}>
        {subscription.planId === 'premium' && <FaCrown className="inline mr-1" />}
        {subscription.planId.charAt(0).toUpperCase() + subscription.planId.slice(1)}
      </span>
    );
  };

  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${isScrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50' 
        : 'bg-white/90 backdrop-blur-sm'
      }
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="flex items-center space-x-3 group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl transition-shadow">
                  ML
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs font-bold text-black">AI</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MotivationLetter
                </span>
                <span className="text-lg font-semibold text-gray-800">.ai</span>
              </div>
            </Link>
          </div>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            {!isAuthenticated ? (
              // Menu public
              <>
                {publicMenuItems.map((item, index) => (
                  <div key={index} className="relative" ref={dropdownRef}>
                    {item.submenu ? (
                      <button
                        onClick={() => toggleDropdown(item.label)}
                        className="flex items-center space-x-1 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                      >
                        <span>{item.label}</span>
                        <FaChevronDown className={`text-xs transition-transform ${
                          activeDropdown === item.label ? 'rotate-180' : ''
                        }`} />
                      </button>
                    ) : (
                      <a
                        href={item.href}
                        className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
                      >
                        {item.label}
                      </a>
                    )}
                    
                    {/* Mega Menu */}
                    {item.submenu && activeDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-6 z-50">
                        <div className="space-y-4">
                          {item.submenu.map((subItem, subIndex) => (
                            <a
                              key={subIndex}
                              href={subItem.href}
                              className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-white group-hover:shadow-md transition-all">
                                {subItem.icon}
                              </div>
                              <div className="ml-3">
                                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {subItem.title}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {subItem.description}
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : (
              // Menu utilisateur connecté
              <>
                <Link
                  to="/dashboard"
                  className={`flex items-center space-x-1 font-medium transition-colors ${
                    location.pathname.startsWith('/dashboard') 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  <FaFileAlt />
                  <span>Dashboard</span>
                </Link>
                
                <Link
                  to="/dashboard/templates"
                  className={`flex items-center space-x-1 font-medium transition-colors ${
                    location.pathname === '/dashboard/templates' 
                      ? 'text-blue-600' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  <FaLayerGroup />
                  <span>Templates</span>
                </Link>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {!isAuthenticated ? (
              // Boutons pour utilisateurs non connectés
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-flex items-center px-4 py-2 text-gray-700 hover:text-blue-600 font-medium transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <FaRocket className="mr-2" />
                  <span className="hidden sm:inline">Commencer</span>
                  <span className="sm:hidden">Essai</span>
                </Link>
              </>
            ) : (
              // Menu utilisateur connecté
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => toggleDropdown('user')}
                  className="flex items-center space-x-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <img
                      src={user?.photoURL || 'https://via.placeholder.com/32'}
                      alt="Profile"
                      className="w-8 h-8 rounded-full border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
                    />
                    <div className="hidden sm:block text-left">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {user?.displayName || 'Utilisateur'}
                        </span>
                        {getPlanBadge()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  <FaChevronDown className={`text-gray-400 text-xs transition-transform ${
                    activeDropdown === 'user' ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* Dropdown utilisateur */}
                {activeDropdown === 'user' && (
                  <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="font-medium text-gray-900">
                        {user?.displayName || 'Utilisateur'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user?.email}
                      </div>
                      {subscription && (
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            subscription.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {subscription.status === 'active' ? '✓ Actif' : 'Inactif'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <FaUser className="mr-3 text-gray-400" />
                        Mon profil
                      </Link>
                      
                      <Link
                        to="/dashboard/subscription"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <FaCrown className="mr-3 text-gray-400" />
                        Abonnement
                      </Link>
                      
                      <Link
                        to="/dashboard/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setActiveDropdown(null)}
                      >
                        <FaCog className="mr-3 text-gray-400" />
                        Paramètres
                      </Link>
                    </div>
                    
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FaSignOutAlt className="mr-3" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Menu Mobile Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 bg-white/95 backdrop-blur-md">
            <div className="space-y-4">
              {!isAuthenticated ? (
                <>
                  {publicMenuItems.map((item, index) => (
                    <div key={index}>
                      <a
                        href={item.href}
                        className="block px-4 py-2 text-gray-700 hover:text-blue-600 font-medium"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {item.label}
                      </a>
                      {item.submenu && (
                        <div className="ml-4 mt-2 space-y-2">
                          {item.submenu.map((subItem, subIndex) => (
                            <a
                              key={subIndex}
                              href={subItem.href}
                              className="block px-4 py-2 text-sm text-gray-600 hover:text-blue-600"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {subItem.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-4">
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-gray-700 hover:text-blue-600 font-medium"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/register"
                      className="block px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl mt-2 text-center"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Commencer gratuitement
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-4 py-2 text-gray-700 hover:text-blue-600 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/dashboard/templates"
                    className="block px-4 py-2 text-gray-700 hover:text-blue-600 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Templates
                  </Link>
                  <Link
                    to="/dashboard/profile"
                    className="block px-4 py-2 text-gray-700 hover:text-blue-600 font-medium"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-red-600 hover:text-red-700 font-medium"
                  >
                    Déconnexion
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default EnhancedNavbar;