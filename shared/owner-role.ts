// Canonical cross-product role header — mirror of the hub standard set in
// sectrai-company-memory (#4). Any handoff this front door emits declares this
// header so the RECEIVING product enforces the same owner/role gate.
//
// Owner decision (2026-07-20 #2): `x-sectrai-role` is canonical across products.
// The velvet family's `x-velvet-role` is a velvet-internal detail and must be
// translated to `x-sectrai-role` at the product boundary. Landing's own access
// model (platformRole USER|ADMIN) is separate; this constant is only the
// declared header a handoff's receiving product should honor.

export const OWNER_ROLE_HEADER = 'x-sectrai-role' as const;
export const OWNER_ROLE_VALUE = 'OWNER' as const;
export const NON_CANONICAL_ROLE_HEADERS = ['x-velvet-role'] as const;
