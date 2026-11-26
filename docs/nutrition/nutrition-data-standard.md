# Calorieee Nutrition Data Standard

**Status:** Proposal for product-owner review  
**Scope:** Repository audit and recommended data standard only. This document does not implement application changes or database migrations.

## 1. Current-state audit

### Food search data

The current search contract is `FoodResult` in [`src/features/food-search/types.ts`](../../src/features/food-search/types.ts). It contains an ID, a source (`usda`, `off`, or `local`), a name, optional brand, one calorie value, and a free-text unit label. It does not represent other nutrients, a structured measurement basis, confidence, or a source version.

[`src/app/api/food-search/route.ts`](../../src/app/api/food-search/route.ts) searches the local catalogue, USDA FoodData Central (FDC), and Open Food Facts (OFF) concurrently. It returns up to eight local results, six USDA results, and six OFF results, with local results first.

- **USDA:** The route looks for a nutrient named `Energy` with unit `KCAL`; results without it are discarded. It retains the FDC ID as a string and `brandOwner` in the search result, but loses data type and release/version details. Branded foods display the provider serving size and unit; other records display `100 g`. The route does not retain a structured basis, and its code alone does not establish that the selected energy value matches the displayed serving basis.
- **OFF:** The route prefers `energy-kcal_serving` when a serving-size label is present, otherwise it uses `energy-kcal_100g`. It retains the product code if supplied, but falls back to the product name as an ID. It discards products without a name or a usable calorie value. The structured serving amount and other product nutrient data are not retained.
- **Local catalogue:** [`src/lib/localFoods.ts`](../../src/lib/localFoods.ts) contains hardcoded calorie-only entries with slug IDs and text unit labels. Its comment describes the figures as estimates for a typical home-cooked serving, but individual records have no evidence, recipe, reviewer, date, or version.

[`src/lib/foodSearch.ts`](../../src/lib/foodSearch.ts) deduplicates on normalized name and brand, preferring local results. However, the search route concatenates result arrays directly rather than using that helper. The test in [`tests/scalability.spec.ts`](../../tests/scalability.spec.ts) exercises the helper, not route-level matching. Name similarity is not sufficient evidence that two foods have the same identity.

### Serving calculations

[`src/lib/foodUnits.ts`](../../src/lib/foodUnits.ts) parses a serving quantity from the display string with a regular expression. It scales calories linearly using the parsed number and user quantity, clamps negative results to zero, and rounds to an integer calorie. This does not validate that units are compatible.

The UI defaults quantity to the parsed number: `100 g` initializes to 100, but `1 serving (50 g)` initializes to 1. The parenthetical mass is not interpreted as a conversion. Arbitrary servings, mass, volume, and count portions therefore cannot be safely reconciled. The selected calorie amount is rounded before logging.

### Logging and persistence

[`src/components/FoodSearch.tsx`](../../src/components/FoodSearch.tsx) sends only a display name and calculated calories to its caller. [`src/components/AddFoodSheet.tsx`](../../src/components/AddFoodSheet.tsx) then allows manual editing and also supports name-plus-calorie entry. The source, external identifier, brand, original serving basis, and selected food object are dropped.

[`src/features/meals/services/mealService.ts`](../../src/features/meals/services/mealService.ts) inserts user, date, meal type, name, calories, and optional schedule ID. The `meals` table in [`supabase/schema.sql`](../../supabase/schema.sql) requires a non-negative integer calorie value and has no food-source, portion, or nutrient-snapshot fields. Meal templates are likewise calorie-only. Persistent meal IDs and creation timestamps exist, but no nutrition provenance is saved.

Therefore, after logging, the app cannot recover which food result was selected, its source, the portion basis, or whether calories were provider supplied, estimated, or manually entered. Historical calorie values remain available, but their source and non-calorie nutrients are unknown.

### Missing values, provider failures, tests, and limits of verification

Missing nutrients are not represented individually because the result shape contains only calories. Foods without usable energy are omitted. Provider failures, non-success responses, and parse exceptions in the route become empty result arrays; local results may still be returned. The UI can show “No matches” without distinguishing an unavailable provider from a genuine lack of results. The client search service does surface failure of Calorieee's own endpoint.

Current tests include food-merge behavior but no nutrition-specific tests for unit conversion, serving scaling, zero versus missing, provider mapping, or historical snapshots.

