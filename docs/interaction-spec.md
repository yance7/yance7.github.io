# Interaction specification

This site uses restrained motion to support orientation and reading rather than compete with the archive content.

| Interaction | Contract |
| --- | --- |
| Hover | 200ms transition for color, border, opacity, and other quiet feedback. |
| State change | 200–320ms for tabs, filters, theme, and lightbox state. |
| Reveal | Up to 600ms for section and content reveals. |
| Page atmosphere | Ambient page transition completes within 720ms. |
| Displacement | Normal hover translation is no more than 3px. Cards do not scale by default; media may scale up to 1.03. |
| Focus | Every interactive state has a visible focus treatment and is never communicated by color alone. |
| Reduced motion | `prefers-reduced-motion: reduce` removes displacement and reveal motion while preserving state and content. |

The visual language remains fixed across Home, Research, Concerts, and the shared color system: Quiet Atelier, Editorial Archive, Scientific Precision, Warm Paper, and Deep Space. New interactions should be checked against this contract before they are added.
