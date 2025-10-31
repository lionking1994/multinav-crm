import { useState, useEffect } from 'react';
import { 
  clientService, 
  activityService, 
  workforceService, 
  resourceService, 
  gpPracticeService, 
  patientDataService,
  initializeDatabase 
} from '../services/supabaseService';
import type { 
  Client, 
  HealthActivity, 
  WorkforceData, 
  ProgramResource, 
  GpPractice, 
  PatientData 
} from '../types';

interface UseSupabaseReturn {
  // Data
  clients: Client[];
  activities: HealthActivity[];
  workforce: WorkforceData;
  resources: ProgramResource[];
  gpPractices: GpPractice[];
  patientData: Record<string, PatientData>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Methods
  refreshData: () => Promise<void>;
  setClients: (clients: Client[]) => void;
  setActivities: (activities: HealthActivity[]) => void;
  setWorkforce: (workforce: WorkforceData) => void;
  setResources: (resources: ProgramResource[]) => void;
  setGpPractices: (practices: GpPractice[]) => void;
  setPatientData: (data: Record<string, PatientData>) => void;
}

export function useSupabase(): UseSupabaseReturn {
  const [clients, setClientsState] = useState<Client[]>([]);
  const [activities, setActivitiesState] = useState<HealthActivity[]>([]);
  const [workforce, setWorkforceState] = useState<WorkforceData>({ north: [], south: [] });
  const [resources, setResourcesState] = useState<ProgramResource[]>([]);
  const [gpPractices, setGpPracticesState] = useState<GpPractice[]>([]);
  const [patientData, setPatientDataState] = useState<Record<string, PatientData>>({});
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if Supabase is configured
  const isSupabaseConfigured = () => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return url && key && url !== '' && key !== '';
  };
  
  // Load all data from Supabase
  const loadData = async () => {
    if (!isSupabaseConfigured()) {
      console.log('Supabase not configured, using mock data');
      // Use the existing mock data that's already in state
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Initialize database with mock data if empty
      await initializeDatabase();
      
      // Load all data in parallel
      const [
        clientsData,
        activitiesData,
        workforceData,
        resourcesData,
        gpPracticesData,
        patientDataAll
      ] = await Promise.all([
        clientService.getAll(),
        activityService.getAll(),
        workforceService.getAll(),
        resourceService.getAll(),
        gpPracticeService.getAll(),
        patientDataService.getAllPatientData()
      ]);
      
      setClientsState(clientsData);
      setActivitiesState(activitiesData);
      setWorkforceState(workforceData);
      setResourcesState(resourcesData);
      setGpPracticesState(gpPracticesData);
      setPatientDataState(patientDataAll);
      
    } catch (err) {
      console.error('Error loading data from Supabase:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);
  
  // Wrapper functions that update both local state and Supabase
  const setClients = async (newClients: Client[]) => {
    setClientsState(newClients);
    
    if (!isSupabaseConfigured()) return;
    
    // In a real app, you'd sync changes more intelligently
    // For now, we'll just update the local state
    // The actual CRUD operations should be done through individual service methods
  };
  
  const setActivities = async (newActivities: HealthActivity[]) => {
    setActivitiesState(newActivities);
    
    if (!isSupabaseConfigured()) return;
    
    // Similar to setClients - in production, sync changes properly
  };
  
  const setWorkforce = async (newWorkforce: WorkforceData) => {
    setWorkforceState(newWorkforce);
    
    if (!isSupabaseConfigured()) return;
    
    try {
      await workforceService.replaceAll(newWorkforce);
    } catch (err) {
      console.error('Error updating workforce:', err);
    }
  };
  
  const setResources = (newResources: ProgramResource[]) => {
    setResourcesState(newResources);
    // Sync handled by individual CRUD operations
  };
  
  const setGpPractices = (newPractices: GpPractice[]) => {
    setGpPracticesState(newPractices);
    // Sync handled by individual CRUD operations
  };
  
  const setPatientData = (newData: Record<string, PatientData>) => {
    setPatientDataState(newData);
    // Sync handled by individual CRUD operations
  };
  
  return {
    clients,
    activities,
    workforce,
    resources,
    gpPractices,
    patientData,
    isLoading,
    error,
    refreshData: loadData,
    setClients,
    setActivities,
    setWorkforce,
    setResources,
    setGpPractices,
    setPatientData
  };
}