This repository review cannot verify what SQL is deployed to a live Supabase instance, which production records exist, or the true measurement basis of every provider value. The implementation and comments do not independently establish the accuracy of local estimates.

## 2. Canonical nutrition data specification

### A. Food identity

Keep food identity separate from nutrition observations. A canonical food should include:

- Stable internal ID and canonical name.
- Kind: generic food, prepared food, branded product, recipe, or user-entered food.
- Category from a controlled vocabulary.
- Optional brand and product identifiers, including barcode where available.
- Preparation and state: for example, raw/cooked, boiled/fried, peeled/unpeeled, or as sold.
- Region or culinary context when it distinguishes food identity.
- Aliases for search, optionally tagged by language or locale.

Aliases support search; they do not prove nutritional equivalence. Similarly named dishes must not be merged merely because their names or calorie values are similar. Keep source identities as namespaced references `(provider, external identifier)` with dataset/type where available. Do not use a product name as a substitute for a missing provider ID.

Match exact provider IDs and product identifiers confidently within their namespaces. For generic foods and recipes, require agreement on relevant form, preparation, and ingredients. Send uncertain matches for review; do not merge on name, brand text, or nutrient similarity alone. Distinct recipe variations should remain separate records when ingredients or preparation materially affect nutrition.

### B. Nutrition observations and provenance

Represent each versioned nutrition profile with one explicit basis and a collection of nutrient observations. Each observation should capture:

- Controlled nutrient code and definition.
- Normalized value and unit, or an explicit non-numeric status.
- Original provider value and unit if conversion occurred.
- Origin: provider supplied, recipe calculated, reviewed estimate, unreviewed estimate, or user entered.
- Source/provider and source identifier where available.
- Source release/version or product update time where available.
- Retrieval and review timestamps; reviewer role/process where applicable.
- Source URL, attribution, and license information.
- Method and uncertainty notes.

Distinguish a measured/reported `0` from no value. Use explicit states such as `not_reported`, `not_applicable`, `conflicting`, or `unknown`; do not replace those states with numeric zero. An estimate remains an estimate after review. Do not imply that an estimated or source-provided value has been independently verified.

### C. Nutrient definitions, units, and energy

Use a controlled registry with stable nutrient codes and definitions. Recommended initial nutrients:

| Nutrient | Canonical unit | Notes |
| --- | --- | --- |
| Energy | kcal | Preserve original provider unit and measurement basis. |
| Protein | g | Do not infer from energy. |
| Total carbohydrate | g | Do not silently equate total and available carbohydrate. |
| Total fat | g | Preserve source definition. |
| Dietary fibre | g | Include where supported. |
| Total sugars | g | Include where supported. |
| Saturated fat | g | Include where supported. |
| Sodium | mg | Keep distinct from salt. |
| Other micronutrients | mg or µg as defined | Add only with reliable source definition, basis, and unit. |

Normalize energy to kcal for current calculations and display, while retaining the source unit and value. Convert only where the original unit is explicit, using `1 kcal = 4.184 kJ`. Do not interpret a unitless “calories” value as kcal without source documentation; do not confuse food-label Calories (kilocalories) with small calories.

Do not silently convert sodium to salt or collapse different definitions of carbohydrate, folate, vitamin A, or other nutrients. Sources may provide different subsets; absent nutrients stay absent.

### D. Serving sizes and portion calculations

Represent quantity and unit structurally, with a display label separate from calculation data. Support mass (`g`, `kg`), volume (`mL`, `L`), and explicitly defined serving/count units. Record the provider's original serving description and nutrition basis separately from the quantity consumed.

- Convert compatible mass units and compatible volume units using defined unit conversions.
- Convert mass to volume only with documented food- and preparation-specific density.
- Convert counts or household portions to mass only with a documented food-specific portion measure.
- Never infer gram weights from arbitrary labels such as “bowl,” “piece,” “cup,” or “serving.”
- If the portion cannot be reliably related to the nutrition basis, do not calculate a scaled result. Request a supported portion, accept an explicitly manual calorie-only entry, or retain it as unconverted and mark nutrition unavailable/uncertain.

For compatible bases, use deterministic scaling:

`scaled nutrient = nutrient value × consumed basis quantity ÷ profile basis quantity`

For a serving-basis profile, scale by the number of servings of that same defined serving. Store and calculate with decimal precision; round only for display. Reject invalid quantities and unsupported conversions explicitly.

