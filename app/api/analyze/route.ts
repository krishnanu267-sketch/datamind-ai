import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';

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

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        demo: true,
        summary: 'Live AI analysis is not configured for this deployment.',
        answer: 'Live AI analysis is not configured for this deployment.',
        insights: [
          `The dataset contains ${body.profile.rows ?? 'multiple'} rows and ${body.profile.columns ?? 'multiple'} columns.`,
          'Review missing values and duplicate rows before modeling.',
          'Use the dashboard to identify trends and outliers.',
        ],
        recommendations: ['Check data types and categorical consistency.', 'Investigate columns with substantial missing values.'],
        questions: [],
      });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `You are DataMind AI, an expert data analyst. Analyze this dataset profile and sample. Never invent numbers. Return ONLY valid JSON with keys summary (string), insights (array of strings), recommendations (array of strings), questions (array of strings). Make summary a useful 2-4 sentence executive overview. Profile: ${JSON.stringify(body.profile)} Sample: ${JSON.stringify(body.sample)} User question: ${body.question || 'Give the most useful analysis.'}`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      input: prompt,
    });

    const text = response.output_text?.trim();
    if (!text) throw new Error('OpenAI returned an empty response.');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { summary: text, insights: [], recommendations: [], questions: [] };
    }

    const normalized = responseSchema.parse(parsed);
    const summary = normalized.summary || normalized.insights[0] || 'Data analysis completed successfully.';

    return NextResponse.json({ ...normalized, summary, answer: summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Analysis failed';
    console.error('DataMind AI analysis error:', e);
    return NextResponse.json({ error: message, summary: '', insights: [], recommendations: [], questions: [] }, { status: 500 });
  }
}
