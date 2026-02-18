import { useState, useMemo, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, set, get } from "firebase/database";

// ─── FIREBASE CONFIG ───────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB3OvcACWfo8sbkmdt01BN977mSEE8wTgk",
  authDomain: "aptl-x-padium.firebaseapp.com",
  databaseURL: "https://aptl-x-padium-default-rtdb.firebaseio.com",
  projectId: "aptl-x-padium",
  storageBucket: "aptl-x-padium.firebasestorage.app",
  messagingSenderId: "493121725372",
  appId: "1:493121725372:web:9459b3d910cfc86d9581b9"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);
const FIXTURES_REF = ref(db, "fixtures");

// ─── CONFIG ───────────────────────────────────────────────────────────────
const TEAM_NAMES = [
  "Sherry/Hassan",
  "Usman/Ibrahim",
  "Sharjeel/Bilal",
  "Zammad/Asadullah",
  "Ahsan/Agha",
  "Talha/Mudassar",
  "Ahsan/Saad",
  "Umar/+1",
  "Saad/Omer",
  "Raamish/Arham",
];

const ADMIN_PASSWORD = "padel2025";
// ──────────────────────────────────────────────────────────────────────────

function buildSchedule(teams) {
  const n = teams.length;
  const fixed = teams[0];
  const rotating = [...teams.slice(1)];
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const round = [];
    const circle = [fixed, ...rotating];
    for (let i = 0; i < n / 2; i++) round.push([circle[i], circle[n - 1 - i]]);
    rounds.push(round);
    rotating.unshift(rotating.pop());
  }
  return rounds;
}

function generateFixtures(teams) {
  const rounds = buildSchedule(teams);
  const fixtures = [];
  let id = 1;
  rounds.forEach((round, ri) => {
    const week = Math.floor(ri / 3) + 1;
    round.forEach(([home, away]) => {
      fixtures.push({ id: id++, week, home, away, homeSets: null, awaySets: null, played: false });
    });
  });
  return fixtures;
}

const SET_OPTIONS = [
  { home: 3, away: 0 }, { home: 2, away: 1 },
  { home: 1, away: 2 }, { home: 0, away: 3 },
];

function computeStandings(teams, fixtures) {
  const t = {};
  teams.forEach(n => { t[n] = { team: n, played: 0, won: 0, lost: 0, setsFor: 0, setsAgainst: 0, points: 0 }; });
  fixtures.forEach(f => {
    if (!f.played) return;
    const h = t[f.home], a = t[f.away];
    h.played++; a.played++;
    h.setsFor += f.homeSets; h.setsAgainst += f.awaySets;
    a.setsFor += f.awaySets; a.setsAgainst += f.homeSets;
    h.points += f.homeSets; a.points += f.awaySets;
    if (f.homeSets > f.awaySets) { h.won++; a.lost++; } else { a.won++; h.lost++; }
  });
  return Object.values(t).sort(
    (a, b) => b.points - a.points || b.won - a.won || (b.setsFor - b.setsAgainst) - (a.setsFor - a.setsAgainst)
  );
}

const WEEKS = [1, 2, 3];

// ─── STYLES ───────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg: #07090f; --surface: #0e1118; --card: #13171f; --card2: #181c26;
  --border: #1f2433; --border2: #2a3045;
  --lime: #c8ff00; --lime2: #9ec400;
  --text: #edf0ff; --muted: #5a6280; --muted2: #8895b8;
  --win: #22d98a; --lose: #ff4757; --warn: #ffb020;
  --gold: #ffd166; --silver: #b8c2d4; --bronze: #d4856a;
  --admin: #7c6eff;
}
body { background: var(--bg); color: var(--text); font-family: 'Barlow', sans-serif; min-height: 100vh; }
body::before {
  content: ''; position: fixed; inset: 0;
  background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 48px 48px; opacity: 0.2; pointer-events: none; z-index: 0;
}
.wrap { position: relative; z-index: 1; max-width: 1080px; margin: 0 auto; padding: 0 16px 60px; }

