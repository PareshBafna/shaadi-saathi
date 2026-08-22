// global/js/security.js
(function () {
  // 1. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 2. Block Inspection, Source, & Save Shortcuts across Windows/Linux/macOS
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // Block F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }

    // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Cmd+Opt+I, Cmd+Opt+J, Cmd+Opt+C on Mac)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
      e.preventDefault();
      return false;
    }

    // Block Ctrl+U / Cmd+U (View Source) & Ctrl+S / Cmd+S (Save Page)
    if ((e.ctrlKey || e.metaKey) && ['u', 's'].includes(key)) {
      e.preventDefault();
      return false;
    }
  });

  // 3. DevTools Active Debugger Trap (Replaces destructive DOM clearing)
  setInterval(() => {
    const startTime = performance.now();
    debugger;
    const endTime = performance.now();
    
    // If DevTools is open and paused, clear the console immediately
    if (endTime - startTime > 100) {
      console.clear();
    }
  }, 1500);
})();