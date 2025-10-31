import React, { useEffect, useState } from 'react';
import type { Client } from '../types';
import Card from './Card';
import { SEX_OPTIONS, COUNTRY_OPTIONS, ETHNICITY_OPTIONS, LANGUAGE_OPTIONS, REFERRAL_SOURCE_OPTIONS } from '../constants';
import MultiSelect from './MultiSelect';

interface ClientFormProps {
  initialClient: Client | null;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

const ClientForm: React.FC<ClientFormProps> = ({ initialClient, onSave, onCancel }) => {
  const [client, setClient] = useState<Client>({
    id: initialClient?.id || '',
    fullName: initialClient?.fullName || '',
    sex: initialClient?.sex || 'Prefer not to say',
    dob: initialClient?.dob || '',
    age: initialClient?.age || null,
    ethnicity: initialClient?.ethnicity || '',
    countryOfBirth: initialClient?.countryOfBirth || '',
    languages: initialClient?.languages || [],
    referralSource: initialClient?.referralSource || '',
    referralDate: initialClient?.referralDate || new Date().toISOString().split('T')[0],
    address: initialClient?.address || '',
    postcode: initialClient?.postcode || '',
    region: initialClient?.region || '',
    password: initialClient?.password || '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setClient({ ...client, [e.target.name]: e.target.value });
  };

  const handleLanguageChange = (selected: string[]) => {
    setClient({ ...client, languages: selected });
  };
  
  const filteredEthnicities = ETHNICITY_OPTIONS.filter(e => e.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    if (client.dob) {
      const birthDate = new Date(client.dob);
      if (!isNaN(birthDate.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          setClient(c => ({ ...c, age }));
      }
    } else {
        setClient(c => ({ ...c, age: null }));
    }
  }, [client.dob]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.fullName) {
        alert("Full Name is a required field.");
        return;
    }
    onSave(client);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
            {initialClient ? 'Edit Client' : 'Add New Client'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
            <input type="text" name="fullName" id="fullName" value={client.fullName} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>

          {/* Sex */}
          <div>
            <label htmlFor="sex" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sex</label>
            <select id="sex" name="sex" value={client.sex} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              {SEX_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Date of Birth */}
          <div>
            <label htmlFor="dob" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
            <input type="date" name="dob" id="dob" value={client.dob} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Age</label>
            <div className="mt-1 flex items-center h-10 px-3 block w-full rounded-md border-gray-300 bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300">
              {client.age !== null ? `${client.age} years old` : 'Enter DoB'}
            </div>
          </div>
          
          {/* Ethnicity */}
          <div>
            <label htmlFor="ethnicity-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ethnicity / Culture</label>
            <input
              type="text"
              list="ethnicities"
              id="ethnicity-input"
              name="ethnicity"
              value={client.ethnicity}
              onChange={(e) => {
                  setClient({ ...client, ethnicity: e.target.value });
                  setSearchTerm(e.target.value);
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Search or select ethnicity..."
            />
            <datalist id="ethnicities">
              {filteredEthnicities.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          </div>

          {/* Country of Birth */}
          <div>
            <label htmlFor="countryOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country of Birth</label>
            <select id="countryOfBirth" name="countryOfBirth" value={client.countryOfBirth} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
              <option value="">Select a country</option>
              {COUNTRY_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
            </select>
          </div>

          {/* Languages Spoken */}
          <div className="md:col-span-2">
            <MultiSelect
              label="Languages Spoken"
              options={LANGUAGE_OPTIONS}
              selectedOptions={client.languages}
              onChange={handleLanguageChange}
            />
          </div>

          {/* Referral Source */}
          <div>
            <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Referral Source</label>
            <input
              type="text"
              list="referral-sources"
              name="referralSource"
              id="referralSource"
              value={client.referralSource}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Type or select a source..."
            />
            <datalist id="referral-sources">
              {REFERRAL_SOURCE_OPTIONS.map(opt => <option key={opt} value={opt} />)}
            </datalist>
          </div>

          {/* Referral Date */}
          <div>
            <label htmlFor="referralDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Referral Date</label>
            <input type="date" name="referralDate" id="referralDate" value={client.referralDate} onChange={handleInputChange} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
          </div>

          {/* Address/Suburb */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address/Suburb (Optional)</label>
            <input
              type="text"
              name="address"
              id="address"
              value={client.address || ''}
              onChange={handleInputChange}
              placeholder="Enter suburb or street address"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Free text entry - enter any suburb or address in Perth</p>
          </div>

          {/* Postcode */}
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Postcode (Optional)</label>
            <input 
              type="text" 
              name="postcode" 
              id="postcode" 
              value={client.postcode || ''} 
              onChange={handleInputChange} 
              placeholder="e.g., 6000" 
              maxLength={4}
              pattern="[0-9]{4}"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">4-digit Western Australian postcode</p>
          </div>

          {/* Region */}
          <div>
            <label htmlFor="region" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Region (Required)</label>
            <select 
              id="region" 
              name="region" 
              value={client.region || ''} 
              onChange={handleInputChange} 
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select a region</option>
              <option value="Perth North">Perth North</option>
              <option value="Perth South">Perth South</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Select the primary region for this client</p>
          </div>

           {/* Password */}
          <div className="md:col-span-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Portal Password</label>
            <input type="text" name="password" id="password" value={client.password} onChange={handleInputChange} placeholder="Set a password for the client" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-lime-green-500 focus:ring-lime-green-500 sm:text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
             <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Clients use their Client ID and this password to log in to the My Navigation portal.</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-end space-x-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-lime-green-500 hover:bg-lime-green-600 focus:outline-none">
            {initialClient ? 'Save Changes' : 'Add Client'}
          </button>
        </div>
      </form>
    </Card>
  );
};

export default ClientForm;
