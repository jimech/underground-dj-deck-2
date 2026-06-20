import React, { useState, useEffect, useRef } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { audio } from '../utils/audioEngine';
import { DrumInstrument } from '../types';
import { MOOD_PRESETS, MoodPreset } from '../utils/presets';
import { 
  User, Save, FileDown, FileUp, Music, Upload, Trash2, 
  Sparkles, Award, Clock, Disc, ArrowRight, CheckCircle2, ChevronRight, X,
  Shield, RefreshCw, Share2, Copy, ExternalLink, Code, FileImage, Pencil
} from 'lucide-react';
import { serializeSession, deserializeSession, type VersionedSession } from '../utils/sessionCodec';
import {
  deleteSession as deleteCloudSession,
  generateSessionNames,
  getProfile as getCloudProfile,
  getSession as getCloudSession,
  listSessions as listCloudSessions,
  saveProfile as saveCloudProfile,
  saveSession as saveCloudSession,
  updateSession as updateCloudSession,
  type SessionResponse,
} from '../lib/apiClient';
import { supabaseBrowserClient } from '../lib/supabaseClient';

const PROFILE_ID_STORAGE_KEY = 'dj_profile_id';

type UserProfileAndSessionManagerProps = {
  mode?: 'full' | 'account';
  onOpenStudio?: () => void;
  onOpenPoster?: (detail: { sessionName?: string; bpm?: number }) => void;
};

