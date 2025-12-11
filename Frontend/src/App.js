import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE_URL = "https://rockets-game-day-checklist.onrender.com";
const APP_PASSWORD = process.env.REACT_APP_APP_PASSWORD || "rockets-temp-password";
console.log("API_BASE_URL in this build is:", API_BASE_URL);
const techOptions = ["(unassigned)", "Sinclaire Hoyt", "Tech 1", "Tech 2", "Tech 3"];

const initialSections = {
  preGame: {
    name: "PRE-GAME SETUP CHECKLIST",
    techName: "(unassigned)",
    items: [
      {
        id: "pg-placeholder-1",
        label: "Checklist will load from server...",
        completed: false,
      },
    ],
    managerVerified: false,
    verifiedAt: null,
  },
  postGame: {
    name: "POST-GAME CHECKLIST",
    techName: "(unassigned)",
    items: [
      {
        id: "post-placeholder-1",
        label: "Checklist will load from server...",
        completed: false,
      },
    ],
    managerVerified: false,
    verifiedAt: null,
  },
  bbOps: {
    name: "BBOPS CHECKLIST",
    techName: "(unassigned)",
    items: [
      {
        id: "bb-placeholder-1",
        label: "Checklist will load from server...",
        completed: false,
      },
    ],
    managerVerified: false,
    verifiedAt: null,
  },
};


