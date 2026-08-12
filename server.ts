import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI client lazily to avoid crashing on start if key is missing
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Server-side secure Gemini Chat API
app.post('/api/chat', async (req, res) => {
  try {
    const { query, schemaSummary, importantCorrs, anomaliesCount, sampleRows } = req.body;
    
    if (!query) {
      res.status(400).json({ error: 'Query parameter is required.' });
      return;
    }

    const ai = getAiClient();

    const systemPrompt = `You are DataAI, an expert, cognitive data analytics assistant. You analyze datasets and provide visually rich, precise, and professional insights.
You are running on a secure server, inspecting the following dataset details uploaded by the user:

## DATASET PROPERTIES:
- Schema & Sample Values: ${JSON.stringify(schemaSummary || {})}
- Strong correlations (Pearson r): ${JSON.stringify(importantCorrs || [])}
- Anomaly (Outlier) Count: ${anomaliesCount || 0}
- Sample Data Rows: ${JSON.stringify(sampleRows || [])}

## INSTRUCTIONS:
1. Provide a highly accurate, professional response.
2. Format your response in markdown. Use bullet points, bold accents, and tables where helpful.
3. Be concise and practical. Focus on trends, correlations, business predictions, or anomaly resolutions based on the columns.
4. Do not make up facts outside the provided scope.
5. If the user asks you to write code, provide standard JS, TS, or SQL snippets.

User's Question: "${query}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
    });

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred during text generation.' });
  }
});

// Server-side secure Gemini Strategic Narrative Generator (Feature 4)
app.post('/api/narrative', async (req, res) => {
  try {
    const { schemaSummary, statsSummary, anomaliesCount, correlations, filename, focus } = req.body;
    const ai = getAiClient();
    
    const focusInstructions = {
      default: "Provide a comprehensive data health, major trend correlations, and strategic recommendations overview.",
      financial: "Analyze financial/metric implications, ROI indicators, and business performance trends.",
      quality: "Detail data hygiene, integrity violations, noise detection, and remediation workflows.",
      strategic: "Draft concrete next steps, executive operational plays, and future forecast opportunities."
    }[focus as string || 'default'] || "Provide a comprehensive data health, major trend correlations, and strategic recommendations overview.";

    const prompt = `You are DataAI, the leading executive intelligence analyst. Write a highly professional, strategic Executive Narrative Brief based on the ingested dataset: "${filename}".

## INGESTION DATASET META:
- Schema Properties: ${JSON.stringify(schemaSummary || {})}
- Metric Statistics Summaries: ${JSON.stringify(statsSummary || {})}
- Anomalous Items Outlier Count: ${anomalousCount => anomaliesCount || 0}
- Correlation Matrix: ${JSON.stringify(correlations || {})}

## ANALYSIS FOCUS REQUESTED:
"${focusInstructions}"

## FORMAT REQUIREMENTS:
- Provide the response in beautifully styled Markdown.
- Organize into 4 clearly labeled sections:
  1. 📊 EXECUTIVE SUMMARY: An elegant high-level overview of what the dataset represents and its overall health.
  2. 🔍 KEY FINDINGS & PATTERNS: Deep analytical insights into the correlations, metrics, and temporal/numeric patterns.
  3. ⚠️ RISK ASSESSMENT & ANOMALIES: Technical commentary on any outlier data rows, quality flags, or structural variances.
  4. 📈 STRATEGIC RECOMMENDATIONS: 3 concrete, data-backed actions that the team should take immediately.
- Use bullet points, bold emphasis, and structured highlights. Do not use generic filler words. Be crisp, technical, and executive-level.
- Do not mention process.env or keys. Keep it fully human-readable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ narrative: response.text || '' });
  } catch (error: any) {
    console.error('Narrative API Error:', error);
    res.status(500).json({ error: error.message || 'Failed to synthesize the narrative.' });
  }
});

// Setup Vite or Static File Serving
async function setupServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DataAI Server] running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

setupServer();
