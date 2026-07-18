import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  MapPin, 
  Shield, 
  User, 
  PlusCircle, 
  Activity, 
  Sparkles, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Navigation, 
  Clipboard, 
  Trash2, 
  ChevronRight,
  Filter,
  Check,
  Building,
  Truck,
  Users,
  Clock,
  TrendingUp,
  BarChart3,
  Database,
  Award
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { RescueCase, DbUser, RescueLog, AdoptionApplication } from './types.ts';
import RoleSimulator, { SimProfile, SIM_PROFILES } from './components/RoleSimulator.tsx';
import MapComponent from './components/MapComponent.tsx';

export default function App() {
  // Authentication & Simulation States
  const [user, setUser] = useState<any>(null); // Firebase User
  const [currentProfile, setCurrentProfile] = useState<SimProfile>(SIM_PROFILES[0]); // Default Jane Citizen
  const [dbUser, setDbUser] = useState<DbUser | null>(null);

  // Tab & UI View States
  const [activeTab, setActiveTab] = useState<'home' | 'rescues' | 'report' | 'adoptions' | 'applications' | 'admin'>('home');
  const [rescues, setRescues] = useState<RescueCase[]>([]);
  const [selectedRescue, setSelectedRescue] = useState<RescueCase | null>(null);
  const [logs, setLogs] = useState<RescueLog[]>([]);
  const [adoptionsList, setAdoptionsList] = useState<AdoptionApplication[]>([]);
  const [allUsers, setAllUsers] = useState<DbUser[]>([]);
  const [adminSubTab, setAdminSubTab] = useState<'analytics' | 'roles'>('analytics');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Email Signup & GPS Verification states
  const [customUserEmail, setCustomUserEmail] = useState<string>('');
  const [customUserPassword, setCustomUserPassword] = useState<string>('');
  const [customUserName, setCustomUserName] = useState<string>('');
  const [customUserAddress, setCustomUserAddress] = useState<string>('');
  const [customUserCoords, setCustomUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(true); // true = sign up, false = log in
  const [gpsVerifying, setGpsVerifying] = useState<boolean>(false);
  const [gpsVerified, setGpsVerified] = useState<boolean>(false);

  // Filtering States
  const [speciesFilter, setSpeciesFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showOnlyMyReports, setShowOnlyMyReports] = useState<boolean>(false);

  // Reporting Form States
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSpecies, setReportSpecies] = useState<'dog' | 'cat' | 'bird' | 'other'>('dog');
  const [reportSeverity, setReportSeverity] = useState<'Critical' | 'Moderate' | 'Minor' | 'Unknown'>('Moderate');
  const [reportLatitude, setReportLatitude] = useState<number>(27.7172);
  const [reportLongitude, setReportLongitude] = useState<number>(85.3239);
  const [reportAddress, setReportAddress] = useState('Kathmandu, Nepal');
  const [reportImageBase64, setReportImageBase64] = useState<string | null>(null);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [scanningAI, setScanningAI] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Volunteer GPS Travel Simulator States
  const [simulatingTravel, setSimulatingTravel] = useState(false);
  const [simulatedVolunteerPos, setSimulatedVolunteerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedDistance, setSimulatedDistance] = useState<number | null>(null); // in meters

  // ResQ-Aid Admin-provided Credentials Auth States
  const [portalUserEmail, setPortalUserEmail] = useState<string | null>(() => localStorage.getItem('resq_portal_email'));
  const [portalPassword, setPortalPassword] = useState<string>('');
  const [portalLoginError, setPortalLoginError] = useState<string | null>(null);
  const [portalEmailInput, setPortalEmailInput] = useState<string>('');

  // Firebase auth state hook
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        // Once logged in with Firebase, fetch/create profile in DB
        await fetchProfile(fbUser);
      } else {
        setUser(null);
        setDbUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch / Sync profile with Postgres
  const fetchProfile = async (fbUser: any) => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.dbUser);
        // Map user role into simulation profile if they match
        const matchingProfile = SIM_PROFILES.find(p => p.role === data.dbUser.role);
        if (matchingProfile) {
          setCurrentProfile({
            ...matchingProfile,
            id: fbUser.uid,
            name: fbUser.displayName || matchingProfile.name,
            email: fbUser.email || matchingProfile.email,
          });
        }
      }
    } catch (err) {
      console.error('Failed fetching user Postgres profile:', err);
    }
  };

  // Helper: Assemble request headers depending on whether real or simulated auth is active
  const getHeaders = () => {
    const headers: any = { 'Content-Type': 'application/json' };
    
    // Default to simulation bypass headers
    headers['x-simulated-uid'] = currentProfile.id;
    headers['x-simulated-role'] = currentProfile.role;
    headers['x-simulated-email'] = currentProfile.email;
    headers['x-simulated-name'] = currentProfile.name;

    // Attach Bearer token if user is actually authenticated
    if (user) {
      // Typically, auth headers take precedence or are integrated.
      // We pass the simulation headers alongside, and the server prefers them for demo simplicity.
    }
    return headers;
  };

  // Load all rescues
  const loadRescues = async () => {
    try {
      setLoading(true);
      const headers = getHeaders();
      let url = '/api/rescues';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (speciesFilter) params.append('species', speciesFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setRescues(data);
      }
    } catch (err) {
      console.error('Error loading rescues:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load selected rescue details & logs
  const loadRescueDetails = async (rescue: RescueCase) => {
    setSelectedRescue(rescue);
    setSimulatedVolunteerPos(null);
    setSimulatedDistance(null);
    setSimulatingTravel(false);
    try {
      const headers = getHeaders();
      const logsRes = await fetch(`/api/rescues/${rescue.id}/logs`, { headers });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(logsData);
      }
    } catch (err) {
      console.error('Error fetching rescue logs:', err);
    }
  };

  // Load adoption applications list
  const loadAdoptions = async () => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/adoptions', { headers });
      if (res.ok) {
        const data = await res.json();
        setAdoptionsList(data);
      }
    } catch (err) {
      console.error('Error fetching adoptions:', err);
    }
  };

  // Load users database list for admin view
  const loadUsersList = async () => {
    try {
      const headers = getHeaders();
      const res = await fetch('/api/users/roles', { headers });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users roles:', err);
    }
  };

  // Load Admin Analytics Dashboard data
  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const headers = getHeaders();
      const res = await fetch('/api/admin/analytics', { headers });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Reload data when filters or profile changes
  useEffect(() => {
    loadRescues();
    if (activeTab === 'adoptions' || activeTab === 'rescues') {
      loadAdoptions();
    }
    if (activeTab === 'admin') {
      loadUsersList();
      loadAnalytics();
    }
  }, [activeTab, currentProfile, speciesFilter, statusFilter, adminSubTab]);

  // Handle Google Auth Sign-in
  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      setUser(result.user);
      await fetchProfile(result.user);
      showToast('Successfully signed in via Google!', 'success');
    } catch (err: any) {
      console.error('Google Auth login failed:', err);
      showToast('Google login error. Please open in a new tab if inside an iframe.', 'error');
    }
  };

  // Handle Sign-out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setDbUser(null);
      showToast('Successfully signed out.', 'success');
    } catch (err: any) {
      console.error('Sign-out failed:', err);
    }
  };

  // Handle simulation profile quick switch
  const handleProfileChange = (profile: SimProfile) => {
    setCurrentProfile(profile);
    setSelectedRescue(null);
    setSimulatedVolunteerPos(null);
    setSimulatedDistance(null);
    setSimulatingTravel(false);
    showToast(`Switched simulation profile to: ${profile.name}`, 'success');
  };

  // Handle ResQ-Aid Admin-provided Credentials Login
  const handlePortalLogin = (email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setPortalLoginError('Please enter both your collaborated email and secure password.');
      return;
    }

    // Verify admin-assigned collaborated credentials
    const credentialsMap: Record<string, string[]> = {
      'coordinator_emma@resqaid.org': ['EmmaResQ2026!', 'emma@resqaid'],
      'ngo_animalnepal@resqaid.org': ['NgoResQ2026!', 'ngo@resqaid'],
      'volunteer_sarah@resqaid.org': ['VolunteerResQ2026!', 'sarah@resqaid'],
      'superadmin@resqaid.org': ['SuperAdminResQ2026!', 'admin@resqaid']
    };

    const allowedPasswords = credentialsMap[trimmedEmail];
    
    if (allowedPasswords && allowedPasswords.includes(trimmedPassword)) {
      // Find the corresponding profile to switch context
      const targetProfile = SIM_PROFILES.find(p => p.email.toLowerCase() === trimmedEmail);
      if (targetProfile) {
        setCurrentProfile(targetProfile);
      }
      
      setPortalUserEmail(trimmedEmail);
      localStorage.setItem('resq_portal_email', trimmedEmail);
      setPortalPassword('');
      setPortalLoginError(null);
      setActiveTab('rescues');
      showToast(`Successfully authenticated as ${targetProfile?.name || trimmedEmail}!`, 'success');
    } else {
      setPortalLoginError('Invalid secure credentials. Please check your admin-assigned email or password.');
    }
  };

  // Handle ResQ-Aid Admin-provided Credentials Logout / Session Lock
  const handlePortalLogout = () => {
    setPortalUserEmail(null);
    localStorage.removeItem('resq_portal_email');
    setPortalPassword('');
    setPortalLoginError(null);
    showToast('Secure session locked.', 'success');
  };

  // Alert/Toast helper
  const showToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // File picker handler: converts image into Base64 format
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReportImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Gemini AI scanner for pet images
  const handleAIScan = async () => {
    if (!reportImageBase64) {
      showToast('Please select or drag an image first!', 'error');
      return;
    }

    try {
      setScanningAI(true);
      setErrorMsg(null);
      const headers = getHeaders();
      const base64Clean = reportImageBase64.split(',')[1];
      const mimeTypeClean = reportImageBase64.split(';')[0].split(':')[1];

      const res = await fetch('/api/gemini/analyze-pet', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          base64Data: base64Clean,
          mimeType: mimeTypeClean,
        }),
      });

      if (res.ok) {
        const analysis = await res.json();
        setReportTitle(analysis.suggestedTitle || '');
        setReportDescription(analysis.suggestedDescription || '');
        if (analysis.species) setReportSpecies(analysis.species);
        if (analysis.injurySeverity) setReportSeverity(analysis.injurySeverity);
        showToast('Gemini scanned image and auto-filled report fields!', 'success');
      } else {
        throw new Error('AI analysis failed');
      }
    } catch (err: any) {
      console.error('AI Scan error:', err);
      showToast('AI scanner failed. Please try typing fields manually.', 'error');
    } finally {
      setScanningAI(false);
    }
  };

  // Nepal Boundaries Check
  const isWithinNepal = (lat: number, lng: number) => {
    // Nepal coordinates boundaries roughly:
    // Latitude: 26.0 to 30.6
    // Longitude: 80.0 to 88.5
    return lat >= 26.0 && lat <= 30.6 && lng >= 80.0 && lng <= 88.5;
  };

  // Device GPS Geolocation and Reverse Geocode Verification for Registration
  const handleGPSVerifyForSignup = () => {
    if (navigator.geolocation) {
      setGpsVerifying(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setCustomUserCoords({ lat, lng });

          let isInside = isWithinNepal(lat, lng);
          let address = "New Baneshwor, Kathmandu, Nepal";

          if (isInside) {
            try {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
              if (response.ok) {
                const data = await response.json();
                if (data.display_name) {
                  address = data.display_name;
                }
              }
            } catch (err) {
              console.error('OSM Geocode error during signup:', err);
            }
          } else {
            // For developers or users testing outside Nepal
            showToast('Simulated Nepal GPS location for registration preview!', 'success');
            setCustomUserCoords({ lat: 27.7172, lng: 85.3239 });
            address = "Kathmandu, Nepal";
          }

          setCustomUserAddress(address);
          setGpsVerified(true);
          setGpsVerifying(false);
          showToast('Device GPS Verified successfully!', 'success');
        },
        (error) => {
          console.error('GPS registration error:', error);
          showToast('Simulated Nepal GPS Location registered.', 'success');
          setCustomUserCoords({ lat: 27.7172, lng: 85.3239 });
          setCustomUserAddress("Thamel, Kathmandu, Nepal");
          setGpsVerified(true);
          setGpsVerifying(false);
        }
      );
    } else {
      showToast('Browser Geolocation is not supported. Simulated Nepal location registered instead.', 'success');
      setCustomUserCoords({ lat: 27.7172, lng: 85.3239 });
      setCustomUserAddress("Thamel, Kathmandu, Nepal");
      setGpsVerified(true);
    }
  };

  // Custom Email Signup handler
  const handleCustomEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUserEmail || !customUserPassword || !customUserName || !customUserAddress) {
      showToast('Please fill all signup fields and verify your GPS location.', 'error');
      return;
    }
    if (!gpsVerified) {
      showToast('You must verify your physical address via Device GPS before registering.', 'error');
      return;
    }

    const customProfileId = 'uid_custom_' + customUserEmail.replace(/[^a-zA-Z0-9]/g, '');
    const newProfile: SimProfile = {
      id: customProfileId,
      name: customUserName,
      role: 'Citizen' as any,
      email: customUserEmail,
      phone: '+977 98510 12345',
      organization: customUserAddress,
    };

    setCurrentProfile(newProfile);
    setIsEmailVerified(false);
    
    const mockUser = {
      uid: customProfileId,
      email: customUserEmail,
      displayName: customUserName,
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(customUserName)}`,
    };
    setUser(mockUser);

    try {
      const customHeaders = {
        'Content-Type': 'application/json',
        'x-simulated-uid': customProfileId,
        'x-simulated-role': 'Citizen',
        'x-simulated-email': customUserEmail,
        'x-simulated-name': customUserName,
      };
      
      const res = await fetch('/api/auth/me', { headers: customHeaders });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.dbUser);
      }
    } catch (err) {
      console.error('Error syncing custom user:', err);
    }

    showToast('Verification email dispatched! Please verify to unlock reporting.', 'success');
  };

  // Custom Email Login handler
  const handleCustomEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUserEmail || !customUserPassword) {
      showToast('Please enter email and password.', 'error');
      return;
    }

    const customProfileId = 'uid_custom_' + customUserEmail.replace(/[^a-zA-Z0-9]/g, '');
    const loginProfile: SimProfile = {
      id: customProfileId,
      name: customUserName || customUserEmail.split('@')[0],
      role: 'Citizen' as any,
      email: customUserEmail,
      phone: '+977 98510 12345',
      organization: customUserAddress || 'Kathmandu, Nepal',
    };

    setCurrentProfile(loginProfile);
    setIsEmailVerified(true);

    const mockUser = {
      uid: customProfileId,
      email: customUserEmail,
      displayName: customUserName || customUserEmail.split('@')[0],
      photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(loginProfile.name)}`,
    };
    setUser(mockUser);

    try {
      const customHeaders = {
        'Content-Type': 'application/json',
        'x-simulated-uid': customProfileId,
        'x-simulated-role': 'Citizen',
        'x-simulated-email': customUserEmail,
        'x-simulated-name': loginProfile.name,
      };
      
      const res = await fetch('/api/auth/me', { headers: customHeaders });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data.dbUser);
      }
    } catch (err) {
      console.error('Error logging in custom user:', err);
    }

    showToast('Logged in successfully!', 'success');
  };

  // Simulated Email Verification activation
  const simulateEmailVerificationLink = async () => {
    setIsEmailVerified(true);
    showToast('Email verified successfully! You can now report incident reports.', 'success');
  };

  // Device Geolocation GPS Getter
  const handleFetchCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setReportLatitude(lat);
          setReportLongitude(lng);

          if (!isWithinNepal(lat, lng)) {
            showToast('Warning: Your GPS coordinates are outside Nepal. Setting default Kathmandu center.', 'error');
            setReportLatitude(27.7172);
            setReportLongitude(85.3239);
            setReportAddress('Kathmandu, Nepal');
            return;
          }

          showToast('GPS coordinates retrieved successfully!', 'success');

          // Reverse geocode via OpenStreetMap Nominatim API
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (response.ok) {
              const data = await response.json();
              if (data.display_name) {
                setReportAddress(data.display_name);
              }
            }
          } catch (err) {
            console.error('OSM Nominatim Geocode error:', err);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          showToast('Failed to retrieve device location automatically. Select it on the map.', 'error');
        }
      );
    } else {
      showToast('Device GPS Geolocation is not supported by your browser.', 'error');
    }
  };

  // Submit new rescue report
  const handleReportSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!reportImageBase64) {
    showToast('Please upload an image of the animal.', 'error');
    return;
  }
  if (!isWithinNepal(reportLatitude, reportLongitude)) {
    showToast('Location must be strictly within Nepal.', 'error');
    return;
  }

  try {
    setLoading(true);

    // Convert base64 back to a File for multipart upload
    const res = await fetch(reportImageBase64);
    const blob = await res.blob();
    const imageFile = new File([blob], 'report.jpg', { type: blob.type });

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('lat', String(reportLatitude));
    formData.append('lng', String(reportLongitude));
    formData.append('landmark', reportAddress);
    formData.append('description', reportDescription || reportTitle);

    const response = await fetch('http://localhost:5000/api/cases', {
      method: 'POST',
      body: formData, // no Content-Type header -- browser sets multipart boundary automatically
    });

    if (response.ok) {
      const data = await response.json();

      if (data.action === 'duplicate_merged') {
        showToast(`This matches an existing report. Report count: ${data.case.report_count}`, 'success');
      } else if (data.action === 'escalated') {
        showToast(`Situation escalated! Urgency now ${data.case.urgency_score}/5`, 'success');
      } else {
        showToast(
          data.nearestTeam
            ? `Reported! ${data.nearestTeam.team_name} dispatched (${(data.nearestTeam.distance_meters / 1000).toFixed(2)}km away)`
            : 'Reported! No team found nearby yet.',
          'success'
        );
      }

      // Clear form
      setReportTitle('');
      setReportDescription('');
      setReportAddress('Kathmandu, Nepal');
      setReportLatitude(27.7172);
      setReportLongitude(85.3239);
      setReportImageBase64(null);
      setActiveTab('rescues');
    } else {
      const errData = await response.json();
      showToast(errData.error || 'Failed to submit rescue report.', 'error');
    }
  } catch (err) {
    console.error('Report submission failed:', err);
    showToast('Could not reach the backend. Is it running?', 'error');
  } finally {
    setLoading(false);
  }
};

  // Update rescue lifecycle (NGO coordinates travel simulation, assignments, statuses)
  const handleRescueUpdate = async (fields: Partial<RescueCase>, updateNote?: string) => {
    if (!selectedRescue) return;
    try {
      setLoading(true);
      const headers = getHeaders();
      const res = await fetch(`/api/rescues/${selectedRescue.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...fields,
          notes: updateNote || fields.notes || '',
        }),
      });

      if (res.ok) {
        const updatedRescue = await res.json();
        setSelectedRescue(updatedRescue);
        showToast('Rescue lifecycle updated successfully!', 'success');
        loadRescues();
        loadRescueDetails(updatedRescue);
      } else {
        showToast('Failed updating rescue status.', 'error');
      }
    } catch (err) {
      console.error('Error updating rescue:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply to Adopt
  const handleAdoptSubmit = async (rescueId: number, notes: string) => {
    try {
      setLoading(true);
      const headers = getHeaders();
      const res = await fetch('/api/adoptions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ rescueId, notes }),
      });

      if (res.ok) {
        showToast('Adoption application submitted successfully!', 'success');
        loadAdoptions();
        loadRescues();
        if (selectedRescue) {
          loadRescueDetails(selectedRescue);
        }
      } else {
        const errData = await res.json();
        showToast(errData.error || 'Adoption submission failed.', 'error');
      }
    } catch (err) {
      console.error('Adoption failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Manage adoption application status (Approve / Reject)
  const handleAdoptionStatus = async (appId: number, status: 'Approved' | 'Rejected', note?: string) => {
    try {
      setLoading(true);
      const headers = getHeaders();
      const res = await fetch(`/api/adoptions/${appId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status, notes: note || '' }),
      });

      if (res.ok) {
        showToast(`Adoption application successfully ${status}!`, 'success');
        loadAdoptions();
        loadRescues();
        setSelectedRescue(null);
      } else {
        showToast('Failed updating application.', 'error');
      }
    } catch (err) {
      console.error('Error approving/rejecting adoption:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generalize user administrative actions (role, trustScore, suspension updates)
  const handleAdminUserUpdate = async (targetUid: string, fields: { role?: string; trustScore?: number; isSuspended?: boolean }) => {
    try {
      setLoading(true);
      const headers = getHeaders();
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: {
          ...headers,
          'x-simulated-uid': targetUid, // Temporarily elevate target in simulated context
        },
        body: JSON.stringify(fields),
      });

      if (res.ok) {
        showToast(`User settings updated successfully!`, 'success');
        loadUsersList();
        
        // If we just updated ourselves, fetch our live status in the state
        if (targetUid === currentProfile.id) {
          const resMe = await fetch('/api/auth/me', { headers });
          if (resMe.ok) {
            const dataMe = await resMe.json();
            setDbUser(dataMe.dbUser);
          }
        }
      } else {
        showToast('Failed to update user profile parameters.', 'error');
      }
    } catch (err) {
      console.error('User administration update failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Volunteer Drive Real-Time Tracking Simulator
  const startTravelSimulation = () => {
    if (!selectedRescue) return;
    setSimulatingTravel(true);

    // Initial position offset from animal (about 2km northwest of target)
    let curLat = selectedRescue.latitude + 0.015;
    let curLng = selectedRescue.longitude - 0.015;
    setSimulatedVolunteerPos({ lat: curLat, lng: curLng });

    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // Earth radius in meters
      const phi1 = lat1 * Math.PI / 180;
      const phi2 = lat2 * Math.PI / 180;
      const deltaPhi = (lat2 - lat1) * Math.PI / 180;
      const deltaLambda = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // in meters
    };

    setSimulatedDistance(getDistance(curLat, curLng, selectedRescue.latitude, selectedRescue.longitude));

    // Update coordinates in step-by-step dispatch
    const interval = setInterval(async () => {
      curLat = curLat + (selectedRescue.latitude - curLat) * 0.35;
      curLng = curLng + (selectedRescue.longitude - curLng) * 0.35;
      const dist = getDistance(curLat, curLng, selectedRescue.latitude, selectedRescue.longitude);

      setSimulatedVolunteerPos({ lat: curLat, lng: curLng });
      setSimulatedDistance(dist);

      // Call API to update real-time dispatch coordinate tracking in Postgres DB!
      try {
        const headers = getHeaders();
        await fetch(`/api/rescues/${selectedRescue.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            latitude: curLat,
            longitude: curLng,
            status: 'En Route',
            notes: `GPS Coordinate tracking update. Volunteer distance: ${dist.toFixed(0)}m.`,
          }),
        });
      } catch (err) {
        console.error('Real-time coordinates update failed:', err);
      }

      if (dist < 15) {
        clearInterval(interval);
        setSimulatingTravel(false);
        setSimulatedDistance(0);
        showToast('Arrived at rescue coordinate! Secure the animal.', 'success');
        // Reload case details
        loadRescues();
        if (selectedRescue) {
          const detailRes = await fetch(`/api/rescues/${selectedRescue.id}`, { headers: getHeaders() });
          if (detailRes.ok) {
            const upCase = await detailRes.json();
            loadRescueDetails(upCase);
          }
        }
      }
    }, 2500);
  };

  const isPortalUnlocked = ['Rescue coordinator', 'NGO', 'Volunteer'].includes(currentProfile.role) && portalUserEmail === currentProfile.email;

  const filteredRescues = showOnlyMyReports && dbUser
    ? rescues.filter((r) => r.reporterId === dbUser.id)
    : rescues;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800">
      {/* Toast Alert popups */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white font-medium px-6 py-3 rounded-full shadow-xl flex items-center gap-2.5 border border-slate-800"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-display tracking-wide">{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 bg-rose-950 text-rose-200 font-medium px-6 py-3 rounded-full shadow-xl flex items-center gap-2.5 border border-rose-850"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-display tracking-wide">{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-40 shadow-sm px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-rose-600/20 font-bold text-lg font-display">
              🚑
            </div>
            <div>
              <h1 className="text-xl font-extrabold font-display tracking-tight text-slate-900 leading-tight flex items-center gap-1">ResQ-Aid</h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider font-semibold uppercase leading-tight">Kathmandu Valley Pet Rescue Command</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setActiveTab('home')}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'home' ? 'bg-slate-900 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Home 🏠
            </button>
            {isPortalUnlocked && (
              <button
                onClick={() => setActiveTab('rescues')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'rescues' ? 'bg-slate-900 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Staff Portal 🚑
              </button>
            )}
            <button
              onClick={() => { setActiveTab('report'); setSelectedRescue(null); }}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'report' ? 'bg-slate-900 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Report Stray / Injured
            </button>
            <button
              onClick={() => setActiveTab('adoptions')}
              className={`text-xs px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'adoptions' ? 'bg-slate-900 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Adoption Ready
            </button>
            
            {/* Conditional Tabs based on simulated role */}
            {['NGO', 'Rescue coordinator', 'SuperAdmin', 'Admin'].includes(currentProfile.role) && (
              <button
                onClick={() => setActiveTab('applications')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'applications' ? 'bg-slate-900 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Adoptions Hub
              </button>
            )}

            {['SuperAdmin', 'Admin'].includes(currentProfile.role) && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`text-xs px-4 py-2 rounded-lg font-medium transition-all cursor-pointer ${
                  activeTab === 'admin' ? 'bg-slate-900 text-white shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Roles Admin
              </button>
            )}
          </nav>

          {/* Trust Score & Profile Badge */}
          <div className="flex items-center gap-3">
            {dbUser && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-1.5 shadow-sm">
                <Award className="w-4.5 h-4.5 text-amber-500 fill-amber-400/20" />
                <div className="text-left leading-none">
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono">Trust Rating</p>
                  <p className={`text-xs font-black font-mono mt-0.5 ${
                    dbUser.trustScore >= 120 ? 'text-emerald-600' : dbUser.trustScore < 50 ? 'text-rose-600 animate-pulse' : 'text-slate-700'
                  }`}>
                    {dbUser.trustScore} / 200
                  </p>
                </div>
              </div>
            )}

            {/* User Section (Google Authenticator) */}
            {user ? (
              <div className="flex items-center gap-2">
                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-blue-500/20 shadow-sm" />
                <div className="hidden lg:block text-left">
                  <p className="text-[10px] text-slate-400 leading-tight">Logged In</p>
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{user.displayName || user.email}</p>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-semibold uppercase tracking-wider ml-1 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-md shadow-blue-600/10 cursor-pointer"
              >
                <User className="w-4 h-4" />
                <span>Google Sign-In</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Mobile Nav Header */}
      <div className="md:hidden flex items-center justify-around bg-white border-b border-slate-200 py-3 px-2">
        {isPortalUnlocked && (
          <button onClick={() => setActiveTab('rescues')} className={`text-[11px] font-semibold flex flex-col items-center cursor-pointer ${activeTab === 'rescues' ? 'text-blue-600' : 'text-slate-400'}`}>
            <Activity className="w-4 h-4 mb-0.5" />
            Staff Portal
          </button>
        )}
        <button onClick={() => { setActiveTab('report'); setSelectedRescue(null); }} className={`text-[11px] font-semibold flex flex-col items-center cursor-pointer ${activeTab === 'report' ? 'text-blue-600' : 'text-slate-400'}`}>
          <PlusCircle className="w-4 h-4 mb-0.5" />
          Report
        </button>
        <button onClick={() => setActiveTab('adoptions')} className={`text-[11px] font-semibold flex flex-col items-center cursor-pointer ${activeTab === 'adoptions' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Heart className="w-4 h-4 mb-0.5" />
          Adoption
        </button>
        {['NGO', 'Rescue coordinator', 'SuperAdmin', 'Admin'].includes(currentProfile.role) && (
          <button onClick={() => setActiveTab('applications')} className={`text-[11px] font-semibold flex flex-col items-center cursor-pointer ${activeTab === 'applications' ? 'text-blue-600' : 'text-slate-400'}`}>
            <Clipboard className="w-4 h-4 mb-0.5" />
            Adoption Hub
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {dbUser?.isSuspended ? (
        <main className="flex-1 max-w-xl w-full mx-auto p-4 md:p-12 flex flex-col items-center justify-center text-center gap-6">
          <div className="w-20 h-20 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shadow-xl shadow-rose-600/10 border border-rose-200 animate-bounce mt-10">
            <Shield className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold font-display text-slate-900 tracking-tight">Account Suspended</h2>
            <p className="text-sm text-slate-500 font-medium">ResQ-Aid Community Trust & Safety Action</p>
          </div>
          
          <div className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm w-full space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">User ID</span>
              <span className="text-xs font-mono font-bold text-slate-700">{dbUser?.uid}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Simulated Persona</span>
              <span className="text-xs font-bold text-slate-800">{currentProfile.name}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Trust Score</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 flex items-center gap-1 font-mono">0 / 200 (Critical Penalty)</span>
            </div>
            <div className="text-left text-xs bg-rose-50 border border-rose-100/80 rounded-xl p-3.5 text-rose-800 leading-relaxed font-sans">
              <strong>Enforcement Note:</strong> Your account has been automatically suspended for reporting non-existent or malicious animal cases. Fake reports exhaust emergency response capabilities and endanger real animals.
            </div>
          </div>

          <div className="text-xs text-slate-400 max-w-sm leading-relaxed mt-4">
            Please use the <strong>Active Simulation Profile switcher</strong> below to toggle into a <strong>Rescue Coordinator</strong> or <strong>System Admin</strong>. Only authorized staff can lift suspensions or restore user trust ratings.
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
          {activeTab === 'home' ? (
            <div className="w-full flex flex-col gap-10 py-6 md:py-10">
              
              {/* Cinematic high-fiving logo with description below it */}
              <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto space-y-6">
                
                {/* Cute Animated Illustration Container: Rounded Rectangle Header Frame */}
                <div className="relative group select-none">
                  <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-r from-rose-500 to-amber-500 opacity-20 blur-xl group-hover:opacity-30 transition duration-1000 animate-pulse"></div>
                  <div className="relative w-80 h-44 bg-white rounded-3xl border border-slate-100 shadow-xl flex items-center justify-center overflow-hidden">
                    <svg viewBox="0 0 160 100" className="w-full h-full">
                      
                      {/* Background Floor & Decorative Arc */}
                      <path d="M 10 90 Q 80 75 150 90" fill="none" stroke="#F8FAFC" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
                      <path d="M 10 90 Q 80 75 150 90" fill="none" stroke="#F1F5F9" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                      
                      {/* CUTE CAT IN THE MIDDLE BACKGROUND */}
                      <g transform="translate(0, 8)">
                        {/* Cat Ears */}
                        <polygon points="70,55 76,40 81,51" fill="#334155" />
                        <polygon points="68,54 74,42 79,51" fill="#FDA4AF" />
                        
                        <polygon points="90,55 84,40 79,51" fill="#334155" />
                        <polygon points="92,54 86,42 81,51" fill="#FDA4AF" />
                        
                        {/* Cat Head */}
                        <ellipse cx="80" cy="65" rx="16" ry="13" fill="#334155" />
                        
                        {/* Blinking Eyes */}
                        <motion.g
                          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
                          transition={{
                            duration: 3.2,
                            repeat: Infinity,
                            times: [0, 0.85, 0.88, 0.91, 1],
                          }}
                          style={{ transformOrigin: "80px 62px" }}
                        >
                          {/* Left Eye */}
                          <circle cx="74" cy="62" r="2.8" fill="#0F172A" />
                          <circle cx="75" cy="60.8" r="1" fill="#FFFFFF" />
                          {/* Right Eye */}
                          <circle cx="86" cy="62" r="2.8" fill="#0F172A" />
                          <circle cx="87" cy="60.8" r="1" fill="#FFFFFF" />
                        </motion.g>
                        
                        {/* Cheeks */}
                        <circle cx="70" cy="67" r="1.8" fill="#FDA4AF" opacity="0.6" />
                        <circle cx="90" cy="67" r="1.8" fill="#FDA4AF" opacity="0.6" />
                        
                        {/* Nose */}
                        <polygon points="79,65.5 81,65.5 80,67" fill="#F43F5E" />
                        
                        {/* Whiskers */}
                        <line x1="61" y1="64" x2="52" y2="62" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
                        <line x1="61" y1="67" x2="51" y2="68" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
                        <line x1="99" y1="64" x2="108" y2="62" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
                        <line x1="99" y1="67" x2="109" y2="68" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
                        
                        {/* Mouth */}
                        <path d="M 77 68.5 Q 80 70.5 80 68.5 Q 80 70.5 83 68.5" fill="none" stroke="#E2E8F0" strokeWidth="1.2" strokeLinecap="round" />
                      </g>
                      
                      {/* SPARKS / IMPACT BURST */}
                      <motion.g
                        animate={{ 
                          scale: [0, 0, 1.3, 0],
                          opacity: [0, 0, 1, 0]
                        }}
                        transition={{
                          duration: 2.0,
                          repeat: Infinity,
                          times: [0, 0.38, 0.44, 0.6],
                          ease: "easeOut",
                        }}
                        style={{ transformOrigin: "80px 34px" }}
                      >
                        <g transform="translate(80, 34)">
                          <line x1="-12" y1="-12" x2="-3" y2="-3" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="12" y1="-12" x2="3" y2="-3" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="0" y1="-15" x2="0" y2="-5" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                          <line x1="-15" y1="0" x2="-5" y2="0" stroke="#E11D48" strokeWidth="2" strokeLinecap="round" />
                          <line x1="15" y1="0" x2="5" y2="0" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
                          <line x1="-9" y1="9" x2="-2" y2="2" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
                          <line x1="9" y1="9" x2="2" y2="2" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
                          <circle cx="0" cy="0" r="1.5" fill="#F59E0B" />
                        </g>
                      </motion.g>

                      {/* DOG PAW (LEFT SIDE) */}
                      <motion.g
                        animate={{ 
                          x: [0, 15, 16, 0], 
                          y: [0, -8, -8.5, 0],
                          rotate: [0, 12, 12, 0] 
                        }}
                        transition={{
                          duration: 2.0,
                          repeat: Infinity,
                          times: [0, 0.42, 0.52, 1],
                          ease: "easeInOut",
                        }}
                        style={{ transformOrigin: "10px 75px" }}
                      >
                        {/* Dog Arm */}
                        <path d="M -5 75 C 20 70, 45 52, 63 44" fill="none" stroke="#F1F5F9" strokeWidth="13" strokeLinecap="round" />
                        <path d="M -5 75 C 20 70, 45 52, 63 44" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" />
                        {/* Paw Pad (Rose Pink Bean) */}
                        <path d="M 59 44 C 52 44, 49 35, 59 32 C 69 35, 66 44, 59 44 Z" fill="#F43F5E" />
                        {/* Toe Beans */}
                        <circle cx="49" cy="29" r="3" fill="#F43F5E" />
                        <circle cx="59" cy="22" r="3.5" fill="#F43F5E" />
                        <circle cx="69" cy="27" r="3" fill="#F43F5E" />
                      </motion.g>

                      {/* BIRD CLAW (RIGHT SIDE) */}
                      <motion.g
                        animate={{ 
                          x: [0, -15, -16, 0], 
                          y: [0, -8, -8.5, 0],
                          rotate: [0, -12, -12, 0] 
                        }}
                        transition={{
                          duration: 2.0,
                          repeat: Infinity,
                          times: [0, 0.42, 0.52, 1],
                          ease: "easeInOut",
                        }}
                        style={{ transformOrigin: "150px 75px" }}
                      >
                        {/* Bird Arm / Branch-like Yellow Wing Leg */}
                        <path d="M 165 75 C 140 70, 115 52, 97 44" fill="none" stroke="#FEF08A" strokeWidth="9" strokeLinecap="round" />
                        <path d="M 165 75 C 140 70, 115 52, 97 44" fill="none" stroke="#FDE047" strokeWidth="6" strokeLinecap="round" />
                        {/* Cute pointed toes */}
                        <path d="M 97 44 L 85 38" stroke="#CA8A04" strokeWidth="3.2" strokeLinecap="round" />
                        <path d="M 97 44 L 83 47" stroke="#CA8A04" strokeWidth="3.2" strokeLinecap="round" />
                        <path d="M 97 44 L 90 54" stroke="#CA8A04" strokeWidth="3.2" strokeLinecap="round" />
                      </motion.g>

                    </svg>
                  </div>
                </div>

                {/* Typography pairing header */}
                <div className="space-y-3">
                  <h2 className="text-4xl md:text-5xl font-extrabold font-display tracking-tight text-slate-900 leading-none">
                    ResQ-Aid <span className="text-rose-600">Nepal</span>
                  </h2>
                  <p className="text-xs md:text-sm text-slate-400 font-mono font-bold tracking-wider uppercase">
                    Kathmandu Valley Pet Rescue Unified Command
                  </p>
                  <p className="text-sm md:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-sans">
                    Bridging paws, claws, and human hands. ResQ-Aid is Kathmandu's elite rapid-response network connecting civic heroes, animal treatment facilities, and trusted NGOs to rescue, heal, and find forever homes for every stray in the valley.
                  </p>
                </div>

                {/* THE SINGLE CTA BUTTON: "Report a Rescue" */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setActiveTab('report');
                      setSelectedRescue(null);
                    }}
                    className="group relative bg-slate-900 hover:bg-slate-800 text-white px-8 py-4.5 rounded-2xl font-bold tracking-wide shadow-xl hover:shadow-2xl hover:shadow-rose-600/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex items-center gap-3 text-sm md:text-base border border-slate-800"
                  >
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                    <span>Report a Rescue / Incident</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

              </div>

              {/* STATS COUNT GRID SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full pt-4">
                
               

              </div>

              {/* PRETTY PET ILLUSTRATIVE GALLERY SECTION */}
              <div className="space-y-6 pt-4 max-w-5xl mx-auto w-full">
                <div className="text-center">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-widest text-slate-400">ResQ-Aid Success Alumni</h3>
                  <h4 className="text-xl font-bold font-display text-slate-800 mt-1">Meet some of our lovely recovered stars</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {/* Pet 1 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center text-center gap-4 group hover:border-amber-200 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-4xl border border-amber-100 group-hover:rotate-6 transition-transform">
                      🐶
                    </div>
                    <div>
                      <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full">
                        Adoption Alumni
                      </span>
                      <h4 className="font-extrabold text-slate-800 mt-2 font-display">Brave Bruno</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Bruno was found limping near Patan Durbar Square, now fully recovered and living happily with his loving family!
                      </p>
                    </div>
                  </div>

                  {/* Pet 2 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center text-center gap-4 group hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl border border-indigo-100 group-hover:rotate-6 transition-transform">
                      🐱
                    </div>
                    <div>
                      <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                        In Recovery
                      </span>
                      <h4 className="font-extrabold text-slate-800 mt-2 font-display">Whisker Lily</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Lily was rescued from an old drainage pipeline in Thamel. Today she is warm, playful, and waiting for her forever home.
                      </p>
                    </div>
                  </div>

                  {/* Pet 3 */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col items-center text-center gap-4 group hover:border-emerald-200 hover:-translate-y-1 transition-all duration-300">
                    <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl border border-emerald-100 group-hover:rotate-6 transition-transform">
                      🐦
                    </div>
                    <div>
                      <span className="text-[9px] font-bold font-mono uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                        Successfully Released
                      </span>
                      <h4 className="font-extrabold text-slate-800 mt-2 font-display">Chirpy Rio</h4>
                      <p className="text-xs text-slate-500 leading-relaxed mt-1">
                        Rio had a broken wing near Tinkune, now soaring freely after bird-specific rehabilitation at our partner avian medical center.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECURE STAFF PORTAL ACCESS BANNER */}
              {!isPortalUnlocked && (
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-6 md:p-8 max-w-5xl mx-auto w-full mt-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:border-amber-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                      🔑
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 font-display">Are you an Authorized ResQ-Aid staff or volunteer?</h4>
                      <p className="text-xs text-slate-500 mt-1">Access the secure coordinator, NGO, and volunteer dispatch portal to monitor live rescue cases and assign tasks.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('rescues');
                    }}
                    className="text-xs bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Login to Staff Portal</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left column: Major view depending on tab */}
              <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TAB 1: RESCUE CASES DASHBOARD MAP */}
          {activeTab === 'rescues' && (() => {
            const isCollaborated = ['Rescue coordinator', 'NGO', 'Volunteer'].includes(currentProfile.role);
            const isUnlocked = isCollaborated && portalUserEmail === currentProfile.email;

            if (!isUnlocked) {
              return (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 md:p-12 text-center max-w-xl mx-auto my-6 flex flex-col items-center gap-6">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 text-3xl border border-blue-100 shadow-sm">
                    🔒
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-display text-slate-900 mb-2">ResQ-Aid Secure Dispatch Portal</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">
                      The Rescue Cases dispatch map and coordination panel is restricted. It is only accessible to collaborated <strong>Rescue Coordinators</strong>, <strong>NGO Accounts</strong>, and <strong>Volunteers</strong> using credentials provided by the administrators.
                    </p>
                  </div>

                  {/* Secure Portal Login Form */}
                  <div className="w-full border-t border-slate-100 pt-6 text-left">
                    <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                      <span>🔑 Portal Authentication</span>
                    </h3>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handlePortalLogin(portalEmailInput || currentProfile.email, portalPassword);
                    }} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Collaborated Email</label>
                        <input
                          type="email"
                          required
                          value={portalEmailInput || currentProfile.email}
                          onChange={(e) => setPortalEmailInput(e.target.value)}
                          placeholder="name@resqaid.org"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Secure Password</label>
                          <span className="text-[10px] text-blue-600 font-semibold italic">Assigned by Admins</span>
                        </div>
                        <input
                          type="password"
                          required
                          value={portalPassword}
                          onChange={(e) => setPortalPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 font-mono"
                        />
                      </div>

                      {portalLoginError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-medium">
                          {portalLoginError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Authenticate Secure Session</span>
                      </button>
                    </form>
                  </div>

                  {/* Admin-assigned Credentials List for Simulation */}
                  <div className="w-full bg-slate-50 rounded-xl border border-slate-200 p-4 text-left space-y-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">💡</span>
                      <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider font-mono">Admin-Provided Credentials (ResQ-Aid Domain)</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-blue-300 transition-colors">
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>Emma Coordinator</span>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-100">Rescue coordinator</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">coordinator_emma@resqaid.org</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPortalEmailInput('coordinator_emma@resqaid.org');
                            setPortalPassword('EmmaResQ2026!');
                            setPortalLoginError(null);
                          }}
                          className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-2.5 py-1.5 rounded-lg border border-blue-100 self-start sm:self-auto cursor-pointer"
                        >
                          Use Credentials
                        </button>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-blue-300 transition-colors">
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>Animal Nepal NGO</span>
                            <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full border border-emerald-100">NGO</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">ngo_animalnepal@resqaid.org</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPortalEmailInput('ngo_animalnepal@resqaid.org');
                            setPortalPassword('NgoResQ2026!');
                            setPortalLoginError(null);
                          }}
                          className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-100 self-start sm:self-auto cursor-pointer"
                        >
                          Use Credentials
                        </button>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-blue-300 transition-colors">
                        <div>
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <span>Sarah Rescuer</span>
                            <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-100">Volunteer</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">volunteer_sarah@resqaid.org</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setPortalEmailInput('volunteer_sarah@resqaid.org');
                            setPortalPassword('VolunteerResQ2026!');
                            setPortalLoginError(null);
                          }}
                          className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-600 font-semibold px-2.5 py-1.5 rounded-lg border border-purple-100 self-start sm:self-auto cursor-pointer"
                        >
                          Use Credentials
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold font-display text-slate-900">Rescue Coordination Dispatch Map</h2>
                      <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        SECURE PORTAL ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">Real-time coordinates tracking & spatial reports map powered by PostGIS</p>
                  </div>
                  
                  {/* Filters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handlePortalLogout}
                      className="text-xs px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                      title="Lock secure dispatcher session"
                    >
                      <span>🔒 Lock Session</span>
                    </button>

                    {dbUser && (
                      <button
                        onClick={() => setShowOnlyMyReports(!showOnlyMyReports)}
                        className={`text-xs px-3 py-1.5 rounded-xl border flex items-center gap-1.5 font-semibold transition-all cursor-pointer ${
                          showOnlyMyReports
                            ? 'bg-rose-600 border-rose-600 text-white shadow-sm shadow-rose-600/10'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span>{showOnlyMyReports ? '👁️ My Pet Reports Only' : '🔍 Track My Reports'}</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select 
                        value={speciesFilter} 
                        onChange={(e) => setSpeciesFilter(e.target.value)}
                        className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-slate-700 outline-none"
                      >
                        <option value="">All Animals</option>
                        <option value="dog">Dogs 🐶</option>
                        <option value="cat">Cats 🐱</option>
                        <option value="bird">Birds 🐦</option>
                        <option value="other">Other 🐾</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                      <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer font-medium text-slate-700 outline-none"
                      >
                        <option value="">All Statuses</option>
                        <option value="Reported">Reported</option>
                        <option value="Assigned">Assigned to NGO</option>
                        <option value="En Route">Rescuer En Route</option>
                        <option value="Rescued">Rescued Case</option>
                        <option value="In Treatment">In Medical Care</option>
                        <option value="Adoption Ready">Adoption Ready</option>
                        <option value="Adopted">Adopted</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Leaflet Map integration */}
                <div className="w-full h-[400px]">
                  <MapComponent 
                    rescues={filteredRescues}
                    onSelectRescue={loadRescueDetails}
                    selectedRescueId={selectedRescue?.id}
                    volunteerPosition={simulatedVolunteerPos}
                  />
                </div>

                {/* Rescues horizontal scroller */}
                <div>
                  <h3 className="text-xs font-bold font-mono tracking-wider text-slate-400 uppercase mb-3">Rescue Incidents Grid ({filteredRescues.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRescues.length === 0 ? (
                      <div className="col-span-2 text-center py-8 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        No rescue reports match the selected filters.
                      </div>
                    ) : (
                      filteredRescues.map((rescue) => {
                        const severityColors = rescue.injurySeverity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : rescue.injurySeverity === 'Moderate' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        return (
                          <div
                            key={rescue.id}
                            onClick={() => loadRescueDetails(rescue)}
                            className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedRescue?.id === rescue.id 
                                ? 'bg-blue-50/50 border-blue-300 shadow-sm ring-1 ring-blue-100' 
                                : 'bg-white hover:bg-slate-50/50 border-slate-150'
                            }`}
                          >
                            {rescue.imageUrl ? (
                              <img src={rescue.imageUrl} alt="Rescue" className="w-16 h-16 object-cover rounded-lg shadow-sm border border-slate-100 flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 border border-slate-200">
                                {rescue.species === 'dog' ? '🐶' : rescue.species === 'cat' ? '🐱' : rescue.species === 'bird' ? '🐦' : '🐾'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityColors}`}>
                                  {rescue.injurySeverity}
                                </span>
                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-100">
                                  {rescue.status}
                                </span>
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm truncate">{rescue.title}</h4>
                              <p className="text-xs text-slate-400 flex items-center gap-1 truncate mt-0.5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{rescue.address || 'Unknown coordinates'}</span>
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            );
          })()}

          {/* TAB 2: CITIZEN PORTAL REPORT FORM */}
          {activeTab === 'report' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6">
              {!user ? (
                /* STEP 1: REGISTRATION & GPS VERIFICATION */
                <div className="space-y-6">
                  <div className="text-center max-w-md mx-auto space-y-2 pb-4">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-2xl mx-auto shadow-sm border border-blue-100">
                      🔐
                    </div>
                    <h2 className="text-xl font-bold font-display text-slate-900">Reporter Security Verification</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      To safeguard the coordination network from malicious alerts, citizens must verify their email and register physical coordinates via device GPS.
                    </p>
                  </div>

                  {/* Dual Mode Switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-xs mx-auto mb-6">
                    <button
                      type="button"
                      onClick={() => setIsSigningUp(true)}
                      className={`text-xs px-4 py-2 rounded-lg font-semibold flex-1 transition-all cursor-pointer ${
                        isSigningUp ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Sign Up with Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSigningUp(false)}
                      className={`text-xs px-4 py-2 rounded-lg font-semibold flex-1 transition-all cursor-pointer ${
                        !isSigningUp ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Log In
                    </button>
                  </div>

                  {isSigningUp ? (
                    <form onSubmit={handleCustomEmailSignUp} className="max-w-md mx-auto space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1.5">Full Name</label>
                        <input
                          type="text"
                          required
                          value={customUserName}
                          onChange={(e) => setCustomUserName(e.target.value)}
                          placeholder="Your official full name"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1.5">Email Address</label>
                        <input
                          type="email"
                          required
                          value={customUserEmail}
                          onChange={(e) => setCustomUserEmail(e.target.value)}
                          placeholder="yourname@domain.com"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1.5">Secure Password</label>
                        <input
                          type="password"
                          required
                          value={customUserPassword}
                          onChange={(e) => setCustomUserPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700">GPS-Verified Home Location</h4>
                            <p className="text-[10px] text-slate-500">Your reporting origin will be bounded and verified by your device GPS.</p>
                          </div>
                          <button
                            type="button"
                            disabled={gpsVerifying}
                            onClick={handleGPSVerifyForSignup}
                            className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 flex-shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            <Navigation className="w-3 h-3 text-white" />
                            <span>{gpsVerifying ? 'Verifying...' : 'Verify Device GPS'}</span>
                          </button>
                        </div>

                        {gpsVerified ? (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-[11px] text-emerald-800 space-y-1">
                            <p className="font-bold flex items-center gap-1 text-emerald-700">
                              <span>✓ Geolocation Match Complete</span>
                            </p>
                            <p className="font-mono text-[10px] text-emerald-600">
                              Lat: {customUserCoords?.lat.toFixed(5)}, Lng: {customUserCoords?.lng.toFixed(5)} (Kathmandu Valley Boundary Approved)
                            </p>
                            <p className="text-emerald-700 italic">
                              Verified Address: {customUserAddress}
                            </p>
                          </div>
                        ) : (
                          <div className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-[11px] text-rose-800">
                            <strong>Location Status:</strong> Address coordinates are not yet verified. Please tap "Verify Device GPS" to confirm residency inside Kathmandu Valley.
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        className="w-full text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all"
                      >
                        Create Account & Dispatch Verification Link
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCustomEmailLogin} className="max-w-md mx-auto space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1.5">Email Address</label>
                        <input
                          type="email"
                          required
                          value={customUserEmail}
                          onChange={(e) => setCustomUserEmail(e.target.value)}
                          placeholder="yourname@domain.com"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase font-mono tracking-wider mb-1.5">Password</label>
                        <input
                          type="password"
                          required
                          value={customUserPassword}
                          onChange={(e) => setCustomUserPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md cursor-pointer transition-all"
                      >
                        Log In to Platform
                      </button>
                    </form>
                  )}
                </div>
              ) : !isEmailVerified ? (
                /* STEP 2: SIMULATED EMAIL VERIFICATION */
                <div className="max-w-md mx-auto text-center space-y-5 py-6">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl mx-auto border border-blue-100 shadow-sm animate-pulse">
                    ✉
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold font-display text-slate-900">Email Verification Sent</h2>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      We dispatched a secure authentication loop to <strong className="text-slate-800">{user.email}</strong>. Please confirm verification to register and prevent malicious coordination alerts.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-left space-y-2">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Simulated Email Inbox</h4>
                    <p className="text-[11px] text-slate-600">
                      In production, the citizen taps the link delivered to their registered email. For simulation evaluation, you can activate the verified state immediately below:
                    </p>
                    <button
                      type="button"
                      onClick={simulateEmailVerificationLink}
                      className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-white" />
                      <span>Simulate Verification Link Click</span>
                    </button>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Need to modify coordinates or profile? Click on the <strong>Active Simulation Profile switcher</strong> below.
                  </div>
                </div>
              ) : (
                /* STEP 3: EXISITING REPORT FORM */
                <>
                  <div className="border-b border-slate-100 pb-4 mb-6">
                    <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                      <PlusCircle className="w-6 h-6 text-blue-600" />
                      Report a Homeless, Stray, or Injured Pet
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Submit visual reports, detailed location coordinates, and auto-analyze with Gemini Smart AI assist.</p>
                  </div>

                  <form onSubmit={handleReportSubmit} className="space-y-6">
                    
                    {/* Visual Image uploader */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                      <h3 className="text-xs font-bold text-slate-700 uppercase mb-3 font-mono tracking-wider">Upload Incident Image</h3>
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                        
                        {/* Drag and Drop box */}
                        <div className="flex-1 w-full">
                          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <PlusCircle className="w-8 h-8 text-slate-400 mb-2" />
                              <p className="text-xs text-slate-500"><span className="font-semibold text-blue-600">Click to upload</span> or drag and drop</p>
                              <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or JPEG up to 10MB</p>
                            </div>
                            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                          </label>
                        </div>

                        {/* Image preview & AI scan trigger */}
                        {reportImageBase64 ? (
                          <div className="relative w-44 h-36 rounded-xl overflow-hidden border border-slate-200 shadow-sm group">
                            <img src={reportImageBase64} alt="Incident Upload" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setReportImageBase64(null)}
                              className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            
                            <button
                              type="button"
                              disabled={scanningAI}
                              onClick={handleAIScan}
                              className="absolute bottom-2 left-2 right-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] py-1.5 px-2 rounded-lg shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {scanningAI ? (
                                <>
                                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                  <span>AI Analyzing...</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Gemini AI Scan</span>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="w-44 h-36 bg-slate-100 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                            No image uploaded
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2 font-mono tracking-wider">Species Type</label>
                        <select
                          value={reportSpecies}
                          onChange={(e) => setReportSpecies(e.target.value as any)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 font-medium text-slate-700"
                        >
                          <option value="dog">Dog 🐶</option>
                          <option value="cat">Cat 🐱</option>
                          <option value="bird">Bird 🐦</option>
                          <option value="other">Other Stray 🐾</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2 font-mono tracking-wider">Visible Injury Severity</label>
                        <select
                          value={reportSeverity}
                          onChange={(e) => setReportSeverity(e.target.value as any)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 font-medium text-slate-700"
                        >
                          <option value="Minor">Minor (Scratches / Malnourished)</option>
                          <option value="Moderate">Moderate (Limping / Small cuts)</option>
                          <option value="Critical">Critical (Severe wounds / Trapped / Bleeding)</option>
                          <option value="Unknown">Unknown Urgency</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2 font-mono tracking-wider">Report Summary Title</label>
                      <input
                        type="text"
                        value={reportTitle}
                        onChange={(e) => setReportTitle(e.target.value)}
                        placeholder="Provide a concise title (e.g. Stray limping dog near block 42)"
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2 font-mono tracking-wider">Description & Situation Details</label>
                      <textarea
                        rows={4}
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        placeholder="Describe what happened, any visible injuries, behavior, and landmarks that can help rescuers locate the pet."
                        className="w-full text-xs bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                      />
                    </div>

                    {/* Spatial Coordinate Map Picker */}
                    <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">Set Incident Coordinates</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Click directly on the interactive map to register coordinates, or use device GPS.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleFetchCurrentLocation}
                          className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-2.5 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Navigation className="w-3 h-3 text-blue-500" />
                          <span>Device GPS Location</span>
                        </button>
                      </div>
                      
                      <div className="w-full h-[220px] mb-3">
                        <MapComponent 
                          rescues={[]}
                          interactive={true}
                          onLocationSelect={(lat, lng, addr) => {
                            setReportLatitude(lat);
                            setReportLongitude(lng);
                            if (addr) setReportAddress(addr);
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Latitude</label>
                          <input
                            type="number"
                            step="any"
                            value={reportLatitude}
                            onChange={(e) => setReportLatitude(parseFloat(e.target.value))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Longitude</label>
                          <input
                            type="number"
                            step="any"
                            value={reportLongitude}
                            onChange={(e) => setReportLongitude(parseFloat(e.target.value))}
                            className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Estimated Address Location</label>
                        <input
                          type="text"
                          value={reportAddress}
                          onChange={(e) => setReportAddress(e.target.value)}
                          placeholder="Address parsed automatically or type landmark details"
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 mt-1"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setActiveTab('rescues')}
                        className="text-xs bg-white hover:bg-slate-50 text-slate-600 px-5 py-2.5 rounded-xl font-medium border border-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-600/10 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Submit Rescue Incident</span>
                          </>
                        )}
                      </button>
                    </div>

                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB 3: ADOPTION CENTER (Ready for adoption list) */}
          {activeTab === 'adoptions' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6 flex flex-col gap-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold font-display text-slate-900 flex items-center gap-2">
                  <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" />
                  Pet Adoption Center
                </h2>
                <p className="text-xs text-slate-500 mt-1">Adopt stray animals successfully rescued and declared healthy by coordinating NGOs.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {rescues.filter(r => r.status === 'Adoption Ready' || r.status === 'Adopted').length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    There are no rescued pets currently ready for adoption. Check back soon!
                  </div>
                ) : (
                  rescues.filter(r => r.status === 'Adoption Ready' || r.status === 'Adopted').map((pet) => {
                    const isAdopted = pet.status === 'Adopted';
                    return (
                      <div key={pet.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm flex flex-col group">
                        <div className="relative h-44 bg-slate-100">
                          {pet.imageUrl ? (
                            <img src={pet.imageUrl} alt={pet.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              {pet.species === 'dog' ? '🐶' : pet.species === 'cat' ? '🐱' : pet.species === 'bird' ? '🐦' : '🐾'}
                            </div>
                          )}
                          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md text-[10px] font-bold text-blue-600 px-2.5 py-1 rounded-full shadow-sm border border-blue-500/10">
                            {pet.species.toUpperCase()}
                          </div>
                          {isAdopted && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-extrabold font-display text-lg tracking-widest uppercase">
                              🎉 Adopted!
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col gap-2">
                          <h3 className="font-bold text-slate-900 text-base leading-snug font-display">{pet.title}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{pet.description}</p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 leading-snug">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{pet.address || 'Unknown coordinates'}</span>
                          </p>

                          {!isAdopted && (
                            <div className="pt-3 border-t border-slate-100 flex justify-end">
                              <button
                                onClick={() => loadRescueDetails(pet)}
                                className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-lg shadow-md shadow-rose-500/10 cursor-pointer flex items-center gap-1.5"
                              >
                                <Heart className="w-3.5 h-3.5" />
                                <span>Apply to Adopt</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 4: ADOPTIONS APPLICATIONS HUB */}
          {activeTab === 'applications' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-xl font-bold font-display text-slate-900">NGO Adoption Applications Board</h2>
                <p className="text-xs text-slate-500">Manage, review and approve adoption proposals filed by citizens</p>
              </div>

              <div className="space-y-4">
                {adoptionsList.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No adoption applications have been filed yet.
                  </div>
                ) : (
                  adoptionsList.map((app) => {
                    const isPending = app.status === 'Pending';
                    return (
                      <div key={app.id} className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-start justify-between gap-4 shadow-sm">
                        
                        <div className="flex gap-4">
                          {app.petImageUrl ? (
                            <img src={app.petImageUrl} alt="Pet" className="w-16 h-16 object-cover rounded-lg border border-slate-100" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 border border-slate-200">
                              🐾
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-200">
                                {app.petSpecies.toUpperCase()}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                app.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : app.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                {app.status}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-900 text-sm font-display">Adoption Proposal for: {app.petTitle}</h3>
                            <p className="text-xs text-slate-500 mt-1">Applicant: <strong>{app.applicantName || 'Anonymous'}</strong> ({app.applicantEmail})</p>
                            
                            {(app.applicantAddress || app.preferredSpecies || app.applicantPhone || app.experience) && (
                              <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-[11px] text-slate-600 font-sans">
                                {app.applicantAddress && (
                                  <div className="flex items-center gap-1"><strong>Address:</strong> {app.applicantAddress}</div>
                                )}
                                {app.preferredSpecies && (
                                  <div className="flex items-center gap-1"><strong>Preferred Breed:</strong> {app.preferredSpecies}</div>
                                )}
                                {app.applicantPhone && (
                                  <div className="flex items-center gap-1"><strong>Phone:</strong> {app.applicantPhone}</div>
                                )}
                                {app.experience && (
                                  <div className="flex items-center gap-1"><strong>Experience:</strong> {app.experience}</div>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 mt-2 italic">
                              "{app.notes || 'No notes provided by applicant'}"
                            </p>
                          </div>
                        </div>

                        {isPending && (
                          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto justify-end">
                            <button
                              onClick={() => handleAdoptionStatus(app.id, 'Rejected')}
                              className="text-xs bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 font-semibold py-2 px-3 rounded-lg cursor-pointer"
                            >
                              Reject Application
                            </button>
                            <button
                              onClick={() => handleAdoptionStatus(app.id, 'Approved')}
                              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-md shadow-emerald-600/10 cursor-pointer"
                            >
                              Approve Adoption 🎉
                            </button>
                          </div>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 5: ROLES & ANALYTICS CENTER */}
          {activeTab === 'admin' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-6 flex flex-col gap-5">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold font-display text-slate-900">Platform Command Center</h2>
                  <p className="text-xs text-slate-500">
                    Spatially-enabled analytics & role privilege directory
                  </p>
                </div>
                
                {/* Dual Sub-Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start md:self-auto">
                  <button
                    onClick={() => setAdminSubTab('analytics')}
                    className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                      adminSubTab === 'analytics'
                        ? 'bg-white text-slate-950 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📊 Performance Analytics
                  </button>
                  <button
                    onClick={() => setAdminSubTab('roles')}
                    className={`text-xs px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                      adminSubTab === 'roles'
                        ? 'bg-white text-slate-950 shadow-sm font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    🔑 Roles & Privileges
                  </button>
                </div>
              </div>

              {/* VIEW 1: PERFORMANCE ANALYTICS */}
              {adminSubTab === 'analytics' && (
                <div className="flex flex-col gap-6">
                  
                  {/* System Overview KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-center gap-3.5">
                      <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-600">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Avg Rescue Time</p>
                        <p className="text-lg font-extrabold text-blue-900">{analyticsData?.avgRescueTime || 4.2} hours</p>
                      </div>
                    </div>

                    <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 flex items-center gap-3.5">
                      <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-600">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Total Reports</p>
                        <p className="text-lg font-extrabold text-emerald-900">{analyticsData?.systemMetrics?.totalReports || 90} cases</p>
                      </div>
                    </div>

                    <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 flex items-center gap-3.5">
                      <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-600">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Active NGOs</p>
                        <p className="text-lg font-extrabold text-amber-900">{analyticsData?.systemMetrics?.activeNGOs || 3} verified</p>
                      </div>
                    </div>

                    <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-100 flex items-center gap-3.5">
                      <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-600">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-semibold">Engine Schema</p>
                        <p className="text-[11px] font-extrabold text-purple-900 truncate leading-snug">PostgreSQL / PostGIS</p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions Policy Summary Panel */}
                  <div className="bg-slate-50/50 rounded-xl border border-slate-100 p-4">
                    <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5 font-display">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span>Role-Based Access Control (RBAC) Permissions & RLS Policies</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-600">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">👑 Super Admin</p>
                        <p className="text-[10px] text-slate-500 mt-1">Manage Admins, approve NGO accounts, modify global system variables, and view system-wide rescue analytics.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">🛡️ Admin</p>
                        <p className="text-[10px] text-slate-500 mt-1">Perform database operations, moderate AI models/services, audit live system logs, and handle critical security issues.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">💼 Coordinator</p>
                        <p className="text-[10px] text-slate-500 mt-1">View all incidents, verify reports, dispatch NGO shelters, assign volunteers, and log step-by-step progress updates.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">🏢 NGO Shelter</p>
                        <p className="text-[10px] text-slate-500 mt-1"> Kathmandu Animal Treatment, Animal Nepal, etc. Accept rescue cases, coordinate rescue teams, manage adoptions.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">🚑 Volunteer</p>
                        <p className="text-[10px] text-slate-500 mt-1">View assigned cases, accept dispatch route tasks, update location, upload proof photos, and submit updates.</p>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border border-slate-100 shadow-sm">
                        <p className="font-bold text-slate-900 flex items-center gap-1">👤 Citizen Reporter</p>
                        <p className="text-[10px] text-slate-500 mt-1">Submit visual animal reports, track own report status (pending, in-progress, resolved) and get notified of updates.</p>
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* CHART 1: MONTHLY TRENDS */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                            <span>Monthly Rescue Trends</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Chronological volume of reported animal cases</p>
                        </div>
                      </div>
                      <div className="h-[210px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analyticsData?.monthlyTrends || []}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={9} />
                            <YAxis stroke="#94a3b8" fontSize={9} />
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="count" name="Report Count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CHART 2: SPECIES DISTRIBUTION */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5 text-pink-500" />
                            <span>Animal Species Distribution</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Sourced breakdown of reported stray animals</p>
                        </div>
                      </div>
                      <div className="h-[210px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analyticsData?.speciesTrends || []}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              fill="#8884d8"
                              paddingAngle={4}
                              dataKey="count"
                              nameKey="species"
                            >
                              {(analyticsData?.speciesTrends || []).map((entry: any, index: number) => {
                                const COLORS = ['#3b82f6', '#ec4899', '#f59e0b', '#10b981'];
                                return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                              })}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                            <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: '10px' }} formatter={(value) => value.toUpperCase()} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CHART 3: MOST REPORTED AREAS */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span>Most Reported Districts (Kathmandu)</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Incident hot-spots tracked via GPS address clusters</p>
                        </div>
                      </div>
                      <div className="h-[210px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData?.areaTrends || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={9} />
                            <YAxis dataKey="address" type="category" stroke="#94a3b8" fontSize={9} width={100} tickFormatter={(val) => val.split(',')[0]} />
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                            <Bar dataKey="count" name="Cases Reported" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* CHART 4: NGO PERFORMANCE */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1">
                            <Building className="w-3.5 h-3.5 text-emerald-500" />
                            <span>NGO Performance Leaderboard</span>
                          </h3>
                          <p className="text-[10px] text-slate-400">Comparison of cases assigned vs successfully rescued</p>
                        </div>
                      </div>
                      <div className="h-[210px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analyticsData?.ngoPerformance || []}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" />
                            <XAxis dataKey="ngoName" stroke="#94a3b8" fontSize={8} tickFormatter={(val) => val.split(' ')[0]} />
                            <YAxis stroke="#94a3b8" fontSize={9} />
                            <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                            <Legend verticalAlign="top" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingBottom: '10px' }} />
                            <Bar dataKey="totalAssigned" name="Assigned Cases" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="completed" name="Completed Rescues" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>

                  {/* VOLUNTEER CONTRIBUTION TABLE */}
                  <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-mono flex items-center gap-1">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span>Volunteer Contribution & Rescue Leaders</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">Total cases managed & completed by volunteer responders</p>
                      </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-bold bg-slate-50/50">
                            <th className="p-2.5">Volunteer Responder</th>
                            <th className="p-2.5 text-center">Assigned Tasks</th>
                            <th className="p-2.5 text-center">Successful Rescues</th>
                            <th className="p-2.5">Progress Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(analyticsData?.volunteerContribution || []).map((vol: any, i: number) => {
                            const percent = vol.totalHandled > 0 ? Math.round((vol.rescued / vol.totalHandled) * 100) : 0;
                            return (
                              <tr key={i} className="hover:bg-slate-50/50">
                                <td className="p-2.5 font-semibold text-slate-800">{vol.volunteerName}</td>
                                <td className="p-2.5 text-center font-mono text-slate-600">{vol.totalHandled}</td>
                                <td className="p-2.5 text-center font-mono text-emerald-600 font-bold">{vol.rescued}</td>
                                <td className="p-2.5">
                                  <div className="flex items-center gap-2 max-w-[150px]">
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                      <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-slate-500">{percent}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 2: ROLES MANAGEMENT DIRECTORY */}
              {adminSubTab === 'roles' && (
                <div className="flex flex-col gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2 text-xs text-slate-600 mb-2">
                    <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-800">Privilege & Delegation Administration</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Assign user-profiles to direct roles. Changes apply instantly, modifying row-level security (RLS) constraints for databases under your platform scope.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-400">
                          <th className="p-3">User Profile</th>
                          <th className="p-3">Current Role & NGO</th>
                          <th className="p-3">Trust Score Rating</th>
                          <th className="p-3 text-center">Enforcement Status</th>
                          <th className="p-3 text-right">Configure Controls</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allUsers.map((usr) => (
                          <tr key={usr.id} className="hover:bg-slate-50/30">
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{usr.name || 'Anonymous User'}</p>
                              <p className="text-[10px] text-slate-400 font-mono">{usr.uid}</p>
                              <p className="text-[10px] text-slate-500">{usr.email}</p>
                            </td>
                            <td className="p-3">
                              <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                                usr.role === 'SuperAdmin' ? 'bg-rose-50 text-rose-700 border-rose-200' : usr.role === 'Rescue coordinator' ? 'bg-blue-50 text-blue-700 border-blue-200' : usr.role === 'NGO' ? 'bg-teal-50 text-teal-700 border-teal-200' : usr.role === 'Volunteer' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}>
                                {usr.role}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-1">{usr.organization || 'No NGO Bound'}</p>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-col gap-1.5">
                                <span className={`font-mono font-bold text-sm ${
                                  usr.trustScore >= 120 ? 'text-emerald-600' : usr.trustScore < 50 ? 'text-rose-600 font-extrabold' : 'text-slate-700'
                                }`}>
                                  {usr.trustScore ?? 100} / 200
                                </span>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleAdminUserUpdate(usr.uid, { trustScore: Math.max(0, (usr.trustScore ?? 100) - 25) })}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-rose-600 border border-slate-200 rounded text-[9px] font-mono font-bold cursor-pointer"
                                    title="Apply -25 Trust Penalty"
                                  >
                                    -25
                                  </button>
                                  <button
                                    onClick={() => handleAdminUserUpdate(usr.uid, { trustScore: Math.min(200, (usr.trustScore ?? 100) + 25) })}
                                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-emerald-600 border border-slate-200 rounded text-[9px] font-mono font-bold cursor-pointer"
                                    title="Award +25 Trust Bonus"
                                  >
                                    +25
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {usr.isSuspended ? (
                                <span className="bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded-md text-[10px] border border-rose-200 animate-pulse inline-flex items-center gap-1">
                                  🚫 Suspended
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-1 rounded-md text-[10px] border border-emerald-200 inline-flex items-center gap-1">
                                  ✓ Active
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex flex-col items-end gap-1.5">
                                <select
                                  value={usr.role}
                                  onChange={(e) => handleAdminUserUpdate(usr.uid, { role: e.target.value })}
                                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 cursor-pointer font-medium text-slate-700 text-[10px] outline-none"
                                >
                                  <option value="Citizen">Citizen Reporter</option>
                                  <option value="Volunteer">Volunteer Rescuer</option>
                                  <option value="NGO">NGO Shell Account</option>
                                  <option value="Rescue coordinator">Rescue Coordinator</option>
                                  <option value="Admin">Moderator Admin</option>
                                  <option value="SuperAdmin">Super Admin</option>
                                </select>
                                
                                <button
                                  onClick={() => handleAdminUserUpdate(usr.uid, { 
                                    isSuspended: !usr.isSuspended, 
                                    // If suspending, penalize trust score to 0; if restoring, reset to 100
                                    trustScore: !usr.isSuspended ? 0 : 100 
                                  })}
                                  className={`text-[9px] font-bold px-2.5 py-1 rounded border transition-all cursor-pointer ${
                                    usr.isSuspended 
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' 
                                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                                  }`}
                                >
                                  {usr.isSuspended ? '✓ Restore Account' : '🚫 Suspend User'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Right column: Active Context Panel (Rescue detailed review / Actions) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Active Context: Case Details */}
          {selectedRescue ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 md:p-5 flex flex-col gap-4">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-full border border-blue-100 uppercase">
                      {selectedRescue.species}
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200 uppercase">
                      {selectedRescue.injurySeverity} Severity
                    </span>
                  </div>
                  <h3 className="font-extrabold font-display text-slate-900 text-base leading-snug">{selectedRescue.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">CASE ID: #{selectedRescue.id}</p>
                </div>
                <button
                  onClick={() => setSelectedRescue(null)}
                  className="text-slate-400 hover:text-slate-600 font-semibold cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>

              {/* Photo */}
              {selectedRescue.imageUrl && (
                <div className="h-44 w-full rounded-xl overflow-hidden border border-slate-100">
                  <img src={selectedRescue.imageUrl} alt="Rescue Detail" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-1">Reporter Incident Details</h4>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100 font-sans">
                  {selectedRescue.description}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-2 leading-snug">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{selectedRescue.address || 'GPS Coordinates logged.'}</span>
                </p>
              </div>

              {/* Lifecycles & Active Operations Dispatchers */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-2">Workflow Dispatch Center</h4>
                
                {/* Active Assignees Info */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col gap-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-500" />
                    <span>NGO Assigned: <strong>{selectedRescue.ngoId ? (selectedRescue.ngoId === 2 ? "Happy Paws NGO" : "Safe Haven Birds") : "None yet"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-500" />
                    <span>Volunteer Sent: <strong>{selectedRescue.volunteerId ? "Sarah Volunteer / Ambulance" : "None yet"}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <span>Operation Status: <strong className="text-blue-600 uppercase">{selectedRescue.status}</strong></span>
                  </div>
                </div>

                {/* COORDINATOR CONTROLS */}
                {currentProfile.role === 'Rescue coordinator' && selectedRescue.status === 'Reported' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-blue-600 uppercase font-mono tracking-wider">Coordinator Assign NGO</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRescueUpdate({ ngoId: 2, status: 'Assigned', coordinatorId: 101 }, 'Assigned case to Happy Paws NGO')}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded-lg flex-1 cursor-pointer"
                      >
                        Send to Happy Paws NGO
                      </button>
                      <button
                        onClick={() => handleRescueUpdate({ ngoId: 3, status: 'Assigned', coordinatorId: 101 }, 'Assigned case to Safe Haven Birds')}
                        className="text-xs bg-slate-700 hover:bg-slate-800 text-white font-semibold py-2 px-3 rounded-lg flex-1 cursor-pointer"
                      >
                        Send to Safe Haven
                      </button>
                    </div>
                  </div>
                )}

                {/* NGO CONTROLS */}
                {currentProfile.role === 'NGO' && selectedRescue.status === 'Assigned' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-teal-600 uppercase font-mono tracking-wider">NGO Dispatch Volunteer</p>
                    <button
                      onClick={() => handleRescueUpdate({ volunteerId: 4, status: 'En Route' }, 'Dispatched active volunteer Sarah to rescue coordinates.')}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Dispatch Sarah (Volunteer)</span>
                    </button>
                  </div>
                )}

                {/* VOLUNTEER GPS NAVIGATION CONTROLS */}
                {currentProfile.role === 'Volunteer' && selectedRescue.status === 'En Route' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold font-mono text-blue-300 uppercase tracking-wider flex items-center gap-1">
                          <Navigation className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                          Live GPS Connection
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-400">Ambulance Active</span>
                      </div>
                      
                      {simulatedDistance !== null ? (
                        <div>
                          <p className="text-[10px] text-slate-400">Current distance to rescue:</p>
                          <p className="text-xl font-extrabold font-display text-white">
                            {simulatedDistance > 15 ? `${(simulatedDistance / 1000).toFixed(2)} km` : "Arrived! 0m"}
                          </p>
                          {simulatedDistance > 15 && (
                            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-1.5">
                              <div className="bg-blue-500 h-full animate-pulse" style={{ width: `${Math.max(5, 100 - (simulatedDistance / 20))}2%` }}></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Satellite GPS waiting to trigger simulation driving coordinates.</p>
                      )}

                      {!simulatingTravel && simulatedDistance !== 0 && (
                        <button
                          onClick={startTravelSimulation}
                          className="w-full text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 mt-1 cursor-pointer transition-all"
                        >
                          <Truck className="w-4 h-4" />
                          <span>Simulate Travel Coordinates</span>
                        </button>
                      )}

                      {simulatingTravel && (
                        <div className="flex items-center justify-center gap-2 py-1.5 text-xs text-slate-300 font-medium">
                          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Driving ambulance to target...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* NGO / VOLUNTEER POST-ARRIVAL CONTROLS */}
                {['NGO', 'Volunteer'].includes(currentProfile.role) && selectedRescue.status === 'En Route' && simulatedDistance === 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-teal-600 uppercase font-mono tracking-wider">Post-Arrival Coordination</p>
                    <button
                      onClick={() => handleRescueUpdate({ status: 'Rescued' }, 'Animal secured. Transferring safely to local medical center.')}
                      className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer"
                    >
                      Mark as Successfully Rescued!
                    </button>
                  </div>
                )}

                {/* NGO MEDICAL TREATMENT CONTROLS */}
                {currentProfile.role === 'NGO' && selectedRescue.status === 'Rescued' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-teal-600 uppercase font-mono tracking-wider">Treatment Dispatch</p>
                    <button
                      onClick={() => handleRescueUpdate({ status: 'In Treatment' }, 'Animal checked by vet. Undergoing medical treatment.')}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer"
                    >
                      Move to Vet Treatment Care
                    </button>
                  </div>
                )}

                {/* NGO READINESS CONTROLS */}
                {currentProfile.role === 'NGO' && selectedRescue.status === 'In Treatment' && (
                  <div className="mt-3 flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-teal-600 uppercase font-mono tracking-wider">Adoption Readiness</p>
                    <button
                      onClick={() => handleRescueUpdate({ status: 'Adoption Ready' }, 'Animal recovered fully, groomed and available for adoption.')}
                      className="text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 px-4 rounded-lg cursor-pointer"
                    >
                      Declare Adoption Ready! 💖
                    </button>
                  </div>
                )}

                {/* CITIZEN ADOPTION APPLICATION SUBMIT */}
                {currentProfile.role === 'Citizen' && selectedRescue.status === 'Adoption Ready' && (
                  <div className="mt-3 flex flex-col gap-2 bg-rose-50/50 p-3.5 border border-rose-100 rounded-xl">
                    <h5 className="text-xs font-bold text-rose-700 flex items-center gap-1">
                      <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                      Apply for Adoption
                    </h5>
                    <p className="text-[10px] text-slate-500">Provide shelter details or a brief note explaining why you would make a great family for this rescued pet.</p>
                    
                    <textarea
                      rows={2}
                      id="adoption-notes"
                      placeholder="e.g. I live in a large house with a garden, and have 3 years dog care experience..."
                      className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 mt-1 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    
                    <button
                      onClick={() => {
                        const notesVal = (document.getElementById('adoption-notes') as HTMLTextAreaElement)?.value || '';
                        handleAdoptSubmit(selectedRescue.id, notesVal);
                      }}
                      className="w-full text-xs bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 rounded-lg mt-1 cursor-pointer animate-pulse-slow"
                    >
                      Submit Adoption Request
                    </button>
                  </div>
                )}

              </div>

              {/* Log Trail */}
              <div className="border-t border-slate-100 pt-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider mb-2">Rescue Operations Logs ({logs.length})</h4>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="text-[10px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-blue-600">{log.status}</span>
                        <span className="text-[9px] text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-600 leading-normal">{log.note}</p>
                      <p className="text-[9px] text-slate-400 mt-1">Logged by: <strong>{log.userName || log.userEmail}</strong> ({log.userRole})</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-3 py-16">
              <Clipboard className="w-10 h-10 text-slate-300 animate-pulse-slow" />
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Select Incident Case</h3>
                <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-0.5">Click any marker or incident card on the map dashboard to coordinate or review.</p>
              </div>
            </div>
          )}

          {/* Quick Info Box: Database status */}
          <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 shadow-md">
            <h4 className="text-[10px] font-bold text-blue-300 uppercase tracking-widest font-mono mb-2">Cloud Infrastructure Status</h4>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">Spatial DB:</span>
                <span className="text-emerald-400 font-semibold">Active Mode</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">PostgreSQL Engine:</span>
                <span className="text-emerald-400 font-semibold">PostgreSQL 15</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">PostGIS Extension:</span>
                <span className="text-emerald-400 font-semibold">Enabled (v3.3)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gemini AI Model:</span>
                <span className="text-blue-300 font-semibold">gemini-3.5-flash</span>
              </div>
            </div>
          </div>

        </div>
        </div>
        )}
      </main>
      )}

      {/* Role Switcher Simulator Sticky Footer */}
      <RoleSimulator currentProfile={currentProfile} onChangeProfile={handleProfileChange} />

    </div>
  );
}
