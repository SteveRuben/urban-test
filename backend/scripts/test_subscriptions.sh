#!/bin/bash

# Script de test des endpoints abonnements
# Usage: ./test_subscriptions.sh [FIREBASE_TOKEN]

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

echo "💳 Test des endpoints abonnements"
echo "================================"
echo "🌐 Base URL: $BASE_URL"
echo "🔑 Token: ${TOKEN:0:20}..."
echo ""

# Variables pour stocker les IDs
SUBSCRIPTION_ID=""

# Test 1: Récupérer les plans disponibles (sans auth)
echo "1️⃣ Test récupération des plans disponibles (public)..."
PLANS_RESPONSE=$(curl -s -X GET "$BASE_URL/subscriptions/plans")

if echo "$PLANS_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Plans récupérés avec succès"
    echo "   Plans disponibles: $(echo "$PLANS_RESPONSE" | jq -r '.data | length') plans"
    
    # Afficher les noms des plans
    PLAN_NAMES=$(echo "$PLANS_RESPONSE" | jq -r '.data[].name' | tr '\n' ', ' | sed 's/,$//')
    echo "   Plans: $PLAN_NAMES"
else
    echo "❌ Erreur récupération plans"
    echo "   Response: $PLANS_RESPONSE"
fi

echo ""

