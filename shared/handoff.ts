// Front-door -> product handoff, expressed as the canonical foundation contract
// ContextHandoffPackageV1 (sectrai-unified-ai-os-foundation/contracts/
// ContextHandoffPackageV1.schema.json). Per ecosystem convention we MIRROR the
// contract shape rather than importing across repos.
//
// The `approved` boolean is the gate: a package is emitted at proposal time with
// approved=false (a preview of exactly what would cross), and only re-emitted
// with approved=true after the user's explicit approveProposal call. The AI can
// never self-approve — approved=true is unreachable without the fail-closed
// approvalId match in service.approveProposal.

import { OWNER_ROLE_HEADER } from './owner-role.js';
import { confirmedFacts } from './brain.js';
import { SAFETY, type Conversation, type PendingProposal } from './types.js';

export interface ContextHandoffPackageV1 {
  contract: 'ContextHandoffPackageV1';
  packageId: string;
  correlationId: string; // the source conversation id
  detectedNeed: string;
  requestedOutcome: string;
  confirmedFacts: string[];
  proposedProduct: string;
  suggestedModules: { id: string; label: string }[];
  draftOnboardingValues: {
    title: string;
    kind: PendingProposal['kind'];
    sectorId?: string;
    offeringId?: string;
    customDraftId?: string;
  };
  memoryReferences: string[]; // none from the front door today; kept for contract parity
  receivingProductScope: string[];
  /** The role header the receiving product must enforce (owner decision #2). */
  receivingRoleHeader: typeof OWNER_ROLE_HEADER;
  approved: boolean;
  synthetic: boolean;
}

/** Derive the canonical product identifier this proposal hands off to. */
function proposedProductOf(p: PendingProposal): string {
  if (p.kind === 'sector' && p.sectorId) return `sectrai-sector:${p.sectorId}`;
  if (p.kind === 'offering' && p.offeringId) return `sectrai-offering:${p.offeringId}`;
  if (p.kind === 'custom' && p.draft) return `sectrai-custom:${p.draft.id}`;
  return `sectrai-workspace:${p.kind}`;
}

function lastUserText(conv: Conversation): string {
  for (let i = conv.messages.length - 1; i >= 0; i--) {
    if (conv.messages[i].role === 'user') return conv.messages[i].text;
  }
  return '';
}

export interface BuildHandoffInput {
  proposal: PendingProposal;
  conv: Conversation;
  approvalId: string;
  approved: boolean;
}

/**
 * Build a ContextHandoffPackageV1 from an approved-or-pending proposal.
 * Pure: no persistence. Fail-closed: throws if there is no proposal to hand off.
 */
export function buildHandoffPackage({ proposal, conv, approvalId, approved }: BuildHandoffInput): ContextHandoffPackageV1 {
  if (!proposal) throw new Error('NO_PROPOSAL_TO_HAND_OFF');
  const need = lastUserText(conv);
  const facts = confirmedFacts(need);
  return {
    contract: 'ContextHandoffPackageV1',
    packageId: `handoff-${approvalId}`,
    correlationId: conv.id,
    detectedNeed: need,
    requestedOutcome: proposal.title,
    confirmedFacts: facts.length ? facts : proposal.modules.slice(0, 4).map((m) => m.label),
    proposedProduct: proposedProductOf(proposal),
    suggestedModules: proposal.modules,
    draftOnboardingValues: {
      title: proposal.title,
      kind: proposal.kind,
      sectorId: proposal.sectorId,
      offeringId: proposal.offeringId,
      customDraftId: proposal.draft?.id,
    },
    memoryReferences: [],
    receivingProductScope: proposal.modules.map((m) => m.id),
    receivingRoleHeader: OWNER_ROLE_HEADER,
    approved,
    synthetic: SAFETY.syntheticOnly,
  };
}
