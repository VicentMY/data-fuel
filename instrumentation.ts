export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runInitialIngestion } = await import('./app/lib/ingestion');
    // Fire and forget — server starts immediately; ingestion runs in background
    runInitialIngestion().catch((err) =>
      console.error('[Instrumentation] Background ingestion failed:', err)
    );
  }
}
