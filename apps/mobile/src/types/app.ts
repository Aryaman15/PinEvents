export type AuthMode = 'login' | 'signup';
export type EventPrivacy = 'public' | 'private';

export type Profile = {
  id: string;
  displayName: string;
  bio: string;
  interests: string[];
  avatarUrl: string;
};

export type EventPin = {
  id: string;
  title: string;
  description: string;
  category: string;
  type: EventPrivacy;
  startTime: string;
  endTime: string;
  createdAt: string;
  createdBy: string;
  imageUrls?: string[];
  location?: { type: 'Point'; coordinates: [number, number] };
  redactedLocation?: { type: 'Point'; coordinates: [number, number] };
};

export type ViewerInfo = {
  isMember: boolean;
  role: 'admin' | 'member' | null;
  status: 'accepted' | null;
  joinRequestStatus: 'pending' | 'approved' | 'rejected' | null;
};

export type EventDetail = EventPin & {
  viewer?: ViewerInfo;
};

export type JoinRequest = {
  id: string;
  eventId: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  createdBy: string;
  imageUrls?: string[];
};

export type EventMessage = {
  id: string;
  eventId: string;
  text: string;
  createdAt: string;
  createdBy: string;
  imageUrls?: string[];
  displayName: string;
  isMine?: boolean;
};

export type EventDraft = {
  title: string;
  description: string;
  category: string;
  type: EventPrivacy;
  startTime: string;
  endTime: string;
  imageUrls: string[];
};
