import api from './api';
import type { User, UserCreateData } from '../types';
import { getAuth, updateProfile as firebaseUpdateProfile } from 'firebase/auth';

class AuthService {
  /**
   * Crée un nouvel utilisateur dans Firestore
   */
  async createUser(userData: UserCreateData): Promise<void> {
    await api.post('/users', userData);
  }

  /**
   * Vérifie si un utilisateur existe déjà dans Firestore
   */
  async checkUserExists(uid: string): Promise<boolean> {
    try {
      await api.get(`/users/${uid}`);
      return true;
    } catch (error:any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Récupère les informations de l'utilisateur connecté
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get('/users/me');
    return response.data;
  }

  /**
   * Met à jour le profil utilisateur dans Firebase Auth
   */
  async updateProfile(profileData: { displayName?: string, photoURL?: string }): Promise<void> {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('Aucun utilisateur connecté');
    }
    
    await firebaseUpdateProfile(user, profileData);
  }

  /**
   * Met à jour les informations utilisateur dans Firestore
   */
  async updateUser(userData: Partial<User>): Promise<void> {
    await api.put('/users/me', userData);
  }

  /**
   * Supprime le compte utilisateur
   */
  async deleteUser(): Promise<void> {
    await api.delete('/users/me');
    
    // Supprimer également l'utilisateur dans Firebase Auth
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (user) {
      await user.delete();
    }
  }
}

export default new AuthService();