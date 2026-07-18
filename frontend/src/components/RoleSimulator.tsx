import React from 'react';

export interface SimProfile {
  id: string;
  name: string;
  role: 'Citizen' | 'Volunteer' | 'NGO' | 'Rescue coordinator' | 'Admin' | 'SuperAdmin';
  email: string;
  phone: string;
  organization?: string;
}

export const SIM_PROFILES: SimProfile[] = [
  { id: 'uid_citizen_jane', name: 'Jane Citizen', role: 'Citizen', email: 'citizen_jane@gmail.com', phone: '+977 98510 12345' },
  { id: 'uid_coord_emma', name: 'Emma Coordinator', role: 'Rescue coordinator', email: 'coordinator_emma@resqaid.org', phone: '+977 98412 34567', organization: 'Kathmandu Rescue Command' },
  { id: 'uid_ngo_paws', name: 'Animal Nepal NGO', role: 'NGO', email: 'ngo_animalnepal@resqaid.org', phone: '+977 98123 45678', organization: 'Animal Nepal' },
  { id: 'uid_volunteer_sarah', name: 'Sarah Rescuer', role: 'Volunteer', email: 'volunteer_sarah@resqaid.org', phone: '+977 98012 34567', organization: 'Kathmandu Animal Treatment Centre' },
  { id: 'uid_superadmin', name: 'System Super Admin', role: 'SuperAdmin', email: 'superadmin@resqaid.org', phone: '+977 98511 23456', organization: 'ResQ-Aid HQ' },
];

interface RoleSimulatorProps {
  currentProfile: SimProfile;
  onChangeProfile: (profile: SimProfile) => void;
}

export default function RoleSimulator({ currentProfile, onChangeProfile }: RoleSimulatorProps) {
  return (
    <div className="bg-slate-950 text-white border-t border-slate-800 p-4 shadow-xl z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Left: Info */}
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div>
            <p className="text-[10px] text-slate-400 tracking-wider font-mono uppercase font-semibold">Active Simulation Profile</p>
            <p className="text-sm font-semibold font-display text-white">
              {currentProfile.name} <span className="text-xs bg-blue-500/40 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 ml-1">{currentProfile.role}</span>
            </p>
          </div>
        </div>

        {/* Right: Profile quick switchers */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-2 hidden lg:inline">Quick Switch Persona:</span>
          {SIM_PROFILES.map((profile) => {
            const isActive = profile.id === currentProfile.id;
            return (
              <button
                key={profile.id}
                id={`switch-${profile.id}`}
                onClick={() => onChangeProfile(profile)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-105 border border-blue-400'
                    : 'bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/5'
                }`}
              >
                {profile.name.split(' ')[0]} ({profile.role === 'Rescue coordinator' ? 'Coord' : profile.role})
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
}
