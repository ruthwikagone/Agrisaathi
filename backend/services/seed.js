const config = require('../config');
const { AppError } = require('../errors');

function cleanText(value, max = 200) {
  return typeof value === 'string'
    ? value.trim().slice(0, max)
    : null;
}

async function getSeedRecommendations(input = {}) {
  const catalogUrl =
    config.seedCatalogUrl ||
    'http://127.0.0.1:3000/api/seed/catalog';

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10_000);

  try {
    const response = await fetch(catalogUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(
        `Catalog returned HTTP ${response.status}`
      );
    }

    const payload = await response.json();

    /*
     * Supports:
     *
     * [
     *   {...}
     * ]
     *
     * OR
     *
     * {
     *   varieties: [...]
     * }
     *
     * OR current AgriSaathi format:
     *
     * {
     *   ok: true,
     *   data: {
     *     varieties: [...]
     *   }
     * }
     */
    const rows = Array.isArray(payload)
      ? payload
      : payload.varieties ||
        payload.data?.varieties;

    if (!Array.isArray(rows)) {
      throw new Error(
        'Catalog is not a variety array'
      );
    }

    /*
     * Normalize crop.
     *
     * Example:
     * Tomato -> tomato
     * TOMATO -> tomato
     * tomato -> tomato
     */
    const crop = cleanText(input.crop)
      ?.toLocaleLowerCase();

    /*
     * Return ALL matching varieties.
     *
     * There is intentionally NO:
     *
     * .slice(0, 3)
     *
     * so the catalog can contain as many
     * varieties as we add.
     */
    const varieties = rows
      .filter((row) => {
        if (!crop) {
          return true;
        }

        return (
          cleanText(row.crop)
            ?.toLocaleLowerCase() === crop
        );
      })

      .map((row) => {
        const numericPrice = Number(row.price);

        /*
         * Price = 0 is NOT treated as a real price.
         */
        const hasPrice =
          Number.isFinite(numericPrice) &&
          numericPrice > 0;

        const priceType =
          cleanText(row.priceType);

        let priceNotice = null;

        if (!hasPrice) {
          priceNotice =
            'Price unavailable. Verify current price with an authorized local supplier.';
        } else if (
          priceType?.toLocaleLowerCase() ===
          'indicative mrp'
        ) {
          priceNotice =
            'Indicative price only. Verify the current price with an authorized local supplier.';
        }

        return {
          crop: cleanText(row.crop),

          variety: cleanText(row.variety),

          region: cleanText(row.region),

          durationDays:
            Number.isFinite(
              Number(row.durationDays)
            )
              ? Number(row.durationDays)
              : null,

          seedRequirement:
            cleanText(row.seedRequirement),

          expectedYield:
            cleanText(row.expectedYield),

          price:
            hasPrice
              ? numericPrice
              : null,

          priceUnit:
            hasPrice
              ? cleanText(row.priceUnit)
              : null,

          priceType,

          source:
            cleanText(row.source) ||
            catalogUrl,

          lastUpdated:
            cleanText(row.lastUpdated),

          whyRecommended:
            cleanText(row.whyRecommended),

          priceNotice
        };
      })

      .filter((row) => {
        return (
          row.variety &&
          row.source
        );
      });

    return {
      available: true,

      varieties,

      source: catalogUrl,

      message: varieties.length
        ? null
        : 'No verified matching seed varieties were returned for the selected crop.',

      priceNotice:
        'Prices are shown only when supplied by the configured catalog. Indicative prices must be verified with an authorized local supplier.'
    };

  } catch (error) {
    console.error(
      'SEED CATALOG ERROR:',
      error
    );

    throw new AppError(
      503,
      'SEED_CATALOG_UNAVAILABLE',
      'Verified seed catalog unavailable. Verify suitable varieties and price with an authorized local supplier.',
      {
        reason: error.message
      }
    );

  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  getSeedRecommendations
};