import { useState, useMemo, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, update, set, get, push } from "firebase/database";

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
  "Shoaib/Saad",
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
      fixtures.push({ 
        id: id++, 
        week, 
        home, 
        away, 
        homeSets: null, 
        awaySets: null,
        set1Home: null,
        set1Away: null,
        set2Home: null,
        set2Away: null,
        set3Home: null,
        set3Away: null,
        played: false,
        matchDate: null,
        matchTime: null
      });
    });
  });
  return fixtures;
}

// Calculate sets won from individual set scores
function calculateSetsWon(set1Home, set1Away, set2Home, set2Away, set3Home, set3Away) {
  let homeSets = 0;
  let awaySets = 0;
  
  if (set1Home !== null && set1Away !== null) {
    if (set1Home > set1Away) homeSets++;
    else if (set1Away > set1Home) awaySets++;
  }
  if (set2Home !== null && set2Away !== null) {
    if (set2Home > set2Away) homeSets++;
    else if (set2Away > set2Home) awaySets++;
  }
  if (set3Home !== null && set3Away !== null) {
    if (set3Home > set3Away) homeSets++;
    else if (set3Away > set3Home) awaySets++;
  }
  
  return { homeSets, awaySets };
}

// Calculate total games won/lost from set scores
function calculateGames(fixture) {
  let homeGames = 0;
  let awayGames = 0;
  
  if (fixture.set1Home !== null && fixture.set1Away !== null) {
    homeGames += fixture.set1Home;
    awayGames += fixture.set1Away;
  }
  if (fixture.set2Home !== null && fixture.set2Away !== null) {
    homeGames += fixture.set2Home;
    awayGames += fixture.set2Away;
  }
  if (fixture.set3Home !== null && fixture.set3Away !== null) {
    homeGames += fixture.set3Home;
    awayGames += fixture.set3Away;
  }
  
  return { homeGames, awayGames };
}

function computeStandings(teams, fixtures) {
  const t = {};
  teams.forEach(n => { 
    t[n] = { 
      team: n, 
      played: 0, 
      won: 0, 
      lost: 0, 
      setsFor: 0, 
      setsAgainst: 0, 
      gamesFor: 0,
      gamesAgainst: 0,
      points: 0 
    }; 
  });
  
  fixtures.forEach(f => {
    if (!f.played) return;
    
    // Calculate sets won from individual set scores
    const { homeSets, awaySets } = calculateSetsWon(
      f.set1Home, f.set1Away, 
      f.set2Home, f.set2Away, 
      f.set3Home, f.set3Away
    );
    
    // Calculate games won/lost
    const { homeGames, awayGames } = calculateGames(f);
    
    const h = t[f.home], a = t[f.away];
    h.played++; a.played++;
    
    // Sets statistics
    h.setsFor += homeSets; h.setsAgainst += awaySets;
    a.setsFor += awaySets; a.setsAgainst += homeSets;
    
    // Games statistics (for set difference)
    h.gamesFor += homeGames; h.gamesAgainst += awayGames;
    a.gamesFor += awayGames; a.gamesAgainst += homeGames;
    
    // Points = sets won (if 3-0, winner gets 3, loser gets 0; if 2-1, winner gets 2, loser gets 1)
    h.points += homeSets;
    a.points += awaySets;
    
    if (homeSets > awaySets) { 
      h.won++; 
      a.lost++; 
    } else { 
      a.won++; 
      h.lost++; 
    }
  });
  
  return Object.values(t).sort(
    (a, b) => b.points - a.points || b.won - a.won || (b.gamesFor - b.gamesAgainst) - (a.gamesFor - a.gamesAgainst)
  );
}


// ─── STYLES ───────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
:root {
  --bg: #07090f; --surface: #0e1118; --card: #13171f; --card2: #181c26;
  --border: #1f2433; --border2: #2a3045;
  --lime: #c8ff00; --lime2: #9ec400;
  --text: #edf0ff; --muted: #5a6280; --muted2: #8895b8;
  --win: #22d98a; --lose: #ff4757; --warn: #ffb020;
  --gold: #ffd166; --silver: #b8c2d4; --bronze: #d4856a;
  --admin: #7c6eff;
}
html { background: var(--bg); font-size: 16px; }
body { background: var(--bg); color: var(--text); font-family: 'Barlow', sans-serif; min-height: 100vh; -webkit-font-smoothing: antialiased; }
body::before {
  content: ''; position: fixed; inset: 0;
  background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 32px 32px; opacity: 0.15; pointer-events: none; z-index: 0;
}
.wrap { position: relative; z-index: 1; width: 100%; margin: 0 auto; padding: 12px 12px 80px; }

/* ── SYNC STATUS ── */
.sync-bar {
  display: flex; align-items: center; justify-content: flex-end;
  gap: 6px; padding: 4px 0 8px; font-size: 10px;
}
.sync-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sync-dot.connected { background: var(--win); box-shadow: 0 0 6px var(--win); }
.sync-dot.syncing { background: var(--warn); animation: pulse 1s infinite; }
.sync-dot.error { background: var(--lose); }
.sync-dot.offline { background: var(--muted); }
.sync-label { color: var(--muted2); letter-spacing: 0.3px; font-size: 10px; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }

