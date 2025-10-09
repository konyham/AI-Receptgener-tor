
import React, { useState, useRef } from 'react';
import { UserProfile, BackupData, Favorites, PantryItem, PantryLocation, ShoppingListItem, OptionItem } from '../types';
import UserEditModal from './UserEditModal';
import { useNotification } from '../contexts/NotificationContext';
import * as imageStore from '../services/imageStore';

interface UsersViewProps {
  users: UserProfile[];
  onSaveUser: (user: UserProfile | Omit<UserProfile, 'id'>) => void;
  onDeleteUser: (userId: string) => void;
}

const UsersView: React.FC<UsersViewProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserProfile | null>(null);

  const handleAddNewUser = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setUserToEdit(user);
    setIsModalOpen(true);
  };

  const handleSave = (user: UserProfile | Omit<UserProfile, 'id'>) => {
    onSaveUser(user);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center text-primary-800">Felhasználói Profilok</h2>
      
      <div className="text-center">
        <button
          onClick={handleAddNewUser}
          className="bg-primary-600 text-white font-semibold py-3 px-5 rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition"
        >
          Új felhasználó hozzáadása
        </button>
      </div>

      {users.length > 0 ? (
        <div className="space-y-4">
          {users.map(user => (
            <div key={user.id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-primary-700">{user.name}</h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEditUser(user)} className="text-sm font-semibold text-blue-600 hover:text-blue-800 p-1">Szerkesztés</button>
                  <button onClick={() => onDeleteUser(user.id)} className="text-sm font-semibold text-red-600 hover:text-red-800 p-1">Törlés</button>
                </div>
              </div>
              <div className="mt-2 space-y-2 text-sm text-gray-600">
                <p><strong className="font-semibold text-gray-700">Ízlés:</strong> {user.likes || 'Nincs megadva'}</p>
                <p><strong className="font-semibold text-gray-700">Nem szeretem:</strong> {user.dislikes || 'Nincs megadva'}</p>
                <p><strong className="font-semibold text-gray-700">Tiltott (allergia):</strong> {user.allergies || 'Nincs megadva'}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500">Nincsenek felhasználók hozzáadva.</p>
      )}

      <UserEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        userToEdit={userToEdit}
      />
    </div>
  );
};

export default UsersView;
