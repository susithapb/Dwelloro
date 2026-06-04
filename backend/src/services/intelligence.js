// Re-export from the existing intelligence module so all service imports
// come from the same src/services/ namespace.
export {
  computeRiskBreakdown,
  seasonalPattern,
  costIntelligence,
  buildAlerts,
  portfolioTrends,
} from '../../intelligence.js';
