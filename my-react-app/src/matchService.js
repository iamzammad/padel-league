import { database } from "./firebase";
import { ref, set, update, push, get, onValue, query, orderByChild } from "firebase/database";

// ──────────────────────────────────────────────────────────────────────────
// SAVE A NEW MATCH SCORE
// ──────────────────────────────────────────────────────────────────────────
export const saveMatchScore = async (matchData) => {
  try {
    const matchesRef = ref(database, "matches");
    const newMatchRef = push(matchesRef);
    
    const timestamp = new Date().toISOString();
    const dataToSave = {
      ...matchData,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await set(newMatchRef, dataToSave);
    return { id: newMatchRef.key, ...dataToSave };
  } catch (error) {
    console.error("Error saving match score:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// UPDATE AN EXISTING MATCH SCORE
// ──────────────────────────────────────────────────────────────────────────
export const updateMatchScore = async (matchId, updates) => {
  try {
    const matchRef = ref(database, `matches/${matchId}`);
    const dataToUpdate = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await update(matchRef, dataToUpdate);
    return dataToUpdate;
  } catch (error) {
    console.error("Error updating match score:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// FETCH ALL MATCHES
// ──────────────────────────────────────────────────────────────────────────
export const getAllMatches = async () => {
  try {
    const matchesRef = ref(database, "matches");
    const snapshot = await get(matchesRef);
    
    if (snapshot.exists()) {
      const matches = [];
      snapshot.forEach((childSnapshot) => {
        matches.push({
          id: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
      return matches;
    }
    return [];
  } catch (error) {
    console.error("Error fetching matches:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// FETCH A SINGLE MATCH BY ID
// ──────────────────────────────────────────────────────────────────────────
export const getMatchById = async (matchId) => {
  try {
    const matchRef = ref(database, `matches/${matchId}`);
    const snapshot = await get(matchRef);
    
    if (snapshot.exists()) {
      return {
        id: matchId,
        ...snapshot.val(),
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching match:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// REAL-TIME LISTENER FOR ALL MATCHES
// ──────────────────────────────────────────────────────────────────────────
export const subscribeToMatches = (callback) => {
  try {
    const matchesRef = ref(database, "matches");
    
    const unsubscribe = onValue(matchesRef, (snapshot) => {
      if (snapshot.exists()) {
        const matches = [];
        snapshot.forEach((childSnapshot) => {
          matches.push({
            id: childSnapshot.key,
            ...childSnapshot.val(),
          });
        });
        callback(matches);
      } else {
        callback([]);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error subscribing to matches:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// SAVE MATCH RESULT WITH TEAM STATS
// ──────────────────────────────────────────────────────────────────────────
export const saveCompleteMatch = async (fixtureId, matchData) => {
  try {
    const completedMatchRef = ref(database, `matches/${fixtureId}`);
    
    const dataToSave = {
      fixtureId,
      homeTeam: matchData.home,
      awayTeam: matchData.away,
      homeSets: matchData.homeSets,
      awaySets: matchData.awaySets,
      played: true,
      winner: matchData.homeSets > matchData.awaySets ? matchData.home : matchData.away,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await set(completedMatchRef, dataToSave);
    return { id: fixtureId, ...dataToSave };
  } catch (error) {
    console.error("Error saving complete match:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// SAVE STANDING (LEAGUE TABLE) TO FIREBASE
// ──────────────────────────────────────────────────────────────────────────
export const saveTeamStandings = async (teamName, standingsData) => {
  try {
    const standingRef = ref(database, `standings/${teamName}`);
    
    const dataToSave = {
      teamName,
      ...standingsData,
      updatedAt: new Date().toISOString(),
    };

    await set(standingRef, dataToSave);
    return dataToSave;
  } catch (error) {
    console.error("Error saving standings:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// FETCH ALL STANDINGS
// ──────────────────────────────────────────────────────────────────────────
export const getAllStandings = async () => {
  try {
    const standingsRef = ref(database, "standings");
    const snapshot = await get(standingsRef);
    
    if (snapshot.exists()) {
      const standings = [];
      snapshot.forEach((childSnapshot) => {
        standings.push({
          teamName: childSnapshot.key,
          ...childSnapshot.val(),
        });
      });
      return standings;
    }
    return [];
  } catch (error) {
    console.error("Error fetching standings:", error);
    throw error;
  }
};

// ──────────────────────────────────────────────────────────────────────────
// DELETE A MATCH
// ──────────────────────────────────────────────────────────────────────────
export const deleteMatch = async (matchId) => {
  try {
    const matchRef = ref(database, `matches/${matchId}`);
    await set(matchRef, null);
    return { success: true };
  } catch (error) {
    console.error("Error deleting match:", error);
    throw error;
  }
};
