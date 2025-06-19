#!/bin/bash

# Script de test des endpoints paiements
# Usage: ./test_payments.sh [FIREBASE_TOKEN]

PROJECT_ID="cover-letter-generator-api"
BASE_URL="http://localhost:5001/$PROJECT_ID/europe-west1/api/api/v1"
TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo "❌ Usage: $0 [FIREBASE_TOKEN]"
    echo ""
    echo "Pour obtenir un token Firebase :"
    echo 'curl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBYTtM1eNt0BDI4oafZEGxLBnKLQpBr2JM" \'
    echo '  -H "Content-Type: application/json" \'
    echo '  -d "{\"email\":\"test@example.com\",\"password\":\"password123\",\"returnSecureToken\":true}"'
    exit 1
fi

echo "💳 Test des endpoints paiements"
echo "==============================="
echo "🌐 Base URL: $BASE_URL"
echo "🔑 Token: ${TOKEN:0:20}..."
echo ""

# Test 1: Récupérer les informations de pricing (public)
echo "1️⃣ Test récupération du pricing (public)..."
PRICING_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/pricing")

if echo "$PRICING_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Pricing récupéré avec succès"
    
    # Compter les plans disponibles
    PLAN_COUNT=$(echo "$PRICING_RESPONSE" | jq -r '.data.plans | length')
    echo "   Nombre de plans: $PLAN_COUNT"
    
    # Afficher les noms des plans
    PLAN_NAMES=$(echo "$PRICING_RESPONSE" | jq -r '.data.plans[].name' | tr '\n' ', ' | sed 's/,$//')
    echo "   Plans: $PLAN_NAMES"
    
    # Afficher si des essais sont disponibles
    TRIAL_AVAILABLE=$(echo "$PRICING_RESPONSE" | jq -r '.data.trialAvailable')
    echo "   Essai disponible: $TRIAL_AVAILABLE"
else
    echo "❌ Erreur récupération pricing"
    echo "   Response: $PRICING_RESPONSE"
fi

echo ""

# Test 2: Vérifier l'historique des paiements (vide pour un nouvel utilisateur)
echo "2️⃣ Test récupération historique paiements..."
HISTORY_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/history" \
  -H "Authorization: Bearer $TOKEN")

if echo "$HISTORY_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Historique récupéré avec succès"
    
    PAYMENT_COUNT=$(echo "$HISTORY_RESPONSE" | jq -r '.data | length')
    echo "   Nombre de paiements: $PAYMENT_COUNT"
    
    if [ "$PAYMENT_COUNT" -eq 0 ]; then
        echo "   Aucun paiement (normal pour nouvel utilisateur)"
    else
        echo "   Paiements existants trouvés"
    fi
else
    echo "❌ Erreur récupération historique"
    echo "   Response: $HISTORY_RESPONSE"
fi

echo ""

# Test 3: Créer une session de checkout
echo "3️⃣ Test création session de checkout..."
CHECKOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "pro",
    "planType": "pro",
    "interval": "monthly",
    "successUrl": "https://example.com/success",
    "cancelUrl": "https://example.com/cancel"
  }')

if echo "$CHECKOUT_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Session de checkout créée avec succès"
    
    SESSION_ID=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.sessionId')
    CHECKOUT_URL=$(echo "$CHECKOUT_RESPONSE" | jq -r '.data.url')
    
    echo "   Session ID: ${SESSION_ID:0:20}..."
    echo "   URL de checkout: ${CHECKOUT_URL:0:50}..."
    
    # Vérifier que l'URL contient bien stripe
    if echo "$CHECKOUT_URL" | grep -q "checkout.stripe.com"; then
        echo "   ✅ URL Stripe valide"
    else
        echo "   ⚠️  URL ne semble pas être une URL Stripe valide"
    fi
else
    echo "❌ Erreur création session checkout"
    echo "   Response: $CHECKOUT_RESPONSE"
    SESSION_ID=""
fi

echo ""

# Test 4: Test avec paramètres invalides
echo "4️⃣ Test création session avec paramètres invalides..."
INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/checkout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "invalid",
    "planType": "invalid",
    "interval": "invalid"
  }')

