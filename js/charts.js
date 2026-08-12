/**
 * DataAI Visualization Adapter (Chart.js wrapper)
 * Manages chart instances, updates, responsive scaling, dynamic themes (dark/light), and custom color palettes.
 */

window.DataCharts = {
  activeChart: null,
  activeAnalyticsChart: null,

  // Modern Color Palettes
  palettes: {
    cyberpunk: {
      primary: 'rgba(147, 51, 234, 1)',   // Purple
      secondary: 'rgba(6, 182, 212, 1)', // Cyan
      borderPrimary: 'rgba(147, 51, 234, 1)',
      borderSecondary: 'rgba(6, 182, 212, 1)',
      backgrounds: [
        'rgba(147, 51, 234, 0.65)',
        'rgba(6, 182, 212, 0.65)',
        'rgba(236, 72, 153, 0.65)', // Pink
        'rgba(59, 130, 246, 0.65)',  // Blue
        'rgba(245, 158, 11, 0.65)'  // Amber
      ]
    },
    sunset: {
      primary: 'rgba(244, 63, 94, 1)',    // Rose
      secondary: 'rgba(249, 115, 22, 1)',  // Orange
      borderPrimary: 'rgba(244, 63, 94, 1)',
      borderSecondary: 'rgba(249, 115, 22, 1)',
      backgrounds: [
        'rgba(244, 63, 94, 0.65)',
        'rgba(249, 115, 22, 0.65)',
        'rgba(234, 179, 8, 0.65)',  // Yellow
        'rgba(168, 85, 247, 0.65)', // Purple
        'rgba(236, 72, 153, 0.65)'  // Pink
      ]
    },
    emerald: {
      primary: 'rgba(16, 185, 129, 1)',   // Emerald
      secondary: 'rgba(20, 184, 166, 1)', // Teal
      borderPrimary: 'rgba(16, 185, 129, 1)',
      borderSecondary: 'rgba(20, 184, 166, 1)',
      backgrounds: [
        'rgba(16, 185, 129, 0.65)',
        'rgba(20, 184, 166, 0.65)',
        'rgba(34, 197, 94, 0.65)',   // Green
        'rgba(132, 204, 22, 0.65)',  // Lime
        'rgba(6, 182, 212, 0.65)'   // Cyan
      ]
    },
    oceanic: {
      primary: 'rgba(59, 130, 246, 1)',   // Blue
      secondary: 'rgba(14, 165, 233, 1)', // Sky
      borderPrimary: 'rgba(59, 130, 246, 1)',
      borderSecondary: 'rgba(14, 165, 233, 1)',
      backgrounds: [
        'rgba(59, 130, 246, 0.65)',
        'rgba(14, 165, 233, 0.65)',
        'rgba(20, 184, 166, 0.65)', // Teal
        'rgba(6, 182, 212, 0.65)',  // Cyan
        'rgba(99, 102, 241, 0.65)'  // Indigo
      ]
    }
  },

  /**
   * Helper to create canvas linear gradient
   */
  createGradient: function(ctx, colorStart, colorEnd, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height || 300);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd || 'rgba(0, 0, 0, 0)');
    return gradient;
  },

  /**
   * Get Chart.js options based on active theme
   */
  getThemeOptions: function(isDarkMode) {
    const textColor = isDarkMode ? '#a9b2c3' : '#4b5563';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { family: 'Inter', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: isDarkMode ? '#fff' : '#0f172a',
          bodyColor: isDarkMode ? '#cbd5e1' : '#334155',
          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 12,
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'Inter' }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Inter', size: 11 }
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'Inter', size: 11 }
          }
        }
      }
    };
  },

  /**
   * Render or update visual chart
   */
  renderChart: function(canvasId, type, labels, datasets, theme = 'cyberpunk', isDarkMode = true) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    
    // Destroy previous chart on this canvas to prevent visual overlap bugs
    if (canvasId === 'workspaceChart' && this.activeChart) {
      this.activeChart.destroy();
    } else if (canvasId === 'analyticsChart' && this.activeAnalyticsChart) {
      this.activeAnalyticsChart.destroy();
    }

    const palette = this.palettes[theme] || this.palettes.cyberpunk;
    const themeOpts = this.getThemeOptions(isDarkMode);

    // Apply specific configs based on chart type
    let configDatasets = datasets.map((d, index) => {
      const colorIndex = index % palette.backgrounds.length;
      const baseBg = palette.backgrounds[colorIndex];
      const baseBorder = baseBg.replace('0.65', '1');

      const ds = {
        label: d.label,
        data: d.data,
        backgroundColor: baseBg,
        borderColor: baseBorder,
        borderWidth: 2
      };

      if (type === 'line' || type === 'area') {
        ds.type = 'line';
        ds.tension = 0.35;
        ds.pointRadius = 4;
        ds.pointHoverRadius = 6;
        ds.borderWidth = 3;
        
        // Custom neon gradient shadow and fill
        if (canvas) {
          const gradFill = this.createGradient(ctx, baseBg, 'rgba(0,0,0,0)', 300);
          ds.backgroundColor = type === 'area' ? gradFill : 'rgba(0,0,0,0)';
          ds.fill = type === 'area';
        }
      } else if (type === 'bar') {
        ds.type = 'bar';
        ds.borderRadius = 6;
        ds.borderSkipped = false;
        
        if (canvas) {
          const gradFill = this.createGradient(ctx, baseBorder, baseBg.replace('0.65', '0.1'), 300);
          ds.backgroundColor = gradFill;
        }
      } else if (type === 'pie' || type === 'doughnut') {
        ds.backgroundColor = palette.backgrounds;
        ds.borderColor = isDarkMode ? '#0d0e17' : '#ffffff';
        ds.borderWidth = 2;
        // Don't show axes scales for pie/doughnut
        delete themeOpts.scales;
      } else if (type === 'radar') {
        ds.fill = true;
        ds.backgroundColor = baseBg.replace('0.65', '0.2');
        ds.borderColor = baseBorder;
        ds.pointBackgroundColor = baseBorder;
        delete themeOpts.scales;
      }

      return ds;
    });

    const chartConfig = {
      type: type === 'area' ? 'line' : type,
      data: {
        labels: labels,
        datasets: configDatasets
      },
      options: themeOpts
    };

    const newChart = new Chart(ctx, chartConfig);

    if (canvasId === 'workspaceChart') {
      this.activeChart = newChart;
    } else if (canvasId === 'analyticsChart') {
      this.activeAnalyticsChart = newChart;
    }

    return newChart;
  }
};