function getOrCreateProfileId() {
  const existing = localStorage.getItem(PROFILE_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated = `profile_${crypto.randomUUID()}`;
  localStorage.setItem(PROFILE_ID_STORAGE_KEY, generated);
  return generated;
}

export default function UserProfileAndSessionManager({ mode = 'full', onOpenStudio, onOpenPoster }: UserProfileAndSessionManagerProps) {
  const isAccountMode = mode === 'account';

  // --- DJ Profile States ---
  const [djName, setDjName] = useState('DJ Monolith');
  const [djCrew, setDjCrew] = useState('Sub-level 4');
  const [soundStyle, setSoundStyle] = useState('Industrial Techno');
  
  // Real time accumulated stats
  const [timeMixed, setTimeMixed] = useState(0); // in seconds
  const [vinylSpins, setVinylSpins] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileId, setProfileId] = useState('');
  const [hasLoadedProfile, setHasLoadedProfile] = useState(false);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authStatus, setAuthStatus] = useState('');
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Avatar seed / design accent index
  const [avatarIndex, setAvatarIndex] = useState(0);
  const avatarColors = [
    'from-orange-500 to-amber-600',
    'from-rose-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-cyan-500 to-blue-600',
    'from-pink-500 to-red-600'
  ];

  // --- Track Uploader States ---
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'reading' | 'decoding' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState('');
  const [uploadedTracks, setUploadedTracks] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Session Manager States ---
  const [sessionName, setSessionName] = useState('');
  const [savedSessions, setSavedSessions] = useState<Array<{ id: string; name: string; timestamp: number; data: any }>>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });
  const statusTimeoutRef = useRef<number | null>(null);
  const [pastedShareCode, setPastedShareCode] = useState('');
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [isCloudSaving, setIsCloudSaving] = useState(false);
  const [lastCloudShareUrl, setLastCloudShareUrl] = useState('');
  const [isGeneratingSessionName, setIsGeneratingSessionName] = useState(false);
  const [cloudSessions, setCloudSessions] = useState<SessionResponse[]>([]);
  const [isCloudLibraryLoading, setIsCloudLibraryLoading] = useState(false);

  useEffect(() => {
    if (!supabaseBrowserClient) {
      setAuthStatus('Anonymous local mode');
      return;
    }

    let isMounted = true;

    supabaseBrowserClient.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setAuthUser(data.session?.user || null);
      setAuthStatus(data.session?.user ? 'Signed in' : 'Ready for magic link sign-in');
    });

    const { data: listener } = supabaseBrowserClient.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null);
      setAuthStatus(session?.user ? 'Signed in' : 'Ready for magic link sign-in');
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Load initial settings and profile stats on mount
  useEffect(() => {
    const activeProfileId = getOrCreateProfileId();
    setProfileId(activeProfileId);

    // 1. DJ Profile
    const localName = localStorage.getItem('dj_profile_name');
    const localCrew = localStorage.getItem('dj_profile_crew');
    const localStyle = localStorage.getItem('dj_profile_style');
    const localTime = localStorage.getItem('dj_profile_time_mixed');
    const localSpins = localStorage.getItem('dj_profile_spins');
    const localAvatar = localStorage.getItem('dj_profile_avatar');

    if (localName) setDjName(localName);
    if (localCrew) setDjCrew(localCrew);
    if (localStyle) setSoundStyle(localStyle);
    if (localTime) setTimeMixed(parseInt(localTime));
    if (localSpins) setVinylSpins(parseInt(localSpins));
    if (localAvatar) setAvatarIndex(parseInt(localAvatar));

    const loadCloudProfile = async () => {
      const result = await getCloudProfile(activeProfileId);
      if (result.ok === false) {
        if (result.status && result.status !== 404) {
          triggerAlert('Cloud profile unavailable. Using local profile.', 'info');
        }
        setHasLoadedProfile(true);
        return;
      }

      const profile = result.data.profile;
      setDjName(profile.djName);
      setDjCrew(profile.djCrew);
      setSoundStyle(profile.soundStyle);
      setAvatarIndex(profile.avatarIndex);
      setTimeMixed(profile.timeMixed);
      setVinylSpins(profile.vinylSpins);

      localStorage.setItem('dj_profile_name', profile.djName);
      localStorage.setItem('dj_profile_crew', profile.djCrew);
      localStorage.setItem('dj_profile_style', profile.soundStyle);
      localStorage.setItem('dj_profile_avatar', profile.avatarIndex.toString());
      localStorage.setItem('dj_profile_time_mixed', profile.timeMixed.toString());
      localStorage.setItem('dj_profile_spins', profile.vinylSpins.toString());
      setHasLoadedProfile(true);
    };

    loadCloudProfile();

    // 2. Custom tracks synced from audio engine on startup
    setUploadedTracks([...audio.uploadedTracks]);

    // 3. Saved Sessions
    const sessionsJson = localStorage.getItem('dj_saved_sessions');
    if (sessionsJson) {
      try {
        setSavedSessions(JSON.parse(sessionsJson));
      } catch (e) {
        console.error('Failed to parse saved sessions', e);
      }
    }
  }, []);

  // Sync state stats every 1 second when turntable of sequencers are active
  useEffect(() => {
    const interval = setInterval(() => {
      const activeDecks = audio.isPowerOn && (audio.deckPlayStates.A || audio.deckPlayStates.B);
      if (activeDecks) {
        setTimeMixed(prev => {
          const next = prev + 1;
          localStorage.setItem('dj_profile_time_mixed', next.toString());
          return next;
        });

        const revSpeed = (audio.deckPitches.A + audio.deckPitches.B) * 1.5;
        setVinylSpins(prev => {
          const next = prev + Math.ceil(revSpeed);
          localStorage.setItem('dj_profile_spins', next.toString());
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profileId || !hasLoadedProfile) return;

    const timeout = setTimeout(() => {
      saveCloudProfile(profileId, {
        djName,
        djCrew,
        soundStyle,
        avatarIndex,
        timeMixed,
        vinylSpins,
      });
    }, 5000);

    return () => clearTimeout(timeout);
  }, [profileId, hasLoadedProfile, djName, djCrew, soundStyle, avatarIndex, timeMixed, vinylSpins]);

  const saveProfile = async () => {
    localStorage.setItem('dj_profile_name', djName);
    localStorage.setItem('dj_profile_crew', djCrew);
    localStorage.setItem('dj_profile_style', soundStyle);
    localStorage.setItem('dj_profile_avatar', avatarIndex.toString());
    setIsEditingProfile(false);

    if (!profileId) {
      triggerAlert('DJ Profile customized locally.', 'success');
      return;
    }

    const result = await saveCloudProfile(profileId, {
      djName,
      djCrew,
      soundStyle,
      avatarIndex,
      timeMixed,
      vinylSpins,
    });

    if (result.ok === false) {
      triggerAlert('Profile saved locally. Cloud profile unavailable.', 'info');
      return;
    }

    triggerAlert('DJ Profile customized and synced.', 'success');
  };

  const requestMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseBrowserClient) {
      setAuthStatus('Supabase public auth config is missing.');
      return;
    }
    if (!authEmail.trim()) {
      setAuthStatus('Enter an email first.');
      return;
    }

    setIsAuthSubmitting(true);
    const { error } = await supabaseBrowserClient.auth.signInWithOtp({
      email: authEmail.trim(),
      options: {
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });

    setIsAuthSubmitting(false);
    if (error) {
      setAuthStatus(error.message);
      return;
    }

    setAuthStatus('Magic link sent. Check your email.');
  };

  const signOut = async () => {
    if (!supabaseBrowserClient) return;

    setIsAuthSubmitting(true);
    const { error } = await supabaseBrowserClient.auth.signOut();
    setIsAuthSubmitting(false);
    setAuthStatus(error ? error.message : 'Signed out. Anonymous mode active.');
  };

  const triggerAlert = (text: string, type: 'info' | 'success' | 'error') => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
    }

    setStatusMessage({ text, type });
    statusTimeoutRef.current = window.setTimeout(() => {
      setStatusMessage({ text: '', type: 'info' });
      statusTimeoutRef.current = null;
    }, 4000);
  };

  const clearStatusMessage = () => {
    if (statusTimeoutRef.current) {
      window.clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
    setStatusMessage({ text: '', type: 'info' });
  };

  const getPublicProfileUrl = () => {
    const publicId = authUser ? `user_${authUser.id}` : profileId;
    if (!publicId) return '';

    return `${window.location.origin}/profile/${encodeURIComponent(publicId)}`;
  };

  const copyPublicProfileLink = async () => {
    const publicUrl = getPublicProfileUrl();
    if (!publicUrl) {
      triggerAlert('Save or load your profile before sharing it.', 'info');
      return;
    }

    await navigator.clipboard.writeText(publicUrl);
    triggerAlert('Public profile link copied.', 'success');
  };

  const openStudioWorkspace = () => {
    onOpenStudio?.();
  };

  const openPosterGenerator = (detail: { sessionName?: string; bpm?: number }) => {
    if (onOpenPoster) {
      onOpenPoster(detail);
      return;
    }

    window.dispatchEvent(new CustomEvent('open-poster-generator', { detail }));
  };

  const cloudSaveMode = authUser ? 'Account Library' : 'Public Link Only';
  const cloudSaveHint = authUser
    ? 'Save Cloud adds this mix to Saved Mixes and copies a public set page link.'
    : 'Save Cloud creates a public set link. Sign in from Account to keep mixes in your library.';

  const refreshCloudSessions = async (showAlert = false) => {
    if (!authUser) {
      setCloudSessions([]);
      return;
    }

    setIsCloudLibraryLoading(true);
    try {
      const result = await listCloudSessions();
      if (result.ok === false) {
        const detail = result.detail ? ` ${result.detail}` : '';
        triggerAlert(`Cloud library unavailable.${detail}`, 'error');
        return;
      }

      setCloudSessions(result.data.sessions);
      if (showAlert) triggerAlert('Cloud library refreshed.', 'success');
    } catch (err: any) {
      triggerAlert(err?.message || 'Cloud library unavailable.', 'error');
    } finally {
      setIsCloudLibraryLoading(false);
    }
  };

  useEffect(() => {
    refreshCloudSessions();
  }, [authUser]);

  // --- Audio File Importer / Decoder ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processAudioFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processAudioFile(files[0]);
    }
  };

  const processAudioFile = async (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.ogg') && !file.name.endsWith('.m4a')) {
      setUploadStatus('error');
      setUploadError('Unsupported file type. Must be an audio file (MP3, WAV, etc.)');
      return;
    }

    try {
      setUploadStatus('reading');
      setUploadError('');
      // Trigger short audio click to signify ingestion
      audio.triggerSample('synth');

      setUploadStatus('decoding');
      const decodedBuffer = await audio.decodeAudioFile(file);
      
      // Add track to audioEngine (index >= 3)
      const cleanName = file.name.replace(/\.[^/.]+$/, "").substring(0, 26);
      audio.addUploadedTrack(cleanName, decodedBuffer);

      // Save list to React state
      setUploadedTracks([...audio.uploadedTracks]);

      // Emit global custom upload event so Deck Turntables list expands
      window.dispatchEvent(new CustomEvent('custom-track-uploaded'));

      setUploadStatus('success');
      triggerAlert(`"${cleanName}" successfully mounted on live vinyl deck.`, 'success');
      
      setTimeout(() => {
        setUploadStatus('idle');
      }, 3000);

    } catch (err: any) {
      console.error(err);
      setUploadStatus('error');
      setUploadError(err.message || 'Decoding failed (unsupported codec or corrupted file).');
    }
  };

  const ejectTrack = (index: number) => {
    // Eject track from audioEngine lists safely
    audio.uploadedTracks.splice(index, 1);
    setUploadedTracks([...audio.uploadedTracks]);

    // Force deck selection resets if they were looking at custom ejected indices
    if (audio.deckSelectedTracks.A >= 3 + index) {
      audio.deckSelectedTracks.A = Math.max(0, audio.deckSelectedTracks.A - 1);
    }
    if (audio.deckSelectedTracks.B >= 3 + index) {
      audio.deckSelectedTracks.B = Math.max(0, audio.deckSelectedTracks.B - 1);
    }

    window.dispatchEvent(new CustomEvent('custom-track-uploaded'));
    triggerAlert('Audio track successfully ejected.', 'info');
  };

  // --- Session Storage Managers ---
  const getFullCurrentRigSession = (name: string = "Live Improvisation") => {
    const sessionData = {
      bpm: audio.bpm,
      crossfaderValue: audio.crossfaderValue,
      deckAValues: { ...audio.deckAValues },
      deckBValues: { ...audio.deckBValues },
      swingAmountValue: audio.swingAmountValue,
      flangerValue: audio.flangerValue,
      deckSelectedTracks: { ...audio.deckSelectedTracks },
      deckPlayStates: { ...audio.deckPlayStates },
      deckReversed: { ...audio.deckReversed },
      effectsVinylCrackleActive: audio.effectsVinylCrackleActive,
      effectsVinylCrackleVolume: audio.effectsVinylCrackleVolume,
      effectsVinylCrackleFreq: audio.effectsVinylCrackleFreq,
      effectsVinylCrackleQ: audio.effectsVinylCrackleQ,
      ambientMode: audio.ambientMode,
      visualizerMode: audio.visualizerMode,
      stickerText: audio.stickerText,
      // Grid state from step sequence
      sequencerTracks: {} as any
    };

    // Grab deep copy of drum seq grid safely
    Object.keys(audio.sequencerTracks).forEach(inst => {
      sessionData.sequencerTracks[inst] = [...audio.sequencerTracks[inst as DrumInstrument]];
    });

    return {
      version: 1, // incremental versioning
      name: name,
      timestamp: Date.now(),
      data: sessionData
    };
  };

  const saveCurrentSession = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nameToSave = sessionName.trim() || `Session ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newSessionItem = {
      ...getFullCurrentRigSession(nameToSave),
      id: 'session_' + Date.now(),
    };

    const nextSessions = [newSessionItem, ...savedSessions.filter(s => s.name !== nameToSave)];
    setSavedSessions(nextSessions);
    localStorage.setItem('dj_saved_sessions', JSON.stringify(nextSessions));
    setSessionName('');
    triggerAlert(`"${nameToSave}" successfully locked to browser safe.`, 'success');
  };

  const getSequencerDensity = () => {
    const tracks = Object.values(audio.sequencerTracks);
    const totalSteps = tracks.reduce((sum, track) => sum + track.length, 0);
    if (totalSteps === 0) return 0;

    const activeSteps = tracks.reduce((sum, track) => sum + track.filter(Boolean).length, 0);
    return activeSteps / totalSteps;
  };

  const generateAiSessionName = async () => {
    if (isGeneratingSessionName) return;

    setIsGeneratingSessionName(true);
    try {
      const result = await generateSessionNames({
        bpm: audio.bpm,
        soundStyle,
        ambientMode: audio.ambientMode,
        sequencerDensity: getSequencerDensity(),
      });

      if (result.ok === false) {
        setSessionName(`Bunker Signal ${audio.bpm}`);
        triggerAlert('AI naming unavailable. Local fallback name loaded.', 'info');
        return;
      }

      const [primaryName] = result.data.names;
      setSessionName(primaryName || `Bunker Signal ${audio.bpm}`);
      triggerAlert(result.data.description, 'success');
    } catch {
      setSessionName(`Bunker Signal ${audio.bpm}`);
      triggerAlert('AI naming unavailable. Local fallback name loaded.', 'info');
    } finally {
      setIsGeneratingSessionName(false);
    }
  };

  const exportCurrentRigWithoutSaving = () => {
    try {
      const liveRig = getFullCurrentRigSession(`Rig ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(liveRig));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `dj_current_rig_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerAlert('Current live rig state JSON downloaded.', 'success');
    } catch (_) {
      triggerAlert('Failed to export current performance.', 'error');
    }
  };

  const copyShareCode = () => {
    try {
      const liveRig = getFullCurrentRigSession("Shared Mix Rig");
      const base64Code = serializeSession(liveRig);
      navigator.clipboard.writeText(base64Code);
      triggerAlert('Live session share code copied to clipboard!', 'success');
    } catch (err: any) {
      triggerAlert('Failed to encode share string.', 'error');
    }
  };

  const copyShareLinkWithHash = () => {
    try {
      const liveRig = getFullCurrentRigSession("Shared Mix Link");
      const base64Code = serializeSession(liveRig);
      const shareUrl = `${window.location.origin}${window.location.pathname}#session=${base64Code}`;
      
      navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setTimeout(() => setCopiedShareLink(false), 2000);
      triggerAlert('Direct URL link copied to clipboard!', 'success');
    } catch (err: any) {
      triggerAlert('Failed to encode share link.', 'error');
    }
  };

  const saveCurrentSessionToCloud = async () => {
    if (isCloudSaving) return;

    const nameToSave = sessionName.trim() || `Cloud Mix ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const liveRig = getFullCurrentRigSession(nameToSave) as VersionedSession;

    setIsCloudSaving(true);
    try {
      const result = await saveCloudSession(liveRig);
      if (result.ok === false) {
        const detail = result.detail ? ` ${result.detail}` : '';
        triggerAlert(`Cloud save failed.${detail}`, 'error');
        return;
      }

      setLastCloudShareUrl(result.data.shareUrl);
      setCloudSessions((current) => [result.data, ...current.filter((session) => session.id !== result.data.id)]);
      try {
        await navigator.clipboard.writeText(result.data.publicUrl || result.data.shareUrl);
        setCopiedShareLink(true);
        setTimeout(() => setCopiedShareLink(false), 2000);
        triggerAlert(`Public set link copied for "${result.data.session.name}".`, 'success');
      } catch {
        triggerAlert(`Cloud set link created for "${result.data.session.name}". Copy it from the share panel.`, 'success');
      }
    } catch (err: any) {
      triggerAlert(err?.message || 'Cloud save failed. Is the API server running?', 'error');
    } finally {
      setIsCloudSaving(false);
    }
  };

  const handleImportShareCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedShareCode.trim()) {
      triggerAlert('Pasted code field is empty.', 'error');
      return;
    }
    try {
      const decodedSession = deserializeSession(pastedShareCode);
      loadSession(decodedSession);
      setPastedShareCode('');
      setIsSharingOpen(false);
      triggerAlert(`Loaded Shared Mix: "${decodedSession.name}"!`, 'success');
    } catch (err: any) {
      triggerAlert(err.message || 'Corrupted performance share code', 'error');
    }
  };

  // Load session from clean backend links first, then fall back to legacy hash share codes.
  useEffect(() => {
    let isCancelled = false;

    const cleanSharedSessionUrl = () => {
      const params = new URLSearchParams(window.location.search);
      params.delete('sessionId');
      const query = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    };

    const checkUrlSharedSession = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const sessionId = params.get('sessionId');
        if (sessionId) {
          const result = await getCloudSession(sessionId);
          if (isCancelled) return;

          if (result.ok === false) {
            setTimeout(() => {
              triggerAlert(`Cloud session link failed: ${result.detail || result.error}`, 'error');
            }, 500);
            return;
          }

          loadSession(result.data.session);
          setLastCloudShareUrl(result.data.shareUrl);
          setTimeout(() => {
            triggerAlert(`Connected cloud performance URL: "${result.data.session.name}"!`, 'success');
          }, 500);
          cleanSharedSessionUrl();
          return;
        }

        const hash = window.location.hash;
        if (hash && hash.startsWith('#session=')) {
          const code = hash.substring(9); // '#session=' is length 9
          if (code) {
            const decoded = deserializeSession(code);
            loadSession(decoded);
            // Stagger alert slightly to allow rendering completion
            setTimeout(() => {
              triggerAlert(`Connected shared performance URL: "${decoded.name}"!`, 'success');
            }, 500);
            
            // Clean up the hash gracefully so subsequent actions or refreshes are smooth
            cleanSharedSessionUrl();
          }
        }
      } catch (err: any) {
        console.error('Failed to parse URL mix', err);
        // Stagger alert
        setTimeout(() => {
          triggerAlert('Invalid or corrupted session link in URL.', 'error');
        }, 500);
      }
    };

    // Stagger check slightly to guarantee audio context has mounted/stabilized
    const initialCheckTimer = setTimeout(checkUrlSharedSession, 400);

    window.addEventListener('hashchange', checkUrlSharedSession);
    window.addEventListener('popstate', checkUrlSharedSession);
    return () => {
      isCancelled = true;
      clearTimeout(initialCheckTimer);
      window.removeEventListener('hashchange', checkUrlSharedSession);
      window.removeEventListener('popstate', checkUrlSharedSession);
    };
  }, []);

  const loadSession = (session: any) => {
    try {
      const data = session.data;
      if (!data) return;

      // Ensure Audio context is booted
      if (!audio.ctx) {
        audio.init();
      }

      // Restore parameters onto audioEngine model
      audio.setBpm(data.bpm);
      audio.setCrossfader(data.crossfaderValue);
      
      // Decks parameters
      audio.deckSelectedTracks = { ...data.deckSelectedTracks };
      audio.deckPlayStates = { ...data.deckPlayStates };
      if (data.deckReversed) audio.deckReversed = { ...data.deckReversed };

      // Volume & EQ
      audio.setVolume('A', data.deckAValues.vol);
      audio.setVolume('B', data.deckBValues.vol);
      audio.setEQ('A', 'low', data.deckAValues.low);
      audio.setEQ('A', 'mid', data.deckAValues.mid);
      audio.setEQ('A', 'high', data.deckAValues.high);
      audio.setFilter('A', data.deckAValues.filter);

      audio.setVolume('B', data.deckBValues.vol);
      audio.setEQ('B', 'low', data.deckBValues.low);
      audio.setEQ('B', 'mid', data.deckBValues.mid);
      audio.setEQ('B', 'high', data.deckBValues.high);
      audio.setFilter('B', data.deckBValues.filter);

      // FX Units
      audio.setSwingAmount(data.swingAmountValue);
      audio.setMasterFlangerSweep(data.flangerValue);

      // Vinyl Crackle properties
      audio.effectsVinylCrackleActive = data.effectsVinylCrackleActive;
      audio.effectsVinylCrackleVolume = data.effectsVinylCrackleVolume;
      audio.effectsVinylCrackleFreq = data.effectsVinylCrackleFreq;
      audio.effectsVinylCrackleQ = data.effectsVinylCrackleQ;

      // Re-trigger live node updates if active
      audio.toggleEffectsVinylCrackle(data.effectsVinylCrackleActive);

      // Restore Ambient background mode
      audio.setAmbientMode(data.ambientMode || 'none');

      // Visualizer and sticker text
      audio.visualizerMode = session.visualizerMode || data.visualizerMode || 'bars';
      audio.stickerText = session.stickerText || data.stickerText || `[CUSTOM PLAYBACK] - ${session.name}`;

      // Drum Grid states
      if (data.sequencerTracks) {
        Object.keys(data.sequencerTracks).forEach(inst => {
          audio.sequencerTracks[inst as DrumInstrument] = [...data.sequencerTracks[inst]];
        });
      }

      setSelectedSessionId(session.id);

      // Send global React sync command across all components
      window.dispatchEvent(new CustomEvent('session-loaded'));

      triggerAlert(`Mixed session "${session.name}" fully wired into routing paths.`, 'success');

      // Make a small synth sweep click
      audio.triggerSample('synth');

    } catch (e: any) {
      console.error(e);
      triggerAlert('Failed to restore session. Corrupted profile data.', 'error');
    }
  };

  const deleteLocalSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedSessions.filter(s => s.id !== id);
    setSavedSessions(filtered);
    localStorage.setItem('dj_saved_sessions', JSON.stringify(filtered));
    if (selectedSessionId === id) setSelectedSessionId(null);
    triggerAlert('Session scrubbed from safe.', 'info');
  };

  const removeCloudSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await deleteCloudSession(sessionId);
    if (result.ok === false) {
      triggerAlert(result.detail || result.error || 'Cloud session delete failed.', 'error');
      return;
    }

    setCloudSessions((current) => current.filter((session) => session.id !== sessionId));
    if (selectedSessionId === sessionId) setSelectedSessionId(null);
    triggerAlert('Cloud session deleted.', 'success');
  };

  const renameCloudSession = async (cloudSession: SessionResponse, e: React.MouseEvent) => {
    e.stopPropagation();

    const nextName = window.prompt('Rename cloud mix', cloudSession.session.name || 'Untitled Cloud Mix')?.trim();
    if (!nextName || nextName === cloudSession.session.name) return;

    const renamedSession: VersionedSession = {
      ...cloudSession.session,
      name: nextName,
      timestamp: Date.now(),
    };
    const result = await updateCloudSession(cloudSession.id, renamedSession);
    if (result.ok === false) {
      triggerAlert(result.detail || result.error || 'Cloud session rename failed.', 'error');
      return;
    }

    setCloudSessions((current) => current.map((session) => (
      session.id === cloudSession.id ? result.data : session
    )));
    triggerAlert('Cloud session renamed.', 'success');
  };

  const exportSession = (session: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(session));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const cleanFileName = session.name.toLowerCase().replace(/[^a-z0-9]/gi, '_');
      downloadAnchor.setAttribute("download", `dj_session_${cleanFileName}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      triggerAlert('JSON session mix downloaded.', 'success');
    } catch (_) {
      triggerAlert('Failed to export.', 'error');
    }
  };

  const handleJsonImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && parsed.name && parsed.data) {
          // Adjust id to prevent conflicts
          const importedItem = {
            ...parsed,
            id: 'session_imported_' + Date.now(),
            timestamp: Date.now()
          };
          const next = [importedItem, ...savedSessions];
          setSavedSessions(next);
          localStorage.setItem('dj_saved_sessions', JSON.stringify(next));
          loadSession(importedItem);
          triggerAlert(`Imported mix "${parsed.name}" active!`, 'success');
        } else {
          throw new Error('Invalid JSON schema');
        }
      } catch (err) {
        triggerAlert('Error parsing JSON. Please upload a valid exported DJ Session.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Helper clock display format
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  // Get cool titles based on Mixed hours
  const getDjTitle = (secs: number) => {
    if (secs < 30) return 'Bedroom Synthesizer';
    if (secs < 120) return 'Bunker Apprentice';
    if (secs < 360) return 'Club Resident';
    if (secs < 900) return 'Tokyo-Berlin Duplex Overlord';
    return 'Underground Audio Arch-Mage';
  };

  return (
    <section 
      id="dj-custom-station-center" 
      className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full mt-2"
    >
      
      {/* LEFT COLUMN: ACTIVE DJ PROFILE CARD (4 Cols) */}
      <div className={`${isAccountMode ? 'md:col-span-5 xl:col-span-4' : 'md:col-span-4'} bg-zinc-900 border border-zinc-850 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden`}>
        {/* Glow behind profile */}
        <div className={`absolute -top-16 -left-16 w-36 h-36 rounded-full bg-gradient-to-br ${avatarColors[avatarIndex]} opacity-10 blur-xl`} />
        
        <div className="flex justify-between items-center z-10 border-b border-zinc-850 pb-3">
          <div className="flex items-center gap-2">
            <User className="text-zinc-500 w-4 h-4" />
            <h3 className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-extrabold">
              LICENSED MONOLITH LOGBOOK
            </h3>
          </div>
          <button 
            onClick={() => {
              if (isEditingProfile) saveProfile();
              else setIsEditingProfile(true);
            }}
            className="text-[9px] font-mono font-bold uppercase tracking-wider text-orange-400 hover:text-orange-300 transition"
          >
            {isEditingProfile ? 'LOCK_ENTRY' : 'EDIT_LOG'}
          </button>
        </div>

        {/* Profile Card & Customizer */}
        <div className="flex flex-col gap-4 z-10">
          <div className="flex items-center gap-4">
            {/* Ambient Animated Cyber Avatar Shield */}
            <div 
              onClick={() => isEditingProfile && setAvatarIndex((prev) => (prev + 1) % avatarColors.length)}
              className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${avatarColors[avatarIndex]} p-[1.5px] relative group overflow-hidden ${isEditingProfile ? 'cursor-pointer hover:scale-105 duration-100' : ''}`}
            >
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex flex-col items-center justify-center p-1 font-mono">
                <Shield className="w-4 h-4 text-zinc-500 mb-0.5" />
                <span className="text-[7px] text-zinc-400 font-extrabold uppercase">STATION</span>
                <span className="text-[8px] font-extrabold text-white">#{djCrew.slice(0, 3).toUpperCase()}</span>
              </div>
              {isEditingProfile && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[7px] font-mono text-orange-400 font-extrabold uppercase">
                  TAP
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col min-w-0">
              {isEditingProfile ? (
                <div className="flex flex-col gap-1.5 w-full">
                  <input 
                    type="text" value={djName}
                    onChange={e => setDjName(e.target.value.substring(0, 18))}
                    className="w-full bg-zinc-950 text-white font-mono text-xs font-bold uppercase rounded border border-zinc-800 py-1 px-2 focus:border-orange-500 outline-none"
                    placeholder="DJ DECK ALIAS"
                  />
                  <input 
                    type="text" value={djCrew}
                    onChange={e => setDjCrew(e.target.value.substring(0, 18))}
                    className="w-full bg-zinc-950 text-zinc-300 font-mono text-[10px] rounded border border-zinc-800 py-1 px-2 focus:border-orange-500 outline-none"
                    placeholder="CREW / DECK DISTRICT"
                  />
                </div>
              ) : (
                <>
                  <span className="text-white font-mono font-bold text-sm tracking-wide uppercase truncate">
                    {djName}
                  </span>
                  <span className="text-zinc-500 font-mono text-[9px] uppercase tracking-widest font-extrabold">
                    CREW Aff: {djCrew}
                  </span>
                  <span className="mt-1 text-[8px] text-orange-400 bg-orange-950/20 py-0.5 px-2 rounded-md border border-orange-900/30 font-mono tracking-widest uppercase font-extrabold self-start">
                    {getDjTitle(timeMixed)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Sound Style Preferences */}
          <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850/60 flex flex-col gap-1">
            <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase font-bold">
              SONIC CLASSIFICATION
            </span>
            {isEditingProfile ? (
              <select 
                value={soundStyle}
                onChange={e => setSoundStyle(e.target.value)}
                className="w-full py-1.5 px-2 font-mono text-[10px] uppercase font-bold text-zinc-200 bg-zinc-950 border border-zinc-800 rounded outline-none"
              >
                <option value="Industrial Techno">Industrial Techno</option>
                <option value="Hypnotic Minimal">Hypnotic Minimal</option>
                <option value="Acid House">Acid House</option>
                <option value="Ambient Drone">Ambient Drone</option>
                <option value="Lo-Fi Dub">Lo-Fi Dub</option>
              </select>
            ) : (
              <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {soundStyle}
              </span>
            )}
          </div>

          <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850/60 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-mono tracking-widest text-zinc-500 uppercase font-bold">
                {isAccountMode ? 'ACCOUNT & CLOUD SYNC' : 'ACCOUNT LINK'}
              </span>
              <span className={`text-[7px] font-mono uppercase tracking-widest font-extrabold ${
                authUser ? 'text-emerald-400' : 'text-zinc-500'
              }`}>
                {authUser ? 'SIGNED' : 'ANON'}
              </span>
            </div>

            {authUser ? (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-mono text-zinc-300 truncate">
                  {authUser.email || authUser.id}
                </span>
                {isAccountMode && (
                  <span className="text-[8px] text-emerald-300/80 font-mono leading-relaxed uppercase tracking-wider">
                    Cloud mixes, profile edits, and public set links are connected to this account.
                  </span>
                )}
                <button
                  type="button"
                  onClick={signOut}
                  disabled={isAuthSubmitting}
                  className="self-start px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[8px] font-mono uppercase font-extrabold text-zinc-400 hover:text-rose-300 hover:border-rose-700/70 transition disabled:opacity-50"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={copyPublicProfileLink}
                  className="self-start px-2.5 py-1.5 rounded-lg border border-cyan-500/30 text-[8px] font-mono uppercase font-extrabold text-cyan-300 hover:bg-cyan-400 hover:text-black transition"
                >
                  Copy Public Profile
                </button>
              </div>
            ) : (
              <form onSubmit={requestMagicLink} className="flex flex-col gap-2">
                {isAccountMode && (
                  <span className="text-[8px] text-zinc-500 font-mono leading-relaxed uppercase tracking-wider">
                    Sign in to sync saved mixes. The email link returns to this account library.
                  </span>
                )}
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-zinc-950 text-zinc-200 font-mono text-[10px] rounded border border-zinc-800 py-1.5 px-2 focus:border-cyan-500 outline-none"
                  placeholder="EMAIL FOR MAGIC LINK"
                  disabled={!supabaseBrowserClient || isAuthSubmitting}
                />
                <button
                  type="submit"
                  disabled={!supabaseBrowserClient || isAuthSubmitting}
                  className="self-start px-2.5 py-1.5 rounded-lg border border-cyan-500/30 text-[8px] font-mono uppercase font-extrabold text-cyan-300 hover:bg-cyan-400 hover:text-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAuthSubmitting ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            )}

            {!authUser && profileId && (
              <button
                type="button"
                onClick={copyPublicProfileLink}
                className="self-start px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[8px] font-mono uppercase font-extrabold text-zinc-400 hover:text-cyan-300 hover:border-cyan-700/70 transition"
              >
                Copy Local Public Profile
              </button>
            )}

            {authStatus && (
              <span className="text-[8px] text-zinc-500 font-mono leading-relaxed">
                {authStatus}
              </span>
            )}
          </div>

          {/* Persistent Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Hour Mixer Accumulator */}
            <div className="bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-850/50 flex flex-col">
              <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-mono font-semibold uppercase tracking-wider">
                <Clock size={10} />
                TIME MIXED
              </div>
              <span className="text-xs font-mono font-bold text-white mt-1">
                {formatTime(timeMixed)}
              </span>
            </div>

            {/* Revolutions Tracked */}
            <div className="bg-zinc-950/30 p-2.5 rounded-xl border border-zinc-850/50 flex flex-col">
              <div className="flex items-center gap-1 text-[8px] text-zinc-500 font-mono font-semibold uppercase tracking-wider">
                <Disc size={10} />
                VINYL SPINS
              </div>
              <span className="text-xs font-mono font-bold text-white mt-1">
                {vinylSpins.toLocaleString()} revs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CENTER COLUMN: VINYL CASSETTE FILE Uploader & DECODER ZONE (4 Cols) */}
      <div className={`${isAccountMode ? 'hidden' : 'md:col-span-4'} bg-zinc-900 border border-zinc-850 rounded-3xl p-5 flex flex-col gap-4 relative`}>
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
          <Music className="text-zinc-500 w-4 h-4" />
          <h3 className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-extrabold">
            VINYL CARTRIDGE INSERTION / AUDIO UPLOADER
          </h3>
        </div>

        {/* Drag and Drop Zone */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 group relative select-none ${
            isDragging 
              ? 'border-orange-500 bg-orange-950/10' 
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
          }`}
        >
          <input 
            type="file" accept="audio/*" ref={fileInputRef} 
            onChange={handleFileSelect} className="hidden" 
          />

          {uploadStatus === 'idle' && (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-zinc-900 border border-zinc-800 group-hover:bg-zinc-850 duration-150">
                <Upload className="w-5 h-5 text-zinc-400 group-hover:text-orange-400 transition" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase tracking-widest">
                  INSERT DIGITAL AUDIO
                </span>
                <span className="text-[9px] font-mono text-zinc-500 mt-0.5 uppercase">
                  DRAG & DROP OR CHOOSE AUDIO FILE
                </span>
                <span className="text-[8px] font-mono text-zinc-650 mt-1 uppercase">
                  MP3, WAV, OGG, M4A loop decoding
                </span>
              </div>
            </div>
          )}

          {uploadStatus === 'reading' && (
            <div className="flex flex-col items-center gap-2">
              <Disc className="w-7 h-7 text-amber-500 animate-spin-slow" />
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest animate-pulse">
                READING BINARY BITSTREAM...
              </span>
            </div>
          )}

          {uploadStatus === 'decoding' && (
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="w-7 h-7 text-orange-400 animate-spin" />
              <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest animate-pulse">
                DECODING WAVEFORM...
              </span>
              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                Mounting onto live motor buffer
              </span>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex flex-col items-center gap-1.5">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                MOUNTED SUCCESSFULLY!
              </span>
              <span className="text-[8px] font-mono text-zinc-500 uppercase">
                Ready to play on Cassette Selector
              </span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex flex-col items-center gap-1">
              <X className="w-7 h-7 text-rose-500" />
              <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">
                DECODING CRITICAL ERROR
              </span>
              <span className="text-[8px] font-mono text-rose-300 uppercase max-w-[180px] leading-tight mt-1 text-center font-bold">
                {uploadError}
              </span>
              <span className="text-[8px] font-mono text-zinc-500 uppercase mt-2 hover:underline">
                TAP TO RETRY
              </span>
            </div>
          )}
        </div>

        {/* List of Custom Uploaded Tracks */}
        <div className="flex flex-col gap-2 max-h-[110px] overflow-y-auto pr-1">
          {uploadedTracks.length === 0 ? (
            <div className="text-center py-2.5 border border-zinc-850/40 rounded-xl bg-zinc-950/20 text-[8px] font-mono font-bold text-zinc-650 uppercase tracking-widest">
              No custom tracks mounted
            </div>
          ) : (
            uploadedTracks.map((track, i) => (
              <div 
                key={track.id} 
                className="flex items-center justify-between gap-2 p-2 bg-zinc-950/40 border border-zinc-850 rounded-xl group transition hover:border-zinc-800"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <Music size={11} className="text-orange-500" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-mono font-bold text-zinc-200 uppercase tracking-wide truncate max-w-[140px]">
                      {track.name}
                    </span>
                    <span className="text-[7px] text-zinc-500 font-mono tracking-widest uppercase">
                      CASSETTE INDEX {3 + i}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    ejectTrack(i);
                  }}
                  className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 transition opacity-80 group-hover:opacity-100"
                  title="Eject track waveform"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: DJ CABINET / SESSION LIBRARY (4 Cols) */}
      <div className={`${isAccountMode ? 'md:col-span-7 xl:col-span-8 min-h-[520px]' : 'md:col-span-4'} bg-zinc-900 border border-zinc-850 rounded-3xl p-5 flex flex-col gap-4 relative`}>
        <div className="flex items-center gap-2 border-b border-zinc-850 pb-3">
          <Save className="text-zinc-500 w-4 h-4" />
          <h3 className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-extrabold">
            {isAccountMode ? 'ACCOUNT LIBRARY & SAVED MIXES' : 'SESSION STORAGE CABINET & MIX ARCHIVE'}
          </h3>
        </div>

        {isAccountMode && (
          <div className="grid grid-cols-3 gap-2 rounded-2xl border border-zinc-850 bg-zinc-950/35 p-2.5">
            <div className="min-w-0">
              <span className="block text-[7px] font-mono font-extrabold uppercase tracking-widest text-zinc-600">Cloud Mixes</span>
              <span className="mt-1 block text-sm font-mono font-black text-cyan-300">{cloudSessions.length}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[7px] font-mono font-extrabold uppercase tracking-widest text-zinc-600">Mounted Songs</span>
              <span className="mt-1 block text-sm font-mono font-black text-orange-300">{uploadedTracks.length}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-[7px] font-mono font-extrabold uppercase tracking-widest text-zinc-600">Storage</span>
              <span className={`mt-1 block text-[10px] font-mono font-black uppercase ${authUser ? 'text-emerald-300' : 'text-zinc-400'}`}>
                {authUser ? 'Cloud' : 'Local'}
              </span>
            </div>
          </div>
        )}

        {isAccountMode && (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">
                <Music size={11} className="text-orange-400" />
                Mounted Songs
              </span>
              <span className="text-[7px] text-zinc-650">{uploadedTracks.length} local</span>
            </div>

            {uploadedTracks.length === 0 ? (
              <div className="py-4 px-3 text-center text-[8px] font-mono text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-850 rounded-2xl leading-relaxed">
                No songs mounted in this browser.
                <span className="block text-[7px] text-zinc-650 mt-1">
                  Upload audio from the Studio tab. Files stay local and are not pushed to the public repo.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uploadedTracks.map((track, i) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-zinc-850 bg-zinc-950/45 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-mono font-extrabold uppercase tracking-wide text-zinc-200 truncate">
                          {track.name}
                        </span>
                        <span className="text-[7px] text-zinc-500 font-mono tracking-widest uppercase">
                          Local deck slot {3 + i}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => ejectTrack(i)}
                      className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/15 transition opacity-80 group-hover:opacity-100"
                      title="Remove local song from mounted deck slots"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isAccountMode && (
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/[0.04] px-3 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[7.5px] font-mono font-extrabold uppercase tracking-widest text-zinc-500">
                Cloud Save Mode
              </span>
              <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[7px] font-mono font-extrabold uppercase tracking-widest ${
                authUser
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300'
              }`}>
                {cloudSaveMode}
              </span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="text-[8px] font-mono leading-relaxed uppercase tracking-wider text-zinc-500">
                {cloudSaveHint}
              </span>
            </div>
          </div>
        )}

        {/* Save Current Session Form */}
        {!isAccountMode && (
        <form onSubmit={saveCurrentSession} className="flex flex-col sm:flex-row gap-1.5">
          <input 
            type="text" value={sessionName}
            maxLength={26}
            onChange={e => setSessionName(e.target.value)}
            className="flex-1 bg-zinc-950 text-white font-mono text-[10px] font-bold uppercase rounded-xl border border-zinc-850 py-2 px-3 focus:border-orange-500 outline-none"
            placeholder="NAME CURRENT MIX..."
          />
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:shrink-0">
            <button
              type="button"
              onClick={generateAiSessionName}
              disabled={isGeneratingSessionName}
              className="px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/40 hover:bg-cyan-400 hover:text-black transition duration-150 text-cyan-300 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-wait"
              title="Generate a session name from BPM, style, ambient mode, and sequencer density"
            >
              <Sparkles size={12} strokeWidth={2.5} className={isGeneratingSessionName ? 'animate-pulse' : ''} />
              <span className="text-[8px] font-mono font-extrabold uppercase tracking-widest">Name</span>
            </button>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/40 hover:bg-orange-500 hover:text-black transition duration-150 text-orange-400 flex items-center justify-center gap-1.5"
              title="Lock current sliders and grids to browser safe"
            >
              <Save size={12} strokeWidth={2.5} />
              <span className="text-[8px] font-mono font-extrabold uppercase tracking-widest">Save Local</span>
            </button>
          </div>
        </form>
        )}

        {/* Quick Action Triggers for Session Sharing/Export */}
        {!isAccountMode && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[8px] font-mono">
          <button
            type="button"
            onClick={exportCurrentRigWithoutSaving}
            className="py-2 px-1.5 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-300 hover:text-orange-400 hover:border-zinc-700 transition duration-150 cursor-pointer flex items-center justify-center gap-1 font-extrabold uppercase select-none text-[7.5px]"
            title="Download current live knobs/sequencer setup directly as a (.json) patch"
          >
            <FileDown size={10} className="text-orange-500" />
            <span>Export Rig</span>
          </button>
          
          <button
            type="button"
            onClick={() => setIsSharingOpen(!isSharingOpen)}
            className={`py-2 px-1.5 rounded-xl border transition duration-150 cursor-pointer flex items-center justify-center gap-1 font-extrabold uppercase select-none text-[7.5px] ${
              isSharingOpen 
                ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                : 'border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-300 hover:text-orange-400 hover:border-zinc-700'
            }`}
            title="Open offline share code and browser URL tools"
          >
            <Share2 size={10} className={isSharingOpen ? 'text-orange-400 animate-pulse' : 'text-orange-500'} />
            <span>Offline Share</span>
          </button>

          <button
            type="button"
            onClick={saveCurrentSessionToCloud}
            disabled={isCloudSaving}
            className="py-2 px-1.5 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-300 hover:text-cyan-300 hover:border-cyan-700/70 transition duration-150 cursor-pointer flex items-center justify-center gap-1 font-extrabold uppercase select-none text-[7.5px] disabled:opacity-50 disabled:cursor-wait"
            title="Save current rig to the local API and copy a short cloud link"
          >
            <ExternalLink size={10} className={isCloudSaving ? 'text-cyan-300 animate-pulse' : 'text-cyan-400'} />
            <span>{isCloudSaving ? 'Saving...' : 'Save Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              openPosterGenerator({ sessionName: sessionName || 'Live Improvisation', bpm: audio.bpm });
            }}
            className="py-2 px-1.5 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950 text-zinc-300 hover:text-orange-400 hover:border-zinc-700 transition duration-150 cursor-pointer flex items-center justify-center gap-1 font-extrabold uppercase select-none text-[7.5px]"
            title="Generate custom vintage rave club flyer poster"
          >
            <FileImage size={10} className="text-orange-500" />
            <span>Flyer Maker</span>
          </button>
        </div>
        )}

        {/* Collapsible Quick Share Console Panel */}
        {isSharingOpen && !isAccountMode && (
          <div className="bg-zinc-950/80 p-3 rounded-2xl border border-zinc-800 flex flex-col gap-3 relative">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5">
              <span className="text-[8px] font-mono font-extrabold text-orange-400 uppercase tracking-widest flex items-center gap-1">
                <Code size={10} /> OFFLINE SHARE TOOLS
              </span>
              <button 
                type="button" 
                onClick={() => setIsSharingOpen(false)}
                className="text-zinc-500 hover:text-rose-400 transition"
              >
                <X size={10} />
              </button>
            </div>

            {/* Gen/Copy Section */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider font-extrabold">Browser-only share, no account required:</span>
              <span className="text-[7px] font-mono text-zinc-650 uppercase tracking-wider leading-relaxed">
                Use these for temporary rig snapshots. Use Save Cloud for public set pages and account library storage.
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={copyShareCode}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 hover:text-white rounded-lg text-[8px] font-extrabold font-mono uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Copy condensed base64 profile of current dials and sequencer blocks"
                >
                  <Copy size={9} /> Copy Code
                </button>
                <button
                  type="button"
                  onClick={copyShareLinkWithHash}
                  className="py-1.5 px-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-350 hover:text-white rounded-lg text-[8px] font-extrabold font-mono uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Generate a direct load url containing the live rig preset configurations"
                >
                  <ExternalLink size={9} /> {copiedShareLink ? 'Link Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>

            {lastCloudShareUrl && (
              <div className="flex flex-col gap-1.5 border-t border-zinc-900 pt-2.5">
                <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider font-extrabold">Latest Cloud Studio Link:</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={lastCloudShareUrl}
                    className="flex-1 bg-zinc-950 text-cyan-200 font-mono text-[8px] rounded-lg border border-zinc-800 py-1.5 px-2 outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(lastCloudShareUrl);
                      triggerAlert('Latest cloud link copied.', 'success');
                    }}
                    className="px-2.5 py-1.5 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-400 hover:text-black hover:font-bold border border-cyan-500/30 rounded-lg text-[8px] font-mono uppercase transition cursor-pointer"
                    title="Copy latest saved cloud link"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {!lastCloudShareUrl && (
              <div className="border-t border-zinc-900 pt-2.5 text-[7px] font-mono text-zinc-650 uppercase tracking-wider leading-relaxed">
                No cloud link yet. Click Save Cloud to create a public set page and add this mix to your saved cloud library.
              </div>
            )}

            {/* Paste/Import Section */}
            <form onSubmit={handleImportShareCode} className="flex flex-col gap-1.5 border-t border-zinc-900 pt-2.5">
              <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider font-extrabold">Load Pasted Share Code:</span>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={pastedShareCode}
                  onChange={e => setPastedShareCode(e.target.value)}
                  className="flex-1 bg-zinc-950 text-zinc-200 font-mono text-[8px] rounded-lg border border-zinc-800 py-1.5 px-2 focus:border-orange-500 outline-none uppercase placeholder:text-[7.5px]"
                  placeholder="PASTE BASE64 SHARE CODE..."
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 bg-orange-500/15 text-orange-400 hover:bg-orange-500 hover:text-black hover:font-bold border border-orange-500/30 rounded-lg text-[8px] font-mono uppercase transition cursor-pointer"
                  title="Decompress share string and inject parameters state instantly"
                >
                  Load
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 6 High-Fidelity Centralized Venue Mood Preset Packs */}
        {!isAccountMode && (
        <div className="flex flex-col gap-1.5 pt-1.5 border-t border-zinc-850/40">
          <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold flex items-center gap-1 mb-1">
            <Sparkles size={11} className="text-orange-400" />
            <span>SELECT INDUSTRIAL VENUE MOOD</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MOOD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadSession(preset)}
                className="group relative p-2.5 rounded-xl border border-zinc-850 bg-zinc-950/45 hover:bg-zinc-900/30 hover:border-orange-500/30 text-left transition duration-150 cursor-pointer overflow-hidden flex flex-col justify-between h-[52px]"
                title={preset.description}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-mono font-extrabold text-zinc-100 uppercase tracking-wide truncate group-hover:text-orange-400 transition-colors">
                    {preset.name}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-orange-500/80 opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
                </div>
                <div className="flex items-center justify-between text-[7px] font-mono text-zinc-500 uppercase tracking-widest mt-1">
                  <span className="truncate max-w-[80px]">{preset.genre}</span>
                  <span className="text-[6.5px] bg-zinc-950 px-1 py-0.5 rounded text-orange-400 font-extrabold shrink-0">
                    {preset.data.bpm} BPM
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Signed-in Cloud Session Library */}
        <div className={`${isAccountMode ? 'flex-1' : ''} flex flex-col gap-2 border-t border-zinc-850/60 pt-3`}>
          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
            <span>{isAccountMode ? 'Saved Mixes' : 'Cloud Sessions'}</span>
            <button
              type="button"
              onClick={() => refreshCloudSessions(true)}
              disabled={!authUser || isCloudLibraryLoading}
              className="flex items-center gap-1 text-cyan-300 hover:text-cyan-200 disabled:text-zinc-700 disabled:cursor-not-allowed text-[8px] uppercase tracking-widest transition"
              title="Refresh signed-in cloud sessions"
            >
              <RefreshCw size={10} className={isCloudLibraryLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {!authUser ? (
            <div className={`${isAccountMode ? 'flex-1 flex flex-col items-center justify-center min-h-[260px]' : 'py-4'} px-3 text-center text-[8px] font-mono text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-850 rounded-2xl leading-relaxed`}>
              Sign in to keep a cloud library of saved mixes.
              {isAccountMode && (
                <button
                  type="button"
                  onClick={openStudioWorkspace}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-[8px] font-mono font-extrabold uppercase tracking-widest text-orange-300 hover:bg-orange-500 hover:text-black transition"
                >
                  <Disc size={10} />
                  Open Studio
                  <ArrowRight size={10} />
                </button>
              )}
            </div>
          ) : cloudSessions.length === 0 ? (
            <div className={`${isAccountMode ? 'flex-1 flex flex-col items-center justify-center min-h-[260px]' : 'py-4'} px-3 text-center text-[8px] font-mono text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-850 rounded-2xl leading-relaxed`}>
              No cloud mixes yet.
              <span className="block text-[7px] text-zinc-650 mt-1">Create a set in Studio, then use Save Cloud.</span>
              {isAccountMode && (
                <button
                  type="button"
                  onClick={openStudioWorkspace}
                  className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-[8px] font-mono font-extrabold uppercase tracking-widest text-orange-300 hover:bg-orange-500 hover:text-black transition"
                >
                  <Disc size={10} />
                  Open Studio
                  <ArrowRight size={10} />
                </button>
              )}
            </div>
          ) : (
            <div className={`${isAccountMode ? 'max-h-[460px]' : 'max-h-[132px]'} overflow-y-auto gap-2 flex flex-col pr-1`}>
              {cloudSessions.map((cloudSession) => {
                const isSelected = selectedSessionId === cloudSession.id;
                const sessionNameLabel = cloudSession.session.name || 'Untitled Cloud Mix';

                return (
                  <div
                    key={cloudSession.id}
                    onClick={() => {
                      loadSession(cloudSession.session);
                      setSelectedSessionId(cloudSession.id);
                      setLastCloudShareUrl(cloudSession.shareUrl);
                    }}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer transition-all duration-150 group ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/70 shadow-[0_0_8px_rgba(34,211,238,0.12)]'
                        : 'bg-zinc-950/50 border-zinc-850 hover:border-cyan-800/80 hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-300 animate-pulse' : 'bg-zinc-600'}`} />
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[9px] font-mono font-extrabold uppercase tracking-wide truncate ${
                          isSelected ? 'text-cyan-300' : 'text-zinc-200'
                        }`}>
                          {sessionNameLabel}
                        </span>
                        <span className="text-[7px] text-zinc-500 font-mono tracking-widest mt-0.5 uppercase">
                          {new Date(cloudSession.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(cloudSession.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {cloudSession.visibility}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => renameCloudSession(cloudSession, e)}
                        className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-cyan-300 hover:bg-cyan-950/15 transition"
                        title="Rename cloud mix"
                      >
                        <Pencil size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openPosterGenerator({ sessionName: sessionNameLabel, bpm: cloudSession.session.data?.bpm || audio.bpm });
                        }}
                        className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-orange-400 hover:bg-orange-950/15 transition"
                        title="Generate club poster flyer"
                      >
                        <FileImage size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          await navigator.clipboard.writeText(cloudSession.publicUrl || cloudSession.shareUrl);
                          setLastCloudShareUrl(cloudSession.shareUrl);
                          triggerAlert('Public set link copied.', 'success');
                        }}
                        className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-cyan-300 hover:bg-cyan-950/15 transition"
                        title="Copy public set page link"
                      >
                        <Copy size={10} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => removeCloudSession(cloudSession.id, e)}
                        className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/15 transition"
                        title="Delete cloud mix"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Import JSON Trigger */}
        {!isAccountMode && (
        <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500 border-t border-zinc-850/60 pt-3">
          <span>MIX ARCHIVES CABINET</span>
          <label className="flex items-center gap-1 text-orange-400 hover:text-orange-300 cursor-pointer text-[8px] uppercase tracking-widest">
            <FileUp size={11} />
            <span>IMPORT MIX</span>
            <input 
              type="file" accept=".json" 
              onChange={handleJsonImport} className="hidden" 
            />
          </label>
        </div>
        )}

        {/* Session Inventory List */}
        {!isAccountMode && (
        <div className="flex-1 overflow-y-auto max-h-[135px] gap-2 flex flex-col pr-1">
          {savedSessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center text-[8px] font-mono text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-850 rounded-2xl">
              No custom mixed sessions saved yet.
              <span className="text-[7px] text-zinc-650 mt-1 leading-normal max-w-[170px] uppercase">
                Name your current mix above and click Save to store locally.
              </span>
            </div>
          ) : (
            savedSessions.map((session) => {
              const isSelected = selectedSessionId === session.id;
              return (
                <div 
                  key={session.id}
                  onClick={() => loadSession(session)}
                  className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border cursor-pointer transition-all duration-150 group ${
                    isSelected 
                      ? 'bg-orange-500/10 border-orange-500/80 shadow-[0_0_8px_rgba(249,115,22,0.15)]' 
                      : 'bg-zinc-950/50 border-zinc-850 hover:border-zinc-800 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-orange-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <div className="flex flex-col min-w-0">
                      <span className={`text-[9px] font-mono font-extrabold uppercase tracking-wide truncate ${
                        isSelected ? 'text-orange-400' : 'text-zinc-200'
                      }`}>
                        {session.name}
                      </span>
                      <span className="text-[7px] text-zinc-500 font-mono tracking-widest mt-0.5 uppercase">
                        {new Date(session.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(session.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions cabinet */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openPosterGenerator({ sessionName: session.name, bpm: session.data?.bpm || audio.bpm });
                      }}
                      className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-orange-400 hover:bg-orange-950/15 transition"
                      title="Generate club poster flyer"
                    >
                      <FileImage size={10} />
                    </button>
                    <button 
                      onClick={(e) => exportSession(session, e)}
                      className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-orange-400 hover:bg-orange-950/15 transition"
                      title="Download JSON Mix file"
                    >
                      <FileDown size={10} />
                    </button>
                    <button 
                      onClick={(e) => deleteLocalSession(session.id, e)}
                      className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/15 transition"
                      title="Scrub mix from index"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Global Action Status Toast */}
        {statusMessage.text && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed left-4 right-4 bottom-4 z-[80] mx-auto max-w-xl p-3 rounded-2xl text-[9px] font-mono font-bold tracking-widest border uppercase flex items-center justify-between gap-3 shadow-2xl shadow-black/70 ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400' 
              : statusMessage.type === 'error'
              ? 'bg-rose-950/80 border-rose-500 text-rose-400'
              : 'bg-zinc-950/90 border-zinc-800 text-zinc-300'
          }`}
          >
            <span className="flex items-center justify-center gap-2 text-center flex-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping shrink-0" />
              <span>{statusMessage.text}</span>
            </span>
            <button
              type="button"
              onClick={clearStatusMessage}
              className="rounded-lg border border-current/20 p-1 text-current/80 hover:text-current hover:bg-white/5 transition"
              title="Dismiss message"
              aria-label="Dismiss message"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>

    </section>
  );
}
