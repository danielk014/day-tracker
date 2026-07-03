import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import AuthScreen from './AuthScreen';
import DailyView from './DailyView';
import CalendarView from './CalendarView';
import GoalsView from './GoalsView';
import CoachView from './CoachView';
import ProjectsView from './ProjectsView';
import './App.css';

const TABS = ['Today', 'Calendar', 'Goals', 'Projects', 'Coach'];

function App() {
  const [session, setSession] = useState(undefined);
  const [tab, setTab] = useState('Today');
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <AuthScreen />;

  function handleDaySelect(date) {
    setSelectedDate(date);
    setTab('Today');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Second Brain</h1>
        <div className="header-row">
          <p className="subtitle">Track your hours. Know yourself.</p>
          <button className="logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <nav className="tabs">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab ${tab === t ? 'active' : ''}`}
            onClick={() => { setTab(t); if (t !== 'Today') setSelectedDate(null); }}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="content">
        {tab === 'Today' && <DailyView overrideDate={selectedDate} />}
        {tab === 'Calendar' && <CalendarView onDaySelect={handleDaySelect} />}
        {tab === 'Goals' && <GoalsView />}
        {tab === 'Projects' && <ProjectsView />}
        {tab === 'Coach' && <CoachView />}
      </main>
    </div>
  );
}

export default App;
