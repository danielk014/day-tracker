import { useState } from 'react';
import DailyView from './DailyView';
import CalendarView from './CalendarView';
import GoalsView from './GoalsView';
import CoachView from './CoachView';
import ProjectsView from './ProjectsView';
import './App.css';

const TABS = ['Today', 'Calendar', 'Goals', 'Projects', 'Coach'];

function App() {
  const [tab, setTab] = useState('Today');
  const [selectedDate, setSelectedDate] = useState(null);

  function handleDaySelect(date) {
    setSelectedDate(date);
    setTab('Today');
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Second Brain</h1>
        <p className="subtitle">Track your hours. Know yourself.</p>
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
