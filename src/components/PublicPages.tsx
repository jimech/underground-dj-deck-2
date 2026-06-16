import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Disc, ExternalLink, Radio, Shield, Timer, Zap } from 'lucide-react';
import { getPublicProfile, getPublicSet, type ApiResult, type PublicProfileResponse, type PublicSetResponse } from '../lib/apiClient';

type PublicRoute =
  | { type: 'profile'; id: string }
  | { type: 'set'; id: string };

const avatarColors = [
  'from-orange-500 to-amber-600',
  'from-rose-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-red-600',
];

function formatTime(secs: number) {
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function getPublicError(result: ApiResult<unknown>) {
  return result.ok === false ? result.detail || result.error : 'Public page unavailable.';
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans selection:bg-orange-500/30 selection:text-orange-200">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff04_1px,transparent_1px)] bg-[size:26px_26px] pointer-events-none opacity-20" />
      <div className="relative z-10 max-w-5xl mx-auto flex flex-col gap-6">
        <a
          href="/"
          className="self-start inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-[10px] font-mono font-extrabold uppercase tracking-widest text-zinc-400 hover:text-orange-300 hover:border-orange-700/60 transition"
        >
          <ArrowLeft size={13} />
          Studio
        </a>
        {children}
      </div>
    </main>
  );
}

function LoadingPage({ label }: { label: string }) {
  return (
    <Shell>
      <div className="rounded-3xl border border-zinc-850 bg-zinc-900 p-8 text-center font-mono uppercase tracking-widest text-zinc-500">
        {label}
      </div>
    </Shell>
  );
}

function ErrorPage({ message }: { message: string }) {
  return (
    <Shell>
      <div className="rounded-3xl border border-rose-900/60 bg-rose-950/20 p-8 text-center">
        <h1 className="font-mono text-lg font-black uppercase tracking-widest text-rose-300">Signal Not Found</h1>
        <p className="mt-3 text-sm text-rose-100/70">{message}</p>
      </div>
    </Shell>
  );
}