### E. Recipes and Nigerian foods

A recipe version should record preparation method and ingredient rows. Each ingredient references a food and has a quantity and unit. Record substitutions explicitly. Record recipe yield as finished edible mass and/or a defined serving count, including whether yield was measured or estimated.

When ingredient quantities, conversions, nutrient profiles, and yield are available, calculate recipe nutrient totals from the ingredients and divide by the recorded yield to derive per-100-g or per-serving values. Do not equate raw ingredient totals with cooked yield without recording the final yield basis. Preserve ingredient and recipe provenance.

Missing ingredient nutrients, quantities, conversions, or yield make a recipe result incomplete or estimated; they must not be silently treated as zero or presented as complete. Household recipes for Jollof rice, Egusi soup, and other dishes vary substantially. Use separate records for variations when ingredients, method, or resulting nutrient profile materially differ.

For hardcoded regional foods, establish an evidence/review workflow before making claims: document the food form or recipe, ingredients and portion evidence, cooking method and yield, supporting sources or measurements, uncertainty, and reviewer check. Version changes rather than silently replacing values. “Reviewed estimate” is appropriate for reviewed calculations that remain estimates. Do not label existing hardcoded values verified without supporting verification.

### F. Historical meal logs

Keep current meal rows and calorie values intact. New structured logs should freeze an immutable logging-time snapshot with:

- Food ID and selected source/profile revision where available.
- Name shown at log time.
- Consumed quantity and unit, plus the source serving or calculation basis.
- Nutrient values used, units, provenance, and missing/uncertain states.
- Recipe version and yield basis when applicable.
- Snapshot format version.

Catalogue updates must not change a historical meal's name, calories, nutrients, portion interpretation, or provenance snapshot. Keep the current calorie field for existing totals and compatibility.

Legacy records retain their existing values and are treated as unknown for source, portion, and non-calorie nutrients. Do not retrospectively match by name or invent provenance. A `legacy_unknown` status may be used for display and processing.

## 3. Proposed TypeScript model and relational design

Illustrative types:

```ts
type FoodKind =
  | "generic"
  | "prepared"
  | "branded"
  | "recipe"
  | "user_entered";

type NutrientCode =
  | "energy"
  | "protein"
  | "carbohydrate_total"
  | "fat_total"
  | "fibre"
  | "sugars_total"
  | "saturated_fat"
  | "sodium"
  | string; // Extend only through a controlled nutrient registry.

type NutrientUnit = "kcal" | "kJ" | "g" | "mg" | "ug";

type NutrientOrigin =
  | "provider"
  | "recipe_calculated"
  | "reviewed_estimate"
  | "unreviewed_estimate"
  | "user_entered";

type NutrientObservation =
  | {
      state: "available";
      code: NutrientCode;
      value: number; // Zero is a valid reported value.
      unit: NutrientUnit;
      origin: NutrientOrigin;
      sourceRefId?: string;
      rawValue?: number;
      rawUnit?: NutrientUnit;
      reviewedAt?: string;
      uncertaintyNote?: string;
    }
  | {
      state: "not_reported" | "not_applicable" | "conflicting" | "unknown";
      code: NutrientCode;
      value: null;
      note?: string;
    };

type NutritionBasis =
  | { kind: "mass"; quantity: number; unit: "g"; ediblePart?: string }
  | {
      kind: "volume";
      quantity: number;
      unit: "mL";
      densityGPerMl?: number;
    }
  | {
      kind: "serving";
      servingId: string;
      quantity: number;
      label: string;
      massG?: number;
      volumeMl?: number;
    };

interface FoodSourceRef {
  provider: "usda_fdc" | "open_food_facts" | "local" | "user";
  externalId?: string;
  datasetType?: string;
  sourceVersion?: string;
  sourceUrl?: string;
  retrievedAt?: string;
  attribution?: string;
  license?: string;
}

interface CanonicalFood {
  id: string;
  kind: FoodKind;
  canonicalName: string;
  aliases: Array<{ name: string; locale?: string }>;
  category?: string;
  brand?: string;
  region?: string;
  preparation?: string;
  state?: "raw" | "cooked" | "as_sold" | "prepared" | "unknown";
  sourceRefs: FoodSourceRef[];
}

interface NutritionProfile {
  foodId: string;
  revision: number;
  basis: NutritionBasis;
  observations: NutrientObservation[];
  sourceRefs: FoodSourceRef[];
  recordedAt: string;
  reviewedAt?: string;
  method?: string;
}

interface LoggedMealNutritionSnapshot {
  snapshotVersion: 1;
  foodId?: string;
  profileRevision?: number;
  displayNameAtLogTime: string;
  consumed: { quantity: number; unit: string; servingId?: string };
  nutrients: NutrientObservation[];
  sourceRefs: FoodSourceRef[];
  recipeRevision?: number;
  status: "structured" | "legacy_unknown";
}
```

