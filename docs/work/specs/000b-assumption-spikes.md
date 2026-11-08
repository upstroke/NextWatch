# 000b — Assumption spikes

Before implementing product features, verify the following assumptions with small, self-contained spikes.

## Spikes

1. **Local model**: Verify that the selected Qwen model runs reliably through Ollama.
2. **Streaming and cancellation**: Verify streaming and cancellation in the Nuxt UI chat flow.
3. **Structured output**: Verify that the model can produce JSON that is reliably validated with Zod.
4. **TMDb data**: Verify Discover, trending, genres, keywords, images and locale-related fields.
5. **Zod contracts**: Verify that intent, filter and TMDb schemas integrate cleanly with TypeScript.
6. **Nuxt UI chat**: Verify that the chat shell supports messages, loading and cancellation.

## Exit criteria

A spike is successful only when its acceptance criterion has been demonstrated. Do not begin feature implementation until the required spikes have passed.
