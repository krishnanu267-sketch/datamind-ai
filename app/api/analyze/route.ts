import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Mistral } from '@mistralai/mistralai';

const recordSchema = z.record(z.string(), z.any());
const schema = z.object({
  profile: recordSchema,
  sample: z.array(recordSchema).max(12),
  question: z.string().max(1200).optional(),
});

const responseSchema = z.object({
  summary: z.string().default(''),
  insights: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
  questions: z.array(z.string()).default([]),
});

function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object' && 'text' in part) return String((part as { text: unknown }).text);
      return '';
    }).join('');
  }
  return '';
}

function cleanJsonText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        demo: true,
        summary: 'Your dataset was profiled successfully, but Mistral AI is not configured for this deployment.',
        insights: [
          `The dataset contains ${body.profile.rows ?? 'multiple'} rows and ${body.profile.columns ?? 'multiple'} columns.`,
          'Review missing values and duplicate rows before modeling.',
          'Use the dashboard to identify trends and outliers.',
        ],
        recommendations: ['Check data types and categorical consistency.', 'Investigate columns with substantial missing values.'],
      });
    }

    const client = new Mistral({ apiKey });
    const prompt = `You are DataMind AI, an expert data analyst. Analyze the supplied dataset profile and sample. Never invent numbers. Return ONLY valid JSON with exactly these keys: summary (string), insights (string[]), recommendations (string[]), questions (string[]). Do not wrap the JSON in Markdown code fences. Make summary a useful 2-4 sentence executive overview. Profile: ${JSON.stringify(body.profile)} Sample: ${JSON.stringify(body.sample)} User question: ${body.question || 'Give the most useful analysis.'}`;

    const result = await client.chat.complete({
      model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      responseFormat: { type: 'json_object' },
    });

    const rawText = extractText(result.choices?.[0]?.message?.content);
    const text = cleanJsonText(rawText);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: rawText, insights: [], recommendations: [], questions: [] };
    }

    const normalized = responseSchema.parse(parsed);
    const summary = normalized.summary || normalized.insights[0] || 'Data analysis completed successfully.';
    return NextResponse.json({ ...normalized, summary, answer: summary, build: 'datamind-analytics-v3' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    console.error('DataMind AI analysis error:', message);
    return NextResponse.json({ error: message, build: 'datamind-analytics-v3' }, { status: 500 });
  }
}
