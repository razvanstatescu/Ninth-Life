import { llmsText } from '@/components/site/llms';

/** /llms.txt: a Markdown summary for answer engines (components/site/llms.ts, marketing-site MS-3.8). */
export const dynamic = 'force-static';

export function GET(): Response {
  return new Response(llmsText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
