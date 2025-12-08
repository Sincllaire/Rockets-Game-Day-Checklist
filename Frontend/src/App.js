import React, { useState, useEffect } from "react";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const APP_PASSWORD = process.env.REACT_APP_APP_PASSWORD || "rockets-temp-password";
const techOptions = ["(unassigned)", "Sinclaire Hoyt", "Tech 1", "Tech 2", "Tech 3"];

const initialSections = {
  preGame: {
    name: "PRE-GAME SETUP CHECKLIST",
    techName: "(unassigned)",
    items: [
      { id: "pg-1", label: "Front Table/Benches/Arena Floor", completed: false },
      { id: "pg-2", label: "D-VOM Media Tables | Section 124", completed: false },
      { id: "pg-3", label: "East Club Stats Table | Section 121", completed: false },
      { id: "pg-4", label: "West Club | Section 104, 105, 106, 108", completed: false },
    ],
    managerVerified: false,
    verifiedAt: null,
  },
  postGame: {
    name: "POST-GAME CHECKLIST",
    techName: "(unassigned)",
    items: [
      { id: "post-1", label: "Front Table/Benches/Arena Floor", completed: false },
      { id: "post-2", label: "D-VOM Media Tables | Section 124", completed: false },
      { id: "post-3", label: "East Club Stats Table | Section 121", completed: false },
      { id: "post-4", label: "West Club | Section 104, 105, 106, 108", completed: false },
    ],
    managerVerified: false,
    verifiedAt: null,
  },
  bbOps: {
    name: "BBOps tech checklist",
    techName: "(manager-only section)",
    items: [
      { id: "bb-1", label: "NBA Forms", completed: false },
      { id: "bb-2", label: "System Test", completed: false },
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

  // Current game pulled from backend 
  const [currentGame, setCurrentGame] = useState(null);
  const [gameError, setGameError] = useState(null);

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

      {/* Error banner only if fetch failed */}
      {gameError && <div className="error-banner">{gameError}</div>}

      <header className="app-header">
        <div className="game-title">
          {currentGame ? currentGame.opponent : "TBD"}
        </div>
        <div className="game-meta">
          <span>{currentGame ? currentGame.date : "--"}</span>
          {" • "}
          <span>{currentGame ? currentGame.time : "--"}</span>
        </div>
        <div className="game-manager">
          Assigned Manager:{" "}
          {currentGame ? currentGame.managerName : "TBD"}
        </div>
      </header>

      <main>
        <Section
          sectionKey="preGame"
          section={sections.preGame}
          canVerify={canVerify}
          isAdmin={isAdmin}
          visible={true}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
          onAdminEdit={isAdmin ? handleAdminEdit : undefined}
          onAssignTech={handleAssignTech}
        />
        <Section
          sectionKey="postGame"
          section={sections.postGame}
          canVerify={canVerify}
          isAdmin={isAdmin}
          visible={true}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
          onAdminEdit={isAdmin ? handleAdminEdit : undefined}
          onAssignTech={handleAssignTech}
        />
        <Section
          sectionKey="bbOps"
          section={sections.bbOps}
          canVerify={canVerify}
          isAdmin={isAdmin}
          visible={showBbOps}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
          onAdminEdit={isAdmin ? handleAdminEdit : undefined}
          onAssignTech={handleAssignTech}
        />
      </main>
    </div>
  );
}

export default App;