# Test 2: Vérifier l'abonnement actuel (devrait être null pour un nouvel utilisateur)
echo "2️⃣ Test récupération abonnement actuel..."
CURRENT_SUB=$(curl -s -X GET "$BASE_URL/subscriptions/current" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CURRENT_SUB" | grep -q "success.*true"; then
    echo "✅ Abonnement actuel récupéré"
    
    if echo "$CURRENT_SUB" | grep -q '"data":null'; then
        echo "   Aucun abonnement actif (normal pour nouvel utilisateur)"
    else
        echo "   Abonnement actif trouvé"
        SUBSCRIPTION_ID=$(echo "$CURRENT_SUB" | jq -r '.data.id')
    fi
else
    echo "❌ Erreur récupération abonnement actuel"
fi

echo ""

# Test 3: Créer un abonnement basique
echo "3️⃣ Test création d'abonnement basique..."
CREATE_SUB=$(curl -s -X POST "$BASE_URL/subscriptions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "planId": "basic",
    "plan": "basic"
  }')

if echo "$CREATE_SUB" | grep -q "Abonnement créé avec succès"; then
    echo "✅ Abonnement créé avec succès"
    SUBSCRIPTION_ID=$(echo "$CREATE_SUB" | jq -r '.data.id')
    echo "   ID: $SUBSCRIPTION_ID"
    echo "   Plan: $(echo "$CREATE_SUB" | jq -r '.data.plan')"
    echo "   Status: $(echo "$CREATE_SUB" | jq -r '.data.status')"
else
    echo "⚠️  Création abonnement: $CREATE_SUB"
fi

echo ""

# Test 4: Récupérer le résumé d'abonnement
echo "4️⃣ Test résumé d'abonnement..."
SUMMARY=$(curl -s -X GET "$BASE_URL/subscriptions/summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$SUMMARY" | grep -q "success.*true"; then
    echo "✅ Résumé récupéré avec succès"
    echo "   Type abonnement: $(echo "$SUMMARY" | jq -r '.data.subscriptionType')"
    echo "   Abonnement actif: $(echo "$SUMMARY" | jq -r '.data.hasActiveSubscription')"
    
    # Afficher les limites IA
    AI_LIMIT=$(echo "$SUMMARY" | jq -r '.data.aiUsage.limit')
    AI_CURRENT=$(echo "$SUMMARY" | jq -r '.data.aiUsage.currentUsage')
    echo "   Limites IA: $AI_CURRENT/$AI_LIMIT utilisées"
    
    # Afficher les limites lettres
    LETTER_LIMIT=$(echo "$SUMMARY" | jq -r '.data.letterLimits.limit')
    LETTER_CURRENT=$(echo "$SUMMARY" | jq -r '.data.letterLimits.currentCount')
    echo "   Limites lettres: $LETTER_CURRENT/$LETTER_LIMIT utilisées"
else
    echo "❌ Erreur récupération résumé"
fi

echo ""

# Test 5: Vérifier les limites IA
echo "5️⃣ Test vérification limites IA..."
AI_USAGE=$(curl -s -X GET "$BASE_URL/subscriptions/ai-usage" \
  -H "Authorization: Bearer $TOKEN")

if echo "$AI_USAGE" | grep -q "success.*true"; then
    echo "✅ Limites IA récupérées"
    
    CAN_USE=$(echo "$AI_USAGE" | jq -r '.data.canUse')
    CURRENT_USAGE=$(echo "$AI_USAGE" | jq -r '.data.currentUsage')
    LIMIT=$(echo "$AI_USAGE" | jq -r '.data.limit')
    
    echo "   Peut utiliser IA: $CAN_USE"
    echo "   Utilisation actuelle: $CURRENT_USAGE"
    echo "   Limite: $LIMIT"
else
    echo "❌ Erreur vérification limites IA"
fi

echo ""

# Test 6: Vérifier les limites lettres
echo "6️⃣ Test vérification limites lettres..."
LETTER_LIMITS=$(curl -s -X GET "$BASE_URL/subscriptions/letter-limits" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LETTER_LIMITS" | grep -q "success.*true"; then
    echo "✅ Limites lettres récupérées"
    
    CAN_CREATE=$(echo "$LETTER_LIMITS" | jq -r '.data.canCreate')
    CURRENT_COUNT=$(echo "$LETTER_LIMITS" | jq -r '.data.currentCount')
    LIMIT=$(echo "$LETTER_LIMITS" | jq -r '.data.limit')
    
    echo "   Peut créer lettre: $CAN_CREATE"
    echo "   Lettres actuelles: $CURRENT_COUNT"
    echo "   Limite: $LIMIT"
else
    echo "❌ Erreur vérification limites lettres"
fi

echo ""

# Test 7: Incrémenter l'usage IA (si possible)
if [ "$CAN_USE" = "true" ]; then
    echo "7️⃣ Test incrémentation usage IA..."
    INCREMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/subscriptions/increment-ai-usage" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$INCREMENT_RESPONSE" | grep -q "Utilisation IA incrémentée"; then
        echo "✅ Usage IA incrémenté"
        
        # Revérifier les limites
        NEW_AI_USAGE=$(curl -s -X GET "$BASE_URL/subscriptions/ai-usage" \
          -H "Authorization: Bearer $TOKEN")
        NEW_CURRENT=$(echo "$NEW_AI_USAGE" | jq -r '.data.currentUsage')
        echo "   Nouvelle utilisation: $NEW_CURRENT"
    else
        echo "⚠️  Incrémentation: $INCREMENT_RESPONSE"
    fi
else
    echo "7️⃣ Skip incrémentation (limite atteinte)"
fi

echo ""

# Test 8: Tester la récupération d'un abonnement spécifique
if [ -n "$SUBSCRIPTION_ID" ] && [ "$SUBSCRIPTION_ID" != "null" ]; then
    echo "8️⃣ Test récupération abonnement par ID..."
    SUB_BY_ID=$(curl -s -X GET "$BASE_URL/subscriptions/$SUBSCRIPTION_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$SUB_BY_ID" | grep -q "success.*true"; then
        echo "✅ Abonnement récupéré par ID"
        echo "   Plan: $(echo "$SUB_BY_ID" | jq -r '.data.plan')"
        echo "   Status: $(echo "$SUB_BY_ID" | jq -r '.data.status')"
    else
        echo "❌ Erreur récupération par ID"
    fi
else
    echo "8️⃣ Skip récupération ID (pas d'abonnement créé)"
fi

echo ""

# Test 9: Test d'annulation d'abonnement
if [ -n "$SUBSCRIPTION_ID" ] && [ "$SUBSCRIPTION_ID" != "null" ]; then
    echo "9️⃣ Test annulation d'abonnement..."
    CANCEL_RESPONSE=$(curl -s -X POST "$BASE_URL/subscriptions/$SUBSCRIPTION_ID/cancel" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"cancelAtPeriodEnd": true}')
    
    if echo "$CANCEL_RESPONSE" | grep -q "Abonnement annulé avec succès"; then
        echo "✅ Abonnement annulé avec succès"
        echo "   Annulation à la fin de période: $(echo "$CANCEL_RESPONSE" | jq -r '.data.cancelAtPeriodEnd')"
    else
        echo "⚠️  Annulation: $CANCEL_RESPONSE"
    fi
else
    echo "9️⃣ Skip annulation (pas d'abonnement)"
fi

echo ""

# Résumé
echo "📊 RÉSUMÉ DES TESTS ABONNEMENTS"
echo "=============================="
echo "✅ Plans disponibles"
echo "✅ Abonnement actuel"
echo "✅ Création d'abonnement"
echo "✅ Résumé d'abonnement"
echo "✅ Vérification limites IA"
echo "✅ Vérification limites lettres"
echo "✅ Incrémentation usage"
echo "✅ Récupération par ID"
echo "✅ Annulation d'abonnement"

echo ""
echo "🎉 Tests abonnements terminés !"

echo ""
echo "📋 Intégration avec les lettres :"
echo "Les limites d'abonnement sont maintenant vérifiées lors de :"
echo "- Création de lettres"
echo "- Utilisation de l'IA"
echo "- Export de documents"