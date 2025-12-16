import React, { useEffect, useMemo, useState } from "react";
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

// Safe fallback so the UI never crashes if backend is down
const initialSections = {
  preGame: {
    name: "PRE-GAME SETUP CHECKLIST",
    groups: [
      {
        id: "pg-fallback-1",
        title: "Loading…",
        subtitle: "",
        techName: "(unassigned)",
        items: [{ id: "pg-fallback-item-1", label: "Loading from server…", completed: false }],
        managerVerified: false,
        verifiedAt: null,
      },
    ],
  },
  postGame: {
    name: "POST-GAME CHECKLIST",
    groups: [
      {
        id: "post-fallback-1",
        title: "Loading…",
        subtitle: "",
        techName: "(unassigned)",
        items: [{ id: "post-fallback-item-1", label: "Loading from server…", completed: false }],
        managerVerified: false,
        verifiedAt: null,
      },
    ],
  },
  bbOps: {
    name: "BBOPS TECH CHECKLIST",
    groups: [
      {
        id: "bb-fallback-1",
        title: "Loading…",
        subtitle: "",
        techName: "(unassigned)",
        items: [{ id: "bb-fallback-item-1", label: "Loading from server…", completed: false }],
        managerVerified: false,
        verifiedAt: null,
      },
    ],
  },
};

// --- Helpers ---
function getGameKey(game) {
  if (!game || !game.date || !game.opponent) return null;
  return `${game.date}_${game.opponent}`;
}

// Converts ANY backend shape into the shape the UI expects:
// section.groups[] with group.techName + group.items[]
function normalizeSections(raw) {
  const src = raw && typeof raw === "object" ? raw : initialSections;
  const out = {};

  for (const [sectionKey, sectionVal] of Object.entries(src)) {
    const section = sectionVal || {};
    const name = section.name || sectionKey;

    // If backend already has groups, keep them.
    if (Array.isArray(section.groups)) {
      out[sectionKey] = {
        name,
        groups: section.groups.map((g, idx) => ({
          id: g.id || `${sectionKey}-g${idx + 1}`,
          title: g.title || "Untitled",
          subtitle: g.subtitle || "",
          techName: g.techName || "(unassigned)",
          items: Array.isArray(g.items) ? g.items : [],
          managerVerified: !!g.managerVerified,
          verifiedAt: g.verifiedAt || null,
        })),
      };
      continue;
    }

    // If backend is older shape: section.items[], wrap into 1 group.
    const items = Array.isArray(section.items) ? section.items : [];
    out[sectionKey] = {
      name,
      groups: [
        {
          id: `${sectionKey}-g1`,
          title: name,
          subtitle: "",
          techName: section.techName || "(unassigned)",
          items,
          managerVerified: !!section.managerVerified,
          verifiedAt: section.verifiedAt || null,
        },
      ],
    };
  }

  return out;
}

function hasRealChecklist(sections) {
  const pre = sections?.preGame?.groups?.[0]?.items;
  return Array.isArray(pre) && pre.length > 0;
}

// --- UI Components ---
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