function ProfileCard({ profile }: PublicProfileResponse) {
  const gradient = avatarColors[profile.avatarIndex % avatarColors.length] || avatarColors[0];

  return (
    <Shell>
      <section className="rounded-3xl border border-zinc-850 bg-zinc-900 p-6 md:p-8 overflow-hidden relative">
        <div className={`absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${gradient} opacity-20 blur-3xl`} />
        <div className="relative flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className={`h-20 w-20 rounded-3xl bg-gradient-to-tr ${gradient} p-[2px]`}>
              <div className="h-full w-full rounded-[22px] bg-zinc-950 flex flex-col items-center justify-center font-mono">
                <Shield size={22} className="text-zinc-500" />
                <span className="mt-1 text-[9px] font-black uppercase text-zinc-300">DJ</span>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-mono font-extrabold uppercase tracking-[0.28em] text-orange-400">Public DJ Profile</p>
              <h1 className="mt-2 text-3xl md:text-5xl font-mono font-black uppercase tracking-tight text-white break-words">
                {profile.djName}
              </h1>
              <p className="mt-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
                {profile.djCrew} / {profile.soundStyle}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-64">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <Timer size={16} className="text-cyan-300" />
              <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">Time Mixed</p>
              <p className="mt-1 font-mono text-lg font-black text-white">{formatTime(profile.timeMixed)}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <Disc size={16} className="text-orange-400" />
              <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">Vinyl Spins</p>
              <p className="mt-1 font-mono text-lg font-black text-white">{profile.vinylSpins}</p>
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function SetCard({ set }: PublicSetResponse) {
  const profile = set.profile;
  const bpm = Math.round(set.session.data.bpm);
  const style = profile?.soundStyle || set.session.data.ambientMode || 'Underground Set';

  return (
    <Shell>
      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="rounded-3xl border border-zinc-850 bg-zinc-900 p-6 md:p-8 flex flex-col justify-between min-h-[420px]">
          <div>
            <p className="text-[10px] font-mono font-extrabold uppercase tracking-[0.28em] text-cyan-300">Public Set Transmission</p>
            <h1 className="mt-4 text-3xl md:text-5xl font-mono font-black uppercase tracking-tight text-white break-words">
              {set.session.name || 'Untitled Mix'}
            </h1>
            <p className="mt-4 text-sm text-zinc-400">
              A public Underground DJ Monolith performance snapshot with deck routing, sequencer state, FX, and visual mood preserved.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <Zap size={16} className="text-orange-400" />
              <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">BPM</p>
              <p className="mt-1 font-mono text-xl font-black text-white">{bpm}</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
              <Radio size={16} className="text-emerald-300" />
              <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">Signal</p>
              <p className="mt-1 font-mono text-sm font-black uppercase text-white">Public</p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 md:col-span-2">
              <Disc size={16} className="text-cyan-300" />
              <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-zinc-500">Operator</p>
              <p className="mt-1 font-mono text-sm font-black uppercase text-white truncate">{profile?.djName || 'Anonymous DJ'}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={set.shareUrl}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-[10px] font-mono font-black uppercase tracking-widest text-black hover:bg-orange-400 transition"
            >
              <ExternalLink size={14} />
              Open In Studio
            </a>
            {profile && (
              <a
                href={`/profile/${encodeURIComponent(profile.id)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-3 text-[10px] font-mono font-black uppercase tracking-widest text-zinc-300 hover:text-cyan-300 hover:border-cyan-700 transition"
              >
                DJ Profile
              </a>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-zinc-850 bg-zinc-950 p-5 min-h-[420px]">
          <div className="h-full rounded-2xl border border-orange-500/40 bg-[radial-gradient(circle_at_top,#fb923c33,transparent_38%),linear-gradient(150deg,#18181b,#09090b_55%,#164e63)] p-6 flex flex-col justify-between overflow-hidden">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-orange-200">Underground Transmission</p>
              <h2 className="mt-8 font-mono text-4xl font-black uppercase leading-none text-white break-words">{set.session.name}</h2>
            </div>
            <div className="font-mono uppercase">
              <p className="text-6xl font-black text-orange-300">{bpm}</p>
              <p className="mt-1 text-[11px] font-black tracking-[0.35em] text-zinc-200">BPM / {style}</p>
              <p className="mt-6 text-[10px] tracking-[0.25em] text-zinc-300">
                {new Date(set.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </Shell>
  );
}

export function PublicPage({ route }: { route: PublicRoute }) {
  const [profileResult, setProfileResult] = useState<ApiResult<PublicProfileResponse> | null>(null);
  const [setResult, setSetResult] = useState<ApiResult<PublicSetResponse> | null>(null);

  useEffect(() => {
    let isMounted = true;
    setProfileResult(null);
    setSetResult(null);

    if (route.type === 'profile') {
      getPublicProfile(route.id).then((result) => {
        if (isMounted) setProfileResult(result);
      });
    } else {
      getPublicSet(route.id).then((result) => {
        if (isMounted) setSetResult(result);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [route.id, route.type]);

  if (route.type === 'profile') {
    if (!profileResult) return <LoadingPage label="Loading public profile..." />;
    if (profileResult.ok === false) return <ErrorPage message={getPublicError(profileResult)} />;
    return <ProfileCard profile={profileResult.data.profile} />;
  }

  if (!setResult) return <LoadingPage label="Loading public set..." />;
  if (setResult.ok === false) return <ErrorPage message={getPublicError(setResult)} />;
  return <SetCard set={setResult.data.set} />;
}

export function getPublicRouteFromLocation(pathname: string): PublicRoute | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] === 'profile') return { type: 'profile', id: decodeURIComponent(parts[1]) };
  if (parts[0] === 'sets') return { type: 'set', id: decodeURIComponent(parts[1]) };
  return null;
}
