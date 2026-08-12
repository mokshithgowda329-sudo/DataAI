/**
 * DataAI Central Application Controller
 * Coordinates parsing, calculations, and UI updates, and orchestrates the central state machine.
 */

window.DataApp = {
  currentDataset: null,
  schema: null,
  statistics: null,
  correlations: null,
  anomalies: null,
  geminiKey: null,

  /**
   * Application bootstrap
   */
  init: function() {
    this.geminiKey = localStorage.getItem('dataai-gemini-key') || null;
    window.DataUI.init();
    
    // Check url parameter or console state
    console.log("🚀 DataAI Core Platform Initialized successfully.");
  },

  /**
   * Load data from local files
   * @param {File} file 
   */
  loadFromFile: function(file) {
    const reader = new FileReader();
    const name = file.name;
    const ext = name.split('.').pop().toLowerCase();

    // Visual indicators
    const logConsole = document.getElementById('uploadProgressLog');
    if (logConsole) {
      logConsole.textContent = `Reading ${name}...`;
      logConsole.className = "progress-log info";
    }

    reader.onerror = () => {
      this.handleLoadError(new Error("Error reading file from disk."));
    };

    if (ext === 'xlsx' || ext === 'xls') {
      reader.onload = (e) => {
        try {
          const data = window.DataParser.parseExcel(e.target.result);
          this.processLoadedDataset(data, name);
        } catch (err) {
          this.handleLoadError(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV, JSON, SQL
      reader.onload = async (e) => {
        try {
          let data = null;
          const text = e.target.result;

          if (ext === 'csv') {
            data = await window.DataParser.parseCSV(text);
          } else if (ext === 'json') {
            data = window.DataParser.parseJSON(text);
          } else if (ext === 'sql') {
            data = window.DataParser.parseSQL(text);
          } else {
            // Attempt auto-parsing (CSV fallback)
            data = await window.DataParser.parseCSV(text);
          }

          this.processLoadedDataset(data, name);
        } catch (err) {
          this.handleLoadError(err);
        }
      };
      reader.readAsText(file);
    }
  },

  /**
   * Load test mock data sets
   * @param {string} type - 'sales' or 'health'
   */
  loadSampleData: function(type) {
    const mock = window.sampleDatasets[type];
    if (mock) {
      this.processLoadedDataset(mock, `Demo_${type === 'sales' ? 'Global_Sales.csv' : 'Fitness_Tracker.xlsx'}`);
    } else {
      window.DataUI.showToast("Requested sample dataset not found.", "error");
    }
  },

  /**
   * Common dataset processor
   * Injects data, runs calculations, registers schema properties, updates widgets
   */
  processLoadedDataset: function(rawArray, sourceName) {
    if (!rawArray || rawArray.length === 0) {
      throw new Error("Parsed dataset is empty or invalid.");
    }

    // 1. Save data state
    this.currentDataset = rawArray;

    // 2. Run statistics and schema definitions
    this.schema = window.DataParser.detectSchema(this.currentDataset);
    this.statistics = window.DataAnalytics.calculateBasicStats(this.currentDataset, this.schema);
    this.correlations = window.DataAnalytics.calculateCorrelations(this.currentDataset, this.schema);
    this.anomalies = window.DataAnalytics.detectAnomalies(this.currentDataset, this.schema, this.statistics);

    // 3. Setup and register options inside visual widgets
    window.DataUI.setupDatasetOptions();
    window.DataUI.populateOverviewKPIs();

    // 4. Interface state swaps: transition from landing page to dashboard workspace
    document.getElementById('landingView').classList.add('hidden');
    document.getElementById('workspaceView').classList.remove('hidden');

    // Reset view tab to Overview
    window.DataUI.switchTab('overview');

    // 5. Update heading/title with dataset filename
    const filenameEl = document.getElementById('loadedFilename');
    if (filenameEl) {
      filenameEl.textContent = sourceName;
    }

    // Clear chatbot logs and insert welcoming greeting containing columns details
    const logs = document.getElementById('chatLogs');
    if (logs) {
      logs.innerHTML = "";
      window.DataUI.appendChatBubble('ai', `👋 Hello! I have processed **${sourceName}** containing **${this.currentDataset.length}** rows.
\nI auto-detected **${Object.keys(this.schema).length}** attributes. What would you like to explore? You can write queries in the SQL Workspace, chart coordinates in Visualizations, fit linear regressions in Predictions, or ask me directly here!`);
    }

    // 6. Canvas celebrate
    if (typeof confetti !== 'undefined') {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }

    window.DataUI.showToast(`Successfully loaded ${rawArray.length} records!`, "success");
  },

  handleLoadError: function(err) {
    console.error("Dataset load error:", err);
    window.DataUI.showToast(err.message || "Failed to load dataset.", "error");

    const logConsole = document.getElementById('uploadProgressLog');
    if (logConsole) {
      logConsole.textContent = `Error: ${err.message}`;
      logConsole.className = "progress-log error";
    }
  }
};

// Start application
document.addEventListener('DOMContentLoaded', () => {
  window.DataApp.init();
});
