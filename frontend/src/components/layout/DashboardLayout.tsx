import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaHome, 
  FaFileAlt, 
  FaLayerGroup, 
  FaCreditCard, 
  FaUser, 
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaBell,
  FaSearch,
  FaCog,
  FaQuestionCircle,
  FaRocket,
  FaCrown,
  FaChevronDown,
  FaTrash,
  FaCheckDouble
} from 'react-icons/fa';
import { useAuthStore } from '../../store/auth.store';
import { useSubscriptionStore } from '../../store/subscription.store';
import { useToast } from '../../store/toast.store';
import { useNotifications } from '../../hooks/useNotifications';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, logout } = useAuthStore();
  const { subscription } = useSubscriptionStore();
  console.log('Subscription:', subscription);
  console.log('User:', user);
  // Utiliser le hook de notifications
  const {
    notifications,
   // unreadNotifications,
    unreadCount,
    isLoading: notificationsLoading,
  //  markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    handleRead,
    formatTime,
    getTypeIcon,
    getTypeColor,
    stats
  } = useNotifications();

  // Fermer les menus au clic extérieur
  useEffect(() => {
    const handleClickOutside = () => {
      setUserMenuOpen(false);
      setNotificationsOpen(false);
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const navigation = [
    { 
      name: 'Tableau de bord', 
      href: '/dashboard', 
      icon: FaHome,
      badge: null,
      description: 'Vue d\'ensemble de vos lettres'
    },
    { 
      name: 'Mes lettres', 
      href: '/dashboard/letters', 
      icon: FaFileAlt,
      badge: null,
      description: 'Gérer vos lettres de motivation'
    },
    { 
      name: 'Modèles', 
      href: '/dashboard/templates', 
      icon: FaLayerGroup,
      badge: 'Nouveau',
      description: 'Bibliothèque de modèles premium'
    },
    { 
      name: 'Abonnement', 
      href: '/dashboard/subscription', 
      icon: FaCreditCard,
      badge: subscription?.status !== 'active' ? 'Upgrade' : null,
      description: 'Gérer votre plan et facturation'
    },
    { 
      name: 'Profil', 
      href: '/dashboard/profile', 
      icon: FaUser,
      badge: null,
      description: 'Paramètres du compte'
    },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Déconnexion réussie', 'À bientôt !');
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      toast.error('Erreur de déconnexion', 'Veuillez réessayer');
    }
  };

  const currentPath = location.pathname;

  const getPlanInfo = () => {
    if (!subscription) return { name: 'Gratuit', color: 'gray', icon: null };
    
    const plans = {
      basic: { name: 'Basique', color: 'blue', icon: FaRocket },
      premium: { name: 'Premium', color: 'purple', icon: FaCrown },
      lifetime: { name: 'Lifetime', color: 'yellow', icon: FaCrown }
    };
    
    return plans[subscription.planId as keyof typeof plans] || plans.basic;
  };

  // Gérer le clic sur une notification
  const handleNotificationClick = async (notification: any) => {
    // Marquer comme lu
    await handleRead(notification.id);
    
    // Exécuter l'action si elle existe
    if (notification.action?.href) {
      navigate(notification.action.href);
      setNotificationsOpen(false);
    } else if (notification.action?.onClick) {
      notification.action.onClick();
      setNotificationsOpen(false);
    }
  };

  // Marquer toutes les notifications comme lues
  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      toast.success('Notifications marquées comme lues');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Supprimer toutes les notifications
  const handleClearAll = async () => {
    if (window.confirm('Supprimer toutes les notifications ?')) {
      try {
        await clearAll();
        toast.success('Notifications supprimées');
        setNotificationsOpen(false);
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={() => setSidebarOpen(false)} 
          />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static lg:inset-0 flex flex-col
        border-r border-gray-200
      `}>
        {/* Header de la sidebar */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center group">
            <div className="flex items-center">
              <div className="relative">
                <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                  <FaFileAlt className="h-5 w-5" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-white flex items-center justify-center">
                  <span className="text-xs font-bold text-black text-[8px]">AI</span>
                </div>
              </div>
              <div className="ml-3">
                <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MotivationLetter
                </span>
                <span className="text-sm font-semibold text-gray-800">.ai</span>
              </div>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Plan Badge */}
        {subscription && (
          <div className="px-4 py-3 border-b border-gray-100">
            <div className={`
              inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
              ${getPlanInfo().color === 'blue' ? 'bg-blue-100 text-blue-700' :
                getPlanInfo().color === 'purple' ? 'bg-purple-100 text-purple-700' :
                getPlanInfo().color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }
            `}>
              {getPlanInfo().icon && <i className="w-3 h-3 mr-1" />}
              Plan {getPlanInfo().name}
            </div>
          </div>
        )}

        {/* Navigation principale */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {navigation.map((item) => {
              const isActive = currentPath === item.href || 
                              (item.href !== '/dashboard' && currentPath.startsWith(item.href));
              return (
                <div key={item.name} className="group">
                  <Link
                    to={item.href}
                    className={`
                      relative flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200
                      ${isActive
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 shadow-sm border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className={`
                      mr-3 h-5 w-5 flex-shrink-0 transition-colors
                      ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
                    `} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{item.name}</span>
                        {item.badge && (
                          <span className={`
                            ml-2 px-2 py-0.5 text-xs font-medium rounded-full
                            ${item.badge === 'Upgrade' 
                              ? 'bg-orange-100 text-orange-700' 
                              : 'bg-green-100 text-green-700'
                            }
                          `}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 group-hover:text-gray-600">
                        {item.description}
                      </p>
                    </div>
                    
                    {isActive && (
                      <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l-full"></div>
                    )}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Actions rapides
            </h3>
            <div className="space-y-2">
              <Link
                to="/dashboard/letters/new"
                className="flex items-center px-3 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
                onClick={() => setSidebarOpen(false)}
              >
                <FaRocket className="mr-2 h-4 w-4" />
                Nouvelle lettre
              </Link>
              <Link
                to="/dashboard/subscription"
                className="flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <FaCrown className="mr-2 h-4 w-4 text-yellow-500" />
                Passer au Premium
              </Link>
            </div>
          </div>
        </nav>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top navbar */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Left side - Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-gray-600 p-2 -ml-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <FaBars className="h-5 w-5" />
            </button>

            {/* Center - Search bar */}
            <div className="hidden sm:flex flex-1 justify-center px-6 max-w-2xl">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher dans vos lettres..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                />
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center space-x-3">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotificationsOpen(!notificationsOpen);
                    setUserMenuOpen(false);
                  }}
                  className="relative text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FaBell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center space-x-2">
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllRead}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
                              title="Marquer toutes comme lues"
                            >
                              <FaCheckDouble className="h-3 w-3 mr-1" />
                              Tout lire
                            </button>
                          )}
                          {notifications.length > 0 && (
                            <button
                              onClick={handleClearAll}
                              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center"
                              title="Supprimer toutes"
                            >
                              <FaTrash className="h-3 w-3 mr-1" />
                              Effacer
                            </button>
                          )}
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <p className="text-xs text-blue-600 font-medium">
                          {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    {/* Liste des notifications */}
                    <div className="flex-1 overflow-y-auto">
                      {notificationsLoading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Chargement...</p>
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <FaBell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-sm text-gray-500">Aucune notification</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Vous serez notifié ici des nouvelles activités
                          </p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div 
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`
                              p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer relative
                              ${!notification.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''}
                            `}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start flex-1 min-w-0">
                                <div className={`
                                  w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0
                                  ${getTypeColor(notification.type) === 'green' ? 'bg-green-500' :
                                    getTypeColor(notification.type) === 'yellow' ? 'bg-yellow-500' :
                                    getTypeColor(notification.type) === 'red' ? 'bg-red-500' :
                                    'bg-blue-500'
                                  }
                                  ${!notification.read ? 'animate-pulse' : 'opacity-50'}
                                `} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <p className="text-sm font-medium text-gray-900 mb-1 pr-2">
                                      {getTypeIcon(notification.type)} {notification.title}
                                    </p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteNotification(notification.id);
                                      }}
                                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                      title="Supprimer"
                                    >
                                      <FaTrash className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500">
                                      {formatTime(notification.createdAt)}
                                    </p>
                                    {notification.action && (
                                      <span className="text-xs text-blue-600 font-medium">
                                        {notification.action.label} →
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                        <div className="text-center">
                          <p className="text-xs text-gray-600">
                            {stats.total} notification{stats.total > 1 ? 's' : ''} au total
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* User menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                    setNotificationsOpen(false);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-2">
                    <FaUser className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.displayName || 'Utilisateur'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {subscription ? getPlanInfo().name : 'Gratuit'}
                    </p>
                  </div>
                  <FaChevronDown className={`
                    h-3 w-3 text-gray-400 transition-transform
                    ${userMenuOpen ? 'rotate-180' : ''}
                  `} />
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100">
                      <p className="font-medium text-gray-900">
                        {user?.displayName || 'Utilisateur'}
                      </p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                      {subscription && (
                        <div className="mt-2">
                          <span className={`
                            inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            ${subscription.status === 'active' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                            }
                          `}>
                            {subscription.status === 'active' ? '✓ Actif' : 'Inactif'}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="py-2">
                      <Link
                        to="/dashboard/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FaUser className="mr-3 text-gray-400" />
                        Mon profil
                      </Link>
                      
                      <Link
                        to="/dashboard/subscription"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FaCrown className="mr-3 text-gray-400" />
                        Abonnement
                      </Link>
                      
                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FaCog className="mr-3 text-gray-400" />
                        Paramètres
                      </button>

                      <button
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <FaQuestionCircle className="mr-3 text-gray-400" />
                        Aide & Support
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-100 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FaSignOutAlt className="mr-3" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;