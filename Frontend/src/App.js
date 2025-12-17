import React, { useState, useEffect } from "react";
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

// Fallback to show initial thought process/build
const initialSections = {
  preGame: {
    name: "PRE-GAME SETUP CHECKLIST",
    techName: "(unassigned)",
    items: [],
    managerVerified: false,
    verifiedAt: null,
  },
  postGame: {
    name: "POST-GAME CHECKLIST",
    techName: "(unassigned)",
    items: [],
    managerVerified: false,
    verifiedAt: null,
  },
  bbOps: {
    name: "BBOps tech checklist",
    techName: "(manager-only section)",
    items: [],
    managerVerified: false,
    verifiedAt: null,
  },
};

function getGameKey(game) {
  if (!game?.date || !game?.opponent) return null;
  return `${game.date}__${game.opponent}`;
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

  const hasTasks = Array.isArray(section.tasks);

  // Completion counts (section-level)
  const allItems = hasTasks
    ? section.tasks.flatMap((t) => (Array.isArray(t.items) ? t.items : []))
    : Array.isArray(section.items)
    ? section.items
    : [];

  const total = allItems.length;
  const completedCount = allItems.filter((i) => i.completed).length;

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
          {!hasTasks && (
            <div className="section-subtitle">
              {section.techName ? `Tech: ${section.techName}` : "Tech: (unassigned)"}
            </div>
          )}
        </div>
        <div className="section-progress">
          {completedCount}/{total} completed
        </div>
      </button>

      {open && (
        <div className="section-body">
          {/* OLD format: section.items */}
          {!hasTasks && (
            <>
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
                {(Array.isArray(section.items) ? section.items : []).map((item) => (
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

              <div className="manager-verification">
                {canVerify && (
                  <label>
                    <input
                      type="checkbox"
                      disabled={total === 0 || completedCount !== total}
                      checked={!!section.managerVerified}
                      onChange={() => onToggleManagerVerified(sectionKey)}
                    />
                    <span>
                      Manager verification
                      {!(total > 0 && completedCount === total) &&
                        " (available when all items are completed)"}
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
            </>
          )}

          {/* NEW format: section.tasks */}
          {hasTasks && (
            <div className="task-groups">
              {section.tasks.map((task) => {
                const taskItems = Array.isArray(task.items) ? task.items : [];
                const taskTotal = taskItems.length;
                const taskCompleted = taskItems.filter((i) => i.completed).length;
                const taskAllDone = taskTotal > 0 && taskCompleted === taskTotal;

                return (
                  <details key={task.id} className="task-group">
                    <summary className="task-group-header">
                      <span className="task-title">{task.title}</span>

                      <span className="task-assigned-tech">
                        {task.assignedTech && task.assignedTech !== "(unassigned)"
                          ? task.assignedTech
                          : "Unassigned"}
                      </span>

                      <span className="task-progress">
                        {taskCompleted}/{taskTotal}
                      </span>
                    </summary>

                    {task.subtitle && (
                      <div className="task-subtitle-text">{task.subtitle}</div>
                    )}

                    {canAssign && onAssignTech && (
                      <div className="tech-assign">
                        <label className="assign-tech-label">
                          <span className="assign-tech-text">Assigned Tech:</span>
                          <select
                            className="assign-tech-select"
                            value={task.assignedTech || "(unassigned)"}
                            onChange={(e) =>
                              onAssignTech(sectionKey, e.target.value, task.id)
                            }
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
                      {taskItems.map((item) => (
                        <li key={item.id} className="checklist-item">
                          <label>
                            <input
                              type="checkbox"
                              checked={!!item.completed}
                              onChange={() =>
                                onToggleItem(sectionKey, item.id, task.id)
                              }
                            />
                            <span>{item.label}</span>
                          </label>
                        </li>
                      ))}
                    </ul>

                    <div className="manager-verification">
                      {canVerify && (
                        <label>
                          <input
                            type="checkbox"
                            disabled={!taskAllDone}
                            checked={!!task.managerVerified}
                            onChange={() => {
                              if (taskAllDone) {
                                onToggleManagerVerified(sectionKey, task.id);
                              }
                            }}
                          />
                          <span>
                            Manager verification
                            {!taskAllDone &&
                              " (available when all items are completed)"}
                          </span>
                        </label>
                      )}

                      <div className="manager-timestamp">
                        {task.managerVerified && task.verifiedAt
                          ? `Verified by manager at: ${task.verifiedAt}`
                          : "Awaiting manager verification"}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
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

  const [role, setRole] = useState("MANAGER");
  const [sections, setSections] = useState(initialSections);

  const [currentGame, setCurrentGame] = useState(null);
  const [gameError, setGameError] = useState(null);
  const [checklistsError, setChecklistsError] = useState(null);

  // NEW: flags for localStorage persistence
  const [checklistsLoaded, setChecklistsLoaded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load checklist definitions from backend ONCE
  useEffect(() => {
    async function loadChecklists() {
      try {
        const res = await fetch(`${API_BASE_URL}/checklists`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        setSections(data);
        setChecklistsError(null);
      } catch (err) {
        console.error("Error fetching checklists:", err);
        setChecklistsError("Unable to load checklists from server. Using backup.");
        setSections(initialSections);
      } finally {
        setChecklistsLoaded(true);
      }
    }
    loadChecklists();
  }, []);

  // Load current game
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

  // NEW: hydrate sections from localStorage AFTER game + checklist template exist
  useEffect(() => {
    if (!currentGame) return;
    if (!checklistsLoaded) return;

    const key = getGameKey(currentGame);
    if (!key) return;

    const stored = localStorage.getItem(`sections_${key}`);
    if (stored) {
      try {
        setSections(JSON.parse(stored));
      } catch (e) {
        console.error("Bad saved sections JSON, ignoring.");
      }
    }
    setHydrated(true);
  }, [currentGame, checklistsLoaded]);

  // NEW: save progress whenever sections change (only after hydrate)
  useEffect(() => {
    if (!currentGame) return;
    if (!hydrated) return;

    const key = getGameKey(currentGame);
    if (!key) return;

    localStorage.setItem(`sections_${key}`, JSON.stringify(sections));
  }, [sections, currentGame, hydrated]);

  const handleToggleItem = (sectionKey, itemId, taskId = null) => {
    setSections((prev) => {
      const section = prev[sectionKey];
      if (!section) return prev;

      // NEW: section.tasks[]
      if (taskId && Array.isArray(section.tasks)) {
        const tasks = section.tasks.map((t) => {
          if (t.id !== taskId) return t;

          const items = (Array.isArray(t.items) ? t.items : []).map((item) =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
          );

          const anyIncomplete = items.some((i) => !i.completed);

          return {
            ...t,
            items,
            managerVerified: anyIncomplete ? false : !!t.managerVerified,
            verifiedAt: anyIncomplete ? null : t.verifiedAt,
          };
        });

        return { ...prev, [sectionKey]: { ...section, tasks } };
      }

      // OLD: section.items[]
      const items = (Array.isArray(section.items) ? section.items : []).map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      );

      const anyIncomplete = items.some((i) => !i.completed);

      return {
        ...prev,
        [sectionKey]: {
          ...section,
          items,
          managerVerified: anyIncomplete ? false : !!section.managerVerified,
          verifiedAt: anyIncomplete ? null : section.verifiedAt,
        },
      };
    });
  };

  const handleToggleManagerVerified = (sectionKey, taskId = null) => {
    setSections((prev) => {
      const section = prev[sectionKey];
      if (!section) return prev;

      const formatted = new Date().toLocaleString();

      // NEW: per-task verify
      if (taskId && Array.isArray(section.tasks)) {
        const tasks = section.tasks.map((t) => {
          if (t.id !== taskId) return t;
          const nextVerified = !t.managerVerified;
          return {
            ...t,
            managerVerified: nextVerified,
            verifiedAt: nextVerified ? formatted : null,
          };
        });

        return { ...prev, [sectionKey]: { ...section, tasks } };
      }

      // OLD: section-level verify
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

  const handleAssignTech = (sectionKey, techName, taskId = null) => {
    setSections((prev) => {
      const section = prev[sectionKey];
      if (!section) return prev;

      const displayName =
        techName === "(unassigned)" || techName.trim() === ""
          ? "(unassigned)"
          : techName;

      // NEW: per-task assignment
      if (taskId && Array.isArray(section.tasks)) {
        const tasks = section.tasks.map((t) =>
          t.id === taskId ? { ...t, assignedTech: displayName } : t
        );
        return { ...prev, [sectionKey]: { ...section, tasks } };
      }

      // OLD: section-level assignment
      return {
        ...prev,
        [sectionKey]: { ...section, techName: displayName },
      };
    });
  };

  const handleAdminEdit = (sectionKey) => {
    const sectionName = sections[sectionKey]?.name || sectionKey;
    alert(`Admin edit mode for: ${sectionName} (to be implemented later).`);
  };

  const isAdmin = role === "ADMIN";
  const canVerify = role === "MANAGER" || role === "ADMIN";
  const showBbOps = role !== "TECH";

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

      <div className="logout-bottom-container">
        <button className="logout-button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}

export default App;
