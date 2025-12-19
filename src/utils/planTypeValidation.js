/**
 * Plan Type Validation Rules & Helper Functions
 * Enforces business rules for 4 plan types: FREE, INDIVIDUAL, BUNDLE, FLEXIBLE
 */

const PlanTypes = {
  FREE: 'FREE',
  INDIVIDUAL: 'INDIVIDUAL',
  BUNDLE: 'BUNDLE',
  FLEXIBLE: 'FLEXIBLE'
};

/**
 * Get pricing fields required for each plan type
 * @param {string} planType - Plan type (FREE, INDIVIDUAL, BUNDLE, FLEXIBLE)
 * @returns {object} Pricing requirements
 */
function getPricingRequirements(planType) {
  switch (planType) {
    case PlanTypes.FREE:
      return {
        requireBundlePrice: false,
        requireTopicPrices: false,
        description: 'All topics are free. No pricing required.'
      };

    case PlanTypes.INDIVIDUAL:
      return {
        requireBundlePrice: false,
        requireTopicPrices: true,
        description: 'Each topic has its own price. No category pricing.'
      };

    case PlanTypes.BUNDLE:
      return {
        requireBundlePrice: true,
        requireTopicPrices: false,
        description: 'Users purchase the entire category at one price. No individual topic pricing.'
      };

    case PlanTypes.FLEXIBLE:
      return {
        requireBundlePrice: true,
        requireTopicPrices: true,
        description: 'Users can buy individual topics OR the entire bundle.'
      };

    default:
      throw new Error(`Invalid plan type: ${planType}`);
  }
}

/**
 * Validate category pricing based on plan type
 * @param {object} category - Category object with pricing
 * @param {string} planType - Plan type
 * @returns {object} Validation result { valid: boolean, error?: string }
 */
function validateCategoryPricing(category, planType) {
  const requirements = getPricingRequirements(planType);

  if (requirements.requireBundlePrice) {
    if (!category.bundle_price || category.bundle_price <= 0) {
      return {
        valid: false,
        error: `${planType} plan requires a positive bundle price`
      };
    }
  }

  return { valid: true };
}

/**
 * Validate purchase request based on plan type and purchase options
 * @param {object} purchase - Purchase object { planType, purchaseType, categoryId, topicIds, userId }
 * @returns {object} Validation result { valid: boolean, error?: string }
 */
function validatePurchaseRequest(purchase) {
  const { planType, purchaseType, categoryId, topicIds, userId } = purchase;

  // Basic validations
  if (!planType || !categoryId || !userId) {
    return {
      valid: false,
      error: 'Missing required fields: planType, categoryId, userId'
    };
  }

  // Plan-type specific purchase validations
  switch (planType) {
    case PlanTypes.FREE:
      // FREE plan: No payment needed, can access all
      if (purchaseType !== 'free') {
        return {
          valid: false,
          error: 'FREE plan should not require payment'
        };
      }
      return { valid: true };

    case PlanTypes.INDIVIDUAL:
      // INDIVIDUAL plan: Only individual topic purchases allowed
      if (purchaseType === 'bundle') {
        return {
          valid: false,
          error: 'INDIVIDUAL plan does not support bundle purchases'
        };
      }
      if (!topicIds || topicIds.length === 0) {
        return {
          valid: false,
          error: 'INDIVIDUAL plan requires at least one topic to be selected'
        };
      }
      return { valid: true };

    case PlanTypes.BUNDLE:
      // BUNDLE plan: Only bundle purchase allowed
      if (purchaseType === 'individual' || purchaseType === 'individual_topics') {
        return {
          valid: false,
          error: 'BUNDLE plan only supports full category purchase'
        };
      }
      if (purchaseType !== 'bundle') {
        return {
          valid: false,
          error: 'BUNDLE plan requires bundle purchase type'
        };
      }
      return { valid: true };

    case PlanTypes.FLEXIBLE:
      // FLEXIBLE plan: Both bundle and individual purchases allowed
      if (purchaseType === 'bundle') {
        return { valid: true };
      }
      if (purchaseType === 'individual' || purchaseType === 'individual_topics') {
        if (!topicIds || topicIds.length === 0) {
          return {
            valid: false,
            error: 'Individual purchase requires at least one topic'
          };
        }
        return { valid: true };
      }
      if (purchaseType === 'free') {
        return { valid: true };
      }
      return {
        valid: false,
        error: 'Invalid purchase type for FLEXIBLE plan'
      };

    default:
      return {
        valid: false,
        error: `Unknown plan type: ${planType}`
      };
  }
}

/**
 * Check if user can purchase individual topics
 * @param {string} planType - Plan type
 * @returns {boolean}
 */
function canPurchaseIndividualTopics(planType) {
  return planType === PlanTypes.INDIVIDUAL || planType === PlanTypes.FLEXIBLE;
}

/**
 * Check if user can purchase entire bundle
 * @param {string} planType - Plan type
 * @returns {boolean}
 */