/* ── ADMIN BAR ── */
.admin-bar {
  display: flex; align-items: center; justify-content: flex-end;
  padding: 8px 0 12px; gap: 8px; flex-wrap: wrap;
}
.admin-badge {
  display: flex; align-items: center; gap: 6px;
  background: #7c6eff22; border: 1px solid #7c6eff55;
  border-radius: 8px; padding: 8px 12px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.8px; color: var(--admin);
  text-transform: uppercase;
}
.admin-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--admin); animation: pulse 1.8s infinite; }
.btn-logout {
  background: transparent; border: 1px solid var(--border2); border-radius: 8px;
  padding: 8px 14px; font-family: 'Barlow', sans-serif; font-size: 12px;
  color: var(--muted); cursor: pointer; transition: all 0.14s; min-height: 36px;
  touch-action: manipulation;
}
.btn-logout:active { border-color: var(--lose); color: var(--lose); background: rgba(255, 71, 87, 0.1); }
.btn-admin-login {
  display: flex; align-items: center; gap: 6px;
  background: var(--card); border: 1px solid var(--border2); border-radius: 8px;
  padding: 8px 14px; font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase;
  color: var(--muted2); cursor: pointer; transition: all 0.14s; min-height: 36px;
  touch-action: manipulation;
}
.btn-admin-login:active { border-color: var(--admin); color: var(--admin); background: rgba(124, 110, 255, 0.1); }
.lock-icon { font-size: 14px; }

/* ── LOADING SCREEN ── */
.loading-screen {
  position: fixed; inset: 0; background: var(--bg);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 20px; z-index: 999;
}
.loading-spinner {
  width: 40px; height: 40px; border: 3px solid var(--border2);
  border-top-color: var(--lime); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.loading-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--muted2); }

/* ── HEADER ── */
.header { display: flex; flex-direction: column; gap: 16px; padding: 8px 0 20px; border-bottom: 1px solid var(--border2); margin-bottom: 20px; }
.header-left { display: flex; align-items: center; gap: 12px; }
.logo-box { width: 48px; height: 48px; background: var(--lime); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 0 20px #c8ff0044; flex-shrink: 0; }
.league-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase; line-height: 1.1; }
.league-sub { font-size: 10px; color: var(--muted2); letter-spacing: 1.5px; text-transform: uppercase; margin-top: 4px; }
.header-stats { display: flex; gap: 8px; width: 100%; }
.hstat { background: var(--card); border: 1px solid var(--border2); border-radius: 10px; padding: 10px 12px; text-align: center; flex: 1; }
.hstat-val { font-family: 'Barlow Condensed', sans-serif; font-size: 1.4rem; font-weight: 800; color: var(--lime); line-height: 1; }
.hstat-lbl { font-size: 9px; color: var(--muted); letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px; }

