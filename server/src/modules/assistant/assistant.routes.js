import { Router } from 'express';
import { env } from '../../config/env.js';
import { letters, departments } from '../../utils/sampleData.js';

export const assistantRouter = Router();

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

function normalizePriority(value) {
  return ['URGENT', 'HIGH'].includes(String(value || '').toUpperCase()) ? 'URGENT' : 'NORMAL';
}

function getLetterDate(letter) {
  return new Date(letter.letterDate || letter.receivedAt || letter.dispatchedAt || letter.createdAt || Date.now());
}

// A compact, AI-friendly snapshot of every letter so the model can do real analysis.
function buildDataset() {
  const rows = letters.map((l) => ({
    registry: l.registryNumber || l.trackingNumber,
    reference: l.letterNumber || '',
    direction: l.type === 'INCOMING' ? 'Received' : 'Dispatched',
    status: l.type === 'INCOMING' ? 'Received' : 'Dispatched',
    date: getLetterDate(l).toISOString().slice(0, 10),
    institution: l.senderOrganization || l.recipient || l.sender || '',
    directorate: l.routeDepartment || l.currentDepartment || '',
    subject: l.subject || '',
    priority: normalizePriority(l.priority),
    remarks: l.remarks || ''
  }));

  const received = rows.filter((r) => r.direction === 'Received').length;
  const dispatched = rows.filter((r) => r.direction === 'Dispatched').length;
  const urgent = rows.filter((r) => r.priority === 'URGENT').length;

  return {
    summary: {
      totalLetters: rows.length,
      totalReceived: received,
      totalDispatched: dispatched,
      urgent,
      normal: rows.length - urgent,
      directorates: departments.map((d) => d.name)
    },
    letters: rows
  };
}

function buildSystemPrompt() {
  const dataset = buildDataset();
  return `You are the built-in AI assistant for the PURC Letter & Document Tracking System — an internal web application used by Ghana's Public Utilities Regulatory Commission (PURC), Energy Sector, to register and track official correspondence with utility companies (electricity, water and gas).

YOUR TWO JOBS:
1. Answer any question a staff member has about how the program works (its pages, features and terminology).
2. Perform any analysis the user asks for on the live letter data provided below.

HOW THE PROGRAM WORKS (use this to answer "how do I…" questions):
- Letters have two types/statuses only: "Received" (incoming letters logged when they arrive) and "Dispatched" (outgoing letters sent out). There are no other statuses.
- Pages: Dashboard (two metric cards — Total Letters Received, Total Letters Dispatched — plus the Letter Register and a reporting-period date selector), Received Letter Register and Dispatched Letter Register (register/edit letters; registry numbers are auto-generated, sequential and separate per type), Search (advanced, type-aware search that respects the global period at the top), Tracking Timeline, Analytics (charts: Received vs Dispatched, Directorate Workload, Priority donut), Users and Audit Logs.
- The date selector at the top sets a global reporting period that flows through the Dashboard, Search and Analytics.
- Priority has two values only: Urgent and Normal.
- Institutions are Ghanaian utility companies (e.g. ECG, NEDCo, GRIDCo, VRA, GWCL, Ghana Gas, etc.).

LIVE DATA (current letter records — analyse this when asked):
${JSON.stringify(dataset, null, 2)}

RULES:
- Base every factual/analytical answer ONLY on the live data above. If the data can't answer it, say so plainly.
- When you compute numbers (counts, breakdowns, trends), show the figures clearly; use small markdown tables where helpful.
- Be concise, professional and accurate. Today's date is ${new Date().toISOString().slice(0, 10)}.
- If asked something outside this program or its data, briefly say it's outside the scope of the tracker.`;
}

// ── Google Gemini (free tier) ──
async function askGemini(systemPrompt, history, question) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`;
  const contents = [
    ...history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }]
    })),
    { role: 'user', parts: [{ text: question }] }
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.4 }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Gemini API error:', response.status, detail);
    throw new Error('gemini_failed');
  }

  const data = await response.json();
  return (data.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('\n')
    .trim();
}

// ── Anthropic Claude (paid) ──
async function askClaude(systemPrompt, history, question) {
  const messages = [
    ...history.map((m) => ({ role: m.role, content: String(m.content) })),
    { role: 'user', content: question }
  ];

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 1024,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('Anthropic API error:', response.status, detail);
    throw new Error('claude_failed');
  }

  const data = await response.json();
  return (data.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

assistantRouter.post('/ask', async (req, res, next) => {
  try {
    // Prefer the free Gemini provider; fall back to Claude if only that is configured.
    const provider = env.geminiApiKey ? 'gemini' : env.anthropicApiKey ? 'claude' : null;
    if (!provider) {
      return res.status(503).json({
        error: 'AI assistant not configured',
        message: 'The AI assistant is not yet enabled. An administrator needs to set the GEMINI_API_KEY (free) or ANTHROPIC_API_KEY environment variable on the server.'
      });
    }

    const question = String(req.body?.question || '').trim();
    if (!question) return res.status(400).json({ error: 'A question is required.' });

    // Prior turns from the client, kept short for cost/latency.
    const history = (Array.isArray(req.body?.history) ? req.body.history : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-10);

    const systemPrompt = buildSystemPrompt();
    let answer;
    try {
      answer = provider === 'gemini'
        ? await askGemini(systemPrompt, history, question)
        : await askClaude(systemPrompt, history, question);
    } catch {
      return res.status(502).json({ error: 'The AI service could not be reached. Please try again.' });
    }

    res.json({ answer: answer || 'I could not generate an answer. Please rephrase your question.' });
  } catch (error) {
    next(error);
  }
});