/* ── SYNC STATUS ── */
.sync-bar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 8px; padding: 6px 0 0; font-size: 11px;
}
.sync-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.sync-dot.connected { background: var(--win); box-shadow: 0 0 6px var(--win); }
.sync-dot.syncing { background: var(--warn); animation: pulse 1s infinite; }
.sync-dot.error { background: var(--lose); }
.sync-dot.offline { background: var(--muted); }
.sync-label { color: var(--muted2); letter-spacing: 0.5px; }

/* ── ADMIN BAR ── */
.admin-bar {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 10px 0; gap: 10px;
}
.admin-badge {
  display: flex; align-items: center; gap: 7px;
  background: #7c6eff22; border: 1px solid #7c6eff55;
  border-radius: 8px; padding: 6px 12px;
  font-size: 12px; font-weight: 700; letter-spacing: 1px; color: var(--admin);
  text-transform: uppercase;
}
.admin-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--admin); animation: pulse 1.8s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.btn-logout {
  background: transparent; border: 1px solid var(--border2); border-radius: 8px;
  padding: 6px 14px; font-family: 'Barlow', sans-serif; font-size: 12px;
  color: var(--muted); cursor: pointer; transition: all 0.14s;
}
.btn-logout:hover { border-color: var(--lose); color: var(--lose); }
.btn-admin-login {
  display: flex; align-items: center; gap: 6px;
  background: var(--card); border: 1px solid var(--border2); border-radius: 8px;
  padding: 6px 14px; font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
  color: var(--muted2); cursor: pointer; transition: all 0.14s;
}
.btn-admin-login:hover { border-color: var(--admin); color: var(--admin); }
.lock-icon { font-size: 14px; }

/* ── LOADING SCREEN ── */
.loading-screen {
  position: fixed; inset: 0; background: var(--bg);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px; z-index: 999;
}
.loading-spinner {
  width: 48px; height: 48px; border: 3px solid var(--border2);
  border-top-color: var(--lime); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--muted2); }

/* ── HEADER ── */
.header { display: flex; align-items: flex-end; justify-content: space-between; padding: 12px 0 24px; gap: 16px; flex-wrap: wrap; border-bottom: 1px solid var(--border2); margin-bottom: 28px; }
.header-left { display: flex; align-items: center; gap: 18px; }
.logo-box { width: 56px; height: 56px; background: var(--lime); border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: 0 0 30px #c8ff0055; flex-shrink: 0; }
.league-title { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 900; letter-spacing: 2px; text-transform: uppercase; line-height: 1; }
.league-sub { font-size: 12px; color: var(--muted2); letter-spacing: 2px; text-transform: uppercase; margin-top: 5px; }
.header-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.hstat { background: var(--card); border: 1px solid var(--border2); border-radius: 10px; padding: 10px 16px; text-align: center; }
.hstat-val { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--lime); line-height: 1; }
.hstat-lbl { font-size: 10px; color: var(--muted); letter-spacing: 1px; text-transform: uppercase; margin-top: 2px; }