function canPurchaseBundle(planType) {
  return planType === PlanTypes.BUNDLE || planType === PlanTypes.FLEXIBLE;
}

/**
 * Calculate final price based on plan type and purchase options
 * @param {object} options - { planType, bundlePrice, topicPrices[], selectedTopicIds[] }
 * @returns {object} { finalPrice: number, breakdown: object, purchaseType: string }
 */
function calculatePrice(options) {
  const { planType, bundlePrice, topicPrices = [], selectedTopicIds = [] } = options;

  switch (planType) {
    case PlanTypes.FREE:
      return {
        finalPrice: 0,
        breakdown: { free: true },
        purchaseType: 'free'
      };

    case PlanTypes.INDIVIDUAL:
      if (!selectedTopicIds || selectedTopicIds.length === 0) {
        throw new Error('INDIVIDUAL plan requires topic selection');
      }
      const individualTotal = selectedTopicIds.reduce((sum, topicId) => {
        return sum + (topicPrices[topicId] || 0);
      }, 0);
      return {
        finalPrice: individualTotal,
        breakdown: {
          topics: selectedTopicIds.length,
          pricePerTopic: topicPrices,
          selectedTopics: selectedTopicIds
        },
        purchaseType: 'individual_topics'
      };

    case PlanTypes.BUNDLE:
      if (!bundlePrice || bundlePrice <= 0) {
        throw new Error('BUNDLE plan requires a valid bundle price');
      }
      return {
        finalPrice: bundlePrice,
        breakdown: { bundlePrice },
        purchaseType: 'bundle'
      };

    case PlanTypes.FLEXIBLE:
      if (!bundlePrice || bundlePrice <= 0) {
        throw new Error('FLEXIBLE plan requires a valid bundle price');
      }

      // If buying bundle
      if (!selectedTopicIds || selectedTopicIds.length === 0) {
        return {
          finalPrice: bundlePrice,
          breakdown: { bundlePrice },
          purchaseType: 'bundle'
        };
      }

      // If buying individual topics
      const flexibleIndividualTotal = selectedTopicIds.reduce((sum, topicId) => {
        return sum + (topicPrices[topicId] || 0);
      }, 0);

      // Return both options - frontend decides which is cheaper
      return {
        finalPrice: flexibleIndividualTotal, // Default to individual if topics selected
        bundlePrice: bundlePrice,
        breakdown: {
          individualTotal: flexibleIndividualTotal,
          bundlePrice: bundlePrice,
          isBundleCheaper: bundlePrice < flexibleIndividualTotal,
          topics: selectedTopicIds.length
        },
        purchaseType: 'individual_topics'
      };

    default:
      throw new Error(`Unknown plan type: ${planType}`);
  }
}

/**
 * Validate access: Can user access a topic?
 * @param {object} options - { planType, userId, topicId, hasFreeTopic, topicEnrollment }
 * @returns {object} { hasAccess: boolean, reason: string }
 */
function validateTopicAccess(options) {
  const { planType, userId, topicId, hasFreeTopic, topicEnrollment } = options;

  // If topic is marked as free
  if (hasFreeTopic) {
    return {
      hasAccess: true,
      reason: 'FREE_TOPIC'
    };
  }

  // Check if user has purchased
  if (!topicEnrollment) {
    return {
      hasAccess: false,
      reason: 'NO_PURCHASE'
    };
  }

  // Check enrollment status
  if (topicEnrollment.payment_status === 'paid' || topicEnrollment.payment_status === 'free') {
    return {
      hasAccess: true,
      reason: topicEnrollment.payment_status === 'paid' ? 'PURCHASED' : 'ENROLLED_FREE'
    };
  }

  return {
    hasAccess: false,
    reason: 'INVALID_ENROLLMENT'
  };
}

/**
 * Get topics to unlock based on purchase type and plan type
 * @param {object} options - { planType, purchaseType, categoryTopicIds, selectedTopicIds }
 * @returns {array} Topic IDs to unlock
 */
function getTopicsToUnlock(options) {
  const { planType, purchaseType, categoryTopicIds = [], selectedTopicIds = [] } = options;

  switch (planType) {
    case PlanTypes.FREE:
      return categoryTopicIds; // All topics

    case PlanTypes.INDIVIDUAL:
      return selectedTopicIds; // Only selected topics

    case PlanTypes.BUNDLE:
      return categoryTopicIds; // All topics in category

    case PlanTypes.FLEXIBLE:
      if (purchaseType === 'bundle') {
        return categoryTopicIds; // All topics
      } else {
        return selectedTopicIds; // Selected topics
      }

    default:
      return [];
  }
}

module.exports = {
  PlanTypes,
  getPricingRequirements,
  validateCategoryPricing,
  validatePurchaseRequest,
  canPurchaseIndividualTopics,
  canPurchaseBundle,
  calculatePrice,
  validateTopicAccess,
  getTopicsToUnlock
};
