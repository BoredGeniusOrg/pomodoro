// Pomodoro Timer Application with Day-Based Tracking
class PomodoroTimer {
  constructor() {
    // Timer constants (in seconds)
    this.FOCUS_TIME = 1 * 60; // 25 minutes
    this.SHORT_BREAK = 5 * 60; // 5 minutes
    this.LONG_BREAK = 30 * 60; // 30 minutes
    this.SESSIONS_BEFORE_LONG_BREAK = 4;

    // State
    this.timeRemaining = this.FOCUS_TIME;
    this.totalTime = this.FOCUS_TIME;
    this.isRunning = false;
    this.currentMode = 'ready'; // 'ready', 'focus', 'shortBreak', 'longBreak'
    this.timerInterval = null;
    this.autoProgress = false; // Auto-progress to next session

    // Day tracking
    this.dayActive = false;
    this.dayStartTime = null;
    this.completedFocusSessions = 0;
    this.completedShortBreaks = 0;
    this.completedLongBreaks = 0;
    this.sessionsSinceLastLongBreak = 0;

    // DOM elements
    this.timeDisplay = document.getElementById('timeDisplay');
    this.timerLabel = document.getElementById('timerLabel');
    this.currentModeDisplay = document.getElementById('currentMode');
    this.sessionsTodayDisplay = document.getElementById('sessionsToday');
    this.longBreaksTodayDisplay = document.getElementById('longBreaksToday');
    this.progressCircle = document.getElementById('progressCircle');
    this.sessionProgress = document.getElementById('sessionProgress');
    this.progressText = document.getElementById('progressText');
    this.notification = document.getElementById('notification');
    this.notificationText = document.getElementById('notificationText');

    // Buttons
    this.startDayBtn = document.getElementById('startDayBtn');
    this.endDayBtn = document.getElementById('endDayBtn');
    this.startBtn = document.getElementById('startBtn');
    this.pauseBtn = document.getElementById('pauseBtn');
    this.resetBtn = document.getElementById('resetBtn');
    this.toggleSettingsBtn = document.getElementById('toggleSettings');
    this.settingsContent = document.getElementById('settingsContent');
    this.saveSettingsBtn = document.getElementById('saveSettings');
    this.sessionsInput = document.getElementById('sessionsInput');
    this.autoProgressToggle = document.getElementById('autoProgressToggle');

    // Modal elements
    this.summaryModal = document.getElementById('summaryModal');
    this.closeSummaryBtn = document.getElementById('closeSummary');
    this.startNewDayBtn = document.getElementById('startNewDay');

    // Add SVG gradient
    this.addSVGGradient();

    // Initialize
    this.loadState();
    this.attachEventListeners();
    this.updateDisplay();
    this.updateDayInfo();

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.isRunning) {
        this.syncTimeFromStorage();
      }
    });

    // Save state before page unload
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });

    // Periodic state sync (every second when running)
    setInterval(() => {
      if (this.isRunning) {
        this.saveState();
      }
    }, 1000);
  }

  addSVGGradient() {
    const svg = document.querySelector('.progress-ring');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('style', 'stop-color:hsl(262, 83%, 68%);stop-opacity:1');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('style', 'stop-color:hsl(217, 91%, 60%);stop-opacity:1');

    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.insertBefore(defs, svg.firstChild);
  }

  attachEventListeners() {
    this.startDayBtn.addEventListener('click', () => this.startDay());
    this.endDayBtn.addEventListener('click', () => this.endDay());
    this.startBtn.addEventListener('click', () => this.start());
    this.pauseBtn.addEventListener('click', () => this.pause());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.toggleSettingsBtn.addEventListener('click', () => this.toggleSettings());
    this.saveSettingsBtn.addEventListener('click', () => this.saveSettings());
    this.closeSummaryBtn.addEventListener('click', () => this.closeSummary());
    this.startNewDayBtn.addEventListener('click', () => this.startNewDay());
  }

  toggleSettings() {
    this.settingsContent.classList.toggle('active');
  }

  saveSettings() {
    const newSessions = parseInt(this.sessionsInput.value);
    if (newSessions >= 1 && newSessions <= 10) {
      this.SESSIONS_BEFORE_LONG_BREAK = newSessions;
      this.autoProgress = this.autoProgressToggle.checked;
      this.updateDayInfo();
      this.saveState();
      const autoMsg = this.autoProgress ? ' Auto-progress enabled! 🚀' : '';
      this.showNotification('Settings saved! Long break after ' + newSessions + ' sessions ⚙️' + autoMsg);
    } else {
      this.showNotification('Please enter a value between 1 and 10 ⚠️');
    }
  }

  startDay() {
    this.dayActive = true;
    this.dayStartTime = Date.now();
    this.completedFocusSessions = 0;
    this.completedShortBreaks = 0;
    this.completedLongBreaks = 0;
    this.sessionsSinceLastLongBreak = 0;

    this.startDayBtn.disabled = true;
    this.endDayBtn.disabled = false;

    this.switchMode('focus');
    this.updateDayInfo();
    this.saveState();
    this.showNotification("Day started! Let's focus! 🚀");
  }

  endDay() {
    if (this.isRunning) {
      this.pause();
    }

    // Reset day state before showing summary
    this.dayActive = false;
    this.startDayBtn.disabled = false;
    this.endDayBtn.disabled = true;

    this.showSummary();
    this.saveState();
  }

  showSummary() {
    const dayEndTime = Date.now();
    const totalFocusMinutes = this.completedFocusSessions * 25;
    const hours = Math.floor(totalFocusMinutes / 60);
    const minutes = totalFocusMinutes % 60;

    // Update summary values
    document.getElementById('summaryTotalSessions').textContent = this.completedFocusSessions;
    document.getElementById('summaryShortBreaks').textContent = this.completedShortBreaks;
    document.getElementById('summaryLongBreaks').textContent = this.completedLongBreaks;
    document.getElementById('summaryFocusTime').textContent = `${hours}h ${minutes}m`;
    document.getElementById('summaryStartTime').textContent = this.formatTime(this.dayStartTime);
    document.getElementById('summaryEndTime').textContent = this.formatTime(dayEndTime);

    // Set motivational message based on sessions
    const messageEl = document.getElementById('summaryMessage');
    if (this.completedFocusSessions === 0) {
      messageEl.textContent = 'Every journey starts with a single step. Tomorrow is a new day! 💪';
    } else if (this.completedFocusSessions < 4) {
      messageEl.textContent = 'Good start! Keep building that momentum! 🌟';
    } else if (this.completedFocusSessions < 8) {
      messageEl.textContent = "Great work today! You're making real progress! 🎯";
    } else {
      messageEl.textContent = "Outstanding performance! You're crushing it! 🔥";
    }

    this.summaryModal.classList.add('show');
  }

  closeSummary() {
    this.summaryModal.classList.remove('show');
  }

  startNewDay() {
    this.closeSummary();

    // Reset all day tracking
    this.dayActive = false;
    this.dayStartTime = null;
    this.completedFocusSessions = 0;
    this.completedShortBreaks = 0;
    this.completedLongBreaks = 0;
    this.sessionsSinceLastLongBreak = 0;

    // Reset button states
    this.startDayBtn.disabled = false;
    this.endDayBtn.disabled = true;

    // Switch to ready mode
    this.switchMode('ready');

    // Update displays
    this.updateDisplay();
    this.updateDayInfo();
    this.saveState();
  }

  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  start() {
    if (!this.dayActive) {
      this.showNotification('Please start your day first! 📅');
      return;
    }

    if (!this.isRunning) {
      this.isRunning = true;
      this.startBtn.disabled = true;
      this.pauseBtn.disabled = false;
      this.timerInterval = setInterval(() => this.tick(), 1000);
      this.saveState();
    }
  }

  pause() {
    if (this.isRunning) {
      this.isRunning = false;
      this.startBtn.disabled = false;
      this.pauseBtn.disabled = true;
      clearInterval(this.timerInterval);
      this.saveState();
    }
  }

  reset() {
    this.pause();
    this.timeRemaining = this.totalTime;
    this.updateDisplay();
    this.saveState();
  }

  tick() {
    if (this.timeRemaining > 0) {
      this.timeRemaining--;
      this.updateDisplay();
    } else {
      this.onTimerComplete();
    }
  }

  onTimerComplete() {
    this.pause();

    if (this.currentMode === 'focus') {
      this.completedFocusSessions++;
      this.sessionsSinceLastLongBreak++;
      this.updateDayInfo();

      // Check if it's time for a long break
      if (this.sessionsSinceLastLongBreak >= this.SESSIONS_BEFORE_LONG_BREAK) {
        this.switchMode('longBreak');
        this.showNotification('Amazing! Time for a long break! 🎉');
        this.playSound();
      } else {
        this.switchMode('shortBreak');
        this.showNotification('Focus session complete! Take a short break! ☕');
        this.playSound();
      }
    } else if (this.currentMode === 'shortBreak') {
      this.completedShortBreaks++;
      this.switchMode('focus');
      this.showNotification('Break is over! Ready to focus? 💪');
      this.playSound();
    } else if (this.currentMode === 'longBreak') {
      this.completedLongBreaks++;
      this.sessionsSinceLastLongBreak = 0;
      this.switchMode('focus');
      this.showNotification("Long break complete! Let's get back to work! 🚀");
      this.playSound();
    }

    this.updateDayInfo();
    this.saveState();

    // Auto-start next session if enabled
    if (this.autoProgress && this.dayActive) {
      setTimeout(() => {
        this.start();
      }, 1000); // 1 second delay before auto-starting
    }
  }

  switchMode(mode) {
    this.currentMode = mode;

    switch (mode) {
      case 'ready':
        this.totalTime = this.FOCUS_TIME;
        this.timerLabel.textContent = 'Ready to Start';
        this.currentModeDisplay.textContent = 'Ready';
        break;
      case 'focus':
        this.totalTime = this.FOCUS_TIME;
        this.timerLabel.textContent = 'Focus Time';
        this.currentModeDisplay.textContent = 'Focus';
        break;
      case 'shortBreak':
        this.totalTime = this.SHORT_BREAK;
        this.timerLabel.textContent = 'Short Break';
        this.currentModeDisplay.textContent = 'Break';
        break;
      case 'longBreak':
        this.totalTime = this.LONG_BREAK;
        this.timerLabel.textContent = 'Long Break';
        this.currentModeDisplay.textContent = 'Long Break';
        break;
    }

    this.timeRemaining = this.totalTime;
    this.updateDisplay();
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    this.timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Update progress circle
    const progress = (this.totalTime - this.timeRemaining) / this.totalTime;
    const circumference = 2 * Math.PI * 130; // radius = 130
    const offset = circumference - progress * circumference;
    this.progressCircle.style.strokeDashoffset = offset;

    // Update document title
    if (this.dayActive) {
      document.title = `${this.timeDisplay.textContent} - ${this.timerLabel.textContent}`;
    } else {
      document.title = 'Pomodoro Timer - Stay Focused';
    }
  }

  updateDayInfo() {
    this.sessionsTodayDisplay.textContent = this.completedFocusSessions;
    this.longBreaksTodayDisplay.textContent = this.completedLongBreaks;

    // Update progress bar (progress toward next long break)
    const progress = (this.sessionsSinceLastLongBreak / this.SESSIONS_BEFORE_LONG_BREAK) * 100;
    this.sessionProgress.style.width = `${progress}%`;

    if (!this.dayActive) {
      this.progressText.textContent = 'Start your day to begin tracking';
    } else {
      this.progressText.textContent = `${this.sessionsSinceLastLongBreak} of ${this.SESSIONS_BEFORE_LONG_BREAK} sessions until long break`;
    }
  }

  showNotification(message) {
    this.notificationText.textContent = message;
    this.notification.classList.add('show');

    setTimeout(() => {
      this.notification.classList.remove('show');
    }, 4000);
  }

  playSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  saveState() {
    const state = {
      timeRemaining: this.timeRemaining,
      totalTime: this.totalTime,
      isRunning: this.isRunning,
      currentMode: this.currentMode,
      dayActive: this.dayActive,
      dayStartTime: this.dayStartTime,
      completedFocusSessions: this.completedFocusSessions,
      completedShortBreaks: this.completedShortBreaks,
      completedLongBreaks: this.completedLongBreaks,
      sessionsSinceLastLongBreak: this.sessionsSinceLastLongBreak,
      sessionsBeforeLongBreak: this.SESSIONS_BEFORE_LONG_BREAK,
      autoProgress: this.autoProgress,
      lastUpdate: Date.now(),
    };

    localStorage.setItem('pomodoroState', JSON.stringify(state));
  }

  loadState() {
    const savedState = localStorage.getItem('pomodoroState');

    if (savedState) {
      const state = JSON.parse(savedState);

      // Calculate time elapsed since last update
      const timeElapsed = Math.floor((Date.now() - state.lastUpdate) / 1000);

      this.currentMode = state.currentMode;
      this.dayActive = state.dayActive;
      this.dayStartTime = state.dayStartTime;
      this.completedFocusSessions = state.completedFocusSessions;
      this.completedShortBreaks = state.completedShortBreaks;
      this.completedLongBreaks = state.completedLongBreaks;
      this.sessionsSinceLastLongBreak = state.sessionsSinceLastLongBreak;
      this.totalTime = state.totalTime;

      // Restore sessions before long break setting
      if (state.sessionsBeforeLongBreak) {
        this.SESSIONS_BEFORE_LONG_BREAK = state.sessionsBeforeLongBreak;
        this.sessionsInput.value = state.sessionsBeforeLongBreak;
      }

      // Restore auto-progress setting
      if (state.autoProgress !== undefined) {
        this.autoProgress = state.autoProgress;
        this.autoProgressToggle.checked = state.autoProgress;
      }

      // Update button states
      if (this.dayActive) {
        this.startDayBtn.disabled = true;
        this.endDayBtn.disabled = false;
      } else {
        this.startDayBtn.disabled = false;
        this.endDayBtn.disabled = true;
      }

      // Adjust time remaining based on elapsed time
      if (state.isRunning) {
        this.timeRemaining = Math.max(0, state.timeRemaining - timeElapsed);

        // If timer would have completed, handle it
        if (this.timeRemaining === 0) {
          this.onTimerComplete();
        } else {
          // Resume timer
          this.start();
        }
      } else {
        this.timeRemaining = state.timeRemaining;
      }

      // Update mode-specific labels
      switch (this.currentMode) {
        case 'ready':
          this.timerLabel.textContent = 'Ready to Start';
          this.currentModeDisplay.textContent = 'Ready';
          break;
        case 'focus':
          this.timerLabel.textContent = 'Focus Time';
          this.currentModeDisplay.textContent = 'Focus';
          break;
        case 'shortBreak':
          this.timerLabel.textContent = 'Short Break';
          this.currentModeDisplay.textContent = 'Break';
          break;
        case 'longBreak':
          this.timerLabel.textContent = 'Long Break';
          this.currentModeDisplay.textContent = 'Long Break';
          break;
      }
    }
  }

  syncTimeFromStorage() {
    const savedState = localStorage.getItem('pomodoroState');

    if (savedState && this.isRunning) {
      const state = JSON.parse(savedState);
      const timeElapsed = Math.floor((Date.now() - state.lastUpdate) / 1000);
      this.timeRemaining = Math.max(0, state.timeRemaining - timeElapsed);

      if (this.timeRemaining === 0) {
        this.onTimerComplete();
      }
    }
  }
}

// Initialize the timer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PomodoroTimer();
});
