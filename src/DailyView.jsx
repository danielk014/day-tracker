import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getDateStr,
  loadDailyTasks, saveDailyTasks,
  loadRecurringTasks, saveRecurringTasks,
  loadBlocks, saveBlocks
} from './storage';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const TASK_COLORS = ['#1a1a1a', '#d4edda', '#cce5ff', '#fff3cd', '#f8d7da', '#e2d9f3'];
const BLOCK_COLORS = ['#4a6cf7', '#22c55e', '#f7c948', '#ef4444', '#a855f7', '#f97316'];
const ACTUAL_COLOR = '#374151';
const ROW_HEIGHT = 48;

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h < 12) return `${h} AM`;
  if (h === 12) return '12 PM';
  return `${h - 12} PM`;
}

function DailyView({ overrideDate }) {
  const today = getDateStr();
  const [date, setDate] = useState(overrideDate || today);
  const [tasks, setTasks] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskColor, setNewTaskColor] = useState(TASK_COLORS[0]);
  const [newTaskRecurring, setNewTaskRecurring] = useState(false);
  const [draggingTask, setDraggingTask] = useState(null);
  const [dropHour, setDropHour] = useState(null);
  const [editingBlock, setEditingBlock] = useState(null);
  const [addingAtHour, setAddingAtHour] = useState(null);
  const [newBlockText, setNewBlockText] = useState('');
  const currentRef = useRef(null);
  const taskInputRef = useRef(null);
  const blockInputRef = useRef(null);

  useEffect(() => {
    if (overrideDate) setDate(overrideDate);
  }, [overrideDate]);

  useEffect(() => {
    setTasks(loadDailyTasks(date));
    setRecurringTasks(loadRecurringTasks());
    setBlocks(loadBlocks(date));
  }, [date]);

  useEffect(() => {
    if (date === today && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [date, today]);

  const currentHour = date === today ? new Date().getHours() : -1;

  function shiftDate(days) {
    const d = new Date(date + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setDate(getDateStr(d));
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const opts = { weekday: 'long', month: 'long', day: 'numeric' };
    const label = d.toLocaleDateString('en-US', opts);
    return dateStr === today ? `${label} (Today)` : label;
  }

  // Merge daily + recurring tasks
  const allTasks = [
    ...tasks,
    ...recurringTasks.filter(rt => !tasks.some(t => t.recurringId === rt.id)).map(rt => ({
      ...rt,
      recurringId: rt.id,
      isRecurring: true,
    }))
  ];

  // Task functions
  function addTask() {
    if (!newTaskText.trim()) return;
    if (newTaskRecurring) {
      const newRecurring = { id: Date.now(), text: newTaskText.trim(), done: false, color: newTaskColor };
      const updated = [...recurringTasks, newRecurring];
      setRecurringTasks(updated);
      saveRecurringTasks(updated);
    } else {
      const updated = [...tasks, { id: Date.now(), text: newTaskText.trim(), done: false, color: newTaskColor }];
      setTasks(updated);
      saveDailyTasks(date, updated);
    }
    setNewTaskText('');
    setNewTaskColor(TASK_COLORS[0]);
    setNewTaskRecurring(false);
    setShowAddTask(false);
  }

  function toggleTask(task) {
    if (task.isRecurring) {
      const dailyVersion = { ...task, id: Date.now(), recurringId: task.recurringId || task.id, done: !task.done };
      const updated = [...tasks, dailyVersion];
      setTasks(updated);
      saveDailyTasks(date, updated);
    } else {
      const updated = tasks.map(t => t.id === task.id ? { ...t, done: !t.done } : t);
      setTasks(updated);
      saveDailyTasks(date, updated);
    }
  }

  function removeTask(task) {
    if (task.isRecurring) {
      const updated = recurringTasks.filter(t => t.id !== (task.recurringId || task.id));
      setRecurringTasks(updated);
      saveRecurringTasks(updated);
    } else {
      const updated = tasks.filter(t => t.id !== task.id);
      setTasks(updated);
      saveDailyTasks(date, updated);
    }
  }

  // Block functions — ALL schedule items are blocks now
  function updateBlocks(newBlocks) {
    setBlocks(newBlocks);
    saveBlocks(date, newBlocks);
  }

  function removeBlock(blockId) {
    updateBlocks(blocks.filter(b => b.id !== blockId));
    setEditingBlock(null);
  }

  // Click on empty hour -> add a block directly
  function handleHourClick(hour) {
    // Don't open if there's already a block covering this hour
    const hasBlock = blocks.some(b => hour >= b.startHour && hour < b.endHour);
    if (hasBlock) return;
    setAddingAtHour(hour);
    setNewBlockText('');
    setTimeout(() => blockInputRef.current?.focus(), 50);
  }

  function addBlockAtHour() {
    if (!newBlockText.trim() || addingAtHour === null) return;
    const colorIdx = blocks.length % BLOCK_COLORS.length;
    const newBlock = {
      id: Date.now(),
      text: newBlockText.trim(),
      startHour: addingAtHour,
      endHour: Math.min(addingAtHour + 1, 24),
      color: ACTUAL_COLOR,
      type: 'actual',
    };
    updateBlocks([...blocks, newBlock]);
    setAddingAtHour(null);
    setNewBlockText('');
  }

  // Drag task onto schedule -> create block
  function handleDragStart(e, task) {
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', task.text);
  }

  function handleDragOver(e, hour) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropHour(hour);
  }

  function handleDragLeave() {
    setDropHour(null);
  }

  function handleDrop(e, hour) {
    e.preventDefault();
    setDropHour(null);
    if (draggingTask) {
      const colorIdx = blocks.length % BLOCK_COLORS.length;
      const newBlock = {
        id: Date.now(),
        text: draggingTask.text,
        startHour: hour,
        endHour: Math.min(hour + 1, 24),
        color: draggingTask.color && draggingTask.color !== '#1a1a1a'
          ? draggingTask.color
          : BLOCK_COLORS[colorIdx],
        type: 'planned',
      };
      updateBlocks([...blocks, newBlock]);
      setDraggingTask(null);
    }
  }

  function handleDragEnd() {
    setDraggingTask(null);
    setDropHour(null);
  }

  // Block resize by dragging bottom edge
  const handleResizeStart = useCallback((e, block) => {
    e.stopPropagation();
    e.preventDefault();
    const origEnd = block.endHour;

    function onMove(ev) {
      const dy = ev.clientY - e.clientY;
      const hourDelta = Math.round(dy / ROW_HEIGHT);
      const newEnd = Math.max(block.startHour + 1, Math.min(24, origEnd + hourDelta));
      setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, endHour: newEnd } : b));
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      setBlocks(prev => {
        saveBlocks(date, prev);
        return prev;
      });
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [date]);

  const doneCount = allTasks.filter(t => t.done).length;

  return (
    <div>
      <div className="date-nav">
        <button onClick={() => shiftDate(-1)}>&larr;</button>
        <span>{formatDate(date)}</span>
        <button onClick={() => shiftDate(1)}>&rarr;</button>
      </div>

      <div className="daily-split">
        {/* Left: Hour Schedule with blocks overlay */}
        <div className="daily-schedule-panel">
          <p className="section-header" style={{ marginBottom: 8 }}>Schedule</p>

          <div className="schedule-grid">
            {/* Time blocks overlay */}
            {blocks.map(block => {
              const top = block.startHour * ROW_HEIGHT;
              const height = (block.endHour - block.startHour) * ROW_HEIGHT;
              return (
                <div
                  key={block.id}
                  className={`time-block ${block.type === 'actual' ? 'actual' : ''}`}
                  style={{
                    top,
                    height,
                    background: block.color || BLOCK_COLORS[0],
                  }}
                  onClick={e => { e.stopPropagation(); setEditingBlock(block); }}
                >
                  <div className="time-block-text">{block.text}</div>
                  {height >= 40 && (
                    <div className="time-block-range">
                      {formatHour(block.startHour)} – {formatHour(block.endHour)}
                      {' '}({block.endHour - block.startHour}h)
                    </div>
                  )}
                  <div
                    className="time-block-resize"
                    onMouseDown={e => handleResizeStart(e, block)}
                  >
                    <div className="resize-dots">···</div>
                  </div>
                </div>
              );
            })}

            {/* Inline add block form */}
            {addingAtHour !== null && (
              <div
                className="inline-add-block"
                style={{ top: addingAtHour * ROW_HEIGHT, height: ROW_HEIGHT }}
              >
                <input
                  ref={blockInputRef}
                  className="inline-block-input"
                  value={newBlockText}
                  onChange={e => setNewBlockText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addBlockAtHour();
                    if (e.key === 'Escape') setAddingAtHour(null);
                  }}
                  onBlur={() => { if (!newBlockText.trim()) setAddingAtHour(null); }}
                  placeholder="What did you do?"
                />
                <button className="inline-block-add" onClick={addBlockAtHour}>+</button>
              </div>
            )}

            {/* Hour rows */}
            {HOURS.map(h => {
              const isCurrent = h === currentHour;
              const isDropTarget = dropHour === h;
              const hasBlock = blocks.some(b => h >= b.startHour && h < b.endHour);

              return (
                <div
                  key={h}
                  ref={isCurrent ? currentRef : null}
                  className={`hour-row ${isCurrent ? 'current' : ''} ${isDropTarget ? 'drop-target' : ''}`}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => { if (!hasBlock) handleHourClick(h); }}
                  onDragOver={e => handleDragOver(e, h)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, h)}
                >
                  <div className="hour-label">{formatHour(h)}</div>
                  <div className="hour-content">
                    <div className="hour-empty">
                      {isDropTarget ? 'Drop here' : !hasBlock ? 'tap to log' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Tasks Panel */}
        <div className="daily-tasks-panel">
          <div className="daily-tasks-section">
            <div className="daily-tasks-header">
              <div className="daily-tasks-title">
                <span className="daily-tasks-icon">&#x2726;</span>
                <span>Tasks</span>
                <span className="daily-tasks-badge">{allTasks.length}</span>
              </div>
              <button
                className="daily-tasks-add-btn"
                onClick={() => { setShowAddTask(true); setTimeout(() => taskInputRef.current?.focus(), 50); }}
              >
                + Add task
              </button>
            </div>

            {showAddTask && (
              <div className="daily-task-add-form">
                <input
                  ref={taskInputRef}
                  className="daily-task-add-input"
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setShowAddTask(false); }}
                  placeholder="What needs to get done?"
                />
                <div className="daily-task-add-row">
                  <div className="daily-task-color-picks">
                    {TASK_COLORS.map(c => (
                      <button
                        key={c}
                        className={`daily-task-color-btn ${newTaskColor === c ? 'selected' : ''}`}
                        style={{ background: c, border: c === '#1a1a1a' ? '1px solid #333' : '1px solid transparent' }}
                        onClick={() => setNewTaskColor(c)}
                      />
                    ))}
                  </div>
                  <button
                    className={`recurring-toggle ${newTaskRecurring ? 'active' : ''}`}
                    onClick={() => setNewTaskRecurring(!newTaskRecurring)}
                    title="Recurring (daily)"
                  >
                    &#x21BB; {newTaskRecurring ? 'Daily' : 'Once'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                  <button className="btn-cancel" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setShowAddTask(false)}>Cancel</button>
                  <button className="btn-save" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addTask}>Add</button>
                </div>
              </div>
            )}

            <div className="daily-tasks-drag-hint">Drag onto the schedule</div>

            {allTasks.length > 0 && (
              <div className="daily-tasks-list">
                {doneCount > 0 && (
                  <div className="daily-tasks-progress-text">{doneCount}/{allTasks.length} done</div>
                )}
                {allTasks.map(task => (
                  <div
                    key={task.id}
                    className={`daily-task-item ${task.done ? 'done' : ''}`}
                    style={{ background: task.color || '#1a1a1a' }}
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="daily-task-grip">&#x2802;&#x2802;</div>
                    <button
                      className={`daily-task-check ${task.done ? 'checked' : ''}`}
                      onClick={() => toggleTask(task)}
                    >
                      {task.done ? '✓' : ''}
                    </button>
                    <span className={`daily-task-text ${task.done ? 'done-text' : ''}`}
                      style={{ color: task.color === '#1a1a1a' || task.color === TASK_COLORS[0] ? '#ccc' : '#1a1a1a' }}
                    >
                      {task.text}
                    </span>
                    {task.isRecurring && <span className="recurring-badge">&#x21BB;</span>}
                    <button className="daily-task-delete" onClick={() => removeTask(task)}>&times;</button>
                  </div>
                ))}
              </div>
            )}

            {allTasks.length === 0 && !showAddTask && (
              <div className="daily-tasks-empty">No tasks for this day</div>
            )}
          </div>
        </div>
      </div>

      {/* Block edit modal */}
      {editingBlock && (
        <BlockModal
          block={blocks.find(b => b.id === editingBlock.id) || editingBlock}
          onClose={() => setEditingBlock(null)}
          onDelete={() => removeBlock(editingBlock.id)}
          onUpdate={(changes) => {
            const updated = blocks.map(b => b.id === editingBlock.id ? { ...b, ...changes } : b);
            updateBlocks(updated);
            setEditingBlock({ ...editingBlock, ...changes });
          }}
        />
      )}
    </div>
  );
}

function BlockModal({ block, onClose, onDelete, onUpdate }) {
  const [text, setText] = useState(block.text);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <label>Task</label>
        <input
          className="modal-input"
          value={text}
          onChange={e => { setText(e.target.value); onUpdate({ text: e.target.value }); }}
        />

        <p style={{ color: '#888', fontSize: 13, margin: '12px 0 4px' }}>
          {formatHour(block.startHour)} – {formatHour(block.endHour)}
          {' '}({block.endHour - block.startHour}h)
        </p>

        <label>Start</label>
        <select
          className="modal-select"
          value={block.startHour}
          onChange={e => onUpdate({ startHour: Number(e.target.value), endHour: Math.max(Number(e.target.value) + 1, block.endHour) })}
        >
          {HOURS.map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
        </select>

        <label>End</label>
        <select
          className="modal-select"
          value={block.endHour}
          onChange={e => onUpdate({ endHour: Number(e.target.value) })}
        >
          {HOURS.filter(h => h > block.startHour).map(h => <option key={h} value={h}>{formatHour(h)}</option>)}
          <option value={24}>12 AM (next day)</option>
        </select>

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn-clear" onClick={onDelete}>Remove</button>
          <button className="btn-cancel" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default DailyView;
