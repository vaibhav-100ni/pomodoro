import React, { useState, useEffect } from 'react';

interface Subject {
  id: string;
  name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  lastReviewed: Date | null;
  reviewDates: Date[];
}

const PomodoroStudyApp: React.FC = () => {
  // Timer states
  const [mode, setMode] = useState<'study' | 'break'>('study');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isActive, setIsActive] = useState(false);
  const [cycles, setCycles] = useState(0);
  
  // Study session configuration
  const [studyDuration, setStudyDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  
  // Subject management
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [currentSubject, setCurrentSubject] = useState<string | null>(null);
  
  // Review notifications
  const [reviewNotifications, setReviewNotifications] = useState<{id: string, name: string}[]>([]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate next review dates based on spaced repetition algorithm
  const calculateNextReview = (difficulty: 'easy' | 'medium' | 'hard', reviewCount: number): number => {
    // Base intervals in hours
    const baseIntervals = {
      easy: [24, 72, 168, 336, 730],      // 1d, 3d, 1w, 2w, 1m
      medium: [12, 36, 96, 192, 384],     // 12h, 36h, 4d, 8d, 16d
      hard: [6, 24, 72, 144, 288]         // 6h, 1d, 3d, 6d, 12d
    };
    
    const intervalIndex = Math.min(reviewCount, baseIntervals[difficulty].length - 1);
    return baseIntervals[difficulty][intervalIndex] * 60 * 60 * 1000; // Convert hours to milliseconds
  };

  // Check for subjects that need review
  useEffect(() => {
    const checkForReviews = () => {
      const now = new Date();
      const dueForReview = subjects.filter(subject => {
        if (!subject.reviewDates.length) return false;
        const lastReview = new Date(subject.reviewDates[subject.reviewDates.length - 1]);
        const reviewCount = subject.reviewDates.length;
        const nextReviewTime = lastReview.getTime() + calculateNextReview(subject.difficulty, reviewCount);
        return nextReviewTime <= now.getTime();
      });
      
      setReviewNotifications(dueForReview.map(s => ({id: s.id, name: s.name})));
    };
    
    const interval = setInterval(checkForReviews, 60000); // Check every minute
    checkForReviews(); // Check immediately on mount
    
    return () => clearInterval(interval);
  }, [subjects]);

  // Timer logic
  useEffect(() => {
    let interval: number | undefined = undefined;
    
    if (isActive) {
      interval = window.setInterval(() => {
        setTimeLeft(prevTime => {
          if (prevTime <= 1) {
            clearInterval(interval);
            // Switch modes when timer ends
            if (mode === 'study') {
              const newCycles = cycles + 1;
              setCycles(newCycles);
              
              // Record review if studying a subject
              if (currentSubject) {
                setSubjects(prevSubjects => 
                  prevSubjects.map(subject => 
                    subject.id === currentSubject 
                      ? { 
                          ...subject, 
                          lastReviewed: new Date(),
                          reviewDates: [...subject.reviewDates, new Date()]
                        }
                      : subject
                  )
                );
              }
              
              // After 4 cycles, take a long break
              if (newCycles % 4 === 0) {
                setTimeLeft(longBreakDuration * 60);
              } else {
                setTimeLeft(breakDuration * 60);
              }
              setMode('break');
            } else {
              setTimeLeft(studyDuration * 60);
              setMode('study');
            }
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, mode, cycles, breakDuration, studyDuration, longBreakDuration, currentSubject]);

  // Toggle timer
  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  // Reset timer
  const resetTimer = () => {
    setIsActive(false);
    setMode('study');
    setTimeLeft(studyDuration * 60);
    setCycles(0);
  };

  // Add new subject
  const addSubject = () => {
    if (newSubject.trim()) {
      const newSubjectObj: Subject = {
        id: Date.now().toString(),
        name: newSubject,
        difficulty: selectedDifficulty,
        lastReviewed: null,
        reviewDates: []
      };
      
      setSubjects([...subjects, newSubjectObj]);
      setNewSubject('');
    }
  };

  // Select subject for studying
  const selectSubject = (id: string) => {
    setCurrentSubject(id);
    
    // Mark as being reviewed now
    if (isActive && mode === 'study') {
      setSubjects(prevSubjects => 
        prevSubjects.map(subject => 
          subject.id === id 
            ? { ...subject, lastReviewed: new Date() }
            : subject
        )
      );
    }
    
    // Remove from notifications if it was there
    setReviewNotifications(prev => prev.filter(note => note.id !== id));
  };

  // Generate a break suggestion
  const getBreakSuggestion = (): string => {
    const suggestions = [
      "Stand up and stretch for a minute.",
      "Practice deep breathing for 30 seconds.",
      "Look at something 20 feet away for 20 seconds (20-20-20 rule).",
      "Do 10 jumping jacks to boost circulation.",
      "Drink a glass of water.",
      "Roll your shoulders and neck to release tension.",
      "Close your eyes and meditate for a minute.",
      "Write down one key concept you just learned."
    ];
    
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  };

  return (
    <div className="app-container">
      <h1>Study Timer with Spaced Repetition</h1>
      
      <div className="timer-container">
        <div className={`timer-display ${mode}`}>
          <h2>{mode === 'study' ? 'Study Time' : 'Break Time'}</h2>
          <div className="time">{formatTime(timeLeft)}</div>
          <div className="cycle-count">Cycle: {cycles}</div>
        </div>
        
        <div className="timer-controls">
          <button className="control-btn" onClick={toggleTimer}>
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button className="control-btn" onClick={resetTimer}>Reset</button>
        </div>
        
        {mode === 'break' && (
          <div className="break-suggestion">
            <h3>Break Suggestion:</h3>
            <p>{getBreakSuggestion()}</p>
          </div>
        )}
      </div>
      
      <div className="settings-container">
        <h2>Timer Settings</h2>
        <div className="setting-group">
          <label>
            Study Duration (minutes):
            <input 
              type="number" 
              min="1" 
              max="60" 
              value={studyDuration} 
              onChange={(e) => setStudyDuration(Number(e.target.value))} 
              disabled={isActive}
            />
          </label>
        </div>
        <div className="setting-group">
          <label>
            Break Duration (minutes):
            <input 
              type="number" 
              min="1" 
              max="30" 
              value={breakDuration} 
              onChange={(e) => setBreakDuration(Number(e.target.value))} 
              disabled={isActive}
            />
          </label>
        </div>
        <div className="setting-group">
          <label>
            Long Break Duration (minutes):
            <input 
              type="number" 
              min="5" 
              max="60" 
              value={longBreakDuration} 
              onChange={(e) => setLongBreakDuration(Number(e.target.value))} 
              disabled={isActive}
            />
          </label>
        </div>
      </div>
      
      <div className="subjects-container">
        <h2>Study Subjects</h2>
        
        <div className="add-subject">
          <input
            type="text"
            placeholder="Add new subject"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
          />
          <select 
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={addSubject}>Add</button>
        </div>
        
        <div className="subject-list">
          {subjects.length === 0 ? (
            <p className="no-subjects">No subjects added yet.</p>
          ) : (
            subjects.map((subject) => (
              <div 
                key={subject.id} 
                className={`subject-item ${currentSubject === subject.id ? 'selected' : ''}`}
                onClick={() => selectSubject(subject.id)}
              >
                <div className="subject-name">{subject.name}</div>
                <div className={`difficulty-badge ${subject.difficulty}`}>
                  {subject.difficulty}
                </div>
                <div className="review-status">
                  {subject.lastReviewed ? 
                    `Last review: ${new Date(subject.lastReviewed).toLocaleDateString()}` : 
                    'Not reviewed yet'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {reviewNotifications.length > 0 && (
        <div className="review-notifications">
          <h3>Time to Review!</h3>
          <ul>
            {reviewNotifications.map(note => (
              <li key={note.id} onClick={() => selectSubject(note.id)}>
                {note.name} needs review now
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <style>{`
        .app-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #333;
        }
        
        h1 {
          text-align: center;
          color: #2c3e50;
          margin-bottom: 30px;
        }
        
        h2 {
          color: #3498db;
          border-bottom: 2px solid #ecf0f1;
          padding-bottom: 10px;
          margin-top: 30px;
        }
        
        .timer-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 30px;
        }
        
        .timer-display {
          text-align: center;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 20px;
          width: 100%;
          max-width: 300px;
        }
        
        .timer-display.study {
          background-color: #e8f4fd;
          border: 2px solid #3498db;
        }
        
        .timer-display.break {
          background-color: #e8f8e8;
          border: 2px solid #2ecc71;
        }
        
        .time {
          font-size: 3rem;
          font-weight: bold;
          margin: 20px 0;
        }
        
        .cycle-count {
          font-weight: bold;
          color: #7f8c8d;
        }
        
        .timer-controls {
          display: flex;
          gap: 15px;
        }
        
        .control-btn {
          padding: 10px 25px;
          font-size: 1rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .control-btn:first-child {
          background-color: #3498db;
          color: white;
        }
        
        .control-btn:first-child:hover {
          background-color: #2980b9;
        }
        
        .control-btn:last-child {
          background-color: #e74c3c;
          color: white;
        }
        
        .control-btn:last-child:hover {
          background-color: #c0392b;
        }
        
        .break-suggestion {
          background-color: #f9f9f9;
          border-left: 4px solid #2ecc71;
          padding: 15px;
          margin-top: 20px;
          border-radius: 5px;
        }
        
        .break-suggestion h3 {
          margin-top: 0;
          color: #2ecc71;
        }
        
        .settings-container {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .setting-group {
          margin-bottom: 15px;
        }
        
        .setting-group label {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .setting-group input {
          width: 80px;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .subjects-container {
          background-color: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
        }
        
        .add-subject {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .add-subject input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .add-subject select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .add-subject button {
          padding: 10px 15px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .add-subject button:hover {
          background-color: #2980b9;
        }
        
        .subject-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .no-subjects {
          text-align: center;
          color: #7f8c8d;
          font-style: italic;
        }
        
        .subject-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background-color: white;
          border-radius: 5px;
          cursor: pointer;
          border-left: 4px solid transparent;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .subject-item:hover {
          background-color: #f5f5f5;
        }
        
        .subject-item.selected {
          border-left-color: #3498db;
          background-color: #e8f4fd;
        }
        
        .subject-name {
          font-weight: bold;
          flex: 1;
        }
        
        .difficulty-badge {
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 0.8rem;
          color: white;
          margin: 0 10px;
        }
        
        .difficulty-badge.easy {
          background-color: #2ecc71;
        }
        
        .difficulty-badge.medium {
          background-color: #f39c12;
        }
        
        .difficulty-badge.hard {
          background-color: #e74c3c;
        }
        
        .review-status {
          font-size: 0.8rem;
          color: #7f8c8d;
        }
        
        .review-notifications {
          margin-top: 30px;
          padding: 15px;
          background-color: #ffe9e3;
          border-left: 4px solid #e74c3c;
          border-radius: 5px;
        }
        
        .review-notifications h3 {
          color: #e74c3c;
          margin-top: 0;
        }
        
        .review-notifications ul {
          padding-left: 20px;
        }
        
        .review-notifications li {
          margin-bottom: 5px;
          cursor: pointer;
        }
        
        .review-notifications li:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default PomodoroStudyApp;