### Conceptual relational model

- **`foods`**: stable identity, kind, canonical name, category, brand, preparation, region, and state.
- **`food_aliases`**: separate because one food may have multiple searchable names/locales.
- **`food_source_refs`**: separate because one food may correspond to several external providers; store provider namespace, external ID, dataset/type/version, attribution, and license. Uniqueness applies to provider plus external ID.
- **`nutrition_profiles`** and **`nutrient_observations`**: separate so each profile has a version and basis while individual nutrients can be present, missing, conflicting, or zero.
- **Recipe versions and ingredient rows**: separate for recipe foods only; ingredient rows need food references, quantities, preparation, and substitutions.
- **Existing `meals`**: retain existing fields and add nullable canonical references and a nullable immutable nutrition snapshot. A versioned snapshot object is a pragmatic first step for logging-time provenance; keep frequently queried portion values structured if needed.

Avoid creating tables for display-only labels or other values that do not need independent identity, history, or relationships.

### Mapping from current search results

- **USDA:** Map `fdcId` to a namespaced source reference. Capture data type, nutrient identifiers, units, and basis from the documented source response before creating observations. Do not infer basis from the UI label.
- **OFF:** Preserve product code only when supplied. Keep available per-serving and per-100-g values and their bases separately. A name fallback is not a stable external ID.
- **Local:** Map the slug to a local catalogue food, but keep current values as estimates until evidence and review are recorded. Do not invent additional nutrients or provenance.
- **UI candidate:** Provide a structured profile and portion options, rather than only one calorie and a free-text label. Keep provider errors distinguishable from no matches.
- **Logging:** Pass the selected candidate, structured consumed portion, and calculated nutrient snapshot to persistence. Keep manual calorie-only logging as a separate supported path.

## 4. Source quality, attribution, and licensing

### Repository implementation

The route calls USDA and OFF and displays simple source labels in the search UI. It does not save detailed attribution, dataset/release, review, or license metadata with meals. The USDA key defaults to `DEMO_KEY` if `FDC_API_KEY` is absent. The OFF request uses `CalorieTracker/1.0 (personal project)` as its User-Agent.

### Findings from source documentation

- USDA's [FDC API guide](https://fdc.nal.usda.gov/api-guide.html) describes API access, requests source citation, and states FDC data are public domain/CC0. It also documents API-key responsibility and rate limits. The [FDC data-type documentation](https://fdc.nal.usda.gov/data-documentation/) describes different data types and methods, including analytically derived Foundation Foods, survey-derived FNDDS, and branded data based on manufacturer label information.
- OFF's [data reuse page](https://world.openfoodfacts.org/data) and [terms of use](https://world.openfoodfacts.org/terms-of-use) state the database is under ODbL, individual contents under DbCL, and product images have separate CC BY-SA licensing. OFF says product data accuracy and completeness are not guaranteed.
- OFF's [API documentation](https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/) documents a limit of 10 search requests per minute per IP, warns against search-as-you-type, and requests a custom User-Agent identifying the app. The existing 400 ms search debounce may send repeated requests during typing and should be reviewed against the published API guidance.

### Requires external review

Before caching or redistributing provider data, obtain a licensing review for intended commercial use, data retention, derived-data treatment, attribution placement, and share-alike obligations—especially for OFF-derived or adapted databases. Review image use separately from product text and nutrition data. Public API availability is not itself permission for every commercial redistribution model.

Confirm current response semantics and terms for the intended integration pattern. Verify nutrient basis across FDC data types before claiming mapped values are comparable. Review the local catalogue's evidence, ownership, and licensing independently; source comments are not proof of validation or reuse rights.

### Suggested user-facing labels

- **USDA data** or **OFF product data**, with source and basis details available.
- **Reviewed estimate** for reviewed recipe calculations that remain estimates.
- **Your entry** for manual values.
- **Nutrition incomplete** when nutrients are absent.
- **Legacy log — source unknown** for old calorie-only entries.

