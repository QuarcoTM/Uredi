TEHNIKA v2.9

Changes:
- Added Open Graph/Twitter share metadata for listing pages.
- Added a 1200x630 share card for the demo Bosch listing: photo + title + price.
- Native share text now includes the listing title and price.
- Phone icon taps are counted locally and shown in "Моите обяви" as "Телефон".
- Added automatic client-side photo optimization for large JPG/PNG/WebP images.
- Large photos are resized to max 1920 px and compressed when it actually reduces file size.
- Exact duplicate detection uses SHA-256. It does NOT guess based on visual similarity, avoiding false duplicate warnings.
- Added per-photo preparation progress and retry for a failed photo.
- Added desktop drag/drop and mobile long-press sorting; arrow buttons remain as a reliable fallback.
- First ready photo remains the main photo.
- Optional product-label photo also passes through the optimization path.

Important static-prototype notes:
- "Телефон" counts taps on the call button, not completed phone calls. Backend analytics can replace localStorage later.
- The current upload progress is the real client-side preparation/optimization stage. Actual network-upload progress will be connected when Storage/backend is added.
- Social networks work best with absolute og:image/canonical URLs. The share card and metadata are prepared now; when the real marketplace domain/backend is connected, the page should output the final absolute listing URL and absolute image URL per listing.