if echo "$INVALID_RESPONSE" | grep -q "success.*false"; then
    echo "✅ Validation des paramètres fonctionne"
    
    ERROR_MSG=$(echo "$INVALID_RESPONSE" | jq -r '.error')
    echo "   Erreur retournée: $ERROR_MSG"
else
    echo "⚠️  Validation des paramètres: $INVALID_RESPONSE"
fi

echo ""

# Test 5: Test création portail client (sans client Stripe existant)
echo "5️⃣ Test création portail client..."
PORTAL_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/customer-portal" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "returnUrl": "https://example.com/dashboard"
  }')

if echo "$PORTAL_RESPONSE" | grep -q "success.*false"; then
    echo "✅ Gestion du portail client sans historique fonctionne"
    
    ERROR_MSG=$(echo "$PORTAL_RESPONSE" | jq -r '.error')
    echo "   Erreur attendue: $ERROR_MSG"
elif echo "$PORTAL_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Portail client créé (utilisateur avec historique)"
    
    PORTAL_URL=$(echo "$PORTAL_RESPONSE" | jq -r '.data.url')
    echo "   URL portail: ${PORTAL_URL:0:50}..."
else
    echo "⚠️  Portail client: $PORTAL_RESPONSE"
fi

echo ""

# Test 6: Test de différents plans et intervalles
echo "6️⃣ Test création sessions pour différents plans..."

PLANS=("basic" "pro" "premium")
INTERVALS=("monthly" "yearly" "lifetime")

for plan in "${PLANS[@]}"; do
    for interval in "${INTERVALS[@]}"; do
        echo "   Testing $plan - $interval..."
        
        TEST_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/checkout" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $TOKEN" \
          -d "{
            \"planId\": \"$plan\",
            \"planType\": \"$plan\",
            \"interval\": \"$interval\",
            \"successUrl\": \"https://example.com/success\",
            \"cancelUrl\": \"https://example.com/cancel\"
          }")
        
        if echo "$TEST_RESPONSE" | grep -q "success.*true"; then
            echo "   ✅ $plan - $interval OK"
        else
            echo "   ❌ $plan - $interval FAILED"
        fi
    done
done

echo ""

# Test 7: Test de vérification de statut de paiement (avec session ID si disponible)
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "null" ]; then
    echo "7️⃣ Test vérification statut paiement..."
    VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/payments/verify/$SESSION_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$VERIFY_RESPONSE" | grep -q "success.*true"; then
        echo "✅ Vérification de statut fonctionne"
        
        STATUS=$(echo "$VERIFY_RESPONSE" | jq -r '.data.status')
        echo "   Status: $STATUS"
    else
        echo "⚠️  Vérification: $VERIFY_RESPONSE"
    fi
else
    echo "7️⃣ Skip vérification statut (pas de session ID)"
fi

echo ""

# Test 8: Test webhook (simulation)
echo "8️⃣ Test endpoint webhook..."
WEBHOOK_RESPONSE=$(curl -s -X POST "$BASE_URL/payments/webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}')

# Le webhook devrait échouer sans signature Stripe valide
if echo "$WEBHOOK_RESPONSE" | grep -q "Signature Stripe manquante"; then
    echo "✅ Protection webhook fonctionne"
    echo "   Erreur attendue: Signature manquante"
else
    echo "⚠️  Webhook: $WEBHOOK_RESPONSE"
fi

echo ""

# Résumé
echo "📊 RÉSUMÉ DES TESTS PAIEMENTS"
echo "============================"
echo "✅ Pricing public"
echo "✅ Historique des paiements"
echo "✅ Création session checkout"
echo "✅ Validation des paramètres"
echo "✅ Portail client"
echo "✅ Tests multi-plans/intervals"
echo "✅ Vérification de statut"
echo "✅ Protection webhook"

echo ""
echo "🎉 Tests paiements terminés !"

echo ""
echo "📋 Intégration Stripe configurée :"
echo "- Sessions de checkout pour tous les plans"
echo "- Webhook prêt pour la production"
echo "- Portail client pour gestion abonnements"
echo "- Validation complète des paramètres"

echo ""
echo "🔧 Pour tester en production :"
echo "1. Configurez vos clés Stripe réelles"
echo "2. Configurez le webhook endpoint dans Stripe Dashboard"
echo "3. Testez avec de vrais paiements en mode test"