Reserve “verified” for values meeting a documented verification process. Provider-supplied does not mean independently verified.

## 5. Migration and rollout

1. Approve nutrient definitions, source/review labels, attribution UI, OFF reuse posture, and provider failure behavior.
2. Add domain types and deterministic, unit-safe calculations behind an adapter so current calorie-only logging continues to work.
3. Make additive schema changes: retain meal IDs, names, dates, types, calories, and schedule links. Add nullable food references and immutable snapshots; add catalogue/observation tables only as needed. Avoid destructive rewrites and mandatory historical backfills.
4. Leave existing records unchanged. Do not infer identities from historical meal names; unknown source, portion, and non-calorie nutrients remain unknown.
5. Wire structured provider/local candidates through search and logging, displaying basis and status while preserving manual calorie-only entry.
6. Add recipe calculations and reviewed regional records only after evidence, yield, and uncertainty processes exist. Use new profile revisions; never rewrite historical snapshots.
7. Monitor provider request patterns, attribution, and outage behavior before broad rollout.

## 6. Prioritised implementation backlog

1. Decide the nutrient vocabulary, provenance states, unit/basis rules, and source attribution policy; obtain product-owner and legal review.
2. Replace the lossy search result contract with structured candidate, profile, basis, provenance, and portion data.
3. Add deterministic conversion/scaling tests; correct provider error reporting and identity matching.
4. Add nullable catalog/provenance references and immutable meal snapshots, retaining all calorie-only records.
5. Update search and logging UI to show source, basis, uncertainty, and incomplete-data labels.
6. Establish evidence/review/versioning for Nigerian regional foods; do not seed unsupported values.
7. Add recipe versions, ingredients, yield, and incomplete-recipe handling.
8. Expand nutrients and source coverage only when definitions, units, and basis are reliable.

## 7. Test plan and acceptance criteria

- **Nutrient conversions:** Explicit unit conversions are deterministic; energy conversion preserves the original amount/unit and uses `1 kcal = 4.184 kJ`. Ambiguous units fail visibly.
- **Portion scaling:** Scaling only occurs across compatible bases or supported food-specific conversions; calculations retain precision until display.
- **Missing versus zero:** A reported zero remains numeric zero. An unreported nutrient stays unavailable and is not counted as zero for completeness.
- **Invalid/unsupported portions:** Negative and non-finite values are rejected. Free-text serving labels do not imply gram weights.
- **Recipe calculations:** Known ingredients, quantities, conversions, and yield produce deterministic totals. Missing nutrients or uncertain yield result in incomplete/estimated output.
- **Identity and duplicate matching:** Provider IDs are unique within namespaces. Similar names with different preparation, brand, or recipe identity are not automatically merged. Name fallback IDs are not treated as source IDs.
- **Attribution/provenance:** Search-to-log preserves provider namespace, external ID, basis, available version/retrieval metadata, status, and required attribution.
- **Historical snapshots:** Updating a catalog profile or recipe version does not change a logged name, portion, nutrient values, or provenance.
- **Backward compatibility:** Existing calorie-only rows continue loading, totaling, and displaying. Manual calorie-only entry remains available; legacy unknowns remain unknown.
- **Provider failures:** Outage is distinguishable from no matches; available sources can still return results without implying completeness.
- **Regression coverage:** Add tests for provider mapping and the UI-to-service logging boundary; existing tests do not cover those paths.

Use synthetic arithmetic fixtures only when clearly identified as synthetic, not as food-composition claims.

## 8. Product-owner decisions

1. Must an initial “complete” profile include energy and all three macros, or may calorie-only records be offered explicitly as incomplete?
2. What are the standards and labels for “reviewed” and “verified”?
3. May OFF-derived data be cached or redistributed under the intended commercial model, subject to legal review?
4. Should manual entries remain calorie-only by default, or accept user-entered nutrients and recipe details?
5. Should the initial portion UI support only mass and provider-defined servings, or also reviewed food-specific household measures?
6. Which Nigerian recipe variations should be reviewed first, and what evidence/reviewer standard is required?

## Recommended first implementation task

After approval, build and test the typed food-candidate/provenance boundary with unit-safe portion calculations, retaining the existing calorie-only logging path. This addresses the main trust gap: search currently discards the source and basis needed to reproduce a calorie result before any schema migration is attempted.