function Section({
  sectionKey,
  section,
  canVerify,
  isAdmin,
  visible,
  onToggleItem,
  onToggleManagerVerified,
  onAdminEdit,
  onAssignTech,
}) {
  const [open, setOpen] = useState(true);

  if (!visible) return null;

  const total = section.items.length;
  const completedCount = section.items.filter((i) => i.completed).length;
  const allCompleted = total > 0 && completedCount === total;

  const canAssign = isAdmin || canVerify;

  return (
    <div className="section">
      <button
        className="section-header"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <div>
          <div className="section-title">{section.name}</div>
          <div className="section-subtitle">
            {section.techName ? `Tech: ${section.techName}` : "Tech: (unassigned)"}
          </div>
        </div>
        <div className="section-progress">
          {completedCount}/{total} completed
        </div>
      </button>

      {open && (
        <div className="section-body">
          {/* Tech assignment dropdown */}
          {canAssign && onAssignTech && (
            <div className="tech-assign">
              <label className="assign-tech-label">
                <span className="assign-tech-text">Assigned Tech:</span>
                <select
                  className="assign-tech-select"
                  value={section.techName || "(unassigned)"}
                  onChange={(e) => onAssignTech(sectionKey, e.target.value)}
                >
                  {techOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          
          <ul className="checklist">
            {section.items.map((item) => (
              <li key={item.id} className="checklist-item">
                <label>
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => onToggleItem(sectionKey, item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              </li>
            ))}
          </ul>
          {/* Manager verification + status */}
          <div className="manager-verification">
            {canVerify && (
              <label>
                <input
                  type="checkbox"
                  disabled={!allCompleted}
                  checked={section.managerVerified}
                  onChange={() => {
                    if (allCompleted) {
                      onToggleManagerVerified(sectionKey);
                    }
                  }}
                />
                <span>
                  Manager verification
                  {!allCompleted && " (available when all items are completed)"}
                </span>
              </label>
            )}

            <div className="manager-timestamp">
              {section.managerVerified && section.verifiedAt
                ? `Verified by manager at: ${section.verifiedAt}`
                : "Awaiting manager verification"}
            </div>

            {isAdmin && onAdminEdit && (
              <div className="admin-controls">
                <button
                  type="button"
                  className="admin-edit-button"
                  onClick={() => onAdminEdit(sectionKey)}
                >
                  Edit checklist (admin only)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleSelector({ role, onChange }) {
  return (
    <div className="role-selector">
      <span className="role-label">View as:</span>
      <select
        value={role}
        onChange={(e) => onChange(e.target.value)}
        className="role-select"
      >
        <option value="ADMIN">Admin</option>
        <option value="MANAGER">Manager</option>
        <option value="TECH">Tech</option>
      </select>
    </div>
  );
}
function getGameKey(game) {
  if (!game || !game.date || !game.opponent) return null;
  return `${game.date}_${game.opponent}`;
}

function App() {
  // LOGIN STATE
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // read from localStorage so refresh keeps them logged in
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginPassword === APP_PASSWORD) {
      setIsLoggedIn(true);
      localStorage.setItem("isLoggedIn", "true");
      setLoginError("");
      setLoginPassword("");
    } else {
      setLoginError("Incorrect password");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("isLoggedIn");
  };
  // For now, role is picked manually in the UI.
  const [role, setRole] = useState("MANAGER");
  const [sections, setSections] = useState(initialSections);
  

  
  const [gameError, setGameError] = useState(null);
  const [checklistsError, setChecklistsError] = useState(null);
    // Load checklist definitions (directions) from backend once on mount
  useEffect(() => {
    async function loadChecklists() {
      try {
        console.log("Fetching checklists from backend...", API_BASE_URL);
        const res = await fetch(`${API_BASE_URL}/checklists`);

        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("Got checklist data:", data);

        // Replace placeholder initialSections with data from the server
        setSections(data);
        setChecklistsError(null);
      } catch (err) {
        console.error("Error fetching checklists:", err);
        setChecklistsError(
          "Unable to load latest checklists from server. Using backup version."
        );
        // Fall back to the hard-coded backup
        setSections(initialSections);
      }
    }

    loadChecklists();
  }, []);

// Current game pulled from backend 
  const [currentGame, setCurrentGame] = useState(null);


// Load current game from backend
  useEffect(() => {
    async function loadCurrentGame() {
      try {
        console.log("Fetching current game from backend...");
        const res = await fetch(`${API_BASE_URL}/current-game`);

        if (!res.ok) {
          throw new Error("HTTP " + res.status);
        }

        const data = await res.json();
        console.log("Got current game data:", data);
        setCurrentGame(data);
        setGameError(null);
      } catch (err) {
        console.error("Error fetching current game:", err);
        setGameError("Could not load current game from server.");
      }
    }

    loadCurrentGame();
  }, []);
    // Load saved sections for this game
  useEffect(() => {
    if (!currentGame) return;

    const gameKey = getGameKey(currentGame);
    if (!gameKey) return;

    const stored = localStorage.getItem(`sections_${gameKey}`);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSections(parsed);
      } catch (err) {
        console.error("Failed to parse stored sections:", err);
        setSections(initialSections);
      }
    } else {
      // No saved data for this game; keep whatever template is already in `sections`
      console.log(
        "No saved sections for this game; keeping existing checklist template"
      );
    }
  }, [currentGame]);
    // Save sections whenever they change
  useEffect(() => {
    if (!currentGame) return;

    const gameKey = getGameKey(currentGame);
    if (!gameKey) return;

    localStorage.setItem(`sections_${gameKey}`, JSON.stringify(sections));
  }, [sections, currentGame]);

  const handleToggleItem = (sectionKey, itemId) => {
    setSections((prev) => {
      const section = prev[sectionKey];
      const items = section.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const anyIncomplete = items.some((i) => !i.completed);

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          items,
          managerVerified: anyIncomplete ? false : section.managerVerified,
          verifiedAt: anyIncomplete ? null : section.verifiedAt,
        },
      };
    });
  };

  const handleToggleManagerVerified = (sectionKey) => {
    setSections((prev) => {
      const section = prev[sectionKey];

      const now = new Date();
      const formatted = now.toLocaleString();

      const nextVerified = !section.managerVerified;

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          managerVerified: nextVerified,
          verifiedAt: nextVerified ? formatted : null,
        },
      };
    });
  };

  const handleAssignTech = (sectionKey, techName) => {
    setSections((prev) => {
      const section = prev[sectionKey];

      const displayName =
        techName === "(unassigned)" || techName.trim() === ""
          ? "(unassigned)"
          : techName;

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          techName: displayName,
        },
      };
    });
  };

  const handleAdminEdit = (sectionKey) => {
    const sectionName = sections[sectionKey].name;
    alert(`Admin edit mode for: ${sectionName} (to be implemented later).`);
  };

  const isAdmin = role === "ADMIN";
  const canVerify = role === "MANAGER" || role === "ADMIN";
  const showBbOps = role !== "TECH";

  // If not logged in yet, show login screen instead of the app
  if (!isLoggedIn) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1 className="login-title">Rockets Game Day Checklist</h1>
          <form onSubmit={handleLoginSubmit} className="login-form">
            <label className="login-label">
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="login-input"
              />
            </label>
            {loginError && <div className="login-error">{loginError}</div>}
            <button type="submit" className="login-button">
              Log In
            </button>
          </form>
        </div>
      </div>
    );
  }
  //login to and see app if successful

  return (
  <div className="app-container">
    <RoleSelector role={role} onChange={setRole} />

    {gameError && <div className="error-banner">{gameError}</div>}

    <header className="app-header">
      <div className="header-top-row">
        <div className="header-title">
          {currentGame ? currentGame.opponent : "TBD"}
        </div>
      </div>

      <div className="game-meta">
        <span>{currentGame ? currentGame.date : "--"}</span> •{" "}
        <span>{currentGame ? currentGame.time : "--"}</span>
      </div>
      <div className="game-manager">
        Assigned Manager: {currentGame ? currentGame.managerName : "TBD"}
      </div>
    </header>

    {/* <-- ADD FROM HERE DOWN */}
    {checklistsError && (
      <div className="error-banner">
        {checklistsError}
      </div>
    )}

    <main className="sections-layout">
      {sections?.preGame && (
        <Section
          sectionKey="preGame"
          section={sections.preGame}
          canVerify={role === "MANAGER" || role === "ADMIN"}
          isAdmin={role === "ADMIN"}
          visible={true}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
          onAssignTech={handleAssignTech}
        />
      )}

      {sections?.postGame && (
        <Section
          sectionKey="postGame"
          section={sections.postGame}
          canVerify={role === "MANAGER" || role === "ADMIN"}
          isAdmin={role === "ADMIN"}
          visible={true}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
          onAssignTech={handleAssignTech}
        />
      )}

      {sections?.bbOps && (
        <Section
          sectionKey="bbOps"
          section={sections.bbOps}
          canVerify={role === "MANAGER" || role === "ADMIN"}
          isAdmin={role === "ADMIN"}
          visible={role !== "TECH"}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
          onAssignTech={handleAssignTech}
        />
        
      )}
      <button className="logout-button" onClick={handleLogout}>
        Log Out
      </button>
    </main>
  </div>
)
}
export default App;
