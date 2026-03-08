import type { UnlockRulesConfig } from "../types";
import { SITE_ALIASES } from "./aliases";
import { SITE_DEFAULTS } from "./defaults";
import { DEVELOPER_LANGUAGES_DOMAINS } from "./domains/developer-languages";
import { DEVELOPER_FRAMEWORKS_DOMAINS } from "./domains/developer-frameworks";
import { DEVELOPER_PLATFORMS_DOMAINS } from "./domains/developer-platforms";
import { DEVELOPER_TOOLING_DOMAINS } from "./domains/developer-tooling";
import { DEVELOPER_UI_DOMAINS } from "./domains/developer-ui";
import { DEVELOPER_AI_DOMAINS } from "./domains/developer-ai";
import { REGISTRIES_DOMAINS } from "./domains/registries";
import { SOCIAL_DOMAINS } from "./domains/social";
import { COMMERCE_AMAZON_DOMAINS } from "./domains/commerce-amazon";
import { COMMERCE_MARKETPLACES_DOMAINS } from "./domains/commerce-marketplaces";
import { COMMERCE_TRAVEL_DOMAINS } from "./domains/commerce-travel";
import { BUSINESS_DOMAINS } from "./domains/business";
import { ENTERTAINMENT_DOMAINS } from "./domains/entertainment";
import { REFERENCE_DOMAINS } from "./domains/reference";
import { SEARCH_DOMAINS } from "./domains/search";
import { GENERAL_DOMAINS } from "./domains/general";

// Combined site configuration assembled from maintainable domain-family modules.
export const RULES_CONFIG: UnlockRulesConfig = {
	version: 1,
	aliases: { ...SITE_ALIASES },
	defaults: { ...SITE_DEFAULTS },
	domains: {
		...DEVELOPER_LANGUAGES_DOMAINS,
		...DEVELOPER_FRAMEWORKS_DOMAINS,
		...DEVELOPER_PLATFORMS_DOMAINS,
		...DEVELOPER_TOOLING_DOMAINS,
		...DEVELOPER_UI_DOMAINS,
		...DEVELOPER_AI_DOMAINS,
		...REGISTRIES_DOMAINS,
		...SOCIAL_DOMAINS,
		...COMMERCE_AMAZON_DOMAINS,
		...COMMERCE_MARKETPLACES_DOMAINS,
		...COMMERCE_TRAVEL_DOMAINS,
		...BUSINESS_DOMAINS,
		...ENTERTAINMENT_DOMAINS,
		...REFERENCE_DOMAINS,
		...SEARCH_DOMAINS,
		...GENERAL_DOMAINS,
	},
};

export default RULES_CONFIG;
