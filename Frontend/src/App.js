import React, { useEffect, useState } from "react";
import "./App.css";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const APP_PASSWORD =
  process.env.REACT_APP_APP_PASSWORD || "rockets-temp-password";

const techOptions = [
  "(unassigned)",
  "Sinclaire Hoyt",
  "Tech 1",
  "Tech 2",
  "Tech 3",
];

// Fallback only (shown briefly before backend loads OR if backend fails)
const initialSections = {
  preGame: {
    name: "PRE-GAME SETUP CHECKLIST",
    techName: "(unassigned)",
    items: [{ id: "pg-placeholder-1", label: "Checklist will load from server...", completed: false }],
    managerVerified: false,
    verifiedAt: null,
  },
  postGame: {
    name: "POST-GAME CHECKLIST",
    techName: "(unassigned)",
    items: [{ id: "post-placeholder-1", label: "Checklist will load from server...", completed: false }],
    managerVerified: false,
    verifiedAt: null,
  },
  bbOps: {
    name: "BBOPS TECH CHECKLIST",
    techName: "(manager-only section)",
    items: [{ id: "bb-placeholder-1", label: "Checklist will load from server...", completed: false }],
    managerVerified: false,
    verifiedAt: null,
  },
};

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
  if (!section) return null;

  const items = Array.isArray(section.items) ? section.items : [];
  const total = items.length;
  const completedCount = items.filter((i) => i.completed).length;
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
          <div className="section-title">{section.name || sectionKey}</div>
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

          {/* Checklist items */}
          <ul className="checklist">
            {items.map((item) => (
              <li key={item.id} className="checklist-item">
                <label>
                  <input
                    type="checkbox"
                    checked={!!item.completed}
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
                  checked={!!section.managerVerified}
                  onChange={() => {
                    if (allCompleted) onToggleManagerVerified(sectionKey);
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

export default function App() {
  // LOGIN STATE
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Role
  const [role, setRole] = useState("MANAGER");

  // Data
  const [sections, setSections] = useState(initialSections);
  const [currentGame, setCurrentGame] = useState(null);

  // Errors
  const [gameError, setGameError] = useState(null);
  const [checklistsError, setChecklistsError] = useState(null);

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

  // Load checklist definitions (private instructions) from backend
  useEffect(() => {
    async function loadChecklists() {
      try {
        const res = await fetch(`${API_BASE_URL}/checklists`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();

        // Basic safety: ensure object
        if (!data || typeof data !== "object") {
          throw new Error("Invalid checklist JSON shape");
        }

        setSections(data);
        setChecklistsError(null);
      } catch (err) {
        console.error("Error fetching checklists:", err);
        setChecklistsError(
          "Unable to load latest checklists from server. Using backup version."
        );
        setSections(initialSections);
      }
    }

    loadChecklists();
  }, []);

  // Load current game from backend
  useEffect(() => {
    async function loadCurrentGame() {
      try {
        const res = await fetch(`${API_BASE_URL}/current-game`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
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
      const section = prev?.[sectionKey];
      if (!section) return prev;

      const items = Array.isArray(section.items) ? section.items : [];
      const nextItems = items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const anyIncomplete = nextItems.some((i) => !i.completed);

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          items: nextItems,
          managerVerified: anyIncomplete ? false : !!section.managerVerified,
          verifiedAt: anyIncomplete ? null : section.verifiedAt,
        },
      };
    });
  };

  const handleToggleManagerVerified = (sectionKey) => {
    setSections((prev) => {
      const section = prev?.[sectionKey];
      if (!section) return prev;

      const now = new Date().toLocaleString();
      const nextVerified = !section.managerVerified;

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          managerVerified: nextVerified,
          verifiedAt: nextVerified ? now : null,
        },
      };
    });
  };

  const handleAssignTech = (sectionKey, techName) => {
    setSections((prev) => {
      const section = prev?.[sectionKey];
      if (!section) return prev;

      const displayName =
        techName === "(unassigned)" || !techName || techName.trim() === ""
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
    const sectionName = sections?.[sectionKey]?.name || sectionKey;
    alert(`Admin edit mode for: ${sectionName} (to be implemented later).`);
  };

  const isAdmin = role === "ADMIN";
  const canVerify = role === "MANAGER" || role === "ADMIN";
  const showBbOps = role !== "TECH";

  // LOGIN SCREEN
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

  // APP UI
  return (
    <div className="app-container">
      <RoleSelector role={role} onChange={setRole} />

      {gameError && <div className="error-banner">{gameError}</div>}
      {checklistsError && <div className="error-banner">{checklistsError}</div>}

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

      <main className="sections-layout">
        {sections &&
          Object.entries(sections).map(([key, section]) => (
            <Section
              key={key}
              sectionKey={key}
              section={section}
              canVerify={canVerify}
              isAdmin={isAdmin}
              visible={key !== "bbOps" || showBbOps}
              onToggleItem={handleToggleItem}
              onToggleManagerVerified={handleToggleManagerVerified}
              onAdminEdit={isAdmin ? handleAdminEdit : undefined}
              onAssignTech={handleAssignTech}
            />
          ))}
      </main>

      <div className="logout-bottom-container">
        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