/* ── TABS ── */
.tabs { display: flex; gap: 3px; background: var(--surface); border: 1px solid var(--border2); border-radius: 12px; padding: 4px; width: 100%; margin-bottom: 20px; }
.tab-btn { font-family: 'Barlow Condensed', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; padding: 10px 16px; border-radius: 8px; border: none; cursor: pointer; background: transparent; color: var(--muted); transition: all 0.15s; flex: 1; text-align: center; touch-action: manipulation; min-height: 44px; }
.tab-btn.active { background: var(--lime); color: #07090f; }
.tab-btn:active:not(.active) { color: var(--text); background: var(--card2); }

/* ── RANKINGS ── */
.rank-wrap { background: var(--card); border: 1px solid var(--border2); border-radius: 12px; overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
.rank-head, .rank-row { min-width: fit-content; }
.rank-head { display: grid; grid-template-columns: 30px 105px 30px 30px 30px 42px 46px 40px; padding: 8px 6px; border-bottom: 1px solid var(--border2); background: var(--surface); position: relative; }
.rank-head span { font-size: 7px; letter-spacing: 0.6px; text-transform: uppercase; color: var(--muted); font-weight: 600; text-align: center; }
.rank-head span:nth-child(1) { position: sticky; left: 0; z-index: 10; background: var(--surface); padding-right: 4px; box-shadow: 2px 0 4px rgba(0,0,0,0.1); }
.rank-head span:nth-child(2) { position: sticky; left: 30px; z-index: 10; background: var(--surface); padding-right: 4px; box-shadow: 2px 0 4px rgba(0,0,0,0.1); text-align: center; }
.rank-row { display: grid; grid-template-columns: 30px 105px 30px 30px 30px 42px 46px 40px; padding: 9px 6px; border-bottom: 1px solid var(--border); align-items: center; transition: background 0.12s; position: relative; }
.rank-row > *:nth-child(1) { position: sticky; left: 0; z-index: 9; background: var(--card); padding-right: 4px; box-shadow: 2px 0 4px rgba(0,0,0,0.1); }
.rank-row > *:nth-child(2) { position: sticky; left: 30px; z-index: 9; background: var(--card); padding-right: 4px; box-shadow: 2px 0 4px rgba(0,0,0,0.1); text-align: center; }
.rank-row:active > *:nth-child(1), .rank-row:active > *:nth-child(2) { background: var(--card2); }
.rank-row:last-child { border-bottom: none; }
.rank-row:active { background: var(--card2); }
.rank-row > * { text-align: center; font-size: 12px; }
.rank-row > *:nth-child(1) { font-size: 0.8rem; }
.rank-row > *:nth-child(8) { font-size: 1.1rem; }
.rank-num { width: 22px; height: 22px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-size: 0.8rem; font-weight: 800; }
.rn-1 { background: var(--gold); color: #07090f; } .rn-2 { background: var(--silver); color: #07090f; } .rn-3 { background: var(--bronze); color: #fff; } .rn-n { background: var(--border2); color: var(--muted2); }
.r-team { font-weight: 600; font-size: 12px; }
.r-win { color: var(--win); font-weight: 600; } .r-lose { color: var(--lose); font-weight: 600; }
.r-diff.pos { color: var(--win); } .r-diff.neg { color: var(--lose); }
.r-pts { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 800; color: var(--lime); line-height: 1; }
.form-track { display: flex; gap: 1.5px; align-items: center; justify-content: center; }
.form-dot { width: 5px; height: 5px; border-radius: 50%; }
.fd-w { background: var(--win); } .fd-l { background: var(--lose); } .fd-e { background: var(--border2); }

/* ── SCHEDULE FILTERS ── */
.filter-row { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; padding: 14px; background: var(--card); border: 1px solid var(--border2); border-radius: 12px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.filter-lbl { font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); font-weight: 700; }
.week-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.week-pill { font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.8px; padding: 8px 14px; border-radius: 8px; border: 1.5px solid var(--border2); background: var(--surface); color: var(--muted2); cursor: pointer; transition: all 0.14s; text-transform: uppercase; touch-action: manipulation; min-height: 36px; }
.week-pill:active:not(.wp-active) { border-color: var(--lime); color: var(--lime); }
.week-pill.wp-active { background: var(--lime); border-color: var(--lime); color: #07090f; }
.team-sel { background: var(--surface); color: var(--text); border: 1.5px solid var(--border2); border-radius: 8px; padding: 10px 14px; font-family: 'Barlow', sans-serif; font-size: 14px; cursor: pointer; outline: none; width: 100%; min-height: 44px; touch-action: manipulation; }
.team-sel:focus { border-color: var(--lime); }
.filter-divider { display: none; }
.results-count { font-size: 11px; color: var(--muted); text-align: center; padding-top: 4px; }

/* ── WEEK SECTIONS ── */
.week-section { margin-bottom: 24px; }
.week-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.wk-label { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
.wk-accent { color: var(--lime); }
.wk-line { flex: 1; height: 1px; background: var(--border2); }
.wk-badge { font-size: 10px; color: var(--muted2); background: var(--card); border: 1px solid var(--border2); border-radius: 6px; padding: 4px 10px; font-weight: 600; }

/* ── FIXTURE CARDS ── */
.fx-grid { display: flex; flex-direction: column; gap: 10px; }
.fx-card { background: var(--card); border: 1px solid var(--border2); border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; transition: border-color 0.15s; }
.fx-card.fx-played { border-left: 3px solid var(--win); }
.fx-card-main { display: grid; grid-template-columns: 1fr auto 1fr; align-items: stretch; }
.fx-team-col { padding: 14px 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 3px; }
.fx-team-col.away { align-items: center; }
.fx-team-name { font-weight: 600; font-size: 13px; transition: color 0.15s; text-align: center; word-break: break-word; }
.fx-team-name.winner { color: var(--lime); }
.fx-team-tag { font-size: 9px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--muted); }
.fx-score-box { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: center; padding: 12px 8px; min-height: 60px; }
.fx-score-val { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 900; letter-spacing: 2px; color: var(--lime); line-height: 1; }
.fx-score-vs { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--muted); letter-spacing: 1.5px; }
.fx-actions { display: flex; flex-direction: column; gap: 8px; padding: 12px; border-top: 1px solid var(--border); background: #0b0d16; }
.status-pill { font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 700; padding: 4px 10px; border-radius: 20px; width: fit-content; margin: 0 auto 4px; }
.sp-played { background: #22d98a22; color: var(--win); } .sp-pending { background: var(--border); color: var(--muted); }
.btn-score { background: var(--admin); color: #fff; border: none; border-radius: 8px; padding: 12px 0; font-family: 'Barlow Condensed', sans-serif; font-size: 0.9rem; font-weight: 700; letter-spacing: 1px; cursor: pointer; width: 100%; text-transform: uppercase; transition: background 0.13s; min-height: 44px; touch-action: manipulation; }
.btn-score:active { background: #6557ee; }
.btn-score:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-reset { background: transparent; color: var(--muted); border: 1px solid var(--border2); border-radius: 8px; padding: 10px 0; font-family: 'Barlow', sans-serif; font-size: 12px; cursor: pointer; width: 100%; transition: all 0.13s; min-height: 40px; touch-action: manipulation; }
.btn-reset:active { border-color: var(--lose); color: var(--lose); background: rgba(255, 71, 87, 0.1); }
.btn-reset:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-reschedule { background: transparent; color: var(--muted2); border: 1px solid var(--border2); border-radius: 8px; padding: 10px 0; font-family: 'Barlow', sans-serif; font-size: 12px; cursor: pointer; width: 100%; transition: all 0.13s; min-height: 40px; touch-action: manipulation; }
.btn-reschedule:active { border-color: var(--warn); color: var(--warn); background: rgba(255, 176, 32, 0.1); }
.btn-reschedule:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-schedule-new { background: var(--admin); color: #fff; border: none; border-radius: 8px; padding: 12px 16px; font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: background 0.14s; min-height: 44px; width: 100%; touch-action: manipulation; }
.btn-schedule-new:active { background: #6557ee; }
.fx-time-tag { font-size: 9px; letter-spacing: 0.5px; color: var(--muted2); margin-top: 2px; }

/* ── LOGIN MODAL ── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 300; padding: 16px; animation: mfadein 0.18s ease; }
@keyframes mfadein { from { opacity: 0; } to { opacity: 1; } }
.modal { background: var(--card); border: 1px solid var(--border2); border-radius: 16px; padding: 24px; width: 100%; max-width: 100%; animation: mslide 0.2s ease; max-height: 90vh; overflow-y: auto; }
@keyframes mslide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-6px); } 80% { transform: translateX(6px); } }
.modal.shake { animation: shake 0.4s ease; }
.modal-icon { width: 48px; height: 48px; border-radius: 12px; background: #7c6eff22; border: 1px solid #7c6eff44; display: flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 14px; }
.modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
.modal-sub { font-size: 12px; color: var(--muted2); margin-bottom: 20px; line-height: 1.5; }
.pw-label { font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); font-weight: 700; margin-bottom: 6px; display: block; }
.pw-input-wrap { position: relative; margin-bottom: 8px; }
.pw-input { width: 100%; background: var(--surface); color: var(--text); border: 1.5px solid var(--border2); border-radius: 10px; padding: 14px 44px 14px 14px; font-family: 'Barlow', sans-serif; font-size: 16px; outline: none; letter-spacing: 2px; transition: border-color 0.15s; min-height: 48px; }
.pw-input:focus { border-color: var(--admin); }
.pw-input.error { border-color: var(--lose); }
.pw-toggle { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--muted); font-size: 18px; padding: 8px; touch-action: manipulation; min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
.pw-error { font-size: 11px; color: var(--lose); margin-bottom: 14px; display: flex; align-items: center; gap: 5px; min-height: 18px; font-weight: 600; }
.btn-login { width: 100%; background: var(--admin); color: #fff; border: none; border-radius: 10px; padding: 14px; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; cursor: pointer; transition: background 0.14s; margin-bottom: 10px; min-height: 48px; touch-action: manipulation; }
.btn-login:active { background: #6557ee; }
.btn-cancel { width: 100%; background: transparent; border: 1px solid var(--border2); color: var(--muted); border-radius: 10px; padding: 12px; font-family: 'Barlow', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.14s; min-height: 44px; touch-action: manipulation; }
.btn-cancel:active { border-color: var(--muted2); color: var(--text); background: var(--card2); }

/* ── SCORE MODAL ── */
.score-modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 4px; }
.score-modal-sub { font-size: 11px; color: var(--muted2); margin-bottom: 16px; line-height: 1.4; }
.modal-week-tag { display: inline-block; font-family: 'Barlow Condensed', sans-serif; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 4px 10px; border-radius: 6px; background: #c8ff0015; color: var(--lime); border: 1px solid #c8ff0033; margin-bottom: 12px; }
.modal-matchup { display: flex; justify-content: space-between; align-items: center; background: var(--surface); border: 1px solid var(--border2); border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; gap: 12px; }
.modal-team { font-weight: 700; font-size: 13px; text-align: center; flex: 1; word-break: break-word; }
.modal-vs { font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; color: var(--muted); font-weight: 700; flex-shrink: 0; }
.score-opts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
.score-opt { background: var(--surface); border: 2px solid var(--border2); border-radius: 12px; padding: 16px 12px; cursor: pointer; text-align: center; transition: all 0.15s; touch-action: manipulation; }
.score-opt:active { border-color: var(--admin); background: #7c6eff11; }
.so-score { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 900; letter-spacing: 2px; color: var(--admin); line-height: 1; }
.so-winner { font-size: 10px; color: var(--muted2); margin-top: 4px; }

.empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 14px; }
.empty-icon { font-size: 40px; margin-bottom: 12px; }
`;

// ─── SCORE MODAL COMPONENT ────────────────────────────────────────────────
function ScoreModal({ fixture, onClose, onSave, saving }) {
  const [set1Home, setSet1Home] = useState(fixture.set1Home?.toString() || "");
  const [set1Away, setSet1Away] = useState(fixture.set1Away?.toString() || "");
  const [set2Home, setSet2Home] = useState(fixture.set2Home?.toString() || "");
  const [set2Away, setSet2Away] = useState(fixture.set2Away?.toString() || "");
  const [set3Home, setSet3Home] = useState(fixture.set3Home?.toString() || "");
  const [set3Away, setSet3Away] = useState(fixture.set3Away?.toString() || "");

  const handleSave = () => {
    const s1h = set1Home !== "" ? parseInt(set1Home) : null;
    const s1a = set1Away !== "" ? parseInt(set1Away) : null;
    const s2h = set2Home !== "" ? parseInt(set2Home) : null;
    const s2a = set2Away !== "" ? parseInt(set2Away) : null;
    const s3h = set3Home !== "" ? parseInt(set3Home) : null;
    const s3a = set3Away !== "" ? parseInt(set3Away) : null;
    
    onSave(fixture.id, s1h, s1a, s2h, s2a, s3h, s3a);
  };

  const { homeSets, awaySets } = calculateSetsWon(
    set1Home !== "" ? parseInt(set1Home) : null,
    set1Away !== "" ? parseInt(set1Away) : null,
    set2Home !== "" ? parseInt(set2Home) : null,
    set2Away !== "" ? parseInt(set2Away) : null,
    set3Home !== "" ? parseInt(set3Home) : null,
    set3Away !== "" ? parseInt(set3Away) : null
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "500px" }}>
        <div className="score-modal-title">{fixture.played ? "Edit Result" : "Set Result"}</div>
        <div className="score-modal-sub">Enter all 3 set scores (e.g., 6-0, 6-1, 6-2). All sets are required.</div>
        <div className="modal-week-tag">📅 Week {fixture.week}</div>
        {fixture.matchDate && (
          <div className="modal-week-tag" style={{ marginTop: "8px" }}>
            📆 {new Date(`${fixture.matchDate}T${fixture.matchTime || "00:00"}`).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              hour: fixture.matchTime ? 'numeric' : undefined,
              minute: fixture.matchTime ? '2-digit' : undefined,
              hour12: true
            })}
          </div>
        )}
        <div className="modal-matchup">
          <span className="modal-team">{fixture.home}</span>
          <span className="modal-vs">VS</span>
          <span className="modal-team">{fixture.away}</span>
        </div>

        {/* Set Score Inputs */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Set 1</label>
            <div></div>
            <div></div>
            <input
              type="number"
              min="0"
              max="7"
              className="pw-input"
              value={set1Home}
              onChange={e => setSet1Home(e.target.value)}
              placeholder="0"
              style={{ textAlign: "center", fontSize: "18px", minHeight: "48px" }}
            />
            <span style={{ textAlign: "center", color: "var(--muted)", fontSize: "16px" }}>–</span>
            <input
              type="number"
              min="0"
              max="7"
              className="pw-input"
              value={set1Away}
              onChange={e => setSet1Away(e.target.value)}
              placeholder="0"
              style={{ textAlign: "center", fontSize: "18px", minHeight: "48px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Set 2</label>
            <div></div>
            <div></div>
            <input
              type="number"
              min="0"
              max="7"
              className="pw-input"
              value={set2Home}
              onChange={e => setSet2Home(e.target.value)}
              placeholder="0"
              style={{ textAlign: "center", fontSize: "18px", minHeight: "48px" }}
            />
            <span style={{ textAlign: "center", color: "var(--muted)", fontSize: "16px" }}>–</span>
            <input
              type="number"
              min="0"
              max="7"
              className="pw-input"
              value={set2Away}
              onChange={e => setSet2Away(e.target.value)}
              placeholder="0"
              style={{ textAlign: "center", fontSize: "18px", minHeight: "48px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "center", marginBottom: "12px" }}>
            <label style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Set 3 *</label>
            <div></div>
            <div></div>
            <input
              type="number"
              min="0"
              max="7"
              className="pw-input"
              value={set3Home}
              onChange={e => setSet3Home(e.target.value)}
              placeholder="0"
              style={{ textAlign: "center", fontSize: "18px", minHeight: "48px" }}
              required
            />
            <span style={{ textAlign: "center", color: "var(--muted)", fontSize: "16px" }}>–</span>
            <input
              type="number"
              min="0"
              max="7"
              className="pw-input"
              value={set3Away}
              onChange={e => setSet3Away(e.target.value)}
              placeholder="0"
              style={{ textAlign: "center", fontSize: "18px", minHeight: "48px" }}
              required
            />
          </div>
        </div>

        {/* Match Summary */}
        {(set1Home !== "" || set1Away !== "" || set2Home !== "" || set2Away !== "" || set3Home !== "" || set3Away !== "") && (
          <div style={{ 
            textAlign: "center", 
            padding: "12px", 
            background: "var(--surface)", 
            borderRadius: "8px", 
            marginBottom: "16px",
            fontSize: "13px"
          }}>
            <div style={{ color: "var(--muted2)", marginBottom: "4px" }}>Match Score</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--lime)" }}>
              {homeSets} – {awaySets}
            </div>
            {set1Home !== "" && set1Away !== "" && set2Home !== "" && set2Away !== "" && set3Home !== "" && set3Away !== "" ? (
              <div style={{ fontSize: "11px", color: "var(--win)", marginTop: "4px" }}>
                ✓ All 3 sets completed
              </div>
            ) : (
              <div style={{ fontSize: "11px", color: "var(--warn)", marginTop: "4px" }}>
                All 3 sets must be completed
              </div>
            )}
          </div>
        )}

        <button 
          className="btn-login" 
          onClick={handleSave}
          disabled={saving || set1Home === "" || set1Away === "" || set2Home === "" || set2Away === "" || set3Home === "" || set3Away === ""}
        >
          {saving ? "Saving…" : "Save Score"}
        </button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [fixtures, setFixtures]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [syncStatus, setSyncStatus]   = useState("offline"); // "connected" | "syncing" | "error" | "offline"
  const [tab, setTab]                 = useState("rankings");
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
  
  // Schedule/Reschedule modal state
  const [scheduleModal, setScheduleModal] = useState(null); // null | "new" | fixtureId for reschedule
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleHome, setScheduleHome] = useState("");
  const [scheduleAway, setScheduleAway] = useState("");
  const [sortBy] = useState("date"); // Always sort by date

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
          // Ensure backward compatibility by adding default fields if missing
          const arr = Object.values(data).map(f => {
            const fixture = {
              ...f,
              matchDate: f.matchDate || null,
              matchTime: f.matchTime || null,
              set1Home: f.set1Home !== undefined ? f.set1Home : null,
              set1Away: f.set1Away !== undefined ? f.set1Away : null,
              set2Home: f.set2Home !== undefined ? f.set2Home : null,
              set2Away: f.set2Away !== undefined ? f.set2Away : null,
              set3Home: f.set3Home !== undefined ? f.set3Home : null,
              set3Away: f.set3Away !== undefined ? f.set3Away : null
            };
            
            // If old format (only homeSets/awaySets), calculate from sets if available
            if (f.played && f.homeSets !== null && f.awaySets !== null) {
              // If sets are not stored, keep the old format
              if (fixture.set1Home === null && fixture.set2Home === null && fixture.set3Home === null) {
                // Old format - sets won are already in homeSets/awaySets
                // This is fine, we'll use them as-is
              } else {
                // Recalculate sets won from individual set scores
                const { homeSets, awaySets } = calculateSetsWon(
                  fixture.set1Home, fixture.set1Away,
                  fixture.set2Home, fixture.set2Away,
                  fixture.set3Home, fixture.set3Away
                );
                fixture.homeSets = homeSets;
                fixture.awaySets = awaySets;
              }
            }
            
            return fixture;
          }).sort((a, b) => a.id - b.id);
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
      // Calculate sets won from individual set scores
      const { homeSets, awaySets } = calculateSetsWon(
        f.set1Home, f.set1Away,
        f.set2Home, f.set2Away,
        f.set3Home, f.set3Away
      );
      const hw = homeSets > awaySets;
      form[f.home].push(hw ? "w" : "l");
      form[f.away].push(hw ? "l" : "w");
    });
    return form;
  }, [fixtures]);

  const filtered = useMemo(() => {
    let filtered = fixtures.filter(f => {
      const tOk = teamFilter === "All" || f.home === teamFilter || f.away === teamFilter;
      return tOk;
    });
    
    // Sort by date
    filtered = filtered.sort((a, b) => {
      if (!a.matchDate && !b.matchDate) return a.id - b.id;
      if (!a.matchDate) return 1;
      if (!b.matchDate) return -1;
      const dateA = new Date(`${a.matchDate}T${a.matchTime || "00:00"}`);
      const dateB = new Date(`${b.matchDate}T${b.matchTime || "00:00"}`);
      return dateA - dateB;
    });
    
    return filtered;
  }, [fixtures, teamFilter, sortBy]);

  // Group by date for date view
  const byDate = useMemo(() => {
    const map = {};
    filtered.forEach(f => {
      const dateKey = f.matchDate || "Unscheduled";
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(f);
    });
    return map;
  }, [filtered]);

  const datesToShow = Object.keys(byDate).sort((a, b) => {
    if (a === "Unscheduled") return 1;
    if (b === "Unscheduled") return -1;
    return new Date(a) - new Date(b);
  });
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
  const applyScore = async (fId, set1Home, set1Away, set2Home, set2Away, set3Home, set3Away) => {
    if (!isAdmin) return;
    
    // Validate that all 3 sets are completed
    if (set1Home === null || set1Away === null || 
        set2Home === null || set2Away === null || 
        set3Home === null || set3Away === null) {
      alert("All 3 sets must be completed");
      return;
    }
    
    // Calculate sets won
    const { homeSets, awaySets } = calculateSetsWon(set1Home, set1Away, set2Home, set2Away, set3Home, set3Away);
    
    // Validate that match is complete (one team must win 2 sets)
    if (homeSets < 2 && awaySets < 2) {
      alert("Match must be completed - one team must win at least 2 sets");
      return;
    }
    
    setSavingId(fId);
    setSyncStatus("syncing");
    try {
      await update(ref(db, `fixtures/${fId}`), {
        set1Home,
        set1Away,
        set2Home,
        set2Away,
        set3Home,
        set3Away,
        homeSets,
        awaySets,
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
        set1Home: null,
        set1Away: null,
        set2Home: null,
        set2Away: null,
        set3Home: null,
        set3Away: null,
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

  // ── SCHEDULE/RESCHEDULE ACTIONS ───────────────────────────────────────────
  const openScheduleModal = (fixtureId = null) => {
    if (fixtureId) {
      // Reschedule existing match
      const fx = fixtures.find(f => f.id === fixtureId);
      if (fx) {
        setScheduleModal(fixtureId);
        setScheduleDate(fx.matchDate || "");
        setScheduleTime(fx.matchTime || "");
        setScheduleHome(fx.home);
        setScheduleAway(fx.away);
      }
    } else {
      // Schedule new match
      setScheduleModal("new");
      const today = new Date().toISOString().split('T')[0];
      setScheduleDate(today);
      setScheduleTime("18:00");
      setScheduleHome("");
      setScheduleAway("");
    }
  };

  const closeScheduleModal = () => {
    setScheduleModal(null);
    setScheduleDate("");
    setScheduleTime("");
    setScheduleHome("");
    setScheduleAway("");
  };

  const saveSchedule = async () => {
    if (!isAdmin) return;
    
    if (scheduleModal === "new") {
      // Create new match
      if (!scheduleHome || !scheduleAway || scheduleHome === scheduleAway) {
        alert("Please select two different teams");
        return;
      }
      if (!scheduleDate || !scheduleTime) {
        alert("Please select date and time");
        return;
      }
      
      setSyncStatus("syncing");
      try {
        // Get next available ID
        const snapshot = await get(FIXTURES_REF);
        let maxId = 0;
        if (snapshot.exists()) {
          const data = snapshot.val();
          maxId = Math.max(...Object.values(data).map(f => f.id || 0));
        }
        
        const newFixture = {
          id: maxId + 1,
          week: 1, // Default week, can be calculated based on date if needed
          home: scheduleHome,
          away: scheduleAway,
          homeSets: null,
          awaySets: null,
          played: false,
          matchDate: scheduleDate,
          matchTime: scheduleTime
        };
        
        await set(ref(db, `fixtures/${newFixture.id}`), newFixture);
        setSyncStatus("connected");
        closeScheduleModal();
      } catch (err) {
        console.error("Failed to create fixture:", err);
        setSyncStatus("error");
      }
    } else {
      // Reschedule existing match
      if (!scheduleDate || !scheduleTime) {
        alert("Please select date and time");
        return;
      }
      
      setSavingId(scheduleModal);
      setSyncStatus("syncing");
      try {
        await update(ref(db, `fixtures/${scheduleModal}`), {
          matchDate: scheduleDate,
          matchTime: scheduleTime
        });
        setSyncStatus("connected");
        closeScheduleModal();
      } catch (err) {
        console.error("Failed to reschedule fixture:", err);
        setSyncStatus("error");
      } finally {
        setSavingId(null);
      }
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
              <div className="league-sub">Ramadan 2026 · 10 teams</div>
            </div>
          </div>
          <div className="header-stats">
            <div className="hstat"><div className="hstat-val">{fixtures.length}</div><div className="hstat-lbl">Fixtures</div></div>
            <div className="hstat"><div className="hstat-val">{totalPlayed}</div><div className="hstat-lbl">Played</div></div>
            <div className="hstat"><div className="hstat-val">{totalLeft}</div><div className="hstat-lbl">Left</div></div>
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
              <span>#</span><span>Team</span><span>P</span><span>W</span><span>L</span><span>GD</span><span>Form</span><span>PTS</span>
            </div>
            {standings.map((row, i) => {
              const diff = row.gamesFor - row.gamesAgainst; // Set difference = games won - games lost
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
                  <div className={`r-diff ${diff > 0 ? "pos" : diff < 0 ? "neg" : ""}`}>{diff > 0 ? "+" : ""}{diff}</div>
                  <div className="form-track">
                    {Array.from({length:3}).map((_, k) => {
                      const last3 = form.slice(-3);
                      const offset = 3 - last3.length;
                      const res = k < offset ? null : last3[k - offset];
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
                <span className="filter-lbl">Team</span>
                <select className="team-sel" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
                  <option value="All">All Teams</option>
                  {TEAM_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {isAdmin && (
                <>
                  <div className="filter-divider" />
                  <button className="btn-schedule-new" onClick={() => openScheduleModal()}>
                    + Schedule Match
                  </button>
                </>
              )}
              <span className="results-count">{filtered.length} match{filtered.length !== 1 ? "es" : ""}</span>
            </div>

            {datesToShow.length === 0 ? (
              <div className="empty"><div className="empty-icon">🔍</div><p>No matches found for this filter.</p></div>
            ) : (
              datesToShow.map(dateKey => {
                const dateFx = byDate[dateKey];
                const datePlayed = dateFx.filter(f => f.played).length;
                const dateObj = dateKey !== "Unscheduled" ? new Date(dateKey) : null;
                const dateLabel = dateKey === "Unscheduled" 
                  ? "Unscheduled" 
                  : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                
                return (
                  <div className="week-section" key={dateKey}>
                    <div className="week-header">
                      <div className="wk-label">{dateLabel}</div>
                      <div className="wk-line" />
                      <div className="wk-badge">{datePlayed}/{dateFx.length} played</div>
                    </div>
                    <div className="fx-grid">
                      {dateFx.map(f => {
                        const homeWin = f.played && f.homeSets > f.awaySets;
                        const awayWin = f.played && f.awaySets > f.homeSets;
                        const isSaving = savingId === f.id;
                        return (
                          <div key={f.id} className={`fx-card ${f.played ? "fx-played" : ""}`}>
                            <div className="fx-card-main">
                              {/* Team 1 */}
                              <div className="fx-team-col">
                                <span className={`fx-team-name ${homeWin ? "winner" : ""}`}>{f.home}</span>
                              </div>

                              {/* Score */}
                              <div className="fx-score-box">
                                {f.played ? (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    <div className="fx-score-val">{f.homeSets}–{f.awaySets}</div>
                                    {(f.set1Home !== null || f.set2Home !== null || f.set3Home !== null) && (
                                      <div style={{ fontSize: "10px", color: "var(--muted2)", letterSpacing: "0.8px" }}>
                                        {f.set1Home !== null && f.set1Away !== null && `${f.set1Home}-${f.set1Away}`}
                                        {f.set2Home !== null && f.set2Away !== null && ` ${f.set2Home}-${f.set2Away}`}
                                        {f.set3Home !== null && f.set3Away !== null && ` ${f.set3Home}-${f.set3Away}`}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                    {f.matchTime && <span className="fx-time-tag" style={{ fontSize: "9px", marginBottom: "2px" }}>{f.matchTime}</span>}
                                    <div className="fx-score-vs">{isSaving ? "…" : "VS"}</div>
                                  </div>
                                )}
                              </div>

                              {/* Team 2 */}
                              <div className="fx-team-col away">
                                <span className={`fx-team-name ${awayWin ? "winner" : ""}`}>{f.away}</span>
                              </div>
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
                                  {f.played ? "Edit Score" : "Set Score"}
                                </button>
                                <button
                                  className="btn-reschedule"
                                  onClick={() => openScheduleModal(f.id)}
                                  disabled={isSaving}
                                >
                                  {f.matchDate ? "Reschedule" : "Schedule"}
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
      {modalFx && isAdmin && <ScoreModal 
        fixture={modalFx}
        onClose={() => setScoreModal(null)}
        onSave={applyScore}
        saving={savingId === modalFx.id}
      />}

      {/* ── SCHEDULE/RESCHEDULE MODAL (admin only) ── */}
      {scheduleModal && isAdmin && (
        <div className="modal-overlay" onClick={closeScheduleModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="score-modal-title">
              {scheduleModal === "new" ? "Schedule New Match" : "Reschedule Match"}
            </div>
            <div className="score-modal-sub">
              {scheduleModal === "new" 
                ? "Select teams, date, and time for the match" 
                : "Update the date and time for this match"}
            </div>
            
            {scheduleModal === "new" && (
              <>
                <label className="pw-label">Team 1</label>
                <select 
                  className="team-sel" 
                  value={scheduleHome} 
                  onChange={e => setScheduleHome(e.target.value)}
                  style={{ width: "100%", marginBottom: "16px" }}
                >
                  <option value="">Select team</option>
                  {TEAM_NAMES.filter(t => t !== scheduleAway).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                
                <label className="pw-label">Team 2</label>
                <select 
                  className="team-sel" 
                  value={scheduleAway} 
                  onChange={e => setScheduleAway(e.target.value)}
                  style={{ width: "100%", marginBottom: "16px" }}
                >
                  <option value="">Select team</option>
                  {TEAM_NAMES.filter(t => t !== scheduleHome).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </>
            )}
            
            <label className="pw-label">Match Date</label>
            <input
              type="date"
              className="pw-input"
              value={scheduleDate}
              onChange={e => setScheduleDate(e.target.value)}
              style={{ marginBottom: "16px" }}
            />
            
            <label className="pw-label">Match Time</label>
            <input
              type="time"
              className="pw-input"
              value={scheduleTime}
              onChange={e => setScheduleTime(e.target.value)}
              style={{ marginBottom: "20px" }}
            />
            
            <button className="btn-login" onClick={saveSchedule}>
              {scheduleModal === "new" ? "Schedule Match" : "Update Schedule"}
            </button>
            <button className="btn-cancel" onClick={closeScheduleModal}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
