/** Industry-standard US Letter screenplay measurements (points; 72pt = 1in). */

export const PT = 72;

export const SCREENPLAY_PAGE = {
  width: 612,
  height: 792,
  marginLeft: 108,
  marginRight: 72,
  marginTop: 72,
  marginBottom: 72,
} as const;

export const SCREENPLAY_ACTION = {
  left: SCREENPLAY_PAGE.marginLeft,
  width: SCREENPLAY_PAGE.width - SCREENPLAY_PAGE.marginLeft - SCREENPLAY_PAGE.marginRight,
} as const;

export const SCREENPLAY_DIALOGUE = {
  left: 180,
  width: 252,
  center: 306,
} as const;

export const SCREENPLAY_PARENTHETICAL = {
  left: 223.2,
  width: 144,
} as const;

export const SCREENPLAY_TYPE = {
  fontSize: 12,
  lineHeight: 12,
  fontFamily: "courier",
} as const;

export const SCREENPLAY_SPACING_AFTER: Partial<Record<string, number>> = {
  scene_heading: 12,
  action: 12,
  dialogue: 12,
  transition: 12,
  shot: 12,
};
