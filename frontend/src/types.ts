export interface DbUser {
  id: number;
  uid: string;
  email: string;
  name: string | null;
  role: 'Citizen' | 'Volunteer' | 'NGO' | 'Rescue coordinator' | 'Admin' | 'SuperAdmin';
  phone: string | null;
  organization: string | null;
  trustScore: number;
  isSuspended: boolean;
  createdAt: string;
}

export interface RescueCase {
  id: number;
  reporterId: number | null;
  title: string;
  description: string;
  species: 'dog' | 'cat' | 'bird' | 'other';
  injurySeverity: 'Critical' | 'Moderate' | 'Minor' | 'Unknown';
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  status: 'Reported' | 'Assigned' | 'En Route' | 'Rescued' | 'In Treatment' | 'Adoption Ready' | 'Adopted';
  coordinatorId: number | null;
  ngoId: number | null;
  volunteerId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  distance?: number; // calculated from PostGIS queries
}

export interface RescueLog {
  id: number;
  rescueId: number;
  status: string;
  note: string | null;
  createdAt: string;
  userEmail: string;
  userName: string | null;
  userRole: string;
}

export interface AdoptionApplication {
  id: number;
  rescueId: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  notes: string | null;
  createdAt: string;
  applicantName: string | null;
  applicantEmail: string;
  petTitle: string;
  petSpecies: string;
  petImageUrl: string | null;
  applicantAddress?: string | null;
  preferredSpecies?: string | null;
  applicantPhone?: string | null;
  experience?: string | null;
}
