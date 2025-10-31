export interface Client {
  id: string;
  fullName: string;
  sex: string;
  dob: string;
  age: number | null;
  ethnicity: string;
  countryOfBirth: string;
  languages: string[];
  referralSource: string;
  referralDate: string;
  address?: string;
  postcode?: string;
  region?: string;
  password?: string;
}

export interface HealthActivity {
    id: string;
    clientId: string;
    date: string;
    navigationAssistance: string[];
    servicesAccessed: string[];
    referralsMade: string;
    followUpActions: string;
    educationalResources: string[];
    preventiveServices: string[];
    maternalChildHealth: string[];
    // New fields for "Other" options
    otherAssistance?: string;
    otherEducation?: string;
    // Discharge information
    dischargeDate?: string;
    dischargeReason?: string;
    isDischarge?: boolean;
    // Staff tracking fields
    createdBy?: string; // Email of staff who created this
    createdByName?: string; // Name of staff who created this
    createdByRole?: 'admin' | 'coordinator' | 'navigator';
    createdAt?: string; // Timestamp when created
    location?: string; // Location where service was delivered
}

export interface Workforce {
  fte: number;
  role: string;
  ethnicity: string;
  languages: string[];
}

export interface WorkforceData {
  north: Workforce[];
  south: Workforce[];
}

export interface ProgramResource {
    id: string;
    name: string;
    type: string;
    dateAdded: string;
    category: string;
    // File storage fields
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    storagePath?: string;
}

export interface AiInsight {
    title: string;
    insight: string;
    recommendation?: string;
}

export interface GpPractice {
  id: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  notes: string;
}

export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64 data URL
}

export interface ExperienceEntry {
  id: string;
  date: string;
  content: string;
  isRead?: boolean;
  attachments?: Attachment[];
}

export interface ChatMessage {
  id:string;
  timestamp: string;
  sender: 'patient' | 'navigator';
  text: string;
  language: string;
  isRead?: boolean;
}

export interface PatientData {
  experiences: ExperienceEntry[];
  messages: ChatMessage[];
}