function Group({
  sectionKey,
  group,
  canAssign,
  canVerify,
  onAssignTech,
  onToggleItem,
  onToggleManagerVerified,
}) {
  const [open, setOpen] = useState(true);

  const total = group.items.length;
  const completedCount = group.items.filter((i) => i.completed).length;
  const allCompleted = total > 0 && completedCount === total;

  return (
    <div className="subsection">
      <button
        className="subsection-header"
        type="button"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="subsection-left">
          <div className="subsection-title">{group.title}</div>
          {group.subtitle ? (
            <div className="subsection-subtitle">{group.subtitle}</div>
          ) : null}
          <div className="subsection-tech">
            Tech: {group.techName || "(unassigned)"}
          </div>
        </div>

        <div className="subsection-right">
          {completedCount}/{total} completed
        </div>
      </button>

      {open && (
        <div className="subsection-body">
          {canAssign && (
            <div className="tech-assign">
              <label className="assign-tech-label">
                <span className="assign-tech-text">Assigned Tech:</span>
                <select
                  className="assign-tech-select"
                  value={group.techName || "(unassigned)"}
                  onChange={(e) => onAssignTech(sectionKey, group.id, e.target.value)}
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
            {group.items.map((item) => (
              <li key={item.id} className="checklist-item">
                <label>
                  <input
                    type="checkbox"
                    checked={!!item.completed}
                    onChange={() => onToggleItem(sectionKey, group.id, item.id)}
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
                  disabled={!allCompleted}
                  checked={!!group.managerVerified}
                  onChange={() => {
                    if (allCompleted) onToggleManagerVerified(sectionKey, group.id);
                  }}
                />
                <span>
                  Manager verification
                  {!allCompleted && " (available when all items are completed)"}
                </span>
              </label>
            )}

            <div className="manager-timestamp">
              {group.managerVerified && group.verifiedAt
                ? `Verified by manager at: ${group.verifiedAt}`
                : "Awaiting manager verification"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  sectionKey,
  section,
  canVerify,
  isAdmin,
  visible,
  onAssignTech,
  onToggleItem,
  onToggleManagerVerified,
}) {
  const [open, setOpen] = useState(true);
  if (!visible) return null;

  const allItems = section.groups.flatMap((g) => g.items || []);
  const total = allItems.length;
  const completedCount = allItems.filter((i) => i.completed).length;

  const canAssign = isAdmin || canVerify;

  return (
    <div className="section">
      <button
        className="section-header"
        type="button"
        onClick={() => setOpen((p) => !p)}
      >
        <div className="section-title">{section.name}</div>
        <div className="section-progress">
          {completedCount}/{total} completed
        </div>
      </button>

      {open && (
        <div className="section-body">
          {section.groups.map((group) => (
            <Group
              key={group.id}
              sectionKey={sectionKey}
              group={group}
              canAssign={canAssign}
              canVerify={canVerify}
              onAssignTech={onAssignTech}
              onToggleItem={onToggleItem}
              onToggleManagerVerified={onToggleManagerVerified}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// --- App ---
export default function App() {
  // LOGIN
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

  // ROLE
  const [role, setRole] = useState("MANAGER");
  const isAdmin = role === "ADMIN";
  const canVerify = role === "MANAGER" || role === "ADMIN";
  const showBbOps = role !== "TECH";

  // DATA
  const [sections, setSections] = useState(() => normalizeSections(initialSections));
  const [currentGame, setCurrentGame] = useState(null);

  const [gameError, setGameError] = useState(null);
  const [checklistsError, setChecklistsError] = useState(null);

  // Load checklist definitions from backend
  useEffect(() => {
    async function loadChecklists() {
      try {
        const res = await fetch(`${API_BASE_URL}/checklists`);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        setSections(normalizeSections(data));
        setChecklistsError(null);
      } catch (err) {
        console.error("Error fetching checklists:", err);
        setChecklistsError("Could not load checklists from server. Using backup.");
        setSections(normalizeSections(initialSections));
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

  // Load saved progress for this game (after both are ready)
  useEffect(() => {
    if (!currentGame) return;
    if (!hasRealChecklist(sections)) return;

    const gameKey = getGameKey(currentGame);
    if (!gameKey) return;

    const stored = localStorage.getItem(`sections_${gameKey}`);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored);
      setSections(normalizeSections(parsed));
    } catch (e) {
      console.error("Failed to parse stored sections:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGame]);

  // Save progress whenever sections change
  useEffect(() => {
    if (!currentGame) return;
    const gameKey = getGameKey(currentGame);
    if (!gameKey) return;

    localStorage.setItem(`sections_${gameKey}`, JSON.stringify(sections));
  }, [sections, currentGame]);

  // Handlers (GROUP-LEVEL)
  const handleToggleItem = (sectionKey, groupId, itemId) => {
    setSections((prev) => {
      const next = { ...prev };
      const section = next[sectionKey];
      if (!section) return prev;

      const groups = section.groups.map((g) => {
        if (g.id !== groupId) return g;

        const items = (g.items || []).map((it) =>
          it.id === itemId ? { ...it, completed: !it.completed } : it
        );

        // if any incomplete, force managerVerified off
        const anyIncomplete = items.some((i) => !i.completed);

        return {
          ...g,
          items,
          managerVerified: anyIncomplete ? false : g.managerVerified,
          verifiedAt: anyIncomplete ? null : g.verifiedAt,
        };
      });

      next[sectionKey] = { ...section, groups };
      return next;
    });
  };

  const handleToggleManagerVerified = (sectionKey, groupId) => {
    setSections((prev) => {
      const next = { ...prev };
      const section = next[sectionKey];
      if (!section) return prev;

      const groups = section.groups.map((g) => {
        if (g.id !== groupId) return g;

        const nextVerified = !g.managerVerified;
        const formatted = new Date().toLocaleString();

        return {
          ...g,
          managerVerified: nextVerified,
          verifiedAt: nextVerified ? formatted : null,
        };
      });

      next[sectionKey] = { ...section, groups };
      return next;
    });
  };

  const handleAssignTech = (sectionKey, groupId, techName) => {
    setSections((prev) => {
      const next = { ...prev };
      const section = next[sectionKey];
      if (!section) return prev;

      const displayName =
        techName === "(unassigned)" || techName.trim() === ""
          ? "(unassigned)"
          : techName;

      const groups = section.groups.map((g) =>
        g.id === groupId ? { ...g, techName: displayName } : g
      );

      next[sectionKey] = { ...section, groups };
      return next;
    });
  };

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

  const safeSections = useMemo(() => normalizeSections(sections), [sections]);

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
          section={safeSections.preGame}
          canVerify={canVerify}
          isAdmin={isAdmin}
          visible={true}
          onAssignTech={handleAssignTech}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
        />

        <Section
          sectionKey="postGame"
          section={safeSections.postGame}
          canVerify={canVerify}
          isAdmin={isAdmin}
          visible={true}
          onAssignTech={handleAssignTech}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
        />

        <Section
          sectionKey="bbOps"
          section={safeSections.bbOps}
          canVerify={canVerify}
          isAdmin={isAdmin}
          visible={showBbOps}
          onAssignTech={handleAssignTech}
          onToggleItem={handleToggleItem}
          onToggleManagerVerified={handleToggleManagerVerified}
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
