import React, { useState } from 'react';
import { Leaf, Mail, KeyRound, User } from 'lucide-react';
import type { Client } from '../types';

interface AuthPageProps {
  onStaffLogin: () => void;
  onPatientLogin: (client: Client) => void;
  clients: Client[];
}

const AuthPage: React.FC<AuthPageProps> = ({ onStaffLogin, onPatientLogin, clients }) => {
  const [authMode, setAuthMode] = useState<'staff' | 'patient'>('staff');
  
  // Staff state
  const [staffEmail, setStaffEmail] = useState('admin@multinav.com');
  const [staffPassword, setStaffPassword] = useState('password123');
  
  // Patient state
  const [clientId, setClientId] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  
  const [error, setError] = useState('');

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffEmail === 'admin@multinav.com' && staffPassword === 'password123') {
      setError('');
      onStaffLogin();
    } else {
      setError('Invalid staff email or password.');
    }
  };

  const handlePatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const client = clients.find(c => c.id.toLowerCase() === clientId.toLowerCase() && c.password === clientPassword);
    if (client) {
      setError('');
      onPatientLogin(client);
    } else {
      setError('Invalid Client ID or password.');
    }
  };
  
  const StaffLogin = () => (
    <form onSubmit={handleStaffSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"> <Mail className="h-5 w-5 text-gray-400" /> </div>
          <input type="email" id="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className="block w-full rounded-md border-gray-300 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="you@example.com" required />
        </div>
      </div>
      <div>
        <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"> <KeyRound className="h-5 w-5 text-gray-400" /> </div>
          <input type="password" id="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} className="block w-full rounded-md border-gray-300 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="••••••••" required />
        </div>
      </div>
      <div className="bg-baby-blue-100 dark:bg-gray-700 p-3 rounded-md text-xs text-gray-600 dark:text-gray-300">
        <p><strong>Demo Credentials:</strong></p>
        <p>Email: <code>admin@multinav.com</code> | Password: <code>password123</code></p>
      </div>
      <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none">Sign In</button>
    </form>
  );
  
   const PatientLogin = () => (
    <form onSubmit={handlePatientSubmit} className="space-y-6">
      <div>
        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client ID</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><User className="h-5 w-5 text-gray-400" /></div>
          <input type="text" id="clientId" value={clientId} onChange={(e) => setClientId(e.target.value)} className="block w-full rounded-md border-gray-300 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="e.g. C4F2A1" required />
        </div>
      </div>
      <div>
        <label htmlFor="clientPassword"className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><KeyRound className="h-5 w-5 text-gray-400" /></div>
          <input type="password" id="clientPassword" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} className="block w-full rounded-md border-gray-300 pl-10 focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="••••••••" required />
        </div>
      </div>
       <div className="bg-baby-blue-100 dark:bg-gray-700 p-3 rounded-md text-xs text-gray-600 dark:text-gray-300">
        <p>Log in with a Client ID and Password from the Client Management page.</p>
        <p>Example ID: <code>C4F2A1</code> | Password: <code>pass123</code></p>
      </div>
      <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-baby-blue-500 hover:bg-baby-blue-400 focus:outline-none">Sign In to My Navigation</button>
    </form>
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-baby-blue-50 dark:bg-gray-900">
      <div className="w-full max-w-4xl m-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex overflow-hidden">
        <div className="hidden md:flex w-1/2 bg-lime-green-500 p-12 flex-col justify-center items-center text-white relative">
          <Leaf className="h-24 w-24 mb-4" />
          <h1 className="text-4xl font-bold mb-2">MultiNav iCRM</h1>
          <p className="text-center text-lg text-lime-green-100">Your intelligent partner in multicultural health navigation.</p>
          <div className="absolute bottom-8 left-0 right-0 text-center text-lime-green-200 text-sm"> <p>&copy; 2025 Arche Health Limited</p> </div>
        </div>

        <div className="w-full md:w-1/2 p-8 sm:p-12">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            {authMode === 'staff' ? 'Staff Sign In' : 'Patient Sign In'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
             {authMode === 'staff' ? 'Welcome back! Please enter your details.' : 'Welcome to your secure patient portal.'}
          </p>

          {error && <p className="text-sm text-red-600 dark:text-red-400 mb-4 text-center">{error}</p>}

          {authMode === 'staff' ? <StaffLogin /> : <PatientLogin />}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                  setAuthMode(authMode === 'staff' ? 'patient' : 'staff');
                  setError('');
              }}
              className="text-sm font-medium text-lime-green-600 hover:text-lime-green-500 dark:text-lime-green-400 dark:hover:text-lime-green-300"
            >
              {authMode === 'staff' ? 'Are you a patient? Sign in here' : 'Are you a staff member? Sign in here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;