/* ── TABS ── */
.tabs { display: flex; gap: 2px; background: var(--surface); border: 1px solid var(--border2); border-radius: 12px; padding: 4px; width: fit-content; margin-bottom: 28px; }
.tab-btn { font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 9px 26px; border-radius: 9px; border: none; cursor: pointer; background: transparent; color: var(--muted); transition: all 0.15s; }
.tab-btn.active { background: var(--lime); color: #07090f; }
.tab-btn:hover:not(.active) { color: var(--text); background: var(--card2); }

/* ── RANKINGS ── */
.rank-wrap { background: var(--card); border: 1px solid var(--border2); border-radius: 16px; overflow: hidden; }
.rank-head { display: grid; grid-template-columns: 52px 1fr 44px 44px 44px 52px 52px 60px 100px 64px; padding: 12px 20px; border-bottom: 1px solid var(--border2); background: var(--surface); }
.rank-head span { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); font-weight: 600; text-align: center; }
.rank-head span:nth-child(2) { text-align: left; }
.rank-row { display: grid; grid-template-columns: 52px 1fr 44px 44px 44px 52px 52px 60px 100px 64px; padding: 13px 20px; border-bottom: 1px solid var(--border); align-items: center; transition: background 0.12s; }
.rank-row:last-child { border-bottom: none; }
.rank-row:hover { background: var(--card2); }
.rank-row > * { text-align: center; font-size: 14px; }
.rank-row > *:nth-child(2) { text-align: left; }
.rank-num { width: 30px; height: 30px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 800; }
.rn-1 { background: var(--gold); color: #07090f; } .rn-2 { background: var(--silver); color: #07090f; } .rn-3 { background: var(--bronze); color: #fff; } .rn-n { background: var(--border2); color: var(--muted2); }
.r-team { font-weight: 600; font-size: 14px; }
.r-win { color: var(--win); font-weight: 600; } .r-lose { color: var(--lose); font-weight: 600; }
.r-diff.pos { color: var(--win); } .r-diff.neg { color: var(--lose); }
.r-pts { font-family: 'Barlow Condensed', sans-serif; font-size: 1.7rem; font-weight: 800; color: var(--lime); line-height: 1; }
.form-track { display: flex; gap: 3px; align-items: center; justify-content: center; }
.form-dot { width: 10px; height: 10px; border-radius: 50%; }
.fd-w { background: var(--win); } .fd-l { background: var(--lose); } .fd-e { background: var(--border2); }

/* ── SCHEDULE FILTERS ── */
.filter-row { display: flex; gap: 20px; align-items: flex-end; flex-wrap: wrap; margin-bottom: 26px; padding: 18px 20px; background: var(--card); border: 1px solid var(--border2); border-radius: 14px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-lbl { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.week-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.week-pill { font-family: 'Barlow Condensed', sans-serif; font-size: 0.95rem; font-weight: 700; letter-spacing: 1px; padding: 7px 18px; border-radius: 8px; border: 1.5px solid var(--border2); background: var(--surface); color: var(--muted2); cursor: pointer; transition: all 0.14s; text-transform: uppercase; }
.week-pill:hover:not(.wp-active) { border-color: var(--lime); color: var(--lime); }
.week-pill.wp-active { background: var(--lime); border-color: var(--lime); color: #07090f; }
.team-sel { background: var(--surface); color: var(--text); border: 1.5px solid var(--border2); border-radius: 8px; padding: 7px 14px; font-family: 'Barlow', sans-serif; font-size: 13px; cursor: pointer; outline: none; min-width: 170px; height: 36px; }
.team-sel:focus { border-color: var(--lime); }
.filter-divider { width: 1px; height: 36px; background: var(--border2); align-self: flex-end; }
.results-count { font-size: 12px; color: var(--muted); margin-left: auto; align-self: flex-end; }

/* ── WEEK SECTIONS ── */
.week-section { margin-bottom: 32px; }
.week-header { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.wk-label { font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; }
.wk-accent { color: var(--lime); }
.wk-line { flex: 1; height: 1px; background: var(--border2); }
.wk-badge { font-size: 11px; color: var(--muted2); background: var(--card); border: 1px solid var(--border2); border-radius: 6px; padding: 3px 10px; font-weight: 600; }

/* ── FIXTURE CARDS ── */
.fx-grid { display: flex; flex-direction: column; gap: 8px; }
.fx-card { background: var(--card); border: 1px solid var(--border2); border-radius: 13px; display: grid; grid-template-columns: 1fr 110px 1fr; align-items: stretch; overflow: hidden; transition: border-color 0.15s, transform 0.1s; }
.fx-card.admin-mode { grid-template-columns: 1fr 110px 1fr 156px; }
.fx-card:hover { border-color: #c8ff0022; }
.fx-card.fx-played { border-left: 3px solid var(--win); }

.fx-team-col { padding: 16px 18px; display: flex; flex-direction: column; justify-content: center; gap: 3px; }
.fx-team-col.away { align-items: flex-end; }
.fx-team-name { font-weight: 600; font-size: 14px; transition: color 0.15s; }
.fx-team-name.winner { color: var(--lime); }
.fx-team-tag { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }

.fx-score-box { border-left: 1px solid var(--border); border-right: 1px solid var(--border); display: flex; align-items: center; justify-content: center; padding: 12px 8px; }
.fx-score-val { font-family: 'Barlow Condensed', sans-serif; font-size: 2.2rem; font-weight: 900; letter-spacing: 3px; color: var(--lime); line-height: 1; }
.fx-score-vs { font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 700; color: var(--muted); letter-spacing: 2px; }

/* admin actions panel */
.fx-actions { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-left: 1px solid var(--border); background: #0b0d16; justify-content: center; }
.status-pill { font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; padding: 3px 8px; border-radius: 20px; width: fit-content; margin: 0 auto 2px; }
.sp-played { background: #22d98a22; color: var(--win); } .sp-pending { background: var(--border); color: var(--muted); }
.btn-score { background: var(--admin); color: #fff; border: none; border-radius: 7px; padding: 7px 0; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: 1px; cursor: pointer; width: 100%; text-transform: uppercase; transition: background 0.13s; }
.btn-score:hover { background: #6557ee; }
.btn-score:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reset { background: transparent; color: var(--muted); border: 1px solid var(--border2); border-radius: 7px; padding: 5px 0; font-family: 'Barlow', sans-serif; font-size: 11px; cursor: pointer; width: 100%; transition: all 0.13s; }
.btn-reset:hover { border-color: var(--lose); color: var(--lose); }
.btn-reset:disabled { opacity: 0.4; cursor: not-allowed; }

/* ── LOGIN MODAL ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.88); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; animation: mfadein 0.18s ease; }
@keyframes mfadein { from { opacity: 0; } to { opacity: 1; } }
.modal { background: var(--card); border: 1px solid var(--border2); border-radius: 20px; padding: 32px; max-width: 400px; width: 100%; animation: mslide 0.2s ease; }
@keyframes mslide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
.modal.shake { animation: shake 0.4s ease; }

.modal-icon { width: 52px; height: 52px; border-radius: 14px; background: #7c6eff22; border: 1px solid #7c6eff44; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 16px; }
.modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
.modal-sub { font-size: 13px; color: var(--muted2); margin-bottom: 24px; line-height: 1.5; }
.pw-label { font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 6px; display: block; }
.pw-input-wrap { position: relative; margin-bottom: 8px; }
.pw-input { width: 100%; background: var(--surface); color: var(--text); border: 1.5px solid var(--border2); border-radius: 10px; padding: 12px 44px 12px 14px; font-family: 'Barlow', sans-serif; font-size: 15px; outline: none; letter-spacing: 2px; transition: border-color 0.15s; }
.pw-input:focus { border-color: var(--admin); }
.pw-input.error { border-color: var(--lose); }
.pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--muted); font-size: 16px; padding: 2px; }
.pw-error { font-size: 12px; color: var(--lose); margin-bottom: 16px; display: flex; align-items: center; gap: 5px; min-height: 18px; font-weight: 600; }
.btn-login { width: 100%; background: var(--admin); color: #fff; border: none; border-radius: 10px; padding: 12px; font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; transition: background 0.14s; margin-bottom: 10px; }
.btn-login:hover { background: #6557ee; }
.btn-cancel { width: 100%; background: transparent; border: 1px solid var(--border2); color: var(--muted); border-radius: 10px; padding: 10px; font-family: 'Barlow', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.14s; }
.btn-cancel:hover { border-color: var(--muted2); color: var(--text); }

/* ── SCORE MODAL ── */
.score-modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 4px; }
.score-modal-sub { font-size: 12px; color: var(--muted2); margin-bottom: 18px; }
.modal-week-tag { display: inline-block; font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; background: #c8ff0015; color: var(--lime); border: 1px solid #c8ff0033; margin-bottom: 16px; }
.modal-matchup { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border2); border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; }
.modal-team { font-weight: 700; font-size: 15px; }
.modal-vs { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; color: var(--muted); font-weight: 700; }
.score-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.score-opt { background: var(--surface); border: 2px solid var(--border2); border-radius: 12px; padding: 16px 12px; cursor: pointer; text-align: center; transition: all 0.15s; }
.score-opt:hover { border-color: var(--admin); background: #7c6eff11; }
.so-score { font-family: 'Barlow Condensed', sans-serif; font-size: 2.4rem; font-weight: 900; letter-spacing: 3px; color: var(--admin); line-height: 1; }
.so-winner { font-size: 11px; color: var(--muted2); margin-top: 4px; }

.empty { text-align: center; padding: 60px 20px; color: var(--muted); font-size: 15px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }

@media (max-width: 650px) {
  .fx-card, .fx-card.admin-mode { grid-template-columns: 1fr; }
  .fx-score-box { border-left: none; border-right: none; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 10px; }
  .fx-actions { border-left: none; border-top: 1px solid var(--border); flex-direction: row; align-items: center; flex-wrap: wrap; }
  .btn-score, .btn-reset { flex: 1; }
  .rank-head, .rank-row { grid-template-columns: 40px 1fr 36px 36px 52px 56px; }
  .rank-head span:nth-child(5), .rank-head span:nth-child(6), .rank-head span:nth-child(7),
  .rank-row > *:nth-child(5), .rank-row > *:nth-child(6), .rank-row > *:nth-child(7) { display: none; }
}
`;

// ─── APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [fixtures, setFixtures]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [syncStatus, setSyncStatus]   = useState("offline"); // "connected" | "syncing" | "error" | "offline"
  const [tab, setTab]                 = useState("rankings");
  const [weekFilter, setWeekFilter]   = useState("All");
  const [teamFilter, setTeamFilter]   = useState("All");
  const [isAdmin, setIsAdmin]         = useState(false);
  const [savingId, setSavingId]       = useState(null); // fixture id currently being saved

  // Login modal state
  const [showLogin, setShowLogin]     = useState(false);
  const [pwValue, setPwValue]         = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [pwError, setPwError]         = useState("");
  const [shaking, setShaking]         = useState(false);
  const loginModalRef                 = useRef(null);

  // Score modal state
  const [scoreModal, setScoreModal]   = useState(null);

  // ── FIREBASE: bootstrap fixtures + real-time listener ──────────────────
  useEffect(() => {
    setSyncStatus("syncing");

    // Read once first to decide whether to seed the DB
    get(FIXTURES_REF).then(snapshot => {
      if (!snapshot.exists()) {
        // No data yet — seed the DB with the generated schedule
        const generated = generateFixtures(TEAM_NAMES);
        // Convert to object keyed by id for Firebase
        const fbObject = {};
        generated.forEach(f => { fbObject[f.id] = f; });
        set(FIXTURES_REF, fbObject)
          .then(() => setSyncStatus("connected"))
          .catch(() => setSyncStatus("error"));
      }
    }).catch(() => {
      setSyncStatus("error");
    });

    // Subscribe to real-time updates
    const unsubscribe = onValue(
      FIXTURES_REF,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Firebase returns an object keyed by fixture id — convert back to sorted array
          const arr = Object.values(data).sort((a, b) => a.id - b.id);
          setFixtures(arr);
        } else {
          // Fallback: use generated fixtures if DB is somehow empty
          setFixtures(generateFixtures(TEAM_NAMES));
        }
        setLoading(false);
        setSyncStatus("connected");
      },
      (error) => {
        console.error("Firebase read error:", error);
        setSyncStatus("error");
        // On error, still show generated fixtures so the UI doesn't break
        setFixtures(generateFixtures(TEAM_NAMES));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const standings = useMemo(() => computeStandings(TEAM_NAMES, fixtures), [fixtures]);

  const teamForm = useMemo(() => {
    const form = {};
    TEAM_NAMES.forEach(t => { form[t] = []; });
    fixtures.filter(f => f.played).sort((a, b) => a.id - b.id).forEach(f => {
      const hw = f.homeSets > f.awaySets;
      form[f.home].push(hw ? "w" : "l");
      form[f.away].push(hw ? "l" : "w");
    });
    return form;
  }, [fixtures]);

  const filtered = useMemo(() => fixtures.filter(f => {
    const wOk = weekFilter === "All" || f.week === Number(weekFilter);
    const tOk = teamFilter === "All" || f.home === teamFilter || f.away === teamFilter;
    return wOk && tOk;
  }), [fixtures, weekFilter, teamFilter]);

  const byWeek = useMemo(() => {
    const map = {};
    filtered.forEach(f => { if (!map[f.week]) map[f.week] = []; map[f.week].push(f); });
    return map;
  }, [filtered]);

  const weeksToShow = Object.keys(byWeek).map(Number).sort();
  const totalPlayed = fixtures.filter(f => f.played).length;
  const totalLeft   = fixtures.length - totalPlayed;

  // ── AUTH ──────────────────────────────────────────────────────────────
  const openLogin = () => { setPwValue(""); setPwError(""); setShowPw(false); setShowLogin(true); };
  const closeLogin = () => setShowLogin(false);

  const attemptLogin = () => {
    if (pwValue === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPwValue("");
      setPwError("");
    } else {
      setPwError("Incorrect password. You are not authorized.");
      setShaking(true);
      setTimeout(() => setShaking(false), 450);
    }
  };

  const handlePwKey = (e) => { if (e.key === "Enter") attemptLogin(); };
  const logout = () => { setIsAdmin(false); setScoreModal(null); };

  // ── SCORE ACTIONS — write directly to Firebase ─────────────────────────
  const applyScore = async (fId, h, a) => {
    if (!isAdmin) return;
    setSavingId(fId);
    setSyncStatus("syncing");
    try {
      await update(ref(db, `fixtures/${fId}`), {
        homeSets: h,
        awaySets: a,
        played: true,
      });
      setSyncStatus("connected");
    } catch (err) {
      console.error("Failed to save score:", err);
      setSyncStatus("error");
    } finally {
      setSavingId(null);
      setScoreModal(null);
    }
  };

  const resetFx = async (fId) => {
    if (!isAdmin) return;
    setSavingId(fId);
    setSyncStatus("syncing");
    try {
      await update(ref(db, `fixtures/${fId}`), {
        homeSets: null,
        awaySets: null,
        played: false,
      });
      setSyncStatus("connected");
    } catch (err) {
      console.error("Failed to reset fixture:", err);
      setSyncStatus("error");
    } finally {
      setSavingId(null);
    }
  };

  const modalFx = scoreModal ? fixtures.find(f => f.id === scoreModal) : null;

  const syncLabel = {
    connected: "Live · Firebase",
    syncing: "Saving…",
    error: "Sync error",
    offline: "Offline",
  }[syncStatus];

  // ── LOADING SCREEN ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{css}</style>
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-title">Loading fixtures…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="wrap">

        {/* SYNC STATUS */}
        <div className="sync-bar">
          <div className={`sync-dot ${syncStatus}`} />
          <span className="sync-label">{syncLabel}</span>
        </div>

        {/* ADMIN BAR */}
        <div className="admin-bar">
          {isAdmin ? (
            <>
              <div className="admin-badge"><div className="admin-dot" /> Admin Mode</div>
              <button className="btn-logout" onClick={logout}>Log Out</button>
            </>
          ) : (
            <button className="btn-admin-login" onClick={openLogin}>
              <span className="lock-icon">🔒</span> Admin Login
            </button>
          )}
        </div>

        {/* HEADER */}
        <div className="header">
          <div className="header-left">
            <div className="logo-box">🎾</div>
            <div>
              <div className="league-title">APTL x Padium League</div>
              <div className="league-sub">Season 2025 · {TEAM_NAMES.length} teams · 3 weeks · 3 matches/team/week</div>
            </div>
          </div>
          <div className="header-stats">
            <div className="hstat"><div className="hstat-val">{fixtures.length}</div><div className="hstat-lbl">Fixtures</div></div>
            <div className="hstat"><div className="hstat-val">{totalPlayed}</div><div className="hstat-lbl">Played</div></div>
            <div className="hstat"><div className="hstat-val">{totalLeft}</div><div className="hstat-lbl">Left</div></div>
            <div className="hstat"><div className="hstat-val">3</div><div className="hstat-lbl">Weeks</div></div>
          </div>
        </div>

        {/* TABS */}
        <div className="tabs">
          <button className={`tab-btn ${tab === "rankings" ? "active" : ""}`} onClick={() => setTab("rankings")}>Rankings</button>
          <button className={`tab-btn ${tab === "schedule" ? "active" : ""}`} onClick={() => setTab("schedule")}>Schedule</button>
        </div>

        {/* ── RANKINGS ── */}
        {tab === "rankings" && (
          <div className="rank-wrap">
            <div className="rank-head">
              <span>#</span><span>Team</span><span>P</span><span>W</span><span>L</span>
              <span>SF</span><span>SA</span><span>+/−</span><span>Form</span><span>PTS</span>
            </div>
            {standings.map((row, i) => {
              const diff = row.setsFor - row.setsAgainst;
              const form = teamForm[row.team] || [];
              return (
                <div className="rank-row" key={row.team}>
                  <div style={{display:"flex",justifyContent:"center"}}>
                    <span className={`rank-num rn-${i < 3 ? i+1 : "n"}`}>{i+1}</span>
                  </div>
                  <div className="r-team">{row.team}</div>
                  <div>{row.played}</div>
                  <div className="r-win">{row.won}</div>
                  <div className="r-lose">{row.lost}</div>
                  <div>{row.setsFor}</div>
                  <div>{row.setsAgainst}</div>
                  <div className={`r-diff ${diff > 0 ? "pos" : diff < 0 ? "neg" : ""}`}>{diff > 0 ? "+" : ""}{diff}</div>
                  <div className="form-track">
                    {Array.from({length:5}).map((_, k) => {
                      const last5 = form.slice(-5);
                      const offset = 5 - last5.length;
                      const res = k < offset ? null : last5[k - offset];
                      return <div key={k} className={`form-dot ${res === "w" ? "fd-w" : res === "l" ? "fd-l" : "fd-e"}`} />;
                    })}
                  </div>
                  <div className="r-pts">{row.points}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {tab === "schedule" && (
          <>
            <div className="filter-row">
              <div className="filter-group">
                <span className="filter-lbl">Week</span>
                <div className="week-pills">
                  <button className={`week-pill ${weekFilter === "All" ? "wp-active" : ""}`} onClick={() => setWeekFilter("All")}>All</button>
                  {WEEKS.map(w => (
                    <button key={w} className={`week-pill ${weekFilter === w ? "wp-active" : ""}`} onClick={() => setWeekFilter(w)}>Wk {w}</button>
                  ))}
                </div>
              </div>
              <div className="filter-divider" />
              <div className="filter-group">
                <span className="filter-lbl">Team</span>
                <select className="team-sel" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                  <option value="All">All Teams</option>
                  {TEAM_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <span className="results-count">{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
            </div>

            {weeksToShow.length === 0 ? (
              <div className="empty"><div className="empty-icon">🔍</div><p>No matches found for this filter.</p></div>
            ) : (
              weeksToShow.map(week => {
                const wfx = byWeek[week];
                const wPlayed = wfx.filter(f => f.played).length;
                return (
                  <div className="week-section" key={week}>
                    <div className="week-header">
                      <div className="wk-label">Week <span className="wk-accent">{week}</span></div>
                      <div className="wk-line" />
                      <div className="wk-badge">{wPlayed}/{wfx.length} played</div>
                    </div>
                    <div className="fx-grid">
                      {wfx.map(f => {
                        const homeWin = f.played && f.homeSets > f.awaySets;
                        const awayWin = f.played && f.awaySets > f.homeSets;
                        const isSaving = savingId === f.id;
                        return (
                          <div key={f.id} className={`fx-card ${isAdmin ? "admin-mode" : ""} ${f.played ? "fx-played" : ""}`}>
                            {/* Home team */}
                            <div className="fx-team-col">
                              <span className={`fx-team-name ${homeWin ? "winner" : ""}`}>{f.home}</span>
                              <span className="fx-team-tag">Home</span>
                            </div>

                            {/* Score */}
                            <div className="fx-score-box">
                              {f.played
                                ? <div className="fx-score-val">{f.homeSets}–{f.awaySets}</div>
                                : <div className="fx-score-vs">{isSaving ? "…" : "VS"}</div>}
                            </div>

                            {/* Away team */}
                            <div className="fx-team-col away">
                              <span className={`fx-team-name ${awayWin ? "winner" : ""}`}>{f.away}</span>
                              <span className="fx-team-tag">Away</span>
                            </div>

                            {/* Admin actions */}
                            {isAdmin && (
                              <div className="fx-actions">
                                <span className={`status-pill ${f.played ? "sp-played" : "sp-pending"}`}>
                                  {isSaving ? "Saving…" : f.played ? "Final" : "Pending"}
                                </span>
                                <button
                                  className="btn-score"
                                  onClick={() => setScoreModal(f.id)}
                                  disabled={isSaving}
                                >
                                  {f.played ? "Edit" : "Set Score"}
                                </button>
                                {f.played && (
                                  <button
                                    className="btn-reset"
                                    onClick={() => resetFx(f.id)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? "…" : "Reset"}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ── ADMIN LOGIN MODAL ── */}
      {showLogin && (
        <div className="modal-overlay" onClick={closeLogin}>
          <div
            ref={loginModalRef}
            className={`modal ${shaking ? "shake" : ""}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-icon">🔐</div>
            <div className="modal-title">Admin Access</div>
            <div className="modal-sub">
              Enter the admin password to unlock score management. Players can view scores without logging in.
            </div>

            <label className="pw-label">Password</label>
            <div className="pw-input-wrap">
              <input
                className={`pw-input ${pwError ? "error" : ""}`}
                type={showPw ? "text" : "password"}
                value={pwValue}
                onChange={e => { setPwValue(e.target.value); setPwError(""); }}
                onKeyDown={handlePwKey}
                placeholder="Enter password"
                autoFocus
              />
              <button className="pw-toggle" onClick={() => setShowPw(p => !p)} tabIndex={-1}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>

            <div className="pw-error">
              {pwError && <><span>⚠️</span> {pwError}</>}
            </div>

            <button className="btn-login" onClick={attemptLogin}>Unlock Admin</button>
            <button className="btn-cancel" onClick={closeLogin}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── SCORE MODAL (admin only) ── */}
      {modalFx && isAdmin && (
        <div className="modal-overlay" onClick={() => setScoreModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="score-modal-title">Set Result</div>
            <div className="score-modal-sub">Choose the match score — best of 3 sets</div>
            <div className="modal-week-tag">📅 Week {modalFx.week}</div>
            <div className="modal-matchup">
              <span className="modal-team">{modalFx.home}</span>
              <span className="modal-vs">VS</span>
              <span className="modal-team">{modalFx.away}</span>
            </div>
            <div className="score-opts">
              {SET_OPTIONS.map(opt => {
                const winner = opt.home > opt.away ? modalFx.home : modalFx.away;
                return (
                  <div key={`${opt.home}-${opt.away}`} className="score-opt" onClick={() => applyScore(modalFx.id, opt.home, opt.away)}>
                    <div className="so-score">{opt.home} – {opt.away}</div>
                    <div className="so-winner">{winner} wins</div>
                  </div>
                );
              })}
            </div>
            <button className="btn-cancel" onClick={() => setScoreModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
