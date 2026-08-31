import type { UiMessages } from '../types'

export const enMessages = {
  navigation: { main: 'Main navigation', mobile: 'Mobile navigation', home: 'Home', openMenu: 'Open navigation', closeMenu: 'Close navigation' },
  theme: { light: 'Light', dark: 'Dark', switchToLight: 'Switch to light theme', switchToDark: 'Switch to dark theme' },
  locale: { selector: 'Language selector', zhCN: '简', zhHK: '繁', en: 'EN', switchToZhCN: 'Switch to Simplified Chinese', switchToZhHK: 'Switch to Traditional Chinese', switchToEnglish: 'Current language: English' },
  accessibility: { skipToMain: 'Skip to main content', readingProgress: 'Reading progress', home: 'Return home', footerHome: 'Return to the personal archive home', liveProduct: 'Open live product', projectStory: 'Project story' },
  common: { online: 'Online', current: 'Current', previous: 'Previous image', next: 'Next image', readPaper: 'Read paper', openProject: 'Open project', proof: 'Evidence', source: 'Source', deployedAs: 'Deployed as', liveProduct: 'Live product', project: 'Project', projectNote: 'Project note', chapters: 'chapters', proofLinks: 'Proof / links', role: 'Role', stack: 'Stack', single: 'Single', copyCitation: 'Copy citation', copyInProgress: 'Copying…', copied: 'Copied', copyFailed: 'Copy failed; copy manually' },
  actions: { selectedWork: 'View selected work', exploreWorlds: 'Explore five worlds', scrollToExplore: 'Scroll to explore', readResearch: 'Read research', viewCaseStudy: 'View product case study', exploreAcademics: 'Explore academics', viewHonors: 'View honors', enterProject: 'Enter project', sourceCode: 'Source code', openResearch: 'Open research' },
  home: { identity: 'Researcher / Builder / Music Listener', researchLabel: 'Research', selectedWorkLabel: 'Selected work', productLabel: 'Product', researchToProduct: 'Research → Product', exploreLabel: 'Explore', worldsDescription: 'Five rooms for academics, honors, research, works, and music.', beyondLabel: 'Beyond the lab', leadership: 'Leadership', selectedActivities: 'Selected activities' },
  research: { expandMethodology: 'Expand methodology', collapseMethodology: 'Collapse methodology', question: 'Question', hypothesis: 'Hypothesis', method: 'Method', prototype: 'Prototype', result: 'Result', next: 'Next step', workbench: 'Research workbench', toolsInRotation: 'Tools in rotation', researchLoopActive: 'Research loop active', questionToEvidenceToProduct: 'Question → Evidence → Product', toolsCount: 'Tools', methodsLabel: 'Methods and toolchain' },
  honors: { filterLabel: 'Filter honors by level', all: 'All', peak: 'Pioneer', excellent: 'Distinguished', emerging: 'Emerging', honorsUnit: 'honors' },
  lightbox: { gallery: 'Concert poster gallery', close: 'Close lightbox', previous: 'Previous image', next: 'Next image', position: (current, total) => ` · image ${current} of ${total}`, loading: 'Loading image', failed: 'Image failed to load', retry: 'Retry', posterAlt: 'poster', openArchive: 'Open archive' },
  albums: { collection: 'Album collection wall', navigation: 'Album navigation', previous: 'Previous album', next: 'Next album', select: 'Select an album', selected: 'Selected', nowSpinning: 'Now spinning', album: 'ALBUM', ep: 'EP' },
  footer: { profile: 'Personal profile', researchRepos: 'Research repositories', contact: 'Contact', archive: 'PERSONAL ARCHIVE / 2026', identity: 'RESEARCHER / BUILDER / MUSIC LISTENER' },
  error404: { kicker: 'SIGNAL LOST', title: 'This page wandered off', copy: 'The page you requested does not exist or has moved. Return home and choose another room.', home: 'Return home', research: 'Explore research' },
  loadError: { title: 'This page could not load', copy: 'The page resources did not finish loading. Please try again.', retry: 'Reload page' },
  status: { active: 'Active', published: 'Published', completed: 'Completed', deployed: 'Deployed', 'open-source': 'Open source', planned: 'Planned', archived: 'Archived' },
  page: {
    home: { kicker: 'PERSONAL ARCHIVE / BEIJING · 2026', title: 'SONG NOTES', copy: 'A record of research, shipped products, and the life fragments lit by music and live shows. Start with a real question, then follow the evidence toward something usable.' },
    academics: { kicker: 'ACADEMICS', title: 'Academic record', copy: 'Coursework, standardized tests, and AP results—evidence of how the work has accumulated.' },
    honors: { kicker: 'HONORS', title: 'Selected honors', copy: 'Awards mark the route; the more useful signal is the habit of continuing upward.' },
    research: { kicker: 'RESEARCH', title: 'Research beyond the paper', copy: 'From smart agriculture to explainable AI, I turn models into tools that people can open and use.' },
    works: { kicker: 'WORKS', title: 'Building ideas into products', copy: 'A deployed product archive showing how a question leaves the page and becomes something people can use.' },
    concerts: { kicker: 'CONCERTS', title: 'Live music archive', copy: 'Concerts, posters, and the nights when light and a shared chorus changed the scale of the world.' }
  }
} satisfies UiMessages
