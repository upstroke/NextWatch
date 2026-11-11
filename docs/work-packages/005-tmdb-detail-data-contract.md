# TMDb detail data contract

## Status

Completed.

## Purpose

This concept documents the minimal detail data contract for Movie and TV entries.

It defines stable Zod contracts for raw TMDb responses, normalizes Movie and TV details into distinct but related server contracts and exposes them through Nitro routes.

## Endpoints

- `GET /api/tmdb/movie/[id]`
- `GET /api/tmdb/tv/[id]`

## Contract decision

Start with a minimal shared base contract. Movie and TV retain their distinct concepts instead of forcing every field into one generic shape.

`mediaType` is not part of the shared base contract. It is set as a literal value by the Movie and TV mappers.

## Shared base contract

The shared base contract contains:

- `id`
- `title`
- `originalTitle`
- `overview`
- `tagline`
- `posterPath`
- `backdropPath`
- `voteAverage`
- `voteCount`
- `genres`
- `originalLanguage`
- `status`
- `homepage`
- `popularity`

`spokenLanguages` is intentionally excluded. `originalLanguage` provides the essential language information without redundant metadata.

## Movie extension

Movie details extend the base contract with:

- `mediaType: 'movie'`
- `releaseDate`
- `runtime`

The following Movie fields are intentionally excluded:

- `budget`
- `revenue`
- `imdb_id`
- `belongs_to_collection`
- `production_countries`
- `video`
- `adult`

## TV extension

TV details extend the base contract with:

- `mediaType: 'tv'`
- `firstAirDate`
- `lastAirDate`
- `numberOfSeasons`
- `numberOfEpisodes`
- `networks`
- `createdBy`
- `originCountries`

The following TV fields are intentionally excluded:

- `episode_run_time`
- `seasons`
- `last_episode_to_air`
- `next_episode_to_air`
- `type`
- `in_production`
- `languages`

`episode_run_time` is excluded because it is an array of generic episode durations without a reliable association to a specific season or episode. Season and episode details require a separate later spike.

## Architecture

- `src/lib/schemas/` contains Zod contracts for raw TMDb responses and normalized detail data.
- `server/services/tmdb/` contains framework-free detail services, mappers and errors.
- `server/api/tmdb/` contains thin Nitro route handlers.
- `server/utils/` contains H3-specific helpers.
- External TMDb HTTP transports are injected into services.
- Do not mock the module under test; mock only external boundaries.

## Error behavior

- Invalid IDs produce defined client errors.
- Transport failures remain distinguishable from validation failures.
- `INVALID_RESPONSE` preserves the original validation or mapping error as its `cause`.

## Out of scope

- Detail page UI.
- Routing or navigation.
- Pinia or URL state.
- `append_to_response`.
- Credits, cast, crew, videos, images, recommendations, similar titles, reviews, keywords, translations, alternative titles, release dates, watch providers, regions or certification.
- LLM or Ollama integration.
- Mixed Movie/TV result lists.
- Infinite scroll.
- Automatic activation of additional TMDb capabilities without separate verification.

## Related documentation

- ``
- ``
- ``
- `docs/testing.md`
