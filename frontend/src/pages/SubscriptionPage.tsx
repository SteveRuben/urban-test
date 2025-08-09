import React, { useEffect, useState } from 'react';
import {  useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import Button from '../components/common/Button';
import { useSubscriptionStore } from '../store/subscription.store';
import paymentService from '../services/payment.service';
import {
  FaCheck,
  FaExclamationTriangle,
  FaPaypal,
  FaDownload,
  FaCrown,
  FaSpinner,
  FaStar,
  FaRocket,
  FaInfinity,
  FaTimes,
  FaCalendarAlt,
  FaChartLine,
  FaShieldAlt,
  FaGift,
  FaArrowRight,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from 'react-icons/fa';


interface Plan {
  id: string;
  name: string;
  price?: number;
  features?: string[];
  interval?: string;
}

// Types et interfaces
interface PayPalModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan;
  onConfirm: (planId: string, interval: string) => void;
  isLoading: boolean;
}
// SubscriptionPage.tsx - Partie 2/4 : Composant PayPalModal
const PayPalModal: React.FC<PayPalModalProps> = ({
  isOpen,
  onClose,
  plan,
  onConfirm,
  isLoading
}) => {
  const [selectedInterval, setSelectedInterval] = useState('monthly');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(plan.id, selectedInterval);
  };

  const getPrice = (interval: string) => {
    const prices = {
      basic: { monthly: 9.99, yearly: 99.99, lifetime: 199.99 },
      pro: { monthly: 19.99, yearly: 199.99, lifetime: 399.99 },
      premium: { monthly: 39.99, yearly: 399.99, lifetime: 799.99 }
    };
    return prices[plan.id as keyof typeof prices]?.[interval as keyof typeof prices.basic] || 0;
  };

  const getDiscount = (interval: string) => {
    if (interval === 'yearly') return 17; // 17% de réduction annuelle
    if (interval === 'lifetime') return 30; // 30% de réduction lifetime
    return 0;
  };

  const getSavings = (interval: string) => {
    const monthlyPrice = getPrice('monthly');
    const yearlyPrice = getPrice('yearly');
    const lifetimePrice = getPrice('lifetime');

    if (interval === 'yearly') {
      return (monthlyPrice * 12) - yearlyPrice;
    }
    if (interval === 'lifetime') {
      return (yearlyPrice * 10) - lifetimePrice;
    }
    return 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-gray-200 p-6">
          <div className="flex items-center">
            <FaPaypal className="text-blue-600 mr-3" size={24} />
            <h3 className="text-xl font-bold text-gray-800">
              Finaliser votre abonnement
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
            disabled={isLoading}
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-3">
              {plan.id === 'basic' && <FaRocket className="text-blue-500" size={40} />}
              {plan.id === 'pro' && <FaCrown className="text-yellow-500" size={40} />}
              {plan.id === 'premium' && <FaInfinity className="text-purple-500" size={40} />}
            </div>
            <h4 className="text-xl font-semibold text-gray-800 mb-2">
              Plan {plan.name}
            </h4>
            <p className="text-gray-600 text-sm">
              Choisissez votre période de facturation pour économiser
            </p>
          </div>

          {/* Sélection de l'intervalle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              Période de facturation :
            </label>
            <div className="space-y-3">
              {[
                { key: 'monthly', label: 'Mensuel', period: '/mois' },
                { key: 'yearly', label: 'Annuel', period: '/an', popular: true },
                { key: 'lifetime', label: 'À vie', period: '', badge: 'Meilleure valeur' }
              ].map((option) => {
                const price = getPrice(option.key);
                const discount = getDiscount(option.key);
                const savings = getSavings(option.key);

                return (
                  <label
                    key={option.key}
                    className={`relative flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedInterval === option.key
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.popular && (
                      <div className="absolute -top-2 left-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        Le plus populaire
                      </div>
                    )}

                    {option.badge && (
                      <div className="absolute -top-2 left-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                        {option.badge}
                      </div>
                    )}

                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="interval"
                        value={option.key}
                        checked={selectedInterval === option.key}
                        onChange={(e) => setSelectedInterval(e.target.value)}
                        className="mr-4 w-4 h-4 text-blue-600"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">
                          {option.label}
                        </div>
                        {discount > 0 && (
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                              -{discount}% de réduction
                            </span>
                            {savings > 0 && (
                              <span className="text-green-600 text-xs font-medium">
                                Économisez {savings.toFixed(2)}€
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xl text-gray-900">
                        {price.toFixed(2)}€
                      </div>
                      <div className="text-sm text-gray-500">
                        {option.period}
                      </div>
                      {option.key === 'yearly' && (
                        <div className="text-xs text-gray-400 mt-1">
                          ~{(price/12).toFixed(2)}€/mois
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Récapitulatif des fonctionnalités */}
          <div className="mb-6">
            <h5 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FaCheckCircle className="text-green-500 mr-2" />
              Ce qui est inclus :
            </h5>
            <ul className="space-y-3">
              {plan.features?.slice(0, 5).map((feature: string, index: number) => (
                <li key={index} className="flex items-start text-sm text-gray-700">
                  <FaCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Garantie et sécurité */}
          <div className="mb-6 space-y-3">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
              <FaShieldAlt className="text-blue-600 mr-3" />
              <div>
                <div className="text-blue-800 text-sm font-medium">
                  Paiement 100% sécurisé
                </div>
                <div className="text-blue-600 text-xs">
                  Chiffrement SSL et protection PayPal
                </div>
              </div>
            </div>

            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
              <FaGift className="text-green-600 mr-3" />
              <div>
                <div className="text-green-800 text-sm font-medium">
                  Garantie satisfait ou remboursé 30 jours
                </div>
                <div className="text-green-600 text-xs">
                  Annulation facile à tout moment
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="space-y-3">
            <Button
              variant="primary"
              size="lg"
              onClick={handleConfirm}
              loading={isLoading}
              leftIcon={!isLoading ? <FaPaypal /> : undefined}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-lg font-semibold py-4"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <FaSpinner className="animate-spin mr-2" />
                  Redirection vers PayPal...
                </span>
              ) : (
                <span className="flex items-center">
                  <span>Continuer avec PayPal</span>
                  <FaArrowRight className="ml-2" />
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isLoading}
              className="w-full"
            >
              Retour aux plans
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </p>
        </div>
      </div>
    </div>
  );
};
// SubscriptionPage.tsx - Partie 3/4 : Composant Principal et State
const SubscriptionPage: React.FC = () => {

  // const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPayPalModal, setShowPayPalModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [cancelMessage, setCancelMessage] = useState('');

  const {
    subscription,
    plans,
    payments,
    isLoading,
    error,
    fetchSubscription,
    fetchPlans,
    fetchPaymentHistory,
    createPayPalSession,
    cancelSubscription,
    clearError
  } = useSubscriptionStore();

  useEffect(() => {
    const initializeData = async () => {
      await fetchPlans();
      await fetchSubscription();
      await fetchPaymentHistory();
    };

    initializeData();
  }, [fetchPlans, fetchSubscription, fetchPaymentHistory]);

  // Gérer les retours PayPal
  useEffect(() => {
    const handlePayPalReturn = async () => {
      const success = searchParams.get('success');
      const canceled = searchParams.get('canceled');
      const paymentId = searchParams.get('paymentId');
      const token = searchParams.get('token');
      const payerID = searchParams.get('PayerID');

      if (success === 'true' && paymentId && token && payerID) {
        try {
          // Confirmer le paiement PayPal
          await paymentService.confirmPayPalPayment(paymentId, {
            token,
            payerID
          });

          setSuccessMessage('Paiement réussi ! Votre abonnement a été activé.');

          // Rafraîchir les données
          await fetchSubscription();
          await fetchPaymentHistory();

        } catch (error: unknown) {
          console.error('Erreur confirmation PayPal:', error);
          setSuccessMessage('');
        }
      } else if (canceled === 'true') {
        setCancelMessage('Paiement annulé. Vous pouvez réessayer à tout moment.');
      }

      // Nettoyer l'URL
      if (success || canceled) {
        window.history.replaceState({}, document.title, window.location.pathname);

        // Effacer les messages après quelques secondes
        setTimeout(() => {
          setSuccessMessage('');
          setCancelMessage('');
        }, 5000);
      }
    };

    handlePayPalReturn();
  }, [searchParams, fetchSubscription, fetchPaymentHistory]);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPayPalModal(true);
  };

  const handleConfirmPayment = async (planId: string, interval: string) => {
    setProcessingPayment(true);

    try {
      // @ts-expect-error because we have mini-incompatibility 
      const session = await createPayPalSession(planId, interval);
      console.log('Session PayPal créée:', session);
      if (session.approvalUrl) {
        // Rediriger vers PayPal
        window.location.href = session.approvalUrl;
      } else {
        throw new Error('URL d\'approbation PayPal non reçue');
      }
    } catch (err: unknown) {
      console.error('Erreur création session PayPal:', err);
      // L'erreur est déjà gérée par le store
    } finally {
      setProcessingPayment(false);
      setShowPayPalModal(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir annuler votre abonnement ? ' +
      'Vous conserverez l\'accès aux fonctionnalités premium jusqu\'à la fin de votre période de facturation.'
    );

    if (confirmed) {
      try {
        await cancelSubscription('Annulé par l\'utilisateur');
        setSuccessMessage('Abonnement annulé. Vous conservez l\'accès jusqu\'à la fin de la période.');
      } catch (err) {
        console.error('Erreur annulation:', err);
      }
    }
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate: Date | string | null) => {
    console.log("date end:"+endDate);
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (isLoading && !subscription && !plans.length) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-20">
          <div className="text-center">
            <FaSpinner className="animate-spin text-blue-600 mx-auto mb-4" size={48} />
            <p className="text-gray-600 text-lg">Chargement de vos informations d'abonnement...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Plans par défaut si pas encore chargés
  const defaultPlans: never[] = []; // Tableau vide

  const displayPlans = plans.length > 0 ? plans : defaultPlans;
  // SubscriptionPage.tsx - Partie 4/4 : Render et JSX
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Gestion de l'abonnement
            </h1>
            <p className="text-gray-600">
              Choisissez le plan qui correspond à vos besoins et gérez votre abonnement
            </p>
          </div>
          <div className="flex items-center text-blue-600 bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
            <FaPaypal className="mr-2" size={20} />
            <div className="text-sm">
              <div className="font-medium">Paiements sécurisés</div>
              <div className="text-blue-500">par PayPal</div>
            </div>
          </div>
        </div>

        {/* Messages d'état */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-6 flex items-center">
            <FaCheckCircle className="mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">Succès !</p>
              <p className="text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {cancelMessage && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-lg mb-6 flex items-center">
            <FaClock className="mr-3 flex-shrink-0" />
            <div>
              <p className="font-medium">Paiement annulé</p>
              <p className="text-sm">{cancelMessage}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg mb-6 flex items-center">
            <FaExclamationTriangle className="mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Une erreur est survenue</p>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-sm underline hover:no-underline ml-4"
            >
              Masquer
            </button>
          </div>
        )}

        {/* Abonnement actuel */}
        {subscription && subscription.status === 'active' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Votre abonnement actuel
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="bg-blue-100 p-3 rounded-full mr-4">
                    <FaPaypal className="text-blue-600" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-gray-800">
                      Plan {displayPlans.find(p => p.id === subscription.planId)?.name || subscription.planId}
                    </h3>
                    <p className="text-gray-600">
                      Facturé via PayPal • Actif depuis le {formatDate(subscription.currentPeriodStart)}
                    </p>
                  </div>
                </div>
                <span className="px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  ✓ Actif
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center mb-2">
                    <FaCalendarAlt className="text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Période actuelle</span>
                  </div>
                  <p className="font-semibold text-gray-800">
                    {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                  </p>
                  {getDaysRemaining(subscription.currentPeriodEnd) !== null && (
                    <p className="text-sm text-gray-500 mt-1">
                      {getDaysRemaining(subscription.currentPeriodEnd)} jours restants
                    </p>
                  )}
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center mb-2">
                    <FaChartLine className="text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Renouvellement</span>
                  </div>
                  <p className="font-semibold text-gray-800">
                    {subscription.cancelAtPeriodEnd ? 'Annulé en fin de période' : 'Automatique'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {subscription.cancelAtPeriodEnd
                      ? 'Se termine le ' + formatDate(subscription.currentPeriodEnd)
                      : 'Prochain paiement le ' + formatDate(subscription.currentPeriodEnd)
                    }
                  </p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-sm">
                  <div className="flex items-center mb-2">
                    <FaShieldAlt className="text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Statut PayPal</span>
                  </div>
                  <p className="font-semibold text-gray-800">Connecté</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Géré via votre compte PayPal
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<FaCrown />}
                  onClick={() => window.open('https://www.paypal.com/myaccount/autopay/', '_blank')}
                >
                  Gérer sur PayPal
                </Button>

                {!subscription.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleCancelSubscription}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Annuler l'abonnement
                  </Button>
                )}

                {subscription.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => {/* Réactiver l'abonnement */}}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                  >
                    Réactiver l'abonnement
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Plans disponibles */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {subscription ? 'Changer de plan' : 'Choisissez votre plan'}
            </h2>
            <div className="flex items-center text-sm text-gray-600">
              <FaGift className="mr-2" />
              <span>Garantie satisfait ou remboursé 30 jours</span>
            </div>
          </div>

          {/* Adjusted grid classes for responsiveness */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayPlans.map((plan) => {
              const isCurrentPlan = subscription?.planId === plan.id;
              const isPopular = plan.id === 'pro';
              const isBestValue = plan.id === 'premium';

              return (
                <div
                  key={plan.id}
                  // Added min-h-[600px] for consistent card height
                  className={`relative rounded-xl shadow-lg p-6 border-2 transition-all duration-300 hover:shadow-xl flex flex-col min-h-[600px] ${
                      isCurrentPlan
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 transform lg:scale-105' // Apply scale on large screens
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    } ${isPopular ? 'lg:scale-105' : ''} ${isBestValue ? 'lg:scale-110' : ''}`} // Apply scale on large screens
                >
                  {isPopular && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10"> {/* Centered on top */}
                      <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg whitespace-nowrap">
                        ⭐ Le plus populaire
                      </span>
                    </div>
                  )}

                  {isBestValue && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10"> {/* Centered on top */}
                      <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg whitespace-nowrap">
                        👑 Meilleure valeur
                      </span>
                    </div>
                  )}

                  {isCurrentPlan && (
                    <div className="absolute top-4 right-4 z-20">
                      <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
                        Plan actuel
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6 mt-8"> {/* Added mt-8 to compensate for badge height */}
                    <div className="flex justify-center mb-4">
                      {plan.id === 'free' && ( // Icon for Free plan
                        <div className="bg-gray-100 p-4 rounded-full">
                          <FaCheck className="text-gray-500" size={36} />
                        </div>
                      )}
                      {plan.id === 'basic' && (
                        <div className="bg-blue-100 p-4 rounded-full">
                          <FaRocket className="text-blue-500" size={36} />
                        </div>
                      )}
                      {plan.id === 'pro' && (
                        <div className="bg-yellow-100 p-4 rounded-full">
                          <FaCrown className="text-yellow-500" size={36} />
                        </div>
                      )}
                      {plan.id === 'premium' && (
                        <div className="bg-purple-100 p-4 rounded-full">
                          <FaInfinity className="text-purple-500" size={36} />
                        </div>
                      )}
                    </div>

                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      {plan.name}
                    </h3>

                    <div className="mb-4">
                      <div className="flex items-baseline justify-center">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.price?.toFixed(2) || '0.00'}€
                        </span>
                        <span className="text-gray-500 text-lg ml-1">/mois</span>
                      </div>
                      {plan.id !== 'free' && ( // Only show yearly price for paid plans
                        <div className="text-sm text-gray-600 mt-2">
                          À partir de{' '}
                          <span className="font-semibold text-green-600">
                            {((plan.price || 9.99) * 12 * 0.83).toFixed(2)}€/an
                          </span>{' '}
                          <span className="text-green-600 font-medium">(-17%)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* flex-grow to push button to the bottom */}
                  <ul className="space-y-4 mb-8 flex-grow">
                    {plan.features?.map((feature: string, featureIndex: number) => (
                      <li
                        key={featureIndex}
                        className="flex items-start text-sm text-gray-700"
                      >
                        <FaCheck className="text-green-500 mr-3 mt-1 flex-shrink-0" />
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3 mt-auto"> {/* mt-auto to push button to the bottom */}
                    <Button
                      variant={isCurrentPlan ? 'outline' : 'primary'}
                      size="lg"
                      className={`w-full ${
                        plan.id === 'pro'
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white'
                          : plan.id === 'premium'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                            : ''
                      } ${isCurrentPlan || (plan.id === 'free' && subscription) ? 'cursor-not-allowed opacity-60' : ''}`} // Disable if free and subscribed
                      disabled={isCurrentPlan || (plan.id === 'free' && !!subscription)} // Disable if free and subscribed  
                      onClick={() => handleSelectPlan(plan)}
                      leftIcon={isCurrentPlan ? <FaCheck /> : <FaPaypal />}
                    >
                      {isCurrentPlan
                        ? 'Plan actuel'
                        : plan.id === 'free'
                          ? 'Choisir ce plan'
                          : 'Choisir ce plan'}
                    </Button>

                    {plan.id !== 'free' && !isCurrentPlan && (
                      <p className="text-xs text-center text-gray-500">
                        Essai gratuit de {plan.id === 'basic' ? '30' : plan.id === 'pro' ? '14' : '30'} jours {/* Corrected trial days */}
                      </p>
                    )}
                     {plan.id === 'free' && (
                      <p className="text-xs text-center text-gray-500">
                        Accès illimité aux fonctionnalités de base
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Avantages PayPal */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 mb-8 border border-blue-200">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full mr-4">
              <FaPaypal className="text-blue-600" size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                Pourquoi choisir PayPal ?
              </h3>
              <p className="text-gray-600">
                La solution de paiement la plus sécurisée et la plus pratique
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start">
              <div className="bg-green-100 p-2 rounded-full mr-3 mt-1">
                <FaShieldAlt className="text-green-600" size={16} />
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Sécurité maximale</div>
                <div className="text-sm text-gray-600">Chiffrement SSL et protection des données</div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-blue-100 p-2 rounded-full mr-3 mt-1">
                <FaCheckCircle className="text-blue-600" size={16} />
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Simplicité</div>
                <div className="text-sm text-gray-600">Un clic pour payer, pas besoin de saisir vos coordonnées</div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-purple-100 p-2 rounded-full mr-3 mt-1">
                <FaGift className="text-purple-600" size={16} />
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Protection acheteur</div>
                <div className="text-sm text-gray-600">Garantie satisfait ou remboursé PayPal</div>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-yellow-100 p-2 rounded-full mr-3 mt-1">
                <FaTimesCircle className="text-yellow-600" size={16} />
              </div>
              <div>
                <div className="font-semibold text-gray-800 mb-1">Annulation facile</div>
                <div className="text-sm text-gray-600">Gérez vos abonnements directement depuis PayPal</div>
              </div>
            </div>
          </div>
        </div>

        {/* Historique des paiements */}
        {subscription && payments && payments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Historique des paiements
            </h2>

            <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Description
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Montant
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Méthode
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Statut
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map(payment => (
                      <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDate(payment.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              Abonnement {payment.planType || 'Plan'}
                            </div>
                            <div className="text-gray-500 text-xs">
                              {payment.interval === 'monthly' ? 'Mensuel' :
                               payment.interval === 'yearly' ? 'Annuel' : 'À vie'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {payment.amount.toFixed(2)}€
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <FaPaypal className="text-blue-600 mr-2" />
                            <span>PayPal</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'succeeded'
                                ? 'bg-green-100 text-green-700'
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {payment.status === 'succeeded'
                              ? '✓ Réussi'
                              : payment.status === 'pending'
                                ? '⏳ En attente'
                                : '✗ Échoué'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex space-x-2">
                            {payment.receiptUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<FaDownload />}
                                onClick={() => window.open(payment.receiptUrl, '_blank')}
                                className="text-xs"
                              >
                                Reçu
                              </Button>
                            )}
                            {payment.status === 'succeeded' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Voir détails */}}
                                className="text-xs"
                              >
                                Détails
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Message si pas d'abonnement */}
        {!subscription && (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-8 text-center border border-gray-200">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-100 p-4 rounded-full">
                <FaRocket className="text-blue-600" size={48} />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Commencez votre aventure dès aujourd'hui !
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Choisissez le plan qui vous convient et profitez de toutes nos fonctionnalités premium
              pour créer des lettres professionnelles avec l'aide de l'IA.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                const proElement = document.getElementById('pro-plan');
                proElement?.scrollIntoView({ behavior: 'smooth' });
              }}
              leftIcon={<FaStar />}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              Voir les plans
            </Button>
          </div>
        )}

        {/* Message si pas d'historique */}
        {(!payments || payments.length === 0) && subscription && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <FaPaypal className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Aucun historique de paiement
            </h3>
            <p className="text-gray-500">
              Vos futurs paiements apparaîtront ici avec tous les détails et reçus.
            </p>
          </div>
        )}
      </div>

      {/* Modal PayPal */}
      <PayPalModal
        isOpen={showPayPalModal}
        onClose={() => setShowPayPalModal(false)}
        plan={selectedPlan!}
        onConfirm={handleConfirmPayment}
        isLoading={processingPayment}
      />
    </DashboardLayout>
  );
};

export default SubscriptionPage;
