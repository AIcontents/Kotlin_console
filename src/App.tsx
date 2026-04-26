/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, FormEvent, ChangeEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Plus, 
  List, 
  Search, 
  Edit3, 
  Trash2, 
  ArrowUpDown, 
  Save, 
  FileUp, 
  XCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Priority, Task, SortField, SortOrder } from './types';
import { TaskRepository } from './repository';

// Standard colors for terminal
const COLORS = {
  bg: '#121212',
  text: '#e0e0e0',
  accent: '#bb86fc', // Purple
  success: '#03dac6', // Teal
  error: '#cf6679', // Pink/Red
  warning: '#fbc02d', // Yellow
  muted: '#757575',
};

type MenuState = 'MAIN' | 'CREATE' | 'VIEW' | 'SEARCH' | 'EDIT' | 'DELETE' | 'SORT' | 'SAVE' | 'LOAD' | 'BATCH';

export default function App() {
  const [repo] = useState(new TaskRepository());
  const [viewState, setViewState] = useState<MenuState>('MAIN');
  const [logs, setLogs] = useState<string[]>(['System initialized. Welcome to TaskTerminal v1.0.']);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  
  // Form states
  const [formData, setFormData] = useState<any>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    setTasks(repo.getAll());
  }, [repo]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev.slice(-19), `[${timestamp}] ${msg}`]);
  };

  const refreshTasks = () => {
    setTasks(repo.getAll());
  };

  const handleMainMenu = (choice: string) => {
    switch (choice) {
      case '1': setViewState('CREATE'); setFormData({ title: '', description: '', priority: 3 }); break;
      case '2': setViewState('VIEW'); refreshTasks(); break;
      case '3': setViewState('SEARCH'); setFormData({}); break;
      case '4': setViewState('EDIT'); setFormData({ id: '' }); break;
      case '5': setViewState('DELETE'); setFormData({ id: '' }); break;
      case '6': setViewState('SORT'); break;
      case '7': handleSave(); break;
      case '8': document.getElementById('file-upload')?.click(); break;
      case '9': setViewState('BATCH'); setSelectedTasks([]); break;
      case '0': window.close(); addLog('Attempted to exit application.'); break;
      default: addLog('Invalid option selected.'); break;
    }
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      addLog('Error: Title is required.');
      return;
    }
    const priority = parseInt(formData.priority) || 1;
    repo.add({
      title: formData.title,
      description: formData.description || '',
      priority: Math.max(1, Math.min(5, priority)) as Priority,
      isDone: false
    });
    addLog(`Task "${formData.title}" created successfully.`);
    setViewState('MAIN');
    refreshTasks();
  };

  const handleEdit = (e: FormEvent) => {
    e.preventDefault();
    const id = parseInt(formData.id);
    const existing = repo.getAll().find(t => t.id === id);
    
    if (!existing) {
      addLog(`Error: Task ID ${id} not found.`);
      return;
    }

    if (!formData.title && !formData.description && !formData.priority && formData.isDone === undefined) {
      setViewState('MAIN');
      return;
    }

    const updates: any = {};
    if (formData.title) updates.title = formData.title;
    if (formData.description) updates.description = formData.description;
    if (formData.priority) updates.priority = parseInt(formData.priority) as Priority;
    if (formData.isDone !== undefined) updates.isDone = formData.isDone === 'true';

    repo.update(id, updates);
    addLog(`Task ${id} updated.`);
    setViewState('MAIN');
    refreshTasks();
  };

  const handleDelete = (confirm: boolean) => {
    if (confirm && confirmDeleteId) {
      repo.delete(confirmDeleteId);
      addLog(`Task ${confirmDeleteId} deleted.`);
    }
    setConfirmDeleteId(null);
    setViewState('MAIN');
    refreshTasks();
  };

  const handleSort = (field: SortField, order: SortOrder) => {
    const sorted = repo.sort(field, order);
    setTasks(sorted);
    addLog(`Tasks sorted by ${field} (${order}).`);
    setViewState('VIEW');
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const criteria: any = {};
    if (formData.title) criteria.title = formData.title;
    if (formData.priority) criteria.priority = parseInt(formData.priority);
    if (formData.isDone !== undefined) criteria.isDone = formData.isDone === 'true';

    const results = repo.search(criteria);
    setTasks(results);
    addLog(`Search completed: ${results.length} found.`);
    setViewState('VIEW');
  };

  const handleSave = () => {
    const dataStr = repo.toJSON();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    addLog('Tasks exported to JSON file.');
  };

  const handleLoad = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        repo.loadFromJSON(content);
        addLog('Tasks loaded from file successfully.');
        refreshTasks();
      } catch (err) {
        addLog('Error: Failed to parse task file.');
      }
    };
    reader.readAsText(file);
  };

  const toggleTaskSelection = (id: number) => {
    setSelectedTasks(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBatchAction = (action: 'DONE' | 'UNDONE' | 'DELETE') => {
    if (selectedTasks.length === 0) return;
    
    if (action === 'DELETE') {
      repo.deleteMultiple(selectedTasks);
      addLog(`Batch deleted ${selectedTasks.length} tasks.`);
    } else {
      repo.markDone(selectedTasks, action === 'DONE');
      addLog(`Batch marked ${selectedTasks.length} tasks as ${action}.`);
    }
    setSelectedTasks([]);
    setViewState('MAIN');
    refreshTasks();
  };

  return (
    <div className="flex flex-col h-screen bg-brand-bg text-brand-text-primary overflow-hidden">
      {/* Hidden file input */}
      <input 
        id="file-upload" 
        type="file" 
        accept=".json" 
        className="hidden" 
        onChange={handleLoad} 
      />

      {/* Header */}
      <header className="h-[60px] bg-brand-surface border-b border-brand-border flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="text-brand-accent font-bold tracking-tight text-lg">TASK_CONSOLE v1.0.4</div>
          <span className="text-brand-text-secondary font-normal text-sm hidden sm:inline">/ repositories / TaskRepository.kt</span>
        </div>
        <div className="flex items-center gap-6 text-[13px]">
          <span className="hidden md:inline">Active File: <strong className="text-brand-text-primary">tasks.json</strong></span>
          <div className="flex items-center gap-2 text-status-done font-medium">
            <div className="w-2 h-2 rounded-full bg-status-done shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            Connected
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[260px] bg-brand-sidebar border-r border-brand-border p-3 flex flex-col gap-1 shrink-0">
          <SidebarItem 
            active={viewState === 'VIEW'} 
            icon={<List size={16} />} 
            label="View All Tasks" 
            shortcut="[2]" 
            onClick={() => { setViewState('VIEW'); refreshTasks(); }} 
          />
          <SidebarItem 
            active={viewState === 'CREATE'} 
            icon={<Plus size={16} />} 
            label="Create New" 
            shortcut="[1]" 
            onClick={() => { setViewState('CREATE'); setFormData({ title: '', description: '', priority: 3 }); }} 
          />
          <SidebarItem 
            active={viewState === 'SEARCH'} 
            icon={<Search size={16} />} 
            label="Search Filter" 
            shortcut="[3]" 
            onClick={() => { setViewState('SEARCH'); setFormData({}); }} 
          />
          <SidebarItem 
            active={viewState === 'EDIT'} 
            icon={<Edit3 size={16} />} 
            label="Edit Entry" 
            shortcut="[4]" 
            onClick={() => { setViewState('EDIT'); setFormData({ id: '' }); }} 
          />
          <SidebarItem 
            active={viewState === 'DELETE'} 
            icon={<Trash2 size={16} />} 
            label="Delete Entry" 
            shortcut="[5]" 
            onClick={() => { setViewState('DELETE'); setFormData({ id: '' }); }} 
          />
          <SidebarItem 
            active={viewState === 'SORT'} 
            icon={<ArrowUpDown size={16} />} 
            label="Sort List" 
            shortcut="[6]" 
            onClick={() => setViewState('SORT')} 
          />
          <SidebarItem 
            active={viewState === 'BATCH'} 
            icon={<CheckCircle2 size={16} />} 
            label="Batch Actions" 
            shortcut="[9]" 
            onClick={() => { setViewState('BATCH'); setSelectedTasks([]); }} 
          />
          
          <div className="my-4 border-t border-brand-border opacity-50" />
          
          <SidebarItem 
            icon={<Save size={16} />} 
            label="Export JSON" 
            shortcut="[7]" 
            onClick={handleSave} 
          />
          <SidebarItem 
            icon={<FileUp size={16} />} 
            label="Import JSON" 
            shortcut="[8]" 
            onClick={() => document.getElementById('file-upload')?.click()} 
          />
          
          <div className="mt-auto">
            <SidebarItem 
              icon={<XCircle size={16} />} 
              label="Exit System" 
              shortcut="[0]" 
              onClick={() => { addLog('Attempted to exit application.'); }} 
            />
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden p-8 gap-6 bg-brand-bg relative">
          
          {/* Stats Bar (Only in Main view or View list) */}
          {(viewState === 'MAIN' || viewState === 'VIEW') && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
              <StatCard label="Total Tasks" value={tasks.length} />
              <StatCard label="Completed" value={tasks.filter(t => t.isDone).length} color="text-status-done" />
              <StatCard label="Critical (P5)" value={tasks.filter(t => t.priority === 5).length} color="text-priority-5" />
              <StatCard label="Storage Size" value={`${(repo.toJSON().length / 1024).toFixed(1)} KB`} />
            </div>
          )}

          <div className="flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {viewState === 'MAIN' && (
                <motion.div 
                  key="main"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center justify-center h-full text-center gap-4"
                >
                  <div className="w-16 h-16 bg-brand-accent-dim rounded-full flex items-center justify-center mb-2">
                    <Terminal className="text-brand-accent" size={32} />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">System Ready</h1>
                  <p className="text-brand-text-secondary max-w-md">Select an operation from the sidebar to manage your task repository repository.</p>
                  <button 
                    onClick={() => { setViewState('VIEW'); refreshTasks(); }}
                    className="mt-4 px-6 py-2 bg-brand-accent text-brand-bg font-bold rounded-lg hover:opacity-90 transition-all uppercase tracking-wider text-xs"
                  >
                    Load Task Table
                  </button>
                </motion.div>
              )}

              {viewState === 'CREATE' && (
                <motion.div key="create" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6 max-w-2xl">
                  <header>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Plus className="text-brand-accent" /> NEW TASK ENTRY
                    </h2>
                    <p className="text-brand-text-secondary text-sm">Fill in the parameters for the new task record.</p>
                  </header>
                  <form onSubmit={handleCreate} className="flex flex-col gap-6 bg-brand-surface p-6 border border-brand-border rounded-xl shadow-xl">
                    <ProfessionalInput label="Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} autoFocus placeholder="Enter task objective..." />
                    <ProfessionalInput label="Description" value={formData.description} onChange={v => setFormData({...formData, description: v})} placeholder="Enter detailed context..." />
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center text-xs text-brand-text-secondary uppercase tracking-widest font-bold">
                        <span>Priority Level</span>
                        <span className={`text-priority-${formData.priority} font-mono`}>P-{formData.priority}</span>
                      </div>
                      <input 
                        type="range" min="1" max="5" 
                        className="accent-brand-accent bg-brand-border h-2 rounded-lg cursor-pointer"
                        value={formData.priority}
                        onChange={e => setFormData({...formData, priority: e.target.value})}
                      />
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-brand-border/50">
                      <button type="submit" className="bg-brand-accent text-brand-bg px-6 py-2 rounded-md font-bold uppercase text-xs tracking-widest hover:brightness-110 transition-all">Submit Transaction</button>
                      <button type="button" onClick={() => setViewState('MAIN')} className="text-brand-text-secondary px-6 py-2 uppercase text-xs tracking-widest hover:text-brand-text-primary transition-all">Cancel</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {viewState === 'VIEW' && (
                <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-4">
                  <div className="bg-brand-surface border border-brand-border rounded-lg flex-1 overflow-hidden flex flex-col shadow-xl">
                    <div className="grid grid-cols-[60px_1fr_120px_100px_180px] px-6 py-3 bg-[#374151] text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] shrink-0">
                      <div>ID</div>
                      <div>Title</div>
                      <div>Priority</div>
                      <div>Done</div>
                      <div>CreatedAt</div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {tasks.length === 0 ? (
                        <div className="p-12 text-center text-brand-text-secondary/30 font-mono italic">EMPTY_COLLECTION_NULL_DATA</div>
                      ) : (
                        tasks.map(task => (
                          <div 
                            key={task.id} 
                            className={`grid grid-cols-[60px_1fr_120px_100px_180px] px-6 py-4 border-b border-brand-border/30 text-sm items-center hover:bg-white/[0.02] transition-colors ${task.isDone ? 'bg-status-done/5 opacity-80' : ''}`}
                          >
                            <div className="font-mono text-xs opacity-50">{task.id}</div>
                            <div className={`font-semibold truncate pr-4 ${task.isDone ? 'line-through opacity-40' : ''}`}>{task.title}</div>
                            <div>
                              <div className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block text-white bg-priority-${task.priority}`}>
                                P-{task.priority}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${task.isDone ? 'bg-status-done shadow-[0_0_6px_var(--color-status-done)]' : 'bg-[#4B5563]'}`} />
                              <span className="text-xs uppercase font-bold tracking-tighter opacity-70">
                                {task.isDone ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="text-[11px] text-brand-text-secondary font-mono">{new Date(task.createdAt).toLocaleString()}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {viewState === 'SEARCH' && (
                <motion.div key="search" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6 max-w-2xl">
                  <header>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Search className="text-brand-accent" /> QUERY ENGINE
                    </h2>
                    <p className="text-brand-text-secondary text-sm">Enter selection criteria to filter the task repository.</p>
                  </header>
                  <form onSubmit={handleSearch} className="flex flex-col gap-6 bg-brand-surface p-6 border border-brand-border rounded-xl shadow-xl">
                    <ProfessionalInput label="Title Pattern" value={formData.title || ''} onChange={v => setFormData({...formData, title: v})} placeholder="SQL like pattern..." />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-brand-text-secondary uppercase tracking-widest font-bold">Min Priority</label>
                        <select 
                          className="bg-brand-bg border border-brand-border p-3 rounded-lg text-sm outline-none focus:border-brand-accent transition-colors"
                          value={formData.priority || ''}
                          onChange={e => setFormData({...formData, priority: e.target.value})}
                        >
                          <option value="">Any Priority</option>
                          {[1,2,3,4,5].map(i => <option key={i} value={i}>Level {i}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[11px] text-brand-text-secondary uppercase tracking-widest font-bold">Status Filter</label>
                        <select 
                          className="bg-brand-bg border border-brand-border p-3 rounded-lg text-sm outline-none focus:border-brand-accent transition-colors"
                          value={formData.isDone || ''}
                          onChange={e => setFormData({...formData, isDone: e.target.value})}
                        >
                          <option value="">Any Status</option>
                          <option value="true">Completed Only</option>
                          <option value="false">Remaining Only</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-brand-border/50">
                      <button type="submit" className="bg-brand-accent text-brand-bg px-6 py-2 rounded-md font-bold uppercase text-xs tracking-widest hover:brightness-110 transition-all">Execute Query</button>
                      <button type="button" onClick={() => setViewState('MAIN')} className="text-brand-text-secondary px-6 py-2 uppercase text-xs tracking-widest hover:text-brand-text-primary transition-all">Cancel</button>
                    </div>
                  </form>
                </motion.div>
              )}

              {viewState === 'EDIT' && (
                <motion.div key="edit" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-6 max-w-2xl">
                   <header>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Edit3 className="text-brand-accent" /> MODIFY_RECORD
                    </h2>
                    <p className="text-brand-text-secondary text-sm">Update task properties in the database repo.</p>
                  </header>
                {!formData.selectedTask ? (
                  <form className="flex flex-col gap-4 bg-brand-surface p-6 border border-brand-border rounded-xl max-w-sm shadow-xl" onSubmit={(e) => {
                    e.preventDefault();
                    const task = repo.getAll().find(t => t.id === parseInt(formData.id));
                    if (task) {
                      setFormData({ ...formData, selectedTask: task });
                    } else {
                      addLog(`Error: ID ${formData.id} not found.`);
                    }
                  }}>
                    <ProfessionalInput label="Enter Primary Key (ID)" value={formData.id} onChange={v => setFormData({...formData, id: v})} autoFocus placeholder="e.g. 1" />
                    <button type="submit" className="bg-brand-accent text-brand-bg px-6 py-2 rounded-md font-bold uppercase text-xs tracking-widest mt-2 hover:brightness-110 active:scale-95 transition-all">Fetch Record</button>
                  </form>
                ) : (
                  <form onSubmit={handleEdit} className="flex flex-col gap-6 bg-brand-surface p-6 border border-brand-border rounded-xl shadow-xl">
                    <div className="p-4 bg-brand-bg/50 border-l-4 border-brand-accent rounded-r-lg mb-2">
                      <div className="text-[10px] text-brand-accent uppercase font-bold tracking-widest">Target Resource: {formData.selectedTask.id}</div>
                      <div className="text-sm font-semibold mt-1 truncate">Current: {formData.selectedTask.title}</div>
                    </div>
                    <ProfessionalInput label={`New Title [${formData.selectedTask.title}]`} value={formData.title || ''} onChange={v => setFormData({...formData, title: v})} autoFocus />
                    <ProfessionalInput label="Priority (1-5)" value={formData.priority || ''} onChange={v => setFormData({...formData, priority: v})} />
                    <div className="flex flex-col gap-2">
                      <label className="text-[11px] text-brand-text-secondary uppercase tracking-widest font-bold">Bit-Flip Status</label>
                      <select 
                        className="bg-brand-bg border border-brand-border p-3 rounded-lg text-sm outline-none focus:border-brand-accent transition-colors"
                        value={formData.isDone === undefined ? (formData.selectedTask.isDone ? 'true' : 'false') : formData.isDone}
                        onChange={e => setFormData({...formData, isDone: e.target.value})}
                      >
                        <option value="false">REMAINING</option>
                        <option value="true">COMPLETED</option>
                      </select>
                    </div>
                    <div className="flex gap-4 pt-4 border-t border-brand-border/50">
                      <button type="submit" className="bg-brand-accent text-brand-bg px-6 py-2 rounded-md font-bold uppercase text-xs tracking-widest active:scale-95 transition-all">Commit Update</button>
                      <button type="button" onClick={() => setViewState('MAIN')} className="text-brand-text-secondary px-6 py-2 uppercase text-xs tracking-widest hover:text-white transition-all">Abort</button>
                    </div>
                  </form>
                )}
                </motion.div>
              )}

              {viewState === 'DELETE' && (
                <motion.div key="delete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6 max-w-2xl">
                  {!confirmDeleteId ? (
                    <div className="flex flex-col gap-6">
                      <header>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-priority-5">
                          <Trash2 size={24} /> SCRUB_RESOURCE
                        </h2>
                        <p className="text-brand-text-secondary text-sm">Enter Task ID for permanent deletion from storage.</p>
                      </header>
                      <form className="flex flex-col gap-4 bg-brand-surface p-6 border border-brand-border rounded-xl max-w-sm shadow-xl" onSubmit={(e) => {
                        e.preventDefault();
                        const id = parseInt(formData.id);
                        if (repo.getAll().find(t => t.id === id)) {
                          setConfirmDeleteId(id);
                        } else {
                          addLog(`Error: ID ${id} not found.`);
                        }
                      }}>
                        <ProfessionalInput label="Primary Key (ID)" value={formData.id} onChange={v => setFormData({...formData, id: v})} autoFocus placeholder="ID to scrub..." />
                        <button type="submit" className="bg-priority-5 text-white px-6 py-2 rounded-md font-bold uppercase text-xs tracking-widest mt-2 hover:brightness-110 active:scale-95 transition-all">Verify Deletion</button>
                        <button type="button" onClick={() => setViewState('MAIN')} className="text-brand-text-secondary text-xs uppercase self-center mt-2 hover:text-white transition-colors">Cancel</button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-brand-surface p-10 border-2 border-priority-5 rounded-2xl flex flex-col items-center gap-8 text-center max-w-lg shadow-[0_0_50px_rgba(239,68,68,0.15)]">
                      <div className="w-20 h-20 bg-priority-5/10 rounded-full flex items-center justify-center">
                        <AlertCircle size={48} className="text-priority-5" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold uppercase mb-2">Destructive Action</h3>
                        <p className="text-brand-text-secondary leading-relaxed">
                          System is requesting confirmation to permanently scrub task <strong className="text-brand-text-primary">#{confirmDeleteId}</strong> from the local repository. This action is irreversible.
                        </p>
                      </div>
                      <div className="flex gap-4 w-full">
                        <button onClick={() => handleDelete(true)} className="flex-1 bg-priority-5 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em] shadow-lg shadow-priority-5/20 hover:brightness-110 active:scale-95 transition-all">SCRUB_DISK</button>
                        <button onClick={() => handleDelete(false)} className="flex-1 bg-brand-border/30 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-brand-border/50 active:scale-95 transition-all">ABORT</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {viewState === 'SORT' && (
                <motion.div key="sort" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-6 max-w-4xl">
                   <header>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <ArrowUpDown className="text-brand-accent" /> SEQUENCE CONTROL
                    </h2>
                    <p className="text-brand-text-secondary text-sm">Re-order the internal collection based on selected attributes.</p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SortSection title="Date Created" field="createdAt" onSelect={handleSort} />
                    <SortSection title="Priority Level" field="priority" onSelect={handleSort} />
                    <SortSection title="Label (Title)" field="title" onSelect={handleSort} />
                    <SortSection title="Committed Status" field="isDone" onSelect={handleSort} />
                  </div>
                  <button onClick={() => setViewState('MAIN')} className="text-brand-text-secondary uppercase text-[10px] tracking-widest self-start mt-6 hover:text-white transition-colors">Return to Interface Area</button>
                </motion.div>
              )}

              {viewState === 'BATCH' && (
                <motion.div key="batch" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full gap-4">
                  <header className="flex justify-between items-center bg-brand-surface p-4 border border-brand-border rounded-lg shadow-lg">
                    <div>
                      <h2 className="text-lg font-bold flex items-center gap-2">
                        <CheckCircle2 className="text-brand-accent" /> BATCH_PROCESSOR
                      </h2>
                      <div className="text-[10px] text-brand-text-secondary uppercase tracking-widest mt-1">Pending: {selectedTasks.length} selection vectors</div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleBatchAction('DONE')} 
                        disabled={selectedTasks.length === 0}
                        className="text-[10px] bg-status-done text-brand-bg px-4 py-2 font-bold tracking-widest rounded disabled:opacity-20 uppercase transition-all"
                      >SET_READY</button>
                      <button 
                        onClick={() => handleBatchAction('DELETE')} 
                        disabled={selectedTasks.length === 0}
                        className="text-[10px] bg-priority-5 text-white px-4 py-2 font-bold tracking-widest rounded disabled:opacity-20 uppercase transition-all"
                      >WIPE_SELECTED</button>
                    </div>
                  </header>
                  
                  <div className="bg-brand-surface border border-brand-border rounded-lg flex-1 overflow-hidden flex flex-col shadow-xl">
                    <div className="grid grid-cols-[60px_1fr_120px] px-6 py-3 bg-[#374151] text-[11px] font-bold uppercase tracking-widest text-[#9CA3AF] shrink-0">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          className="accent-brand-accent"
                          onChange={(e) => setSelectedTasks(e.target.checked ? tasks.map(t => t.id) : [])}
                          checked={selectedTasks.length === tasks.length && tasks.length > 0}
                        />
                      </div>
                      <div>TITLE_FIELD</div>
                      <div>PRIORITY_INDEX</div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {tasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`grid grid-cols-[60px_1fr_120px] px-6 py-4 border-b border-brand-border/30 text-sm items-center cursor-pointer hover:bg-white/[0.04] transition-colors ${selectedTasks.includes(task.id) ? 'bg-brand-accent-dim' : ''}`}
                          onClick={() => toggleTaskSelection(task.id)}
                        >
                          <div className="flex items-center">
                            <input type="checkbox" className="accent-brand-accent" checked={selectedTasks.includes(task.id)} readOnly />
                          </div>
                          <div className={`font-mono text-xs truncate pr-4 ${task.isDone ? 'opacity-30 line-through' : ''}`}>{task.title}</div>
                          <div>
                            <div className={`w-3 h-3 rounded-full bg-priority-${task.priority}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="h-[32px] bg-brand-surface border-t border-brand-border px-6 flex items-center justify-between shrink-0 text-[11px] text-brand-text-secondary select-none">
        <div className="flex items-center gap-3 overflow-hidden">
          <span className="shrink-0 font-bold opacity-50">System Logs: </span>
          <div className="flex gap-4 items-center overflow-hidden whitespace-nowrap">
            {logs.slice(-1).map((log, i) => (
              <div key={i} className={`flex gap-2 items-center ${log.includes('Error') ? 'text-priority-5' : (log.includes('successfully') || log.includes('Save') || log.includes('loaded')) ? 'text-status-done' : 'text-brand-accent'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${log.includes('Error') ? 'bg-priority-5 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-status-done shadow-[0_0_6px_rgba(16,185,129,0.5)]'}`} />
                <span className="uppercase font-bold tracking-tighter shrink-0">{log.includes('Error') ? 'FAILURE' : 'SUCCESS'}</span>
                <span className="opacity-60 truncate"> - {log}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-brand-accent/60 font-bold tracking-widest uppercase hidden sm:block shrink-0 ml-4">
          Architecture: Data &gt; Repository &gt; MenuController
        </div>
      </footer>
    </div>
  );
}

function SidebarItem({ active = false, icon, label, shortcut, onClick }: { active?: boolean, icon: ReactNode, label: string, shortcut?: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-left relative overflow-hidden ${
        active 
          ? 'bg-brand-accent text-brand-bg font-bold shadow-[0_4px_12px_rgba(56,189,248,0.2)]' 
          : 'text-brand-text-secondary hover:bg-brand-accent-dim hover:text-brand-accent'
      }`}
    >
      <div className={`${active ? 'text-brand-bg' : 'text-brand-text-secondary group-hover:text-brand-accent'} transition-colors`}>
        {icon}
      </div>
      <span className="text-[13px] tracking-tight flex-1">{label}</span>
      {shortcut && (
        <span className={`text-[10px] font-mono opacity-40 ${active ? 'text-brand-bg' : ''}`}>
          {shortcut}
        </span>
      )}
      {active && (
        <motion.div 
          layoutId="sidebarActive"
          className="absolute left-0 top-0 bottom-0 w-1 bg-brand-bg"
          initial={false}
        />
      )}
    </button>
  );
}

function StatCard({ label, value, color = "text-brand-text-primary" }: { label: string, value: string | number, color?: string }) {
  return (
    <div className="bg-brand-surface border border-brand-border p-4 rounded-xl shadow-lg hover:border-brand-accent/30 transition-all group">
      <div className="text-[10px] text-brand-text-secondary uppercase tracking-[0.2em] font-bold mb-1 opacity-60 group-hover:opacity-100 transition-opacity">{label}</div>
      <div className={`text-2xl font-bold tracking-tighter ${color}`}>{value}</div>
    </div>
  );
}

function ProfessionalInput({ label, value, onChange, autoFocus = false, placeholder = "", type = "text" }: { label: string, value: string, onChange: (v: string) => void, autoFocus?: boolean, placeholder?: string, type?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[11px] text-brand-text-secondary uppercase tracking-widest font-bold">{label}</label>
      <div className="relative group">
        <input 
          type={type}
          autoFocus={autoFocus}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-brand-bg border border-brand-border px-4 py-3 rounded-lg text-sm outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/20 transition-all placeholder:text-brand-text-secondary/30"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
          <div className="w-1 h-4 bg-brand-accent animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}

function SortSection({ title, field, onSelect }: { title: string, field: SortField, onSelect: (f: SortField, o: SortOrder) => void }) {
  return (
    <div className="flex flex-col gap-3 p-5 bg-brand-surface border border-brand-border rounded-xl hover:shadow-xl transition-all">
      <div className="text-xs text-brand-text-secondary uppercase tracking-widest font-bold flex items-center gap-2">
        <ArrowUpDown size={14} className="text-brand-accent" />
        {title}
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => onSelect(field, 'asc')}
          className="flex-1 bg-brand-bg border border-brand-border py-2 px-3 text-[10px] uppercase font-bold tracking-widest rounded-md hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95"
        >ASCENDING</button>
        <button 
          onClick={() => onSelect(field, 'desc')}
          className="flex-1 bg-brand-bg border border-brand-border py-2 px-3 text-[10px] uppercase font-bold tracking-widest rounded-md hover:border-brand-accent hover:text-brand-accent transition-all active:scale-95"
        >DESCENDING</button>
      </div>
    </div>
  );
}
