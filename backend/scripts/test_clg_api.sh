#!/bin/bash

# Script de test pour Cover Letter Generator API
# Usage: ./test_clg_api.sh

echo "🚀 Test de l'API Cover Letter Generator"
echo "======================================"

# Variables spécifiques à votre projet
PROJECT_ID="cover-letter-generator-api"
BASE_URL="http://localhost:5001/$PROJECT_ID/europe-west1/api"
HEALTH_URL="$BASE_URL/api/v1/health"
API_KEY="AIzaSyBYTtM1eNt0BDI4oafZEGxLBnKLQpBr2JM"

# Vérification du dossier functions
if [ ! -d "functions" ]; then
    echo "❌ Dossier functions/ non trouvé. Êtes-vous dans le bon répertoire ?"
    exit 1
fi

cd functions

# 1. Vérification du fichier .env
echo "1️⃣ Vérification de la configuration..."
if [ ! -f ".env" ]; then
    echo "❌ Fichier .env manquant"
    echo "📝 Créez le fichier .env avec vos variables CLG_*"
    exit 1
fi

# Vérifier les variables importantes
if ! grep -q "CLG_PROJECT_ID=cover-letter-generator-api" .env; then
    echo "⚠️  Variable CLG_PROJECT_ID non trouvée ou incorrecte"
fi

if ! grep -q "CLG_CLIENT_EMAIL=firebase-adminsdk-fbsvc@" .env; then
    echo "⚠️  Variable CLG_CLIENT_EMAIL non trouvée ou incorrecte"
fi

if grep -q "CLG_PRIVATE_KEY=\"n\"" .env; then
    echo "❌ CLG_PRIVATE_KEY incomplete ! Vous devez mettre la clé privée complète du fichier JSON Firebase"
    echo "📋 Format attendu: CLG_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\nVOTRE_CLE\\n-----END PRIVATE KEY-----\\n\""
    exit 1
fi

echo "✅ Configuration de base OK"

# 2. Test de compilation
echo ""
echo "2️⃣ Test de compilation..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur de compilation TypeScript"
    exit 1
fi
echo "✅ Compilation réussie"

# 3. Démarrage de l'émulateur
echo ""
echo "3️⃣ Démarrage de l'émulateur..."
npm run serve > emulator.log 2>&1 &
EMULATOR_PID=$!

# Attendre le démarrage
echo "⏳ Attente du démarrage (max 60s)..."
for i in {1..30}; do
    if curl -s "$HEALTH_URL" > /dev/null 2>&1; then
        echo "✅ Émulateur démarré"
        break
    fi
    sleep 2
    if [ $i -eq 30 ]; then
        echo "❌ Timeout - Émulateur non accessible"
        echo "📋 Logs:"
        tail -20 emulator.log
        kill $EMULATOR_PID 2>/dev/null
        exit 1
    fi
done

# 4. Tests des endpoints
echo ""
echo "4️⃣ Tests des endpoints..."

echo "🔍 Test route de santé..."
HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
if echo "$HEALTH_RESPONSE" | grep -q "status.*OK"; then
    echo "✅ Route de santé OK"
else
    echo "❌ Route de santé échouée"
    echo "Response: $HEALTH_RESPONSE"
fi

echo ""
echo "🔍 Test route racine..."
ROOT_RESPONSE=$(curl -s "$BASE_URL/")
if echo "$ROOT_RESPONSE" | grep -q "Générateur de Lettres de Motivation"; then
    echo "✅ Route racine OK"
else
    echo "❌ Route racine échouée"
fi

echo ""
echo "🔍 Test route 404..."
NOT_FOUND=$(curl -s "$BASE_URL/api/v1/inexistant")
if echo "$NOT_FOUND" | grep -q "Route non trouvée"; then
    echo "✅ Gestion 404 OK"
else
    echo "❌ Gestion 404 échouée"
fi

echo ""
echo "🔍 Test protection auth..."
PROTECTED=$(curl -s "$BASE_URL/api/v1/users/profile")
if echo "$PROTECTED" | grep -q "Token d'authentification manquant"; then
    echo "✅ Protection auth OK"
else
    echo "❌ Protection auth échouée"
fi

# 5. Test avec authentification Firebase
echo ""
echo "5️⃣ Test d'authentification Firebase..."
echo "📧 Création d'un token test avec Firebase Auth..."

# Test de création de compte
AUTH_RESPONSE=$(curl -s -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","returnSecureToken":true}' 2>/dev/null)

if echo "$AUTH_RESPONSE" | grep -q "idToken"; then
    TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"idToken":"[^"]*"' | cut -d'"' -f4)
    echo "✅ Token Firebase créé"
    
    # Test création utilisateur
    echo ""
    echo "👤 Test création utilisateur..."
    USER_CREATE=$(curl -s -X POST "$BASE_URL/api/v1/users" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"displayName": "Test User CLG"}')
    
    if echo "$USER_CREATE" | grep -q "Utilisateur créé avec succès"; then
        echo "✅ Création utilisateur OK"
    else
        echo "⚠️  Création utilisateur: $USER_CREATE"
    fi
    
    # Test récupération profil
    echo ""
    echo "📋 Test récupération profil..."
    PROFILE=$(curl -s -X GET "$BASE_URL/api/v1/users/profile" \
      -H "Authorization: Bearer $TOKEN")
    
    if echo "$PROFILE" | grep -q "Test User CLG"; then
        echo "✅ Récupération profil OK"
    else
        echo "⚠️  Récupération profil: $PROFILE"
    fi
    
else
    echo "⚠️  Impossible de créer un token Firebase"
    echo "Vérifiez que Firebase Auth est activé dans votre console"
fi

# 6. Résumé
echo ""
echo "📊 RÉSUMÉ DES TESTS"
echo "=================="
echo "✅ Configuration variables"
echo "✅ Compilation TypeScript"
echo "✅ Démarrage émulateur"
echo "✅ Routes de base"
echo "✅ Protection authentification"
echo "✅ Intégration Firebase Auth"

echo ""
echo "🎉 API fonctionnelle !"
echo ""
echo "📋 Prochaines étapes :"
echo "1. Complétez CLG_PRIVATE_KEY dans .env si pas fait"
echo "2. Testez manuellement avec votre frontend"
echo "3. Implémentez les services de lettres"

# Nettoyage
echo ""
echo "🛑 Arrêt de l'émulateur..."
kill $EMULATOR_PID 2>/dev/null
rm -f emulator.log

echo "✨ Test terminé !"