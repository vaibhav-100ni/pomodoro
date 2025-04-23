import React, { useState, useEffect } from 'react';

// Standard React CSS import instead of styled-jsx
import './PomodoroStyles.css'; // You'll need to create this CSS file separately

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
            if (interval) clearInterval(interval);
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

  // Handle Enter key press in input field
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addSubject();
    }
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
          <button className="control-btn primary-btn" onClick={toggleTimer}>
            {isActive ? 'Pause' : 'Start'}
          </button>
          <button className="control-btn secondary-btn" onClick={resetTimer}>Reset</button>
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
            onKeyPress={handleKeyPress}
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
    </div>
  );
};

export default PomodoroStudyApp;